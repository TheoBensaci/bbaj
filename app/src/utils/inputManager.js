import { RENDER_RESOLUTION } from '../constant.js';
import { getSaveInputKey } from './saveManager.js';
import { Vector } from './vector.js';

/**
 * @description: A single input action with key and mouse bindings.
 * Tracks pressed, justPressed, and justReleased states per update cycle.
 */
export class InputAction {
    constructor(keys = [], mouseButtons = []) {
        this.keys = keys;
        this.mouseButtons = mouseButtons;
        this.pressed = false;
        this.justPressed = false;
        this.justReleased = false;
        this._wasPressed = false;
    }
}

/**
 * @description: A collection of InputActions for a specific scene or mode.
 */
export class InputContext {
    constructor(name) {
        this.name = name;
        this.actions = new Map();
    }

    addAction(name, keys = [], mouseButtons = []) {
        this.actions.set(name, new InputAction(keys, mouseButtons));
    }

    getAction(name) {
        return this.actions.get(name);
    }

    loadInputFromSave(defaultActions){
        for (const iterator of defaultActions) {
            this.addAction(iterator[0],getSaveInputKey(this.name,iterator[0])?getSaveInputKey(this.name,iterator[0]):iterator[1]);
        }
    }
}

/**
 * @description: Singleton input manager. Owns global listeners, manages contexts,
 * and provides action "queries" per scene.
 */
export class InputManager {
    static #contexts = new Map();
    static #active = null;
    static #keysPressed = new Set();
    static #mouseButtonsPressed = new Set();
    static #mousePos = new Vector(0, 0);
    static #mouseDelta = new Vector(0, 0);
    static #initialized = false;

    static init(window, canvas) {
        if (this.#initialized) return;
        this.#initialized = true;

        window.addEventListener('keydown', (e) => {
            this.#keysPressed.add(e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.#keysPressed.delete(e.code);
        });

        if (canvas) {
            canvas.addEventListener('mousedown', (e) => {
                this.#mouseButtonsPressed.add(e.button);
            });

            canvas.addEventListener('mouseup', (e) => {
                this.#mouseButtonsPressed.delete(e.button);
            });

            canvas.addEventListener('mousemove', (e) => {
                this.#updateMousePos(e, canvas);
            });

            canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        }
    }

    static #updateMousePos(e, canvas) {
        const scaleX = window.innerWidth / RENDER_RESOLUTION[0];
        const scaleY = window.innerHeight / RENDER_RESOLUTION[1];
        const scale = Math.min(scaleX, scaleY);
        const rect = canvas.getBoundingClientRect();
        const newX = (e.clientX - rect.left) / scale;
        const newY = (e.clientY - rect.top) / scale;
        this.#mouseDelta.set(newX - this.#mousePos.x, newY - this.#mousePos.y);
        this.#mousePos.set(newX, newY);
    }

    static createContext(name) {
        const ctx = new InputContext(name);
        this.#contexts.set(name, ctx);
        return ctx;
    }

    static getContext(name){
        return this.#contexts.get(name);
    }

    static setActiveContext(name) {
        this.#active = this.#contexts.get(name) || null;
    }

    static getAction(name) {
        if (!this.#active) return null;
        return this.#active.getAction(name);
    }

    static getMousePosition() {
        return this.#mousePos.clone();
    }

    static getMouseDelta() {
        const d = this.#mouseDelta.clone();
        this.#mouseDelta.set(0, 0);
        return d;
    }

    static isMouseButtonPressed(button) {
        return this.#mouseButtonsPressed.has(button);
    }

    static update() {
        for (const context of this.#contexts.values()) {
            for (const action of context.actions.values()) {
                const isKeyPressed = action.keys.some((k) => this.#keysPressed.has(k));
                const isMousePressed = action.mouseButtons.some((b) => this.#mouseButtonsPressed.has(b));
                const isPressed = isKeyPressed || isMousePressed;

                action.pressed = isPressed;
                action.justPressed = isPressed && !action._wasPressed;
                action.justReleased = !isPressed && action._wasPressed;
                action._wasPressed = isPressed;
            }
        }
    }
}
