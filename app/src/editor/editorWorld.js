import { TILE_SIZE, WORLD_LIMIT } from '../constant.js';
import { World } from '../world.js';
import { TileEditorWrapper } from './tileEditorWrapper.js';

export class EditorWorld extends World {
    constructor() {
        super();
        this.level = [];
        this.backgroundColor = "#555555";
        this.levelName = "none";
        this._dirty = false;
    }

    /**
     * Whether the level has unsaved changes.
     * @returns {boolean}
     */
    isDirty() {
        return this._dirty;
    }

    /**
     * Mark the level as saved.
     */
    markClean() {
        this._dirty = false;
    }

    /**
     * Mark the level as having unsaved changes.
     */
    markDirty() {
        this._dirty = true;
    }

    /**
     * Check if a grid position is within the world boundaries
     * @param {number} x grid position
     * @param {number} y grid position
     * @returns {boolean}
     */
    isInBounds(x, y) {
        return x >= 0 && x < WORLD_LIMIT[0] && y >= 0 && y < WORLD_LIMIT[1];
    }

    /**
     * Set the tile x and y (grid pos) to a set tile.
     * Also refreshes surrounding tiles so state stays correct.
     * @param {number} x: x grid level position
     * @param {number} y: y grid level position
     * @param {Array|null} params: tile parameter => [group-id, tile-id, {params}] OR null to erase
     */
    setTile(x, y, params) {
        if (!this.isInBounds(x, y)) return;

        // grow rows downward if y is beyond current level height
        if (this.level.length <= y) {
            if (params === null) return;
            const l = this.level.length - 1;
            for (let index = 0; index < y - l; index++) {
                this.level.push([]);
            }
        }
        // grow columns rightward if x is beyond current row width
        if (this.level[y].length <= x) {
            if (params === null) return;
            const l = this.level[y].length - 1;
            for (let index = 0; index < x - l; index++) {
                this.level[y].push(null);
            }
        }
        if (params === null) {
            if (this.level[y][x] === null) return;
            this.level[y][x] = null;
        } else {
            this.level[y][x] = new TileEditorWrapper(x, y, params);
            this.level[y][x].setState(this);
        }
        this._dirty = true;

        // refresh surround tiles, some of the  tile state can depend on neighbors
        const tiles = this.getSuroundTiles(x * TILE_SIZE, y * TILE_SIZE, 2);
        for (const tile of tiles) {
            if (tile !== null) {
                tile.setState(this);
            }
        }
    }

    /**
     * Get the tile at grid position, or null if out of bounds / empty.
     * @param {number} x
     * @param {number} y
     * @returns {TileEditorWrapper|null}
     */
    getTile(x, y) {
        if (y < 0 || this.level[y] === undefined || x < 0 || x >= this.level[y].length) return null;
        if (this.level[y][x] === undefined) return null;
        return this.level[y][x];
    }

    /**
     * Update a tile's params and refresh its state + neighbors.
     * @param {number} x: grid x
     * @param {number} y: grid y
     * @param {object} newParams: key/value pairs to merge in tileParams
     */
    updateTileParams(x, y, newParams) {
        const tile = this.getTile(x, y);
        if (!tile) return;
        tile.tileParams = newParams;
        tile.data[2] = newParams;
        tile.setState(this);
        this.markDirty();

        const tiles = this.getSuroundTiles(x * TILE_SIZE, y * TILE_SIZE, 2);
        for (const t of tiles) {
            if (t !== null) {
                t.setState(this);
            }
        }
    }

    /**
     * Check if a given tile is of a specific tile class (used for contact checks).
     * @param {TileEditorWrapper|null} tile
     * @param {Function} tileClass: constructor reference (e.g. MovingPlatform)
     * @returns {boolean}
     */
    isTileContactCompatible(tile, tileClass) {
        return tile !== null && tile.tileClass === tileClass;
    }

    /**
     * Move the camera by a set amount
     * @param {number} x: amount x
     * @param {number} y: amount y
     */
    moveCamera(x, y) {
        const buffer = this.cameraPosition.clone();
        buffer.x += x;
        buffer.y += y;
        this.setCameraPosition(buffer);
    }

    /**
     * Export the current level into a serializable data structure.
     * @returns {{data: Array, backgroundColor: string, name: string}}
     */
    export() {
        const result = [];
        for (let y = 0; y < this.level.length; y++) {
            const buffer = [];
            for (let x = 0; x < this.level[y].length; x++) {
                if (this.level[y][x] === null) {
                    buffer.push([]);
                } else {
                    buffer.push(this.level[y][x].data);
                }
            }
            result.push(buffer);
        }
        return { data: result, backgroundColor: this.backgroundColor, name: this.levelName };
    }

    /**
     * Import a level into the editor (reverse of export).
     * @param {object} levelData: {data, backgroundColor, name}
     */
    import(levelData) {
        const result = [];
        for (let y = 0; y < levelData.data.length; y++) {
            const buffer = [];
            for (let x = 0; x < levelData.data[y].length; x++) {
                if (levelData.data[y][x].length === 0) {
                    buffer.push(null);
                } else {
                    const t = new TileEditorWrapper(x, y, levelData.data[y][x]);
                    buffer.push(t);
                }
            }
            result.push(buffer);
        }
        this.level = result;

        for (const col of this.level) {
            for (const tile of col) {
                if (tile === null) continue;
                tile.setState(this);
            }
        }
        console.log(levelData);
        this.backgroundColor = levelData.backgroundColor;
        this.levelName = levelData.name;
    }
}
