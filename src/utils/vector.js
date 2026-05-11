export class Vector{
    constructor(x,y){
        this.x=x;
        this.y=y;
    }

    set(vector){
        this.x=vector.x;
        this.y=vector.y;
    }

    add(val){
        this.x+=val.x;
        this.y+=val.y;
        return this;
    }

    static add(vecA,vecB){
        return new Vector(vecA.x+vecB.x,vecA.y+vecB.y);
    }

    sub(val){
        this.x-=val.x;
        this.y-=val.y;
        return this;
    }

    static sub(vecA,vecB){
        return new Vector(vecA.x-vecB.x,vecA.y-vecB.y);
    }


    mul(val){
        this.x*=val.x;
        this.y*=val.y;
        return this;
    }

    static mul(vecA,vecB){
        return new Vector(vecA.x*vecB.x,vecA.y*vecB.y);
    }


    div(val){
        this.x/=val.x;
        this.y/=val.y;
        return this;
    }

    static div(vecA,vecB){
        return new Vector(vecA.x/vecB.x,vecA.y/vecB.y);
    }

    scale(val){
        this.x*=val;
        this.y*=val;
        return this;
    }

    static scale(vecA,val){
        return new Vector(vecA.x*val,vecA.y*val);
    }

    distance(val){
        return Math.sqrt(Math.pow(val.x-this.x,2)+Math.pow(val.y-this.y,2));
    }

    distancePow(val){
        return Math.pow(val.x-this.x,2)+Math.pow(val.y-this.y,2);
    }

    normalize(){
        let m = this.magnetude();
        if(m==0)return new Vector(0,0);
        return new Vector(this.x/m,this.y/m);
    }

    magnetude(){
        return Math.sqrt(Math.pow(this.x,2)+Math.pow(this.y,2));
    }

    sqrt_magnetude(){
        return Math.pow(this.x,2)+Math.pow(this.y,2);
    }

    static zero(){
        return new Vector(0,0);
    }

    to_string(){
        return "["+this.x+":"+this.y+"]";
    }

    lerp(b,t){
        return new Vector(lerp(this.x,b.x,t),lerp(this.y,b.y,t));
    }

    set_x(value){
        return new Vector(value,this.y);
    }

    set_y(value){
        return new Vector(this.x,value);
    }

    round(){
        this.x=Math.round(this.x);
        this.y=Math.round(this.y);
        return this;
    }

    floor(){
        this.x=Math.floor(this.x);
        this.y=Math.floor(this.y);
        return this;
    }

    rotate(rad){
        this.set(Vector.rotate(this,rad));
        return this;
    }

    static rotate(val,rad){
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return new Vector(val.x*c - val.y*s,val.x*s + val.y*c);
    }

    static dot(a,b){
        return a.x*b.x + a.y*b.y;
    }

    dot(b){
        return Vector.dot(this,b);
    }

    clone(){
        return new Vector(this.x,this.y);
    }

    static abs(vec){
        return new Vector(Math.abs(vec.x),Math.abs(vec.y));
    }

    abs(){
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        return this;
    }

    zero(){
        return this.x === 0 && this.y === 0;
    }
}


export function lerp(a,b,t){
    return a*(1-t)+b*t;
}