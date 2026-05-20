import { CAMERA_DEAD_ZONE, CAMERA_SPEED, RENDER_RESOLUTION, TILE_SIZE, WORLD_LIMIT } from "../constant.js";
import { Director } from "../director.js";
import { downloadJsonFile } from "../utils/fileUtils.js";
import { Input } from "../utils/input.js";
import { Shape, ShapeType } from "../utils/shape.js";
import { MathUtils } from "../utils/utils.js";
import { Vector } from "../utils/vector.js";
import { Player } from "./player/player.js";
import { PlayerRollDash } from "./player/playerRollDash.js";
import { GroundTile } from "./tile/groundTile.js";
import { MovingPlatform } from "./tile/movingPlatform.js";
import { Tile } from "./tileSystem/tile.js";
import { TileIndex } from "./tileSystem/tileIndexer.js";
import { CONTACT_TILE_MASK_MAP } from "./tileSystem/tileUtils.js";


function cameraStepFunction(distance,mult,t){
    const d = Math.abs(distance);
    let m = 1;
    if(d>=m){
        m=d;
    }

    return t * mult * m;
}

export class Game{
    constructor(){
        this.lastTime=new Date();
        this.t=0;

        this.levelData=null;

        this.level=[];

        // list of tile which is concidarate
        this.activeTile={};

        /*
            Continue collision tile are tile who need special attention for collision, for exemple :
            the tile could move like a moving platforme, in that case, we can no longer use the classic check surround tile
            and we need to check this tile any way. To prevent none sence, we use AABB in the Broad-Phase Collision

            id of the map are create with the x and y cordonate of the orinal tile
        */
        this.advanceCollisionTile={};

        this.player=null;
        this.playerSpawnPoint=new Vector(0,0);

        this.levelLimit=new Vector(WORLD_LIMIT[0],WORLD_LIMIT[1]);

        this.cameraPosition=new Vector(0,0);
        this.cameraTarget=new Vector(0,0);
        this.cameraOffset=new Vector(0,0);
        this.cameraForceTarget=null;


        this.pause = false;
    }

    //#region ============== TILE GESTION ==============

    getTile(x,y){
        if(y<0 || (!this.level[y]) || x<0 || x>=this.level[y].length)return null;
        return this.level[y][x];
    }



    setTile(x,y,value){
        if(y<0 || (!this.level[y]) || x<0 || x>=this.level[y].length)return;
        let newRow = y>=this.level.length;
        let col = (newRow)?[]:this.level[y];
        col[x]=value;
        this.level[y]=col;
        if(value===null)return;
        value.setOriginePosition(this.getTilePos(x,y));

        // post process

        // TODO : only updat suround tile
        if(value instanceof MovingPlatform){
            value.postCreate(this);
        }
        else{
            this.foreachTile((tile)=>{
                tile.postCreate(this);
            });
        }
    }

    getSuroundTiles(x,y,boudingBox,radius=1){
        const buffer=[];
        const gridPos_x=Math.floor(x/TILE_SIZE);
        const gridPos_y=Math.floor(y/TILE_SIZE);
        buffer.push(this.getTile(gridPos_x,gridPos_y));
        for (let y = -radius; y < radius; y++) {
            for (let x = -radius; x < radius; x++) {
                buffer.push(this.getTile(gridPos_x+x,gridPos_y+y));
            }
        }

        // add active tile


        this.foreachSpecialTile((tile,x,y)=>{
            if(
                gridPos_x-radius<x && gridPos_x+radius>x
                && gridPos_y-radius<y && gridPos_y+radius>y
            )return;

            if(Shape.AABB(tile.getBoundingBox(),boudingBox)){
                buffer.push(tile);
            }
        },this.advanceCollisionTile);


        return buffer;
    }

    /**
     * compute the contact map a given tile
     * @param {*} x tile x position in the world
     * @param {*} y tile y position in the world
     * @param {*} tileClass class of tile considerate
     * @returns a number with this form 0xtopLeft|top|topRight|left|right|downLeft|down|downRight
     */
    getTileContactMap(x,y,tileClass = Tile){
        /*
        to compute auto tiling, we can use bit map like this :
            [topLeft , top , topRight]
            [left    , main,    right]
            [downLeft, down,downRight]
            => 0xtopLeft|top|topRight|left|right|downLeft|down|downRight
            => 0xff
            (main can be ignore since it's all ways true)
        */
        let map = 0x00;


        const a = TILE_SIZE/2;

        const pos_x = Math.round((x-a)/TILE_SIZE);
        const pos_y = Math.round((y-a)/TILE_SIZE);


        for (let y = -1; y < 2; y++) {
            for (let x = -1; x < 2; x++) {
                if(x===0 && x===y)continue;
                const testPos_x = pos_x + x;
                const testPos_y = pos_y + y;
                const tile = this.getTile(testPos_x,testPos_y);
                if(tile===null || !(tile instanceof tileClass))continue;
                map = map | CONTACT_TILE_MASK_MAP[1+y][1+x];
            }
        }

        return map;
    }


