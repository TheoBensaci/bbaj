import { TILE_SIZE } from "../../../constant.js";
import { Shape, ShapeType } from "../../../utils/shape.js";
import { MathUtils } from "../../../utils/utils.js";
import { Vector } from "../../../utils/vector.js";
import { DynamicTile } from "../../tileSystem/tile.js";

export class OneWayPlatformTile extends DynamicTile {
    constructor(rotation) {
        const rad = MathUtils.degToRad(rotation * 90);
        super([
            Shape.createShape(
                ShapeType.SQUARE,
                new Vector(0, -TILE_SIZE * 0.35),
                new Vector(TILE_SIZE, TILE_SIZE * 0.3)
            ).setRotation(rad)
        ]);

        this.rad = rad;

        this.active = true;

        this.direction = new Vector(0, -1).rotate(rad).normalize();
    }

    setOriginePosition(pos) {
        super.setOriginePosition(pos);
        this.offsetCenter = Vector.add(this.position, this.direction.clone().scale(TILE_SIZE));
        return this;
    }

    render(x, y, context, t){
        const col = this.getCollider()[0];
        context.debugRenderShape(col, '#ff0055', false);
        context.debugRenderShape(Shape.createShape(
            ShapeType.SQUARE,
            new Vector(0, -TILE_SIZE * 0.2),
            new Vector(TILE_SIZE, TILE_SIZE * 0.2)
        ).setRotation(this.rad).setOrigine(this.position), '#960050', false);
    }

    canCollide(player) {
        const d = Math.abs(Vector.dot(Vector.sub(player.position, this.position).normalize(), this.direction));
        if (d < 0.7) return false;
        return Vector.dot(player.velocity.clone().normalize(), this.direction) < 0.001;
    }

    static createTile(param) {
        return new OneWayPlatformTile(param.rotation);
    }

    static editorRender(tileWrapper, x, y, context) {
        context.debugRenderShape(tileWrapper.shape, '#ff0055', false);
    }

    static setWrapperState(tileWrapper, context, x, y) {
        const b = new OneWayPlatformTile(tileWrapper.tileParams.rotation);
        b.setOriginePosition(new Vector(x, y));
        tileWrapper.shape = b.getCollider()[0];
    }
}
