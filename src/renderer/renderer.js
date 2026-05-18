import { RENDER_RESOLUTION, TILE_SIZE, WORLD_LIMIT } from "../constant.js";
import { Tile } from "../game/tileSystem/tile.js";
import { Shape, ShapeType } from "../utils/shape.js";
import { Color, MathUtils } from "../utils/utils.js";
import { Vector } from "../utils/vector.js";



const DROP_SHADOW_MARGE = 50;

export class Renderer{
    constructor(game,canvas,uiManager){
        this.game=game;

        this.uiManager = uiManager;

        this.gameWidth=RENDER_RESOLUTION[0];
        this.gameHeight=RENDER_RESOLUTION[1];

        // use to prevent drop shadow cut off
        canvas[1].width = RENDER_RESOLUTION[0] + DROP_SHADOW_MARGE;

        this.background={scroll : 0, scrollSpeed:0.5,color : "#555555"};
        this.lastTime=new Date();

        // pause render update
        this.pause = false;

        this.toggleRenderJob = [
            true,   // background
            true,   // tile
            true,   // player
            true    // debug
        ];


        this.contextBackground=canvas[0].getContext("2d", { alpha: false });

        this.context=canvas[1].getContext("2d");
        this.context.imageSmoothingEnabled = false;

        this.contextDebug=canvas[2].getContext("2d");

        // add function to the context

        this.context.getBackgroundContext=()=>{
            return this.contextBackground;
        }

        this.context.getDebugContext=()=>{
            return this.contextDebug;
        }

        this.context.wordToScreenPosition = (...args)=>{
            return this.wordToScreenPosition(...args);
        };

        this.context.renderTexture=(...args)=>{
            return this.renderTexture(...args);
        }


        // debug
        this.context.debugRenderPoint = (...agrs) => {
            return this.debugRenderPoint(...agrs);
        }
        this.context.debugRenderPointRelative = (...agrs) => {
            return this.debugRenderPointRelative(...agrs);
        }
        this.context.debugRenderShape = (...agrs) => {
            return this.debugRenderShape(this.context,...agrs);
        }

        this.context.debugContextRenderShape = (...agrs) => {
            return this.debugRenderShape(this.contextDebug,...agrs);
        }

        this.context.debugContextRenderShapeOutline = (...agrs) => {
            return this.debugRenderShape(this.contextDebug,...agrs,true);
        }

        // debug
        this.debugLabel=document.getElementById("debugLabel");
        this.context.printDebugLabel = (labels) => {
            let result = "";
            for (const iterator of labels) {
                result+=iterator+"<br>";
            }
            this.debugLabel.innerHTML=result;
        }
    }

    //#region ======== Render ========

    setBackgroundColor(color){
        this.background.color=color;
    }

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


    renderPlayer(t){
        if(this.game.player===null)return;
        const pos = this.wordToScreenPosition(this.game.player.position);
        this.game.player.render(pos.x,pos.y,this.context,t);
    }

    renderWorldBorder(){
        this.context.lineWidth = 1;
        this.context.strokeStyle="#ff0055";
        const v = this.wordToScreenPosition(new Vector(0,0));
        this.context.strokeRect(
            v.x,v.y,WORLD_LIMIT[0]*TILE_SIZE,WORLD_LIMIT[1]*TILE_SIZE
        );
    }

    clearScreen(context = this.context,width=this.gameWidth,height=this.gameHeight){
        context.clearRect(0,0,width,height);
    }

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

    setUpGameRender(){
        this.uiManager.clear();
        this.setRenderJob([true,true,true,true]);
        this.setBackgroundColor(this.game.levelData.backgroundColor);
    }

    togglePauseUI(state){
        this.uiManager.toggle("pauseMenu",state);
        this.pause=state;
    }

    setRenderJob(jobs){
        if(jobs.length!==this.toggleRenderJob.length)return;
        this.toggleRenderJob=jobs;
        this.clearScreen(this.contextBackground);
        this.clearScreen(this.context);
        this.clearScreen(this.contextDebug);
    }

    //#endregion

    // render fnc
    wordToScreenPosition(pos){
        return new Vector(pos.x - this.game.cameraPosition.x + this.gameWidth/2,pos.y - this.game.cameraPosition.y + this.gameHeight/2).round();
    }

    screenToWordPosition(pos){
        return new Vector(pos.x + this.game.cameraPosition.x - this.gameWidth/2,pos.y + this.game.cameraPosition.y - this.gameHeight/2).round();
    }

    renderTexture(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight){
        this.context.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    }




    debugRenderPoint(x,y,color="#ffff99"){
        if(!this.toggleRenderJob[3])return;

        const size = 10;
        this.context.fillStyle=color;
        this.context.fillRect(
            x-size/2,y-size/2,
            size,
            size
        );
    }

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
        if(outline){
            context.lineWidth = 1;
            context.strokeStyle=color;
            context.stroke();
        }
        else{
            context.fill();
        }

        if(!showNormal)return;

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

    debugRenderPointRelative(x,y,col){
        if(!this.toggleRenderJob[3])return;

        const p = this.wordToScreenPosition(new Vector(x,y));
        this.debugRenderPoint(p.x,p.y,col);
    }
}