import { TILE_SIZE } from "../../../constant.js";
import { RessourceLoader } from "../../../utils/ressouceLoader.js";
import { Shape, ShapeType } from "../../../utils/shape.js";
import { Vector } from "../../../utils/vector.js";
import { Tile } from "../../tileSystem/tile.js";
import { AutoTilingIndex } from "../../tileSystem/tileUtils.js";

export class GroundTile extends Tile {
    constructor(friction = 1) {
        super([
            Shape.createShape(
                ShapeType.SQUARE,
                Vector.zero(),
                new Vector(TILE_SIZE, TILE_SIZE)
            )
        ]);
        this.friction = 1;

        this.autoTiling = new AutoTilingIndex('./ressource/completBasicTileSet.png', 16);
    }

    render(x, y, context, t) {
        this.autoTiling.render(x, y, context);
    }

    static createTile(param) {
        return new GroundTile();
    }

    postCreate(context) {
        this.autoTiling.compute(
            context.getTileContactMap(
                this.position.x,
                this.position.y,
                GroundTile
            )
        );
    }

    static editorRender(tileWrapper, x, y, context) {
        tileWrapper.autoTiling.render(x, y, context);
    }

    static setWrapperState(tileWrapper, context, x, y) {
        tileWrapper.autoTiling = new AutoTilingIndex('./ressource/completBasicTileSet.png', 16);
        tileWrapper.autoTiling.compute(
            context.getTileContactMap(x, y, GroundTile)
        );
    }
}
