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
// TODO reable data base
/*
const client = new MongoClient("mongodb://localhost:27017");
await client.connect();
let db = client.db("baj");
console.log("MongoDB connecté");*/


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

//Retourne une map par rapport à son id (JSON)
app.get("/map/:id", async (req, res) => {
    try {
        const map = await db.collection("map").findOne({
            _id: new ObjectId(req.params.id)
        });

        if (!map) {
            return res.status(404).json({ error: "map introuvable" });
        }

        res.json(map.map);
    } catch (err) {
        res.status(500).json({ error: "id invalide" });
    }
});

// TODO get pour avoir le temp d'une map


//Creation d'une room
app.post('/createRoom', (req, res) => {
    const mapId = req.body.mapId;

    if (!mapId) {
        return res.status(400).json({ error: "levelId manquant" });
    }

    // check if the map id is valide
    const roomId = generateRoomId();

    const room ={
        mapId: mapId,
        players: {},
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
    rooms[id].foreachPlayer((pl)=>{
        times.push({
            username:pl.username,
            time : pl.time
        });
    });

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

                let ok = true;

                rooms[data.roomId].foreachPlayer(pl=>{
                    if(ok && pl.username===data.username){
                        ok=false;
                        return
                    }
                });

                if(!ok){
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
                rooms[ws.room].playerCount++;

                ws.send(JSON.stringify({
                    type:"joinOK",
                    mapID : rooms[ws.room].mapId,
                    playerId : ws.id
                }));
            break;

            case 'playerData':
                if (!data.data) return; //Aucune data

                //console.log("ws send data : id->"+ws.id);

                //Enregistrement des données sur la position, vélocity, etc
                rooms[ws.room].players[ws.id].data = data.data;
            break;

            case 'playerTime':
                if (!data.time) return; //Aucune time

                console.log(`player ${data.username} (id : ${ws.id}) finish map with "${data.time}"s`);

                //Enregistrement des données sur la position, vélocity, etc
                const lastTime = rooms[ws.room].players[ws.id].time;
                rooms[ws.room].players[ws.id].time = Math.min(lastTime,data.time);

                // TODO check si le temps est top 5, si oui, place it
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
});

//A un interval regulier, on envoie a tous les joueurs les données des positions de tous les joueurs.


//Quand on ferme le server, on ferme la connexion db
async function shutdown() {
    server.close(async () => {
        // TODO reable data base
        //await client.close();
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);