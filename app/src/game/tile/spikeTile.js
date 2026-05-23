import { TILE_SIZE } from "../../constant.js";
import { RessourceLoader } from "../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { MathUtils } from "../../utils/utils.js";
import { Vector } from "../../utils/vector.js";
import { ActiveTile, DynamicTile, Tile } from "../tileSystem/tile.js";

const SPIKE_DEATH_DOT = 0.2;

export class SpikeTile extends Tile{
    constructor(rotation = 0){
        const rad = MathUtils.degToRad(rotation * 90);
        super(
            [
                Shape.createShape(
                    ShapeType.SQUARE,
                    new Vector(0,TILE_SIZE*0.475),
                    new Vector(TILE_SIZE*0.8,TILE_SIZE*0.15)
                )
                .setRotation(rad)
                .setTrigger((player)=>{
                    this.onTrigger(player);
                })
            ]
        );
        this.rotation=rotation;
        this.dot_trigger = (this.rotation===2)?0:SPIKE_DEATH_DOT;
        this.direction = new Vector(0,-1).rotate(rad).normalize();
    }


    onTrigger(player){

        const dot = Vector.dot(player.velocity.clone().normalize(),this.direction);
        if(dot < this.dot_trigger){
            player.death();
        }
    }



    render(x,y,context){
        const r = RessourceLoader.getRessourceLoader();
        const image=r.get("./ressource/testSpike.png");
        context.renderTexture(image, 8*this.rotation, 0, 8, 8, x, y, TILE_SIZE, TILE_SIZE);
    }

    static createTile(param){
        return new SpikeTile(param.rotation);
    }

    static editorRender(tileWrapper,x,y,context){
        const r = RessourceLoader.getRessourceLoader();
        const image=r.get("./ressource/testSpike.png");
        context.renderTexture(image, tileWrapper.rotation*8, 0, 8, 8, x, y, TILE_SIZE, TILE_SIZE);
    }

    static setWrapperState(tileWrapper,context,x,y){
        const b = new SpikeTile(tileWrapper.tileParams.rotation);
        b.setOriginePosition(new Vector(x,y));
        tileWrapper.rotation=b.rotation;
    }
}


const SPIKE_ANIMATION = 0.1;

export class TriggerSpike extends DynamicTile{
    constructor(rotation = 0){
        const rad = MathUtils.degToRad(rotation * 90);
        super(
            [
                Shape.createShape(
                    ShapeType.SQUARE,
                    new Vector(0,TILE_SIZE*0.475),
                    new Vector(TILE_SIZE*0.8,TILE_SIZE*0.15)
                )
                .setRotation(rad)
                .setTrigger((player)=>{
                    this.onTrigger(player);
                },(player)=>{
                    this.onTriggerEnd(player);
                })
            ]
        );

        this.activated=false;
        this.animation_t=0;

        this.rotation=rotation%4;
        this.dot_trigger = (this.rotation===2)?0:SPIKE_DEATH_DOT;
        this.direction = new Vector(0,-1).rotate(rad).normalize();
    }


    onTrigger(player){

        if(!this.activated || this.animation_t<SPIKE_ANIMATION/2)return;

        const dot = Vector.dot(player.velocity.clone().normalize(),this.direction);
        if(dot < this.dot_trigger){
            player.death();
        }
    }

    onTriggerEnd(){
        this.activated=true;
        this.notifyChange();
    }


    onReset(){
        this.activated=false;
        this.animation_t=0;
        console.log("reset");
    }

    static getSpriteOffset(offset_x,offset_y,rotation){

        switch(rotation){
            case 1 : return {
                scale : [offset_y,offset_x],
                position : [0,offset_x],
                origine : [offset_y,0]
            };
            case 2 : return {
                scale : [offset_x,offset_y],
                position : [offset_x,0],
                origine : [0,offset_y]
            };
            case 3 : return {
                scale : [offset_y,offset_x],
                position : [offset_y,offset_x],
                origine : [0,0]
            };
            default : return {
                scale : [offset_x,offset_y],
                position : [offset_x,offset_y],
                origine : [0,0]
            };
        }
    }



    render(x,y,context,t){
        this.animation_t=(this.activated)?MathUtils.approche(this.animation_t,SPIKE_ANIMATION,t):this.animation_t;
        const r = RessourceLoader.getRessourceLoader();
        const image=r.get("./ressource/testSpike.png");
        const renderOffset= TriggerSpike.getSpriteOffset(0,(1 - (this.animation_t/SPIKE_ANIMATION)) * 0.5,this.rotation);

        context.renderTexture(
            image, 8*this.rotation + 8*renderOffset.origine[0], 0 + 8*renderOffset.origine[1],
            8 * (1-renderOffset.scale[0]),
            8 * (1-renderOffset.scale[1]),
            x + TILE_SIZE * (renderOffset.position[0]),
            y + TILE_SIZE * renderOffset.position[1],
            TILE_SIZE * (1-renderOffset.scale[0]),
            TILE_SIZE * (1-renderOffset.scale[1])
        );
    }

    static createTile(param){
        return new TriggerSpike(param.rotation);
    }

    static editorRender(tileWrapper,x,y,context){
        const r = RessourceLoader.getRessourceLoader();
        const image=r.get("./ressource/testSpike.png");
        const renderOffset= this.getSpriteOffset(0,0.5,tileWrapper.rotation);

        context.renderTexture(
            image, 8*tileWrapper.rotation + 8*renderOffset.origine[0], 0 + 8*renderOffset.origine[1],
            8 * (1-renderOffset.scale[0]),
            8 * (1-renderOffset.scale[1]),
            x + TILE_SIZE * (renderOffset.position[0]),
            y + TILE_SIZE * renderOffset.position[1],
            TILE_SIZE * (1-renderOffset.scale[0]),
            TILE_SIZE * (1-renderOffset.scale[1])
        );
    }

    static setWrapperState(tileWrapper,context,x,y){
        const b = new TriggerSpike(tileWrapper.tileParams.rotation);
        b.setOriginePosition(new Vector(x,y));
        tileWrapper.rotation=b.rotation;
    }
}