let url_base = "restfulpro3.glitch.me";
let connection;
let validExit = true;
let recipient;

setupGame();


// get references
const boxes = document.querySelectorAll(".box");
const room = document.getElementById("room");
const turn = document.getElementById("turn");
const play_report = document.getElementById("player");
const winner = document.getElementById("winner");
const again = document.getElementById("again");
again.style.display="none";
const progress = document.getElementById("progress");
const main = document.querySelector("main");
main.style.display = "none";

window.addEventListener("beforeunload", function(e) {
  if (validExit) {
    // var confirmationMessage = "are you sure";
    e.preventDefault();

    // alert("waitt");
    // (e || window.event).returnValue = confirmationMessage;//Gecko + IE
    connection.send("quit");

    // return confirmationMessage;                            //Webkit, Safari, Chrome
  }
});

let player;
let justplayed = 2;
let empty = boxes.length-1;
let gameOver = false;

function start() {
  boxes.forEach(function(b, pos) {
    
    b.onclick = function() {
      // make sure it is an empty box
      if (b.innerText === "_" && gameOver === false) {
        // console.log(player, justplayed);
        
        // decide which player it is
        if (player === 1 && justplayed === 2) {
          b.innerText = "X";
          b.style.color = '#d2d4d5';
          connection.send(`move,${pos},X,1`);
          if(player===1){
            turn.innerText = "Opponent's Turn";
            turn.style.color = "#d2d4d5";
          }
          else{
            turn.innerText = "Your Turn";
            turn.style.color = "#77878b";
          }

        } else if (player === 2 && justplayed === 1) {
          b.innerText = "O";
          b.style.color = '#d2d4d5';
          connection.send(`move,${pos},O,2`);
          if(player===2){
            turn.innerText = "Opponent's Turn";
            turn.style.color = "#d2d4d5";
          }
          else{
            turn.innerText = "Your Turn";
            turn.style.color = "#77878b";
          }
          
        }
      }
      
      //see if anyone has won yet
      checkGameWinner();
    };
  });
}

async function setupGame() {
  // load page, get session id, and setup websocket
  const response = await fetch(`https://${url_base}/start`);
  const result = await response.json();
  room.innerText = `Room Code: ${result.session}`;
  establishWebSocket(result.session);
}

function establishWebSocket(session) {
  // establish websocket
  console.log(session);

  // web sockets
  const url = `wss://${url_base}/${session}`;
  connection = new WebSocket(url);

  connection.onopen = () => {
    console.log("connection established");
    connection.send(`room_full`);
  };

  connection.onmessage = async e => {
    console.log(e.data);
    let msg = e.data;
    msg = msg.split(",");
    const keyword = msg[0];
    if (keyword ==="status"){
        if (msg[1] === "true") {
        progress.style.display = "none";
        main.style.display = "block";
        connection.send("turn");
        start();
      } else {
        connection.send("room_full");
      } 
    }
    else if (keyword==="turn") {
      recipient = msg[2];
      player = parseInt(msg[1]);
      if(player===1){
          turn.innerText = "Your Turn";
          turn.style.color = "#77878b";
      }
      else{
          turn.innerText = "Opponent's Turn";
          turn.style.color = "#d2d4d5";
      }
      
      
    } 
    else if (keyword==="gameover") {
      again.style.display="block";
      if (msg[1] === "1") {
        if(player===1){
          document.body.style.backgroundImage = "url(confetti.gif)";
          alert("You win!");
        }
        else{
          alert("You lost.");
        }
        gameOver = true;
        
      } else if (msg[1] === "2") {
        if(player===2){
          document.body.style.backgroundImage = "url(confetti.gif)";
          alert("You win!");
        }
        else{
          alert("You lost.");
        }
        gameOver = true;
        
      } else {
        alert("It's a draw.");
        gameOver = true;
      }
    } 
    else if (keyword === "move") {
      justplayed = parseInt(msg[3]);
      
      if(justplayed===player){
            turn.innerText = "Opponent's Turn";
            turn.style.color = "#d2d4d5";
      }
      else{
            turn.innerText = "Your Turn";
            turn.style.color = "#77878b";
      }
      boxes[parseInt(msg[1])].innerText = msg[2];
      boxes[parseInt(msg[1])].style.color = '#d2d4d5';
      empty -= 1;
    }
    else if (keyword === "again"){
      if(confirm("Your opponent wants to play again! Press 'OK' to accept or 'Cancel' to quit.")){
        connection.send(`reset,${recipient}`);
      }
      else{
        connection.send("quit");
      }
    }
    else if (keyword === "reset"){
      if (msg[1]!==recipient){
        alert("Your opponent has accepted!")
      }
      reset();
    }
  };

  connection.onclose = () => {
    window.location.href = `https://${url_base}`;
  };

  connection.onerror = error => {
    console.log(`WebSocket error: ${error}`);
  };
}

function reset() {
  // reset game variables
  boxes.forEach(function(b) {
    b.innerText = "_";
    b.style.color = "transparent";
  });
  gameOver = false;
  empty = boxes.length-1;
  player = 1;
  document.body.style.backgroundImage = "";
  turn.innerText = "";
  justplayed = 2;
  connection.send("turn");
  
}

function anotherRound(){
  connection.send(`again,${recipient}`);
}

function quit() {
  if (
    confirm("You will lose all game progress! Are you sure you want to quit?")
  ) {
    validExit = false;
    connection.send("quit");
  }
}

function checkGameWinner() {
  //player 1
  if (
    boxes[0].innerText + "" + boxes[1].innerText + boxes[2].innerText ===
      "XXX" ||
    boxes[3].innerText + boxes[4].innerText + boxes[5].innerText === "XXX" ||
    boxes[6].innerText + boxes[7].innerText + boxes[8].innerText === "XXX" ||
    boxes[0].innerText + boxes[3].innerText + boxes[6].innerText === "XXX" ||
    boxes[1].innerText + boxes[4].innerText + boxes[7].innerText === "XXX" ||
    boxes[2].innerText + boxes[5].innerText + boxes[8].innerText === "XXX" ||
    boxes[0].innerText + boxes[4].innerText + boxes[8].innerText === "XXX" ||
    boxes[2].innerText + boxes[4].innerText + boxes[6].innerText === "XXX"
  ) {
    connection.send(`gameover,1`);
  }
  //player 2
  else if (
    boxes[0].innerText + "" + boxes[1].innerText + boxes[2].innerText ===
      "OOO" ||
    boxes[3].innerText + boxes[4].innerText + boxes[5].innerText === "OOO" ||
    boxes[6].innerText + boxes[7].innerText + boxes[8].innerText === "OOO" ||
    boxes[0].innerText + boxes[3].innerText + boxes[6].innerText === "OOO" ||
    boxes[1].innerText + boxes[4].innerText + boxes[7].innerText === "OOO" ||
    boxes[2].innerText + boxes[5].innerText + boxes[8].innerText === "OOO" ||
    boxes[0].innerText + boxes[4].innerText + boxes[8].innerText === "OOO" ||
    boxes[2].innerText + boxes[4].innerText + boxes[6].innerText === "OOO"
  ) {
    connection.send(`gameover,2`);
  }
  // draw
  else if (empty === 0) {
    
    connection.send(`gameover,3`);
  }
}
