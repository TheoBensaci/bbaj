import { Vector } from "../utils/vector.js";

export class Actor{
    constructor(x=0,y=0){
        this.position=new Vector(x,y);
    }

    setPos(newPosVector){
        this.position.set(newPosVector);
    }

    move(addVec){
        this.position.add(addVec);
    }

    /**
     * Get this tile collider shape
     * @returns {Shape[]} list of shape
     */
    getCollider(){
        return [];
    }

    onCollision(tile){

    }


    // life time
    onCreate(context){
        // ...
    }

    update(context,t){
        // ...
    }

    onDestroy(context){
        // ...
    }
}