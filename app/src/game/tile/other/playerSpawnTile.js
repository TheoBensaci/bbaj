import { TILE_SIZE } from "../../../constant.js";
import { RessourceLoader } from "../../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../../utils/shape.js";
import { Vector } from "../../../utils/vector.js";
import { Tile } from "../../tileSystem/tile.js";

export class PlayerSpawnTile extends Tile{
    constructor(){
        super([]);
    }

    postCreate(game){
        game.originalSpawnPoint=this;
    }

    static createTile(param){
        return new PlayerSpawnTile();
    }

    static editorRender(tileWrapper,x,y,context){
        context.font = "bold 15px Segoe UI";
        context.fillStyle=context.strokeStyle ="#00ff99";
        context.lineWidth = 2;
        context.strokeRect(
            x,y,
            TILE_SIZE,
            TILE_SIZE
        );
        context.fillText("P", x+TILE_SIZE/2-5,y+TILE_SIZE/2+5);
    }
}

export class PlayerCheckPointTile extends Tile{
    constructor(){
        super([
            Shape.createShape(
            ShapeType.SQUARE,
            new Vector(0,-TILE_SIZE/2),
            new Vector(TILE_SIZE,TILE_SIZE*2)
        ).setTrigger((player)=>{
            this.onTrigger(player);
        })]);
        this.active = false;
        this.game = null;
    }

    onTrigger(player){
        if(this.active)return;
        this.active=true;
        this.game.valideCheckPoint(this.position);
    }

    postCreate(game){
        this.game=game;
        this.game.addCheckPoint(this);
    }

    render(x,y,context,t){
        const r = RessourceLoader.getInstance();
        const image=r.get("./ressource/checkPoint.png");
        context.renderTexture(image, (this.active)?15:0, 0, 15, 30, x-5, y-TILE_SIZE*2, TILE_SIZE*1.5, TILE_SIZE*3);
    }

    static createTile(param){
        return new PlayerCheckPointTile();
    }

    static editorRender(tileWrapper,x,y,context){
        const r = RessourceLoader.getInstance();
        const image=r.get("./ressource/checkPoint.png");
        context.renderTexture(image, (this.active)?15:0, 0, 15, 30, x-5, y-TILE_SIZE*2, TILE_SIZE*1.5, TILE_SIZE*3);
    }
}