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
        const col = this.getCollider();
        for (const c of col) {
            context.debugRenderShape(c,"#ff0055",false);
        }
    }

    getCollider(){
        return [
            Shape.createShape(
                ShapeType.TRIANGLE_SQR,
                this.position,
                new Vector(tileSize,tileSize),
                MathUtils.degToRad(90)
            )
        ]
    }
}