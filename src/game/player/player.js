/**
 * @ Autheur: Theo Bensaci
 * @ Date: 19:51 11.05.2026
 * @ Description: Player class
 */

import { RENDER_RESOLUTION, TILE_SIZE, WORLD_LIMIT } from "../../constant.js";
import { Input } from "../../utils/input.js";
import { RessourceLoader } from "../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { MathUtils } from "../../utils/utils.js";
import { Vector } from "../../utils/vector.js";
import { Actor } from "../actor.js";
import { Buffer, BufferSystem } from "./bufferSystem.js";



// settings


// buffer
export const BUFFER_LENGHT = 0.15;
export const COYOTIE_TIME=0.1;

const VERTICAL_CORNER_CORRECTION_LENGHT = TILE_SIZE/3;


// physic step
export const COLLISION_STEP=1;


// physic settings
export const MAX_DOWN_SPEED = 30;
export const GRAVITY_STRENGHT = 6.5;
export const JUMP_STENGHT=1.25;
export const JUMP_MAX_LENGHT=0.2;
export const JUMP_MIN_LENGHT=0.02;
export const AIR_MUL = 0.7;
export const JUMP_END_MULT=0.3;

const CROUTCH_MUL=1.5;
const CROUTCH_MOVE_PENALITY=0.5;



const debug={
    freeCam:false,
    debugInfo:false,
    debugCollision:false
}



export class Player extends Actor{

