/**
 * @ Autheur: Theo Bensaci
 * @ Date: 00:15 21.05.2026
 * @ Description: Player test (the "D" stand for i Dont know)
 */

import { TILE_SIZE } from "../../constant.js";
import { Input } from "../../utils/input.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { MathUtils } from "../../utils/utils.js";
import { Vector } from "../../utils/vector.js";
import { Buffer } from "./bufferSystem.js";
import { BUFFER_LENGTH, CROUTCH_MUL, JUMP_END_COUNTER, PLAYER_COLLISION_BOX_OFFSET, PLAYER_COLLISION_BOX_SIZE, Player } from "./player.js";

const ROLL_LENGTH = 0.2;
const ROLL_ATTACK_LENGTH = 0.05;
const ROLL_ATTACK_END_TIME = ROLL_LENGTH-ROLL_ATTACK_LENGTH ;
const ROLL_ATTACK_SPEED = 400;
const ROLL_ATTACK_END_SPEED = 400;
const ROLL_ATTACK_VERTICAL_END_SPEED = 100;
const ROLL_FRICTION = 1;
const ROLL_COULDOWN = 0.2;

const ROLL_JUMP_ADD_SPEED=50;
const SUPER_ROLL_JUMP_ADD_SPEED=150;

const ROLL_VERTICAL_STRENGTH = 300;
const ROLL_VERTICAL_END_COUNTER = 50;
const ROLL_VERTICAL_CANCEL_BOOST = 50;
const ROLL_VERTICAL_HORIZONTAL_MOVEMENT = 150;



const WALL_JUMP_HORIZONTAL_SPEED=200;
const WALL_JUMP_VERTICAL_SPEED=300;
const WALL_JUMP_TIME=0.1;




export class PlayerD extends Player{

