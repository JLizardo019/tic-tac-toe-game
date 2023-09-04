const dotenv = require("dotenv").config();
const fs = require("fs").promises;

// express server
const express = require("express");
const app = express();
app.use(express.static(__dirname + "/public"));

// websocket
let expressWs = require("express-ws")(app);
const dir = __dirname;

let clients = {};

// checkClients();
// let c = expressWs.getWss().clients;
// console.log(Object.keys(c));
// setInterval(checkClients, 30000);

app.get("/game", (req, res) => {
  console.log("requesting game page");
  res.sendFile(dir + "/server_files/game.html");
});
app.get("/game.css", (req, res) => {
  res.sendFile(dir + "/server_files/game.css");
});

app.get("/game.js", (req, res) => {
  res.sendFile(dir + "/server_files/game.js");
});

app.get("/start", async (req, res) => {
  // find an available session, otherwise make one
  const rawdata = await fs.readFile("db.json");
  const db = await JSON.parse(rawdata);

  let id = null;

  for (let key in db) {
    let players = db[key].players;
    if (players === 1) {
      id = key;
      db[key].players = 2;
      break;
    }
  }

  if (!id) {
    // all sessions are full, make a new one
    const keys = Object.keys(db);
    id = makeNewSession(keys);

    db[id] = {
      // add new entry in db
      players: 1,
      order: []
    };
  }

  // update db
  const data = JSON.stringify(db, null, 2);
  await fs.writeFile("db.json", data);

  res.json({ session: id });
});

app.ws("/:session", (ws, req) => {
  // find session an update
  const id = req.params.session;
  ws.on("message", async function(msg) {
    
    const rawdata = await fs.readFile("db.json");
    const db = await JSON.parse(rawdata);
    console.log(msg);
    msg = msg.split(",");
    const keyword = msg[0];
    // console.log(ws);

    if (keyword === "room_full") {
      if (db[id].players === 2) {
        ws.send("status,true");
      } else {
        ws.send("status,false");
      }
    } 
    else if (keyword === "quit") {
      // close connections
      if(id + "1" in clients){
        clients[id + "1"].close();
        delete clients[id + "1"];
      }
      if(id + "2" in clients){
        clients[id + "2"].close();
        delete clients[id + "2"];
      }
      

      // delete from database
      delete db[id];
      const data = JSON.stringify(db, null, 2);
      await fs.writeFile("db.json", data);

      
    } 
    else if (keyword === "turn") {
      if (db[id]["order"].length === 0) {
        const pick = Math.floor(Math.random() * 2) + 1;

        if (pick === 1) {
          db[id]["order"][0] = 1;
          clients[id + "1"] = ws;
          ws.send(`turn,1,${id + "2"}`);
        } else {
          db[id]["order"][0] = 2;
          clients[id + "2"] = ws;
          ws.send(`turn,2,${id + "1"}`);
        }
      } else {
        if (db[id]["order"][0] === 1) {
          db[id]["order"][1] = 2;
          clients[id + "2"] = ws;
          ws.send(`turn,2,${id + "1"}`);
        } else {
          db[id]["order"][1] = 1;
          clients[id + "1"] = ws;
          ws.send(`turn,1,${id + "2"}`);
        }
      }

      const data = JSON.stringify(db, null, 2);
      await fs.writeFile("db.json", data);
    } 
    else if (keyword === "gameover") {
      broadcast(id, "gameover" + "," + msg[1]);
    } 
    else if (keyword === "move") {
      broadcast(id, "move" + "," + msg[1] + "," + msg[2] + "," + msg[3]);
    } 
    else if (keyword === "again") {
      clients[msg[1]].send("again");
    } 
    else if (keyword === "reset") {
      broadcast(id, `reset,${msg[1]}`);
      db[id]["order"] = [];
      const data = JSON.stringify(db, null, 2);
      await fs.writeFile("db.json", data);
    }
  });
  
  ws.on("close", async function(){ /// make sure to close db
    if(id + "1" in clients){
      delete clients[id + "1"];
    }
    if(id + "2" in clients){
      delete clients[id + "2"];
    }
    
    // delete from database
    const rawdata = await fs.readFile("db.json");
    const db = await JSON.parse(rawdata);
    delete db[id];
    const data = JSON.stringify(db, null, 2);
    await fs.writeFile("db.json", data);
  });
});

app.get("/clients", async (req, res) => {
  let length = Object.keys(clients).length;
  res.send(length + "");
});

app.listen(3000, () => {
  console.log("listening on port localhost:3000");
});

function makeNewSession(keys) {
  let newId = "";

  while (true) {
    for (let i = 0; i < 6; i++) {
      let random_Letter = 65 + Math.floor(Math.random() * 26);
      newId += String.fromCharCode(random_Letter);
    }

    if (!keys.includes(newId)) {
      // make sure the new id doesn't already exist
      break;
    }
  }

  return newId;
}

// make a broadcast function
async function broadcast(id, message) {
  clients[id + "1"].send(message);
  clients[id + "2"].send(message);
}

// function checkClients(){
  
  
//   let c = expressWs.getWss().clients;
// console.log(Object.keys(c));
//   let count = 0;
  
//   for( let k in clients){
//     if (!(e in Object.values(clients))){
//       let key = getKeyByValue(clients, e);
//       de
//   }
//   console.log(count, Object.keys(clients));
//   // clients.forEach(c =>{
//   //   if(c.isAlive ===false){
//   //     return c.close();
//   //   }
//   // })
// }

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

