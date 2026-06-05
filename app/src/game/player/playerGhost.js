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
        context.font = "10px Segoe UI";
        context.fillStyle ="#000000";
        context.fillText(this.name, x, y-TILE_SIZE + 5);
    }
}