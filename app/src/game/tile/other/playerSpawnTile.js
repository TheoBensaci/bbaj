/**
 * @ Autheur: Theo Bensaci
 * @ Date: 22:29 24.05.2026
 * @ Description: all player spawn tile
 */

import { TILE_SIZE } from "../../../constant.js";
import { AnimationSystem, keyFames } from "../../../utils/animationUtils.js";
import { RessourceLoader } from "../../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../../utils/shape.js";
import { MathUtils } from "../../../utils/utils.js";
import { Vector } from "../../../utils/vector.js";
import { Tile } from "../../tileSystem/tile.js";

// player base spawn tile
export class PlayerSpawnTile extends Tile{
    constructor(){
        super([]);
    }

    postCreate(game){
        game.originalSpawnPoint=this;
    }

    static createTile(param){
        return new PlayerSpawnTile();
    }

    static editorRender(tileWrapper,x,y,context){
        context.font = "bold 15px Segoe UI";
        context.fillStyle=context.strokeStyle ="#00ff99";
        context.lineWidth = 2;
        context.strokeRect(
            x,y,
            TILE_SIZE,
            TILE_SIZE
        );
        context.fillText("P", x+TILE_SIZE/2-5,y+TILE_SIZE/2+5);
    }
}

// player check point
export class PlayerCheckPointTile extends Tile{
    constructor(){
        super([
            Shape.createShape(
            ShapeType.SQUARE,
            new Vector(0,-TILE_SIZE/2),
            new Vector(TILE_SIZE,TILE_SIZE*2)
        ).setTrigger((player)=>{
            this.onTrigger(player);
        })]);
        this.active = false;
        this.game = null;

        this.animationSystem=new AnimationSystem({
            scale:new Vector(1,1),
            spriteIndex:0
        });

        this.animationSystem.addState("idle",(t)=>{
            const v = Math.cos((t * Math.PI*2)) * 0.05;
            return {
                scale:new Vector(1-v,1+v),
                spriteIndex:0
            };
        },4,0,true);

        this.animationSystem.addState("setActive",(t)=>{

            return keyFames([
                {
                    value :{
                        scale:new Vector(1+0.3,1-0.3),
                        spriteIndex:1
                    },
                    t : 0
                },
                {
                    value :{
                        scale:new Vector(1+0.5,1-0.5),
                        spriteIndex:1
                    },
                    t : 0.3
                },
                {
                    value :{
                        scale:new Vector(1-0.3,1+0.3),
                        spriteIndex:1
                    },
                    t : 0.7
                },
                {
                    value :{
                        scale:new Vector(1,1),
                        spriteIndex:1
                    },
                    t : 1
                }
            ],t);
        },0.2,0,false,()=>{
            this.animationSystem.setState("active");
        });

        this.animationSystem.addState("active",(t)=>{
            const v = Math.cos((t * Math.PI*2)) * 0.05;
            return {
                scale:new Vector(1-v,1+v),
                spriteIndex:1
            };
        },1,0,true);

        this.animationSystem.setState("idle");
    }

    onTrigger(player){
        if(this.active)return;
        this.animationSystem.setState("setActive");
        this.active=true;
        this.game.valideCheckPoint(this.position);
    }

    postCreate(game){
        this.game=game;
        this.game.addCheckPoint(this);
    }

    render(x,y,context,t){
        const r = RessourceLoader.getInstance();
        const image=r.get("./ressource/checkPoint.png");

        this.animationSystem.update(t);

        const value = this.animationSystem.get();

        context.save();

        const size = [TILE_SIZE*1.5, TILE_SIZE*3];

        context.transform(value.scale.x, 0, 0, value.scale.y, x-(size[0]/2)*value.scale.x + TILE_SIZE/2, y-(size[1])*value.scale.y+TILE_SIZE);

        context.renderTexture(image, (value.spriteIndex)*15, 0, 15, 30, 0 , 0, size[0], size[1]);

        context.restore();
    }

    static createTile(param){
        return new PlayerCheckPointTile();
    }

    static editorRender(tileWrapper,x,y,context){
        const r = RessourceLoader.getInstance();
        const image=r.get("./ressource/checkPoint.png");
        context.renderTexture(image, 15, 0, 15, 30, x-5, y-TILE_SIZE*2, TILE_SIZE*1.5, TILE_SIZE*3);
    }

    reset(){
        this.active=false;
        this.animationSystem.setState("idle");
    }
}