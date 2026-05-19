import { TILE_SIZE } from "../../constant.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { Vector } from "../../utils/vector.js";
import { Tile } from "../tileSystem/tile.js";

export class MovingPlatform extends Tile{

    constructor(){
        super([
            Shape.createShape(
            ShapeType.SQUARE,
            Vector.zero(),
            new Vector(TILE_SIZE*4,TILE_SIZE/2)
        )]);

        this.velocity=new Vector(0,0);

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
        const x = Math.floor(this.position.x/TILE_SIZE);
        const y = Math.floor(this.position.y/TILE_SIZE);

        this.x=this.position.x;
        game.registerContinueCollisionTile(x,y);
        game.registerActiveTile(x,y);
        console.log(game);
    }

    update(game,t){
        this.t= (this.t + t)%(2*Math.PI);
        this.velocity.x = Math.cos(this.t*3) * 3;

        this.position.add(this.velocity);
    }


}