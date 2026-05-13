/**
 * @ Autheur: Theo Bensaci
 * @ Date: 19:51 11.05.2026
 * @ Description: This class is use to manage actor, it's a base for the player
 */

import { Vector } from "../utils/vector.js";

export class Actor{
    constructor(x=0,y=0){
        this.position=new Vector(x,y);
    }

    /**
     * set position
     * @param {*} newPosVector
     */
    setPos(newPosVector){
        this.position.set(newPosVector);
    }


    /**
     * Get this tile collider shape
     * @returns {Shape[]} list of shape
     */
    getCollider(){
        return [];
    }

    /**
     * When a tile collide with this actor
     * @param {*} tile
     */
    onCollision(tile){

    }


    // life time

    /**
     * callback call when this actore is created in a game
     * @param {*} game
     */
    onCreate(game){
        // ...
    }

    /**
     * Update this actor
     * @param {*} t
     */
    update(t){
        // ...
    }

    /**
     * callback call when this actore is destroy in a game
     * @param {*} game
     */
    onDestroy(game){
        // ...
    }
}