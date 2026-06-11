/**
 * @ Autheur: Theo Bensaci
 * @ Date: 14:06 22.05.2026
 * @ Description: Abstarct of the world (game or editor or what ever) just insure base function to work
 */

import { RENDER_RESOLUTION, TILE_SIZE, WORLD_LIMIT } from './constant.js';
import { CONTACT_TILE_MASK_MAP } from './game/tileSystem/tileUtils.js';
import { MathUtils } from './utils/utils.js';
import { Vector } from './utils/vector.js';

export class World {
    constructor() {
        this.cameraPosition = new Vector(0, 0);
        this.worldLimit = new Vector(WORLD_LIMIT[0], WORLD_LIMIT[1]);
    }

    /**
     * Set camera position will respecting world limit
     * @param {*} position
     */
    setCameraPosition(position) {
        const rX = RENDER_RESOLUTION[0] / 2;
        const rY = RENDER_RESOLUTION[1] / 2;
        this.cameraPosition.set(
            MathUtils.clamp(position.x, rX, this.worldLimit.x * TILE_SIZE - rX),
            MathUtils.clamp(position.y, rY, this.worldLimit.y * TILE_SIZE - rY),
        );
    }

    /**
     * Get the tile at the x and y world position
     * @param {number} x
     * @param {number} y
     * @returns tile
     */
    getTile(x, y) {
        return null;
    }

    /**
     * Us to compute if a certain tile can be concidarate with the define tileclass restriction
     * @param {Tile} tile tile
     * @param {Class} tileClass
     * @returns {boolean}
     */
    isTileContactCompatible(tile, tileClass) {
        return tile !== null && tile instanceof tileClass;
    }

    /**
     * compute the contact map a given tile
     * @param {*} x tile x position in the world
     * @param {*} y tile y position in the world
     * @param {*} tileClass class of tile considerate
     * @returns a number with this form 0xtopLeft|top|topRight|left|right|downLeft|down|downRight
     */
    getTileContactMap(x, y, tileClass = Tile) {
        /*
        to compute auto tiling, we can use bit map like this :
            [topLeft , top , topRight]
            [left    , main,    right]
            [downLeft, down,downRight]
            => 0xtopLeft|top|topRight|left|right|downLeft|down|downRight
            => 0xff
            (main can be ignore since it's all ways true)
        */
        let map = 0x00;

        const a = TILE_SIZE / 2;

        const posX = Math.round((x - a) / TILE_SIZE);
        const posY = Math.round((y - a) / TILE_SIZE);

        for (let y = -1; y < 2; y++) {
            for (let x = -1; x < 2; x++) {
                if (x === 0 && x === y) continue;
                const testPosX = posX + x;
                const testPosY = posY + y;
                const tile = this.getTile(testPosX, testPosY);
                if (!this.isTileContactCompatible(tile, tileClass)) continue;
                map = map | CONTACT_TILE_MASK_MAP[1 + y][1 + x];
            }
        }

        return map;
    }

    /**
     * Get all tile surronding the position xy
     * @param {*} x pos x
     * @param {*} y pos y
     * @param {*} radius radiuse of the surrounding
     * @returns {Tile[]}
     */
    getSuroundTiles(x, y, radius = 1) {
        const buffer = [];
        const gridPosX = Math.floor(x / TILE_SIZE);
        const gridPosY = Math.floor(y / TILE_SIZE);
        buffer.push(this.getTile(gridPosX, gridPosY));
        for (let y = -radius; y < radius; y++) {
            for (let x = -radius; x < radius; x++) {
                buffer.push(this.getTile(gridPosX + x, gridPosY + y));
            }
        }
        return buffer;
    }
}
