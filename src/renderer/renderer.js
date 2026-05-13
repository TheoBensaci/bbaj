import { tileSize, worldLimit } from "../constant.js";
import { Tile } from "../game/tile/tile.js";
import { Shape, ShapeType } from "../utils/shape.js";
import { Color, MathUtils } from "../utils/utils.js";
import { Vector } from "../utils/vector.js";

export class contextInterface{

}

export class Renderer{
    constructor(game,canvas){
        this.game=game;

        this.gameWidth=canvas[1].width;
        this.gameHeight=canvas[1].height;
        this.background={scroll : 0, scrollSpeed:0.5};
        this.lastTime=new Date();


        // render job are callback function use to add the
        this.renderJob=[];


        this.context=canvas[1].getContext("2d");
        this.contextBackground=canvas[0].getContext("2d", { alpha: false });
        this.contextDebug=canvas[2].getContext("2d");
        this.context.imageSmoothingEnabled = false;

        // add function to the context

        this.context.getBackgroundContext=()=>{
            return this.contextBackground;
        }

        this.context.getDebugContext=()=>{
            return this.contextDebug;
        }

        this.context.wordToScreenPosition = (pos)=>{
            return this.wordToScreenPosition(pos);
        };

        this.context.getTileRenderContinuseMap = (x,y,tileClass=Tile) => {
            return this.getTileRenderContinuseMap(x,y,tileClass);
        }

        this.context.renderTexture=(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)=>{
            return this.renderTexture(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        }


        // debug
        this.context.debugRenderPoint = (x,y,color = "#ffff99") => {
            return this.debugRenderPoint(x,y,color);
        }
        this.context.debugRenderPointRelative = (x,y,color = "#ffff99") => {
            return this.debugRenderPointRelative(x,y,color);
        }
        this.context.debugRenderShape = (shape,color = "#00ff99",showNormal = true) => {
            return this.debugRenderShape(shape,color,showNormal);
        }
    }

    renderBackground(t,context = this.contextBackground){
        // get background color
        const color = Color.hexToRgb("#555555");

        // clear screen
        this.clearScreen();

        // fill background
        context.fillStyle=color;
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
            color,
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
        gradient.addColorStop(0, color);
        color.a=0;
        gradient.addColorStop(1, color.toString());
        // Set the fill style and draw a rectangle
        context.fillStyle = gradient;
        context.fillRect(0, 0, this.gameWidth, this.gameHeight);
    }

    renderLevel(t){

        // render camera

        const camPosition=Vector.scale(this.game.cameraPosition,1/tileSize).round();
        const camWidth=Math.round(this.gameWidth/tileSize) + 2;
        const camHeight=Math.round(this.gameHeight/tileSize) + 2;
        for (let y = -camHeight; y < camHeight; y++) {
            for (let x = -camWidth; x < camWidth; x++) {
                const pos = new Vector(x+camPosition.x,y+camPosition.y);
                pos.round();
                const tile = this.game.getTile(pos.x,pos.y);
                if(tile===null)continue;
                const rPos = this.wordToScreenPosition(pos.scale(tileSize));
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
            v.x,v.y,worldLimit[0]*tileSize,worldLimit[1]*tileSize
        );
    }

    clearScreen(context = this.context){
        context.clearRect(0,0,this.gameWidth,this.gameHeight);
    }

    render(){
        const newDate=new Date();
        let t = newDate.getTime() - this.lastTime.getTime();
        t/=1000;

        this.clearScreen();
        this.clearScreen(this.contextBackground);
        this.clearScreen(this.contextDebug);

        this.renderBackground(t);

        this.renderLevel(t);

        this.renderPlayer(t);

        // render world
        this.renderWorldBorder();

        // render debug


        this.lastTime=newDate;
    }

    // render fnc
    wordToScreenPosition(pos){
        return Vector.sub(pos,this.game.cameraPosition).add(new Vector(this.gameWidth,this.gameHeight).scale(0.5)).round();
    }

    screenToWordPosition(pos){
        return Vector.add(pos,this.game.cameraPosition).sub(new Vector(this.gameWidth,this.gameHeight).scale(0.5)).round();
    }

    renderTexture(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight){
        this.context.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    }

    // render tile function
    getTileRenderContinuseMap(x,y,tileClass = Tile){

        const map = [
            [false,false,false],
            [false,false,false],
            [false,false,false]
        ]


        const pos = new Vector(x-tileSize/2,y-tileSize/2).scale(1/tileSize);
        pos.round();


        for (let y = -1; y < 2; y++) {
            for (let x = -1; x < 2; x++) {
                if(x===0 && x===y)continue;
                const testedPos=Vector.add(pos,new Vector(x,y));
                const tile = this.game.getTile(testedPos.x,testedPos.y);
                if(tile===null)continue;
                map[1+y][1+x]= (tile instanceof tileClass)?true:false;
            }
        }


        return map;
    }




    debugRenderPoint(x,y,color="#ffff99"){
        const size = 10;
        this.context.fillStyle=color;
        this.context.fillRect(
            x-size/2,y-size/2,
            size,
            size
        );
    }

    debugRenderShape(shape,color = "#ffff99", showNormal=true){
        this.context.beginPath();
        this.context.fillStyle=color;
        const points=shape.getEdge();
        const axis=shape.getNormal();
        const axisRender=[];
        let point = this.wordToScreenPosition(points[0]);
        this.context.moveTo(point.x, point.y);
        for (let index = 1; index < points.length; index++) {
            const i = points[index];
            axisRender.push([
                Vector.sub(i,points[index-1]).scale(0.5).add(points[index-1]),
                Vector.scale(axis[index-1],30)
            ]);
            point = this.wordToScreenPosition(i);
            this.context.lineTo(point.x, point.y);
        }
        axisRender.push([
            Vector.sub(points[points.length-1],points[0]).scale(0.5).add(points[0]),
            Vector.scale(axis[axis.length-1],30)
        ]);

        this.context.closePath();
        this.context.fill();

        if(!showNormal)return;

        const col = [
            "#ff0055",
            "#00ff99",
            "#ffff99"
        ];


        for (let index = 0; index < axisRender.length; index++) {
            const j = axisRender[index];
            this.context.lineWidth = 1;
            this.context.strokeStyle=col[index%col.length];
            this.context.beginPath();
            const jr=this.wordToScreenPosition(j[0]);
            this.context.moveTo(jr.x,jr.y);
            const i = this.wordToScreenPosition(Vector.add(j[0],j[1]));
            this.context.lineTo(i.x,i.y);
            this.context.closePath();
            this.context.stroke();
        }
    }

    debugRenderPointRelative(x,y,col){
        const p = this.wordToScreenPosition(new Vector(x,y));
        this.debugRenderPoint(p.x,p.y,col);
    }
}