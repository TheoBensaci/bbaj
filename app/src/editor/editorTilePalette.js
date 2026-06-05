/**
 * @ Autheur: Theo Bensaci
 * @ Date: 14:17 29.06.2026
 * @ Description: Manages the currently selected tile, rotation, and group for the editor.
 */

export class EditorTilePalette {
    constructor() {
        this.selectedTileId = -1; // -1 = eraser
        this.rotation = 0;
        this.group = 'main';
    }

    selectTile(id) {
        this.selectedTileId = id;
    }

    rotate() {
        this.rotation = (this.rotation + 1) % 4;
    }

    getCurrentTileData() {
        if (this.selectedTileId === -1) {
            return null;
        }
        return [this.group, this.selectedTileId, { rotation: this.rotation }];
    }
}
