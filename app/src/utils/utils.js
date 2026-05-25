export function debugBnt(fonctions) {
    for (let index = 0; index < fonctions.length; index++) {
        const d = document.createElement('button');
        d.innerHTML = 'fnc #' + (index + 1);
        d.onclick = fonctions[index];
        document.getElementById('debugDiv').appendChild(d);
    }
}

export function genSettings(node, settings, canvas) {
    const settingsTab = document.createElement('div');

    settingsTab.id = 'settings';

    for (const key in settings) {
        const div = document.createElement('div');
        div.innerHTML = key;
        const i = document.createElement('input');
        i.type = 'checkbox';
        i.checked = settings[key];
        i.addEventListener('change', (e) => {
            settings[key] = e.target.checked;
            e.target.blur();
            canvas.focus();
        });
        div.appendChild(i);
        settingsTab.appendChild(div);
    }

    node.appendChild(settingsTab);
}

/**
 * Utility class use for color calculation
 */
export class Color {
    constructor(r, g, b, a = 255) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    /**
     * fusion 2 channel d'une couleur enseble
     * @param {int} a chanel 1
     * @param {int} b chanel 2
     * @param {float} t t du blend
     * @returns {float} chanel fusioner
     */
    static blendChannel(a, b, t) {
        return Math.sqrt((1 - t)*Math.pow(a, 2) + t*Math.pow(b, 2));
    }

    /**
     * Fusion 2 couleur ensemble
     * @param {Color} col1 Couleur 1
     * @param {Color} col2 Couleur 2
     * @param {float} t t du blend
     * @returns {Color} Couleur fusioner
     */
    static blenColor(col1, col2, t) {
        const r = Color.blendChannel(col1.r, col2.b, t);
        const g = Color.blendChannel(col1.g, col2.g, t);
        const b = Color.blendChannel(col1.b, col2.b, t);

        return new Color(r, g, b);
    }

    /**
     * Crée un RGB depuis un hexa
     * @param {string} hex hexa
     * @returns {Color} color
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? new Color(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)) : null;
    }

    static fromString(hex) {
        const result = /rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/.exec(hex);
        return result ? new Color(parseInt(result[1], 10), parseInt(result[2], 10), parseInt(result[3], 10)) : null;
    }

    toString() {
        return `rgb(${this.r},${this.g},${this.b},${this.a})`;
    }

    toStringHex() {
        const value = [this.r, this.g, this.b, this.a];
        let s = '#';
        for (const iterator of value) {
            s += (iterator < 16 ? '0' : '') + Math.round(iterator).toString(16);
        }
        return s;
    }
}

export class MathUtils {
    static degToRad(deg) {
        return deg*(Math.PI/180);
    }

    static lerp(a, b, t) {
        return (1 - t)*a + b*t;
    }

    static bezier(x1, y1, x2, y2, t) {
        return {
            x: lerp(lerp(0, x1, t), lerp(x2, 1, t), t),
            y: lerp(lerp(0, y1, t), lerp(y2, 1, t), t),
        };
    }

    /**
     * Approche a value by the step
     * (from : monocle-engine)
     * @param {number} value actual value
     * @param {number} target target value
     * @param {number} step step
     * @returns {number}
     */
    static approche(value, target, step) {
        return value > target ? Math.max(value - step, target) : Math.min(value + step, target);
    }

    /**
     * Approche function but with a step function insted of a linear step
     * @param {number} value actual value
     * @param {number} target target value
     * @param {function} stepFunction step function, need to return a {number}
     * @returns {number}
     */
    static approcheNoneLinear(value, target, stepFunction) {
        const disatnce = target - value;
        const step = stepFunction(disatnce);
        return value > target ? Math.max(value - step, target) : Math.min(value + step, target);
    }

    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}
