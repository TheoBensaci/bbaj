import { RENDER_RESOLUTION, TILE_SIZE, WORLD_LIMIT } from '../constant.js';
import { TileEditorWrapper } from '../editor/tileEditorWrapper.js';
import { Tile } from '../game/tileSystem/tile.js';
import { Shape, ShapeType } from '../utils/shape.js';
import { Color, MathUtils } from '../utils/utils.js';
import { Vector } from '../utils/vector.js';
import { World } from '../world.js';

const DROP_SHADOW_MARGE = 50; // marge add to prevent the drop shadow filter to been cut

export class Renderer {
    constructor(game, canvas, uiManager) {
        this.world = game;

        this.uiManager = uiManager; // ui manage

        this.gameWidth = RENDER_RESOLUTION[0]; // game width resolution
        this.gameHeight = RENDER_RESOLUTION[1]; // game height resolution

        // use to prevent drop shadow cut off
        canvas[1].width = RENDER_RESOLUTION[0] + DROP_SHADOW_MARGE;

        // background data
        this.background = {
            scroll: 0,
            scrollSpeed: 0.5,
            color: '#555555',
        };

        // last render date
        this.lastTime = new Date();

        // pause render update
        this.pause = false;

        // use to toggle render job
        this.renderJob = {
            background: true,
            grid: true,
            level: true,
            player: true,
            debug: true,
            tilePreview: true,
        };

        // init all context2D
        this.contextBackground = canvas[0].getContext('2d', { alpha: false });

        this.context = canvas[1].getContext('2d');
        this.context.imageSmoothingEnabled = false;

        this.contextDebug = canvas[2].getContext('2d');

        // add function to the context to create the 'context2D extended'
        this.#setContextFunction(this.contextBackground, this.context, this.contextDebug);

        // debug
        this.debugLabel = document.getElementById('debugLabel');
    }

    #setContextFunction(contextBackground, context, contextDebug) {
        /**
         * Get background context2D
         */
        context.getBackgroundContext = () => {
            return contextBackground;
        };

        /**
         * Get debug context2D
         */
        context.getDebugContext = () => {
            return contextDebug;
        };

        // same as 'this.wordToScreenPosition'
        context.wordToScreenPosition = (...args) => {
            return this.wordToScreenPosition(...args);
        };

        // same as 'this.renderTexture'
        context.renderTexture = (...args) => {
            return this.renderTexture(context, ...args);
        };

        // debug

        // same as 'this.debugRenderPoint'
        context.debugRenderPoint = (...agrs) => {
            return this.debugRenderPoint(...agrs);
        };

        // same as 'this.debugRenderShape' but set for the context
        context.debugRenderShape = (...agrs) => {
            return this.debugRenderShape(context, ...agrs);
        };

        // this.debugRenderShape but for the debug context
        context.debugContextRenderShape = (...agrs) => {
            return this.debugRenderShape(contextDebug, ...agrs);
        };

        // this.debugRenderShape but for the debug context and with outline
        context.debugContextRenderShapeOutline = (...agrs) => {
            return this.debugRenderShape(contextDebug, ...agrs, true);
        };

