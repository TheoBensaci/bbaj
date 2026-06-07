import { CAMERA_DEAD_ZONE, CAMERA_SPEED, RENDER_RESOLUTION, TILE_SIZE, WORLD_LIMIT } from "../constant.js";
import { Director } from "../director.js";
import { InputManager } from "../utils/inputManager.js";
import { Shape, ShapeType } from "../utils/shape.js";
import { MathUtils } from "../utils/utils.js";
import { Vector } from "../utils/vector.js";
import { World } from "../world.js";
import { PlayerD } from "./player/playerD.js";
import { TileIndex } from "./tileSystem/tileIndexer.js";
import { CONTACT_TILE_MASK_MAP } from "./tileSystem/tileUtils.js";

function cameraStepFunction(distance, mult, t) {
    const d = Math.abs(distance);
    let m = 1;
    if (d >= m) {
        m = d;
    }

    return t * mult * m;
}

export class Game extends World {
    constructor() {
        super();
        this.lastTime = new Date();
        this.t = 0;

        this.level = [];

        // list of tile which is concidarate
        this.activeTile = {};

        /*
            Continue collision tile are tile who need special attention for collision, for exemple :
            the tile could move like a moving platforme, in that case, we can no longer use the classic check surround tile
            and we need to check this tile any way. To prevent none sence, we use AABB in the Broad-Phase Collision

            id of the map are create with the x and y cordonate of the orinal tile
        */
        this.advanceCollisionTile = {};

        this.tileState = {};

        // list of tile position use to know which tile need to be reset on respawn
        this.toResetTile = {};

        this.player=null;
        this.playerSpawnPoint=new Vector(0,0);

        this.ghosts=new Map();

        // ending and checkPoint
        this.checkpoints = [];
        this.nValidatedCheck=0;
        this.originalSpawnPoint=null;

        this.levelTimer=0;
        this.levelDeath=0;
        this.levelState = 0;    // 0 = none, 1 = start, 2 = end


        this.cameraTarget=new Vector(0,0);
        this.cameraOffset=new Vector(0,0);
        this.cameraForceTarget=null;

        this.cameraTarget = new Vector(0, 0);
        this.cameraOffset = new Vector(0, 0);
        this.cameraForceTarget = null;

        this.pause = false;
    }

    //#region ============== TILE GESTION ==============

    getTile(x, y) {
        if (y < 0 || !this.level[y] || x < 0 || x >= this.level[y].length) return null;
        if (this.level[y][x] === undefined) return null;
        return this.level[y][x];
    }

    getSuroundTiles(x,y,radius=1){
        const buffer=super.getSuroundTiles(x,y,radius);

        const gridPosX = Math.floor(x / TILE_SIZE);
        const gridPosY = Math.floor(y / TILE_SIZE);

        const point = Vector.temp(x-radius * TILE_SIZE, y - radius*TILE_SIZE);
        const boudingBox = [point.clone(),point.add(2*radius * TILE_SIZE,2*radius * TILE_SIZE)];

        // add active tile
        this.foreachSpecialTile((tile, x, y) => {
            if (
                gridPosX - radius < x &&
                gridPosX + radius > x &&
                gridPosY - radius < y &&
                gridPosY + radius > y
            ) return;

            if (Shape.AABB(tile.getBoundingBox(), boudingBox)) {
                buffer.push(tile);
            }
        }, this.advanceCollisionTile);

        return buffer;
    }

    foreachTile(fnc) {
        for (const i of this.level) {
            for (const tile of i) {
                if (tile === null || tile === undefined) continue;
                fnc(tile);
            }
        }
    }

    foreachSpecialTile(fnc, specialTiles) {
        for (const key in specialTiles) {
            if (Object.hasOwnProperty.call(specialTiles, key)) {
                const element = specialTiles[key];
                const tile = this.getTile(element.x, element.y);
                if (tile === null) continue;
                fnc(tile, element.x, element.y);
            }
        }
    }

    clearLevel() {
        this.level = [];
        this.player = null;
    }

    generateLevel(levelContructData, callback = ()=>{}) {
        const buffer = [];
        for (let y = 0; y < levelContructData.length; y++) {
            const b = [];
            for (let x = 0; x < levelContructData[y].length; x++) {
                const data = levelContructData[y][x];
                if (data.length === 0) {
                    b.push(null);
                } else {
                    b.push(TileIndex.createTile(data[0],data[1],data[2]).setOriginePosition(this.getTilePos(x,y)));
                }
            }
            buffer.push(b);
        }
        this.level = buffer;

        this.checkpoints=[];
        this.originalSpawnPoint={position:new Vector(0,0)};
        this.activeTile = {};
        this.advanceCollisionTile = {};

        // post process
        this.foreachTile((tile) => {
            tile.postCreate(this);
        });

        callback();

        this.createPlayer();
        this.cleanSpawnPlayer();
    }

    getTilePos(x, y) {
        return new Vector(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2
        );
    }

    getTileId(x, y) {
        return x + ':' + y;
    }

    updateActiveTile(t) {
        this.foreachSpecialTile((tile) => {
            tile.update(t);
        }, this.activeTile);
    }

    registerActiveTile(x, y) {
        const id = this.getTileId(x, y);
        if (this.activeTile[id] === undefined) {
            this.activeTile[id] = {
                x: x,
                y: y,
            };
        } else {
            throw new Error('tile all ready register in the active tiles');
        }
    }

