import { MathUtils } from './utils.js';

export class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    set(vector) {
        if (arguments.length === 2) {
            this.x = arguments[0];
            this.y = arguments[1];
        } else if (arguments.length === 1) {
            this.x = vector.x;
            this.y = vector.y;
        }
        return this;
    }

    add(val) {
        if (arguments.length === 2) {
            this.x += arguments[0];
            this.y += arguments[1];
        } else if (arguments.length === 1) {
            this.x += val.x;
            this.y += val.y;
        }
        return this;
    }

    static add(vecA, vecB) {
        return vecA.clone().add(vecB);
    }

    sub(val) {
        if (arguments.length === 2) {
            this.x -= arguments[0];
            this.y -= arguments[1];
        } else if (arguments.length === 1) {
            this.x -= val.x;
            this.y -= val.y;
        }
        return this;
    }

    static sub(vecA, vecB) {
        return vecA.clone().sub(vecB);
    }

    mul(val) {
        if (arguments.length === 2) {
            this.x *= arguments[0];
            this.y *= arguments[1];
        } else if (arguments.length === 1) {
            this.x *= val.x;
            this.y *= val.y;
        }
        return this;
    }

    static mul(vecA, vecB) {
        return vecA.clone().mul(vecB);
    }

    div(val) {
        if (arguments.length === 2) {
            this.x /= arguments[0];
            this.y /= arguments[1];
        } else if (arguments.length === 1) {
            this.x /= val.x;
            this.y /= val.y;
        }
        return this;
    }

    static div(vecA, vecB) {
        return vecA.clone().div(vecB);
    }

    scale(val) {
        this.x *= val;
        this.y *= val;
        return this;
    }

    static scale(vecA, val) {
        return vecA.clone().scale(val);
    }

    distance(val) {
        return Math.sqrt(Math.pow(val.x-this.x, 2) + Math.pow(val.y-this.y, 2));
    }

    distancePow(val) {
        return Math.pow(val.x - this.x, 2) + Math.pow(val.y - this.y, 2);
    }

    normalize() {
        let m = this.magnetude();
        if (m === 0) return this;
        this.x /= m;
        this.y /= m;
        return this;
    }

    static normalize(vec) {
        return vec.clone().normalize();
    }

    magnetude() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }

    sqrtMagnetude() {
        return Math.pow(this.x, 2) + Math.pow(this.y, 2);
    }

    static zero() {
        return new Vector(0, 0);
    }

    // NOTE(sss): is it not named 'toString' on purpose?
    to_string() {
        return '('+Math.round(this.x*100)/100+', '+Math.round(this.y*100)/100+')';
    }

    lerp(b, t) {
        return new Vector(lerp(this.x, b.x, t), lerp(this.y, b.y, t));
    }

    setX(value) {
        return new Vector(value, this.y);
    }

    setY(value) {
        return new Vector(this.x, value);
    }

    round() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }

    floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }

    rotate(rad) {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        const x = this.x*c - this.y*s
        const y = this.x*s + this.y*c
        return this.set(x, y);
    }

    approche(targetVec, step) {
        this.x = MathUtils.approche(this.x, targetVec.x, step);
        this.y = MathUtils.approche(this.y, targetVec.y, step);
        return this;
    }

    static rotate(vec, rad) {
        return vec.clone().rotate(rad);
    }

    static dot(a, b) {
        return a.x*b.x + a.y*b.y;
    }

    dot(b) {
        return Vector.dot(this, b);
    }

    clone() {
        return new Vector(this.x, this.y);
    }

    abs() {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        return this;
    }

    static abs(vec) {
        return vec.clone().abs();
    }
}

export function lerp(a, b, t) {
    return a*(1 - t) + b*t;
}
