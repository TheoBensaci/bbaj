import { tileSize } from "./constant.js";
import { GroundTile } from "./game/tile/groundTile.js";
import { JumpPadTile } from "./game/tile/jumpPadTile.js";
import { Slope } from "./game/tile/slope.js";
import { Vector } from "./utils/vector.js";

export function initSmallEditor(canvas,game,renderer){

    let placedTile = null;
    let lastPlacedPos = new Vector(-1,-1);

    window.addEventListener("keypress",(e)=>{
        if(e.key==='0'){
            placedTile=null;
        }
        if(e.key==='1'){
            placedTile=GroundTile;
        }
        if(e.key==='2'){
            placedTile=Slope;
        }
        if(e.key==='3'){
            placedTile=JumpPadTile;
        }
    })

    canvas.addEventListener("click",(e)=>{
        const rect = e.target.getBoundingClientRect();
        const pos = renderer
            .screenToWordPosition(new Vector(e.clientX - rect.left,e.clientY - rect.top))
            .scale(1/tileSize)
            .floor();

        if(lastPlacedPos.x === pos.x && lastPlacedPos.y===pos.y){
            return;
        }

        if(placedTile===null) game.setTile(pos.x,pos.y,null);
        game.setTile(pos.x,pos.y,(new (placedTile)).setPos(game.getTilePos(pos.x,pos.y)));
        console.log(game.level);
    });


}