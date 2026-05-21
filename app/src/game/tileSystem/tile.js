/**
 * @ Autheur: Theo Bensaci
 * @ Date: 19:51 11.05.2026
 * @ Description: The tile system need tile, here the implementation
 */

import { TILE_SIZE } from "../../constant.js";
import { Shape } from "../../utils/shape.js";
import { Vector } from "../../utils/vector.js";

/**
 * The classic tile
 *
 * NOTE :
 * for collision, avoid making a collider bigger dans 2 TILE_SIZE. If you dont, collider might
 * not be compute correctly
 */
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
    setOriginePosition(pos){
        this.position=pos;
        return this;
    }

    /**
     * Get this tile collider shape
     * @returns {Shape[]} list of shape
     */
    getCollider(){
        if(this.position===null){return this.collider;}
        for (const iterator of this.collider) {
            iterator.setOrigine(this.position)
        }
        return this.collider;
    }

    /**
     * Get the tile bounding box
     * @returns {Vector[]} [min point, max point] of the bounding box
     */
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
     * Render this tile
     * @param {number} x position x on the screen of this tile
     * @param {number} y position x on the screen of this tile
     * @param {context2D extended} context js context 2d with additional utils function given by the Renderer
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



/**
 * Tile which can be transfrom and update during gameplay
 * when the level is reset, this tile need to be able to reset it self.
 * The way it's work is by saving and loading state, this tile can save state
 * into the game and whene ever the game need to be reset, it will call the set state
 * function.
 */
export class DynamicTile extends Tile{
    constructor(shapes){
        super(shapes);
        this.game = null;

        // id of the tile
        this.id="";
        this.gridOriginePos=[0,0];
    }

    setOriginePosition(pos){
        super.setOriginePosition(pos);
        const x = Math.floor(pos.x/TILE_SIZE);
        const y = Math.floor(pos.y/TILE_SIZE);
        this.gridOriginePos[0]=x;
        this.gridOriginePos[1]=y;
    }

    postCreate(game){
        this.game=game;
        this.id=game.getTileId(this.gridOriginePos[0],this.gridOriginePos[1]);
    }


    /**
     * Use to save state from this tile
     * @returns
     */
    saveState(){
        return [];
    }


    /**
     * Load a state of this tile
     * @param {object[]} state
     */
    loadState(state){

    }
}


/**
 * Tile which can be updated over time
 */
export class ActiveTile extends DynamicTile{
    constructor(shapes){
        super(shapes);
    }


    /**
     * Callback use when this tile is update
     * @param {*} t
     */
    update(t){

    }

    /**
     * Register it self to the active tile
     */
    setActive(){
        this.game.registerActiveTile(this.gridOriginePos[0],this.gridOriginePos[1]);
    }

    /**
     * unregister it self to the active tile
     */
    unsetActive(){
        this.game.unregisterActiveTile(this.gridOriginePos[0],this.gridOriginePos[1]);
    }
}



/**
 * Tile which can use "Advance Collision". In nutshell
 * it's only mean we can use more than 2 tile for colldier size
 * and we can, move the tile to any position.
 */
export class AdvanceCollisionTile extends ActiveTile{
    constructor(shapes){
        super(shapes);
    }

    /**
     * Register it self as a advance collision
     */
    activeAdvanceCollision(){
        this.game.registerAdvanceCollisionTile(this.gridOriginePos[0],this.gridOriginePos[1]);
    }

    /**
     * unregister it self as a advance collision (should be only use if this tile will destroy)
     */
    desactiveAdvanceCollision(){
        this.game.unregisterAdvanceCollisionTile(this.gridOriginePos[0],this.gridOriginePos[1]);
    }
}


/**
 * Tile which can move, can be use a riding tile by the player
 */
export class MovingTile extends AdvanceCollisionTile{
    constructor(shapes){
        super(shapes);
        this.velocity=new Vector(0,0);
    }

    /**
     * active moving
     */
    activeMoving(){
        this.setActive();
        this.activeAdvanceCollision();
    }

    /**
     * disabel moving (should be only use if this tile will destroy)
     */
    desactiveMoving(){
        this.desactiveMoving();
        this.desactiveAdvanceCollision();
    }
}

