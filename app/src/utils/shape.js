import { Vector } from './vector.js';

/*eslint-disable*/
const shapePoints = [
    [
        new Vector(0,0),
        new Vector(1,0),
    ],
    [
        new Vector(-0.5,0.5),
        new Vector(0.5,0.5),
        new Vector(0.5,-0.5),
        new Vector(-0.5,-0.5)
    ],
    [
        new Vector(-0.5,-0.5),
        new Vector(0.5,-0.5),
        new Vector(0.5,0.5)
    ],
    [
        new Vector(1,0.5),
        new Vector(2,3),
        new Vector(2,1),
        new Vector(1,-0.5)
    ]
];
/*eslint-enable*/

export const ShapeType = Object.freeze({
    RAY: 0,
    SQUARE: 1,
    TRIANGLE_SQR: 2,
    OTHER: 3,
});

export class Shape {
    /**
     *
     * @param {*} points points of the shape
     * @param {*} offset offset of the shape
     * @param {*} scaleVector scale of the shape
     * @param {*} rotation rotation of the shape
     */
    constructor(points, offset=new Vector(0,0), scaleVector = new Vector(1,1), rad = 0) {
        this.points = Shape.project(points, offset, scaleVector, rad);
        this.offset = offset;
        this.scale = scaleVector;
        this.rotation = rad;
        this.origine = new Vector(0, 0);
    }

    /**
     * Create a
     * @param {*} type
     * @param {*} offset
     * @param {*} scaleVector
     * @param {*} rad
     * @returns
     */
    static createShape(type, offset = new Vector(0,0), scaleVector = new Vector(1,1), rad=0) {
        return new Shape(shapePoints[type], offset, scaleVector, rad);
    }

    static project(points, offset = new Vector(0,0), scaleVector = new Vector(1,1) ,rad = 0) {
        const buffer = [];
        for (const i of points) {
            buffer.push(Vector.mul(i, scaleVector).rotate(rad).add(offset));
        }
        return buffer;
    }

    /**
     * transfrom this shape into a trigger shape, this mean this shape will no longer be use to resolve collision
     * instead, collision with the player will trigger callback
     * @param {function(player)} onTriggerCallback trigger call when ever the player is in this shape
     * @param {function(player)} onTriggerEndCallback trigger call when the player leave is this shape
     * @returns {Shape} this shap
     */
    setTrigger(onTriggerCallback, onTriggerEndCallback = ()=>{}) {
        this.trigger = onTriggerCallback;
        this.triggerEnd = onTriggerEndCallback;
        return this;
    }

    setOffset(offset) {
        for (const i of this.points) {
            i.add(offset);
        }
        this.offset.add(offset);
        return this;
    }

    setScale(scale) {
        for (const i of this.points) {
            i.mul(scale);
        }
        this.scale.mul(scale);
        return this;
    }

    setRotation(rad) {
        for (const i of this.points) {
            i.rotate(rad);
        }
        this.rotation += rad;
        return this;
    }

    /**
     * Move the origine of this shape to new pose
     * @param {Vector} vec
     * @returns
     */
    setOrigine(vec) {
        let x, y;
        if (arguments.length === 1) {
            x = vec.x;
            y = vec.y;
        } else if (arguments.length === 2) {
            x = arguments[0];
            y = arguments[1];
        }
        for (const i of this.points) {
            i.sub(this.origine).add(x, y);
        }
        this.origine.set(x, y);
        return this;
    }

    project(offset = new Vector(0,0), scaleVector = new Vector(1,1), rad = 0) {
        const buffer = new Shape(this.points, offset, scaleVector, rad);
        return buffer;
    }

    getEdge() {
        return this.points;
    }

    static getNormal(points, centerPoint) {
        const buffer = [];
        if (points.length < 2) return [];
        for (let index = 1; index < points.length + 1; index++) {
            const a = points[index - 1];
            const b = points[index === points.length ? 0 : index];
            const i = Vector.sub(a, b);
            const normal = Vector.rotate(i, Math.PI/2).normalize();
            if (Vector.dot(Vector.sub(centerPoint, a).normalize(), normal) > 0) {
                normal.scale(-1);
            }
            buffer.push(normal);
        }
        return buffer;
    }

    getNormal() {
        return Shape.getNormal(this.points, this.getCenter());
    }

    static getBoundingBox(points) {
        const min = [points[0].x, points[0].y];
        const max = [min[0], min[1]];
        for (const p of points) {
            min[0] = Math.min(min[0], p.x);
            min[1] = Math.min(min[1], p.y);
            max[0] = Math.max(max[0], p.x);
            max[1] = Math.max(max[1], p.y);
        }
        return [new Vector(min[0], min[1]), new Vector(max[0], max[1])];
    }

