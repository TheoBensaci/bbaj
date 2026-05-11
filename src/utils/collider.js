export class Collider{
    constructor(shapes){
        this.shapes=shapes;
    }


    project(offset,scale,rad){
        const buffer = [];
        for (const shape of this.shapes) {
            buffer.push(shape.project(offset,scale,rad));
        }
        return new Collider(buffer);
    }

    collide(other){
        if(other.shapes.empty() || this.shapes.empty())return null;

        let result=null;
        let magn = 0;
        for (const shapeA of other) {
            for (const shapeB of this.shapes) {
                const collide = Shape.collide(shapeA,shapeB);
                if(collide===null)continue;
                const m = collide.sqrt_magnetude();
                if(m>magn){
                    magn=m;
                    result=collide;
                }
            }
        }


        return result;
    }
}