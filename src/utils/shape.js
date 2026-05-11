import { Vector } from "./vector.js";

const shapePoints=[
    [
        new Vector(1,0)
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

export const ShapeType = Object.freeze({
    NONE : 0,
    SQUARE : 1,
    TRIANGLE_SQR : 2,
    OTHER : 3
});


export class Shape{

    /**
     *
     * @param {*} type type of shape | 0 = cercle, 1 = square, 2 = triangle
     * @param {*} offset
     * @param {*} scaleVector
     * @param {*} rotation
     */
    constructor(points,offset=new Vector(0,0),scaleVector=new Vector(1,1),rad=0){
        this.points = Shape.project(points,offset,scaleVector,rad);
        this.offset=offset;
        this.scale=scaleVector;
        this.rotation=rad;
    }

    static createShape(type,offset=new Vector(0,0),scaleVector=new Vector(1,1),rad=0){
        return new Shape(shapePoints[type],offset,scaleVector,rad);
    }


    static project(points,offset=new Vector(0,0),scaleVector=new Vector(1,1),rad=0){
        const buffer = [];
        for (const i of points) {
            buffer.push(Vector.mul(i,scaleVector).rotate(rad).add(offset));
        }
        return buffer;
    }


    project(offset=new Vector(0,0),scaleVector=new Vector(1,1),rad=0){
        const buffer = new Shape(this.points,offset,scaleVector,rad);
        return buffer;
    }

    getEdge(){
        return this.points;
    }

    static getNormal(points,centerPoint){
        const buffer = [];
        if(points.length<2)return [];
        for (let index = 1; index < points.length+1; index++) {
            const a = points[index-1];
            const b = points[(index===points.length)?0:index];
            const i = Vector.sub(a,b);
            const normal = Vector.rotate(i,Math.PI/2).normalize();
            if(Vector.dot(Vector.sub(centerPoint,a).normalize(),normal)>0){
                normal.scale(-1);
            }
            buffer.push(normal);
        }
        return buffer;
    }

    getNormal(){
        return Shape.getNormal(this.points,this.getCenter());
    }

    static getBoudingBox(points){
        const min = [points[0].x,points[0].y];
        const max = [min[0],min[1]];
        for (const p of points) {
            min[0] = Math.min(min[0],p.x);
            min[1] = Math.min(min[1],p.y);
            max[0] = Math.max(max[0],p.x);
            max[1] = Math.max(max[1],p.y);
        }
        return [new Vector(min[0],min[1]), new Vector(max[0],max[1])];
    }

    getBoudingBox(){
        return Shape.getBoudingBox(this.getEdge());
    }


    getCenter(){
        const boudingBox = this.getBoudingBox();
        return Vector.add(boudingBox[0],Vector.sub(boudingBox[1],boudingBox[0]).scale(0.5));
    }



    getMaxMinProjection(axis){
        let min = Vector.dot(this.points[0],axis);;
        let max = min;

        for (const point of this.points) {
            const v = Vector.dot(point,axis);
            min=(min>v)?v:min;
            max=(max<v)?v:max;
        }
        const center = Vector.dot(this.offset,axis);
        return [min,max,center];
    }


    static #minMaxOverlap(minMaxA,minMaxB){
        const min = Math.min(minMaxA[0],minMaxB[0]);
        const max = Math.max(minMaxA[1],minMaxB[1]);

        const result = (max-min) - (minMaxA[1]-minMaxA[0]) - (minMaxB[1]-minMaxB[0]);

        return  result;
    }



    /**
     * Check collision with SAT algorithm
     * @param {*} shapeA
     * @param {*} shapeB
     */
    static collide(shapeA, shapeB){
        const axisA = shapeA.getNormal();
        const axisB = shapeB.getNormal();


        const totalAxis=[...axisA,...axisB];
        let smallestAxis = totalAxis[0];
        let smalestScale = Infinity;

        let i = 0;
        for (let index = 0; index < totalAxis.length; index++) {
            const axis = totalAxis[index];
            i++;
            let minMaxA=shapeA.getMaxMinProjection(axis);
            let minMaxB=shapeB.getMaxMinProjection(axis);

            const overlap=Shape.#minMaxOverlap(minMaxA,minMaxB);
            if(overlap >= 0){
                return null;
            }

            const penetrationRate = Math.min(Math.abs(minMaxA[0] - minMaxB[1]),Math.abs(minMaxA[1] - minMaxB[0]));
            if(penetrationRate<smalestScale){
                smallestAxis=axis;
                smalestScale=penetrationRate;
            }
        }

        // check agains the diff vector between thoses 2 shapes cause we are
        // SURE thoses 2 shapes are convex (and not concave, since if there were concave, SAT would not work)
        // there for, you can get the correct multiplyer (to correct the vector of incedence) and
        // deduct where the shape are from each other with this
        const mult = Vector.dot(smallestAxis,Vector.sub(shapeA.getCenter(),shapeB.getCenter()))>0?-1:1;

        return smallestAxis.normalize().scale(smalestScale*mult);
    }
}