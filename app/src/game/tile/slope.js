import { TILE_SIZE } from "../../constant.js";
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
                new Vector(TILE_SIZE,TILE_SIZE*mult),
                MathUtils.degToRad(rotation * 90)
            )
        ]);
        this.mult=mult;
    }


    render(x,y,context,t){
        const col = this.getCollider();
        for (const c of col) {
            context.debugRenderShape(c,"#ff0055",false);
        }
    }

    static createTile(param){

        console.log(param);
        return new Slope(1,param.rotation);
    }

    static editorRender(tileWrapper,x,y,context){
        context.debugRenderShape(tileWrapper.shape,"#ff0055",false);
    }

    static setWrapperState(tileWrapper,context,x,y){
        const b = new Slope(1,tileWrapper.tileParams.rotation);
        b.setOriginePosition(new Vector(x,y));
        tileWrapper.shape = b.getCollider()[0];
    }
}