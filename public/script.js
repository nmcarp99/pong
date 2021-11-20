const paddleMargin = 20;
const paddleHeight = 60;
const paddleWidth = 20;
const ballRadius = 10;

function handleKeyEvent(e) {
  if (e.repeat) return;

  socket.emit(e.type, e.code);
}

function handleMessageKeyPress(e) {
  if (e.code == "Enter") {
    let message = document.getElementById("message");

    socket.emit("message", message.value);
    
    message.value = "";
  }
}

var room = "";
var playerName = "";
var game;
var gameContext;
var size = [];

while (room == "" || room == null || room == undefined) {
  room = prompt("Room Code: ");
}

while (playerName == "" || playerName == null || playerName == undefined) {
  playerName = prompt("Player Name: ");
}

var socket = io();

socket.emit("setScreenSize", [window.innerWidth - 50, window.innerHeight - 50]);

socket.emit("playername", playerName);

socket.emit("room", room);

socket.on("updateBody", body => {
  document.getElementById("mainContent").innerHTML = body;

  game = document.getElementById("game");

  if (game) {
    gameContext = game.getContext("2d");
  }
});

socket.on("setScreenSize", newSize => {
  while (!game) {}

  size = newSize;

  console.log(size);

  game.height = size[1];
  game.width = size[0];
});

socket.on("playerLeft", () => {
  alert("A player left...");
  location.reload();
});

socket.on("failedJoin", reason => {
  alert("Failed to join room... " + reason);
  location.reload();
});

socket.on("updatePositions", positions => {
  if (!game) return;

  gameContext.clearRect(0, 0, game.width, game.height);

  gameContext.fillStyle = "#FFFF00";

  gameContext.beginPath();
  gameContext.arc(positions[2][0], positions[2][1], ballRadius, 0, 2 * Math.PI);
  gameContext.fill();

  gameContext.fillStyle = "#00FF00";

  gameContext.beginPath();
  gameContext.rect(
    paddleMargin,
    positions[0] - paddleHeight / 2,
    paddleWidth,
    paddleHeight
  );
  gameContext.fill();

  gameContext.beginPath();
  gameContext.rect(
    game.width - paddleWidth - paddleMargin,
    positions[1] - paddleHeight / 2,
    paddleWidth,
    paddleHeight
  );
  gameContext.fill();
});

socket.on("updateUserList", userList => {
  let output = "";

  document.getElementById("room").innerHTML = room;

  for (let user of userList) {
    output += "<h4>" + user + "</h4>";
  }

  document.getElementById("userListContent").innerHTML = output;
});

socket.on("message", data => {
  let chatContent = document.getElementById("chatContent");
  
  chatContent.innerHTML = "&nbsp;&nbsp;" + data + "<br>" + chatContent.innerHTML;
});

window.addEventListener("keydown", handleKeyEvent);
window.addEventListener("keyup", handleKeyEvent);

window.addEventListener("load", () => {
  document.getElementById("message").addEventListener("keydown", handleMessageKeyPress);
});
window.addEventListener("beforeunload", event => {
  event.returnValue = false;
});