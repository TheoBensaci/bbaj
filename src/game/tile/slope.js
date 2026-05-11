import { tileSize } from "../../constant.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { MathUtils } from "../../utils/utils.js";
import { Vector } from "../../utils/vector.js";
import { Tile } from "./tile.js";

export class Slope extends Tile{
    constructor(){
        super();
    }


    render(x,y,context){
        context.debugRenderShape(this.getCollider()[0]);
    }

    getCollider(){
        return [
            Shape.createShape(
                ShapeType.TRIANGLE_SQR,
                this.position,
                new Vector(tileSize,tileSize*2),
                MathUtils.degToRad(90)
            )
        ]
    }
}