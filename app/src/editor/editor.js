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
const TOOL_SELECT = 'select';

/**
 * @description: Main level editor orchestrator.
 * Handles tile placement, erasing, panning, rotation, export, import, and playtest.
 */
export class Editor {
    /**
     * @param {HTMLElement} canvasContainer: the DOM container for the game canvas
     * @param {EditorWorld} editorWorld: the world model for the editor
     * @param {Renderer} renderer: the game renderer
     */
    constructor(canvasContainer, editorWorld, renderer) {
        this.world = editorWorld;
        this.renderer = renderer;
        this.palette = new EditorTilePalette();
        this.currentGridPos = new Vector(-1, -1);
        this.lastPlacedGridPos = new Vector(-1, -1);
        this.isPanning = false;

        this.currentTool = TOOL_DRAW;
        this.rectToggle = false;
        this.selectedGridPos = null;

        // rectangle drawing state (click-drag to fill area)
        this.isDrawingRect = false;
        this.rectStart = new Vector(-1, -1);
        this.rectEnd = new Vector(-1, -1);
        this.rectMode = null;

        // --- undo / redo ---
        // Stroke-group batching: all tile operations performed while the mouse button
        // is held down share a groupId so they undo/redo as a single action.
        this.undoManager = new UndoManager();
        this.undoManager.setCallback(() => this._afterUndoRedo());
        this._strokeGroupId = null;
        this._isStroking = false;

        // save-point: undo index considered "saved". When we undo past this point,
        // the world is marked as dirty again.
        this._savePointIndex = -1;

        this.ui = new EditorUi(this, renderer);
    }

    /**
     * Switch the active tool, deselecting any selected tile first.
     * @param {string} tool: one of TOOL_DRAW, TOOL_ERASE, TOOL_PAN, TOOL_SELECT
     */
    _setActiveTool(tool) {
        if (this.currentTool !== tool) {
            if (this.selectedGridPos) this.deselectTile();
        }
        this.currentTool = tool;
        this.ui.onToolChanged(tool);
    }

    /**
     * Whether rectangle mode is currently active.
     * True when rectToggle is on AND not in pan/select mode, or when the
     * rect modifier key is held.
     * @returns {boolean}
     */
    _isRectActive() {
        const rectModifier = InputManager.getAction('rect')?.pressed;
        return this.currentTool !== TOOL_PAN && this.currentTool !== TOOL_SELECT && (this.rectToggle || rectModifier);
    }

    /**
     * Per-frame update. Reads input, handles panning, tile placement/erasure (single + rectangle),
     * stroke grouping, and keyboard shortcuts. Early-exits if paused, not in editor, or a dialog is open.
     */
    update() {
        if (Director.isPause() || !Director.inEditor()) return;
        if (this.ui.currentDialog) return;

        this.ui._updateRectButtonState();

        const mousePos = InputManager.getMousePosition();
        const gridPos = this._screenToGrid(mousePos);

        // panning triggers: middle mouse button, or modifier+left, or PAN tool + left click
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

        // === Rectangle Drawing In Progress ===
        // while the mouse is held in rect mode, keep extending the rect area.
        // on release, commit the entire rectangle of tiles at once.
        // =======================================
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
        // pan overrides all tile editing. just move the camera.
        // ======================
        if (panning) {
            const delta = InputManager.getMouseDelta();
            this.world.moveCamera(-delta.x, -delta.y);
            return;
        }

        // === Tile Editing (Place / Erase) ===
        // ====================================
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

        // end of stroke: auto-save when mouse button is released
        if (this._isStroking && !(placeAction?.pressed || eraseAction?.pressed)) {
            this._isStroking = false;
            this._autoSave();
        }

        // select tool: left-click picks a tile for inspection
        if (this.currentTool === TOOL_SELECT && placeAction?.justPressed) {
            const tile = this.world.getTile(gridPos.x, gridPos.y);
            if (tile) {
                this.selectTile(gridPos.x, gridPos.y, tile);
            } else {
                this.deselectTile();
            }
        }

        this._handleKeyboard();
    }

    /**
     * Convert a screen-space position to a grid coordinate.
     * @param {Vector} screenPos: mouse position in screen pixels
     * @returns {Vector} grid position (floored)
     */
    _screenToGrid(screenPos) {
        return this.renderer
            .screenToWordPosition(screenPos)
            .scale(1 / TILE_SIZE)
            .floor();
    }

