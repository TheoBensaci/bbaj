import { gameUpdateInterval, renderResolution, tileSize } from "./constant.js";
import { Game } from "./game/game.js";
import { Player } from "./game/player/player.js";
import { GroundTile } from "./game/tile/groundTile.js";
import { JumpPadTile } from "./game/tile/jumpPadTile.js";
import { Slope } from "./game/tile/slope.js";
import { Tile } from "./game/tileSystem/tile.js";
import { TileIndex } from "./game/tileSystem/tileIndexer.js";
import { Renderer } from "./renderer/renderer.js";
import { initSmallEditor } from "./smalEditor.js";
import { init_canvas } from "./utils/canvasUtils.js";
import { Input } from "./utils/input.js";
import { RessourceLoader } from "./utils/ressouceLoader.js";
import { Shape, ShapeType } from "./utils/shape.js";
import { MathUtils } from "./utils/utils.js";
import { Vector } from "./utils/vector.js";

// register tile
TileIndex.createGroup("main");
TileIndex.registerTile("main",GroundTile);
TileIndex.registerTile("main",JumpPadTile);
TileIndex.registerTile("main",Slope);


const canvasContainer = document.getElementById("gameCanavas");

const t_shape = Shape.createShape(ShapeType.SQUARE);


function setCanvasScale(){
    const scaleX = (window.innerWidth) / (renderResolution[0]);
    const scaleY = (window.innerHeight) / (renderResolution[1]);

    const scaleToFit = Math.min(scaleX, scaleY);
    const scaleToCover = Math.max(scaleX, scaleY);

    //canvasContainer.style.transformOrigin = "0 0"; // Scale from top left
    canvasContainer.style.transform = `scale(${scaleToFit})`;
}

function init(){

    const game=new Game();
    const renderer=new Renderer(
        game,
        init_canvas(canvasContainer,renderResolution[0],renderResolution[1]),
        600,400
    );


    let pl = game.createPlayer();

    game.generateLevel(null);

    console.log("test");
    game.getTileContactMap(3*tileSize,15*tileSize,GroundTile);




    setInterval(() => {
        game.step();
    }, gameUpdateInterval);


    setCanvasScale();




    function loop() {
        renderer.render();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    Input.init(window);

    // add canvas fitting
    window.addEventListener("resize", (event) => {
        setCanvasScale();
    })


    // add debug click
    initSmallEditor(canvasContainer,game,renderer);

}

let r = RessourceLoader.getRessourceLoader();
r.preload_Image(["./ressource/basicTileSet.png","./ressource/completBasicTileSet.png","./ressource/testPlayer.png"],()=>{
    init();
})