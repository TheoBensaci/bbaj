import { TILE_SIZE } from '../constant.js';
import { Director } from '../director.js';
import { EditorUi } from './editorUi.js';
import { InputManager } from '../utils/inputManager.js';
import { UndoManager } from '../vendor/undomanager.js';
import { Vector } from '../utils/vector.js';
import { EditorTilePalette } from './editorTilePalette.js';
import { downloadJsonFile, loadLevelFromFile } from '../utils/fileUtils.js';
import { getSaveItem, setSaveItem, hasSaveItem } from '../utils/saveManager.js';

const TOOL_DRAW = 'draw';
const TOOL_ERASE = 'erase';
const TOOL_PAN = 'pan';

/**
 * @description: Main level editor orchestrator.
 * Handles tile placement, erasing, panning, rotation, export, import, and playtest.
 */
export class Editor {
    constructor(canvasContainer, editorWorld, renderer) {
        this.world = editorWorld;
        this.renderer = renderer;
        this.palette = new EditorTilePalette();
        this.currentGridPos = new Vector(-1, -1);
        this.lastPlacedGridPos = new Vector(-1, -1);
        this.isPanning = false;

        this.currentTool = TOOL_DRAW;
        this.rectToggle = false;

        this.isDrawingRect = false;
        this.rectStart = new Vector(-1, -1);
        this.rectEnd = new Vector(-1, -1);
        this.rectMode = null;

        // --- undo / redo ---
        this.undoManager = new UndoManager();
        this.undoManager.setCallback(() => this._afterUndoRedo());
        this._strokeGroupId = null;
        this._isStroking = false;
        this._savePointIndex = -1;

        this.ui = new EditorUi(this, renderer);
    }

    _setActiveTool(tool) {
        this.currentTool = tool;
        this.ui.onToolChanged(tool);
    }

    _isRectActive() {
        const rectModifier = InputManager.getAction('rect')?.pressed;
        return this.currentTool !== TOOL_PAN && (this.rectToggle || rectModifier);
    }