    unregisterActiveTile(x, y) {
        const id = this.getTileId(x, y);
        if (this.activeTile[id] !== undefined) {
            delete this.activeTile[id];
        }
    }

    registerAdvanceCollisionTile(x, y) {
        const id = this.getTileId(x, y);
        if (this.advanceCollisionTile[id] === undefined) {
            this.advanceCollisionTile[id] = {
                x: x,
                y: y,
            };
        } else {
            throw new Error('tile all ready register in the continue collision tiles');
        }
    }
    unregisterAdvanceCollisionTile(x, y) {
        const id = this.getTileId(x, y);
        if (this.advanceCollisionTile[id] !== undefined) {
            delete this.advanceCollisionTile[id];
        }
    }

    /**
     * Notify we need to reste the x, y on the next reste
     */
    notifyTileChange(x, y) {
        this.toResetTile[this.getTileId(x, y)] = {
            x: x,
            y: y,
        };
    }

    /**
     * Reste all tile change
     */
    resetTilesChange() {
        for (const key in this.toResetTile) {
            if (Object.hasOwnProperty.call(this.toResetTile, key)) {
                const el = this.toResetTile[key];
                const tile = this.getTile(el.x, el.y);
                if (tile === null) continue;
                tile.onReset();
            }
        }
        this.toResetTile = {};
    }

    //#endregion

    //#region ============== CAMERA ==============
    setCameraTarget(target) {
        this.cameraTarget = target;
    }

    setCameraOffset(offset) {
        this.cameraOffset.set(offset);
    }

    //#endregion

    //#region ============== PLAYER GESTION ==============

    createPlayer(){
        this.player=new PlayerD(0,0);
        this.player.onCreate(this);
        this.player.dead = true;
        return this.player;
    }

    destroyPlayer(){
        this.player.onDestroy(this);
        this.player = null;
    }

    spawnPlayer() {
        this.resetTilesChange();
        this.player.position.set(this.playerSpawnPoint);
        this.setCameraPosition(this.player.position);
        this.player.onSpawn();
    }

    cleanSpawnPlayer(){
        this.levelState=-1;
        this.player.dead=true;
        Director.transition(()=>{
            this.resetTilesChange();
            this.nValidatedCheck=0;

            // reset check points
            for (const iterator of this.checkpoints) {
                iterator.reset();
            }

            this.setPlayerSpawnPoint((this.originalSpawnPoint===null)?new Vector(0,0):this.originalSpawnPoint.position);
            this.spawnPlayer();
            this.levelTimer = 0;
            this.levelDeath = 0;
            this.levelState=0;
        });
    }

    setPlayerSpawnPoint(position){
        this.playerSpawnPoint.set(position);
    }

    addCheckPoint(checkPoint){
        this.checkpoints.push(checkPoint);
    }

    valideCheckPoint(position){
        this.nValidatedCheck++;
        this.setPlayerSpawnPoint(position);
        console.log(this.nValidatedCheck + "/" + this.checkpoints.length);
    }

    canFinish(){
        return this.levelState===1 && this.nValidatedCheck===this.checkpoints.length;
    }

    startLevel(){
        if(this.levelState!==0)return;
        this.levelState=1;
    }

    endLevel(){
        if(this.levelState!==1)return;
        this.levelState=2;
    }

    updateLevelState(t){
        if(this.player===null || this.levelState<0)return;
        if(this.levelState===0){
            if(Vector.sub(this.originalSpawnPoint.position,this.player.position).magnetude()>1){
                this.startLevel();
                console.log("start");
            }
            return;
        }
        if(this.levelState===1){
            this.levelTimer+=t;
        }
    }

    //#endregion

    //#region Ghost

    createGhost(id,ghost){
        this.ghosts.set(id,ghost);
    }

    destroyGhost(id){
        this.ghosts.delete(id);
    }

    getGhost(id){
        return this.ghosts.get(id);
    }

    forEachGhost(fnc){
        for (const iterator of this.ghosts) {
            fnc(iterator[1]);
        }
    }

    clearGhost(){
        this.ghosts.clear();
    }


    //#endregion

    deltaTime() {
        return this.t;
    }

    step() {
        if (this.pause || this.levelState===2) {
            this.t = 0;
            this.lastTime = new Date();
            return;
        }

        const newDate = new Date();
        this.t = (newDate.getTime() - this.lastTime.getTime()) / 1000;

        // tile update
        this.updateActiveTile(this.t);

        // player update
        if (this.player) {
            // update player
            this.player.update(this.t);
        }

        // ghost update
        this.forEachGhost((g)=>{
            g.update(this.t);
        });

        // level state update
        this.updateLevelState(this.t);

        // update camera pos
        const targetPos = (this.cameraForceTarget !== null ? this.cameraForceTarget : this.cameraTarget).clone();
        targetPos.add(this.cameraOffset);
        this.cameraPosition.x = MathUtils.lerp(this.cameraPosition.x, targetPos.x, this.t * CAMERA_SPEED[0]);
        this.cameraPosition.y = MathUtils.lerp(this.cameraPosition.y, targetPos.y, this.t * CAMERA_SPEED[1]);

        this.setCameraPosition(this.cameraPosition);

        this.lastTime = newDate;
    }
}
