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
import { MovingTile } from "../tileSystem/tile.js";
import { Buffer, BufferSystem } from "./bufferSystem.js";



// settings


// buffer
export const BUFFER_LENGTH = 0.15;                          // Buffer time lenght in sec
export const COYOTIE_TIME_LENGTH=0.1;                       // coyotie time time lenght in sec

const VERTICAL_CORNER_CORRECTION_SIZE = TILE_SIZE/3;        // Vertical corner correction size


// physic step
export const COLLISION_STEP_MAGNETUDE=1;                    // magnetude min use for the displacement vector for collision checking/resolution


// physic settings
export const MAX_DOWN_SPEED = 700;                          // max downward speed the player can achive
export const GRAVITY_STRENGHT = 1500;                       // gravity strength

export const MAX_FAST_FALL_DOWN_SPEED = 1000;               // max downward speed the player can achive when fast falling
export const GRAVITY_FAST_FALL_STRENGHT = 3000;             // gravity strength when fast falling

// walk speed
export const WALK_SPEED=200;                                // walk speed of the player
export const WALK_ACC=1500;                                 // how quickly the player reatch a desire speed
export const COUNTER_WALK_MUL=2;                            // counter walk multiplicator, help changing direction quickly
export const WALK_DEC=1000;                                 // how quickly the player goses back to the target speed if he's faster


export const JUMP_STRENGTH=250;                             // jump vertical strength
export const JUMP_MAX_LENGHT=0.2;                           // jump max time length
export const JUMP_MIN_LENGHT=0.02;                          // jump min time length
export const AIR_MUL = 0.7;                                 // air multiplyer, use to reduce air controlle for example
export const JUMP_END_MULT=0.3;                             // amount of which the vertical speed of the player will be multipl when ending a jump

const CROUTCH_MUL=1.5;                                      // croutch friction multiplyer
const CROUTCH_MOVE_PENALITY=0.5;                            // croutch movement penality multiplyer





// camera
const CAMERA_LOOK_AHEAD_STRENGTH=100;                       // camera look ahead strength
const CAMEAR_LOOK_AHEAD_SPEED=2;                            // camera speed to reatch to lock ahead
const CAMEAR_LOOK_AHEAD_TIMER=0.5;                          // how long the player need to go in one direction to have the look ahead camear effect in the direction


const DEFAULT_RIDE_VELOCITY=new Vector(0,0);



const debug={
    debugInfo:true,
    debugCollision:true
}



export class Player extends Actor{

