import { TILE_SIZE } from "../../constant.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { Vector } from "../../utils/vector.js";
import { Tile } from "../tileSystem/tile.js"

export class JumpPadTile extends Tile{

    constructor(){
        super([
            Shape.createShape(
                ShapeType.SQUARE,
                Vector.zero(),
                new Vector(TILE_SIZE,TILE_SIZE/4)
            ).setTrigger((player)=>{
                player.velocity.y=-2.5;
            })
        ]);
    }


    render(x, y, context){
        context.debugRenderShape(this.getCollider()[0],"#ffff99",false);
    }

    static createTile(param){
        return new JumpPadTile();
    }
}