    getBoundingBox() {
        return Shape.getBoundingBox(this.getEdge());
    }

    getCenter() {
        const boudingBox = this.getBoundingBox();
        return Vector.add(boudingBox[0], Vector.sub(boudingBox[1], boudingBox[0]).scale(0.5));
    }

    getMaxMinProjection(axis) {
        let min = Vector.dot(this.points[0], axis);
        let max = min;

        for (const point of this.points) {
            const v = Vector.dot(point, axis);
            min = min > v ? v : min;
            max = max < v ? v : max;
        }
        const center = Vector.dot(this.offset, axis);
        return [min, max, center];
    }

    static #minMaxOverlap(minMaxA, minMaxB) {
        if (minMaxA[1] - minMaxA[0] === 0) {
            return minMaxB[1] - minMaxB[0];
        }
        if (minMaxB[1] - minMaxB[0] === 0) {
            return minMaxA[1] - minMaxA[0];
        }

        const min = Math.min(minMaxA[0], minMaxB[0]);
        const max = Math.max(minMaxA[1], minMaxB[1]);

        const result = (max - min) - (minMaxA[1] - minMaxA[0]) - (minMaxB[1] - minMaxB[0]);
        return result;
    }

    /**
     * Check collision with SAT algorithm
     * @param {*} shapeA
     * @param {*} shapeB
     */
    static collide(shapeA, shapeB, resolve = true, banAxis = []) {
        const axisA = shapeA.getNormal();
        const axisB = shapeB.getNormal();

        const totalAxisBuffer = [...axisA, ...axisB];

        // track if a axe as been avoide
        const avoidedAxis = Array(totalAxisBuffer.length);
        avoidedAxis.fill(false);

        // final total axis
        const totalAxis = [];

        // axis banned and avoided
        for (let i = 0; i < totalAxisBuffer.length; i++) {
            if (avoidedAxis[i]) continue;

            // ban axis
            // check if the axe [i] as been ban and there for avoided
            for (const banAxi of banAxis) {
                if (Math.abs(totalAxisBuffer[i].dot(banAxi)) === 1) {
                    avoidedAxis[i] = true;
                    break;
                }
            }

            // if not avoided add it to the total axis
            if (!avoidedAxis[i]) {
                // the axe[i] is ok
                totalAxis.push(totalAxisBuffer[i]);
            }

            // then we can avoid any axis who's align with this axe
            for (let j = i; j < totalAxisBuffer.length; j++) {
                if (avoidedAxis[j]) continue;

                // check if axe align and if so, check if the axe as been ban (avoing re-checking with the ban axis array)
                avoidedAxis[j] = Math.abs(totalAxisBuffer[i].dot(totalAxisBuffer[j])) === 1 && avoidedAxis[i];
            }
        }

        let smallestAxis = totalAxis[0];
        let smalestScale = Infinity;

        let i = 0;
        for (let index = 0; index < totalAxis.length; index++) {
            const axis = totalAxis[index];
            i++;
            let minMaxA = shapeA.getMaxMinProjection(axis);
            let minMaxB = shapeB.getMaxMinProjection(axis);

            const overlap = Shape.#minMaxOverlap(minMaxA, minMaxB);
            if (overlap >= 0) {
                if (!resolve) return false;
                return null;
            }

            if (!resolve) continue;
            const penetrationRate = Math.min(Math.abs(minMaxA[0] - minMaxB[1]), Math.abs(minMaxA[1] - minMaxB[0]));
            if (penetrationRate < smalestScale) {
                smallestAxis = axis;
                smalestScale = penetrationRate;
            }
        }
        if (!resolve) return true;

        // check agains the diff vector between thoses 2 shapes cause we are
        // SURE thoses 2 shapes are convex (and not concave, since if there were concave, SAT would not work)
        // there for, you can get the correct multiplyer (to correct the vector of incedence) and
        // deduct where the shape are from each other with this
        const mult = Vector.dot(smallestAxis, Vector.sub(shapeA.getCenter(), shapeB.getCenter())) > 0 ? -1 : 1;

        return smallestAxis.normalize().scale(smalestScale*mult);
    }

    static AABB(boundingBoxA, boundingBoxB) {
        const r1 = this.#minMaxOverlap([boundingBoxA[0].x, boundingBoxA[1].x], [boundingBoxB[0].x, boundingBoxB[1].x]);
        if (r1 >= 0) return false;
        const r2 = this.#minMaxOverlap([boundingBoxA[0].y, boundingBoxA[1].y], [boundingBoxB[0].y, boundingBoxB[1].y]);
        if (r2 >= 0) return false;
        return true;
    }
}
