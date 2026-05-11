import { gameUpdateInterval, tileSize } from "./constant.js";
import { Game } from "./game/game.js";
import { Player } from "./game/player/player.js";
import { GroundTile } from "./game/tile/groundTile.js";
import { Slope } from "./game/tile/slope.js";
import { Tile } from "./game/tile/tile.js";
import { Renderer } from "./renderer/renderer.js";
import { Input } from "./utils/input.js";
import { RessourceLoader } from "./utils/ressouceLoader.js";
import { Shape } from "./utils/shape.js";
import { MathUtils } from "./utils/utils.js";
import { Vector } from "./utils/vector.js";

const canvas = document.getElementById("canvas");
const baseCanavasSize=[canvas.width, canvas.height];
console.log(baseCanavasSize);

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
    canvas.addEventListener("click",(e)=>{
        const rect = e.target.getBoundingClientRect();
        const pos = renderer
            .screenToWordPosition(new Vector(e.clientX - rect.left,e.clientY - rect.top))
            .scale(1/tileSize)
            .floor();
        const tile = (Input.action.pressed)?new Slope():new GroundTile()
        game.setTile(pos.x,pos.y,tile.setPos(game.getTilePos(pos.x,pos.y)));
        console.log(game.level);
    });


    const continuseMap=renderer.getTileRenderContinuseMap(3*tileSize,10*tileSize);

    console.log(continuseMap);
    console.log(continuseMap[0][1], continuseMap[2][0], continuseMap[1][0], continuseMap[1][2]);
}

let r = RessourceLoader.getRessourceLoader();
r.preload_Image(["./ressource/basicTileSet.png","./ressource/testPlayer.png"],()=>{
    init();
})