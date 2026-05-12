import { gameUpdateInterval, tileSize } from "./constant.js";
import { Game } from "./game/game.js";
import { Player } from "./game/player/player.js";
import { GroundTile } from "./game/tile/groundTile.js";
import { Slope } from "./game/tile/slope.js";
import { Tile } from "./game/tile/tile.js";
import { Renderer } from "./renderer/renderer.js";
import { initSmallEditor } from "./smalEditor.js";
import { Input } from "./utils/input.js";
import { RessourceLoader } from "./utils/ressouceLoader.js";
import { Shape } from "./utils/shape.js";
import { MathUtils } from "./utils/utils.js";
import { Vector } from "./utils/vector.js";

const canvas = document.getElementById("canvas");
const baseCanavasSize=[canvas.width, canvas.height];



function setCanvasScale(){
    return;
    const scaleX = (window.innerWidth - 100)/baseCanavasSize[0];
    const scaleY = (window.innerHeight - 100) /baseCanavasSize[1];

    const canvasContainer = document.getElementById("gameCanavas");
    canvasContainer.style.setProperty("--size",Math.min(scaleX,scaleY));
}

function init(){

    const game=new Game();
    const renderer=new Renderer(game,canvas);


    let pl = game.createPlayer();

    game.generateLevel(null);



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
    initSmallEditor(canvas,game,renderer);

}

let r = RessourceLoader.getRessourceLoader();
r.preload_Image(["./ressource/basicTileSet.png","./ressource/testPlayer.png"],()=>{
    init();
})