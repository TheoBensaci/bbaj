export const GAME_UPDATE_INTERVAL = 10;
export const SERVER_HTTP_PROTO = window.location.protocol;
export const SERVER_ADDRESS = window.location.hostname;
export const SERVER_PORT = "3000";
export const REQUEST_TIMOUT=500;
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
    ['pause', ['Escape']]
];

export const GAMES_KEYS = [
    ['left', ['KeyA']],
    ['right', ['KeyD']],
    ['up', ['KeyW']],
    ['down', ['KeyS']],
    ['jump', ['Space', 'KeyK']],
    ['action', ['KeyJ']],
    ['respawn', ['KeyR']],
    ['reset', ['Delete']]
];

export const ONLINE_KEYS = [
    ['roomTime', ['Tab']]
];

export const EDITOR_KEYS = [
    ['place', [], [0]],
    ['erase', [], [2]],
    ['pan', [], [1]],
    ['panModifier', ['Space']],
    ['rotate', ['KeyR']],
    ['rect', ['ControlLeft', 'ControlRight']],
    ['toggleMode', ['Period']]
]

export const PERLOADED_TEXTURE=[
    "./ressource/basicTileSet.png",
    "./ressource/completBasicTileSet.png",
    "./ressource/testPlayer.png",
    "./ressource/testPlayerDash.png",
    "./ressource/testPlayerDead.png",
    "./ressource/testPlayer2.png",
    "./ressource/testPlayer3.png",
    "./ressource/customFruit.png",
    "./ressource/testSpike.png",
    "./ressource/checkPoint.png",
    "./ressource/faces.png",
    "./ressource/fallingTile.png",
    "./ressource/fallingTileReload.png"
];
