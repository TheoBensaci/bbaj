import { TILE_SIZE } from '../constant.js';
import { Director } from '../director.js';
import { EditorTilePreview } from '../renderer/editorTilePreview.js';
import { InputManager } from '../utils/inputManager.js';
import { Vector } from '../utils/vector.js';
import { EditorTilePalette } from './editorTilePalette.js';

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

        // Rectangle tool state
        this.isDrawingRect = false;
        this.rectStart = new Vector(-1, -1);
        this.rectEnd = new Vector(-1, -1);
        this.rectMode = null;
    }

    update() {
        if (Director.isPause() || !Director.inEditor()) {
            return;
        }

        const mousePos = InputManager.getMousePosition();
        const gridPos = this._screenToGrid(mousePos);
        const rectModifier = InputManager.getAction('rect')?.pressed;

        const panModifier = InputManager.getAction('panModifier');
        const panning = InputManager.isMouseButtonPressed(1) ||
            (panModifier?.pressed && InputManager.isMouseButtonPressed(0));

        const gridChanged = !gridPos.equals(this.currentGridPos);
        if (gridChanged) {
            this.currentGridPos.set(gridPos.x, gridPos.y);
            this._updatePreviewPosition(gridPos);
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

            const placeReleased = this.rectMode === 'place' && !InputManager.getAction('place')?.pressed;
            const eraseReleased = this.rectMode === 'erase' && !InputManager.getAction('erase')?.pressed;

            if (placeReleased || eraseReleased) {
                this._commitRectangle();
                this.isDrawingRect = false;
                this.rectMode = null;
            }
            return;
        }

        if (panning) {
            const delta = InputManager.getMouseDelta();
            this.world.moveCamera(-delta.x, -delta.y);
        } else {
            const placeAction = InputManager.getAction('place');
            const eraseAction = InputManager.getAction('erase');
            const justStoppedPanning = wasPanning && !panning;

            if (placeAction && !justStoppedPanning) {
                if (placeAction.justPressed && rectModifier) {
                    this._startRectangle(gridPos, 'place');
                } else if (placeAction.justPressed) {
                    this._placeTile(gridPos);
                    this.lastPlacedGridPos.set(gridPos.x, gridPos.y);
                } else if (placeAction.pressed && !gridPos.equals(this.lastPlacedGridPos)) {
                    this._placeTile(gridPos);
                    this.lastPlacedGridPos.set(gridPos.x, gridPos.y);
                }
            }

            if (eraseAction && !justStoppedPanning) {
                if (eraseAction.justPressed && rectModifier) {
                    this._startRectangle(gridPos, 'erase');
                } else if (eraseAction.justPressed) {
                    this._eraseTile(gridPos);
                    this.lastPlacedGridPos.set(gridPos.x, gridPos.y);
                } else if (eraseAction.pressed && !gridPos.equals(this.lastPlacedGridPos)) {
                    this._eraseTile(gridPos);
                    this.lastPlacedGridPos.set(gridPos.x, gridPos.y);
                }
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
            this._refreshPreview();
        }

        const selectActions = [
            { name: 'selectEraser', id: -1 },
            { name: 'selectTile0', id: 0 },
            { name: 'selectTile1', id: 10 },
            { name: 'selectTile2', id: 2 },
            { name: 'selectTile3', id: 3 },
            { name: 'selectTile4', id: 4 },
            { name: 'selectTile5', id: 5 },
            { name: 'selectTile6', id: 6 },
            { name: 'selectTile7', id: 7 },
            { name: 'selectTile8', id: 8 },
        ];

        for (const sel of selectActions) {
            if (InputManager.getAction(sel.name)?.justPressed) {
                this.palette.selectTile(sel.id);
                this._refreshPreview();
                break;
            }
        }

        if (InputManager.getAction('exportLevel')?.justPressed) {
            this._exportAndPlay();
        }

        if (InputManager.getAction('importLevel')?.justPressed) {
            Director.importLevel(TEST_LEVEL_DATA);
        }
    }

    _refreshPreview() {
        const data = this.palette.getCurrentTileData();
        if (data === null) {
            this.tilePreview.setState('remove');
        } else {
            this.tilePreview.setState('');
            this.tilePreview.setTile(data);
        }
    }

    _exportAndPlay() {
        const data = this.world.export();
        navigator.clipboard.writeText(
            'export const TEST_LEVEL_DATA = ' + JSON.stringify(data, null, '\t')
                .replaceAll('],\n\t\'', '],\n\n\t\'')
        );
        Director.loadLevel(data);
    }

    export() {
        return this.world.export();
    }

    hidePreview() {
        this.tilePreview.hide(true);
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
