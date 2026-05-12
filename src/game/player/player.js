import { tileSize } from "../../constant.js";
import { Input } from "../../utils/input.js";
import { RessourceLoader } from "../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { MathUtils } from "../../utils/utils.js";
import { Vector } from "../../utils/vector.js";
import { Actor } from "../actor.js";



// settings



// physic step
const COLLISION_STEP=1;


// physic settings
const MAX_DOWN_SPEED = 30;
const GRAVITY_STRENGHT = 7;
const JUMP_STENGHT=1.25;
const JUMP_MAX_LENGHT=0.2;
const JUMP_END_MULT=0.3;


const debug={
    freeCam:false,
    debugInfo:false,
    debugCollision:false
}



export class Player extends Actor{

    constructor(x,y){
        super(x,y);
        this.velocity=new Vector(0,0);

        this.tileTriggerd={};


        // input

        this.input={
            releaseJump:true
        }


        // buffer


        // state
        this.facing=1;

        // collision
        this.collBox=new Vector(tileSize,tileSize);

        // physic
        this.onGround=false;

        // movement
        this.onMove=false;

        // jump
        this.onJump=false;
        this.jumpTimer=0;


        // animation
        this.walkAnimation = {
            dis : 0,
            c:0
        };

        this.airAnimation = {
            skich:0.5
        };


    }

    //#region ============== Collision ==============


    getCollider(position = this.position){
        return Shape.createShape(ShapeType.SQUARE,position,this.collBox);
    }