        /**
         * Print label in a debug ui
         */
        context.printDebugLabel = (labels) => {
            let result = '';
            for (const iterator of labels) {
                result += iterator + '<br>';
            }
            this.debugLabel.innerHTML = result;
        };
    }

    //#region ======== Render ========

    /**
     * set background color
     * @param {string} color color code
     */
    setBackgroundColor(color) {
        this.background.color = color;
    }

    /**
     * Render check board background
     * @param {number} t delta t
     * @param {string} color color code
     * @param {context2D} context context to use
     */
    renderBackground(t, color = this.background.color, context = this.contextBackground) {
        // get background color
        const col = Color.hexToRgb(color);

        // clear screen
        this.clearScreen();

        // fill background
        context.fillStyle = col;
        context.fillRect(0, 0, this.gameWidth, this.gameHeight);

        // render grid
        const squareSize = 50;
        const gridWidth = this.gameWidth / squareSize;
        const gridHeight = this.gameHeight / squareSize;

        this.background.scroll += t * this.background.scrollSpeed;
        this.background.scroll = this.background.scroll % 2;

        context.rotate((-15 * Math.PI) / 180);
        context.fillStyle = Color.blenColor(
            col,
            new Color(0, 0, 0),
            0.3
        ).toString();

        for (let i = -10; i < gridHeight + 10; i++) {
            for (let j = -10; j < gridWidth + 10; j++) {
                context.fillRect(
                    ((i % 2) + j * 2) * squareSize,
                    (this.background.scroll + i) * squareSize,
                    squareSize,
                    squareSize
                );
            }
        }
        context.resetTransform();

        const gradient = this.context.createLinearGradient(this.gameWidth, 0, this.gameWidth, this.gameHeight);

        // Add three color stops
        gradient.addColorStop(0, col);
        col.a = 0;
        gradient.addColorStop(1, col.toString());
        // Set the fill style and draw a rectangle
        context.fillStyle = gradient;
        context.fillRect(0, 0, this.gameWidth, this.gameHeight);
    }

    /**
     * render level tiles
     * @param {number} t delta t
     */
    renderLevel(t){
        const gameRenderer = this.world.advanceCollisionTile !== undefined;

        // render camera
        const camPosition = Vector.scale(this.world.cameraPosition, 1 / TILE_SIZE).round();
        const camWidth = Math.round(this.gameWidth / (2 * TILE_SIZE)) + 2;
        const camHeight = Math.round(this.gameHeight / (2 * TILE_SIZE)) + 2;

        const bufferVector = Vector.temp(0,0);

        for (let y = -camHeight; y < camHeight; y++) {
            for (let x = -camWidth; x < camWidth; x++) {
                bufferVector.set(x+camPosition.x,y+camPosition.y);
                bufferVector.round();
                const tile = this.world.getTile(bufferVector.x,bufferVector.y);

                if(tile===null)continue;
                if(gameRenderer&&this.world.advanceCollisionTile[this.world.getTileId(bufferVector.x,bufferVector.y)]!==undefined)continue;

                this.wordToScreenPosition(bufferVector.scale(TILE_SIZE),bufferVector);
                tile.render(bufferVector.x,bufferVector.y,this.context,t);
            }
        }

        // if advance collision is on in this world, we need to use aabb to know if a tile is render or not
        if (gameRenderer) {
            const point = this.world.cameraPosition.clone().sub(this.gameWidth/2, this.gameHeight/2);
            const boudingBox = [
                point.clone(),
                point.add(this.gameWidth, this.gameHeight),
            ];

            // add active tile
            this.world.foreachSpecialTile((tile,x,y)=>{
                if(Shape.AABB(tile.getBoundingBox(),boudingBox)){
                    this.wordToScreenPosition(Vector.temp(x,y),bufferVector);
                    tile.render(bufferVector.x,bufferVector.y,this.context);
                }
            }, this.world.advanceCollisionTile);
        }
    }

    /**
     * Render player
     * @param {number} t delta t
     */
    renderPlayer(t) {
        if (this.world.player === null) return;
        const pos = this.wordToScreenPosition(this.world.player.position);
        this.world.player.render(pos.x, pos.y, this.context, t);
    }

    renderGrid(context) {
        const camPosition = Vector.scale(this.world.cameraPosition, 1/TILE_SIZE).round();
        const camWidth = Math.round(this.gameWidth/TILE_SIZE) + 2;
        const camHeight = Math.round(this.gameHeight/TILE_SIZE) + 2;

        context.lineWidth = 1;
        context.strokeStyle = '#ffffff11';

        const bufferVector = new Vector(0,0);

        for (let y = -camHeight; y < camHeight; y++) {
            const pos = Vector.temp(camPosition.x-camWidth,y+camPosition.y).scale(TILE_SIZE);
            context.beginPath();

            this.wordToScreenPosition(pos,bufferVector);
            context.moveTo(bufferVector.x,bufferVector.y);

            this.wordToScreenPosition(pos.add(2*camWidth*TILE_SIZE,0),bufferVector);
            context.lineTo(bufferVector.x,bufferVector.y);

            context.closePath();
            context.stroke();
        }
        for (let x = -camWidth; x < camWidth; x++) {
            const pos = Vector.temp(x+camPosition.x,camPosition.y-camHeight).scale(TILE_SIZE);
            context.beginPath();
            this.wordToScreenPosition(pos,bufferVector);
            context.moveTo(bufferVector.x,bufferVector.y);

            this.wordToScreenPosition(pos.add(0,2*camHeight*TILE_SIZE),bufferVector);
            context.lineTo(bufferVector.x,bufferVector.y);

            context.closePath();
            context.stroke();
        }
    }

    /**
     * Clear screen
     * @param {*} context context to use
     * @param {*} width width of the screen
     * @param {*} height height of the screen
     */
    clearScreen(context = this.context, width = this.gameWidth, height = this.gameHeight){
        context.clearRect(0, 0, width, height);
    }

    clearAll() {
        this.clearScreen(this.contextBackground);

        // need to be sync with the drop show cut off prevention
        this.clearScreen(this.context, this.gameWidth + DROP_SHADOW_MARGE);

        this.clearScreen(this.contextDebug);
    }

    /**
     * Render main function
     */
    render() {
        if (this.pause) {
            this.t = 0;
            this.lastTime = new Date();
            return;
        }

        const newDate = new Date();
        let t = newDate.getTime() - this.lastTime.getTime();
        t /= 1000;

        this.clearAll();

        if (this.renderJob.background) this.renderBackground(t);
        if (this.renderJob.grid) this.renderGrid(this.contextBackground);

        if (this.renderJob.level) this.renderLevel(t);

        if (this.renderJob.player) this.renderPlayer(t);


        this.context.font = "15px serif";
        this.context.fillText(t+"", 550, 30);

        this.lastTime = newDate;
    }

    //#endregion

    /**
     * set render job state
     * @param {objet} jobs {
            background : (true/false),
            level : (true/false),
            player : (true/false),
            debug : (true/false)
        }
     */
    setRenderJob(jobs) {
        this.clearAll();
        for (const key in this.renderJob) {
            if (Object.hasOwnProperty.call(this.renderJob, key)) {
                if (Object.hasOwnProperty.call(jobs, key)) {
                    this.renderJob[key] = jobs[key];
                } else {
                    this.renderJob[key] = false;
                }
            }
        }
    }

    // render fnc

    /**
     * Transform a world position to screen position
     * @param {Vector} pos world position
     * @returns {Vector}
     */
    wordToScreenPosition(pos,targetVector = new Vector(0,0)){
        return targetVector.set(pos.x - this.world.cameraPosition.x + this.gameWidth/2,pos.y - this.world.cameraPosition.y + this.gameHeight/2).round();
    }

    /**
     * Transform a screen position to a world position
     * @param {Vector} pos screen position
     * @returns {Vector}
     */
    screenToWordPosition(pos,targetVector = new Vector(0,0)){
        return targetVector.set(pos.x + this.world.cameraPosition.x - this.gameWidth/2,pos.y + this.world.cameraPosition.y - this.gameHeight/2);
    }

    /**
     * Render a texture
     * @param {*} img texture image
     * @param {*} sx source x
     * @param {*} sy source y
     * @param {*} sWidth source width
     * @param {*} sHeight source height
     * @param {*} dx destination x
     * @param {*} dy destination y
     * @param {*} dWidth destination width
     * @param {*} dHeight destination height
     */
    renderTexture(context, img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
        context.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    }

    /**
     * Render a debug shape on screen
     * @param {context2D} context context use
     * @param {*} shape Shape to render
     * @param {*} color color of the shape
     * @param {*} showNormal is normals of the shape as be render
     * @param {*} outline is outline is needed
     */
    debugRenderShape(context, shape, color = '#ffff99', showNormal=true, outline = false) {
        if (!this.renderJob.debug) return;

        context.beginPath();
        context.fillStyle=color;
        const points=shape.getEdge();
        const axis=shape.getNormal();
        const axisRender=[];
        let point = new Vector(0,0);
        this.wordToScreenPosition(points[0],point);
        context.moveTo(point.x, point.y);
        for (let index = 1; index < points.length; index++) {
            const i = points[index];
            axisRender.push([
                Vector.sub(i, points[index-1]).scale(0.5).add(points[index-1]),
                Vector.scale(axis[index-1], 30)
            ]);
            this.wordToScreenPosition(i,point);
            context.lineTo(point.x, point.y);
        }
        axisRender.push([
            Vector.sub(points[points.length-1], points[0]).scale(0.5).add(points[0]),
            Vector.scale(axis[axis.length-1], 30)
        ]);

        context.closePath();
        if (outline || points.length === 2) {
            context.lineWidth = 1;
            context.strokeStyle = color;
            context.stroke();
        } else {
            context.fill();
        }

        if (!showNormal) return;

        // render normal
        const col = ['#ff0055', '#00ff99', '#ffff99'];

        for (let index = 0; index < axisRender.length; index++) {
            const j = axisRender[index];
            context.lineWidth = 1;
            context.strokeStyle = col[index % col.length];
            context.beginPath();
            this.wordToScreenPosition(j[0],point);
            context.moveTo(point.x,point.y);
            this.wordToScreenPosition(Vector.temp(j[0]).add(j[1]),point);
            context.lineTo(point.x,point.y);
            context.closePath();
            context.stroke();
        }
    }

    /**
     * Render a debug point on screen
     * @param {number} x world position x
     * @param {number} y world position x
     * @param {string} color color code
     */
    debugRenderPoint(x, y, color = '#ffff99') {
        if (!this.renderJob.debug) return;

        const p = this.wordToScreenPosition(new Vector(x, y));
        const size = 10;
        this.context.fillStyle = color;
        this.context.fillRect(p.x - size/2, p.y - size/2, size, size);
    }

    // context buffering

    /**
     * Use to export a render of tile (specify by data) into a url image
     * @param {number} width width of target image
     * @param {number} height height of target image
     * @param {function} callback callback call with the url at the end
     * @param {object} data data of the tile
     */
    exportTileSprite(targetContext,width, height, data) {
        const w = width;
        const h = height;
        targetContext.imageSmoothingEnabled = false;
        this.#setContextFunction(targetContext, targetContext, targetContext);

        this.clearScreen(targetContext,width,height);

        // set virtual tile position (to make the tile render in the middle of the image) in can of debug shape
        const pos = this.screenToWordPosition(new Vector(w/2 - TILE_SIZE/2, h/2 - TILE_SIZE/2)).scale(1/TILE_SIZE);

        const tileWrapper = new TileEditorWrapper(pos.x, pos.y, data);

        tileWrapper.setState(new World());

        tileWrapper.render(w/2 - TILE_SIZE/2, h/2 - TILE_SIZE/2, targetContext);
    }
}
