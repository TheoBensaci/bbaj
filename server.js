import express from "express";
import expressWs from "express-ws";
import { MongoClient } from "mongodb";
import { ObjectId } from "mongodb";

const app = express();
expressWs(app);

let idRoom = 0;
let idSocket = 0;
const rooms = {};
const INTERVAL = 20;

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
    const maps = await db.collection("map").find().toArray();
    const ids = maps.map(r => r._id);

    res.json(ids);
});

//Retourne une map par rapport à son id
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


//Creation d'une room
app.post('/createRoom', (req, res) => {
    const levelId = req.body.levelId;

    if (!levelId) {
        return res.status(400).json({ error: "levelId manquant" });
    }

    const roomId = idRoom++;

    rooms[roomId] = {
        levelId,
        playersInfo: {}
    };

    res.json({ roomId });
});

//On récupére l'id de la room s'il existe
app.get('/room/:id', async (req, res) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
        return res.status(400).json({ error: "Id invalide" });
    }

    if (!rooms[id]) {
        return res.status(404).json({ error: "Room introuvable" });
    }

    res.json(rooms[id]);
});

// Websocket game events
app.ws('/', (ws) => {
    ws.room = null;
    ws.id = idSocket++; 

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);

        if (data.type === 'join') {
            //Check des infos de la room
            if (data.idRoom == undefined || rooms[data.idRoom] == undefined) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Room introuvable"
                }));
                return;
            }

            //Check du pseudo
            if (
                !data.username ||
                data.username.trim().length === 0 ||
                !/^[a-zA-Z0-9_-]{3,16}$/.test(data.username)
            ) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Username invalide"
                }));
                return;
            }

            //Ajout des infos du player. On ajoute le websocket avec pour le broadcast plus tard
            rooms[data.idRoom].playersInfo[ws.id] = {
                username: data.username,
                time: 0,
                socket: ws,
                data: {},
            };

            ws.room = data.idRoom;
        } else if (data.type === 'position') {
            if (!ws.room || !rooms[ws.room]) return; //Room n'existe pas
            if (!data.userid) return; //Aucun id
            if (!data.positions) return; //Aucune positions

            //Enregistrement des données sur la position, vélocity, etc
            rooms[ws.room].playersInfo[data.userid].data = data.positions;
        }
    });

    //Quand la socket se ferme on delete les infos du joueur parti
    ws.on('close', () => {
        if (ws.room != null && rooms[ws.room]) {
            delete rooms[ws.room].playersInfo[ws.id];
        }
    });
});


const server = app.listen(3000, () => {
    console.log("Server start");
});

//A un interval regulier, on envoie a tous les joueurs les données des positions de tous les joueurs.
setInterval(() => {
    const allPositions = []; //On stock toute les positions de tous les joueurs
    
    rooms.forEach(room => {
        room.forEach(playersInfo => {
            if (playersInfo.length != 0){
                playersInfo.forEach(playInfo => {
                    allPositions.push({
                        id: playInfo.id,
                        data: playInfo.data
                    });
                });
            }
        });
    });
    
    rooms.forEach(room => {
        room.forEach(playersInfo => {
            if (playersInfo.length != 0){
                playersInfo.forEach(playInfo => {
                    //Ne pas envoyer sa propre position
                    const filtered = allPositions.filter(
                        p => p.id !== playInfo.id
                    );

                    playInfo.ws.send(JSON.stringify(filtered));
                });
            }
        });
    });
}, INTERVAL);


//Quand on ferme le server, on ferme la connexion db
async function shutdown() {
    server.close(async () => {
        await client.close();
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);