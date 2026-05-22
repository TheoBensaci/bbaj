import { TILE_SIZE } from "../../constant.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { MathUtils } from "../../utils/utils.js";
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
                player.velocity.x = MathUtils.clamp(player.velocity.x,-50,50);
                //player.velocity.y=-400;
            })
        ]);
    }


    render(x, y, context){
        context.debugRenderShape(this.getCollider()[0],"#ffff99",false);
    }

    static createTile(param){
        return new JumpPadTile();
    }

    static editorRender(tileWrapper,x,y,context){
        context.debugRenderShape(tileWrapper.shape,"#ffff99",false);
    }

    static setWrapperState(tileWrapper,context,x,y){
        const b = new JumpPadTile();
        b.position.set(x,y);
        tileWrapper.shape = b.getCollider()[0];
        console.log(tileWrapper);
    }
}