    constructor(){
        super();

        this.dead=false;    // if the player dead {skull emoji}


        this.game=null; // game instance


        this.velocity=new Vector(0,0);  // velocity of the player

        this.rideTile=null;             // tile rided by the player

        this.ridePositionBuffer=new Vector(0,0);    // last tile rided position


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
            BUFFER_LENGTH
        ));

        this.bufferSystem.register("endJump",new Buffer(
            ()=>{
                return this.onJump;
            },
            BUFFER_LENGTH
        ));


        // state
        this.facing=1;  // where the player is facing

        // collision
        this.collider=Shape.createShape(ShapeType.SQUARE).setScale(new Vector(TILE_SIZE,TILE_SIZE));

        // collider when croutched
        this.croutchCollider=Shape.createShape(ShapeType.SQUARE,new Vector(0,TILE_SIZE/4),new Vector(TILE_SIZE,TILE_SIZE/2));

        // trigger use to check if grounded
        this.groundTriggerBox = Shape.createShape(
            ShapeType.SQUARE,
            new Vector(0,TILE_SIZE/2 + 1),
            new Vector(TILE_SIZE-1,2)
        );

        // trigger use to check for corner correction
        this.jumpCorrectionBox = [
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(-TILE_SIZE/2 + VERTICAL_CORNER_CORRECTION_SIZE/2,0),
                new Vector(VERTICAL_CORNER_CORRECTION_SIZE,2)
            ),
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(+TILE_SIZE/2 - VERTICAL_CORNER_CORRECTION_SIZE/2,0),
                new Vector(VERTICAL_CORNER_CORRECTION_SIZE,2)
            ),
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(0,-TILE_SIZE/2-1),
                new Vector(TILE_SIZE-2*VERTICAL_CORNER_CORRECTION_SIZE,2)
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
        this.walkSpeed= WALK_SPEED;
        this.walkAcc = WALK_ACC;  // walk acceleration
        this.walkDec = WALK_DEC;   // walk decelaration

        // movement
        this.onMove=false;


        // jump
        this.onJump=false;
        this.jumpTimer=0;
        this.coyotie_timer=0;

        // croutch
        this.onCroutch=false;


        // camera
        this.cameraOffsetX=0;
        this.cameraHeadDir=1;
        this.cameraHeadTimer=CAMEAR_LOOK_AHEAD_TIMER;

        // if free camera is activated
        this.onFreeCam=false;
        this.freeCamOffset=new Vector(0,0);


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

    /**
     * Update input reconition
     */
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



    /**
     * Get the collider of the player
     * @param {Vector} position position of the player
     * @returns {Shape}
     */
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
        const tiles = this.game.getSuroundTiles(position.x,position.y,this.getCollider().getBoundingBox(),2);

        // sort tiles by distance
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

        // we use max since it's possible to go slower then a velocity step and we still need to move in that case
        const nStep = Math.max(1,Math.round(velMagnetude/COLLISION_STEP_MAGNETUDE));

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
     * @param {Shape} shape shape use
     * @param {Tile[]} preComputeTile if set, list of tile to use for the trigger test
     * @returns {Tile[]} list of tile catch by the trigger
     */
    projectTrigger(shape,preComputeTile=[]){
        const result=[];
        const tiles = (preComputeTile.length===0)?this.game.getSuroundTiles(this.position.x,this.position.y,this.getCollider().getBoundingBox(),2):preComputeTile;


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

    //#region ============== CAMERA ==============

    /**
     * Toggle free camera
     * @param {*} state
     */
    toggleFreeCam(state){
        this.onFreeCam=state;
        this.freeCamOffset.set(0,0);
    }

    /**
     * Update camera behavior
     * @param {number} t delta t
     */
    updateCamera(t){
        const d = this.getTargetFacingDir();

        if(this.cameraHeadTimer>=0){
            this.cameraOffsetX = MathUtils.approche_noneLinear(this.cameraOffsetX,this.cameraHeadDir,(distance)=>{
                let m = 0.2;
                const d = Math.abs(distance);
                if(d>m){
                    m=d;
                }

                return t * CAMEAR_LOOK_AHEAD_SPEED * m

            });
        }

        if(d!==0 && Math.sign(d) !== Math.sign(this.cameraHeadDir)){
            if(this.cameraHeadTimer>=0){
                this.cameraHeadTimer-=t;
            }
            else{
                this.cameraHeadTimer=CAMEAR_LOOK_AHEAD_TIMER;
                this.cameraHeadDir=d;
            }
        }
        else if(d!==0){
            this.cameraHeadTimer=CAMEAR_LOOK_AHEAD_TIMER;
        }

        this.game.setCameraOffset(new Vector(this.cameraOffsetX*CAMERA_LOOK_AHEAD_STRENGTH,0));


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
     * @param {number} vel_y actual velocity y
     * @returns {number} new velocty y
     */
    initJump(vel_y){
        this.onJump=true;
        this.jumpTimer=JUMP_MAX_LENGHT;
        this.airAnimation.skich=0.5;
        this.coyotie_timer=-1;

        return -JUMP_STRENGTH;
    }

    /**
     * end a jump
     * @param {number} vel_y actual velocity y
     * @returns {number} new velocty y
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
     * @param {number} vel_y actual velocity y
     * @param {number} t delta t
     * @returns {number} new velocity y
    */
    jumpUpdate(vel_y,t){

        if(this.onGround){
            this.coyotie_timer=COYOTIE_TIME_LENGTH;
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

    /**
     * Can the player move horizontaly
     * @returns {boolean}
     */
    canWalk(){
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
     * @returns {number}
     */
    getMovmentFactor(){
        let mult = this.onGround?1:AIR_MUL;

        mult *= this.friction;

        if(this.onCroutch)mult*=CROUTCH_MUL;

        return mult;
    }

    /**
     * Update movement
     * @param {number} vel_x actual velocity x
     * @param {number} t delta t
     * @returns {number} new velocity x
     */
    movementUpdate(vel_x,t){

        let dir=this.canWalk()?this.getTargetFacingDir():0;

        this.facing=(dir!=0)?dir:this.facing;

        this.onMove=(dir!==0);

        if(this.onCroutch)dir*=CROUTCH_MOVE_PENALITY;

        let mult = this.getMovmentFactor();

        if(Math.abs(vel_x) > this.walkSpeed && Math.sign(vel_x) === dir){
            mult *= this.walkDec;
        }
        else{
            mult *= this.walkAcc;
            if(dir !== 0 && dir !==Math.sign(vel_x)){
                mult*=COUNTER_WALK_MUL;
            }
        }

        return MathUtils.approche(vel_x,this.getBaseVelocity().x + dir * this.walkSpeed,  mult * t);
    }



    //#endregion

    //#region =========== Move Y

    /**
     * Get actual max down speed
     * @returns {number}
     */
    getMaxDownSpeed(){
        return Input.down.pressed?MAX_FAST_FALL_DOWN_SPEED:MAX_DOWN_SPEED;
    }

    /**
     * Get actual gravity strenght
     * @returns {number}
     */
    getGravity(){
        return Input.down.pressed?GRAVITY_FAST_FALL_STRENGHT:GRAVITY_STRENGHT;
    }

    /**
     * gravity update
     * @param {number} vel_y actual velocity y
     * @param {number} t delta t
     * @returns {number}  new velocity y
     */
    gravitUpdate(vel_y,t){
        // if jump, no gravity
        if(this.onJump  || this.onGround || this.coyotie_timer>0.1){
            //...
            return vel_y;
        }

        return MathUtils.approche(vel_y,this.getMaxDownSpeed(), GRAVITY_STRENGHT*t);
    }
    //#endregion

    //#endregion

    //#region ============== PHYSIC ==============

    /**
     * set a tile as a riding tile
     * @param {Tile} tile
     */
    setRidingTile(tile){
        if(this.rideTile===tile)return;
        if(!(tile instanceof MovingTile))return;

        this.rideTile=tile;
        this.ridePositionBuffer.set(this.rideTile.position);

        this.velocity.set(tile.velocity.clone().add(Vector.sub(this.velocity,tile.velocity)));
    }

    /**
     * end riding a tile
     */
    endRide(){
        if(this.rideTile===null)return;
        this.velocity.add(this.rideTile.velocity);
        this.rideTile=null;
        this.ridePositionBuffer.set(0,0);


    }

    /**
     * Update tile riding
     */
    updateRideTile(){
        if(this.rideTile===null)return;
        const buffer =this.rideTile.position.clone();
        buffer.sub(this.ridePositionBuffer);
        this.position.add(buffer.x,buffer.y);
        this.ridePositionBuffer.set(this.rideTile.position);
    }



    /**
     * Get the default velocity (the zero if you want);
     * @returns
     */
    getBaseVelocity(){
        return DEFAULT_RIDE_VELOCITY;
    }



    /**
     * Check environment
     */
    environmentDetection(){
        // check ground
        const groundTile = this.projectTrigger(
            this.groundTriggerBox.setOrigine(this.position)
        );
        this.onGround=groundTile.length>0;

        let riding = false;
        // check for ridding
        if(this.onGround){
            for (const tile of groundTile) {
                this.setRidingTile(tile);
                riding=true;
                break;
            }
        }

        if(!riding){
            this.endRide();
        }
    }


    /**
     * Check if a vertical corner correction is need and if yes
     * correct it
     */
    checkVerticalCornerCorrection(){

        const tiles = this.game.getSuroundTiles(this.position.x,this.position.y,this.getCollider().getBoundingBox(),2);



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
                const collide = Shape.collide(this.jumpCorrectionBox[3].setOrigine(this.position),shape,true,[new Vector(0,1)]);
                if(collide===null)continue;

                // if the collide shape is a trigger
                if(!shape.trigger){
                }

                if((v1 && collide.x<0) || (v0 && collide.x>0))return false;
                this.position.sub(collide.set(collide.x,0));
                return true;
            }
        }
        return false;
    }


    /**
     * Can the player croutch
     * @returns {boolean}
     */
    canCroutch(){
        return this.onGround && !this.onJump;
    }


    /**
     * Coutch update
     */
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

    /**
     * Compute and move along the X axis
     * @param {number} vel velociy in the X axis
     * @param {number} t delta t
     * @returns {number} new velocity in the X axis
     */
    moveX(vel,t){
        let vel_x=vel;

        vel_x=this.movementUpdate(vel_x,t);


        // mindot is higher here to prevent stop agains slop
        if(!this.moveWithVelCollision(new Vector(vel_x*t,0),0.998)){
            vel_x=this.getBaseVelocity().x;
        }



        return vel_x;
    }

    /**
     * Compute and move along the Y axis
     * @param {number} vel velociy in the Y axis
     * @param {number} t delta t
     * @returns {number} new velocity in the Y axis
     */
    moveY(vel,t){
        let vel_y=vel;

        vel_y=this.gravitUpdate(vel_y,t);

        vel_y=this.jumpUpdate(vel_y,t);

        if(!this.moveWithVelCollision(new Vector(0,vel_y*t),((vel_y<0)?0.998:0.6))){
            // check for corner correction
            if(vel_y>=0 || !this.checkVerticalCornerCorrection()){
                vel_y=this.getBaseVelocity().y;
                console.log("end");
            }

        }


        return vel_y;
    }

    //#endregion

    /**
     * When player spawn
     */
    onSpawn(){
        this.dead=false;
        this.velocity.set(0,0);
        this.onCroutch=false;
        this.onMove=false;
        this.onJump=false;
        this.facing=1;
        this.rideTile=null;
    }



    onCreate(game){
        this.game=game;
        game.setCameraTarget(this.position);
        game.setCameraPosition(this.position);
    }


    update(t){
        if(this.onFreeCam){
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

            this.freeCamOffset.add(dir.normalize().scale(speed));
            this.game.setCameraOffset(this.freeCamOffset);
            return;
        }

        if(this.dead)return;


        // update camera
        //this.updateCamera(t);

        // ground detetction
        this.environmentDetection();

        this.croutchUpdate();



        // moving update
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

        // riding update
        this.updateRideTile();


        // buffer update
        this.bufferSystem.update(t);

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

    /**
     * Render the player
     * @param {number} x position X on screen
     * @param {number} y position Y on screen
     * @param {context2D extended} context js context 2d with additional utils function given by the Renderer
     * @param {number} t delta t between 2 render
     */
    render(x,y,context,t){

        if(this.dead)return;

        const r = RessourceLoader.getRessourceLoader();
        const image=r.get("./ressource/testPlayer.png");

        const scale = new Vector(1,1);

        const offset=new Vector(0,0);

        if(this.onMove && this.onGround){
            this.walkAnimation.dis = MathUtils.approche(this.walkAnimation.dis,(MathUtils.clamp(this.velocity.x/100,-1,1)*0.2),t*2);
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
            this.airAnimation.skich=MathUtils.approche(this.airAnimation.skich,0.5 * Math.min(1, Math.abs(this.velocity.y / 1000)),t*2);
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

    /**
     * Get the list of text to show in the debug text
     * @returns
     */
    getDebugText(){
        return [
            "ground : "+this.onGround,
            "position : "+this.position.to_string(),
            "velocity x : "+this.velocity.x
        ]
    }

    /**
     * Render debugs
     * @param {*} x
     * @param {*} y
     * @param {*} context
     * @param {*} t
     */
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