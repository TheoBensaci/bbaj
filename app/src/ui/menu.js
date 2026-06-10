/**
 * @ Autheur: Theo Bensaci
 * @ Date: 19:58 18.05.2026
 * @ Description: Init menu bnt
 */

import { Director } from '../director.js';
import { Renderer } from '../renderer/renderer.js';
import { TEST_LEVEL_DATA } from '../testLevel.js';
import { fetchLevelFile, importFile, loadLevelFromFile } from '../utils/fileUtils.js';
import "./onlineMenu.js";
import "./optionMenu.js";

// back button
const uiConatiner = document.getElementById("ui");
const uiScrens = uiConatiner.getElementsByClassName("uiSceen");
for (const screen of uiScrens) {
    const backBnt = screen.getElementsByClassName("bntBack");
    for (const iterator of backBnt) {
        iterator.onclick = () => {
            Director.getUIManager().popState();
        };
    }
}

// =============== MAIN ===============
document.getElementById('mainLocal').onclick = () => {
    Director.switchSceen('game', {backgroundColor: '#ff0055'});
};
document.getElementById('mainOption').onclick = () => {
    Director.getUIManager().toggle('option', true);
    Director.getUIManager().toggle('mainMenu', false);
    Director.getUIManager().pushState();
};

document.getElementById('mainCredit').onclick = () => {
    Director.getUIManager().toggle('credit', true);
    Director.getUIManager().toggle('mainMenu', false);
    Director.getUIManager().pushState();
};

document.getElementById('mainLocal').onclick = () => {
    Director.getUIManager().toggle('local', true);
    Director.getUIManager().toggle('mainMenu', false);
    Director.getUIManager().pushState();
};

document.getElementById('mainEditor').onclick = () => {
    Director.setEditorQuickSwitch(true);
    Director.switchSceen("editor",false);
};

document.getElementById('mainOnline').onclick = () => {
    Director.getUIManager().toggle('online', true);
    Director.getUIManager().toggle('mainMenu', false);
    Director.getUIManager().pushState();
};

// =============== PAUSE ===============

document.getElementById('pauseOption').onclick = () => {
    Director.getUIManager().toggle('option', true);
    Director.getUIManager().toggle('pauseMenu', false);
    Director.getUIManager().pushState();
};

document.getElementById('pauseBack').onclick = () => {
    Director.togglePause(false);
};

document.getElementById('pauseMainMenu').onclick = () => {
    Director.switchSceen('main', null);
};


// =============== ONLINE ===============
const onlineCreateBnt = document.getElementById('onlineCreate');
onlineCreateBnt.onclick = () => {
    const baseText = onlineCreateBnt.innerHTML;
    onlineCreateBnt.disabled=true;
    // ... try to join room
    onlineCreateBnt.innerHTML='Connecting ...';
    Director.network().getMaps((data)=>{
        onlineCreateBnt.innerHTML=baseText;
        onlineCreateBnt.disabled=false;
        if(data===null)return;
        Director.getUIManager().toggle('createRoom', true);
        Director.getUIManager().toggle('online', false);
        Director.getUIManager().pushState();
    });
};

document.getElementById('onlineJoin').onclick = () => {
    Director.getUIManager().toggle('joinRoom', true);
    Director.getUIManager().toggle('online', false);
    Director.getUIManager().pushState();
};


// =============== LOCAL ===============
document.getElementById('localCampaign').onclick = () => {
    Director.switchSceen("loading");
    fetchLevelFile((data)=>{
        if(data===null)return;
        Director.loadLevel(data);
        Director.setEditorQuickSwitch(false);
    },"./ressource/levels/testLevel.json")
};

document.getElementById('localImport').onclick = () => {
    loadLevelFromFile((data)=>{
        if(data===null)return;
        Director.loadLevel(data);
        Director.setEditorQuickSwitch(false);
    });
};


// =============== TAB ===============

export function genTabElements(title,elements,onTitleClick=null){
    const titleNode =  document.getElementById("tabObjectTitle");
    titleNode.innerHTML=title;
    if(onTitleClick===null){
        titleNode.classList.remove("tabTitleEnable");
    }
    else{
        titleNode.classList.add("tabTitleEnable");
        titleNode.onclick=onTitleClick;
    }


    const list=document.getElementById("tabObjectList");
    list.innerHTML="";

    for (let index = 0; index < elements.length; index++) {
        const el = elements[index];
        //<div class="<div class="tabEntry"><label class="runPlacement">1</label><label class="runUsername">username</label><label class="runTime">00:10.022</label></div>"><label class="runPlacement">1</label><label class="runUsername">username</label><label class="runTime">00:10.022</label></div>
        const entry = document.createElement("div");
        entry.className="tabEntry";

        const placement = document.createElement("label");
        placement.className="runPlacement";
        placement.innerText=index+1;
        entry.appendChild(placement);

        const username = document.createElement("label");
        username.className="runUsername";
        username.innerText=el.username;
        entry.appendChild(username);

        const levelTime = document.createElement("label");
        levelTime.className="runTime";
        if(el.time===null){
            levelTime.innerText="...";
        }
        else{
            const time = Renderer.formatTime(el.time);
            levelTime.innerText=time[0]+":"+time[1]+"."+time[2];
        }
        entry.appendChild(levelTime);

        list.appendChild(entry);
    }
}

export function setTabThinking(){
    document.getElementById("tabObjectList").innerHTML="";
    document.getElementById("tabObjectTitle").innerHTML="...";
    document.getElementById("tabObjectTitle").classList.remove("tabTitleEnable");
}


// =============== FINISH ===============
document.getElementById('endReplay').onclick = () => {
    Director.resetGame();
};

document.getElementById('endMainMenu').onclick = () => {
    Director.switchSceen("main",null);
};


export function endSetTime(time){
    const timeValue = Renderer.formatTime(time);
    document.getElementById('endTime').innerText=timeValue[0]+":"+timeValue[1]+"."+timeValue[2];
}