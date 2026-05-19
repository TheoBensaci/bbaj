import { Director } from "../director.js"


document.getElementById("startGame").onclick=()=>{
    Director.switchSceen("game",null);
}


document.getElementById("goToMain").onclick=()=>{
    Director.switchSceen("main",null);
}

document.getElementById("test_transi").onclick=()=>{
    Director.transition(()=>{
        console.log("test");
    });
}