    update() {
        if (Director.isPause() || !Director.inEditor()) return;
        if (this.ui.currentDialog) return;

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
                this.ui.updatePreviewPosition(gridPos);
            }
        }

        const wasPanning = this.isPanning;
        this.isPanning = panning;

        // === Rectangle Drawin In Progress ===
        // ====================================
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
                this._autoSave();
            }
            return;
        }

        // === Camera Panning ===
        // ======================
        if (panning) {
            const delta = InputManager.getMouseDelta();
            this.world.moveCamera(-delta.x, -delta.y);
            return;
        }

        // === Tile Editing ===
        // ====================
        const rectActive = this._isRectActive();
        const placeAction = InputManager.getAction('place');
        const eraseAction = InputManager.getAction('erase');
        const justStoppedPanning = wasPanning && !panning;
        const justPressed = placeAction?.justPressed || eraseAction?.justPressed;

        // what the user is actually trying to do (ugly but the branches were
        // getting even uglier without this :c)
        let actualOp = null;
        if (placeAction?.pressed) {
            if (this.currentTool === TOOL_DRAW) actualOp = 'place';
            else if (this.currentTool === TOOL_ERASE) actualOp = 'erase';
        } else if (eraseAction?.pressed) {
            actualOp = 'erase';
        }

        if (actualOp && !justStoppedPanning) {
            if (justPressed && rectActive) {
                this._startRectangle(gridPos, actualOp);
            } else if (justPressed || gridChanged) {
                if (justPressed) {
                    this._strokeGroupId = Symbol('stroke');
                    this._isStroking = true;
                }
                if (actualOp === 'place') this._placeTile(gridPos);
                else if (actualOp === 'erase') this._eraseTile(gridPos);

                this.lastPlacedGridPos.set(gridPos.x, gridPos.y);
            }
        }

        if (this._isStroking && !(placeAction?.pressed || eraseAction?.pressed)) {
            this._isStroking = false;
            this._autoSave();
        }

        this._handleKeyboard();
    }

    _screenToGrid(screenPos) {
        return this.renderer
            .screenToWordPosition(screenPos)
            .scale(1 / TILE_SIZE)
            .floor();
    }

    _startRectangle(gridPos, mode) {
        this.isDrawingRect = true;
        this.rectMode = mode;
        this.rectStart.set(gridPos.x, gridPos.y);
        this.rectEnd.set(gridPos.x, gridPos.y);
        this._strokeGroupId = Symbol('rect');
    }

    _commitRectangle() {
        const minX = Math.min(this.rectStart.x, this.rectEnd.x);
        const maxX = Math.max(this.rectStart.x, this.rectEnd.x);
        const minY = Math.min(this.rectStart.y, this.rectEnd.y);
        const maxY = Math.max(this.rectStart.y, this.rectEnd.y);

        const newData = this.palette.getCurrentTileData();

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const oldTile = this.world.getTile(x, y);
                const oldTileData = oldTile ? oldTile.data : null;
                if (this.rectMode === 'place') {
                    this.world.setTile(x, y, newData);
                    this._recordTileChange(x, y, oldTileData, newData);
                } else {
                    if (!oldTile) continue;
                    this.world.setTile(x, y, null);
                    this._recordTileChange(x, y, oldTileData, null);
                }
            }
        }
    }

    _placeTile(gridPos) {
        const oldTile = this.world.getTile(gridPos.x, gridPos.y);
        const oldTileData = oldTile ? oldTile.data : null;
        const data = this.palette.getCurrentTileData();
        if (oldTileData && oldTileData[0] === data[0] && oldTileData[1] === data[1]
            && oldTileData[2].rotation === data[2].rotation) return;
        this.world.setTile(gridPos.x, gridPos.y, data);
        this._recordTileChange(gridPos.x, gridPos.y, oldTileData, data);
    }

    _eraseTile(gridPos) {
        const oldTile = this.world.getTile(gridPos.x, gridPos.y);
        if (!oldTile) return;
        this.world.setTile(gridPos.x, gridPos.y, null);
        this._recordTileChange(gridPos.x, gridPos.y, oldTile.data, null);
    }

    _recordTileChange(x, y, oldData, newData) {
        this.undoManager.add({
            undo: () => {
                this.world.setTile(x, y, oldData);
            },
            redo: () => {
                this.world.setTile(x, y, newData);
            },
            groupId: this._strokeGroupId,
        });
    }

    _handleKeyboard() {
        if (InputManager.getAction('rotate')?.justPressed) {
            this.palette.rotate();
            this.ui.updatePreviewForTool();
        }

        if (InputManager.getAction('undo')?.justPressed)
            this.undo();

        if (InputManager.getAction('redo')?.justPressed)
            this.redo();
    }

    undo() {
        this.undoManager.undo();
    }

    redo() {
        this.undoManager.redo();
    }

    _afterUndoRedo() {
        if (this.undoManager.getIndex() <= this._savePointIndex) {
            this.world.markClean();
        }
    }

    markSaved() {
        this._savePointIndex = this.undoManager.getIndex();
        this.world.markClean();
    }

    export() {
        return this.world.export();
    }

    showEditorUI() {
        this.ui.showEditorUI();
        this._autoLoadOrPrompt();
    }

    hideEditorUI() {
        this.ui.hideEditorUI();
    }

    hidePreview() {
        this.ui.hidePreview();
    }

    _autoSave() {
        const data = this.world.export();
        setSaveItem('currentLevel', data);
    }

    _doSave() {
        const data = this.world.export();
        setSaveItem('currentLevel', data);
        const filename = this.world.levelName + '.json';
        downloadJsonFile(filename, data);
        this.markSaved();
    }

    _doSaveAs() {
        this.ui.showNamePrompt('Save As', this.world.levelName, (name) => {
            if (!name) return;
            this.world.levelName = name;
            const data = this.world.export();
            setSaveItem('currentLevel', data);
            downloadJsonFile(name + '.json', data);
            this.markSaved();
            this.ui.updateLevelNameLabel();
        });
    }

    _doLoad() {
        if (this.world.isDirty()) {
            this.ui.showUnsavedWarning((action) => {
                if (action === 'save') {
                    this._doSave();
                    this._openFilePicker();
                } else if (action === 'discard') {
                    this._openFilePicker();
                }
            });
        } else {
            this._openFilePicker();
        }
    }

    _openFilePicker() {
        loadLevelFromFile((data) => {
            if (!data || !data.data) return;
            this.world.import(data);
            this.undoManager.clear();
            this._savePointIndex = this.undoManager.getIndex();
            this.world.markClean();
            setSaveItem('currentLevel', data);
            this.ui.updateLevelNameLabel();
        });
    }

    _doNew() {
        if (this.world.isDirty()) {
            this.ui.showUnsavedWarning((action) => {
                if (action === 'save') {
                    this._doSave();
                    this._showNewLevelPrompt();
                } else if (action === 'discard') {
                    this._showNewLevelPrompt();
                }
            });
        } else {
            this._showNewLevelPrompt();
        }
    }

    _showNewLevelPrompt() {
        this.ui.showNamePrompt('New Level', '', (name) => {
            if (!name) return;
            this._createEmptyLevel(name);
            const data = this.world.export();
            setSaveItem('currentLevel', data);
            this.ui.updateLevelNameLabel();
        });
    }

    _createEmptyLevel(name) {
        this.world.level = [];
        this.world.levelName = name;
        this.world.backgroundColor = '#555555';
        this.world.markClean();
        this.undoManager.clear();
        this._savePointIndex = this.undoManager.getIndex();
    }

    _autoLoadOrPrompt() {
        if (hasSaveItem('currentLevel')) {
            const data = getSaveItem('currentLevel');
            if (data && data.data) {
                this.world.import(data);
                this.undoManager.clear();
                this._savePointIndex = this.undoManager.getIndex();
                this.world.markClean();
                this.ui.updateLevelNameLabel();
                return;
            }
        }
        this.ui.showNamePrompt('New Level', '', (name) => {
            if (!name) {
                this._createEmptyLevel('Untitled');
                this.ui.updateLevelNameLabel();
                return;
            }
            this._createEmptyLevel(name);
            const data = this.world.export();
            setSaveItem('currentLevel', data);
            this.ui.updateLevelNameLabel();
        });
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
