/**
 * @ Autheur: Theo Bensaci
 * @ Date: 19:51 11.05.2026
 * @ Description: Player class
 */

import { tileSize } from "../../constant.js";
import { Input } from "../../utils/input.js";
import { RessourceLoader } from "../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { MathUtils } from "../../utils/utils.js";
import { Vector } from "../../utils/vector.js";
import { Actor } from "../actor.js";
import { Buffer, BufferSystem } from "./bufferSystem.js";



// settings

// buffer
const BUFFER_LENGHT = 0.15;
const COYOTIE_TIME=0.1;


// physic step
const COLLISION_STEP=1;


// physic settings
const MAX_DOWN_SPEED = 30;
const GRAVITY_STRENGHT = 6.5;
const JUMP_STENGHT=1.25;
const JUMP_MAX_LENGHT=0.2;
const JUMP_MIN_LENGHT=0.02;
const AIR_MUL = 0.7;
const JUMP_END_MULT=0.3;

// roll dash
const ROLLDASH_COULDOWN=0.25;
const ROLLDASH_TIME=0.15;
const ROLLDASH_TIME_HEAVY=0.2;
const ROLLDASH_SPEED=3;
const ROLLDASH_SPEED_HEAVY=4.5;
const ROLLDASH_CHARGE_TIME=0.5;
const ROLLDASH_CANCEL_BOOST=1.5;
const ROLLDASH_ATTACK_TIME = 0.1;
const ROLLDASH_END_VERTICAL_MUTL = 0.4;

const ROLLDASHCHARGING_MULT = 0.05;





