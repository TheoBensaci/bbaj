import { TILE_SIZE } from "../../../constant.js";
import { RessourceLoader } from "../../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../../utils/shape.js";
import { Vector } from "../../../utils/vector.js";
import { MovingTile } from "../../tileSystem/tile.js";

const TARGET_SPEED = [6000,100];
const ACCELERATION = [2000,100];
const WAITING_TIME = 1;

export class MovingPlatform extends MovingTile {
    constructor(targetPos,attackSpeed=6000,attackAcc=2000,recoverSpeed=100,recoverAcc=100) {
        const SIZE = [TILE_SIZE * 5,TILE_SIZE * 2];
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

        this.targetPos=targetPos.clone();
        this.originePos = new Vector(0,0);

        this.waitTimer = 0;
    }

    render(x, y, context, t) {
        const col = this.getCollider();
        const pos = context.wordToScreenPosition(this.position);
        context.debugRenderShape(col[1], '#00ff99', false);
        context.debugRenderShape(col[0], '#ff0055', false);
        MovingPlatform.renderFace(this.state,context,pos.x-16,pos.y-16);
    }

    static createTile(param) {
        return new MovingPlatform(new Vector(0,0));
    }

    postCreate(game) {
        super.postCreate(game);
        this.activeMoving();


        this.originePos.set(this.position);
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
            const target = (this.state===3)?this.originePos:this.targetPos;
            const dir = Vector.sub(target,this.position).normalize();
            const index = (this.state===1)?0:1;
            const speed = (this.state===1)?this.attackSpeed:this.recoverSpeed;
            dir.scale(speed,speed);

            this.velocity.approche(dir,t*((this.state===1)?this.recoverSpeed:this.recoverAcc));

            this.position.add(this.velocity.clone().scale(t,t));

            // check if atteigne
            if(Vector.dot(dir,Vector.sub(target,this.position).normalize())<-0.5){
                this.state++;
                this.waitTimer=WAITING_TIME;
                this.velocity.set(0,0);
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
        context.debugRenderShape(tileWrapper.shape[1], '#00ff99', false);
        context.debugRenderShape(tileWrapper.shape[0], '#ff0055', false);
        MovingPlatform.renderFace(0,context,x-6,y-3);
    }

    static setWrapperState(tileWrapper, context, x, y) {
        const b = new MovingPlatform(new Vector(0,0));
        b.setOriginePosition(new Vector(x, y));
        tileWrapper.shape = b.getCollider();
    }
}
