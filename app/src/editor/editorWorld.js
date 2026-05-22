import { RENDER_RESOLUTION, TILE_SIZE } from "../constant.js";
import { GroundTile } from "../game/tile/groundTile.js";
import { TileIndex } from "../game/tileSystem/tileIndexer.js";
import { MathUtils } from "../utils/utils.js";
import { Vector } from "../utils/vector.js";
import { World } from "../world.js";
import { TileEditorWrapper } from "./tileEditorWrapper.js";


export class EditorWorld extends World{
    constructor(){
        super();
        this.level=[];
    }


    setTile(x,y,params){
        if(x<0 || y<0)return;
        if(this.level.length<=y){
            if(params===null)return;
            const l = this.level.length-1;
            for (let index = 0; index <  y - l; index++) {
                this.level.push([]);
            }
        }
        if(this.level[y].length<=x){
            if(params===null)return;
            const l = this.level[y].length-1;
            for (let index = 0; index < x - l ; index++) {
                this.level[y].push(null);
            }
        }
        if(params===null){
            this.level[y][x]=null;
        }
        else{
            this.level[y][x]=new TileEditorWrapper(x,y,params);
            this.level[y][x].setState(this);
        }

        // update surround tile
        const tiles = this.getSuroundTiles(x*TILE_SIZE,y*TILE_SIZE,2);
        for (const tile of tiles) {
            if(tile!==null){
                tile.setState(this);
            }
        }
    }

    getTile(x,y){
        if(y<0 || (this.level[y]===undefined) || x<0 || x>=this.level[y].length)return null;
        if(this.level[y][x]===undefined)return null;
        return this.level[y][x];
    }


    isTileContactCompatible(tile,tileClass){
        return (tile!==null && (tile.tileClass === tileClass));
    }

    moveCamera(x,y){
        const buffer = this.cameraPosition.clone();
        buffer.x+=x;
        buffer.y+=y;
        this.setCameraPosition(buffer);
    }


    /**
     * Export the actual level into a array of tile data
     * @returns
     */
    export(){
        const result=[];
        for (let y = 0; y < this.level.length; y++) {
            const buffer = [];
            for (let x = 0; x < this.level[y].length; x++) {
                if(this.level[y][x]===null){
                    buffer.push([]);
                }
                else{
                    buffer.push(this.level[y][x].data);
                }
            }
            result.push(buffer);
        }
        return result;
    }
}