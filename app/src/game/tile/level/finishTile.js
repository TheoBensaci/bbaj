/**
 * @ Autheur: Theo Bensaci
 * @ Date: 12:28 05.06.2026
 * @ Description: Level finish tile
 */

import { TILE_SIZE } from "../../../constant.js";
import { AnimationSystem } from "../../../utils/animationUtils.js";
import { RessourceLoader } from "../../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../../utils/shape.js";
import { MathUtils } from "../../../utils/utils.js";
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

        this.animationSystem=new AnimationSystem({
            scale:new Vector(1,1),
            spritePath:""
        });

        this.animationSystem.addState("idle",(t)=>{
            return {
                scale:new Vector(1,1),
                spritePath:"./ressource/finishOff.png"
            };
        },0,0,true);

        this.animationSystem.addState("active",(t)=>{
            const i = MathUtils.lerp(1.5,1,t);
            return {
                scale:new Vector(1,i),
                spritePath:"./ressource/finishOn.png"
            };
        },0.15,0,false);

        this.animationSystem.setState("idle");
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
        this.animationSystem.update(t);

        if(this.game.canFinish() || this.game.levelState>=2){
            this.animationSystem.setState("active");
        }
        else{
            this.animationSystem.setState("idle");
        }

        const value = this.animationSystem.get();

        const r = RessourceLoader.getInstance();
        const image = r.get(value.spritePath);


        context.save();
        const scale=value.scale;

        context.transform(scale.x, 0, 0, scale.y, x + TILE_SIZE/2 -(TILE_SIZE/2)*scale.x, y - (TILE_SIZE)*scale.y);

        context.renderTexture(image, 0, 0, 20, 40, 0, 0, TILE_SIZE, 2*TILE_SIZE);

        context.restore();
    }

    static createTile(param){
        return new FinishTile();
    }

    static editorRender(tileWrapper, x, y, context) {
        const r = RessourceLoader.getInstance();
        const image = r.get("./ressource/finishOff.png");

        context.renderTexture(image, 0, 0, 20, 40, x, y-TILE_SIZE, TILE_SIZE, 2*TILE_SIZE);
    }

    static setWrapperState(tileWrapper, context, x, y) {
        const b = new FinishTile();
        b.setOriginePosition(new Vector(x, y));
        tileWrapper.shape = b.getCollider()[0];
    }
}