/**
 * @ Autheur: Theo Bensaci
 * @ Date: 19:51 11.05.2026
 * @ Description: Player class
 */

import { TILE_SIZE } from '../../constant.js';
import { Director } from '../../director.js';
import { AnimationSystem } from '../../utils/animationUtils.js';
import { InputManager } from '../../utils/inputManager.js';
import { RessourceLoader } from '../../utils/ressouceLoader.js';
import { Shape, ShapeType } from '../../utils/shape.js';
import { MathUtils } from '../../utils/utils.js';
import { Vector } from '../../utils/vector.js';
import { Actor } from '../actor.js';
import { MovingPlatform } from '../tile/level/movingPlatform.js';
import { MovingTile } from '../tileSystem/tile.js';
import { Buffer, BufferSystem } from './bufferSystem.js';

// settings

// buffer
export const BUFFER_LENGTH = 0.15;                          // Buffer time lenght in sec
export const COYOTIE_TIME_LENGTH = 0.1;                     // coyotie time time lenght in sec

const VERTICAL_CORNER_CORRECTION_SIZE = TILE_SIZE / 3;      // Vertical corner correction size


export const PLAYER_COLLISION_BOX_SIZE = [TILE_SIZE * 0.8, TILE_SIZE * 0.9];
export const PLAYER_COLLISION_BOX_OFFSET = [0, TILE_SIZE * (1 - PLAYER_COLLISION_BOX_SIZE[1] / TILE_SIZE) * 0.5];


// physic step
export const COLLISION_STEP_MAGNETUDE = 1;                  // magnetude min use for the displacement vector for collision checking/resolution

export const SLOP_DOT_PRODUCT = 0.6;
export const GROUND_DOT_PRODUCT = 0.99;

// physic settings
export const MAX_DOWN_SPEED = 700;                          // max downward speed the player can achive
export const GRAVITY_STRENGHT = 1000;                       // gravity strength

export const MAX_FAST_FALL_DOWN_SPEED = 1000;               // max downward speed the player can achive when fast falling
export const GRAVITY_FAST_FALL_STRENGHT = 1500;             // gravity strength when fast falling

// walk speed
export const WALK_SPEED = 200;                              // walk speed of the player
export const WALK_ACC = 1500;                               // how quickly the player reatch a desire speed
export const COUNTER_WALK_MUL = 2;                          // counter walk multiplicator, help changing direction quickly
export const WALK_DEC = 600;                                // how quickly the player goses back to the target speed if he's faster

export const JUMP_STRENGTH = 250;                           // jump vertical strength
export const JUMP_MAX_LENGHT = 0.2;                         // jump max time length
export const JUMP_MIN_LENGHT = 0.02;                        // jump min time length
export const AIR_MUL = 0.7;                                 // air multiplyer, use to reduce air controlle for example
export const JUMP_END_COUNTER = 50;                         // amount of which the vertical speed of the player will be multipl when ending a jump
export const JUMP_MIN_END_COUNTER = 100;

export const CROUTCH_MUL = 1.5;                             // croutch friction multiplyer
export const CROUTCH_MOVE_PENALITY = 0.5;                   // croutch movement penality multiplyer

const RESPAWN_TIME = 0.6;


const RIDING_MOMENTUM_CONSERVATION_TIME = 0.1;              // time in which the player can use the riding moment conservation

// camera
const CAMERA_LOOK_AHEAD_STRENGTH = 100;                     // camera look ahead strength
const CAMEAR_LOOK_AHEAD_SPEED = 2;                          // camera speed to reatch to lock ahead
const CAMEAR_LOOK_AHEAD_TIMER = 0.5;                        // how long the player need to go in one direction to have the look ahead camear effect in the direction

const DEFAULT_RIDE_VELOCITY = new Vector(0,0);

const debug = {
    debugInfo: false,
    debugCollision: false,
};

