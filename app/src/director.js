/**
 * @ Autheur: Theo Bensaci
 * @ Date: 17:22 18.05.2026
 * @ Description: The Director is use to manage the game 'Global state'
 * In nutshell, it's use to switch from editor mode, main menu and the actual game
 */

import { Editor } from './editor/editor.js';
import { PlayerD } from './game/player/playerD.js';
import { PlayerGhost } from './game/player/playerGhost.js';
import { NetworkSystem } from './network/networkSystem.js';
import { Renderer } from './renderer/renderer.js';
import { genTabElements as tabGenElement, setTabThinking, endSetTime } from './ui/menu.js';
import { optionKeyChangeEnd } from './ui/optionMenu.js';
import { InputManager } from './utils/inputManager.js';
import { Vector } from './utils/vector.js';

export class Director {
    // instance of the director
    static #inst = null;

    constructor(gameInstance, editorInstance, renderInstance,networkInstance) {
        this.game = gameInstance;
        this.editor = editorInstance;
        this.render = renderInstance;
        this.network = networkInstance;
        this.lastSceen = '';

        this.pause = false;
        this.pauseMenuBackState=0;

        // when on, we can switch between editor and game with a short cut
        this.editorQuickSwitch=false;

        // sceen
        this.sceens = {
            'game': {
                in: (levelData = null) => {
                    this.render.world = this.game;

                    this.render.uiManager.clear();

                    this.render.uiManager.toggle("inGame");

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
                in: (syncCam = true) => {
                    // TODO add settings to load a new level or contiune the last one
                    this.render.world = this.editor.world;

                    this.editor.tilePreview.hide(false);

                    this.editor.world.setCameraPosition(syncCam?this.game.cameraPosition:new Vector(0,0));

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
                    this.editor.tilePreview.hide(true);
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

                    if(Director.isOnline()){
                        this.network.quitRoom();
                    }

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

    /**
     * init the director
     * @param {Game} gameInstance
     * @param {Editor} editorInstance
     * @param {Renderer} renderInstance
     * @param {NetworkSystem} networkInstance
     */
    static init(gameInstance, editorInstance, renderInstance, networkInstance) {
        this.#inst = new Director(gameInstance, editorInstance, renderInstance,networkInstance);
    }

    /**
     * Switch sceen
     * @param {*} sceenName next sceen name
     * @param  {...any} params params given thoe the next sceen
     */
    static switchSceen(sceenName, ...params) {
        if (this.#inst.sceens[sceenName] === undefined) return;
        this.#inst.game.pause = true;
        this.#inst.pause=false;
        Director.transition(() => {
            this.#inst.switchSceen(sceenName, ...params);
        });
    }

    /**
     * Call a transition
     * @param {*} callback callback called in the middle of it
     */
    static transition(callback) {
        this.#inst.render.uiManager.transition(callback);
    }

    /**
     * Get the network system instance
     * @returns
     */
    static network(){
        return this.#inst.network;
    }

    /**
     * Set a sceen without any transition, raw
     * @param {*} sceenName
     * @param  {...any} params
     * @returns
     */
    static setSceen(sceenName, ...params) {
        if (this.#inst.sceens[sceenName] === undefined) return;
        this.#inst.switchSceen(sceenName, ...params);
    }

    /**
     * Toggle pause (for editor or game)
     * @param {*} state
     */
    static togglePause(state) {
        this.#inst.pause=state;
        if(state){
            // use to track the target state we need to go back when the pause menu will go off
            this.#inst.pauseMenuBackState=this.#inst.render.uiManager.menuStateStack.length-1;

            // if online hide when pause
            if(this.isOnline()){
                setTabThinking();
                this.#inst.render.uiManager.toggle('tab', true);
            }

            this.#inst.render.uiManager.toggle('pauseMenu', state);
            this.#inst.render.uiManager.toggle('blackBackground', state);
            this.#inst.render.uiManager.pushState();


        }
        else{
            // pop to the menu just befor the pause menu
            this.#inst.render.uiManager.popState(this.#inst.pauseMenuBackState);
            optionKeyChangeEnd();
        }
        if(this.#inst.lastSceen==='game'){
            this.#inst.game.pause = state;
        }
        this.#inst.render.pause = state;
    }

    /**
     * Is pause menu on
     * @returns {Boolean}
     */
    static isPause(){
        return this.#inst.pause;
    }

    /**
     * toggle the finish/end level screen
     * @param {*} state
     */
    static toggleEndScreen(state){
        if(state){
            endSetTime(this.#inst.game.levelTimer);
        }
        this.#inst.render.uiManager.toggle('blackBackground', state);
        this.#inst.render.uiManager.toggle('endScreen', state);
    }

    /**
     * Is end menu on
     * @returns {Boolean}
     */
    static onEndScreen(){
        return this.inGame() && this.#inst.game.levelState>1;
    }



    /**
     * Load a level into the game
     * @param {*} levelData level data
     */
    static loadLevel(levelData) {
        if(this.#inst.lastSceen!=="loading")Director.switchSceen('loading');

        const lvlData=levelData.data?levelData.data:[];
        const backgroundColor = levelData.backgroundColor?levelData.backgroundColor:'#555555';

        // load level
        this.#inst.game.generateLevel(lvlData, () => {
            Director.switchSceen('game', {backgroundColor: backgroundColor});
        });
    }

    /**
     * Import a level into the editor
     * @param {*} levelData
     */
    static importLevel(levelData) {
        // load level
        this.#inst.editor.import(levelData);
    }

    /**
     * actualy switch sceen
     * @param {*} nextSceenName
     * @param  {...any} params
     */
    switchSceen(nextSceenName, ...params) {
        if (this.lastSceen !== '') this.sceens[this.lastSceen].out();
        InputManager.setActiveContext(nextSceenName);
        this.sceens[nextSceenName].in(...params);
        this.lastSceen = nextSceenName;
    }

    /**
     * Set render background color
     * @param {*} color
     */
    setBackgroundColor(color) {
        this.render.setBackgroundColor(color);
    }

    /**
     * Is in editor
     * @returns
     */
    static inEditor() {
        return this.#inst.lastSceen === 'editor';
    }

    /**
     * Is in game
     * @returns
     */
    static inGame() {
        return this.#inst.lastSceen === 'game';
    }

    /**
     * Is online
     * @returns
     */
    static isOnline() {
        return this.#inst.network.socket!==null;
    }

    /** */
    static setEditorQuickSwitch(state){
        this.#inst.editorQuickSwitch=state;
    }


    static resetGame(){
        if(this.#inst.game.levelState>0){
            this.#inst.game.cleanSpawnPlayer();
        }
    }


    static getEditorQuickSwitch(){
        return this.#inst.editorQuickSwitch;
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
        if(this.#inst.render.uiManager.getScreenState("keyChange"))return;
        // check for special input
        if(InputManager.getContext("other").getAction("pause").justPressed && !this.onEndScreen()){
            Director.togglePause(!Director.onPause());
        }

        if(this.inGame() && !this.onPause() && InputManager.getContext("game").getAction("reset").justPressed ){
            this.resetGame();
            return;
        }

        if(!this.isPause() && this.isOnline() && this.inGame()){
            if(InputManager.getContext("online").getAction("roomTime").justPressed){
                setTabThinking();
                this.network().checkRoom(this.network().roomId,(data)=>{
                    if(data===null)return;
                    tabGenElement(
                        "code : "+this.network().roomId,
                        data.times.sort((a,b)=>{
                            if(a.time === null && b.time ===null)return 0;
                            if(a.time===null){
                                return 1;
                            }
                            if(b.time===null){
                                return -1;
                            }
                            return a.time-b.time;
                        })
                        ,(e)=>{
                            navigator.clipboard.writeText(this.network().roomId);
                        }
                    );
                });
                this.#inst.render.uiManager.toggle('tab', true);
            }
            if(InputManager.getContext("online").getAction("roomTime").justReleased){
                this.#inst.render.uiManager.toggle('tab', false);
            }
        }

        if(Director.getEditorQuickSwitch() && !this.onPause()){
            if (InputManager.getAction('toggleMode')?.justPressed) {
                if (Director.inEditor()) {
                    this.#inst.editor.hidePreview();
                    const data = this.#inst.editor.export();
                    Director.loadLevel(data);
                } else {
                    Director.switchSceen('editor');
                }
            }
        }
    }
}
