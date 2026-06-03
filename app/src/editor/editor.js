import { TILE_SIZE } from '../constant.js';
import { Director } from '../director.js';
import { EditorTilePreview } from '../renderer/editorTilePreview.js';
import { InputManager } from '../utils/inputManager.js';
import { Vector } from '../utils/vector.js';
import { EditorTilePalette } from './editorTilePalette.js';
import { TEST_LEVEL_DATA } from '../testLevel.js';

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
    }

    update() {
        if (!Director.inEditor()) {
            this.tilePreview.hide(true);
            return;
        }

        this.tilePreview.hide(false);

        const mousePos = InputManager.getMousePosition();
        const gridPos = this._screenToGrid(mousePos);

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

        if (panning) {
            const delta = InputManager.getMouseDelta();
            this.world.moveCamera(-delta.x, -delta.y);
        } else {
            const placeAction = InputManager.getAction('place');
            const eraseAction = InputManager.getAction('erase');
            const justStoppedPanning = wasPanning && !panning;

            if (placeAction && !justStoppedPanning) {
                if (placeAction.justPressed) {
                    this._placeTile(gridPos);
                    this.lastPlacedGridPos.set(gridPos.x, gridPos.y);
                } else if (placeAction.pressed && !gridPos.equals(this.lastPlacedGridPos)) {
                    this._placeTile(gridPos);
                    this.lastPlacedGridPos.set(gridPos.x, gridPos.y);
                }
            }

            if (eraseAction && !justStoppedPanning) {
                if (eraseAction.justPressed) {
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
        const centerWorld = gridPos.add(0.5, 0.5).scale(TILE_SIZE);
        const screenPos = this.renderer.wordToScreenPosition(centerWorld);
        this.tilePreview.div.style.left = screenPos.x + 'px';
        this.tilePreview.div.style.top = screenPos.y + 'px';
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
            { name: 'selectTile1', id: 1 },
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
}
