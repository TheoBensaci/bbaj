/**
 * @ Autheur: Theo Bensaci
 * @ Date: 14:03 22.05.2026
 * @ Description: wrapper use to manage tile data in the editor world
 */

import { TILE_SIZE } from '../constant.js';
import { TileIndex } from '../game/tileSystem/tileIndexer.js';

export class TileEditorWrapper {
    /**
     * @param {number} x: grid x position
     * @param {number} y: grid y position
     * @param {Array} data: tile data array [group, id, params]
     */
    constructor(x, y, data) {
        this.tileClass = TileIndex.getTileClass(data[0], data[1]);
        this.data = data;
        this.tileParams = data[2];
        this.x = x;
        this.y = y;
    }

    /**
     * Render this tile using its tile class's editor render method.
     * @param {number} x: screen x position
     * @param {number} y: screen y position
     * @param {CanvasRenderingContext2D} context: render target
     * @param {number} t: time delta
     */
    render(x, y, context, t) {
        this.tileClass.editorRender(this, x, y, context);
    }

    /**
     * Set tile wrapper state (propagate neighbor info, etc.)
     * @param {World} context: world context
     */
    setState(context) {
        this.tileClass.setWrapperState(this, context, this.x * TILE_SIZE + TILE_SIZE / 2, this.y * TILE_SIZE + TILE_SIZE / 2);
    }
}
