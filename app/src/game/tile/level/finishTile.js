/**
 * @ Autheur: Theo Bensaci
 * @ Date: 12:28 05.06.2026
 * @ Description: Level finish tile
 */

import { TILE_SIZE } from "../../../constant.js";
import { Shape, ShapeType } from "../../../utils/shape.js";
import { Vector } from "../../../utils/vector.js";
import { Tile } from "../../tileSystem/tile.js";

export class FinishTile extends Tile{

    constructor(){
        super([
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(0,-TILE_SIZE*0.5),
                new Vector(TILE_SIZE,TILE_SIZE*2)
            ).setTrigger((player)=>{
                this.onTrigger(player)
            })
        ]);

        this.game=null;
    }


    onTrigger(player){
        if(this.game.canFinish()){
            this.game.endLevel();
        }
    }

    postCreate(game) {
        this.game=game;
    }


    render(x, y, context, t) {
        const col = this.getCollider();
        for (const c of col) {
            context.debugRenderShape(c, '#ffff99', false);
        }
    }

    static createTile(param){
        return new FinishTile();
    }

    static editorRender(tileWrapper, x, y, context) {
        context.debugRenderShape(tileWrapper.shape, '#ffff99', false);
    }

    static setWrapperState(tileWrapper, context, x, y) {
        const b = new FinishTile();
        b.setOriginePosition(new Vector(x, y));
        tileWrapper.shape = b.getCollider()[0];
    }
}