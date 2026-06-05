import { GAMES_KEYS, GAME_UPDATE_INTERVAL, OTHER_KEYS, PERLOADED_TEXTURE, RENDER_RESOLUTION } from './constant.js';
import { Director } from './director.js';
import { Game } from './game/game.js';
import { Renderer } from './renderer/renderer.js';
import { UiManager } from './renderer/uiManager.js';
import { Editor } from './editor/editor.js';
import { initCanvas } from './utils/canvasUtils.js';
import { InputManager } from './utils/inputManager.js';
import { RessourceLoader } from './utils/ressouceLoader.js';
import { MathUtils } from './utils/utils.js';
import './ui/menu.js';
import { EditorWorld } from './editor/editorWorld.js';
import { getSaveItem, setSaveItem } from './utils/saveManager.js';
import { usernameGenerator } from './utils/utils.js';

const canvasContainer = document.getElementById('gameCanavas');

// load username
if(getSaveItem("username")===null){
    setSaveItem("username",usernameGenerator());
}

const game = new Game();
const editorWorld = new EditorWorld();

const uiManager = new UiManager(document.getElementById('ui'), document.getElementById('transition'));

const renderer = new Renderer(
    game,
    initCanvas(canvasContainer, RENDER_RESOLUTION[0], RENDER_RESOLUTION[1]),
    uiManager
);

const editor = new Editor(canvasContainer, editorWorld, renderer);

setInterval(() => {
    InputManager.update();
    if (Director.inEditor()) {
        editor.update();
    }
    game.step();
    Director.update();
    if (InputManager.getAction('toggleMode')?.justPressed) {
        if (Director.inEditor()) {
            editor.hidePreview();
            const data = editor.export();
            Director.loadLevel(data);
        } else {
            Director.switchSceen('editor');
        }
    }
}, GAME_UPDATE_INTERVAL);

function loop() {
    renderer.render();
    if (Director.inEditor()) {
        editor.renderOverlay(renderer.context);
    }
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// setUp director
Director.init(game, editorWorld, renderer);

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
    const gameCtx = InputManager.createContext('game');
    gameCtx.loadInputFromSave(GAMES_KEYS);
    gameCtx.addAction('toggleMode', ['Period']);
    // editor context
    const editorCtx = InputManager.createContext('editor');
    editorCtx.addAction('place', [], [0]);
    editorCtx.addAction('erase', [], [2]);
    editorCtx.addAction('pan', [], [1]);
    editorCtx.addAction('panModifier', ['Space']);
    editorCtx.addAction('rotate', ['KeyR']);
    editorCtx.addAction('exportLevel', ['Minus']);
    editorCtx.addAction('importLevel', ['Comma']);
    editorCtx.addAction('selectEraser', ['Digit0']);
    editorCtx.addAction('selectTile0', ['Digit1']);
    editorCtx.addAction('selectTile1', ['Digit2']);
    editorCtx.addAction('selectTile2', ['Digit3']);
    editorCtx.addAction('selectTile3', ['Digit4']);
    editorCtx.addAction('selectTile4', ['Digit5']);
    editorCtx.addAction('selectTile5', ['Digit6']);
    editorCtx.addAction('selectTile6', ['Digit7']);
    editorCtx.addAction('selectTile7', ['Digit8']);
    editorCtx.addAction('selectTile8', ['Digit9']);
    editorCtx.addAction('rect', ['ControlLeft', 'ControlRight']);
    editorCtx.addAction('toggleMode', ['Period']);
    // other contexts (empty for now)
    InputManager.createContext('loading');
    InputManager.createContext('main');

    Director.switchSceen('editor');
}
