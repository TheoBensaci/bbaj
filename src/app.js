import { gameUpdateInterval, tileSize } from "./constant.js";
import { Game } from "./game/game.js";
import { Player } from "./game/player/player.js";
import { GroundTile } from "./game/tile/groundTile.js";
import { Slope } from "./game/tile/slope.js";
import { Tile } from "./game/tile/tile.js";
import { Renderer } from "./renderer/renderer.js";
import { initSmallEditor } from "./smalEditor.js";
import { init_canvas } from "./utils/canvasUtils.js";
import { Input } from "./utils/input.js";
import { RessourceLoader } from "./utils/ressouceLoader.js";
import { Shape } from "./utils/shape.js";
import { MathUtils } from "./utils/utils.js";
import { Vector } from "./utils/vector.js";



const canvasContainer = document.getElementById("gameCanavas");

function setCanvasScale(){
    const scaleX = window.innerWidth / canvas.width;
    const scaleY = window.innerHeight / canvas.height;

    const scaleToFit = Math.min(scaleX, scaleY);
    const scaleToCover = Math.max(scaleX, scaleY);

    canvasContainer.style.transformOrigin = "50 50"; // Scale from top left
    canvasContainer.style.transform = `scale(${scaleToFit})`;
}

function init(){

    const game=new Game();
    const renderer=new Renderer(
        game,
        init_canvas(canvasContainer,600,400),
        600,400
    );


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
    initSmallEditor(canvasContainer,game,renderer);

}

let r = RessourceLoader.getRessourceLoader();
r.preload_Image(["./ressource/basicTileSet.png","./ressource/testPlayer.png"],()=>{
    init();
})