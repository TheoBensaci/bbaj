/**
 * @ Autheur: Theo Bensaci
 * @ Date: 19:58 18.05.2026
 * @ Description: Init menu bnt
 */

import { Director } from '../director.js';

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
    Director.switchSceen("editor",null);
};

document.getElementById('mainOnline').onclick = () => {
    Director.getUIManager().toggle('online', true);
    Director.getUIManager().toggle('mainMenu', false);
    Director.getUIManager().pushState();
};


document.getElementById('pauseOption').onclick = () => {
    Director.getUIManager().toggle('option', true);
    Director.getUIManager().toggle('pauseMenu', false);
    Director.getUIManager().pushState();
    console.log(Director.getUIManager());
};

document.getElementById('pauseBack').onclick = () => {
    Director.togglePauseGame(false);
};

document.getElementById('pauseMainMenu').onclick = () => {
    Director.switchSceen('main', null);
};
