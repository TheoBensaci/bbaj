/**
 * @ Autheur: Theo Bensaci
 * @ Date: 14:03 22.05.2026
 * @ Description: wrapper use to manage tile data in the editor world
 */

import { TILE_SIZE } from "../constant.js";
import { TileIndex } from "../game/tileSystem/tileIndexer.js";



export class TileEditorWrapper{

    constructor(x,y,data){
        this.tileClass=TileIndex.getTileClass(data[0],data[1]);
        this.data=data;
        this.tileParams=data[2];
        this.x=x;
        this.y=y;
    }


    render(x,y,context){
        this.tileClass.editorRender(this,x,y,context);
    }

    setState(context){
        this.tileClass.setWrapperState(this,context,this.x*TILE_SIZE+TILE_SIZE/2,this.y*TILE_SIZE+TILE_SIZE/2);
    }

}