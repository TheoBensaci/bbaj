import express from "express";
import expressWs from "express-ws";

const app = express();
expressWs(app);




// Serve the public directory
app.use(express.static("app"));

// Serve the src directory
app.use("/src", express.static("src"));

// Websocket game events
app.ws("/", (ws) => {
  // ...
});

app.listen(3000);

console.log("App started.");
