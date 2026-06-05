import { FinishTile } from "./game/tile/level/finishTile.js";
import { GroundTile } from "./game/tile/level/groundTile.js";
import { JumpPadTile } from "./game/tile/level/jumpPadTile.js";
import { MovingPlatform } from "./game/tile/level/movingPlatform.js";
import { OneWayPlatformTile } from "./game/tile/level/oneWayPlatformTile.js";
import { Slope } from "./game/tile/level/slope.js";
import { SpikeTile, TriggerSpike } from "./game/tile/level/spikeTile.js";
import { PlayerCheckPointTile, PlayerSpawnTile } from "./game/tile/other/playerSpawnTile.js";
import { TileIndex } from "./game/tileSystem/tileIndexer.js";

export const GAME_UPDATE_INTERVAL = 10;
export const SERVER_ADDRESS = "127.0.0.1";
export const SERVER_PORT = "80";

//const lvlSquareSize=1;

// tile size in pixel
export const TILE_SIZE = 20;

// world limit in tile pos
export const WORLD_LIMIT = [1000, 255];

export const CAMERA_SPEED = [10, 10];
export const CAMERA_DEAD_ZONE = [100, 300];

export const RENDER_RESOLUTION = [600, 400];

export const MAX_NUMBER_OF_KEY_INPUT=5;

export const OTHER_KEYS = [
    ['pause', ['Escape']],
    ['debug', ['KeyP']]
]

export const GAMES_KEYS = [
    ['left', ['KeyA']],
    ['right', ['KeyD']],
    ['up', ['KeyW']],
    ['down', ['KeyS']],
    ['jump', ['Space', 'KeyK']],
    ['action', ['KeyJ']],
    ['respawn', ['KeyR']],
    ['reset', ['Delete']]
]

export const PERLOADED_TEXTURE=[
    "./ressource/basicTileSet.png",
    "./ressource/completBasicTileSet.png",
    "./ressource/testPlayer.png",
    "./ressource/testPlayer2.png",
    "./ressource/testPlayer3.png",
    "./ressource/customFruit.png",
    "./ressource/testSpike.png",
    "./ressource/checkPoint.png",
    "./ressource/faces.png"
];

// register all tile
TileIndex.createGroup("main");
TileIndex.registerTile("main",GroundTile);
TileIndex.registerTile("main",JumpPadTile);
TileIndex.registerTile("main",Slope);
TileIndex.registerTile("main",MovingPlatform);
TileIndex.registerTile("main",SpikeTile);
TileIndex.registerTile("main",TriggerSpike);
TileIndex.registerTile("main",OneWayPlatformTile);
TileIndex.registerTile("main",PlayerCheckPointTile);
TileIndex.registerTile("main",PlayerSpawnTile);
TileIndex.registerTile("main",FinishTile);