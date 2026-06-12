import { TILE_SIZE } from '../constant.js';
import { Director } from '../director.js';
import { EditorTilePreview } from '../renderer/editorTilePreview.js';
import { InputManager } from '../utils/inputManager.js';
import { TileIndex, TILE_GROUPS } from '../game/tileSystem/tileIndexer.js';
import { Vector } from '../utils/vector.js';

const TOOL_DRAW = 'draw';
const TOOL_ERASE = 'erase';
const TOOL_PAN = 'pan';
const TOOL_SELECT = 'select';

const DROPDOWN_GROUPS = TILE_GROUPS.map(key => ({
    key,
    elementId: `editorDropdown${key[0].toUpperCase() + key.slice(1)}`,
}));

export class EditorUi {
    constructor(editor, renderer) {
        this.editor = editor;
        this.renderer = renderer;

        this.tilePreview = new EditorTilePreview(
            document.getElementById('tilePreview'),
            renderer
        );
        this._lastSelectedPerGroup = {};
        for (const g of DROPDOWN_GROUPS) {
            this._lastSelectedPerGroup[g.key] = 0;
        }
        this.currentDialog = null;
        this._dialogCallback = null;
        this._dropdownsPopulated = false;

        // HACK(sss): hacky solution, couldn't find a better way of preventing
        //            click passthrough to editor canvas without refactoring
        //            a lot...
        document.getElementById('editorTopBar').addEventListener('mousedown', (e) => e.stopPropagation());
        document.getElementById('editorBottomBar').addEventListener('mousedown', (e) => e.stopPropagation());
        document.getElementById('editorInspector').addEventListener('mousedown', (e) => e.stopPropagation());

        this._initToolButtons();
        this._initDropdowns();
        this._initUndoRedoButtons();
        this._initFileButtons();
        this._initInspector();
    }

    _initToolButtons() {
        const drawBtn = document.getElementById('editorDraw');
        const eraseBtn = document.getElementById('editorErase');
        const panBtn = document.getElementById('editorPan');
        const selectBtn = document.getElementById('editorSelect');
        const rectBtn = document.getElementById('editorRect');

        drawBtn.addEventListener('click', () => this.editor._setActiveTool(TOOL_DRAW));
        eraseBtn.addEventListener('click', () => this.editor._setActiveTool(TOOL_ERASE));
        panBtn.addEventListener('click', () => this.editor._setActiveTool(TOOL_PAN));
        selectBtn.addEventListener('click', () => this.editor._setActiveTool(TOOL_SELECT));

        // ignore click when PAN tool selected as it makes no sense to modify this
        // state when in pan mode.
        rectBtn.addEventListener('click', () => {
            if (this.editor.currentTool === TOOL_PAN) return;
            this.editor.rectToggle = !this.editor.rectToggle;
            this._updateRectButtonState();
        });
    }

    onToolChanged(tool) {
        document.getElementById('editorDraw').classList.toggle('active', tool === TOOL_DRAW);
        document.getElementById('editorErase').classList.toggle('active', tool === TOOL_ERASE);
        document.getElementById('editorPan').classList.toggle('active', tool === TOOL_PAN);
        document.getElementById('editorSelect').classList.toggle('active', tool === TOOL_SELECT);

        this._updateRectButtonState();
        this.updatePreviewForTool();
    }

    _updateRectButtonState() {
        const rectBtn = document.getElementById('editorRect');
        const isPanSelect = this.editor.currentTool === TOOL_PAN || this.editor.currentTool === TOOL_SELECT;
        const rectActive = !isPanSelect && (this.editor.rectToggle || InputManager.getAction('rect')?.pressed);
        rectBtn.disabled = isPanSelect;
        rectBtn.classList.toggle('editorRectOn', rectActive);
        rectBtn.classList.toggle('editorRectOff', !rectActive);
    }

