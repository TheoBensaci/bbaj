/**
 * @ Autheur: Theo Bensaci
 * @ Date: 17:22 18.05.2026
 * @ Description: The Director is use to manage the game 'Global state'
 * In nutshell, it's use to switch from editor mode, main menu and the actual game
 */

import { InputManager } from './utils/inputManager.js';

export class Director {
    // instance of the director
    static #inst = null;

    constructor(gameInstance, editorInstance, renderInstance) {
        this.game = gameInstance;
        this.editor = editorInstance;
        this.render = renderInstance;
        this.lastSceen = '';

        this.sceens = {
            'game': {
                in: (levelData = null) => {
                    this.render.world = this.game;

                    this.render.uiManager.clear();
                    this.render.setRenderJob({
                        background: true,
                        level: true,
                        player: true,
                        debug: true,
                    });
                    Director.setBackgroundColor(levelData.backgroundColor);
                    this.game.pause = false;
                    this.render.pause = false;
                },
                out: () => {
                    this.render.pause = false;
                },
            },
            'editor': {
                in: () => {
                    // ...
                    this.render.world = editorInstance;

                    this.editor.setCameraPosition(this.game.cameraPosition);

                    this.render.uiManager.clear();
                    this.render.setRenderJob({
                        background: true,
                        level: true,
                        player: false,
                        debug: true,
                        grid: true,
                    });
                    Director.setBackgroundColor('#333333');
                    this.render.pause = false;
                    this.game.pause = true;
                },
                out: () => {
                    // ...
                },
            },
            'loading': {
                in: () => {
                    this.render.uiManager.clear();
                    this.render.uiManager.toggle('loadingScreen');
                    this.render.setRenderJob({
                        background: true,
                    });
                    Director.setBackgroundColor('#19191a');
                    this.render.pause = false;
                },
                out: () => {
                    // ...
                },
            },
            'main': {
                in: () => {
                    this.render.uiManager.clear();
                    this.render.uiManager.toggle('mainMenu');
                    this.render.setRenderJob({
                        background: true,
                    });
                    Director.setBackgroundColor('#16162a');
                    this.render.pause = false;
                },
                out: () => {
                    // ...
                },
            },
        };
    }

    static init(gameInstance, editorInstance, renderInstance) {
        this.#inst = new Director(gameInstance, editorInstance, renderInstance);
    }

    static switchSceen(sceenName, ...params) {
        if (this.#inst.sceens[sceenName] === undefined) return;
        this.#inst.game.pause = true;
        Director.transition(() => {
            this.#inst.switchSceen(sceenName, ...params);
        });
    }

    static transition(callback) {
        this.#inst.render.uiManager.transition(callback);
    }

    static setSceen(sceenName, ...params) {
        if (this.#inst.sceens[sceenName] === undefined) return;
        this.#inst.switchSceen(sceenName, ...params);
    }

    static togglePauseGame(state) {
        this.#inst.game.pause = state;
        this.#inst.render.uiManager.toggle('pauseMenu', state);
        this.#inst.render.uiManager.toggle('blackBackground', state);
        this.#inst.render.pause = state;
    }

    static loadLevel(levelData) {
        Director.switchSceen('loading');
        // load level
        this.#inst.game.generateLevel(levelData, () => {
            Director.switchSceen('game', {backgroundColor: '#555555'});
        });
    }

    static importLevel(levelData) {
        // load level
        this.#inst.editor.import(levelData);
    }

    switchSceen(nextSceenName, ...params) {
        if (this.lastSceen !== '') this.sceens[this.lastSceen].out();
        InputManager.setActiveContext(nextSceenName);
        this.sceens[nextSceenName].in(...params);
        this.lastSceen = nextSceenName;
    }

    static setBackgroundColor(color) {
        this.#inst.render.setBackgroundColor(color);
    }

    static inEditor() {
        return this.#inst.lastSceen === 'editor';
    }

    static onPause() {
        return this.#inst.game.pause;
    }
}
