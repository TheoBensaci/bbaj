export class EditorTilePalette {
    constructor() {
        this.selectedTileId = 0;
        this.selectedGroup = 'terrain';
        this.rotation = 0;
    }

    selectTile(group, id) {
        this.selectedGroup = group;
        this.selectedTileId = id;
    }

    rotate() {
        this.rotation = (this.rotation + 1) % 4;
    }

    getCurrentTileData() {
        if (this.selectedTileId < 0) {
            return null;
        }
        return [this.selectedGroup, this.selectedTileId, { rotation: this.rotation }];
    }
}
