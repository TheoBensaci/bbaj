import { RENDER_RESOLUTION, TILE_SIZE, WORLD_LIMIT } from "../constant.js";
import { Tile } from "../game/tileSystem/tile.js";
import { Shape, ShapeType } from "../utils/shape.js";
import { Color, MathUtils } from "../utils/utils.js";
import { Vector } from "../utils/vector.js";



const DROP_SHADOW_MARGE = 50;       // marge add to prevent the drop shadow filter to been cut

export class Renderer{
    constructor(game,canvas,uiManager){
        this.game=game;

        this.uiManager = uiManager;     // ui manage

        this.gameWidth=RENDER_RESOLUTION[0];    // game width resolution
        this.gameHeight=RENDER_RESOLUTION[1];  // game height resolution

        // use to prevent drop shadow cut off
        canvas[1].width = RENDER_RESOLUTION[0] + DROP_SHADOW_MARGE;

        // background data
        this.background={scroll : 0, scrollSpeed:0.5,color : "#555555"};

        // last render date
        this.lastTime=new Date();

        // pause render update
        this.pause = false;

        // use to toggle render job
        this.toggleRenderJob = [
            true,   // background
            true,   // tile
            true,   // player
            true    // debug
        ];


        // init all context2D

        this.contextBackground=canvas[0].getContext("2d", { alpha: false });

        this.context=canvas[1].getContext("2d");
        this.context.imageSmoothingEnabled = false;

        this.contextDebug=canvas[2].getContext("2d");


        // add function to the context to create the "context2D extended"
        /**
         * Get background context2D
         */
        this.context.getBackgroundContext=()=>{
            return this.contextBackground;
        }

        /**
         * Get debug context2D
         */
        this.context.getDebugContext=()=>{
            return this.contextDebug;
        }

        // same as "this.wordToScreenPosition"
        this.context.wordToScreenPosition = (...args)=>{
            return this.wordToScreenPosition(...args);
        };

        // same as "this.renderTexture"
        this.context.renderTexture=(...args)=>{
            return this.renderTexture(...args);
        }


        // debug

        // same as "this.debugRenderPoint"
        this.context.debugRenderPoint = (...agrs) => {
            return this.debugRenderPoint(...agrs);
        }

        // same as "this.debugRenderShape" but set for the context
        this.context.debugRenderShape = (...agrs) => {
            return this.debugRenderShape(this.context,...agrs);
        }

        // this.debugRenderShape but for the debug context
        this.context.debugContextRenderShape = (...agrs) => {
            return this.debugRenderShape(this.contextDebug,...agrs);
        }

        // this.debugRenderShape but for the debug context and with outline
        this.context.debugContextRenderShapeOutline = (...agrs) => {
            return this.debugRenderShape(this.contextDebug,...agrs,true);
        }

        // debug

        this.debugLabel=document.getElementById("debugLabel");

        /**
         * Print label in a debug ui
         */
        this.context.printDebugLabel = (labels) => {
            let result = "";
            for (const iterator of labels) {
                result+=iterator+"<br>";
            }
            this.debugLabel.innerHTML=result;
        }
    }

    //#region ======== Render ========

    /**
     * set background color
     * @param {string} color color code
     */
    setBackgroundColor(color){
        this.background.color=color;
    }

    /**
     * Render check board background
     * @param {number} t delta t
     * @param {string} color color code
     * @param {context2D} context context to use
     */
    renderBackground(t,color = this.background.color,context = this.contextBackground){
        // get background color
        const col = Color.hexToRgb(color);

        // clear screen
        this.clearScreen();

        // fill background
        context.fillStyle=col;
        context.fillRect(
            0,0,
            this.gameWidth,
            this.gameHeight
        );

        // render grid
        const squareSize=50;
        const gridWidth=this.gameWidth/squareSize;
        const gridHeight=this.gameHeight/squareSize;

        this.background.scroll+=t*this.background.scrollSpeed;
        this.background.scroll=this.background.scroll%2;

        context.rotate((-15 * Math.PI) / 180);
        context.fillStyle=Color.blenColor(
            col,
            new Color(0,0,0),
            0.3
        ).toString();

        for (let i = -10; i < gridHeight+10; i++) {
            for (let j = -10; j < gridWidth+10; j++) {
                    context.fillRect(
                        ((i%2)+j * 2 )*squareSize,(this.background.scroll+i) * squareSize,
                        squareSize,
                        squareSize
                    );
            }
        }
        context.resetTransform();

        const gradient = this.context.createLinearGradient(this.gameWidth, 0, this.gameWidth, this.gameHeight);

        // Add three color stops
        gradient.addColorStop(0, col);
        col.a=0;
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

        // render camera
        const camPosition=Vector.scale(this.game.cameraPosition,1/TILE_SIZE).round();
        const camWidth=Math.round(this.gameWidth/TILE_SIZE) + 2;
        const camHeight=Math.round(this.gameHeight/TILE_SIZE) + 2;
        for (let y = -camHeight; y < camHeight; y++) {
            for (let x = -camWidth; x < camWidth; x++) {
                const pos = new Vector(x+camPosition.x,y+camPosition.y);
                pos.round();
                const tile = this.game.getTile(pos.x,pos.y);
                if(tile===null)continue;
                const rPos = this.wordToScreenPosition(pos.scale(TILE_SIZE));
                tile.render(rPos.x,rPos.y,this.context);
            }
        }

    }


