
//#region Auto tiling

import { TILE_SIZE } from "../../constant.js";
import { RessourceLoader } from "../../utils/ressouceLoader.js";
import { Vector } from "../../utils/vector.js";

export const CONTACT_TILE_MASK_MAP=[
    [0x80,0x40,0x20],
    [0x10,0x00,0x08],
    [0x04,0x02,0x01]
];


/*
    NOTE :
    000 01 011 => 0b00001011
        0 0 0
        1   1
        0 1 0
*/

// base on https://camo.githubusercontent.com/4b0c86c058e7b44ca64d413ddc46efaab568e984af661fc6cee2d36275e93c06/68747470733a2f2f6d61646469653438302e6f76682f696d672f616e6e6f74617465645f76616e696c6c615f74656d706c6174652e706e67
const CELEST_FORMAT_AUTOTILING=[
    [0xFF,[5,0]],       // 111 11 111 | inner ground

    [0xFE,[4,0]],       // 111 11 110 | Right lower innercorner
    [0xDF,[4,1]],       // 110 11 110 | Right upper innercorner
    [0xFB,[4,2]],       // 111 11 011 | Left lower innercorner
    [0x7F,[4,3]],       // 011 11 111 | Right upper innercorner

    [0xDE,[4,4]],       // 110 11 110 | Right upper and lower innercorner
    [0x7B,[4,6]],       // 011 11 011 | Left upper and lower innercorner
    [0x5F,[4,5]],       // 010 11 111 | Left upper and right upper innercorner
    [0xFA,[4,7]],       // 111 11 010 | Left lower and right lower innercorner
    [0x7E,[4,14]],      // 011 11 110 | Right upper and left lower innercorner
    [0xDB,[4,13]],      // 110 11 011 | Left upper and right lower innercorner

    [0x5E,[4,8]],       // 010 11 110 | Left upper, right upper and right lower innercorner
    [0x5B,[4,9]],       // 010 11 011 | Left upper, right upper and left lower innercorner
    [0x7A,[4,10]],      // 011 11 010 | Left upper, right lower and left lower innercorner
    [0xDA,[4,11]],      // 110 11 010 | Right upper, right lower and left lower innercorner
    [0x5A,[4,12]],      // 010 11 010 | Right upper, right lower, left lower and left upper innercorner

    [0x1F,[0,0]],       // 000 11 111 | Top edege
    [0xF8,[0,1]],       // 111 11 000 | Down edge
    [0x6B,[0,3]],       // 011 01 011 | Left side edge
    [0xD6,[0,2]],       // 110 10 110 | Right side edge

    [0x4B,[2,16]],      // 010 01 011 | Left edge and right upper innercorner
    [0x1E,[3,16]],      // 000 11 110 | Top edge and right lower innercorner
    [0xD2,[4,16]],      // 110 10 010 | Right edge and left lower innercorner
    [0x78,[5,16]],      // 011 11 000 | Bottom edge and left upper innercorner

    [0x6A,[0,17]],      // 011 01 010 | Right edge and left upper innercorner
    [0x1B,[1,17]],      // 000 11 011 | Top edge and left lower innercorner
    [0x56,[2,17]],      // 010 10 110 | left edge and right lower innercorner
    [0xD8,[3,17]],      // 110 11 000 | Bottom edge and right upper innercorner

    [0x0B,[0,11]],      // 000 01 011 | Upper left corner
    [0x16,[0,12]],      // 000 10 110 | Upper right corner
    [0x68,[0,13]],      // 011 01 000 | Lower left corner
    [0xD0,[0,14]],      // 110 10 000 | Lower right corner

    [0x1A,[4,15]],      // 000 11 010 | Top edge, left lower and right lower innercorner
    [0x58,[5,15]],      // 010 11 000 | Bottom edge, left upper and right upper innercorner
    [0x4A,[0,16]],      // 010 01 010 | Right edge, left lower and left upper innercorner
    [0x52,[1,16]],      // 010 10 010 | Left edge, right lower and right upper innercorner

    [0x0A,[0,15]],      // 000 01 010 | Upper left coner and right lower innercorner
    [0x12,[1,15]],      // 000 10 010 | Upper right corner and left innercorner
    [0x48,[2,15]],      // 010 01 000 | Lower Left corner and right innercorner
    [0x50,[3,15]],      // 010 10 000 | Lower right corner and left innercorner

    [0x42,[0,5]],       // 000 00 010 | Single vertical middle tiles
    [0x02,[0,6]],       // 010 00 000 | Single vertical top edge
    [0x40,[0,7]],       // 000 01 000 | Single vertical bottom edge

    [0x18,[0,4]],       // 010 00 010 | Single horizontal middle tiles
    [0x08,[0,8]],       // 000 01 000 | Single horizontal left edge
    [0x10,[0,9]],       // 000 10 000 | Single horizontal right edge

    [0x00,[0,10]]       // 000 00 000 | Single block tile
];

export class AutoTilingIndex{
    constructor(imagePath,tileSize){
        this.imagePath=imagePath;
        this.tileSize=tileSize;
        this.tileIndex=new Vector(0,0);
    }

    /**
     * Compute auto tiling
     * @param {*} contactMap
     * @returns
     */
    compute(contactMap){
        for (const iterator of CELEST_FORMAT_AUTOTILING) {
            if((contactMap & iterator[0]) === iterator[0]){
                this.tileIndex.set(iterator[1][0],iterator[1][1]).scale(this.tileSize);
                return;
            }
        }
    }

    /**
     * Render a tile with autotiling
     * @param {number} x position X on screen
     * @param {number} y position Y on screen
     * @param {context2D extended} context js context 2d with additional utils function given by the Renderer
     */
    render(x,y,context){
        const r = RessourceLoader.getRessourceLoader();
        const image=r.get(this.imagePath);
        context.renderTexture(image, this.tileIndex.x, this.tileIndex.y, this.tileSize, this.tileSize, x, y, TILE_SIZE, TILE_SIZE);
    }
}

//#endregion