    foreachTile(fnc){
        for (const i of this.level) {
            for (const tile of i) {
                if(tile===null)continue;
                fnc(tile);
            }
        }
    }

    foreachSpecialTile(fnc,specialTiles){
        for (const key in specialTiles) {
            if (Object.hasOwnProperty.call(specialTiles, key)) {
                const element = specialTiles[key];
                const tile = this.getTile(element.x,element.y);
                if(tile===null)continue;
                fnc(tile,element.x,element.y);
            }
        }
    }


    clearLevel(){
        this.level=[];
        this.player=null;
    }

    generateLevel(levelContructData,callback=()=>{}){
        for (let i = 0; i < 100; i++) {
            const b = [];
            for (let j = 0; j < 200; j++) {
                const y = i % 20;
                if(y>15 && y<19 && !(j>20 && j<25)){
                    b.push(TileIndex.createTile("main",0).setOriginePosition(this.getTilePos(j,i)));
                }
                else{
                    b.push(null);
                }
            }
            this.level.push(b);
        }

        // post process
        this.foreachTile((tile)=>{
            tile.postCreate(this);
        });

        this.levelData={backgroundColor : "#555555"};

        callback();

        this.createPlayer();
        this.spawnPlayer();
    }

    getTilePos(x,y){
        return new Vector(x*TILE_SIZE + TILE_SIZE/2,y*TILE_SIZE + TILE_SIZE/2);
    }

    getTileId(x,y){
        return x+":"+y;
    }

    updateActiveTile(t){
        this.foreachSpecialTile((tile)=>{
            tile.update(t);
        },this.activeTile);
    }

    registerActiveTile(x,y){
        const id = this.getTileId(x,y);
        if(this.activeTile[id]===undefined){
            this.activeTile[id]={x:x,y:y};
        }
        else{
            throw new Error("tile all ready register in the active tiles");
        }
    }

    unregisterActiveTile(x,y){
        const id = this.getTileId(x,y);
        if(this.activeTile[id]!==undefined){
            delete this.activeTile[id];
        }
    }


    registerAdvanceCollisionTile(x,y){
        const id = this.getTileId(x,y);
        if(this.advanceCollisionTile[id]===undefined){
            this.advanceCollisionTile[id]={x:x,y:y};
        }
        else{
            throw new Error("tile all ready register in the continue collision tiles");
        }
    }
    unregisterAdvanceCollisionTile(x,y){
        const id = this.getTileId(x,y);
        if(this.advanceCollisionTile[id]!==undefined){
            delete this.advanceCollisionTile[id];
        }
    }

    //#endregion


    //#region ============== CAMERA ==============

    setCameraPosition(position){
        const r_x=RENDER_RESOLUTION[0]/2;
        const r_y=RENDER_RESOLUTION[1]/2;
        this.cameraPosition.set(
            MathUtils.clamp(position.x,r_x,this.levelLimit.x*TILE_SIZE-r_x),
            MathUtils.clamp(position.y,r_y, this.levelLimit.y*TILE_SIZE-r_y)
        );
    }

    setCameraTarget(target){
        this.cameraTarget=target;
    }

    setCameraOffset(offset){
        this.cameraOffset.set(offset);
    }

    //#endregion

    //#region ============== PLAYER GESTION ==============

    createPlayer(){

        this.player=new PlayerRollDash(0,0);
        this.player.onCreate(this);
        this.player.dead=true;
        return this.player;
    }


    destroyPlayer(){
        this.player.onDestroy(this);
        this.player=null;
    }

    spawnPlayer(){
        this.player.position.set(this.playerSpawnPoint);
        this.player.onSpawn();
    }

    setPlayerSpawnPoint(position){
        this.playerSpawnPoint.set(position);
    }

    //#endregion



    deltaTime(){
        return this.t;
    }

    step(){

        if(this.pause){
            this.t=0;
            this.lastTime=new Date();
            return;
        }

        const newDate=new Date();
        this.t = (newDate.getTime() - this.lastTime.getTime())/1000;

        // tile update

        this.updateActiveTile(this.t);

        // player update
        if(this.player){

            // update player
            this.player.update(this.t);
        }


        // update camera pos
        const targetPos = (this.cameraForceTarget!==null?this.cameraForceTarget:this.cameraTarget).clone();
        //targetPos.x = MathUtils.clamp(targetPos.x,this.cameraTarget.x-CAMERA_DEAD_ZONE[0]/2,this.cameraTarget.x+CAMERA_DEAD_ZONE[0]/2);
        targetPos.add(this.cameraOffset);

        this.setCameraPosition(targetPos);


        this.lastTime=newDate;
    }
}