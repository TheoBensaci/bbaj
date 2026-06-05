import { GAMES_KEYS, GAME_UPDATE_INTERVAL, OTHER_KEYS, PERLOADED_TEXTURE, RENDER_RESOLUTION, SERVER_ADDRESS, SERVER_PORT } from './constant.js';
import { Director } from './director.js';
import { Game } from './game/game.js';
import { Renderer } from './renderer/renderer.js';
import { UiManager } from './renderer/uiManager.js';
import { initSmallEditor } from './smalEditor.js';
import { initCanvas } from './utils/canvasUtils.js';
import { InputManager } from './utils/inputManager.js';
import { RessourceLoader } from './utils/ressouceLoader.js';
import './ui/menu.js';
import { EditorWorld } from './editor/editorWorld.js';
import { getSaveItem, setSaveItem } from './utils/saveManager.js';
import { usernameGenerator } from './utils/utils.js';
import { NetworkSystem } from './network/networkSystem.js';

const canvasContainer = document.getElementById('gameCanavas');

// load username
if(getSaveItem("username")===null){
    setSaveItem("username",usernameGenerator());
}

const game = new Game();
const editor = new EditorWorld();
const network = new NetworkSystem(SERVER_ADDRESS,SERVER_PORT,game);

const uiManager = new UiManager(document.getElementById('ui'), document.getElementById('transition'));

const renderer = new Renderer(
    game,
    initCanvas(canvasContainer, RENDER_RESOLUTION[0], RENDER_RESOLUTION[1]),
    uiManager
);

setInterval(() => {
    InputManager.update();
    game.step();
    Director.update();

    // network
    network.update();

}, GAME_UPDATE_INTERVAL);

function loop() {
    renderer.render();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// setUp director
Director.init(game, editor, renderer,network);

Director.setSceen('loading');

// set up ressource loader
RessourceLoader.getInstance().preloadImage(PERLOADED_TEXTURE, () => {
    init();
});

// add canvas fitting
window.addEventListener('resize', (event) => {
    setCanvasScale();
});
setCanvasScale();

function setCanvasScale() {
    const scaleX = window.innerWidth / RENDER_RESOLUTION[0];
    const scaleY = window.innerHeight / RENDER_RESOLUTION[1];

    const scale = Math.min(scaleX, scaleY);

    //canvasContainer.style.transformOrigin = '50 50'; // Scale from top left
    canvasContainer.style.transform = `scale(${scale})`;
}

function init() {
    InputManager.init(window, canvasContainer);

    InputManager.createContext('other').loadInputFromSave(OTHER_KEYS);

    // --- input definitions per context ---
    // NOTE(sss): might be useful to have an init method for the "scenes" for
    //            this kind of stuff...

    // game context
    InputManager.createContext('game').loadInputFromSave(GAMES_KEYS);

    // editor context (empty for now as the "real" final editor is being worked
    // on on the side.
    InputManager.createContext('editor');

    // other contexts (empty for now), we may not need them at all
    InputManager.createContext('loading');
    InputManager.createContext('main');

    Director.switchSceen('main');

    // add debug click
    initSmallEditor(canvasContainer, editor, renderer);
}
