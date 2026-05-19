import { TILE_SIZE } from "../../constant.js";
import { Collider } from "../../utils/collider.js";
import { Shape } from "../../utils/shape.js";
import { Vector } from "../../utils/vector.js";

export class Tile{
    constructor(collliderShapes=[]){
        this.position=null;
        this.collider=collliderShapes;
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
        if(this.position===null){return this.collider;}
        for (const iterator of this.collider) {
            iterator.setOrigine(this.position)
        }
        return this.collider;
    }

    getBoundingBox(){
        const min = [this.collider[0].x,this.collider[0].y];
        const max = [min[0],min[1]];
        for (const iterator of this.collider) {
            const bounding = iterator.getBoundingBox();
            min[0] = Math.min(min[0],bounding[0].x);
            min[1] = Math.min(min[1],bounding[0].y);
            max[0] = Math.max(max[0],bounding[1].x);
            max[1] = Math.max(max[1],bounding[1].y);
        }
        return [new Vector(min[0],min[1]), new Vector(max[0],max[1])];
    }


    /**
     * callback use right after the level as fully generated, usefule for auto tiling for example
     * @param {*} game
     */
    postCreate(game){

    }



    /**
     * Callback use when this tile is update
     * @param {*} game
     * @param {*} t
     */
    update(game, t){

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
            TILE_SIZE,
            TILE_SIZE
        );
        context.fillStyle="#000000ff";
    }


    /**
     * Create a tile with the given parameter list
     * @param {array} paramsList
     * @returns Tile object
     */
    static createTile(paramsList){
        return null;
    }
}
