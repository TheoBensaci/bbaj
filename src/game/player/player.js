import { tileSize } from "../../constant.js";
import { Input } from "../../utils/input.js";
import { RessourceLoader } from "../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { Vector } from "../../utils/vector.js";
import { Actor } from "../actor.js";



// settings



// physic step
const COLLISION_STEP=1;


// physic settings
const MAX_DOWN_SPEED = 30;
const GRAVITY_STRENGHT = 50;



export class Player extends Actor{

    constructor(x,y){
        super(x,y);
        this.velocity=new Vector(0,0);
    }

    //#region ============== Collision ==============


    getCollider(){
        return Shape.createShape(ShapeType.SQUARE,this.position,new Vector(tileSize,tileSize));
    }

    applyCollision(context){
        const playerShape = this.getCollider();
        const tiles = context.getSuroundTiles(this.position.x,this.position.y,2);


        tiles.sort((a,b)=>{
            if(a===null && b!==null){
                return 1;
            }
            if(a!==null && b===null){
                return -1;
            }
            if(a=== null && b===null){
                return 0;
            }
            return Vector.sub(a.position,this.position).sqrt_magnetude() - Vector.sub(b.position,this.position).sqrt_magnetude()
        });


        for (const tile of tiles) {
            if(tile===null)continue;
            const collider = tile.getCollider();

            for (const shape of collider) {

                // we use getcollider here cause i'm a dumb ass lmao
                const collide = Shape.collide(this.getCollider(),shape);
                if(collide===null)continue;
                if(tile.isSolide())this.position.sub(collide);
            }
        }
    }

    /**
     * Move the play with the velocity set and made it collide with things
     * @param {*} vel
     * @param {*} context
     */
    moveAndCollide(vel,context){
        const velMagnetude = vel.magnetude();
        const nStep = Math.round(velMagnetude/COLLISION_STEP);
        const stepVel = vel.normalize().scale(velMagnetude/nStep);

        for (let index = 0; index < nStep; index++) {
            // move player
            this.position.add(stepVel);

            // resolve collision
            this.applyCollision(context);
        }
    }

    //#endregion


    //#region ============== PHYSIC ==============

    environmentDetection(){

    }

    movementUpdate(t){
        let dir = new Vector(0,0);
        const speed = 1;
        if(Input.right.pressed){
            dir.x+=speed;
        }
        if(Input.left.pressed){
            dir.x-=speed;
        }
        this.velocity.x=dir.x;
    }

    jumpUpdate(t){

        if(Input.jump.pressed){
            this.velocity.add(new Vector(0,-1));
        }
    }

    gravitUpdate(t){
        // if jump, no gravity
        if(false){
            //...
        }

        // if action, no gravity
        if(false) {
            // ...
        }

        this.velocity.add(new Vector(0,GRAVITY_STRENGHT*t));
    }


    onCreate(context){
        console.log("yo");
    }

    update(context,t){
        // ground detetction
        this.environmentDetection();

        // movment update
        this.movementUpdate(t);

        // jump update
        this.jumpUpdate(t);

        // gravity update
        this.gravitUpdate(t);

        const prePos=this.position.clone();

        this.moveAndCollide(this.velocity,context);

        console.log("----------------");
        console.log(prePos,this.position);
        this.velocity=Vector.sub(this.position,prePos);
        console.log(this.velocity);
        console.log("----------------");
    }

    onDestroy(context){
        // ...
        console.log("destroy");
    }

    render(x,y,context,t){

        const r = RessourceLoader.getRessourceLoader();
        const image=r.get("./ressource/testPlayer.png");

        //this.context.resetTransform();
        context.transform(1, 0, 0, 1, x-tileSize/2, y-tileSize/2);

        context.drawImage(image, 0, 0, 16, 16, 0,0, tileSize, tileSize);


        context.resetTransform();

        // debug
        context.debugRenderShape(this.getCollider(),"#00ff9955",false);
        context.fillStyle="#000000ff";
        context.font = "20px serif";
        context.fillText(this.position.x+" | "+this.position.y, x, y-60);
        context.fillText(this.velocity.x+" | "+this.velocity.y, x, y-30);
    }
}