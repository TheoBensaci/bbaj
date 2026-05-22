import { TILE_SIZE } from "../../constant.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { Vector } from "../../utils/vector.js";
import { MovingTile } from "../tileSystem/tile.js";

export class MovingPlatform extends MovingTile{

    constructor(){
        super([
            Shape.createShape(
            ShapeType.SQUARE,
            Vector.zero(),
            new Vector(TILE_SIZE*5,TILE_SIZE/2)
        )]);

        this.t = 0;
    }


    render(x,y,context){
        const col = this.getCollider();
        for (const c of col) {
            context.debugRenderShape(c,"#ff0055",false);
        }
    }

    static createTile(param){
        return new MovingPlatform();
    }

    postCreate(game){
        console.log(this);
        super.postCreate(game);
        this.activeMoving();
    }

    update(t){
        this.t= (this.t + t)%(2*Math.PI);

        this.velocity.y = Math.cos(this.t*4) * 400;

        this.position.add(0,this.velocity.y* t);
    }


    static editorRender(tileWrapper,x,y,context){
        context.debugRenderShape(tileWrapper.shape,"#ff0055",false);
    }

    static setWrapperState(tileWrapper,context,x,y){
        const b = new MovingPlatform();
        b.position.set(x,y);
        tileWrapper.shape = b.getCollider()[0];
        console.log(tileWrapper);
    }


}