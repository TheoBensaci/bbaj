import { Input } from "../../utils/input.js";
import { Vector } from "../../utils/vector.js";
import { Buffer } from "./bufferSystem.js";
import { BUFFER_LENGHT, GRAVITY_STRENGHT, JUMP_STENGHT, Player } from "./player.js";

// roll dash
const ROLLDASH_COULDOWN=0.15;
const ROLLDASH_TIME=0.15;
const ROLLDASH_TIME_HEAVY=0.2;
const ROLLDASH_SPEED=3;
const ROLLDASH_SPEED_HEAVY=4.5;
const ROLLDASH_CHARGE_TIME=0.5;
const ROLLDASH_CANCEL_BOOST=1.5;
const ROLLDASH_ATTACK_TIME = 0.1;
const ROLLDASH_END_VERTICAL_MUTL = 0.4;

const ROLLDASHCHARGING_MULT = 0.1;

const ROLLDASH_DOWN_BONNUS_MUL = 1.5;

const ROLLDASH_CHARGING_SLOW_STEP = 3;
const TARGET_ROLLDASH_CHARGING_SPEED = 0.4;

const ROLLDASH_BOUNCE_MIN_SPEED = 2;

export class PlayerRollDash extends Player{


    constructor(x,y){
        super(x,y);

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

        this.isRollDashing = false;
        this.isRollDashCharging = false;
        this.canRollDashBounce = false;
        this.rollDashNumber = 0;
        this.rollDashTimer = 0;
        this.rollDashCouldown = 0;
        this.rollDashChargeTime = 0;
        this.rollDashDir = new Vector(0,0);


        this.rollDashChargingStartVel=new Vector(0,0);
    }

    inputUpdate(){

        super.inputUpdate();

        if(Input.action.pressed && this.input.releaseAction){
            this.bufferSystem.init("initRollDashCharge");
        }

        if(!Input.action.pressed && (this.bufferSystem.has("initRollDashCharge") || this.isRollDashCharging)){
            this.bufferSystem.init("initRollDash");
        }

        if(Input.action.pressed && this.input.releaseAction)this.input.releaseAction=false;
        this.input.releaseAction=(!Input.action.pressed)?true:this.input.releaseAction;
    }

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
        this.onCroutch=false;

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

        if(this.rollDashDir.x===0 && this.rollDashDir.y>0){
            this.rollDashDir.scale(ROLLDASH_DOWN_BONNUS_MUL);
        }


        const x = (Math.abs(this.velocity.x) > Math.abs(this.rollDashDir.x) && Math.sign(this.velocity.x) === Math.sign(this.rollDashDir.x))?this.velocity.x:this.rollDashDir.x;
        const y = (Math.abs(this.velocity.y) > Math.abs(this.rollDashDir.y) && Math.sign(this.velocity.y) === Math.sign(this.rollDashDir.y))?this.velocity.y:this.rollDashDir.y;

        this.rollDashChargeTime=0;

        this.rollDashTimer=ROLLDASH_TIME;


        this.isRollDashing=true;
        this.canRollDashBounce=true;