    constructor(){
        super();
        this.bufferSystem.register("initRoll",new Buffer(
            ()=>{
                return this.canRoll;
            },
            BUFFER_LENGTH
        ));

        // over write the buffer
        this.bufferSystem.register("initJump",new Buffer(
            ()=>{
                return this.canJump() || this.canWallJump();
            },
            BUFFER_LENGTH
        ));

        this.bufferSystem.register("endJump",new Buffer(
            ()=>{
                return this.onJump || this.onWallJump;
            },
            BUFFER_LENGTH
        ));


        // roll
        this.canRoll=true;
        this.rollTimer=0;
        this.rollCouldownTimer=0;
        this.rollDir=1;

        this.onVerticalRoll=false;

        this.onRoll=false;
        this.onRollAttack=false;

        this.canRollJump=false;

        this.onDemoRoll = false;

        // wall jump
        this.wallJump_timer=0;
        this.onWallJump=false;
        this.wallDir=0;

        this.rollJumpTriggerBox=Shape.createShape(
            ShapeType.SQUARE,
            new Vector(0,TILE_SIZE),
            new Vector(TILE_SIZE * 0.8,TILE_SIZE)
        );


        // collider and trigger
        this.dashCornerCorrection = [

        ]


        this.walkDetection = [
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(0,PLAYER_COLLISION_BOX_OFFSET[1]-PLAYER_COLLISION_BOX_SIZE[1] * 0.05),
                new Vector(TILE_SIZE/2 * 0.1,PLAYER_COLLISION_BOX_SIZE[1] * 0.5)
            )
        ];
    }

    inputUpdate(){

        if(Input.action.pressed && this.input.releaseAction){
            this.bufferSystem.init("initRoll");
        }

        if( !Input.jump.pressed && !this.input.releaseJump && this.onWallJump){
            this.bufferSystem.init("endJump");
        }

        if(Input.action.pressed && this.input.releaseAction)this.input.releaseAction=false;
        this.input.releaseAction=(!Input.action.pressed)?true:this.input.releaseAction;

        super.inputUpdate();
    }

    getCollider(position = this.position){
        if(this.onDemoRoll && this.onRoll){
            return this.croutchCollider.setOrigine(position);
        }
        return super.getCollider(position);
    }

    // roll
    initRoll(vel_x,t){
        this.canRoll=false;
        this.rollTimer=ROLL_LENGTH;

        this.onDemoRoll=Input.down.pressed;

        this.onCroutch=false;
        this.onJump=false;
        this.bufferSystem.clear("endJump");

        this.onRoll=true;
        this.onRollAttack=true;

        this.canRollJump=false;

        if(Input.up.pressed){
            this.onVerticalRoll=true;
            this.velocity.y=-ROLL_VERTICAL_STRENGTH;
            const dir = this.getTargetFacingDir(false);
            if(dir===0){
                return vel_x;
            }
            if(Math.abs(vel_x)<ROLL_VERTICAL_HORIZONTAL_MOVEMENT || Math.sign(vel_x)!==dir){
                console.log("change ");
                vel_x = ROLL_VERTICAL_HORIZONTAL_MOVEMENT*dir;
            }
            return vel_x;
        }
        else{
            this.rollDir=this.getTargetFacingDir(true);
            this.onDemoRoll=Input.down.pressed;
            this.velocity.y=0;
        }

        return ROLL_ATTACK_SPEED * this.rollDir;
    }

    endRoll(){
        this.rollTimer=0;
        this.onRoll=false;
        this.onRollAttack=false;
        this.onDemoRoll=false;
        this.onVerticalRoll=false;
        this.rollCouldownTimer=ROLL_COULDOWN;
    }

    initRollJump(vel_y){
        if(this.onVerticalRoll){
            this.endRoll();
            return vel_y - ROLL_VERTICAL_CANCEL_BOOST;
        }
        this.velocity.x = this.getTargetFacingDir(true)*(Math.max(Math.abs(this.velocity.x),ROLL_ATTACK_SPEED) + ((this.onDemoRoll)?SUPER_ROLL_JUMP_ADD_SPEED:ROLL_JUMP_ADD_SPEED));
        if(this.rollTimer<=ROLL_LENGTH / 3){
            this.canRoll=true;
        }
        const v_y = vel_y * (this.onDemoRoll?0.75:1);;
        this.endRoll();

        this.onCroutch=false;

        return v_y;
    }


    rollUpdate(vel_x,t){

        if(!this.onRoll && !this.canRoll){
            if(this.rollCouldownTimer>0){
                this.rollCouldownTimer-=t;
            }
            else{
                this.canRoll = this.onGround;
            }
        }

        if(this.bufferSystem.consume("initRoll")){
            return this.initRoll(vel_x,t);
        }

        if(this.onRoll){
            if(this.rollTimer>0){
                this.rollTimer-=t;
            }
            else{
                this.endRoll(vel_x,t);
                return vel_x;
            }

            if(this.onRollAttack && this.rollTimer<=ROLL_ATTACK_END_TIME){
                this.onRollAttack=false;
                if(this.onVerticalRoll){
                    this.velocity.y+=ROLL_VERTICAL_END_COUNTER;
                    return vel_x;
                }
                if(!this.onGround)this.velocity.y=-ROLL_ATTACK_VERTICAL_END_SPEED;
                return this.rollDir*ROLL_ATTACK_END_SPEED;
            }
        }

        return vel_x;
    }

    // wall jump

    canWallJump(){
        return !this.canJump() && this.wallDir!==0 && !this.onWallJump;
    }


    initWallJump(vel_y){
        if(this.wallDir===0)return;
        this.onWallJump=true;
        this.canRoll=true;
        this.wallJump_timer=WALL_JUMP_TIME;
        this.velocity.x=-1*this.wallDir*WALL_JUMP_HORIZONTAL_SPEED;
        return Math.min(-WALL_JUMP_VERTICAL_SPEED,vel_y);
    }

    endWallJump(vel_y){
        this.onWallJump=false;
        if(vel_y<0){
            return vel_y+(JUMP_END_COUNTER);
        }
        return vel_y;
    }

    wallJumpUpdate(vel_y,t){

        if(this.onWallJump){
            this.wallJump_timer-=t;
            if(this.bufferSystem.consume("endJump") || vel_y>=0 || this.wallJump_timer<=0){
                this.bufferSystem.clear("endJump");
                return this.endWallJump(vel_y);
            }
        }
        else if(this.canWallJump() && this.bufferSystem.consume("initJump")){
            return this.initWallJump(vel_y);
        }
        return vel_y;
    }




    canWalk(){
        return !this.onRollAttack && super.canWalk();
    }

    canCroutch(){
        return !this.onRollAttack && super.canCroutch();
    }


    canJump(){
        return (this.onRoll && this.canRollJump) || (!this.onWallJump && super.canJump());
    }


    initJump(vel_y){
        if(this.onRoll){
            return this.initRollJump(super.initJump(vel_y));
        }
        return super.initJump(vel_y);
    }


    gravitUpdate(vel_y,t){
        if(this.onRollAttack || this.onWallJump){
            return vel_y;
        }

        if(vel_y>0 && this.wallDir!==0 && this.wallDir===this.getTargetFacingDir()){
            this.canRoll=true;
            return MathUtils.approche(vel_y,3,t * 900);
        }

        return super.gravitUpdate(vel_y,t);
    }

    getMovmentFactor(){
        if(this.onRoll){
            let f = super.getMovmentFactor();
            if(this.onCroutch && this.getTargetFacingDir()!==0)f/=CROUTCH_MUL;
            return f * ROLL_FRICTION;
        }

        return super.getMovmentFactor();
    }

    /**
     * Check environment
     */
    environmentDetection(tiles){
        super.environmentDetection(tiles);
        // check ground
        let wallTile = this.projectTrigger(
            this.walkDetection[0].setOrigine(this.position.clone().add(PLAYER_COLLISION_BOX_SIZE[0]/2,0)),
            tiles
        );
        this.wallDir=(wallTile.length>0)?1:0;

        if(this.wallDir===0){
            wallTile = this.projectTrigger(
                this.walkDetection[0].setOrigine(this.position.clone().sub(PLAYER_COLLISION_BOX_SIZE[0]/2,0)),
                tiles
            );
            this.wallDir=(wallTile.length>0)?-1:0;
        }


        if(this.wallDir!==0){
            for (const tile of wallTile) {
                if(this.setBufferRidingTile(tile)){
                    console.log(tile);
                    break;
                }
            }
        }

        // get extention box to made the (super) rolldash simpler from air
        if(this.onRoll && (!this.onGround && this.coyotie_timer<=0)){
            const rollJump = this.projectTrigger(
                this.rollJumpTriggerBox.setOrigine(this.position),
                this.game.getSuroundTiles(this.position.x,this.position.y,3)
            );
            this.canRollJump=rollJump.length>0;
        }
        else{
            this.canRollJump=false;
        }

        /*
        // check for ridding
        if(this.onGround){
            for (const tile of groundTile) {

                if(this.setBufferRidingTile(tile))break;
            }
        }*/
    }

    moveX(vel_x,t){
        vel_x = this.rollUpdate(vel_x,t);
        if((!this.onVerticalRoll && this.onRollAttack) || this.onWallJump){
            return vel_x;
        }

        vel_x = super.moveX(vel_x,t);
        return vel_x;
    }

    moveY(vel_y,t){
        vel_y = this.wallJumpUpdate(vel_y,t);

        vel_y = super.moveY(vel_y,t);

        return vel_y;
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
            "roll timer : "+ this.rollTimer,
            "croutch : "+this.onCroutch,
            "Can roll dash jump : " + (this.onRoll && this.canRollJump)
        ]
    }

    renderDebug(x,y,context,t){

        if(false){
            const orgine=this.getCollider().getCenter().add(0,-this.getCollider().scale.y/2 - 1);
            context.debugContextRenderShape(this.walkDetection[0].setOrigine(Vector.add(this.position,new Vector(PLAYER_COLLISION_BOX_SIZE[0]/2,0))),"#ff005555",false);
            context.debugContextRenderShape(this.walkDetection[0].setOrigine(this.position.clone().sub(PLAYER_COLLISION_BOX_SIZE[0]/2,0)),"#ff005555",false);
        }
        super.renderDebug(x,y,context,t);
    }


}