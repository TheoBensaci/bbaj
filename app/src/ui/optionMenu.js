import { InputManager } from "../utils/inputManager.js";

// gen keys
const controllesContainer = document.getElementById("controllesContainer");

export function genControls(){
    const gameContext = InputManager.getContext("game");
    controllesContainer.innerHTML="";
    for (const iterator of gameContext.actions) {
        const inp = document.createElement("div");
        const keys = document.createElement("div");
        const name = document.createElement("label");
        name.innerHTML=iterator[0];
        for (const key of iterator[1].keys) {
            const k = document.createElement("div");
            k.className="keyElement";
            k.innerHTML=key;
            keys.appendChild(k);
        }
        keys.className="keyList";
        inp.appendChild(name);
        inp.appendChild(keys);
        inp.className="inpuShower";
        controllesContainer.appendChild(inp);
    }
}