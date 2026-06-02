/**
 * @ Autheur: Theo Bensaci
 * @ Date: 19:58 18.05.2026
 * @ Description: Init menu bnt
 */

import { Director } from '../director.js';
import { TEST_LEVEL_DATA } from '../testLevel.js';
import { importFile, loadLevelFromFile } from '../utils/fileUtils.js';
import "./joinRoomMenu.js";
import "./optionMenu.js";
import { genControls } from './optionMenu.js';

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
    genControls();
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
    Director.switchSceen("editor",null);
};

document.getElementById('mainOnline').onclick = () => {
    Director.getUIManager().toggle('online', true);
    Director.getUIManager().toggle('mainMenu', false);
    Director.getUIManager().pushState();
};

// =============== OPTION ===============

document.getElementById('pauseOption').onclick = () => {
    Director.getUIManager().toggle('option', true);
    genControls();
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
document.getElementById('onlineCreate').onclick = () => {
    Director.getUIManager().toggle('createRoom', true);
    Director.getUIManager().toggle('online', false);
    Director.getUIManager().pushState();
};

document.getElementById('onlineJoin').onclick = () => {
    Director.getUIManager().toggle('joinRoom', true);
    Director.getUIManager().toggle('online', false);
    Director.getUIManager().pushState();
};


// =============== LOCAL ===============
document.getElementById('localCampaign').onclick = () => {
    Director.loadLevel(TEST_LEVEL_DATA);
    Director.setEditorQuickSwitch(false);
};

document.getElementById('localImport').onclick = () => {
    loadLevelFromFile((data)=>{
        if(data===null)return;
        Director.loadLevel(data);
        Director.setEditorQuickSwitch(false);
    });
};