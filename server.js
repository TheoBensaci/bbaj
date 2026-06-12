import express from "express";
import expressWs from "express-ws";
import { MongoClient } from "mongodb";
import { ObjectId } from "mongodb";

const app = express();
expressWs(app);

let idRoom = 0;
let idSocket = 0;
const rooms = [];
const INTERVAL = 20;

function generateRoomId(){
    // date -> number -> string (base 36)
    return Date.now().valueOf().toString(36);
}

//Connexion db
const client = new MongoClient("mongodb://localhost:27017");
await client.connect();
let db = client.db("baj");
console.log("MongoDB connecté");


// Serve the public directory
app.use(express.static('app'));

// Serve the src directory
app.use('/src', express.static('src'));

//Permet de lire req.body
app.use(express.json());

//Publie une map sur la db
app.post('/publishMap', async (req, res) => {
    const map = req.body.map;

    if (!map) {
        return res.status(400).json({ error: "Map manquante" });
    }

    await db.collection("map").insertOne({ map });

    res.json({ success: true });
});

//Retourne tous les ids
app.get("/maps", async (req, res) => {
    // TODO reable data base
    //const maps = await db.collection("map").find().toArray();
    //const result = maps.map(r => r._id);

    const result=[
        {
            id:1,
            name:"map name 1"
        },
        {
            id:2,
            name:"map name 2"
        },
        {
            id:3,
            name:"map name 3"
        },
        {
            id:4,
            name:"map name 4"
        },

        {
            id:5,
            name:"map name 5"
        },
        {
            id:6,
            name:"map name 6"
        }
    ]

    res.json(result);
});

//Retourne la map en fonction de son id
function getMapById(id) {
    return db.collection("map").findOne({
        _id: new ObjectId(id)
    });
}

//Set le nouveau temps
async function setTimeDb(id, newTime) {
    return await db.collection("map").updateOne(
        { _id: new ObjectId(id) },
        {
            $set: {
                time: newTime
            }
        }
    );
}

//Get les temps d'une map
function getTimeDb(id) {
    return getMapById(id).time;
}


//Retourne une map par rapport à son id (JSON)
app.get("/map/:id", async (req, res) => {
    try {
        const map = await getMapById(req.params.id);

        if (!map) {
            return res.status(404).json({ error: "map introuvable" });
        }

        res.json(map.map);
    } catch (err) {
        res.status(500).json({ error: "id invalide" });
    }
});

//Retourne les 5 meilleurs temps enregistré dans la db pour une map
app.get("/map/time/:id", async (req, res) => {
    try {
        const times = await getTimeDb(req.params.id);

        if (!times){
            return res.status(404).json({ error: "map introuvable" });
        }

        res.json(times);
    } catch{
        res.status(500).json({ error: "id invalide" });
    }
});


//Creation d'une room
app.post('/createRoom', async (req, res) => {
    const mapId = req.body.mapId;

    if (!mapId) {
        return res.status(400).json({ error: "map id manquant" });
    }

    try {
        const map = await getMapById(mapId);

        if (!map) {
            return res.status(404).json({ error: "map introuvable" });
        }

    } catch (err) {
        return res.status(404).json({ error: "map introuvable" });
    }

    // Genere un id pour une room
    const roomId = generateRoomId();

    const room ={
        mapId: mapId,
        players: {},
        times: {},
        playerCount:0,
        interval : null,
        foreachPlayer:(fnc)=>{
            for (const key in room.players) {
                if (Object.hasOwnProperty.call(room.players, key)) {
                    fnc(room.players[key]);
                }
            }
        }
    };

    room.interval=setInterval(()=>{
        const data = [];
        room.foreachPlayer((pl)=>{
            data.push({username:pl.username,playerId:pl.socket.id,data:pl.data});
        });
        room.foreachPlayer((pl)=>{
            pl.socket.send(JSON.stringify({type:"state",data:data}));
        });
    },INTERVAL);


    console.log(`create room "${roomId}"`);


    rooms[roomId] = room;

    res.json({ roomId });
});

//On récupére l'id de la room s'il existe
app.get('/room/:id', async (req, res) => {
    const id = req.params.id;
    if (!id || !rooms[id]) {
        return res.status(404).json({ error: "Room introuvable" });
    }

    const times = [];
    for (const key in rooms[id].times) {
        if (Object.hasOwnProperty.call(rooms[id].times, key)) {
            const element = rooms[id].times[key];
            times.push({
                username:element.username,
                time : element.time
            });
        }
    }

    res.json({
        id:id,
        times : times
    });
});

