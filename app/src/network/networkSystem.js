import { PlayerGhost } from "../game/player/playerGhost.js";


export class NetworkSystem{
    constructor(server,port,game){
        this.socket = null;
        this.server = server;
        this.port = port;
        this.game = game;
    }

    getServer(){
        return this.server;
    }

    updateGhost(datas){
        for (const data of datas) {
            this.game.getGhost(data.id).setData(data);
        }
    }

    createGhost(id,name){
        const ghost = new PlayerGhost(name);
        this.game.createGhost(id,ghost);
    }

    destroyGhost(id){
        this.game.destroyGhost(id,ghost);
    }

    createWS(roomId){
        const hostname = this.server+":"+this.port;
        this.socket= new WebSocket('ws://'+hostname+"/");

        this.socket.addEventListener("open",(e)=>{

        });

        this.socket.addEventListener("message",(e)=>{

        });

        this.socket.addEventListener("close",(e)=>{
            this.game.clearGhost();
        });
    }


    sendData(data){
        if(this.socket!==null){

        }
    }

    update(){
        this.sendData(null);
    }


}