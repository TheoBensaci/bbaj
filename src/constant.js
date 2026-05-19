import { GroundTile } from "./game/tile/groundTile.js";
import { JumpPadTile } from "./game/tile/jumpPadTile.js";
import { Slope } from "./game/tile/slope.js";
import { TileIndex } from "./game/tileSystem/tileIndexer.js";

export const GAME_UPDATE_INTERVAL=1;

//const lvlSquareSize=1;


// tile size in pixel
export const TILE_SIZE=20;


// world limit in tile pos
export const WORLD_LIMIT=[1000,255];

export const CAMERA_SPEED=20;
export const CAMERA_DEAD_ZONE=[100,300];

export const RENDER_RESOLUTION=[600,400];

export const PERLOADED_TEXTURE=[
    "./ressource/basicTileSet.png",
    "./ressource/completBasicTileSet.png",
    "./ressource/testPlayer.png"
];



// register all tile
TileIndex.createGroup("main");
TileIndex.registerTile("main",GroundTile);
TileIndex.registerTile("main",JumpPadTile);
TileIndex.registerTile("main",Slope);