/**
 * @ Autheur: Theo Bensaci
 * @ Date: 15:34 11.06.2026
 * @ Description: falling block tile
 */

import { TILE_SIZE } from "../../../constant.js";
import { AnimationSystem } from "../../../utils/animationUtils.js";
import { RessourceLoader } from "../../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../../utils/shape.js";
import { MathUtils } from "../../../utils/utils.js";
import { Vector } from "../../../utils/vector.js";
import { ActiveTile, DynamicTile, Tile } from "../../tileSystem/tile.js";

const FALLING_SHAPE_RELOAD_TIME=5;
const FALLING_SHAPE_DESTROY_TIME=1;

export class FallingTile extends ActiveTile {
    constructor(connected) {
        super([
            Shape.createShape(
                ShapeType.SQUARE,
                Vector.zero(),
                new Vector(TILE_SIZE, TILE_SIZE)
            ),
            Shape.createShape(
                ShapeType.SQUARE,
                Vector.zero(),
                new Vector(TILE_SIZE+1, TILE_SIZE+1)
            ).setTrigger(player=>this.onTriggerEnter(player),player=>this.onTriggerEnd(player))
        ]);

        this.timer = 0;
        this.onReload = false;
        this.active = false;
        this.connected=connected;

        this.animationSystem=new AnimationSystem({
            scale:new Vector(1,1),
            offset:new Vector(0,0),
            spritePath:""
        });


        this.animationSystem.addState("idle",(t)=>{
            return {
                spritePath:"./ressource/fallingTile.png"
            };
        },0,0,true);


        this.animationSystem.addState("active",(t)=>{
            const altT = Math.round(t * 5);
            const altT2 = Math.round(t * 10);
            const x = (1-(altT)%3)
            const y = (1-(altT2)%3)
            return {
                offset:new Vector(x,y),
                spritePath:"./ressource/fallingTile.png"
            };
        },0.5,0,true);

        this.animationSystem.addState("fall",(t)=>{
            return {
                offset:new Vector(0,t*10),
                scale:new Vector(1-t,1-t),
                spritePath:"./ressource/fallingTile.png"
            };
        },0.25,0.1,false,()=>{
            this.animationSystem.setState("reload");
        });

        this.animationSystem.addState("reload",(t)=>{
            return {
                offset:new Vector(0,0),
                scale:new Vector(t,t),
                spritePath:"./ressource/fallingTileReload.png"
            };
        },0.25,0,false,()=>{

        });

        this.animationSystem.setState("idle");
    }


    onTriggerEnter(player){

        if(!this.active && !this.onReload){
            this.animationSystem.setState("active");
            this.active=true;
            this.setActive();
            this.timer=FALLING_SHAPE_DESTROY_TIME;
        }
    }

    onTriggerEnd(player){
        if(this.active && !this.onReload){
        }
    }

    fall(){
        console.log("fall");
        this.active=false;
        this.timer=FALLING_SHAPE_RELOAD_TIME
        this.onReload=true;
        this.animationSystem.setState("fall");
    }

    render(x, y, context, t) {

        this.animationSystem.update(t);

        const value = this.animationSystem.get();

        const r = RessourceLoader.getInstance();
        const image = r.get(value.spritePath);


        context.save();
        const offset=value.offset;
        const scale=value.scale;

        context.transform(scale.x, 0, 0, scale.y, x + TILE_SIZE/2 -(TILE_SIZE/2)*scale.x + offset.x, y+ TILE_SIZE/2 - (TILE_SIZE/2)*scale.y + offset.y);

        context.renderTexture(image, 0, 0, 16, 16, 0, 0, TILE_SIZE, TILE_SIZE);

        context.restore();
    }

    static createTile(param) {
        return new FallingTile(param.connected);
    }

    static editorRender(tileWrapper, x, y, context) {
        const r = RessourceLoader.getInstance();
        const image = r.get('./ressource/fallingTile.png');
        context.renderTexture(image, 0, 0, 16, 16, x, y, TILE_SIZE, TILE_SIZE);
    }

    static setWrapperState(tileWrapper, context, x, y) {
    }


    update(t){
        if(this.onReload){
            if(this.timer>0){
                this.timer-=t;
            }
            else{
                this.onReload=false;
                this.unsetActive();
            }
        }

        if(this.active){
            if(this.timer>0){
                this.timer-=t;
            }
            else{
                this.fall();
            }
        }
    }
}