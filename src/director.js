/**
 * @ Autheur: Theo Bensaci
 * @ Date: 17:22 18.05.2026
 * @ Description: The Director is use to manage the game "Global state"
 * In nutshell, it's use to switch from editor mode, main menu and the actual game
 */



export class Director {
    static #instance=null;
    constructor(game_instance,editor_instance,render_instance){
        this.game = game_instance;
        this.editor = editor_instance;
        this.render = render_instance;
        this.lastSceen="";

        this.sceens = {
            "game" : {
                in : (generateNewLevel=true,levelData=null)=>{
                    if(generateNewLevel)this.game.generateLevel(levelData);
                    this.render.setUpGameRender();
                    this.game.pause=false;
                    this.render.pause=false;
                },
                out : ()=>{
                    this.render.pause=false;
                }
            },
            "editor" : {
                in : ()=>{
                    // ...
                },
                out : ()=>{
                    // ...
                }
            },
            "loading": {
                in : ()=>{
                    this.render.uiManager.clear();
                    this.render.uiManager.toggle("loadingScreen");
                    this.render.setRenderJob([true,false,false,false]);
                    Director.setBackgroundColor("#19191a");
                },
                out : ()=>{
                    // ...
                }
            },
            "main": {
                in : ()=>{
                    this.render.uiManager.clear();
                    this.render.uiManager.toggle("mainMenu");
                    this.render.setRenderJob([true,false,false,false]);
                    Director.setBackgroundColor("#16162a");
                },
                out : ()=>{
                    // ...
                }
            }
        }
    }

    static init(game_instance,editor_instance,render_instance){
        Director.#instance=new Director(game_instance,editor_instance,render_instance);
    }


    static switchSceen(sceenName,...params){
        if(Director.#instance.sceens[sceenName]===undefined)return;
        Director.#instance.render.uiManager.transition(()=>{
            Director.#instance.switchSceen(sceenName,...params);
        });
    }

    static setSceen(sceenName,...params){
        if(Director.#instance.sceens[sceenName]===undefined)return;
        Director.#instance.switchSceen(sceenName,...params);
    }

    static togglePauseGame(state){
        Director.#instance.game.pause=state;
        Director.#instance.render.togglePauseUI(state);
    }


    switchSceen(nextSceenName,...params){
        if(this.lastSceen!=="")this.sceens[this.lastSceen].out();
        this.sceens[nextSceenName].in(...params);
        this.lastSceen=nextSceenName;
    }

    static setBackgroundColor(color){
        Director.#instance.render.setBackgroundColor(color);
    }
}

