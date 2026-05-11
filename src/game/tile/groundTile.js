import { tileSize } from "../../constant.js";
import { RessourceLoader } from "../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { Vector } from "../../utils/vector.js";
import { Tile } from "./tile.js";

export class GroundTile extends Tile{
    constructor(friction = 1){
        super();
        this.friction=1;
    }


    render(x,y,context){
        const r = RessourceLoader.getRessourceLoader();
        const image=r.get("./ressource/basicTileSet.png");
        let tileX=16;
        let tileY=16;

        const continuseMap=context.getTileRenderContinuseMap(this.position.x,this.position.y,GroundTile);

        const p = Vector.scale(Vector.sub(this.position,new Vector(tileSize,tileSize).scale(0.5)),1/tileSize).round();

        if(this.position.x === 0 && this.position.y===10*tileSize + tileSize/2){
            console.log("test");
        }
        if(continuseMap[0][1] && continuseMap[2][0] && continuseMap[1][0] && continuseMap[1][2]){
            tileX=16;
            tileY=16;
        }
        else if(continuseMap[1][0] && continuseMap[1][2] && continuseMap[2][1]){
            tileX=16;
            tileY=0;
        }
        else if(continuseMap[0][1] && continuseMap[2][1] && continuseMap[1][2]){
            tileX=0;
            tileY=16;
        }
        else if(continuseMap[1][0] && continuseMap[1][2] && continuseMap[0][1]){
            tileX=16;
            tileY=32;
        }
        else if(continuseMap[0][1] && continuseMap[2][1] && continuseMap[1][0]){
            tileX=32;
            tileY=16;
        }
        else if(!continuseMap[0][1]&&!continuseMap[1][0] && continuseMap[2][1] && continuseMap[1][2]){
            tileX=0;
            tileY=0;
        }
        else if(continuseMap[0][1] && continuseMap[1][0] && !continuseMap[2][1] && !continuseMap[1][2]){
            tileX=32;
            tileY=32;
        }
        else if(continuseMap[0][1] && !continuseMap[1][0] && !continuseMap[2][1] && continuseMap[1][2]){
            tileX=0;
            tileY=32;
        }
        else if(!continuseMap[0][1] && continuseMap[1][0] && continuseMap[2][1] && !continuseMap[1][2]){
            tileX=32;
            tileY=0;
        }


        context.drawImage(image, tileX, tileY, 16, 16, x, y, tileSize, tileSize);
        context.fillStyle="#ffffff";
    }

    getCollider(){
        return [
            Shape.createShape(
                ShapeType.SQUARE,
                this.position,
                new Vector(tileSize,tileSize)
            )
        ]
    }
}