    /**
     * Begin a rectangle-drawing operation. Sets initial rect and stroke group.
     * @param {Vector} gridPos: starting grid cell
     * @param {string} mode: 'place' or 'erase'
     */
    _startRectangle(gridPos, mode) {
        this.isDrawingRect = true;
        this.rectMode = mode;
        this.rectStart.set(gridPos.x, gridPos.y);
        this.rectEnd.set(gridPos.x, gridPos.y);
        this._strokeGroupId = Symbol('rect');
    }

    /**
     * Commit the current rectangle: place or erase every tile between rectStart and rectEnd.
     * All changes share the same stroke group for undo/redo.
     */
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

    /**
     * Place a single tile at gridPos. Skips if identical tile already exists.
     * @param {Vector} gridPos
     */
    _placeTile(gridPos) {
        const oldTile = this.world.getTile(gridPos.x, gridPos.y);
        const oldTileData = oldTile ? oldTile.data : null;
        const data = this.palette.getCurrentTileData();
        if (oldTileData && oldTileData[0] === data[0] && oldTileData[1] === data[1]
            && oldTileData[2].rotation === data[2].rotation) return;
        this.world.setTile(gridPos.x, gridPos.y, data);
        this._recordTileChange(gridPos.x, gridPos.y, oldTileData, data);
    }

    /**
     * Erase the tile at gridPos. Deselects if the erased tile was selected.
     * @param {Vector} gridPos
     */
    _eraseTile(gridPos) {
        const oldTile = this.world.getTile(gridPos.x, gridPos.y);
        if (!oldTile) return;
        if (this.selectedGridPos && this.selectedGridPos.x === gridPos.x && this.selectedGridPos.y === gridPos.y) {
            this.deselectTile();
        }
        this.world.setTile(gridPos.x, gridPos.y, null);
        this._recordTileChange(gridPos.x, gridPos.y, oldTile.data, null);
    }

    /**
     * Register a tile change with the undo manager. Uses the current stroke group
     * so that all changes in a single mouse drag undo/redo together.
     * @param {number} x: grid x position
     * @param {number} y: grid y position
     * @param {Array|null} oldData: previous tile data (null if empty)
     * @param {Array|null} newData: new tile data (null if erased)
     */
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

    /**
     * Select a tile for the inspector panel.
     * @param {number} x: grid x position
     * @param {number} y: grid y position
     * @param {TileEditorWrapper} tile: the selected tile
     */
    selectTile(x, y, tile) {
        this.selectedGridPos = { x, y };
        this.ui._showInspector(x, y, tile);
    }

    /**
     * Deselect the currently inspected tile and hide the inspector.
     */
    deselectTile() {
        if (!this.selectedGridPos) return;
        this.selectedGridPos = null;
        this.ui._hideInspector();
    }

    /**
     * Change a property of the selected tile (called by inspector inputs).
     * @param {number} x: grid x position
     * @param {number} y: grid y position
     * @param {string} propKey: property name (e.g. 'rotation', 'targetX')
     * @param {number} value: new value
     */
    updateTileProperty(x, y, propKey, value) {
        const tile = this.world.getTile(x, y);
        if (!tile) return;
        const newParams = { ...tile.tileParams, [propKey]: value };
        this.world.updateTileParams(x, y, newParams);
    }

    /**
     * Process keyboard shortcuts: rotate, tool switching, rect toggle, undo/redo.
     * Skipped when the inspector input fields are focused.
     */
    _handleKeyboard() {
        if (document.activeElement?.closest('#editorInspector')) return;

        if (InputManager.getAction('rotate')?.justPressed) {
            this.palette.rotate();
            this.ui.updatePreviewForTool();
        }

        if (InputManager.getAction('drawTool')?.justPressed)
            this._setActiveTool(TOOL_DRAW);

        if (InputManager.getAction('eraseTool')?.justPressed)
            this._setActiveTool(TOOL_ERASE);

        if (InputManager.getAction('selectTool')?.justPressed)
            this._setActiveTool(TOOL_SELECT);

        if (InputManager.getAction('rectToggle')?.justPressed) {
            if (this.currentTool !== TOOL_PAN) {
                this.rectToggle = !this.rectToggle;
                this.ui._updateRectButtonState();
            }
        }

        if (InputManager.getAction('undo')?.justPressed)
            this.undo();

        if (InputManager.getAction('redo')?.justPressed)
            this.redo();
    }

