import { TILE_SIZE } from '../constant.js';
import { Director } from '../director.js';
import { EditorTilePreview } from '../renderer/editorTilePreview.js';
import { InputManager } from '../utils/inputManager.js';
import { Vector } from '../utils/vector.js';
import { EditorTilePalette } from './editorTilePalette.js';
import { TileIndex, TILE_GROUPS } from '../game/tileSystem/tileIndexer.js';

const TOOL_DRAW = 'draw';
const TOOL_ERASE = 'erase';
const TOOL_PAN = 'pan';

const DROPDOWN_GROUPS = TILE_GROUPS.map(key => ({
    key,
    elementId: `editorDropdown${key[0].toUpperCase() + key.slice(1)}`,
}));

/**
 * @description: Main level editor orchestrator.
 * Handles tile placement, erasing, panning, rotation, export, import, and playtest.
 */
export class Editor {
    constructor(canvasContainer, editorWorld, renderer) {
        this.world = editorWorld;
        this.renderer = renderer;
        this.palette = new EditorTilePalette();
        this.tilePreview = new EditorTilePreview(
            document.getElementById('tilePreview'),
            renderer
        );
        this.currentGridPos = new Vector(-1, -1);
        this.lastPlacedGridPos = new Vector(-1, -1);
        this.isPanning = false;

        this.currentTool = TOOL_DRAW;
        this.rectToggle = false;

        this.isDrawingRect = false;
        this.rectStart = new Vector(-1, -1);
        this.rectEnd = new Vector(-1, -1);
        this.rectMode = null;

        this._lastSelectedPerGroup = {};
        for (const g of DROPDOWN_GROUPS) {
            this._lastSelectedPerGroup[g.key] = 0;
        }

        // HACK(sss): hacky solution, couldn't find a better way of preventing
        //            click passthrough to editor canvas without refactoring
        //            a lot...
        document.getElementById('editorTopBar').addEventListener('mousedown', (e) => e.stopPropagation());
        document.getElementById('editorBottomBar').addEventListener('mousedown', (e) => e.stopPropagation());

        this._dropdownsPopulated = false;

        this._initToolButtons();
        this._initDropdowns();
    }

    _initToolButtons() {
        const drawBtn = document.getElementById('editorDraw');
        const eraseBtn = document.getElementById('editorErase');
        const panBtn = document.getElementById('editorPan');
        const rectBtn = document.getElementById('editorRect');

        drawBtn.addEventListener('click', () => this._setActiveTool(TOOL_DRAW));
        eraseBtn.addEventListener('click', () => this._setActiveTool(TOOL_ERASE));
        panBtn.addEventListener('click', () => this._setActiveTool(TOOL_PAN));

        // ignore click when PAN tool selected as it makes no sense to modify this
        // state when in pan mode.
        rectBtn.addEventListener('click', () => {
            if (this.currentTool === TOOL_PAN) return;
            this.rectToggle = !this.rectToggle;
            this._updateRectButtonState();
        });
    }

    _setActiveTool(tool) {
        this.currentTool = tool;

        document.getElementById('editorDraw').classList.toggle('active', tool === TOOL_DRAW);
        document.getElementById('editorErase').classList.toggle('active', tool === TOOL_ERASE);
        document.getElementById('editorPan').classList.toggle('active', tool === TOOL_PAN);

        this._updateRectButtonState();
        this._updatePreviewForTool();
    }

    _updateRectButtonState() {
        const rectBtn = document.getElementById('editorRect');
        const isPan = this.currentTool === TOOL_PAN;
        rectBtn.disabled = isPan;
        rectBtn.classList.toggle('editorRectOn', !isPan && this.rectToggle);
        rectBtn.classList.toggle('editorRectOff', isPan || !this.rectToggle);
    }

    _isRectActive() {
        const rectModifier = InputManager.getAction('rect')?.pressed;
        return this.currentTool !== TOOL_PAN && (this.rectToggle || rectModifier);
    }

    _initDropdowns() {
        for (const group of DROPDOWN_GROUPS) {
            const dropdown = document.getElementById(group.elementId);
            if (!dropdown) continue;

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
            if (dropdown) dropdown.classList.remove('open');
        }
    }

    _populateAllDropdownPanels() {
        for (const group of DROPDOWN_GROUPS) {
            const dropdown = document.getElementById(group.elementId);
            if (!dropdown) continue;
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
                this.palette.selectTile(groupKey, id);
                this._lastSelectedPerGroup[groupKey] = id;
                this._updateDropdownIcons();
                this._updateDropdownSelectionHighlights();
                this._closeAllDropdowns();
                this._updatePreviewForTool();
            });

