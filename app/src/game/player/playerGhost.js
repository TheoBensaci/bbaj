/**
 * @ Autheur: Theo Bensaci
 * @ Date: 14:54 05.06.2026
 * @ Description: Ghost of players (base on PlayerD)
 */

import { TILE_SIZE } from "../../constant.js";
import { PlayerD } from "./playerD.js";

export class PlayerGhost extends PlayerD{
    constructor(name){
        super();
        this.dummie=true;
        this.name=name;
    }



    render(x,y,context,t){
        super.render(x,y,context,t);
        const textSize = 12;
        context.font = ""+12+"px Segoe UI";
        context.fillStyle ="#ffffff";
        context.strokeStyle ="#000000";
        context.lineWidth = 3;
        const tx=x - textSize*this.name.length * 0.25;
        const ty=y-TILE_SIZE+1;
        context.strokeText(this.name, tx, ty);
        context.fillText(this.name, tx, ty);
    }
}