    /**
     * Undo the last operation (or stroke group).
     */
    undo() {
        this.undoManager.undo();
    }

    /**
     * Redo the last undone operation (or stroke group).
     */
    redo() {
        this.undoManager.redo();
    }

    /**
     * Called after every undo/redo. If we've undone past the last save point,
     * the world is marked dirty again.
     */
    _afterUndoRedo() {
        if (this.undoManager.getIndex() <= this._savePointIndex) {
            this.world.markClean();
        }
    }

    /**
     * Record the current undo position as the "saved" state.
     */
    markSaved() {
        this._savePointIndex = this.undoManager.getIndex();
        this.world.markClean();
    }

    /**
     * Export the current level data for saving/testing/uploading.
     * @returns {{data: Array, backgroundColor: string, name: string}}
     */
    export() {
        return this.world.export();
    }

    /**
     * Show the editor UI and either restore the last session or prompt for a new level.
     */
    showEditorUI() {
        this.ui.showEditorUI();
        this._autoLoadOrPrompt();
    }

    /**
     * Hide the editor UI.
     */
    hideEditorUI() {
        this.deselectTile();
        this.ui.hideEditorUI();
    }

    /**
     * Hide the tile preview.
     */
    hidePreview() {
        this.ui.hidePreview();
    }

    /**
     * Auto-save the current level to localStorage.
     */
    _autoSave() {
        const data = this.world.export();
        setSaveItem('currentLevel', data);
    }

    /**
     * Save the level to a downloadable JSON file and mark as clean.
     */
    _doSave() {
        const data = this.world.export();
        setSaveItem('currentLevel', data);
        const filename = this.world.levelName + '.json';
        downloadJsonFile(filename, data);
        this.markSaved();
    }

    /**
     * Save As: prompt for a new name, then save and download.
     */
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

    /**
     * Load a level from a file. Prompts unsaved warning if the current level is dirty.
     */
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

    /**
     * Open the browser file picker, parse the selected JSON, and import the level.
     */
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

    /**
     * Create a new empty level. Warns if current level has unsaved changes.
     */
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

    /**
     * Show the name prompt for a new level.
     */
    _showNewLevelPrompt() {
        this.ui.showNamePrompt('New Level', '', (name) => {
            if (!name) return;
            this._createEmptyLevel(name);
            const data = this.world.export();
            setSaveItem('currentLevel', data);
            this.ui.updateLevelNameLabel();
        });
    }

    /**
     * Reset the world to a blank level with the given name.
     * @param {string} name: level name
     */
    _createEmptyLevel(name) {
        this.world.level = [];
        this.world.levelName = name;
        this.world.backgroundColor = '#555555';
        this.world.markClean();
        this.undoManager.clear();
        this._savePointIndex = this.undoManager.getIndex();
    }

    /**
     * Test the level: auto-save, then load it into the game mode.
     */
    _doTest() {
        const data = this.world.export();
        setSaveItem('currentLevel', data);
        Director.loadLevel(data);
    }

    /**
     * Upload the level to the server via POST /publishMap.
     * Shows a confirm dialog with the result.
     */
    _doUpload() {
        const data = this.world.export();
        fetch('/publishMap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ map: data }),
        })
            .then(res => {
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                return res.json();
            })
            .then(() => {
                this.ui.showConfirmDialog('Level uploaded successfully.', () => {});
            })
            .catch(err => {
                this.ui.showConfirmDialog('Upload failed: ' + err.message, () => {});
            });
    }

    /**
     * When the editor UI opens: try to restore last session from localStorage
     * or prompt for a new level name.
     */
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

    /**
     * Render the editor overlay: selected-tile highlight border, and
     * in-progress rectangle fill preview.
     */
    renderOverlay() {
        const context = this.renderer.contextEditorOverlay;

        // draw selected tile overlay
        if (this.selectedGridPos) {
            const screenPos = new Vector(0, 0);
            this.renderer.wordToScreenPosition(
                new Vector(this.selectedGridPos.x * TILE_SIZE, this.selectedGridPos.y * TILE_SIZE),
                screenPos
            );
            context.save();
            context.strokeStyle = '#55ccff';
            context.lineWidth = 3;
            context.strokeRect(screenPos.x + 1, screenPos.y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            context.restore();
        }

        if (!this.isDrawingRect) return;

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