// Websocket game events
app.ws('/', (ws) => {
    ws.room = null;
    ws.id = idSocket++;

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);

        switch(data.type){
            case 'playerJoin':
                //Check des infos de la room
                if (data.roomId == undefined || rooms[data.roomId] == undefined) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Room introuvable"
                    }));
                    return;
                }

                //Check du pseudo
                if(!data.username || data.username.length===0 || data.username.length>20){
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Username invalide"
                    }));
                    return;
                }

                let usernameNotExist = true;

                rooms[data.roomId].foreachPlayer(pl=>{
                    if(usernameNotExist && pl.username===data.username){
                        usernameNotExist=false;
                        return
                    }
                });

                if(!usernameNotExist){
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Username all ready use"
                    }));
                    return;
                }

                console.log(`player ${data.username} (id : ${ws.id}) join room "${data.roomId}"`);

                ws.room=data.roomId;

                //Ajout des infos du player. On ajoute le websocket avec pour le broadcast plus tard
                rooms[data.roomId].players[ws.id] = {
                    username: data.username,
                    time: Infinity,
                    socket: ws,
                    data: {},
                };
                if(!rooms[data.roomId].times[data.username])rooms[data.roomId].times[data.username]={
                    username: data.username,
                    time : Infinity
                };
                rooms[ws.room].playerCount++;

                ws.send(JSON.stringify({
                    type:"joinOK",
                    mapID : rooms[ws.room].mapId,
                    playerId : ws.id
                }));
            break;

            case 'playerData':
                if (!data.data) return; //Aucune data

                //Enregistrement des données sur la position, vélocity, etc
                rooms[ws.room].players[ws.id].data = data.data;
            break;

            case 'playerTime':
                if (!data.time) return; //Aucune time
                const pl =  rooms[ws.room].players[ws.id];
                console.log(`player ${pl.username} (id : ${ws.id}) finish map "${ws.room}" with "${data.time}"s`);

                //Enregistrement des données sur la position, vélocity, etc
                const lastTime = rooms[ws.room].times[pl.username].time;
                rooms[ws.room].times[pl.username].time = Math.min(lastTime,data.time);

                //get le tableau des meilleurs temps de la map [{idroom: id, username: name, time: time},{etc}]
                let times = getTimeDb(rooms[ws.room].mapId);

                console.log("test:" + times);


                //On set la taleau s'il y en avait aucun dans la db
                if (result.length == 0){
                    for (let i = 0; i < 5; i++){
                        result.push({idroom: ws.room, username: "null", time: Infinity});
                    }
                }

                //Cherche le temps le plus grand dans la db
                for (let i = 1; i < times.length; i++) {
                    if (times[i].time > times[maxIndex].time) {
                        maxIndex = i;
                    }
                }

                let maxIndex = 0;


                //Si le nouveau temps et plus petit que le plus grand temps remplace
                if (lastTime < times[maxIndex].time) {
                    times[maxIndex] = {idroom: ws.room, username:  pl.username, time: lastTime};
                    setTimeDb(ws.id, times);
                }
            
                console.log("Nouveau temps dans la db: " + times);
            break;
        }
    });

    //Quand la socket se ferme on delete les infos du joueur parti
    ws.on('close', () => {
        console.log("ws quit : id->"+ws.id);
        if(ws.room===null)return;

        if(!rooms[ws.room] || !rooms[ws.room].players[ws.id])return;

        const player = rooms[ws.room].players[ws.id];
        console.log(`player ${player.username} (id : ${ws.id}) leave room "${ws.room}"`);
        if(rooms[ws.room].playerCount===1){
            console.log(`room "${ws.room}" kill`);
            clearInterval(rooms[ws.room].interval);
            delete rooms[ws.room];
        }
        else{
            delete rooms[ws.room].players[ws.id];
            rooms[ws.room].foreachPlayer(pl=>{
                pl.socket.send(JSON.stringify({type:"playerLeave",username:player.username}));
            })
            rooms[ws.room].playerCount--;
        }
    });
});


