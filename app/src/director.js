/**
 * @ Autheur: Theo Bensaci
 * @ Date: 17:22 18.05.2026
 * @ Description: The Director is use to manage the game 'Global state'
 * In nutshell, it's use to switch from editor mode, main menu and the actual game
 */

import { endKeyChange } from './ui/optionMenu.js';
import { InputManager } from './utils/inputManager.js';

export class Director {
    // instance of the director
    static #inst = null;

    constructor(gameInstance, editorInstance, renderInstance) {
        this.game = gameInstance;
        this.editor = editorInstance;
        this.render = renderInstance;
        this.lastSceen = '';

        this.pause = false;

        // when on, we can switch between editor and game with a short cut
        this.editorQuickSwitch=false;

        this.sceens = {
            'game': {
                in: (levelData = null) => {
                    this.render.world = this.game;

                    this.render.uiManager.clear();
                    this.render.uiManager.pushState();
                    this.render.setRenderJob({
                        background: true,
                        level: true,
                        player: true,
                        debug: true,
                    });
                    this.setBackgroundColor(levelData.backgroundColor);
                    this.game.pause = false;
                    this.render.pause = false;
                },
                out: () => {
                    this.render.pause = false;
                },
                globalInput:true
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
                    this.setBackgroundColor('#333333');
                    this.render.pause = false;
                    this.game.pause = true;
                },
                out: () => {
                    // ...
                },
                globalInput:true
            },
            'loading': {
                in: () => {
                    this.render.uiManager.clear();
                    this.render.uiManager.toggle('loadingScreen');
                    this.render.setRenderJob({
                        background: true,
                    });
                    this.setBackgroundColor('#19191a');
                    this.render.pause = false;
                },
                out: () => {
                    // ...
                },
                globalInput:false
            },
            'main': {
                in: () => {
                    this.render.uiManager.clear();
                    this.render.uiManager.toggle('mainMenu');
                    this.render.uiManager.pushState();
                    this.render.setRenderJob({
                        background: true,
                    });
                    this.setBackgroundColor('#16162a');
                    this.render.pause = false;
                },
                out: () => {
                    // ...
                },
                globalInput:false
            },
        };
    }

    static init(gameInstance, editorInstance, renderInstance) {
        this.#inst = new Director(gameInstance, editorInstance, renderInstance);
    }

    static switchSceen(sceenName, ...params) {
        if (this.#inst.sceens[sceenName] === undefined) return;
        this.#inst.game.pause = true;
        this.#inst.pause=false;
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

    static togglePause(state) {
        this.#inst.pause=state;
        if(state){
            this.#inst.render.uiManager.toggle('pauseMenu', state);
            this.#inst.render.uiManager.toggle('blackBackground', state);
            this.#inst.render.uiManager.pushState();
        }
        else{
            this.#inst.render.uiManager.clear();
            endKeyChange();
        }
        if(this.#inst.lastSceen==='game'){
            this.#inst.game.pause = state;
        }
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

    setBackgroundColor(color) {
        this.render.setBackgroundColor(color);
    }

    static inEditor() {
        return this.#inst.lastSceen === 'editor';
    }

    static setEditorQuickSwitch(state){
        this.#inst.editorQuickSwitch=state;
    }

    static onPause() {
        return this.#inst.pause;
    }


    static getUIManager(){
        return this.#inst.render.uiManager;
    }

    static update(){
        if(this.#inst===null)return;

        if(!this.#inst.sceens[this.#inst.lastSceen].globalInput)return;

        // check if we are not in the input settings screen
        if(this.#inst.render.uiManager.getState("keyChange"))return;

        // check for special input
        if(InputManager.getContext("other").getAction("pause").justPressed){
            Director.togglePause(!Director.onPause());
        }

        if(this.#inst.editorQuickSwitch && !Director.onPause()){

        }
    }
}
