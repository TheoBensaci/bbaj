import { RENDER_RESOLUTION, TILE_SIZE } from "./constant.js";
import { Director } from "./director.js";
import { GroundTile } from "./game/tile/groundTile.js";
import { JumpPadTile } from "./game/tile/jumpPadTile.js";
import { Slope } from "./game/tile/slope.js";
import { TileIndex } from "./game/tileSystem/tileIndexer.js";
import { Vector } from "./utils/vector.js";

export function initSmallEditor(canvas,game,renderer){

    let placedTile = -1;
    let lastPlacedPos = new Vector(-1,-1);
    let tileParams=[0];



    window.addEventListener("keypress",(e)=>{

        if(e.key==='p'){
            Director.togglePauseGame(!game.pause);
        }

        if(e.key==='0'){
            placedTile=-1;
        }
        if(e.key==='1'){
            placedTile=0;
        }
        if(e.key==='2'){
            placedTile=1;
        }
        if(e.key==='3'){
            placedTile=2;
        }

        if(e.key==='.'){
            Director.switchSceen("loading");
        }

        if(e.key==='-'){
            Director.switchSceen("game");
        }

        if(e.key==='r'){
            tileParams[0] = (tileParams[0]+1)%4;
        }
    })

    canvas.addEventListener("click",(e)=>{
        const scaleX = (window.innerWidth) / (RENDER_RESOLUTION[0]);
        const scaleY = (window.innerHeight) / (RENDER_RESOLUTION[1]);

        const scale = Math.min(scaleX, scaleY);
        const rect = e.target.getBoundingClientRect();
        const targetPos = new Vector(e.clientX - rect.left,e.clientY - rect.top).scale(1/scale);
        const pos = renderer
            .screenToWordPosition(targetPos)
            .scale((1/TILE_SIZE))
            .floor();

        if(lastPlacedPos.x === pos.x && lastPlacedPos.y===pos.y){
            return;
        }

        if(placedTile<0){
            game.setTile(pos.x,pos.y,null);
            return;
        }
        game.setTile(pos.x,pos.y,TileIndex.createTile("main",placedTile,tileParams));
        console.log(game.level);
    });


}