export const TILE_GROUP = Object.freeze({
    TERRAIN: 'terrain',
    HAZARDS: 'hazards',
    MECHANICS: 'mechanics',
    LOGIC: 'logic',
});
export const TILE_GROUPS = Object.values(TILE_GROUP);

export class TileIndex {
    static #data = new Map();

    static createGroup(groupID) {
        if (TileIndex.#data.has(groupID)) {
            throw new Error('Group ID "' + groupID + '" all ready exist');
        }
        TileIndex.#data.set(groupID, []);
    }

    static registerTile(groupID, TileClass) {
        if (!TileIndex.#data.has(groupID)) {
            throw new Error('Group ID "' + groupID + '" dosn\'t exist');
        }
        const id = TileIndex.#data.get(groupID).length;
        TileIndex.#data.get(groupID).push(TileClass);
        return id;
    }

    static createTile(groupID, id, params = {}) {
        if (!TileIndex.#data.has(groupID)) {
            throw new Error('Group ID "' + groupID + '" dosn\'t exist');
        }
        const tileGroup = TileIndex.#data.get(groupID);
        if (id < 0 || tileGroup.length <= id) {
            throw new Error('ID "' + id + '" dosn\'t exist in the group "' + groupID + '"');
        }
        return tileGroup[id].createTile(params);
    }

    /**
     * Get the tile class
     * @param {*} groupID
     * @param {*} id
     * @returns Tile propotype object
     */
    static getTileClass(groupID, id) {
        if (!TileIndex.#data.has(groupID)) {
            throw new Error('Group ID "' + groupID + '" dosn\'t exist');
        }
        const tileGroup = TileIndex.#data.get(groupID);
        if (id < 0 || tileGroup.length <= id) {
            throw new Error('ID "' + id + '" dosn\'t exist in the group "' + groupID + '"');
        }
        return tileGroup[id];
    }

    /**
     * Get tile name
     * @param {*} groupID
     * @param {*} id
     */
    static getGroupTileCount(groupID) {
        if (!TileIndex.#data.has(groupID)) return 0;
        return TileIndex.#data.get(groupID).length;
    }

    static getName(groupID, id) {
        if (!TileIndex.#data.has(groupID)) {
            return 'none';
        }
        const tileGroup = TileIndex.#data.get(groupID);
        if (id < 0 || tileGroup.length <= id) {
            return 'none';
        }
        return tileGroup[id].name;
    }
}
