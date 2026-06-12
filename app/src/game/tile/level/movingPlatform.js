/**
 * @ Autheur: Theo Bensaci
 * @ Date: 00:03 21.05.2026
 * @ Description: baisc moving platform, like the zipper in celeste
 */

import { TILE_SIZE } from "../../../constant.js";
import { RessourceLoader } from "../../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../../utils/shape.js";
import { MathUtils } from "../../../utils/utils.js";
import { Vector } from "../../../utils/vector.js";
import { MovingTile } from "../../tileSystem/tile.js";

const WAITING_TIME = 1;

export class MovingPlatform extends MovingTile {
    constructor(deltaTargetPos,attackSpeed=6000,attackAcc=1000,recoverSpeed=100,recoverAcc=100) {
        const SIZE = [TILE_SIZE * 5,TILE_SIZE * 1];
        super([
            Shape.createShape(
                ShapeType.SQUARE,
                Vector.zero(),
                new Vector(SIZE[0], SIZE[1])
            ),
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(-0.5,-SIZE[1]/2),
                new Vector(SIZE[0]-1, TILE_SIZE/2)
            ).setTrigger((player)=>{
                this.startGoing();
            })
        ]);
        this.t = 0;
        this.attackSpeed = attackSpeed;
        this.attackAcc=attackAcc;

        this.recoverSpeed= recoverSpeed;
        this.recoverAcc=recoverAcc;

        this.state = 0; // 0 = idle, 1 = moving, 2 = wait, 3 = recover, 4 = recover end

        this.deltaTargetPos=deltaTargetPos.clone();
        this.originePos = new Vector(0,0);

        this.waitTimer = 0;

        this.speed = 0;
    }

    render(x, y, context, t) {
        const col = this.getCollider();
        const pos = context.wordToScreenPosition(this.position);
        context.debugRenderShape(col[0], '#ff0055', false);
        MovingPlatform.renderFace(this.state,context,pos.x-16,pos.y-16);
    }

    static createTile(param) {
        return new MovingPlatform(param.deltaTraget?param.deltaTraget:new Vector(TILE_SIZE * 10,0));
    }

    postCreate(game) {
        super.postCreate(game);
        this.activeMoving();

        this.originePos.set(this.position);
        this.targetPos=Vector.add(this.originePos,this.deltaTargetPos);
    }

    onReset() {
        this.state=0;
        this.position.set(this.originePos);
        this.velocity.set(0,0);
    }

    startGoing(){
        if(this.state!==0)return;
        this.state=1;
        this.notifyChange();
    }


    update(t) {
        if(this.state===1 || this.state === 3){
            const target = (this.state===1)?this.targetPos:this.originePos;
            const dir = Vector.sub(target,this.position).normalize();
            const speed = (this.state===1)?this.attackSpeed:this.recoverSpeed;

            this.velocity.set(dir);

            this.speed=MathUtils.approche(this.speed,speed,t*((this.state===1)?this.attackAcc:this.recoverAcc))
            this.velocity.scale(this.speed);

            this.position.add(this.velocity.clone().scale(t));

            // check if atteigne
            if(Vector.dot(dir,Vector.sub(target,this.position).normalize())<=0){
                this.state++;
                this.waitTimer=WAITING_TIME;
                this.velocity.set(0,0);
                this.speed=0;
                this.position.set(target);
            }
            return;
        }
        if(this.state!==0){
            if(this.waitTimer>0){
                this.waitTimer-=t;
            }
            else{
                this.state=(this.state + 1) % 5;
            }
        }
    }


    static #getFaceIndex(state){
        if(state===1 || state==2)return 0;
        if(state===3)return 2;
        return 1;
    }

    static renderFace(state,context,x,y){
        const r = RessourceLoader.getInstance();
        const image = r.get('./ressource/faces.png');
        context.renderTexture(image, MovingPlatform.#getFaceIndex(state) * 16, 0, 16, 16, x, y, 32, 32);
    }

    static editorRender(tileWrapper, x, y, context) {
        context.debugRenderShape(tileWrapper.shape, '#ff0055', false);
        MovingPlatform.renderFace(0,context,x-6,y-3);
    }

    static setWrapperState(tileWrapper, context, x, y) {
        const b = new MovingPlatform(new Vector(0, 0));
        b.setOriginePosition(new Vector(x, y));
        tileWrapper.shape = b.getCollider()[0];
    }
}
