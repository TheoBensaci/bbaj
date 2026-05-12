import { tileSize } from "../constant.js";
import { Input } from "../utils/input.js";
import { Shape, ShapeType } from "../utils/shape.js";
import { Vector } from "../utils/vector.js";
import { Player } from "./player/player.js";
import { GroundTile } from "./tile/groundTile.js";
import { Tile } from "./tile/tile.js";

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
        if(y<0 ||x<0)return;
        let newRow = y>=this.level.length;
        let col = (newRow)?[]:this.level[y];
        col[x]=value;
        this.level[y]=col;

    }

    getSuroundTiles_V(pos,radius=1){
        const buffer=[];
        const gridPos=Vector.scale(pos,1/tileSize).floor();
        buffer.push(this.getTile(gridPos.x,gridPos.y));
        for (let y = -radius; y < radius; y++) {
            for (let x = -radius; x < radius; x++) {
                buffer.push(this.getTile(gridPos.x+x,gridPos.y+y));
            }
        }

        // add active tile
        return [...buffer,...this.activeTile];
    }

    getSuroundTiles(x,y,radius=1){
        return this.getSuroundTiles_V(new Vector(x,y),radius);
    }


    createTile(tileParams){
        return new GroundTile();
    }

    generateLevel(levelContructData){
        for (let i = 0; i < 100; i++) {
            const b = [];
            for (let j = 0; j < 50; j++) {
                const y = i % 20;
                if(y>15 && y<19 && !(j>20 && j<25)){
                    b.push(this.createTile(null).setPos(this.getTilePos(j,i)));
                }
                else{
                    b.push(null);
                }
            }
            this.level.push(b);
        }
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
            this.player.update(this,this.t);
            this.setCamera(this.player.position);
        }


        // update camera pos






        this.lastTime=newDate;
    }
}