export class Player extends Actor {
    constructor() {
        super();

        // if true, no update are skiped and only the velocity will be apply
        this.dummie = false;

        this.dead = false; // if the player dead {skull emoji}
        this.deathTimer = 0;
        this.waitForRespawn = false;

        this.game = null; // game instance

        this.velocity = new Vector(0, 0); // velocity of the player

        this.bufferRidingTile = null;

        this.rideTile = null; // tile rided by the player

        this.ridePositionBuffer = new Vector(0, 0); // last tile rided position

        // list of tile needed to be triggered during the last update (clear with each update)
        // need to be object (or a map) to prevent tiles to be trigger multiple time
        this.tileTriggerd = {};

        // input
        this.input = {
            releaseJump: true,
            releaseAction: true,
        };

        // buffer
        this.bufferSystem = new BufferSystem();
        // inti buffer system
        this.bufferSystem.register('initJump', new Buffer(
            () => {
                return this.canJump();
            },
            BUFFER_LENGTH
        ));

        this.bufferSystem.register('endJump',new Buffer(
            () => {
                return this.onJump;
            },
            BUFFER_LENGTH
        ));

        // use for riding momentum concervation
        this.ridingMomentumConcervation=new Vector(0,0);
        this.ridingMomentumConcervationTimer = 0;

        // state
        this.facing = 1; // where the player is facing

        // collision
        this.collider = Shape.createShape(
            ShapeType.SQUARE,
            new Vector(PLAYER_COLLISION_BOX_OFFSET[0], PLAYER_COLLISION_BOX_OFFSET[1]),
            new Vector(PLAYER_COLLISION_BOX_SIZE[0], PLAYER_COLLISION_BOX_SIZE[1])
        );

        // collider when croutched
        this.croutchCollider = Shape.createShape(
            ShapeType.SQUARE,
            new Vector(PLAYER_COLLISION_BOX_OFFSET[0], PLAYER_COLLISION_BOX_OFFSET[1] + PLAYER_COLLISION_BOX_SIZE[1] / 4),
            new Vector(PLAYER_COLLISION_BOX_SIZE[0], PLAYER_COLLISION_BOX_SIZE[1] / 2)
        );

        // trigger use to check if grounded
        this.groundTriggerBox = Shape.createShape(
            ShapeType.SQUARE,
            new Vector(PLAYER_COLLISION_BOX_OFFSET[0], PLAYER_COLLISION_BOX_OFFSET[1] + PLAYER_COLLISION_BOX_SIZE[1]/2 + 0.5),
            new Vector(TILE_SIZE * 0.8 - 1, 1)
        );

        // trigger use to check for corner correction
        this.jumpCorrectionBox = [
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(-PLAYER_COLLISION_BOX_SIZE[0] / 2 + VERTICAL_CORNER_CORRECTION_SIZE / 2, 0),
                new Vector(VERTICAL_CORNER_CORRECTION_SIZE, 2)
            ),
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(+PLAYER_COLLISION_BOX_SIZE[0] / 2 - VERTICAL_CORNER_CORRECTION_SIZE / 2,0),
                new Vector(VERTICAL_CORNER_CORRECTION_SIZE, 2)
            ),
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(0, 0),
                new Vector(PLAYER_COLLISION_BOX_SIZE[0] - 2 * VERTICAL_CORNER_CORRECTION_SIZE, 2)
            ),

            /*
                this box is use to resolve the corner correction
                But we got a problem, raycast are kind of broke (for now, i'm just lazy)
                so i use a secret technic call : "make a big box", since during collsion computation
                we do check from base on distance between player and the tile, we can juste make a big box to resolve the corner correction
            */
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(0, -PLAYER_COLLISION_BOX_SIZE[1] / 2),
                new Vector(PLAYER_COLLISION_BOX_SIZE[0], 0.5)
            ),
        ];

        // physic
        this.onGround = false;

        // horizontal movement
        this.friction = 1;
        this.walkSpeed = WALK_SPEED;
        this.walkAcc = WALK_ACC; // walk acceleration
        this.walkDec = WALK_DEC; // walk decelaration

        // movement
        this.onMove = false;

        // jump
        this.onJump = false;
        this.jumpTimer = 0;
        this.coyotieTimer = 0;
        this.minJump = false;

        // croutch
        this.onCroutch = false;

        // camera
        this.cameraOffsetX = 0;
        this.cameraHeadDir = 1;
        this.cameraHeadTimer = CAMEAR_LOOK_AHEAD_TIMER;

        // if free camera is activated
        this.onFreeCam = false;
        this.freeCamOffset = new Vector(0, 0);

        // animation

        this.animSystem=new AnimationSystem({
            scale : new Vector(1,1),
            offset: new Vector(0,0),
            skich : 0,
            rotation:0,
            spritePath:""
        });

        this.animSystem.addState("idle",(t)=>{
            const c = (t * Math.PI*2);

            const v = (Math.abs(Math.cos(c)) - 0.5) * 0.15;
            const sY = 1 - v;
            const oY = v * 10;

            return {
                scale : new Vector(1,sY),
                offset: new Vector(0,oY),
                skich : 0,
                rotation:0,
                spritePath:"./ressource/testPlayer.png"
            };
        },4,0.05,true);

        this.animSystem.addState("walk",(t)=>{
            const c = (t * Math.PI*2);

            const v = (Math.abs(Math.cos(c)) - 0.5) * 0.2;
            const sY = 1 - v;
            const oY = v * 10;

            return {
                scale : new Vector(1,sY),
                offset: new Vector(0,oY),
                skich : MathUtils.clamp(this.velocity.x / 100, -1, 1) * 0.2,
                rotation:0,
                spritePath:"./ressource/testPlayer.png"
            };
        },0.4,0.1,true);

        this.animSystem.addState("croutch",(t)=>{
            const v = 0.455;
            const x = 1+v;
            const y = 1-v;
            const oY = TILE_SIZE * v * 0.5;
            return {
                scale : new Vector(x,y),
                offset: new Vector(0,oY),
                skich : 0,
                rotation:0,
                spritePath:"./ressource/testPlayer.png"
            };
        },1,0.05,false);

        this.animSystem.addState("jump",(t)=>{
            const v = 0.6 * (1-t);
            const x = 1-v;
            const y = 1+v;
            return {
                scale : new Vector(x,y),
                offset: new Vector(0,0),
                skich : 0,
                rotation:0,
                spritePath:"./ressource/testPlayer.png"
            };
        },0.3,0,false);

        this.animSystem.addState("air",(t)=>{
            const v = 0.5 * Math.min(1, Math.abs(this.velocity.y / 1000));
            const x = 1-v;
            const y = 1+v;
            return {
                scale : new Vector(x,y),
                offset: new Vector(0,0),
                skich : 0,
                rotation:0,
                spritePath:"./ressource/testPlayer.png"
            };
        },0,0.2,false);

        this.animSystem.addState("dead",(t)=>{
            const v = MathUtils.lerp(2,1,t);
            const x = v;
            const y = v;
            return {
                scale : new Vector(x,y),
                offset: new Vector(this.facing * 16*x * 0.5,16 * y * 0.5),
                skich : Math.sin((v*3)-3),
                rotation:0,
                spritePath:"./ressource/testPlayerDead.png"
            };
        },0.1,0,false);


        this.animSystem.setTransitionTime("croutch","air",0.05);


        this.walkAnimation = {
            dis: 0,
            c: 0,
        };

        this.airAnimation = {
            skich: 0.5,
        };

        this.croutchAnimation = {
            skich: 0.5,
        };
    }

    //#region ============== INPUT ==============

    /**
     * Update input reconition
     */
    inputUpdate() {
        if (InputManager.getAction('jump').justPressed) {
            this.bufferSystem.init('initJump');
        }
        if (InputManager.getAction('jump').justReleased
                && (this.bufferSystem.has('initJump') || this.onJump)) {
            this.bufferSystem.init('endJump');
        }

        if(InputManager.getAction("respawn").justPressed && !this.dead){
            this.death();
        }
    }

    //#endregion

    //#region ============== COLLISION ==============

    /**
     * Get the collider of the player
     * @param {Vector} position position of the player
     * @returns {Shape}
     */
    getCollider(position = this.position) {
        return (this.onCroutch ? this.croutchCollider : this.collider).setOrigine(position);
    }

    /**
     * Compute collision of the player for a specific position
     * @param {Vector} position position
     * @returns {object} {position : position after resolution, colVec : normal vector of the collider we collide with};
     */
    computeCollision(position) {
        let colVec = new Vector(0, 0);
        const tiles = this.game.getSuroundTiles(position.x, position.y, 2);

        // sort tiles by distance
        tiles.sort((a, b) => {
            if (a === null && b !== null) {
                return 1;
            }
            if (a !== null && b === null) {
                return -1;
            }
            if (a === null && b === null) {
                return 0;
            }
            return Vector.sub(a.position, position).sqrtMagnetude() - Vector.sub(b.position, position).sqrtMagnetude();
        });

        for (const tile of tiles) {
            if (tile === null) continue;

            if (!tile.canCollide(this)) continue;

            const collider = tile.getCollider();
            for (let index = 0; index < collider.length; index++) {
                const shape = collider[index];

                // we use getcollider here cause i'm a dumb ass lmao
                const collide = Shape.collide(this.getCollider(), shape);
                if (collide === null) continue;

                // if the collide shape is a trigger
                if (shape.trigger) {
                    // map the trigger into the tileTriggerd, if the shape is all ready in, skip
                    const tileName = tile.position.x + ':' + tile.position.y + ':' + index;
                    if (this.tileTriggerd[tileName] === undefined) {
                        this.tileTriggerd[tileName] = {
                            shape: shape,
                            ended: false,
                        };
                        continue;
                    }
                    if (this.tileTriggerd[tileName].ended) {
                        this.tileTriggerd[tileName].ended = false;
                    }
                } else {
                    colVec.add(collide);
                    position.sub(collide);
                }
            }
        }

        return {
            position: position,
            colVec: colVec,
        };
    }

    /**
     * Move the play with the velocity set and made it collide with things
     * @param {Number} vel
     */
    moveAndCollide(vel) {
        let collideResult = {
            position: this.position,
            colVec: new Vector(0, 0),
        };
        const velMagnetude = vel.magnetude();

        // we use max since it's possible to go slower then a velocity step and we still need to move in that case
        const nStep = Math.max(1, Math.round(velMagnetude / COLLISION_STEP_MAGNETUDE));

        const stepVel = Vector.normalize(vel).scale(velMagnetude / nStep);

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
    projectTrigger(shape, preComputeTile = []) {
        const result = [];
        const tiles = preComputeTile.length === 0
                ? this.game.getSuroundTiles(this.position.x, this.position.y, 2)
                : preComputeTile;

        for (const tile of tiles) {
            if (tile === null) continue;

            if (!tile.canCollide(this)) continue;

            const collider = tile.getCollider();

            for (const s of collider) {
                const collide = Shape.collide(shape, s, false);
                if (!collide) continue;
                if (s.trigger === undefined) {
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
    toggleFreeCam(state) {
        this.onFreeCam = state;
        this.freeCamOffset.set(0, 0);
    }

    /**
     * Update camera behavior
     * @param {number} t delta t
     */
    updateCamera(t) {
        const d = this.getTargetFacingDir();

        if (this.cameraHeadTimer >= 0) {
            this.cameraOffsetX = MathUtils.approcheNoneLinear(this.cameraOffsetX, this.cameraHeadDir,
                (distance) => {
                    let m = 0.2;
                    const d = Math.abs(distance);
                    if (d > m) {
                        m = d;
                    }

                    return t * CAMEAR_LOOK_AHEAD_SPEED * m;
                }
            );
        }

        if (d !== 0 && Math.sign(d) !== Math.sign(this.cameraHeadDir)) {
            if (this.cameraHeadTimer >= 0) {
                this.cameraHeadTimer -= t;
            } else {
                this.cameraHeadTimer = CAMEAR_LOOK_AHEAD_TIMER;
                this.cameraHeadDir = d;
            }
        } else if (d !== 0) {
            this.cameraHeadTimer = CAMEAR_LOOK_AHEAD_TIMER;
        }

        this.game.setCameraOffset(new Vector(this.cameraOffsetX * CAMERA_LOOK_AHEAD_STRENGTH, 0));
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
    canJump() {
        return this.onGround || this.coyotieTimer > 0;
    }

    /**
     * Start a jump
     * @param {number} velY actual velocity y
     * @returns {number} new velocty y
     */
    initJump(velY) {
        this.onJump = true;
        this.jumpTimer = JUMP_MAX_LENGHT;
        this.airAnimation.skich = 0.5;
        this.coyotieTimer = -1;
        this.minJump = false;

        return -JUMP_STRENGTH;
    }

    /**
     * end a jump
     * @param {number} velY actual velocity y
     * @returns {number} new velocty y
     */
    endJump(velY) {
        if (this.jumpTimer > JUMP_MAX_LENGHT - JUMP_MIN_LENGHT) {
            this.jumpTimer = JUMP_MIN_LENGHT;
            this.minJump = true;
            return velY;
        }
        this.onJump = false;
        if (velY < 0) {
            return velY + (this.minJump ? JUMP_MIN_END_COUNTER : JUMP_END_COUNTER);
        }

        return velY;
    }

    /**
     * Jump update
     * @param {number} velY actual velocity y
     * @param {number} t delta t
     * @returns {number} new velocity y
     */
    jumpUpdate(velY, t) {
        if (this.onGround) {
            this.coyotieTimer = COYOTIE_TIME_LENGTH;
        } else if (this.coyotieTimer > 0) {
            this.coyotieTimer -= t;
        }

        if (this.onJump) {
            this.jumpTimer -= t;
            if (this.bufferSystem.consume('endJump') || velY >= 0 || this.jumpTimer <= 0) {
                this.bufferSystem.clear('endJump');
                return this.endJump(velY);
            }
        } else if (this.canJump() && this.bufferSystem.consume('initJump')) {
            this.input.releaseJump = false;
            return this.initJump(velY);
        }

        return velY;
    }

    //#endregion

    //#endregion

    //#region ============== Update ==============

    //#region =========== Move X

    /**
     * Can the player move horizontaly
     * @returns {boolean}
     */
    canWalk() {
        return !(this.onCroutch && this.onGround);
    }

    /**
     * Get facing dir by checking the input direction
     * @param {boolean} zeroFree if true, will return the last facing dir in case no direction are pressed
     * @returns -1 or 1 (or 0 if zeroFree is false)
     */
    getTargetFacingDir(zeroFree = false) {
        let dir = 0;
        if (InputManager.getAction('right').pressed) {
            dir += 1;
        }
        if (InputManager.getAction('left').pressed) {
            dir -= 1;
        }
        if (zeroFree && dir === 0) {
            return this.facing;
        }
        return dir;
    }

    /**
     * Get the movement factor use to compute things like air controlle of accéleration
     * Basicly, if small factor = ice friction, big factor = big friction
     * @returns {number}
     */
    getMovmentFactor() {
        let mult = this.onGround ? 1 : AIR_MUL;

        mult *= this.friction;

        if (this.onCroutch) mult *= CROUTCH_MUL;

        return mult;
    }

    /**
     * Update movement
     * @param {number} velx actual velocity x
     * @param {number} t delta t
     * @returns {number} new velocity x
     */
    movementUpdate(velx, t) {
        let targetDir = this.getTargetFacingDir();

        let dir = this.canWalk() ? targetDir : 0;

        this.facing = targetDir !== 0 ? targetDir : this.facing;

        this.onMove = dir !== 0;

        if (this.onCroutch) dir *= CROUTCH_MOVE_PENALITY;

        let mult = this.getMovmentFactor();

        if (Math.abs(velx) > this.walkSpeed && Math.sign(velx) === dir) {
            mult *= this.walkDec;
        } else {
            mult *= this.walkAcc;
            if(dir !== 0 && dir !== Math.sign(velx)) {
                mult *= COUNTER_WALK_MUL;
            }
        }

        return MathUtils.approche(
            velx,
            this.getBaseVelocity().x + dir * this.walkSpeed,
            mult * t
        );
    }

    //#endregion

    //#region =========== Move Y

    /**
     * gravity update
     * @param {number} velY actual velocity y
     * @param {number} t delta t
     * @returns {number}  new velocity y
     */
    gravitUpdate(velY, t) {
        // if jump, no gravity
        if (this.onJump || this.onGround || this.coyotieTimer > 0.1) {
            return velY;
        }

        if (InputManager.getAction('down').pressed
            && !this.onGround && !this.onCroutch) {
            return MathUtils.approche(
                velY,
                MAX_FAST_FALL_DOWN_SPEED,
                GRAVITY_FAST_FALL_STRENGHT * t
            );
        }

        return MathUtils.approche(velY, MAX_DOWN_SPEED, GRAVITY_STRENGHT * t);
    }
    //#endregion

    //#endregion

    //#region ============== PHYSIC ==============

    /**
     * Get the default velocity (the zero if you want);
     * @returns
     */
    getBaseVelocity() {
        return DEFAULT_RIDE_VELOCITY;
    }

    /**
     * set a tile as a riding tile
     * @param {Tile} tile
     * @returns {boolean} if the player as started to ride a tile or is riding the same tile
     */
    setRidingTile(tile) {
        if (this.rideTile === tile) return true;
        this.rideTile = tile;
        this.ridePositionBuffer.set(this.rideTile.position);
        const targetVel = Vector.sub(tile.velocity, this.velocity);
        targetVel.x = Math.sign(targetVel.x) === Math.sign(this.velocity.x) ? targetVel.x : 0;
        targetVel.y = Math.sign(targetVel.y) === Math.sign(this.velocity.y) ? targetVel.y : 0;
        this.velocity.set(targetVel);
        return true;
    }

    setBufferRidingTile(tile) {
        if (this.rideTile === tile || tile instanceof MovingTile) {
            this.bufferRidingTile = tile;
            return true;
        }
        return false;
    }

    /**
     * end riding a tile
     */
    endRide() {
        if (this.rideTile === null) return;
        this.velocity.add(this.ridingMomentumConcervation);
        this.rideTile = null;
        this.ridePositionBuffer.set(0, 0);
        this.ridingMomentumConcervation.set(0,0);
    }

    /**
     * Update tile riding
     */
    updateRideTile(t) {
        if (this.rideTile === null) return;
        const buffer = this.rideTile.position.clone();
        buffer.sub(this.ridePositionBuffer);
        this.position.add(buffer.x, buffer.y);
        this.ridePositionBuffer.set(this.rideTile.position);

        // riding momentum conveervation check
        if((this.rideTile.velocity.x===0 && this.rideTile.velocity.y===0)){
            if(this.ridingMomentumConcervationTimer>0){
                this.ridingMomentumConcervationTimer-=t;
            }
            else if((this.ridingMomentumConcervation.x!==0 || this.ridingMomentumConcervation.y!==0)){
                this.ridingMomentumConcervation.set(0,0);
            }
        }
        else{
            this.ridingMomentumConcervation.set(this.rideTile.velocity);
            this.ridingMomentumConcervationTimer=RIDING_MOMENTUM_CONSERVATION_TIME;
        }
    }

    /**
     * Check environment
     */
    environmentDetection(tiles) {
        // check ground
        const groundTile = this.projectTrigger(
            this.groundTriggerBox.setOrigine(this.position),
            tiles
        );
        this.onGround = groundTile.length > 0;
        // check for ridding
        if (this.onGround) {
            for (const tile of groundTile) {
                if (this.setBufferRidingTile(tile)) break;
            }
        }
    }

    /**
     * Check if a vertical corner correction is need and if yes
     * correct it
     */
    checkVerticalCornerCorrection(t) {
        const tiles = this.game.getSuroundTiles(this.position.x, this.position.y, 2);

        tiles.sort((a, b) => {
            if (a === null && b !== null) {
                return 1;
            }
            if (a !== null && b === null) {
                return -1;
            }
            if (a === null && b === null) {
                return 0;
            }
            return (
                Vector.sub(a.position, this.position).sqrtMagnetude() -
                Vector.sub(b.position, this.position).sqrtMagnetude()
            );
        });

        const orgine = this.getCollider().getCenter().add(0, -this.getCollider().scale.y / 2 - 1);

        const v0 = this.projectTrigger(
            this.jumpCorrectionBox[0].setOrigine(orgine), tiles
        ).length > 0;
        const v1 = this.projectTrigger(
            this.jumpCorrectionBox[1].setOrigine(orgine), tiles
        ).length > 0;

        const v3 = this.projectTrigger(
            this.jumpCorrectionBox[2].setOrigine(orgine), tiles
        ).length > 0;

        if (v3) return false;

        for (const tile of tiles) {
            if (tile === null) continue;
            const collider = tile.getCollider();
            for (let index = 0; index < collider.length; index++) {
                const shape = collider[index];

                // we use getcollider here cause i'm a dumb ass lmao
                const collide = Shape.collide(this.jumpCorrectionBox[3].setOrigine(this.position), shape, true, [new Vector(0,1)]);
                if (collide === null) continue;

                // if the collide shape is a trigger
                if (!shape.trigger) {
                }

                if ((v1 && collide.x < 0) || (v0 && collide.x > 0)) {
                    continue;
                }

                // check if we are going in the opposite diretion of the corner correction, and if yes and we are fasster, then we inverse de collide
                // this aim to made essayer things like enter a small gaps will croutching
                if (Math.sign(collide.x) === Math.sign(this.velocity.x) && Math.abs(collide.x) > Math.abs(this.velocity.x * t)) {
                    collide.x *= -0.5;
                }
                this.position.sub(collide.set(collide.x, 0));
                return true;
            }
        }
        return false;
    }

    /**
     * Can the player croutch
     * @returns {boolean}
     */
    canCroutch() {
        return this.onGround && !this.onJump;
    }

    /**
     * Coutch update
     */
    croutchUpdate() {
        if (this.onCroutch) {
            if (!InputManager.getAction('down').pressed || this.velocity.y > 0) {
                this.onCroutch = false;
                return;
            }
        } else if (this.canCroutch() && InputManager.getAction('down').pressed) {
            this.onCroutch = true;
        }
    }

    /**
     * Move the player along the velocity vector, with it collide with something, check if the dot product is greater then the minDot
     * with this check, return true if the velocity can be keep or false if the velocity need to be cancel
     * @param {*} velocity
     * @param {*} minDot
     */
    moveWithVelCollision(velocity, minDot) {
        // check if there is a collision if we follow the velocity vector
        const collide = this.moveAndCollide(velocity);
        const dot = Vector.normalize(velocity).dot(collide.colVec.normalize());

        // compare the dot product of the collision vector and velocity vector to avoid false positive
        // due to the same logic of phantom hit in smash bros melee (check : https://www.youtube.com/watch?v=jXAmaY6EvOQ&t=418s)
        // Note : need to be that hight to avoid clip with slop
        if (minDot <= dot) {
            return false;
        }

        return true;
    }

    /**
     * Resolve the movement velocity when stopped in the X axe
     * @param {number} vel_y velocity x befor stop
     * @returns {number} new Velocity x
     */
    movementStopResolutionX(velX, t) {
        return this.getBaseVelocity().x;
    }

    /**
     * Move, compute collision and resolve the velocity along the x axis
     * @param {number} velX velocity x
     * @param {number} t delta t
     * @returns {number} new velocity x
     */
    resolveMoveX(velX, t) {
        velX = this.moveX(velX, t);
        // mindot is higher here to prevent stop agains slop
        if (!this.moveWithVelCollision(new Vector(velX * t, 0), GROUND_DOT_PRODUCT)) {
            return this.movementStopResolutionX(velX, t);
        }

        return velX;
    }

    /**
     * Compute velocity in the X axe
     * @param {number} velX velociy in the X axis
     * @param {number} t delta t
     * @returns {number} new velocity in the X axis
     */
    moveX(velX, t) {
        velX = this.movementUpdate(velX, t);
        return velX;
    }

    /**
     * Resolve the movement velocity when stopped in the y axe
     * @param {number} velY velocity y befor stop
     * @returns {number} new Velocity y
     */
    movementStopResolutionY(velY, t) {
        // check for corner correction
        if(velY>=0 || (!this.checkVerticalCornerCorrection(t))){
            return this.getBaseVelocity().y;
        }
        return velY;
    }

    /**
     * Move, compute collision and resolve the velocity along the y axis
     * @param {number} vel_x velocity y
     * @param {number} t delta t
     * @returns {number} new velocity y
     */
    resolveMoveY(velY, t) {
        velY = this.moveY(velY, t);

        if(!this.moveWithVelCollision(new Vector(0, velY * t), (velY < 0 ? GROUND_DOT_PRODUCT : SLOP_DOT_PRODUCT))){
            return this.movementStopResolutionY(velY, t);
        }
        return velY;
    }

    /**
     * Compute velocity in the Y axe
     * @param {number} velY velociy in the Y axis
     * @param {number} t delta t
     * @returns {number} new velocity in the Y axis
     */
    moveY(velY, t) {
        velY = this.gravitUpdate(velY, t);

        velY = this.jumpUpdate(velY, t);

        return velY;
    }

    //#endregion

    /**
     * When player spawn
     */
    onSpawn() {
        this.dead = false;
        this.velocity.set(0, 0);
        this.onCroutch = false;
        this.onMove = false;
        this.onJump = false;
        this.facing = 1;
        this.rideTile = null;

        this.tileTriggerd={};

        this.bufferSystem.clearAll();
    }

    death() {
        if (this.dead) return;
        this.dead = true;
        this.waitForRespawn = true;
        this.deathTimer = RESPAWN_TIME;
        this.velocity.set(0,0);

        this.game.levelDeath++;
    }

    deathUpdate(t) {
        if (this.dead && this.waitForRespawn) {
            if (this.deathTimer >= 0) {
                this.deathTimer -= t;
            } else {
                this.waitForRespawn = false;
                Director.transition(() => {
                    this.game.spawnPlayer();
                });
            }
        }
    }

    onCreate(game) {
        this.game = game;
        game.setCameraTarget(this.position);
        game.setCameraPosition(this.position);
    }

    update(t) {

        if(this.dummie){

            this.position.add(this.velocity.clone().scale(t,t));

            return;
        }

        if (this.onFreeCam) {
            let dir = new Vector(0, 0);
            const speed = 2;
            if (InputManager.getAction('right').pressed) {
                dir.x += 1;
            }
            if (InputManager.getAction('left').pressed) {
                dir.x -= 1;
            }
            if (InputManager.getAction('up').pressed) {
                dir.y -= 1;
            }
            if (InputManager.getAction('down').pressed) {
                dir.y += 1;
            }

            this.freeCamOffset.add(dir.normalize().scale(speed));
            this.game.setCameraOffset(this.freeCamOffset);
            return;
        }

        if (this.dead) {
            this.deathUpdate(t);
            return;
        }

        // riding update
        this.updateRideTile(t);

        // ground detetction
        this.environmentDetection(this.game.getSuroundTiles(this.position.x, this.position.y, 2));

        if (this.bufferRidingTile === null) {
            this.endRide();
        } else {
            this.setRidingTile(this.bufferRidingTile);
        }
        this.bufferRidingTile = null;

        this.croutchUpdate();

        // moving update
        this.velocity.x = this.resolveMoveX(this.velocity.x, t);
        this.velocity.y = this.resolveMoveY(this.velocity.y, t);

        // resolve trigger
        for (const key in this.tileTriggerd) {
            if (Object.hasOwnProperty.call(this.tileTriggerd, key)) {
                if (this.tileTriggerd[key].ended) {
                    this.tileTriggerd[key].shape.triggerEnd(this);
                    delete this.tileTriggerd[key];
                } else {
                    this.tileTriggerd[key].shape.trigger(this);
                    this.tileTriggerd[key].ended = true;
                }
            }
        }

        //this.tileTriggerd={};

        // input update
        this.inputUpdate();

        // buffer update
        this.bufferSystem.update(t);

        if (this.position.y > 200 * TILE_SIZE) {
            this.position.set(0, 0);
            this.game.setCameraPosition(this.position);
        }

        // world limit
        const maxX = this.game.worldLimit.x * TILE_SIZE;
        const maxY = this.game.worldLimit.y * TILE_SIZE;
        this.position.set(
            MathUtils.clamp(this.position.x, 0, maxX),
            MathUtils.clamp(this.position.y, 0, maxY)
        );
    }

    onDestroy(context) {
        // ...
        console.log('destroy');
    }

    //#region ============== ONLINE ==============

    getData(){
        return {
            position : this.position,
            velocity : this.velocity,
            facing : this.facing,
            dead : this.dead,
            onCroutch:this.onCroutch,
            onMove : this.onMove,
            onJump : this.onJump,
            onGround : this.onGround
        };
    }


    setData(data){
        this.position.set(data.position);
        this.velocity.set(data.velocity);
        this.facing = data.facing;
        this.dead=data.dead;
        this.onCroutch=data.onCroutch;
        this.onJump = data.onJump;
        this.onGround=data.onGround;
        this.onMove=data.onMove;
    }


    //#endregion

    renderAnimation(targetState,x,y,context,t){
        const r = RessourceLoader.getInstance();
        context.save();

        let skich = 0;

        this.animSystem.setState(targetState);
        this.animSystem.update(t);
        const value = this.animSystem.get();
        const scale=value.scale;
        const offset=value.offset;
        skich=value.skich;

        scale.x *= this.facing;

        const image = r.get(value.spritePath);

        //this.onMove

        context.transform(scale.x, 0, -skich, scale.y, x-(TILE_SIZE/2)*scale.x + offset.x, y-(TILE_SIZE/2)*scale.y + offset.y);

        context.translate(TILE_SIZE/2,TILE_SIZE/2);

        context.transform(Math.cos(value.rotation), Math.sin(value.rotation), -Math.sin(value.rotation), Math.cos(value.rotation),0, 0);

        context.translate(-TILE_SIZE/2,-TILE_SIZE/2);
        if (this.dead) {
            context.renderTexture(image, 0, 0, 16, 16, -16, -16, 32, 32);
        }
        else{
            context.renderTexture(image, 0, 0, 16, 16, 0, 0, TILE_SIZE, TILE_SIZE);
        }

        context.restore();
    }

    /**
     * Render the player
     * @param {number} x position X on screen
     * @param {number} y position Y on screen
     * @param {context2D extended} context js context 2d with additional utils function given by the Renderer
     * @param {number} t delta t between 2 render
     */
    render(x, y, context, t) {
        const r = RessourceLoader.getInstance();


        let targetState="idle";

        if (this.onMove && this.onGround) {
            targetState="walk";
        } else if (this.onGround) {
            targetState="idle";
        }

        if (this.onCroutch) {
            targetState="croutch";
        }

        if (!this.onCroutch && !this.onGround && this.onJump) {
            targetState="jump";
        } else if (!this.onCroutch && !this.onGround) {
            targetState="air";
        }

        if(this.dead){
            targetState="dead";
        }

        this.renderAnimation(targetState,x,y,context,t);

        this.renderDebug(x, y, context, t);
    }

    /**
     * Get the list of text to show in the debug text
     * @returns
     */
    getDebugText() {
        return [
            'ground : ' + this.onGround,
            'position : ' + this.position.to_string(),
            'velocity x : ' + this.velocity.x,
            'ridding : ' + (this.rideTile !== null),
        ];
    }

    /**
     * Render debugs
     * @param {*} x
     * @param {*} y
     * @param {*} context
     * @param {*} t
     */
    renderDebug(x, y, context, t) {
        // debug
        const debugContext = context.getDebugContext();
        if (debug.debugCollision) {
            const orgine = this.getCollider().getCenter().add(0, -this.getCollider().scale.y/2 - 1);
            context.debugContextRenderShape(this.getCollider(), this.onGround ? '#00ff9955' : '#ff005555', false);
            context.debugContextRenderShape(this.groundTriggerBox.setOrigine(this.position.x, this.position.y), '#ffff9955', false);
            context.debugContextRenderShape(this.jumpCorrectionBox[0].setOrigine(orgine), '#ff005555', false);
            context.debugContextRenderShape(this.jumpCorrectionBox[1].setOrigine(orgine), '#ff005555', false);
            context.debugContextRenderShape(this.jumpCorrectionBox[3].setOrigine(orgine), '#ff005555', false);

        }

        if (debug.debugInfo) {
            debugContext.fillStyle = '#000000ff';
            debugContext.font = '20px serif';

            context.printDebugLabel(this.getDebugText());
        }
    }
}
