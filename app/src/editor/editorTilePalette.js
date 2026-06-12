/**
 * Holds the currently selected tile (group + ID) and rotation.
 * "Helper" to hold the state for both the Editor and EditorUi.
 */
export class EditorTilePalette {
    constructor() {
        this.selectedTileId = 0;
        this.selectedGroup = 'terrain';
        this.rotation = 0;
    }

    /**
     * Select a tile from a given group.
     * @param {string} group: tile group key (ex. 'terrain', 'hazards')
     * @param {number} id: tile index within the group
     */
    selectTile(group, id) {
        this.selectedGroup = group;
        this.selectedTileId = id;
    }

    /**
     * Rotate the current tile by 90 degrees clockwise.
     */
    rotate() {
        this.rotation = (this.rotation + 1) % 4;
    }

    /**
     * Build the tile data array for the currently selected tile and rotation.
     * @returns {Array|null} [group, id, {rotation}] or null if no tile selected
     */
    getCurrentTileData() {
        if (this.selectedTileId < 0) {
            return null;
        }
        return [this.selectedGroup, this.selectedTileId, { rotation: this.rotation }];
    }
}