    /**
     * Render player
     * @param {number} t delta t
     */
    renderPlayer(t){
        if(this.game.player===null)return;
        const pos = this.wordToScreenPosition(this.game.player.position);
        this.game.player.render(pos.x,pos.y,this.context,t);
    }


    /**
     * Clear screen
     * @param {*} context context to use
     * @param {*} width width of the screen
     * @param {*} height height of the screen
     */
    clearScreen(context = this.context,width=this.gameWidth,height=this.gameHeight){
        context.clearRect(0,0,width,height);
    }

    /**
     * Render main function
     */
    render(){

        if(this.pause){
            this.t=0;
            this.lastTime=new Date();
            return;
        }

        const newDate=new Date();
        let t = newDate.getTime() - this.lastTime.getTime();
        t/=1000;

        // need to be sync with the drop show cut off prevention
        if(this.toggleRenderJob[0])this.clearScreen(this.contextBackground);

        if(this.toggleRenderJob[1] || this.toggleRenderJob[2])this.clearScreen(this.context,this.gameWidth+DROP_SHADOW_MARGE);

        if(this.toggleRenderJob[3])this.clearScreen(this.contextDebug);


        if(this.toggleRenderJob[0])this.renderBackground(t);

        if(this.toggleRenderJob[1])this.renderLevel(t);

        if(this.toggleRenderJob[2])this.renderPlayer(t);


        this.lastTime=newDate;
    }

    //#endregion

    //#region ======== UI ========

    /**
     * Set up game render sceem
     */
    setUpGameRender(){
        this.uiManager.clear();
        this.setRenderJob([true,true,true,true]);
        this.setBackgroundColor(this.game.levelData.backgroundColor);
    }

    /**
     * toggle pause UI
     * @param {boolean} state
     */
    togglePauseUI(state){
        this.uiManager.toggle("pauseMenu",state);
        this.uiManager.toggle("blackBackground",state);
        this.pause=state;
    }

    /**
     * set render job state
     * @param {boolean[]} jobs [background,tile,player,debug]
     */
    setRenderJob(jobs){
        if(jobs.length!==this.toggleRenderJob.length)return;
        this.toggleRenderJob=jobs;
        this.clearScreen(this.contextBackground);
        this.clearScreen(this.context);
        this.clearScreen(this.contextDebug);
    }

    //#endregion

    // render fnc

    /**
     * Transform a world position to screen position
     * @param {Vector} pos world position
     * @returns {Vector}
     */
    wordToScreenPosition(pos){
        return new Vector(pos.x - this.game.cameraPosition.x + this.gameWidth/2,pos.y - this.game.cameraPosition.y + this.gameHeight/2).round();
    }

    /**
     * Transform a screen position to a world position
     * @param {Vector} pos screen position
     * @returns {Vector}
     */
    screenToWordPosition(pos){
        return new Vector(pos.x + this.game.cameraPosition.x - this.gameWidth/2,pos.y + this.game.cameraPosition.y - this.gameHeight/2).round();
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
    renderTexture(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight){
        this.context.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    }




    /**
     * Render a debug shape on screen
     * @param {context2D} context context use
     * @param {*} shape Shape to render
     * @param {*} color color of the shape
     * @param {*} showNormal is normals of the shape as be render
     * @param {*} outline is outline is needed
     */
    debugRenderShape(context,shape,color = "#ffff99",showNormal=true,outline=false){
        if(!this.toggleRenderJob[3])return;

        context.beginPath();
        context.fillStyle=color;
        const points=shape.getEdge();
        const axis=shape.getNormal();
        const axisRender=[];
        let point = this.wordToScreenPosition(points[0]);
        context.moveTo(point.x, point.y);
        for (let index = 1; index < points.length; index++) {
            const i = points[index];
            axisRender.push([
                Vector.sub(i,points[index-1]).scale(0.5).add(points[index-1]),
                Vector.scale(axis[index-1],30)
            ]);
            point = this.wordToScreenPosition(i);
            context.lineTo(point.x, point.y);
        }
        axisRender.push([
            Vector.sub(points[points.length-1],points[0]).scale(0.5).add(points[0]),
            Vector.scale(axis[axis.length-1],30)
        ]);

        context.closePath();
        if(outline || points.length===2){
            context.lineWidth = 1;
            context.strokeStyle=color;
            context.stroke();
        }
        else{
            context.fill();
        }

        if(!showNormal)return;


        // render normal
        const col = [
            "#ff0055",
            "#00ff99",
            "#ffff99"
        ];


        for (let index = 0; index < axisRender.length; index++) {
            const j = axisRender[index];
            context.lineWidth = 1;
            context.strokeStyle=col[index%col.length];
            context.beginPath();
            const jr=this.wordToScreenPosition(j[0]);
            context.moveTo(jr.x,jr.y);
            const i = this.wordToScreenPosition(Vector.add(j[0],j[1]));
            context.lineTo(i.x,i.y);
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
    debugRenderPoint(x,y,color="#ffff99"){
        if(!this.toggleRenderJob[3])return;

        const p = this.wordToScreenPosition(new Vector(x,y));
        const size = 10;
        this.context.fillStyle=color;
        this.context.fillRect(
            p.x-size/2,p.y-size/2,
            size,
            size
        );
    }
}