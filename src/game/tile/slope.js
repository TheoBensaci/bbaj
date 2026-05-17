import { tileSize } from "../../constant.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { MathUtils } from "../../utils/utils.js";
import { Vector } from "../../utils/vector.js";
import { Tile } from "../tileSystem/tile.js";

export class Slope extends Tile{
    constructor(mult=1,rotation = 0){
        super([
            Shape.createShape(
                ShapeType.TRIANGLE_SQR,
                Vector.zero(),
                new Vector(tileSize,tileSize*mult),
                MathUtils.degToRad(rotation * 90)
            )
        ]);
        this.mult=mult;
    }


    render(x,y,context){
        const col = this.getCollider();
        for (const c of col) {
            context.debugRenderShape(c,"#ff0055",false);
        }
    }

    static createTile(param){

        return new Slope(1,param[0]);
    }
}