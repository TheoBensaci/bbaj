/**
 * @ Autheur: Theo Bensaci
 * @ Date: 15:30 05.06.2026
 * @ Description: Network system
 */

import { Director } from "../director.js";
import { PlayerGhost } from "../game/player/playerGhost.js";
import { fetchLevelFile, loadLevelFromFile } from "../utils/fileUtils.js";
import { getSaveItem } from "../utils/saveManager.js";


export class NetworkSystem{
    constructor(httpProto,hostname,port,game){
        // web secket use by the system
        this.socket = null;

        // http protocole of the server
        this.httpProto=httpProto;

        this.hostname = hostname;
        this.port = port;

        // game linked to the network system
        this.game = game;

        // actual room id on the server
        this.roomId="";

        // actual player id on the server
        this.playerId = 0;

        // actual player id on the server
        this.mapId = "";
    }

    /**
     * Get http host name
     * @returns {String}
     */
    getHost(){
        return this.httpProto+"//"+this.hostname+":"+this.port;
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

    /**
     * Create a ghost for the player of the name given
     * @param {*} name name of player
     */
    createGhost(name){
        const ghost = new PlayerGhost(name);
        this.game.createGhost(name,ghost);
        console.log(name+" -> "+this.game.ghosts.size);
    }

    /**
     * Destroy a ghost for the player of the name given
     * @param {*} name name of player
     */
    destroyGhost(name){
        this.game.destroyGhost(name);
    }

    /**
     * Request to join the room with the roomid given, if ok load the map and join to room
     * There for, create the web socket with the player
     * @param {*} roomId room id
     * @param {*} errorCallback callback call if we can't join the room
     */
    joinRoom(roomId,errorCallback){
        const hostname = this.hostname+":"+this.port;
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
                case 'joinOK' : // if join ok, fetch level
                    this.playerId=data.playerId;
                    fetchLevelFile((d)=>{
                        if(d===null){
                            this.quitRoom();
                            errorCallback("MAP ERROR");
                            return;
                        }
                        this.mapId=data.mapID;
                        this.roomId=roomId;
                        Director.loadLevel(d);
                        Director.setEditorQuickSwitch(false);
                    },this.getMap(data.mapId));
                break;
                case 'state' :  // when recieve a state
                    this.updateGhost(data.data);
                break;
                case 'playerLeave' :    // whene a player is leaving
                    this.destroyGhost(data.username);
                break;
            }
        });

        this.socket.addEventListener("close",(e)=>{
            this.quitRoom();
            Director.setSceen("main");
        });
    }

    /**
     * Quit the actual room
     */
    quitRoom(){
        if(this.socket===null)return;
        console.log("socket close");
        this.game.clearGhost();
        this.socket.close();
        this.socket=null;
    }

    /**
     * Send data to the server with web socket
     * @param {*} type type of data
     * @param {*} data data object
     */
    sendData(type,data){
        if(this.socket!==null){
            const d = {
                type:type,
                ...data
            };
            this.socket.send(JSON.stringify(d));
        }
    }

    /**
     * Update network system, if online, send player data
     */
    update(){
        if(!Director.inGame() || !Director.isOnline())return;
        const player = this.game.player;
        const data = player.getData();
        this.sendData("playerData",{data:data});
    }

    //#endregion


    //#region ============= HTTP =============

    /**
     * Request to create a room
     * @param {*} mapId map id of the room
     * @param {*} callback callback of the responce
     */
    createRoom(mapId,callback){
        fetch(this.getHost()+"/createRoom",{
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

    /**
     * check if a room existe
     * @param {*} roomId room id
     * @param {*} callback callback of the responce
     */
    checkRoom(roomId,callback){
        fetch(this.getHost()+"/room/"+roomId)
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

    /**
     * get the maps lists
     * @param {*} callback callback of the responce
     */
    getMaps(callback){
        fetch(this.getHost()+"/maps")
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

    /**
     * get the json path the map with the given id
     * @param {*} id id of the map
     * @returns {String} path
     */
    getMap(id){
        return this.getHost()+"/map/"+id;
    }


    getMapTime(callback){
        fetch(this.getHost()+"/map/time/"+this.mapId)
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

    //#endregion





}