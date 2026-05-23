import { CAMERA_DEAD_ZONE, CAMERA_SPEED, RENDER_RESOLUTION, TILE_SIZE, WORLD_LIMIT } from "../constant.js";
import { Director } from "../director.js";
import { downloadJsonFile } from "../utils/fileUtils.js";
import { Input } from "../utils/input.js";
import { Shape, ShapeType } from "../utils/shape.js";
import { MathUtils } from "../utils/utils.js";
import { Vector } from "../utils/vector.js";
import { World } from "../world.js";
import { Player } from "./player/player.js";
import { PlayerD } from "./player/playerD.js";
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

export class Game extends World{
    constructor(){
        super();
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

        this.cameraTarget=new Vector(0,0);
        this.cameraOffset=new Vector(0,0);
        this.cameraForceTarget=null;


        this.pause = false;
    }

    //#region ============== TILE GESTION ==============

    getTile(x,y){
        if(y<0 || (!this.level[y]) || x<0 || x>=this.level[y].length)return null;
        if(this.level[y][x]===undefined)return null;
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

    getSuroundTiles(x,y,radius=1){
        const buffer=super.getSuroundTiles(x,y,radius);

        const gridPos_x=Math.floor(x/TILE_SIZE);
        const gridPos_y=Math.floor(y/TILE_SIZE);


        const point = new Vector(x-radius * TILE_SIZE, y - radius*TILE_SIZE);
        const boudingBox = [point.clone(),point.add(2*radius * TILE_SIZE,2*radius * TILE_SIZE)];

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



    foreachTile(fnc){
        for (const i of this.level) {
            for (const tile of i) {
                if(tile===null || tile===undefined)continue;
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
        const buffer = [];
        for (let y = 0; y < levelContructData.length; y++) {
            const b = [];
            for (let x = 0; x < levelContructData[y].length; x++) {
                const data = levelContructData[y][x];
                if(data.length===0){
                    b.push(null);
                }
                else{
                    b.push(TileIndex.createTile(data[0],data[1],data[2]).setOriginePosition(this.getTilePos(x,y)));
                }
            }
            buffer.push(b);
        }
        this.level=buffer;

        this.activeTile={};
        this.advanceCollisionTile={};


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
    setCameraTarget(target){
        this.cameraTarget=target;
    }

    setCameraOffset(offset){
        this.cameraOffset.set(offset);
    }

    //#endregion

    //#region ============== PLAYER GESTION ==============

    createPlayer(){

        this.player=new PlayerD(0,0);
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
        targetPos.add(this.cameraOffset);
        this.cameraPosition.x=MathUtils.lerp(this.cameraPosition.x,targetPos.x,this.t*CAMERA_SPEED[0]);
        this.cameraPosition.y=MathUtils.lerp(this.cameraPosition.y,targetPos.y,this.t*CAMERA_SPEED[1]);

        this.setCameraPosition(this.cameraPosition);


        this.lastTime=newDate;
    }
}