/**
 * @ Autheur: Theo Bensaci
 * @ Date: 19:58 18.05.2026
 * @ Description: Init menu bnt
 */

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