const server = app.listen(3000, () => {
    console.log("Server start");
    /*fetch("http://localhost:3000/publishMap/", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(
        {map : {
            name:"testLevel",
            backgroundColor:"#16162a",
            data:[[[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",5,{"rotation":3}],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",5,{"rotation":3}],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",6,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",5,{"rotation":3}],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",6,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],["main",4,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",5,{"rotation":3}],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",0,{"rotation":0}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",6,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],["main",0,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",5,{"rotation":3}],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",6,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],["main",0,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],["main",7,{"rotation":3}],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],["main",5,{"rotation":3}],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],["main",7,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],["main",0,{"rotation":1}],[],[],[],[],[],[],["main",4,{"rotation":0}],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],["main",0,{"rotation":2}],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],["main",0,{"rotation":1}],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],["main",4,{"rotation":2}],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],["main",0,{"rotation":2}],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],["main",4,{"rotation":2}],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",6,{"rotation":0}],["main",6,{"rotation":0}],["main",6,{"rotation":0}],["main",6,{"rotation":0}],[],[],[],["main",2,{"rotation":1}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",2,{"rotation":2}],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],["main",4,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],["main",2,{"rotation":3}],[],[],[],[],[],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",6,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",2,{"rotation":1}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",2,{"rotation":2}],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":2}],[],[],[],["main",6,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",6,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[[],[],[],[],[],[],["main",8,{"rotation":0}],[],[],[],[],[],[],[],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],[],[],[],["main",2,{"rotation":1}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],[],[],[],[],[],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":2}],[],[],[],["main",0,{"rotation":2}],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":0}],[],[],[],["main",6,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",6,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[["main",0,{"rotation":0}],["main",6,{"rotation":0}],["main",6,{"rotation":0}],["main",6,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",0,{"rotation":1}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":3}],["main",2,{"rotation":2}],[],["main",7,{"rotation":3}],[],[],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],[],[],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[["main",0,{"rotation":0}],["main",5,{"rotation":1}],[],["main",5,{"rotation":3}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",2,{"rotation":2}],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",6,{"rotation":2}],["main",6,{"rotation":2}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[["main",0,{"rotation":0}],["main",5,{"rotation":1}],[],["main",5,{"rotation":3}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",2,{"rotation":2}],[],[],[],[],[],[],[],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[["main",0,{"rotation":0}],["main",5,{"rotation":1}],[],["main",5,{"rotation":3}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",2,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[["main",0,{"rotation":0}],["main",5,{"rotation":1}],[],["main",5,{"rotation":3}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",2,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],[],[],[],["main",7,{"rotation":1}],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[["main",0,{"rotation":0}],["main",5,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":0}],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":2}],[],[],[],["main",4,{"rotation":0}],[],[],[],[],[],[],[],["main",4,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],[],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[["main",0,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],[],[],[],[],["main",7,{"rotation":0}],[],[],[],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],["main",4,{"rotation":0}],[],[],[],[],[],["main",7,{"rotation":0}],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":2}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":2}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],[],[],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],[],[],[],["main",6,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",6,{"rotation":0}],["main",6,{"rotation":0}],[],[],[],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",6,{"rotation":0}],["main",6,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",2,{"rotation":2}],[],[],["main",6,{"rotation":3}],[],[],[],[],["main",0,{"rotation":3}]],[["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}]],[["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],["main",0,{"rotation":2}],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":3}],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",6,{"rotation":2}],["main",6,{"rotation":2}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],[],[],[],[],[],[],[],["main",0,{"rotation":3}]],[["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],["main",0,{"rotation":2}],["main",0,{"rotation":0}],[],[],[],[],[],["main",4,{"rotation":2}],[],[],[],[],[],[],[],[],["main",4,{"rotation":2}],[],[],[],[],[],[],["main",4,{"rotation":2}],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],["main",7,{"rotation":3}],[],[],["main",0,{"rotation":3}]],[["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],["main",0,{"rotation":2}],[],[],["main",0,{"rotation":2}],[],["main",0,{"rotation":2}],[],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":1}],[],[],[],[],["main",7,{"rotation":1}],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],["main",7,{"rotation":0}],[],[],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":2}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":3}]],[["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],["main",0,{"rotation":2}],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":3}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],["main",0,{"rotation":2}]],[["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],[],[],[],["main",0,{"rotation":2}],[],[],[],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],[],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",6,{"rotation":1}],["main",4,{"rotation":1}],[],[],["main",0,{"rotation":2}]],[["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],["main",0,{"rotation":0}],[],[],["main",6,{"rotation":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",6,{"rotation":1}],["main",4,{"rotation":1}],[],[],["main",0,{"rotation":2}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],[],[],[],[],[],[],[],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",5,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],[],[],["main",6,{"rotation":1}],["main",4,{"rotation":1}],[],[],["main",0,{"rotation":2}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",6,{"rotation":1}],["main",4,{"rotation":1}],[],[],["main",0,{"rotation":2}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":0}],["main",6,{"rotation":0}],["main",6,{"rotation":0}],["main",6,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],[],[],[],[],[],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],["main",0,{"rotation":2}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":1}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],["main",4,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],["main",0,{"rotation":2}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],[],[],[],[],[],[],["main",4,{"rotation":3}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],["main",4,{"rotation":2}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],["main",0,{"rotation":2}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":1}],["main",4,{"rotation":1}],[],[],[],[],[],[],["main",4,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],["main",0,{"rotation":2}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":1}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],["main",0,{"rotation":0}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":2}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],[],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":1}],[],[],["main",0,{"rotation":0}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],["main",0,{"rotation":2}],[],[],[],["main",0,{"rotation":0}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],[],[],[],[],[],[],["main",0,{"rotation":0}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",4,{"rotation":0}],["main",0,{"rotation":0}]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}],["main",0,{"rotation":0}]]]
        }}
    )
}).then(res => res.json())
.then(data => console.log(data));*/
});

//A un interval regulier, on envoie a tous les joueurs les données des positions de tous les joueurs.


//Quand on ferme le server, on ferme la connexion db
async function shutdown() {
    server.close(async () => {
        await client.close();
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);