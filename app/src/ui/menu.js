/**
 * @ Autheur: Theo Bensaci
 * @ Date: 19:58 18.05.2026
 * @ Description: Init menu bnt
 */

import { Director } from '../director.js';

document.getElementById('mainLocal').onclick = () => {
    Director.switchSceen('game', {backgroundColor: '#ff0055'});
};
document.getElementById('mainOption').onclick = () => {
    Director.getUIManager().toggle('option', true);
    Director.getUIManager().toggle('mainMenu', false);
    Director.getUIManager().pushState();
};

document.getElementById('mainOnline').onclick = () => {
    Director.switchSceen('game', {backgroundColor: '#ff0055'});
};


document.getElementById('optionBack').onclick = () => {
    Director.getUIManager().popState();
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