    applyCollision(position,context){
        let colVec=new Vector(0,0);
        const tiles = context.getSuroundTiles(position.x,position.y,2);


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
            return Vector.sub(a.position,position).sqrt_magnetude() - Vector.sub(b.position,position).sqrt_magnetude()
        });


        for (const tile of tiles) {
            if(tile===null)continue;
            const collider = tile.getCollider();
            for (let index = 0; index < collider.length; index++) {
                const shape = collider[index];
                // we use getcollider here cause i'm a dumb ass lmao
                const collide = Shape.collide(this.getCollider(),shape);
                if(collide===null)continue;
                // if the collide shape is a trigger
                if(shape.trigger){
                    // map the trigger into the tileTriggerd, if the shape is all ready in, skip
                    const tileName = tile.position.x+":"+tile.position.y+":"+index;
                    if(this.tileTriggerd[tileName]===undefined)this.tileTriggerd[tileName]=shape;
                }
                else{
                    colVec.add(collide);
                    position.sub(collide);
                }
            }

        }
        return {position : position, colVec : colVec};
    }

    /**
     * Move the play with the velocity set and made it collide with things
     * @param {*} vel
     * @param {*} context
     */
    moveAndCollide(vel,context){
        let collideResult={position : this.position, colVec : new Vector(0,0)};
        const velMagnetude = vel.magnetude();
        const nStep = Math.round(velMagnetude/COLLISION_STEP);
        const stepVel = vel.normalize().scale(velMagnetude/nStep);

        for (let index = 0; index < nStep; index++) {
            // move player
            this.position.add(stepVel);

            // resolve collision
            collideResult = this.applyCollision(this.position,context);
            this.position=collideResult.position;

        }
        return collideResult;
    }



    projectTrigger(shape,context){
        const result=[];
        const tiles = context.getSuroundTiles(shape.offset.x,shape.offset.y,2);


        for (const tile of tiles) {
            if(tile===null)continue;
            const collider = tile.getCollider();

            for (const s of collider) {
                // we use getcollider here cause i'm a dumb ass lmao
                const collide = Shape.collide(shape,s);
                if(collide===null)continue;
                if(s.trigger===undefined){
                    result.push(tile);
                    break;
                }
            }
        }

        return result;
    }

    //#endregion

    //#region ============== MOVEMENT ==============

    canJump(){
        return this.onGround;
    }

    initJump(vel_y){
        this.onJump=true;
        this.jumpTimer=JUMP_MAX_LENGHT;
        return -JUMP_STENGHT;
    }

    endJump(vel_y){
        this.onJump=false;
        if(vel_y<0){
            return vel_y;
        }
        return vel_y;
    }

    //#endregion


    //#region ============== Update ==============

    movementUpdate(t){
        let dir = 0;
        const speed = 1;
        if(Input.right.pressed){
            dir+=speed;
        }
        if(Input.left.pressed){
            dir-=speed;
        }
        this.onMove=dir!=0;
        this.facing=(dir!=0)?dir:this.facing;
        return dir*speed;
    }

    jumpUpdate(vel_y,t){




        if(this.onJump){
            this.jumpTimer-=t;
            if(!Input.jump.pressed || vel_y>=0 || this.jumpTimer<=0){
                return this.endJump(vel_y);
            }
        }
        else if(this.canJump() &&this.input.releaseJump &&Input.jump.pressed){
            this.input.releaseJump=false;
            return this.initJump(vel_y);
        }

        this.input.releaseJump=(!Input.jump.pressed)?true:this.input.releaseJump;

        return vel_y;
    }

    gravitUpdate(vel_y,t){
        // if jump, no gravity
        if(this.onJump){
            //...
            return vel_y;
        }

        // if action, no gravity
        if(false) {
            // ...
        }

        return vel_y+GRAVITY_STRENGHT*t;
    }
    //#endregion

    //#region ============== PHYSIC ==============
    environmentDetection(context){
        // check ground
        const groundTile = this.projectTrigger(
            Shape.createShape(
                ShapeType.SQUARE,
                this.position.clone().add(new Vector(0,tileSize/2 + 1)),
                new Vector(tileSize-1,2)
            ),
            context
        );
        this.onGround=groundTile.length>0 && this.velocity.y>=0;
    }


    moveX(vel,t,context){
        let vel_x=vel;
        vel_x=this.movementUpdate(t);



        const velVector = new Vector(vel_x,0);
        const collide = this.moveAndCollide(velVector,context);
        const dot = Vector.normalize(velVector).dot(collide.colVec.normalize());
        if(0.7071<=dot){
            vel_x=0;
        }
        return vel_x;
    }

    moveY(vel,t,context){
        let vel_y=vel;
        vel_y=this.gravitUpdate(vel_y,t);

        vel_y=this.jumpUpdate(vel_y,t);

        const velVector = new Vector(0,vel_y);
        const collide = this.moveAndCollide(velVector,context);
        const dot = Vector.normalize(velVector).dot(collide.colVec.normalize());
        if(0.7071<=dot){
            vel_y=0;
        }

        return vel_y;
    }
    //#endregion


    onCreate(context){
        console.log("yo");
    }

    update(context,t){
        if(debug.freeCam){
            let dir = new Vector(0,0);
            const speed = 2;
            if(Input.right.pressed){
                dir.x+=1;
            }
            if(Input.left.pressed){
                dir.x-=1;
            }
            if(Input.up.pressed){
                dir.y-=1;
            }
            if(Input.down.pressed){
                dir.y+=1;
            }
            this.position.add(dir.normalize().scale(speed));
            return;
        }
        // ground detetction
        this.environmentDetection(context);


        this.velocity.x=this.moveX(this.velocity.x,t,context);
        this.velocity.y=this.moveY(this.velocity.y,t,context);

        // resolve trigger
        for (const key in this.tileTriggerd) {
            if (Object.hasOwnProperty.call(this.tileTriggerd, key)) {
                this.tileTriggerd[key].trigger(this);
                console.log("test");
            }
        }

        this.tileTriggerd={};
    }

    onDestroy(context){
        // ...
        console.log("destroy");
    }

    render(x,y,context,t){

        const r = RessourceLoader.getRessourceLoader();
        const image=r.get("./ressource/testPlayer.png");

        const scale = new Vector(1,1);

        const offset=new Vector(0,0);

        if(this.onMove && this.onGround){
            this.walkAnimation.dis = MathUtils.approche(this.walkAnimation.dis,(Math.min(1,this.velocity.x/1)*0.2),t*2);
            this.walkAnimation.c += t*15;

            const v = (Math.abs(Math.cos(this.walkAnimation.c))-0.5)*0.2;
            scale.y = 1 - v;
            offset.y=+v * 10;
        }
        else if(this.onGround){
            this.walkAnimation.dis = MathUtils.approche(this.walkAnimation.dis,0,t*2);
            this.walkAnimation.c=0;
        }
        else{
            this.walkAnimation.dis=0;
            this.walkAnimation.c=0;
        }

        if(!this.onGround && this.onJump){
            this.airAnimation.skich=MathUtils.approche(this.airAnimation.skich,0,t*2);
            scale.x = 1-this.airAnimation.skich;
            scale.y = 1+this.airAnimation.skich;
        }
        else if(!this.onGround){
            this.airAnimation.skich=MathUtils.approche(this.airAnimation.skich,0.5 * Math.min(1, Math.abs(this.velocity.y / 10)),t*2);
            scale.x = 1-this.airAnimation.skich;
            scale.y = 1+this.airAnimation.skich;
        }
        else{
            this.airAnimation.skich=(this.onJump)?0.5:0;
        }

        scale.x*=this.facing;


        //this.onMove

        context.transform(scale.x, 0, -this.walkAnimation.dis, scale.y, x-(tileSize/2)*scale.x + offset.x, y-(tileSize/2)*scale.y + offset.y);

        context.renderTexture(image, 0, 0, 16, 16, 0,0, tileSize, tileSize);


        context.resetTransform();

        // debug
        if(debug.debugCollision)context.debugRenderShape(this.getCollider(),(this.onGround)?"#00ff9955":"#ff005555",false);

        if(debug.debugInfo){
            context.fillStyle="#000000ff";
            context.font = "20px serif";

            const debugText=[
                "ground : "+this.onGround,
                "jump : "+this.onJump,
                "("+this.position.x+", "+this.position.y+")"
            ]

            for (let index = 0; index < debugText.length; index++) {
                context.fillText(debugText[index], x, y-30-30*index);
            }
        }
    }
}