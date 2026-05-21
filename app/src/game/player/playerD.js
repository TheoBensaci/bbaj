/**
 * @ Autheur: Theo Bensaci
 * @ Date: 00:15 21.05.2026
 * @ Description: Player test (the "D" stand for i Dont know)
 */

import { Input } from "../../utils/input.js";
import { Buffer } from "./bufferSystem.js";
import { BUFFER_LENGTH, Player } from "./player.js";

const ROLL_LENGTH = 0.15;
const ROLL_ATTACK_LENGTH = 0.05;
const ROLL_ATTACK_END_TIME = ROLL_LENGTH-ROLL_ATTACK_LENGTH ;
const ROLL_ATTACK_SPEED = 500;
const ROLL_ATTACK_END_SPEED = 500;
const ROLL_ATTACK_VERTICAL_END_SPEED = 100;
const ROLL_FRICTION = 1;




export class PlayerD extends Player{

    constructor(){
        super();
        this.bufferSystem.register("initRoll",new Buffer(
            ()=>{
                return this.canRoll;
            },
            BUFFER_LENGTH
        ));

        /*
        this.bufferSystem.register("initRollDash",new Buffer(
            ()=>{
                return this.canRollDash() && this.isRollDashCharging;
            },
            BUFFER_LENGTH
        ));*/


        // roll
        this.canRoll=true;
        this.rollTimer=0;
        this.rollDir=1;

        this.onRoll=false;
        this.onRollAttack=false;
    }

    inputUpdate(){

        super.inputUpdate();

        if(Input.action.pressed && this.input.releaseAction){
            this.bufferSystem.init("initRoll");
            console.log("start roll");
        }

        if(Input.action.pressed && this.input.releaseAction)this.input.releaseAction=false;
        this.input.releaseAction=(!Input.action.pressed)?true:this.input.releaseAction;
    }

    // roll


    initRoll(vel_x,t){
        this.rollTimer=ROLL_LENGTH;
        this.velocity.y=0;
        this.rollDir=this.getTargetFacingDir(true);
        this.onRoll=true;
        this.onRollAttack=true;
        return ROLL_ATTACK_SPEED * this.rollDir;
    }

    endRoll(vel_x,t){
        this.rollTimer=0;
        this.onRoll=false;
        this.onRollAttack=false;
        return vel_x;
    }


    rollUpdate(vel_x,t){

        if(this.bufferSystem.consume("initRoll")){
            return this.initRoll(vel_x,t);
        }

        if(this.onRoll){
            if(this.rollTimer>0){
                this.rollTimer-=t;
            }
            else{
                return this.endRoll(vel_x,t);
            }

            if(this.onRollAttack && this.rollTimer<=ROLL_ATTACK_END_TIME){
                this.onRollAttack=false;
                if(!this.onGround)this.velocity.y=-ROLL_ATTACK_VERTICAL_END_SPEED;
                return this.rollDir*ROLL_ATTACK_END_SPEED;
            }
        }

        return vel_x;
    }


    canWalk(){
        return !this.onRollAttack && super.canWalk();
    }


    gravitUpdate(vel_y,t){
        if(this.onRollAttack){
            return vel_y;
        }
        return super.gravitUpdate(vel_y,t);
    }

    getMovmentFactor(){
        if(this.onRoll)return super.getMovmentFactor() * ROLL_FRICTION;
        return super.getMovmentFactor();
    }

    moveX(vel,t){
        let vel_x = this.rollUpdate(vel,t);
        return super.moveX(vel_x,t);
    }

    render(x,y,context,t){
        // TODO : HMMMMM
        if(this.onRoll){
            let color = "#ff0099";
            if(this.onRollAttack){

                color="#ffff55";
            }

            context.debugContextRenderShape(this.getCollider(),color,false);

            this.renderDebug(x,y,context,t);
            return;
        }

        super.render(x,y,context,t);
    }



    getDebugText(){
        return [...super.getDebugText(),
            "on roll : " + this.onRoll + " | "+this.onRollAttack,
            "roll timer : "+ this.rollTimer
        ]
    }


}