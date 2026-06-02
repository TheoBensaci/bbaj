import { MAX_NUMBER_OF_KEY_INPUT } from "../constant.js";
import { Director } from "../director.js";
import { InputManager } from "../utils/inputManager.js";
import { setSaveInputKey } from "../utils/saveManager.js";

// gen keys
const controllesContainer = document.getElementById("controllesContainer");


const keyLists=document.getElementById("keyChangeList");
let keyChangeKeyLists=[];

function updateKeyList(newKeyLists){
    keyLists.innerHTML="";
    for (const iterator of newKeyLists) {
        const k = document.createElement("div");
        k.className="keyElement";
        k.innerHTML=iterator;
        keyLists.appendChild(k);
    }
}

document.getElementById("keyChange").addEventListener("keyup",(e)=>{
    console.log(keyChangeKeyLists);
    const i = keyChangeKeyLists.indexOf(e.code)
    if(i>=0){
        keyChangeKeyLists.splice(i,1);
        updateKeyList(keyChangeKeyLists);
        return;
    }
    if(keyChangeKeyLists.length>=MAX_NUMBER_OF_KEY_INPUT)return;
    keyChangeKeyLists.push(e.code);
    updateKeyList(keyChangeKeyLists);
});

export function endKeyChange(){
    document.getElementById("keyChange").tabIndex=-10;
    document.activeElement.blur();
}

export function keyChangeMenu(context,actionName){
    Director.getUIManager().toggle('option', false);
    Director.getUIManager().toggle('keyChange', true);
    Director.getUIManager().pushState();

    keyChangeKeyLists=context.getAction(actionName).keys;
    updateKeyList(keyChangeKeyLists);

    document.getElementById("keyChange").getElementsByTagName("h2")[0].innerText=actionName;

    document.getElementById("keyChange").tabIndex=1;
    document.getElementById("keyChange").focus();



    document.getElementById("keyChangeSave").onclick=(e)=>{
        context.getAction(actionName).keys=keyChangeKeyLists;
        setSaveInputKey(context.name,actionName,keyChangeKeyLists);
        genControls();
        endKeyChange();
        Director.getUIManager().popState();
    }

    document.getElementById("keyChangeBack").onclick = (e)=>{
        endKeyChange();
        Director.getUIManager().popState();
    }
}

export function genControls(){
    const contextUse = ["other","game","editor"];
    controllesContainer.innerHTML="";
    for (const contextName of contextUse) {
        const context = InputManager.getContext(contextName);
        let title = document.createElement("h4");
        title.innerText=contextName;
        controllesContainer.appendChild(title);
        for (const iterator of context.actions) {
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
            inp.onclick=(e)=>{
                keyChangeMenu(context,iterator[0]);
            }

            controllesContainer.appendChild(inp);
        }
    }
}