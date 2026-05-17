import { tileSize } from "../../constant.js";
import { RessourceLoader } from "../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../utils/shape.js";
import { Vector } from "../../utils/vector.js";
import { Tile } from "../tileSystem/tile.js";
import { AutoTilingIndex } from "../tileSystem/tileUtils.js";

export class GroundTile extends Tile{
    constructor(friction = 1){
        super([
            Shape.createShape(
            ShapeType.SQUARE,
            Vector.zero(),
            new Vector(tileSize,tileSize)
        )]);
        this.friction=1;

        this.autoTiling = new AutoTilingIndex("./ressource/completBasicTileSet.png",16);
    }


    render(x,y,context){
        this.autoTiling.render(x,y,context);
    }

    static createTile(param){
        return new GroundTile();
    }

    postCreate(context){
        this.autoTiling.compute(context.getTileContactMap(this.position.x,this.position.y,GroundTile));
    }


}