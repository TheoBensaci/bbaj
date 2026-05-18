import { Director } from "../director.js"


document.getElementById("startGame").onclick=()=>{
    Director.switchSceen("game",null);
}


document.getElementById("goToMain").onclick=()=>{
    Director.switchSceen("main",null);
}