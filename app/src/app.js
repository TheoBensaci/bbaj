import { EDITOR_KEYS, GAMES_KEYS, GAME_UPDATE_INTERVAL, ONLINE_KEYS, OTHER_KEYS, PERLOADED_TEXTURE, RENDER_RESOLUTION, SERVER_ADDRESS, SERVER_HTTP_PROTO, SERVER_PORT } from './constant.js';
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
import { NetworkSystem } from './network/networkSystem.js';
import { fetchLevelFile } from './utils/fileUtils.js';
import { optionLoadOption } from './ui/optionMenu.js';
import { TileIndex, TILE_GROUP } from './game/tileSystem/tileIndexer.js';
import { GroundTile } from './game/tile/level/groundTile.js';
import { Slope } from './game/tile/level/slope.js';
import { OneWayPlatformTile } from './game/tile/level/oneWayPlatformTile.js';
import { SpikeTile, TriggerSpike } from './game/tile/level/spikeTile.js';
import { JumpPadTile } from './game/tile/level/jumpPadTile.js';
import { MovingPlatform } from './game/tile/level/movingPlatform.js';
import { PlayerCheckPointTile, PlayerSpawnTile } from './game/tile/other/playerSpawnTile.js';
import { FinishTile } from './game/tile/level/finishTile.js';

function registerTiles() {
    TileIndex.createGroup(TILE_GROUP.TERRAIN);
    TileIndex.registerTile(TILE_GROUP.TERRAIN, GroundTile);
    TileIndex.registerTile(TILE_GROUP.TERRAIN, Slope);
    TileIndex.registerTile(TILE_GROUP.TERRAIN, OneWayPlatformTile);

    TileIndex.createGroup(TILE_GROUP.HAZARDS);
    TileIndex.registerTile(TILE_GROUP.HAZARDS, SpikeTile);
    TileIndex.registerTile(TILE_GROUP.HAZARDS, TriggerSpike);

    TileIndex.createGroup(TILE_GROUP.MECHANICS);
    TileIndex.registerTile(TILE_GROUP.MECHANICS, JumpPadTile);
    TileIndex.registerTile(TILE_GROUP.MECHANICS, MovingPlatform);

    TileIndex.createGroup(TILE_GROUP.LOGIC);
    TileIndex.registerTile(TILE_GROUP.LOGIC, PlayerCheckPointTile);
    TileIndex.registerTile(TILE_GROUP.LOGIC, PlayerSpawnTile);
    TileIndex.registerTile(TILE_GROUP.LOGIC, FinishTile);
}

const canvasContainer = document.getElementById('gameCanavas');

// load username
if(getSaveItem("username")===null){
    setSaveItem("username",usernameGenerator());
}

const game = new Game();
const editorWorld = new EditorWorld();
const network = new NetworkSystem(SERVER_HTTP_PROTO,SERVER_ADDRESS,SERVER_PORT,game);

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
    // network
    network.update();
}, GAME_UPDATE_INTERVAL);

function loop() {
    renderer.render();
    if (Director.inEditor()) {
        editor.renderOverlay();
    }
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// setUp director
Director.init(game, editorWorld, renderer, editor, network);

Director.setSceen('loading');

Director.getUIManager().setOnOpen("option",()=>{
    optionLoadOption();
});

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
    registerTiles();

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
    editorCtx.loadInputFromSave(EDITOR_KEYS);
    // other contexts (empty for now)
    InputManager.createContext('loading');
    InputManager.createContext('main');
    InputManager.createContext('online').loadInputFromSave(ONLINE_KEYS);

    Director.switchSceen('main');
}
