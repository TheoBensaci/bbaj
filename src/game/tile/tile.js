import { tileSize } from "../../constant.js";
import { Collider } from "../../utils/collider.js";
import { Shape } from "../../utils/shape.js";
import { Vector } from "../../utils/vector.js";

export class Tile{
    constructor(){
        this.position=null;
    }

    /**
     * Set this tile position
     * @param {number} x
     * @param {number} y
     * @returns this
     */
    setPos(pos){
        this.position=pos;
        return this;
    }

    /**
     * Get this tile collider shape
     * @returns {Collider} list of shape
     */
    getCollider(){
        return new Collider([]);
    }

    /**
     * Is this tile solide and need to have there collision resolve or none-solide and the resolution of the collision can be skip
     * @returns {boolean}
     */
    isSolide(){
        return true;
    }

    /**
     * Callback use on collision with the player
     * @param {Player} player
     * @param {Game} game game instance
     */
    onCollision(player, game){

    }

    /**
     * Callback use when this tile is update
     * @param {*} game
     * @param {*} t
     */
    onUpdate(game, t){

    }

    /**
     * Render this tile
     * @param {number} x position x on the screen of this tile
     * @param {number} y position x on the screen of this tile
     * @param {context2D extended} context js context 2d with additional utils function
     */
    render(x,y,context){
        context.fillStyle="#ff0055";
        context.fillRect(
            x,y,
            tileSize,
            tileSize
        );
        context.fillStyle="#000000ff";
    }
}