const debug={
    freeCam:false,
    debugInfo:true,
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

        this.bufferSystem.register("initRollDashCharge",new Buffer(
            ()=>{
                return this.canRollDash() && !this.isRollDashCharging;
            },
            BUFFER_LENGHT
        ));

        this.bufferSystem.register("initRollDash",new Buffer(
            ()=>{
                return this.canRollDash() && this.isRollDashCharging;
            },
            BUFFER_LENGHT
        ));

        // state
        this.facing=1;  // where the player is facing

        // collision
        this.collider=Shape.createShape(ShapeType.SQUARE).setScale(new Vector(tileSize,tileSize));

        this.groundTriggerBox = Shape.createShape(
            ShapeType.SQUARE,
            new Vector(0,tileSize/2 + 1),
            new Vector(tileSize-1,2)
        );


        // physic
        this.onGround=false;

        // horizontal movement
        this.friction = 1;
        this.walkSpeed= 1.2;
        this.walkAcc = 20;  // walk acceleration
        this.walkDec = 10;   // walk decelaration

        // movement
        this.onMove=false;

        // roll dash
        this.isRollDashing = false;
        this.isRollDashCharging = false;
        this.rollDashNumber = 0;
        this.rollDashTimer = 0;
        this.rollDashCouldown = 0;
        this.rollDashChargeTime = 0;
        this.rollDashDir = new Vector(0,0);

        // jump
        this.onJump=false;
        this.jumpTimer=0;
        this.coyotie_timer=0;


        // animation


        this.walkAnimation = {
            dis : 0,
            c:0
        };

        this.airAnimation = {
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

        if(Input.action.pressed && this.input.releaseAction){
            this.bufferSystem.init("initRollDashCharge");
        }

        if(!Input.action.pressed && (this.bufferSystem.has("initRollDashCharge") || this.isRollDashCharging)){
            this.bufferSystem.init("initRollDash");
        }

        if(Input.jump.pressed && this.input.releaseJump)this.input.releaseJump=false;
        this.input.releaseJump=(!Input.jump.pressed)?true:this.input.releaseJump;

        if(Input.action.pressed && this.input.releaseAction)this.input.releaseAction=false;
        this.input.releaseAction=(!Input.action.pressed)?true:this.input.releaseAction;
    }

    //#endregion

    //#region ============== COLLISION ==============



    getCollider(position = this.position){
        return this.collider.setOrigine(position);
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
    projectTrigger(shape){
        const result=[];
        const tiles = this.game.getSuroundTiles(this.position.x,this.position.y,2);


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
        return !this.isRollDashCharging && (this.onGround || this.coyotie_timer>0);
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

    //#endregion

    //#region ============== ROLL DASH ==============

    canRollDash(){
        return !this.isRollDashing && this.rollDashNumber > 0 && this.rollDashCouldown<=0;
    }

    isOnRollDashState(){
        return this.isRollDashing || this.isRollDashCharging;
    }

    initRollDash(){
        if(this.isRollDashing || this.rollDashNumber<0)return;
        this.isRollDashCharging=false;
        this.rollDashNumber--;

        const heavy = (this.rollDashChargeTime>ROLLDASH_CHARGE_TIME);

        const speed = (heavy)?ROLLDASH_SPEED_HEAVY:ROLLDASH_SPEED;

        this.rollDashDir.set(0,0);
        if(Input.right.pressed){
            this.rollDashDir.x+=1;
        }
        if(Input.left.pressed){
            this.rollDashDir.x-=1;
        }
        if(Input.up.pressed){
            this.rollDashDir.y-=1;
        }
        if(Input.down.pressed){
            this.rollDashDir.y+=1;
        }
        if(this.rollDashDir.x===0 && this.rollDashDir.y===0){
            this.rollDashDir.set(this.facing,0);
        }
        this.rollDashDir.normalize().scale(speed);


        const x = this.rollDashDir.x;//(Math.abs(this.velocity.x) > this.rollDashDir.x && Math.sign(this.velocity.x) === Math.sign(this.rollDashDir.x))?this.velocity.x:this.rollDashDir.x;
        const y = this.rollDashDir.y;//(Math.abs(this.velocity.y) > this.rollDashDir.y && Math.sign(this.velocity.y) === Math.sign(this.rollDashDir.y))?this.velocity.y:this.rollDashDir.y;

        this.rollDashChargeTime=0;

        this.rollDashTimer=(heavy)?ROLLDASH_TIME_HEAVY:ROLLDASH_TIME;

        this.isRollDashing=true;

        this.velocity.set(x,y);
    }

    endRollDash(){
        this.rollDashCouldown=ROLLDASH_COULDOWN;
        this.isRollDashing=false;
        if(this.velocity.y<0)this.velocity.set(this.velocity.x,this.velocity.y*ROLLDASH_END_VERTICAL_MUTL);
    }

    intiRollDashCharge(){
        if(this.isRollDashCharging|| this.rollDashCouldown>0)return;
        this.isRollDashCharging=true;
    }


    rollDashUpdate(t){

        if(this.rollDashNumber===0 && this.onGround){
            this.rollDashNumber=1;
        }

        if(this.bufferSystem.consume("initRollDashCharge") && !this.isRollDashCharging && this.canRollDash()){
            this.intiRollDashCharge();
        }

        if(this.bufferSystem.consume("initRollDash") && this.isRollDashCharging && this.canRollDash()){
            this.initRollDash();
        }


        // charging
        if(this.isRollDashCharging){
            this.rollDashChargeTime+=t;
            return false;
        }


        // on rolldash
        if(this.isRollDashing){
            this.rollDashTimer-=t;




            if(this.rollDashTimer<=0){
                this.endRollDash();
            }

            const collide = this.moveAndCollide(this.velocity);

            const colVec = collide.colVec.normalize();


            const dot = Vector.normalize(this.velocity).dot(collide.colVec.normalize());
            if(0.9<=dot){
                this.endRollDash();
                return true;
            }
            else if(dot!==0){
                this.rollDashTimer=ROLLDASH_TIME;
                colVec.rotate(Math.PI/2);
                if(colVec.dot(this.velocity)<0){
                    colVec.rotate(Math.PI);
                }
                colVec.scale(this.velocity.magnetude());
                this.velocity.set(colVec);
            }

            if(this.bufferSystem.consume("initJump")){
                this.velocity.set(this.velocity.x+(Math.sign(this.velocity.x)*ROLLDASH_CANCEL_BOOST),this.initJump());
                this.endRollDash();
                return false;
            }

            return true;
        }

        if(this.rollDashCouldown>0){
            this.rollDashCouldown-=t;
        }

        return false;

    }

    rollDashStateUpdate(){

        console.log(this.isRollDashCharging);
    }



    //#endregion


    //#region ============== Update ==============

    //#region =========== Move X

    /**
     * Update movement
     * @param {*} vel_x actual velocity x
     * @param {*} t delta t
     * @returns new velocity x
     */
    movementUpdate(vel_x,t){
        let dir = 0;
        if(!this.isRollDashCharging){
            if(Input.right.pressed){
                dir+=1;
            }
            if(Input.left.pressed){
                dir-=1;
            }
        }
        this.facing=(dir!=0)?dir:this.facing;

        this.onMove=(dir!==0);

        let mult = this.onGround?1:AIR_MUL;

        if(this.isRollDashCharging){
            mult*=(this.onGround)?ROLLDASHCHARGING_MULT:0;
        }

        mult *= this.friction;

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

        // if action, no gravity
        if(this.isRollDashing && this.rollDashTimer>ROLLDASH_ATTACK_TIME) {
            // ...
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
        this.onGround=groundTile.length>0 && this.velocity.y>=0;
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


        if(!this.moveWithVelCollision(new Vector(0,vel_y),0.7071)){
            vel_y=0;
        }

        return vel_y;
    }
    //#endregion


    onCreate(game){
        this.game=game;
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

        this.rollDashStateUpdate();


        if(!this.rollDashUpdate(t)){
            this.velocity.x=this.moveX(this.velocity.x,t);
            this.velocity.y=this.moveY(this.velocity.y,t);
        }

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

        if(this.position.y>200*tileSize)this.position.set(0,0);
    }

    onDestroy(context){
        // ...
        console.log("destroy");
    }

    render(x,y,context,t){

        const r = RessourceLoader.getRessourceLoader();
        const image=r.get("./ressource/testPlayer.png");

        // TODO : HMMMMM
        if(this.isOnRollDashState()){
            let color = "#ff0099";
            if(this.isRollDashCharging){

                color=(this.rollDashChargeTime>ROLLDASH_CHARGE_TIME)?"#ffff55":"#00ff99";
            }
            context.debugContextRenderShape(this.getCollider(),color,false);
        }
        else {
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
                scale.y = 1 - v;
                offset.y=+v * 10;
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

        }

        // debug
        const debugContext = context.getDebugContext();
        if(debug.debugCollision){
            context.debugContextRenderShape(this.getCollider(),(this.onGround)?"#00ff9955":"#ff005555",false);
            context.debugContextRenderShape(this.groundTriggerBox.setOrigine(this.position.x,this.position.y),"#ffff9955",false);
        }

        if(debug.debugInfo){
            debugContext.fillStyle="#000000ff";
            debugContext.font = "20px serif";

            const debugText=[
                "ground : "+this.onGround,
                "jump : "+this.onJump,
                "position : "+this.position.to_string(),
                "velocity x : "+this.velocity.x,
                "coyotie time : "+Math.round(this.coyotie_timer*1000)/1000,
                "jump buffer : "+this.bufferSystem.has("initJump")
            ]

            context.printDebugLabel(debugText);
        }
    }
}