import express from "express";
import expressWs from "express-ws";
import { MongoClient } from "mongodb";

const app = express();
expressWs(app);

let idRoom = 0;
let idSocket = 0;
const rooms = {};

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

//Retourne une map par rapport à son id
app.get("/map/:id", async (req, res) => {
    try {
        const user = await db.collection("map").findOne({
            _id: new ObjectId(req.params.id)
        });

        if (!user) {
            return res.status(404).json({ error: "map introuvable" });
        }

        res.json(user);

    } catch (err) {
        res.status(400).json({ error: "id invalide" });
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
    if (req.params <= idRoom){
        res.json(req.params);
    }else {
        return res.status(404).json({error: "Id room invalide"})
    }
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
            };

            ws.room = data.idRoom;
        } else if (data.type === 'position') {
            if (!ws.room || !rooms[ws.room]) return; //Room n'existe pas

            if (!data.positions) return; //Aucune positions

            //brodcast all joueur
            //I gues on aura les postitions des joueurs dans data.positions {{id:joueur, x:x, y:y}, {...}, ...}
            rooms[ws.room].forEach((socket) => {
                socket.send(JSON.stringify(data.positions));
            });
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


//Quand on ferme le server, on ferme la connexion db
async function shutdown() {
    server.close(async () => {
        await client.close();
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);