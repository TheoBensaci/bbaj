import { GAME_UPDATE_INTERVAL, PERLOADED_TEXTURE, RENDER_RESOLUTION } from "./constant.js";
import { Director } from "./director.js";
import { Game } from "./game/game.js";
import { Renderer } from "./renderer/renderer.js";
import { UiManager } from "./renderer/uiManager.js";
import { initSmallEditor } from "./smalEditor.js";
import { init_canvas } from "./utils/canvasUtils.js";
import { Input } from "./utils/input.js";
import { RessourceLoader } from "./utils/ressouceLoader.js";
import { MathUtils } from "./utils/utils.js";

import "./ui/menu.js";



const canvasContainer = document.getElementById("gameCanavas");

const game=new Game();

const uiManager = new UiManager(document.getElementById("ui"));

const renderer=new Renderer(
    game,
    init_canvas(canvasContainer,RENDER_RESOLUTION[0],RENDER_RESOLUTION[1]),
    uiManager
);

setInterval(() => {
    game.step();
}, GAME_UPDATE_INTERVAL);



function loop() {
    renderer.render();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);


// setUp director
Director.init(game,null,renderer);

Director.switchSceen("loading");

// set up ressource loader
RessourceLoader.getRessourceLoader().preload_Image(PERLOADED_TEXTURE,()=>{
    init();
});

// add canvas fitting
window.addEventListener("resize", (event) => {
    setCanvasScale();
});
setCanvasScale();





function setCanvasScale(){
    const scaleX = (window.innerWidth) / (RENDER_RESOLUTION[0]);
    const scaleY = (window.innerHeight) / (RENDER_RESOLUTION[1]);

    const scale = Math.min(scaleX, scaleY);

    //canvasContainer.style.transformOrigin = "50 50"; // Scale from top left
    canvasContainer.style.transform = `scale(${scale})`;
}

function init(){

    Director.switchSceen("game",true,null);


    Input.init(window);


    // add debug click
    initSmallEditor(canvasContainer,game,renderer);

}