    _initDropdowns() {
        for (const group of DROPDOWN_GROUPS) {
            const dropdown = document.getElementById(group.elementId);

            const btn = dropdown.querySelector('.editorDropdownBtn');
            const panel = dropdown.querySelector('.editorDropdownPanel');

            btn.addEventListener('click', (e) => {
                const isOpen = dropdown.classList.contains('open');
                this._closeAllDropdowns();
                if (!isOpen) {
                    dropdown.classList.add('open');
                    this._refreshDropdownPanel(group.key, panel);
                }
            });
        }

        // NOTE(sss): this was easier than trying to close on any clicks,
        //            but could be improved
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.editorDropdown')) {
                this._closeAllDropdowns();
            }
        });
    }

    _closeAllDropdowns() {
        for (const group of DROPDOWN_GROUPS) {
            const dropdown = document.getElementById(group.elementId);
            dropdown.classList.remove('open');
        }
    }

    _populateAllDropdownPanels() {
        for (const group of DROPDOWN_GROUPS) {
            const dropdown = document.getElementById(group.elementId);
            const panel = dropdown.querySelector('.editorDropdownPanel');
            const iconCanvas = dropdown.querySelector('.editorDropdownIcon');
            this._populateDropdownPanel(group.key, panel, iconCanvas);
        }
    }

    _populateDropdownPanel(groupKey, panel, iconCanvas) {
        const count = TileIndex.getGroupTileCount(groupKey);
        panel.innerHTML = '';

        for (let id = 0; id < count; id++) {
            const tileCanvas = document.createElement('canvas');
            tileCanvas.width = 28;
            tileCanvas.height = 28;

            const offCanvas = document.createElement('canvas');
            offCanvas.width = 28;
            offCanvas.height = 28;
            const offCtx = offCanvas.getContext('2d');

            this.renderer.exportTileSprite(offCtx, 28, 28, [groupKey, id, { rotation: 0 }]);
            tileCanvas.getContext('2d').drawImage(offCanvas, 0, 0);

            tileCanvas.addEventListener('click', (e) => {
                this.editor.palette.selectTile(groupKey, id);
                this._lastSelectedPerGroup[groupKey] = id;
                this._updateDropdownIcons();
                this._updateDropdownSelectionHighlights();
                this._closeAllDropdowns();
                this.updatePreviewForTool();
            });

            panel.appendChild(tileCanvas);
        }
    }

    _refreshDropdownPanel(groupKey, panel) {
        const canvases = panel.querySelectorAll('canvas');
        for (let i = 0; i < canvases.length; i++) {
            canvases[i].classList.toggle('selected',
                this.editor.palette.selectedGroup === groupKey && this.editor.palette.selectedTileId === i);
        }
    }

    _updateDropdownIcons() {
        for (const group of DROPDOWN_GROUPS) {
            const dropdown = document.getElementById(group.elementId);

            const iconCanvas = dropdown.querySelector('.editorDropdownIcon');
            const ctx = iconCanvas.getContext('2d');
            ctx.clearRect(0, 0, iconCanvas.width, iconCanvas.height);

            const lastId = this._lastSelectedPerGroup[group.key];
            this.renderer.exportTileSprite(ctx, iconCanvas.width, iconCanvas.height,
                [group.key, lastId, { rotation: 0 }]);
        }
    }

    _updateDropdownSelectionHighlights() {
        for (const group of DROPDOWN_GROUPS) {
            const dropdown = document.getElementById(group.elementId);
            const panelCanvases = dropdown.querySelectorAll('.editorDropdownPanel canvas');
            for (let i = 0; i < panelCanvases.length; i++) {
                const isSelected = this.editor.palette.selectedGroup === group.key
                    && this.editor.palette.selectedTileId === i;
                panelCanvases[i].classList.toggle('selected', isSelected);
            }
        }
    }

    updatePreviewForTool() {
        if (this.editor.currentTool === TOOL_PAN || this.editor.currentTool === TOOL_SELECT) {
            this.tilePreview.hide(true);
            return;
        }

        this.tilePreview.hide(false);

        if (this.editor.currentTool === TOOL_ERASE) {
            this.tilePreview.setState('remove');
        } else if (this.editor.currentTool === TOOL_DRAW) {
            this.tilePreview.setTile(this.editor.palette.getCurrentTileData());
        }
    }

    updatePreviewPosition(gridPos) {
        // `.add()` mutates the object, so we want to clone it.
        const centerWorld = gridPos.clone().add(0.5, 0.5).scale(TILE_SIZE);
        const screenPos = this.renderer.wordToScreenPosition(centerWorld);
        this.tilePreview.div.style.left = screenPos.x + 'px';
        this.tilePreview.div.style.top = screenPos.y + 'px';
    }

    _initUndoRedoButtons() {
        document.getElementById('editorUndo').addEventListener('click', () => this.editor.undo());
        document.getElementById('editorRedo').addEventListener('click', () => this.editor.redo());
    }

    hidePreview() {
        this.tilePreview.hide(true);
    }

    showEditorUI() {
        document.getElementById('editorTopBar').hidden = false;
        document.getElementById('editorBottomBar').hidden = false;
        if (!this._dropdownsPopulated) {
            this._dropdownsPopulated = true;
            this._populateAllDropdownPanels();
            this._updateDropdownIcons();
        }
        this.updatePreviewForTool();
    }

    hideEditorUI() {
        document.getElementById('editorTopBar').hidden = true;
        document.getElementById('editorBottomBar').hidden = true;
        this._hideInspector();
        this.currentDialog = null;
        this._dialogCallback = null;
    }

    _initFileButtons() {
        document.getElementById('editorSave').addEventListener('click', () => this.editor._doSave());
        document.getElementById('editorSaveAs').addEventListener('click', () => this.editor._doSaveAs());
        document.getElementById('editorLoad').addEventListener('click', () => this.editor._doLoad());
        document.getElementById('editorNew').addEventListener('click', () => this.editor._doNew());
        document.getElementById('editorTest').addEventListener('click', () => this.editor._doTest());
        document.getElementById('editorUpload').addEventListener('click', () => this.editor._doUpload());
    }

    showNamePrompt(title, defaultName, callback) {
        const ui = Director.getUIManager();
        ui.toggle('blackBackground', true);
        ui.pushState();
        ui.toggle('editorDialogName', true);

        const titleEl = document.getElementById('editorDialogNameTitle');
        const inputEl = document.getElementById('editorDialogNameInput');
        const confirmBtn = document.getElementById('editorDialogNameConfirm');
        const cancelBtn = document.getElementById('editorDialogNameCancel');

        titleEl.textContent = title;
        inputEl.value = defaultName;

        this.currentDialog = 'editorDialogName';
        this._dialogCallback = callback;

        const cleanup = () => {
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            inputEl.removeEventListener('keydown', onKeyDown);
        };

        const dismiss = () => {
            cleanup();
            this.currentDialog = null;
            this._dialogCallback = null;
            ui.popState();
            ui.toggle('blackBackground', false);
        };

        const onConfirm = () => {
            const name = inputEl.value.trim();
            dismiss();
            callback(name);
        };

        const onCancel = () => {
            dismiss();
            callback(null);
        };

        const onKeyDown = (e) => {
            if (e.key === 'Enter') onConfirm();
            if (e.key === 'Escape') onCancel();
        };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
        inputEl.addEventListener('keydown', onKeyDown);

        inputEl.focus();
    }

    showUnsavedWarning(callback) {
        const ui = Director.getUIManager();
        ui.toggle('blackBackground', true);
        ui.pushState();
        ui.toggle('editorDialogWarning', true);

        const saveBtn = document.getElementById('editorDialogWarningSave');
        const discardBtn = document.getElementById('editorDialogWarningDiscard');
        const cancelBtn = document.getElementById('editorDialogWarningCancel');

        this.currentDialog = 'editorDialogWarning';
        this._dialogCallback = callback;

        const cleanup = () => {
            saveBtn.removeEventListener('click', onSave);
            discardBtn.removeEventListener('click', onDiscard);
            cancelBtn.removeEventListener('click', onCancel);
        };

        const dismiss = () => {
            cleanup();
            this.currentDialog = null;
            this._dialogCallback = null;
            ui.popState();
            ui.toggle('blackBackground', false);
        };

        const onSave = () => {
            dismiss();
            callback('save');
        };

        const onDiscard = () => {
            dismiss();
            callback('discard');
        };

        const onCancel = () => {
            dismiss();
            callback('cancel');
        };

        saveBtn.addEventListener('click', onSave);
        discardBtn.addEventListener('click', onDiscard);
        cancelBtn.addEventListener('click', onCancel);
    }

    showConfirmDialog(message, callback) {
        const ui = Director.getUIManager();
        ui.toggle('blackBackground', true);
        ui.pushState();
        ui.toggle('editorDialogConfirm', true);

        document.getElementById('editorDialogConfirmMsg').textContent = message;
        const yesBtn = document.getElementById('editorDialogConfirmYes');
        const noBtn = document.getElementById('editorDialogConfirmNo');

        this.currentDialog = 'editorDialogConfirm';
        this._dialogCallback = callback;

        const cleanup = () => {
            yesBtn.removeEventListener('click', onYes);
            noBtn.removeEventListener('click', onNo);
        };

        const dismiss = () => {
            cleanup();
            this.currentDialog = null;
            this._dialogCallback = null;
            ui.popState();
            ui.toggle('blackBackground', false);
        };

        const onYes = () => {
            dismiss();
            callback(true);
        };

        const onNo = () => {
            dismiss();
            callback(false);
        };

        yesBtn.addEventListener('click', onYes);
        noBtn.addEventListener('click', onNo);
    }

    dismissCurrentDialog() {
        if (!this.currentDialog) return;
        const ui = Director.getUIManager();
        ui.toggle(this.currentDialog, false);
        ui.popState();
        ui.toggle('blackBackground', false);
        this._dialogCallback('cancel');
        this.currentDialog = null;
        this._dialogCallback = null;
    }

    updateLevelNameLabel() {
        const label = document.getElementById('editorLevelName');
        label.textContent = this.editor.world.levelName;
    }

    _initInspector() {
        this._inspectorPanel = document.getElementById('editorInspector');
        this._inspectorPos = null;
    }

    _showInspector(x, y, tile) {
        this._inspectorPos = { x, y, group: tile.data[0], id: tile.data[1] };

        const isMovingPlatform = tile.tileClass.name === 'MovingPlatform';
        const tileName = TileIndex.getName(tile.data[0], tile.data[1]);

        // populate inspector fields
        // NOTE(sss): would like to do that programatically but time constraint didn't allow for it
        let fieldsHtml = '';
        fieldsHtml += `<label>Rotation <input type="number" min="0" max="3" step="1" data-prop="rotation" value="${tile.tileParams.rotation ?? 0}"></label>`;

        if (isMovingPlatform) {
            fieldsHtml += `<label>Target X <input type="number" step="1" data-prop="targetX" value="${tile.tileParams.targetX ?? 0}"></label>`;
            fieldsHtml += `<label>Target Y <input type="number" step="1" data-prop="targetY" value="${tile.tileParams.targetY ?? 0}"></label>`;
            fieldsHtml += `<label>Attack Speed <input type="number" step="1" data-prop="attackSpeed" value="${tile.tileParams.attackSpeed ?? 6000}"></label>`;
            fieldsHtml += `<label>Attack Accel <input type="number" step="1" data-prop="attackAcc" value="${tile.tileParams.attackAcc ?? 2000}"></label>`;
            fieldsHtml += `<label>Recover Speed <input type="number" step="1" data-prop="recoverSpeed" value="${tile.tileParams.recoverSpeed ?? 100}"></label>`;
            fieldsHtml += `<label>Recover Accel <input type="number" step="1" data-prop="recoverAcc" value="${tile.tileParams.recoverAcc ?? 100}"></label>`;
        }

        this._inspectorPanel.innerHTML = `
            <div class="editorInspectorHeader">${tileName}<span class="editorInspectorClose">&times;</span></div>
            <div class="editorInspectorFields">${fieldsHtml}</div>
        `;

        const closeBtn = this._inspectorPanel.querySelector('.editorInspectorClose');
        closeBtn.addEventListener('click', () => this.editor.deselectTile());

        const inputs = this._inspectorPanel.querySelectorAll('input');
        for (const input of inputs) {
            input.addEventListener('input', () => {
                const prop = input.dataset.prop;
                const value = parseInt(input.value, 10);
                if (isNaN(value)) return;
                this.editor.updateTileProperty(this._inspectorPos.x, this._inspectorPos.y, prop, value);
            });
        }

        this._inspectorPanel.hidden = false;
    }

    _hideInspector() {
        this._inspectorPanel.hidden = true;
        this._inspectorPanel.innerHTML = '';
        this._inspectorPos = null;
    }
}
