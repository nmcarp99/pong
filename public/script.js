function handleKeyEvent(e) {
  if (e.repeat) return;

  socket.emit(e.type, e.code);
}

var room = "";
var player1;
var player2;
var size = [];

while (room == "" || room == null || room == undefined) {
  room = prompt("Room Code:");
}

var socket = io();

socket.emit("setScreenSize", [window.innerWidth, window.innerHeight]);

socket.emit("room", room);

socket.on("updateBody", body => {
  document.body.innerHTML = body;
  
  player1 = document.getElementById("player1");
  player2 = document.getElementById("player2");
});

socket.on("setScreenSize", newSize => {
  let game;

  while (!game) {
    game = document.getElementsByClassName("game")[0];
  }
  
  size = newSize;

  game.style.height = size[1] + "px";
  game.style.width = size[0] + "px";
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
  if (player1 == null || player2 == null) return;
  player1.style.top = positions[0] - 30 + "px";
  player2.style.top = positions[1] - 30 + "px";
});

window.addEventListener("keydown", handleKeyEvent);
window.addEventListener("keyup", handleKeyEvent);