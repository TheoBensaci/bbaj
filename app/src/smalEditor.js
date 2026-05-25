/**
!!!!!!!!!!!!!!! DEBUG, WILL BE DESTROY !!!!!!!!!!!!!!!
 */

import { RENDER_RESOLUTION, TILE_SIZE } from "./constant.js";
import { Director } from "./director.js";
import { TileIndex } from "./game/tileSystem/tileIndexer.js";
import { TEST_LEVEL_DATA } from "./testLevel.js";
import { Vector } from "./utils/vector.js";


export function initSmallEditor(canvas, editor, renderer) {
    let placedTile = -1;
    let lastPlacedPos = new Vector(-1, -1);
    let tileParams = {rotation: 0};

    let pos = new Vector(0, 0);

    const tilePreview = document.getElementById('tilePreview');

    function setTile(id) {
        if (id < 0) {
            tilePreview.hidden = true;
            placedTile = -1;
            return;
        }
        tilePreview.hidden = false;
        placedTile = id;

        console.log(TileIndex.getName('main', id));

        // set the image with the tile
        renderer.exportTileSprite(120, 120, (url) => {
            tilePreview.src = url;
        }, ['main',id,tileParams]);
    }

    window.addEventListener('keypress', (e) => {
        if (!Director.inEditor() && e.key === 'p') {
            Director.togglePauseGame(!Director.onPause());
        }

        if (Director.inEditor()) {
            if (e.key === 'd') {
                editor.moveCamera(10, 0);
            }
            if (e.key === 'w') {
                editor.moveCamera(0, -10);
            }
            if (e.key === 'a') {
                editor.moveCamera(-10, 0);
            }
            if (e.key === 's') {
                editor.moveCamera(0, 10);
            }

            if (e.key === '0') {
                setTile(-1);
            }
            if (e.key === '1') {
                setTile(0);
            }
            if (e.key === '2') {
                setTile(1);
            }
            if (e.key === '3') {
                setTile(2);
            }
            if (e.key === '4') {
                setTile(3);
            }
            if (e.key === '5') {
                setTile(4);
            }
            if (e.key === '6') {
                setTile(5);
            }
            if (e.key === '7') {
                setTile(6);
            }
            if(e.key==='8'){
                setTile(7);
            }
            if(e.key==='9'){
                setTile(8);
            }

            if (e.key === 'c') {
                editor.player.toggleFreeCam(true);
            }

            if (e.key === 'v') {
                editor.player.toggleFreeCam(false);
            }

            if (e.key === '-') {
                tilePreview.hidden = true;
                const data = editor.export();

                // copy the level into clip board
                navigator.clipboard.writeText('export const TEST_LEVEL_DATA ='+JSON.stringify(data, null, '\t')
                .replaceAll(
                    '],\n\t\'',
                    '],\n\n\t\''
                ));
                Director.loadLevel(data);
            }

            if (e.key === 'r') {
                tileParams.rotation = (tileParams.rotation + 1) % 4;
                setTile(placedTile);
            }

            if (e.key === ',') {
                Director.importLevel(TEST_LEVEL_DATA);
            }
        } else {
            if (e.key === '.') {
                tilePreview.hidden = false;
                Director.switchSceen('editor');
            }
        }
    });

    canvas.addEventListener('click', (e) => {
        if (lastPlacedPos.x === pos.x && lastPlacedPos.y === pos.y) {
            return;
        }

        if (placedTile < 0) {
            editor.setTile(pos.x, pos.y, null);
            return;
        }
        editor.setTile(pos.x, pos.y, ['main',placedTile,Object.assign({},tileParams)]);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!Director.inEditor()) return;

        // get tile position on screen from mouse pos
        const scaleX = window.innerWidth / RENDER_RESOLUTION[0];
        const scaleY = window.innerHeight / RENDER_RESOLUTION[1];

        const scale = Math.min(scaleX, scaleY);
        const rect = e.target.getBoundingClientRect();
        const targetPos = new Vector(e.clientX - rect.left, e.clientY - rect.top).scale(1/scale);
        const newPos = renderer
            .screenToWordPosition(targetPos)
            .scale(1/TILE_SIZE)
            .floor();
        if (newPos.x === pos.x && newPos.y === pos.y) {
            return;
        }

        pos.set(newPos);

        const posOnScreen = renderer.wordToScreenPosition(newPos.add(0.5, 0.5).scale(TILE_SIZE));

        tilePreview.style.top = posOnScreen.y + 'px';
        tilePreview.style.left = posOnScreen.x + 'px';
    });
}
