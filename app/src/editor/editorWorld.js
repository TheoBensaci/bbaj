import { TILE_SIZE, WORLD_LIMIT } from '../constant.js';
import { World } from '../world.js';
import { TileEditorWrapper } from './tileEditorWrapper.js';

export class EditorWorld extends World {
    constructor() {
        super();
        this.level = [];
        this.backgroundColor="#555555";
        this.levelName="none";
        this._dirty = false;
    }

    isDirty() {
        return this._dirty;
    }

    markClean() {
        this._dirty = false;
    }

    markDirty() {
        this._dirty = true;
    }

    /**
     * Check if a grid position is within the world boundaries
     * @param {number} x grid level position
     * @param {number} y grid level position
     * @returns {boolean}
     */
    isInBounds(x, y) {
        return x >= 0 && x < WORLD_LIMIT[0] && y >= 0 && y < WORLD_LIMIT[1];
    }

    /**
     * Set the tile x and y (grid level pos) to a set tile
     * @param {number} x x grid level position
     * @param {number} y x grid level position
     * @param {object} params tile parameter => [group-id,tile-id,{params}];
     */
    setTile(x, y, params) {
        if (!this.isInBounds(x, y)) return;
        if (this.level.length <= y) {
            if (params === null) return;
            const l = this.level.length - 1;
            for (let index = 0; index < y - l; index++) {
                this.level.push([]);
            }
        }
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

        // update surround tile
        const tiles = this.getSuroundTiles(x * TILE_SIZE, y * TILE_SIZE, 2);
        for (const tile of tiles) {
            if (tile !== null) {
                tile.setState(this);
            }
        }
    }

    getTile(x, y) {
        if (y < 0 || this.level[y] === undefined || x < 0 || x >= this.level[y].length) return null;
        if (this.level[y][x] === undefined) return null;
        return this.level[y][x];
    }

    isTileContactCompatible(tile, tileClass) {
        return tile !== null && tile.tileClass === tileClass;
    }

    /**
     * Move the camera by a set amount
     * @param {*} x amount x
     * @param {*} y amount y
     */
    moveCamera(x, y) {
        const buffer = this.cameraPosition.clone();
        buffer.x += x;
        buffer.y += y;
        this.setCameraPosition(buffer);
    }

    /**
     * Export the actual level into a array of tile data
     * @returns
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
        return {data:result,backgroundColor:this.backgroundColor,name:this.levelName};
    }

    /**
     * Import a level into the editor
     * @param {*} levelData Map of tile params (same format as the export function)
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
        this.backgroundColor=levelData.backgroundColor;
        this.levelName=levelData.name;
    }
}
