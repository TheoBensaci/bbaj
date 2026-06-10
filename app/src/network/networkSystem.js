import { REQUEST_TIMOUT, SERVER_HTTP_PROTO } from "../constant.js";
import { Director } from "../director.js";
import { PlayerGhost } from "../game/player/playerGhost.js";
import { fetchLevelFile, loadLevelFromFile } from "../utils/fileUtils.js";
import { getSaveItem } from "../utils/saveManager.js";


export class NetworkSystem{
    constructor(httpProto,server,port,game){
        this.socket = null;
        this.httpProto=httpProto;
        this.server = server;
        this.port = port;
        this.game = game;
        this.roomId="";
        this.playerId = 0;
    }

    getServer(){
        return this.server;
    }

    //#region ============= GAMPLAY =============
    updateGhost(datas){
        for (const data of datas) {
            if(data.playerId===this.playerId)continue;
            const ghost = this.game.getGhost(data.username);
            if(ghost===null){
                this.createGhost(data.username);
            }
            else{
                ghost.setData(data.data);
            }
        }
    }

    createGhost(name){
        const ghost = new PlayerGhost(name);
        this.game.createGhost(name,ghost);
        console.log(name+" -> "+this.game.ghosts.size);
    }

    destroyGhost(name){
        this.game.destroyGhost(name);
    }

    joinRoom(roomId,errorCallback){
        const hostname = this.server+":"+this.port;
        this.socket= new WebSocket('ws://'+hostname+"/");


        this.socket.addEventListener("open",(e)=>{
            console.log("open");
            this.sendData("playerJoin",{
                roomId:roomId,
                username:getSaveItem("username")
            });
        });

        this.socket.addEventListener("message",(e)=>{
            const data = JSON.parse(e.data);
            switch(data.type){
                case 'error' :
                    errorCallback(data.message);
                    this.quitRoom();
                break;
                case 'joinOK' :
                    this.playerId=data.playerId;
                    fetchLevelFile((d)=>{
                        if(d===null){
                            this.quitRoom();
                            errorCallback("MAP ERROR");
                            return;
                        }
                        this.roomId=roomId;
                        Director.loadLevel(d);
                        Director.setEditorQuickSwitch(false);
                    },this.getMap(data.mapId));
                break;
                case 'state' :
                    this.updateGhost(data.data);
                break;
                case 'playerLeave' :
                    console.log(data);
                    this.destroyGhost(data.username);
                break;
            }
        });

        this.socket.addEventListener("close",(e)=>{
            this.quitRoom();
            Director.setSceen("main");
        });
    }


    quitRoom(){
        if(this.socket===null)return;
        console.log("socket close");
        this.game.clearGhost();
        this.socket.close();
        this.socket=null;
    }


    sendData(type,data){
        if(this.socket!==null){
            const d = {
                type:type,
                ...data
            };
            this.socket.send(JSON.stringify(d));
        }
    }

    update(){
        if(!Director.inGame() || !Director.isOnline())return;
        const player = this.game.player;
        const data = player.getData();
        this.sendData("playerData",{data:data});
    }

    //#endregion


    //#region ============= HTTP =============

    createRoom(mapId,callback){
        fetch(this.httpProto+"://"+this.server+":"+this.port+"/createRoom",{
            method:"POST",
            headers:{
                'Content-Type': 'application/json'
            },
            body:JSON.stringify({
                mapId:mapId
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {return callback(data)})
        .catch(e=>{
            callback(null);
        });
    }

    checkRoom(roomId,callback){
        fetch(this.httpProto+"://"+this.server+":"+this.port+"/room/"+roomId)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {return callback(data)})
            .catch(e=>{
                callback(null);
        });
    }

    getMaps(callback){
        fetch(this.httpProto+"://"+this.server+":"+this.port+"/maps")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {return callback(data)})
            .catch(e=>{;
                callback(null);
            });
    }

    getMap(id){
        return "./ressource/levels/testLevelFinish.json";//this.server+":"+this.port+"/map/"+id;
    }

    //#endregion





}