            panel.appendChild(tileCanvas);
        }
    }

    _refreshDropdownPanel(groupKey, panel) {
        const canvases = panel.querySelectorAll('canvas');
        for (let i = 0; i < canvases.length; i++) {
            canvases[i].classList.toggle('selected',
                this.palette.selectedGroup === groupKey && this.palette.selectedTileId === i);
        }
    }

    _updateDropdownIcons() {
        for (const group of DROPDOWN_GROUPS) {
            const dropdown = document.getElementById(group.elementId);
            if (!dropdown) continue;

            const iconCanvas = dropdown.querySelector('.editorDropdownIcon');
            const ctx = iconCanvas.getContext('2d');
            ctx.clearRect(0, 0, iconCanvas.width, iconCanvas.height);

            const lastId = this._lastSelectedPerGroup[group.key];
            if (lastId >= 0) {
                this.renderer.exportTileSprite(ctx, iconCanvas.width, iconCanvas.height,
                    [group.key, lastId, { rotation: 0 }]);
            }
        }
    }

    _updateDropdownSelectionHighlights() {
        for (const group of DROPDOWN_GROUPS) {
            const dropdown = document.getElementById(group.elementId);
            if (!dropdown) continue;
            const panelCanvases = dropdown.querySelectorAll('.editorDropdownPanel canvas');
            for (let i = 0; i < panelCanvases.length; i++) {
                const isSelected = this.palette.selectedGroup === group.key
                    && this.palette.selectedTileId === i;
                panelCanvases[i].classList.toggle('selected', isSelected);
            }
        }
    }

    _updatePreviewForTool() {
        if (this.currentTool === TOOL_PAN) {
            this.tilePreview.hide(true);
            return;
        }

        this.tilePreview.hide(false);

        if (this.currentTool === TOOL_ERASE) {
            this.tilePreview.setState('remove');
        } else if (this.currentTool === TOOL_DRAW) {
            this.tilePreview.setTile(this.palette.getCurrentTileData());
        }
    }

    update() {
        if (Director.isPause() || !Director.inEditor()) {
            return;
        }

        const mousePos = InputManager.getMousePosition();
        const gridPos = this._screenToGrid(mousePos);

        const panModifier = InputManager.getAction('panModifier');
        const panning = InputManager.isMouseButtonPressed(1) ||
            (panModifier?.pressed && InputManager.isMouseButtonPressed(0)) ||
            (this.currentTool === TOOL_PAN && InputManager.isMouseButtonPressed(0));

        const gridChanged = !gridPos.equals(this.currentGridPos);
        if (gridChanged) {
            this.currentGridPos.set(gridPos.x, gridPos.y);
            if (this.currentTool !== TOOL_PAN) {
                this._updatePreviewPosition(gridPos);
            }
        }

        const wasPanning = this.isPanning;
        this.isPanning = panning;

        // rectangle tool mode
        if (this.isDrawingRect) {
            this.rectEnd.set(gridPos.x, gridPos.y);

            if (panning) {
                const delta = InputManager.getMouseDelta();
                this.world.moveCamera(-delta.x, -delta.y);
            }

            const placePressed = InputManager.getAction('place')?.pressed;
            const erasePressed = InputManager.getAction('erase')?.pressed;

            if (!placePressed && !erasePressed) {
                this._commitRectangle();
                this.isDrawingRect = false;
                this.rectMode = null;
            }
            return;
        }

        if (panning) {
            const delta = InputManager.getMouseDelta();
            this.world.moveCamera(-delta.x, -delta.y);
            return;
        }

        const rectActive = this._isRectActive();
        const placeAction = InputManager.getAction('place');
        const eraseAction = InputManager.getAction('erase');
        const justStoppedPanning = wasPanning && !panning;
        const isDraw = this.currentTool === TOOL_DRAW;

        if (placeAction && !justStoppedPanning) {
            if (placeAction.justPressed && rectActive) {
                this._startRectangle(gridPos, this.currentTool === TOOL_ERASE ? 'erase' : 'place');
            } else if (placeAction.justPressed || (placeAction.pressed && !gridPos.equals(this.lastPlacedGridPos))) {
                if (isDraw)
                    this._placeTile(gridPos);
                else if (this.currentTool === TOOL_ERASE)
                    this._eraseTile(gridPos);
                this.lastPlacedGridPos.set(gridPos.x, gridPos.y);
            }
        }

        if (eraseAction && !justStoppedPanning) {
            if (eraseAction.justPressed && rectActive) {
                this._startRectangle(gridPos, 'erase');
            } else if (eraseAction.justPressed || (eraseAction.pressed && !gridPos.equals(this.lastPlacedGridPos))) {
                this._eraseTile(gridPos);
                this.lastPlacedGridPos.set(gridPos.x, gridPos.y);
            }
        }

        this._handleKeyboard();
    }

    _screenToGrid(screenPos) {
        return this.renderer
            .screenToWordPosition(screenPos)
            .scale(1 / TILE_SIZE)
            .floor();
    }

    _updatePreviewPosition(gridPos) {
        // `.add()` mutates the object, so we want to clone it.
        const centerWorld = gridPos.clone().add(0.5, 0.5).scale(TILE_SIZE);
        const screenPos = this.renderer.wordToScreenPosition(centerWorld);
        this.tilePreview.div.style.left = screenPos.x + 'px';
        this.tilePreview.div.style.top = screenPos.y + 'px';
    }

    _startRectangle(gridPos, mode) {
        this.isDrawingRect = true;
        this.rectMode = mode;
        this.rectStart.set(gridPos.x, gridPos.y);
        this.rectEnd.set(gridPos.x, gridPos.y);
    }

    _commitRectangle() {
        const minX = Math.min(this.rectStart.x, this.rectEnd.x);
        const maxX = Math.max(this.rectStart.x, this.rectEnd.x);
        const minY = Math.min(this.rectStart.y, this.rectEnd.y);
        const maxY = Math.max(this.rectStart.y, this.rectEnd.y);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (this.rectMode === 'place') {
                    this.world.setTile(x, y, this.palette.getCurrentTileData());
                } else {
                    this.world.setTile(x, y, null);
                }
            }
        }
    }

    _placeTile(gridPos) {
        const data = this.palette.getCurrentTileData();
        this.world.setTile(gridPos.x, gridPos.y, data);
    }

    _eraseTile(gridPos) {
        this.world.setTile(gridPos.x, gridPos.y, null);
    }

    _handleKeyboard() {
        if (InputManager.getAction('rotate')?.justPressed) {
            this.palette.rotate();
            this._updatePreviewForTool();
        }
    }

    export() {
        return this.world.export();
    }

    hidePreview() {
        this.tilePreview.hide(true);
    }

    showBars() {
        document.getElementById('editorTopBar').hidden = false;
        document.getElementById('editorBottomBar').hidden = false;
        if (!this._dropdownsPopulated) {
            this._dropdownsPopulated = true;
            this._populateAllDropdownPanels();
            this._updateDropdownIcons();
        }
        this._updatePreviewForTool();
    }

    hideBars() {
        document.getElementById('editorTopBar').hidden = true;
        document.getElementById('editorBottomBar').hidden = true;
    }

    renderOverlay() {
        if (!this.isDrawingRect) return;

        const context = this.renderer.contextEditorOverlay;

        const minX = Math.min(this.rectStart.x, this.rectEnd.x);
        const maxX = Math.max(this.rectStart.x, this.rectEnd.x);
        const minY = Math.min(this.rectStart.y, this.rectEnd.y);
        const maxY = Math.max(this.rectStart.y, this.rectEnd.y);

        context.save(); // so we can enable alpha then restore
        context.globalAlpha = 0.5;

        const screenPos = new Vector(0, 0);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                this.renderer.wordToScreenPosition(
                    new Vector(x * TILE_SIZE, y * TILE_SIZE),
                    screenPos
                );

                if (this.rectMode === 'place') {
                    context.fillStyle = 'rgba(128, 128, 128, 0.3)';
                } else {
                    context.fillStyle = 'rgba(255, 0, 85, 0.3)';
                }
                context.fillRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);
            }
        }

        // grey border
        const topLeft = this.renderer.wordToScreenPosition(
            new Vector(minX * TILE_SIZE, minY * TILE_SIZE)
        );
        const bottomRight = this.renderer.wordToScreenPosition(
            new Vector((maxX + 1) * TILE_SIZE, (maxY + 1) * TILE_SIZE)
        );
        context.strokeStyle = '#888888';
        context.lineWidth = 3;
        context.strokeRect(
            topLeft.x,
            topLeft.y,
            bottomRight.x - topLeft.x,
            bottomRight.y - topLeft.y
        );

        context.restore();
    }
}
