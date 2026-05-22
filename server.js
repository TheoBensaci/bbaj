import express, { json } from "express";
import expressWs from "express-ws";

const app = express();
expressWs(app);

let idRoom = 0;
let idSocket = 0;
let rooms = {}

// Serve the public directory
app.use(express.static("app"));

// Serve the src directory
app.use("/src", express.static("src"));

app.post("/createRoom", (req, res) => {
  rooms[idRoom++] = {'levelId':req.params.levelId ,'playersInfo': []}
});


// Websocket game events
app.ws("/", (ws) => {
  ws.on("message", (msg) => {
    ws.room = null;
    ws.id = idSocket++;
    let data = JSON.parse(msg);
    
    if (data.type === "join"){
      if (data.idRoom == undefined ||
        rooms[data.idRoom] == undefined
      ){
        //ws.send() error l'id room pas valide TODO methode send
        return;
      }

      if (data.username == undefined || 
        data.username == null ||  
        username.trim().length === 0 ||
        !/^[a-zA-Z0-9_-]{3,16}$/.test(username)){
        //ws.sen() error le username pas valide TODO methode send
        return;
      }

      rooms[data.idRoom].playersInfo[ws.id] = {'username': data.username, 'time': 0, 'socket': ws};
      ws.room = data.idRoom;
    }else if (data.type === "position"){
      //TODO afficher phantom joueur
      //brodcast all joueur
      //rooms[ws.room].forEach((socket) => /*send*/); check si socket pas null
    }
  });

  ws.on("close", (msg) => {
    let data = JSON.parse(msg);
    rooms[ws.room].playersInfo[ws.id].socket = null;
  });
});

app.listen(3000);

console.log("App started.");
