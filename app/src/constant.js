import { GroundTile } from './game/tile/groundTile.js';
import { JumpPadTile } from './game/tile/jumpPadTile.js';
import { MovingPlatform } from './game/tile/movingPlatform.js';
import { OneWayPlatformTile } from './game/tile/oneWayPlatformTile.js';
import { Slope } from './game/tile/slope.js';
import { SpikeTile, TriggerSpike } from './game/tile/spikeTile.js';
import { TileIndex } from './game/tileSystem/tileIndexer.js';

export const GAME_UPDATE_INTERVAL = 10;

//const lvlSquareSize=1;

// tile size in pixel
export const TILE_SIZE = 20;

// world limit in tile pos
export const WORLD_LIMIT = [1000, 255];

export const CAMERA_SPEED = [10, 10];
export const CAMERA_DEAD_ZONE = [100, 300];

export const RENDER_RESOLUTION = [600, 400];

export const PERLOADED_TEXTURE = [
    './ressource/basicTileSet.png',
    './ressource/completBasicTileSet.png',
    './ressource/testPlayer.png',
    './ressource/testPlayer2.png',
    './ressource/testPlayer3.png',
    './ressource/customFruit.png',
    './ressource/testSpike.png',
];

// register all tile
TileIndex.createGroup('main');
TileIndex.registerTile('main', GroundTile);
TileIndex.registerTile('main', JumpPadTile);
TileIndex.registerTile('main', Slope);
TileIndex.registerTile('main', MovingPlatform);
TileIndex.registerTile('main', SpikeTile);
TileIndex.registerTile('main', TriggerSpike);
TileIndex.registerTile('main', OneWayPlatformTile);
