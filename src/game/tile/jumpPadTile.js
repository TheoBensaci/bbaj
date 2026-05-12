import { tileSize } from "../../constant.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { Vector } from "../../utils/vector.js";
import { Tile } from "./tile.js"

export class JumpPadTile extends Tile{

    constructor(){
        super();
    }


    getCollider(){
        return [
            Shape.createShape(
                ShapeType.SQUARE,
                Vector.add(this.position,new Vector(0,tileSize/2.5)),
                new Vector(tileSize,tileSize/4)
            ).setTrigger((player)=>{
                player.velocity.y=-2.5;
            })
        ];
    }

    render(x, y, context){
        context.debugRenderShape(this.getCollider()[0],"#ffff99",false);
    }
}