        this.velocity.set(x,y);

    }

    endRollDash(){
        this.rollDashCouldown=ROLLDASH_COULDOWN;
        this.isRollDashing=false;
        this.isRollDashCharging=false;
        if(this.velocity.y<0 && !this.onJump)this.velocity.set(this.velocity.x,this.velocity.y*ROLLDASH_END_VERTICAL_MUTL);
    }

    intiRollDashCharge(){
        if(this.isRollDashCharging|| this.rollDashCouldown>0)return;
        this.isRollDashCharging=true;
        this.onCroutch=false;
        this.rollDashChargingStartVel.set(this.velocity);
    }


    canRegainDash(){
        return !(this.isRollDashing && this.rollDashTimer>ROLLDASH_ATTACK_TIME * 0.85) && !this.isRollDashCharging && this.onGround && !this.onJump;
    }



    rollDashUpdate(t){

        if(this.rollDashNumber===0 && this.canRegainDash()){
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


            if(!this.canRollDashBounce || this.rollDashTimer<=0){
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

    execRollBounce(){
        const collide = this.moveAndCollide(this.velocity);

        const colVec = collide.colVec.normalize();

        const dot = Vector.normalize(this.velocity).dot(collide.colVec.normalize());
        if(0.9<=dot){
            this.canRollDashBounce=false;
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
        return false;
    }

    rollDashBounceUpdate(){

        this.canRollDashBounce=this.velocity.magnetude()>=ROLLDASH_BOUNCE_MIN_SPEED;

        if(!this.canRollDashBounce)return;

        const collide = this.moveAndCollide(this.velocity);

        const colVec = collide.colVec.normalize();


        const dot = Vector.normalize(this.velocity).dot(collide.colVec.normalize());
        if(0.9<=dot){
            this.canRollDashBounce=false;
            return true;
        }
        else if(dot!==0){
            colVec.rotate(Math.PI/2);
            if(colVec.dot(this.velocity)<0){
                colVec.rotate(Math.PI);
            }
            colVec.scale(this.velocity.magnetude());
            this.velocity.set(colVec);
        }
        return false;

    }

    canJump(){
        return !this.isRollDashCharging && super.canJump();
    }

    initJump(vel_y,t){
        if(this.canRollDashBounce){
            this.canRollDashBounce=false;
            this.velocity.x=this.getTargetFacingDir(true) * (Math.abs(this.velocity.x)+ROLLDASH_CANCEL_BOOST);
            if(this.rollDashNumber===0 && this.canRegainDash()){
                this.rollDashNumber=1;
            }
            this.onCroutch=false;
        }
        return super.initJump(vel_y,t);
    }

    canCroutch(){
        return super.canCroutch() && (!this.isRollDashing && !this.isRollDashCharging);
    }

    canMove(){
        return (!this.isRollDashing && !this.isRollDashCharging) && super.canMove();
    }

    getMovmentFactor(){
        let m = super.getMovmentFactor();
        if(this.isRollDashCharging){
            m*=(this.onGround)?ROLLDASHCHARGING_MULT:0;
        }
        return m;
    }

    movementUpdate(vel_x,t){
        if(this.isRollDashing)return vel_x;
        return super.movementUpdate(vel_x,t);
    }

    gravitUpdate(vel_y,t){

        return super.gravitUpdate(vel_y,t);
        if(this.isRollDashCharging){
            return vel_y + GRAVITY_STRENGHT * 0.5 * t;
        }

        // if action, no gravity
        if(this.isRollDashing && this.rollDashTimer>=0) {
            // ...
            return vel_y;
        }
    }

    moveWithVelCollision(velocity,minDot){
        if(this.canRollDashBounce)return true;
        return super.moveWithVelCollision(velocity,minDot);
    }


    moveX(vel,t){
        return super.moveX(vel,t);
        if(this.isRollDashCharging){
            const m = this.rollDashChargingStartVel.x===0?0:(vel_x/this.rollDashChargingStartVel.x);
            vel_x = MathUtils.lerp(vel_x,Math.sign(vel_x)*TARGET_ROLLDASH_CHARGING_SPEED,t*ROLLDASH_CHARGING_SLOW_STEP * m);
        }
        else {
            vel_x=this.movementUpdate(vel_x,t);
        }
    }

    moveY(vel,t){
        return super.moveY(vel,t);
        if(this.isRollDashCharging){
            const m = this.rollDashChargingStartVel.y===0?0:(vel_y/this.rollDashChargingStartVel.y);
            vel_y=MathUtils.lerp(vel_y,Math.sign(vel_y)*TARGET_ROLLDASH_CHARGING_SPEED,t*ROLLDASH_CHARGING_SLOW_STEP * m);
            //vel_y = MathUtils.approche(vel_y,0,t*ROLLDASH_CHARGING_SLOW_STEP * m);
        }
    }

    update(t){
        super.update(t);
        this.rollDashUpdate(t);
        if(this.canRollDashBounce)this.rollDashBounceUpdate();
    }

    render(x,y,context,t){
        // TODO : HMMMMM
        if(this.isOnRollDashState() || this.canRollDashBounce){
            let color = "#ff0099";
            if(this.isRollDashCharging){

                color=(this.rollDashChargeTime>ROLLDASH_CHARGE_TIME)?"#ffff55":"#00ff99";
            }

            if(this.isRollDashing){
                color = "#0000ff";
            }
            context.debugContextRenderShape(this.getCollider(),color,false);

            this.renderDebug(x,y,context,t);
            return;
        }

        super.render(x,y,context,t);
    }

    getDebugText(){
        return [...super.getDebugText(),
            "can move : "+this.canMove(),
            "can jump : "+this.canJump(),
            "Is Roll dashing : " +this.isRollDashing,
            "Velocit y : "+this.velocity.y
        ]
    }
}