    constructor(x,y){
        super(x,y);


        this.game=null; // game instance


        this.velocity=new Vector(0,0);

        // list of tile needed to be triggered during the last update (clear with each update)
        // need to be object (or a map) to prevent tiles to be trigger multiple time
        this.tileTriggerd={};


        // input

        this.input={
            releaseJump:true,
            releaseAction:true
        }


        // buffer
        this.bufferSystem = new BufferSystem();
        // inti buffer system
        this.bufferSystem.register("initJump",new Buffer(
            ()=>{
                return this.canJump();
            },
            BUFFER_LENGHT
        ));

        this.bufferSystem.register("endJump",new Buffer(
            ()=>{
                return this.onJump;
            },
            BUFFER_LENGHT
        ));


        // state
        this.facing=1;  // where the player is facing

        // collision
        this.collider=Shape.createShape(ShapeType.SQUARE).setScale(new Vector(TILE_SIZE,TILE_SIZE));

        this.croutchCollider=Shape.createShape(ShapeType.SQUARE,new Vector(0,TILE_SIZE/4),new Vector(TILE_SIZE,TILE_SIZE/2));

        console.log(this.collider.scale.y);

        this.groundTriggerBox = Shape.createShape(
            ShapeType.SQUARE,
            new Vector(0,TILE_SIZE/2 + 1),
            new Vector(TILE_SIZE-1,2)
        );

        this.jumpCorrectionBox = [
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(-TILE_SIZE/2 + VERTICAL_CORNER_CORRECTION_LENGHT/2,0),
                new Vector(VERTICAL_CORNER_CORRECTION_LENGHT,2)
            ),
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(+TILE_SIZE/2 - VERTICAL_CORNER_CORRECTION_LENGHT/2,0),
                new Vector(VERTICAL_CORNER_CORRECTION_LENGHT,2)
            ),
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(0,-TILE_SIZE/2-1),
                new Vector(TILE_SIZE-2*VERTICAL_CORNER_CORRECTION_LENGHT,2)
            ),

            /*
                this box is use to resolve the corner correction
                But we got a problem, raycast are kind of broke (for now, i'm just lazy)
                so i use a secret technic call : "make a big box", since during collsion computation
                we do check from base on distance between player and the tile, we can juste make a big box to resolve the corner correction
            */
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(0,-TILE_SIZE/2-TILE_SIZE*2),
                new Vector(TILE_SIZE,TILE_SIZE*4)
            )
        ]


        // physic
        this.onGround=false;

        // horizontal movement
        this.friction = 1;
        this.walkSpeed= 1.2;
        this.walkAcc = 20;  // walk acceleration
        this.walkDec = 10;   // walk decelaration

        // movement
        this.onMove=false;


        // jump
        this.onJump=false;
        this.jumpTimer=0;
        this.coyotie_timer=0;

        // croutch
        this.onCroutch=false;


        // animation


        this.walkAnimation = {
            dis : 0,
            c:0
        };

        this.airAnimation = {
            skich:0.5
        };

        this.croutchAnimation = {
            skich:0.5
        };


    }

    //#region ============== INPUT ==============

    inputUpdate(){
        if(Input.jump.pressed && this.input.releaseJump){
            this.bufferSystem.init("initJump");
        }
        if( !Input.jump.pressed && (this.bufferSystem.has("initJump") || this.onJump)){
            this.bufferSystem.init("endJump");
        }


        if(Input.jump.pressed && this.input.releaseJump)this.input.releaseJump=false;
        this.input.releaseJump=(!Input.jump.pressed)?true:this.input.releaseJump;

    }

    //#endregion

    //#region ============== COLLISION ==============



    getCollider(position = this.position){
        return ((this.onCroutch)?this.croutchCollider:this.collider).setOrigine(position);
    }

    /**
     * Compute collision of the player for a specific position
     * @param {Vector} position position
     * @returns {object} {position : position after resolution, colVec : normal vector of the collider we collide with};
     */
    computeCollision(position){
        let colVec=new Vector(0,0);
        const tiles = this.game.getSuroundTiles(position.x,position.y,2);

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
     * @param {Number} vel
     */
    moveAndCollide(vel){
        let collideResult={position : this.position, colVec : new Vector(0,0)};
        const velMagnetude = vel.magnetude();
        const nStep = Math.round(velMagnetude/COLLISION_STEP);
        const stepVel = Vector.normalize(vel).scale(velMagnetude/nStep);


        for (let index = 0; index < nStep; index++) {
            // move player
            this.position.add(stepVel);


            // resolve collision
            collideResult = this.computeCollision(this.position);
            this.setPos(collideResult.position);

        }
        return collideResult;
    }



    /**
     * Project a trigger shape
     * @param {Shape} shape
     * @returns
     */
    projectTrigger(shape,preComputeTile=[]){
        const result=[];
        const tiles = (preComputeTile.length===0)?this.game.getSuroundTiles(this.position.x,this.position.y,2):preComputeTile;


        for (const tile of tiles) {
            if(tile===null)continue;
            const collider = tile.getCollider();

            for (const s of collider) {
                const collide = Shape.collide(shape,s,false);
                if(!collide)continue;
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

    /*
        LOGIC :
        for the movement, we use a pipline implementation to split the code
        each function is use the same logic =>
            - get a velocity for a axe
            - do there things
            - return the new velocity
    */

    /**
     * Can the player jump
     * @returns
     */
    canJump(){
        return (this.onGround || this.coyotie_timer>0);
    }

    /**
     * Start a jump
     * @param {*} vel_y actual velocity y
     * @returns new velocty y
     */
    initJump(vel_y){
        this.onJump=true;
        this.jumpTimer=JUMP_MAX_LENGHT;
        this.airAnimation.skich=0.5;
        this.coyotie_timer=-1;

        return -JUMP_STENGHT;
    }

    /**
     * end a jump
     * @param {*} vel_y actual velocity y
     * @returns new velocty y
     */
    endJump(vel_y){
        if(this.jumpTimer>(JUMP_MAX_LENGHT-JUMP_MIN_LENGHT)){
            this.jumpTimer=JUMP_MIN_LENGHT;
            return vel_y;
        }
        this.onJump=false;
        if(vel_y<0){
            return vel_y+0.25;
        }
        return vel_y;
    }

    /**
     * Jump update
     * @param {*} vel_y actual velocity y
     * @param {*} t delta t
     * @returns new velocity y
    */
    jumpUpdate(vel_y,t){

        if(this.onGround){
            this.coyotie_timer=COYOTIE_TIME;
        }
        else if(this.coyotie_timer>0){
            this.coyotie_timer-=t;
        }

        if(this.onJump){
            this.jumpTimer-=t;
            if(this.bufferSystem.consume("endJump") || vel_y>=0 || this.jumpTimer<=0){
                this.bufferSystem.clear("endJump");
                return this.endJump(vel_y);
            }
        }
        else if(this.canJump() && this.bufferSystem.consume("initJump")){
            this.input.releaseJump=false;
            return this.initJump(vel_y);
        }

        return vel_y;
    }


    //#endregion





    //#endregion


    //#region ============== Update ==============

    //#region =========== Move X

    canMove(){
        return !(this.onCroutch && this.onGround);
    }

    /**
     * Get facing dir by checking the input direction
     * @param {boolean} zeroFree if true, will return the last facing dir in case no direction are pressed
     * @returns -1 or 1 (or 0 if zeroFree is false)
     */
    getTargetFacingDir(zeroFree=false){
        let dir = 0;
        if(Input.right.pressed){
            dir+=1;
        }
        if(Input.left.pressed){
            dir-=1;
        }
        if(zeroFree && dir===0){
            return this.facing;
        }
        return dir;
    }

    /**
     * Get the movement factor use to compute things like air controlle of accéleration
     * Basicly, if small factor = ice friction, big factor = big friction
     * @returns
     */
    getMovmentFactor(){
        let mult = this.onGround?1:AIR_MUL;

        mult *= this.friction;

        if(this.onCroutch)mult*=CROUTCH_MUL;

        return mult;
    }

    /**
     * Update movement
     * @param {*} vel_x actual velocity x
     * @param {*} t delta t
     * @returns new velocity x
     */
    movementUpdate(vel_x,t){

        let dir=this.canMove()?this.getTargetFacingDir():0;

        this.facing=(dir!=0)?dir:this.facing;

        this.onMove=(dir!==0);

        if(this.onCroutch)dir*=CROUTCH_MOVE_PENALITY;

        let mult = this.getMovmentFactor();

        if(Math.abs(vel_x) > this.walkSpeed && Math.sign(vel_x) === dir){
            mult *= this.walkDec;
        }
        else{
            mult *= this.walkAcc;
        }

        return MathUtils.approche(vel_x,dir * this.walkSpeed,  mult * t);
    }



    //#endregion

    //#region =========== Move Y

    /**
     * gravity update
     * @param {*} vel_y actual velocity y
     * @param {*} t delta t
     * @returns new velocity y
     */
    gravitUpdate(vel_y,t){
        // if jump, no gravity
        if(this.onJump  || this.onGround || this.coyotie_timer>0.1){
            //...
            return vel_y;
        }

        return vel_y+GRAVITY_STRENGHT*t;
    }
    //#endregion

    //#endregion

    //#region ============== PHYSIC ==============

    /**
     * Check environment
     */
    environmentDetection(){
        // check ground
        const groundTile = this.projectTrigger(
            this.groundTriggerBox.setOrigine(this.position)
        );
        this.onGround=groundTile.length>0;
    }


    checkVerticalCornerCorrection(){

        const tiles = this.game.getSuroundTiles(this.position.x,this.position.y,2);


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

        const orgine=this.getCollider().getCenter().add(0,-this.getCollider().scale.y/2-1);

        const v0 = this.projectTrigger(
            this.jumpCorrectionBox[0].setOrigine(orgine),tiles
        ).length > 0;
        const v1 = this.projectTrigger(
            this.jumpCorrectionBox[1].setOrigine(orgine),tiles
        ).length > 0;

        const v3 = this.projectTrigger(
            this.jumpCorrectionBox[2].setOrigine(orgine),tiles
        ).length > 0;


        if(v3 || !v1 && !v0)return false;

        for (const tile of tiles) {
            if(tile===null)continue;
            const collider = tile.getCollider();
            for (let index = 0; index < collider.length; index++) {
                const shape = collider[index];


                // we use getcollider here cause i'm a dumb ass lmao
                const collide = Shape.collide(this.jumpCorrectionBox[3].setOrigine(this.position),shape);
                if(collide===null)continue;

                // if the collide shape is a trigger
                if(!shape.trigger){
                }
                collide.set(collide.x,0);
                if((v1 && collide.x<0) || (v0 && collide.x>0))return false;
                this.position.sub(collide.set(collide.x,0));
                return true;
            }
        }
        return false;
    }


    canCroutch(){
        return this.onGround && !this.onJump;
    }


    croutchUpdate(){
        if(this.onCroutch){
            if(!Input.down.pressed || this.velocity.y>0){
                this.onCroutch=false;
                return;
            }
        }
        else if(this.canCroutch() && Input.down.pressed){
            this.onCroutch=true;
        }
    }



    /**
     * Move the player along the velocity vector, with it collide with something, check if the dot product is greater then the minDot
     * with this check, return true if the velocity can be keep or false if the velocity need to be cancel
     * @param {*} velocity
     * @param {*} minDot
     */
    moveWithVelCollision(velocity,minDot){

        // check if there is a collision if we follow the velocity vector
        const collide = this.moveAndCollide(velocity);
        const dot = Vector.normalize(velocity).dot(collide.colVec.normalize());

        // compare the dot product of the collision vector and velocity vector to avoid false positive
        // due to the same logic of phantom hit in smash bros melee (check : https://www.youtube.com/watch?v=jXAmaY6EvOQ&t=418s)
        // Note : need to be that hight to avoid clip with slop
        if(minDot<=dot){
            return false;
        }

        return true;
    }

    moveX(vel,t){
        let vel_x=vel;

        vel_x=this.movementUpdate(vel_x,t);


        // mindot is higher here to prevent stop agains slop
        if(!this.moveWithVelCollision(new Vector(vel_x,0),0.998)){
            vel_x=0;
        }



        return vel_x;
    }

    moveY(vel,t){
        let vel_y=vel;

        vel_y=this.gravitUpdate(vel_y,t);

        vel_y=this.jumpUpdate(vel_y,t);

        if(!this.moveWithVelCollision(new Vector(0,vel_y),0.998)){
            // check for corner correction
            if(vel_y>=0 || !this.checkVerticalCornerCorrection()){
                vel_y=0;
            }

        }


        return vel_y;
    }
    //#endregion


    onCreate(game){
        this.game=game;
        game.setCameraTarget(this.position);
        game.setCameraPosition(this.position);
    }

    update(t){
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
        this.environmentDetection();

        this.croutchUpdate();



        this.velocity.x=this.moveX(this.velocity.x,t);
        this.velocity.y=this.moveY(this.velocity.y,t);


        // resolve trigger
        for (const key in this.tileTriggerd) {
            if (Object.hasOwnProperty.call(this.tileTriggerd, key)) {
                this.tileTriggerd[key].trigger(this);
            }
        }

        this.tileTriggerd={};

        // input update
        this.inputUpdate();




        // buffer update
        this.bufferSystem.step(t);

        if(this.position.y>200*TILE_SIZE){
            this.position.set(0,0);
            this.game.setCameraPosition(this.position);
        }

        // world limit
        const max_x = this.game.levelLimit.x*TILE_SIZE;
        const max_y = this.game.levelLimit.y*TILE_SIZE;
        this.position.set(MathUtils.clamp(this.position.x,0,max_x),MathUtils.clamp(this.position.y,0,max_y));


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
            this.walkAnimation.c+= t*1.5;
            const v = (Math.abs(Math.cos(this.walkAnimation.c))-0.5)*0.15;
            scale.y = scale.y - v;
            offset.y=+v * 10;
        }
        else{
            this.walkAnimation.dis=0;
            this.walkAnimation.c=0;
        }

        if(this.onCroutch){
            this.croutchAnimation.skich=MathUtils.approche(this.croutchAnimation.skich,1,t*20);
            const v = this.croutchAnimation.skich * 0.4;
            scale.x = scale.x+v;
            scale.y = scale.y-v;
            offset.y+=TILE_SIZE*v*0.5;
        }
        else{
            this.croutchAnimation.skich=0;
        }

        if(!this.onCroutch && !this.onGround && this.onJump){
            this.airAnimation.skich=MathUtils.approche(this.airAnimation.skich,0,t*2);
            scale.x = scale.x-this.airAnimation.skich;
            scale.y = scale.y+this.airAnimation.skich;
        }
        else if(!this.onCroutch && !this.onGround){
            this.airAnimation.skich=MathUtils.approche(this.airAnimation.skich,0.5 * Math.min(1, Math.abs(this.velocity.y / 10)),t*2);
            scale.x = scale.x-this.airAnimation.skich;
            scale.y = scale.y+this.airAnimation.skich;
        }
        else{
            this.airAnimation.skich=(this.onJump)?0.5:0;
        }


        scale.x*=this.facing;


        //this.onMove

        context.transform(scale.x, 0, -this.walkAnimation.dis, scale.y, x-(TILE_SIZE/2)*scale.x + offset.x, y-(TILE_SIZE/2)*scale.y + offset.y);

        context.renderTexture(image, 0, 0, 16, 16, 0,0, TILE_SIZE, TILE_SIZE);


        context.resetTransform();


        this.renderDebug(x,y,context,t);

    }

    getDebugText(){
        return [
            "ground : "+this.onGround,
            "position : "+this.position.to_string(),
            "velocity x : "+this.velocity.x
        ]
    }

    renderDebug(x,y,context,t){
        // debug
        const debugContext = context.getDebugContext();
        if(debug.debugCollision){
            const orgine=this.getCollider().getCenter().add(0,-this.getCollider().scale.y/2 - 1);
            context.debugContextRenderShape(this.getCollider(),(this.onGround)?"#00ff9955":"#ff005555",false);
            context.debugContextRenderShape(this.groundTriggerBox.setOrigine(this.position.x,this.position.y),"#ffff9955",false);
            context.debugContextRenderShape(this.jumpCorrectionBox[0].setOrigine(orgine),"#ff005555",false);
            context.debugContextRenderShape(this.jumpCorrectionBox[1].setOrigine(orgine),"#ff005555",false);
        }

        if(debug.debugInfo){
            debugContext.fillStyle="#000000ff";
            debugContext.font = "20px serif";

            context.printDebugLabel(this.getDebugText());
        }
    }
}