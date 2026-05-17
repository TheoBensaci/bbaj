import { tileSize } from "../constant.js";
import { Input } from "../utils/input.js";
import { Shape, ShapeType } from "../utils/shape.js";
import { Vector } from "../utils/vector.js";
import { Player } from "./player/player.js";
import { GroundTile } from "./tile/groundTile.js";
import { Tile } from "./tileSystem/tile.js";
import { TileIndex } from "./tileSystem/tileIndexer.js";
import { CONTACT_TILE_MASK_MAP } from "./tileSystem/tileUtils.js";

export class Game{
    constructor(){
        this.lastTime=new Date();
        this.t=0;

        this.level=[];

        // list of tile which is concidarate
        this.activeTile=[];

        this.player=null;

        this.cameraPosition=new Vector(0,0);
    }

    //#region ============== TILE GESTION ==============

    getTile(x,y){
        if(y<0 || (!this.level[y]) || x<0 || x>=this.level[y].length)return null;
        return this.level[y][x];
    }



    setTile(x,y,value){
        if(y<0 || x<0)return;
        let newRow = y>=this.level.length;
        let col = (newRow)?[]:this.level[y];
        col[x]=value;
        this.level[y]=col;
        value.setPos(this.getTilePos(x,y));

        // post process

        // TODO : only updat suround tile
        this.foreachTile((tile)=>{
            tile.postCreate(this);
        });
    }

    getSuroundTiles(x,y,radius=1){
        const buffer=[];
        const gridPos_x=Math.floor(x/tileSize);
        const gridPos_y=Math.floor(y/tileSize);
        buffer.push(this.getTile(gridPos_x,gridPos_y));
        for (let y = -radius; y < radius; y++) {
            for (let x = -radius; x < radius; x++) {
                buffer.push(this.getTile(gridPos_x+x,gridPos_y+y));
            }
        }

        // add active tile
        return [...buffer,...this.activeTile];
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


        const a = tileSize/2;

        const pos_x = Math.round((x-a)/tileSize);
        const pos_y = Math.round((y-a)/tileSize);


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

    generateLevel(levelContructData){
        for (let i = 0; i < 100; i++) {
            const b = [];
            for (let j = 0; j < 200; j++) {
                const y = i % 20;
                if(y>15 && y<19 && !(j>20 && j<25)){
                    b.push(TileIndex.createTile("main",0).setPos(this.getTilePos(j,i)));
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
    }

    getTilePos(x,y){
        return new Vector(x*tileSize + tileSize/2,y*tileSize + tileSize/2);
    }

    updateActiveTile(){

    }

    registerActiveTile(x,y){

    }

    unregisterActiveTile(x,y){

    }

    registerStaticCollisionTile(x,y){

    }
    unregisterStaticCollisionTile(x,y){

    }

    //#endregion


    //#region ============== CAMERA ==============

    setCamera(position){
        this.cameraPosition.set(position);
    }

    //#endregion

    //#region ============== PLAYER GESTION ==============

    createPlayer(){

        // if spawn point found
        if(false){
            // spawn player at the spawn
        }else{
            // spawn player at origine
            this.player=new Player(0,0);
        }
        this.player.onCreate(this);
        return this.player;
    }


    destroyPlayer(){
        this.player.onDestroy(this);
        this.player=null;
    }

    //#endregion



    deltaTime(){
        return this.t;
    }

    step(){
        const newDate=new Date();
        this.t = (newDate.getTime() - this.lastTime.getTime())/1000;

        // tile update

        // player update
        if(this.player){

            // update player
            this.player.update(this.t);
            this.setCamera(this.player.position);
        }


        // update camera pos






        this.lastTime=newDate;
    }
}