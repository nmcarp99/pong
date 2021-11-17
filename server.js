const port = 8080;

const speed = 4;

// import all dependencies
var fs = require("fs");
var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);

var rooms = {};
var gameData = {};
var smallestScreen = {};

function resetGameData(room) {
  gameData[room] = {
    player1Pos: 0,
    player2Pos: 0,
    ups: [0, 0],
    downs: [0, 0],
    gameStarted: false
  };
}

app.get("/*", (req, res) => {
  if (fs.existsSync("/app/public" + req.url)) {
    res.sendFile("/app/public" + req.url);
  } else {
    res
      .status(404)
      .send("File not found at " + req.url + " on port 80")
      .end();
  }
});

io.on("connection", socket => {
  console.log(socket.id + " connected.");

  socket.on("room", room => {
    if (rooms[room] && rooms[room].length == 2) {
      socket.emit("failedJoin", "Room is already full.");
      return;
    }

    socket.room = room;

    socket.join(socket.room);

    if (!rooms[socket.room] || rooms[socket.room].length == 0) {
      rooms[socket.room] = [socket];
      smallestScreen[socket.room] = 0;

      resetGameData(socket.room);

      socket.emit(
        "updateBody",
        fs.readFileSync("/app/serverfiles/startbutton.html", "utf8")
      );
    } else {
      rooms[socket.room].push(socket);

      let currentSmallestSize =
        rooms[socket.room][smallestScreen[socket.room]].size;

      if (
        socket.size[0] < currentSmallestSize[0] ||
        socket.size[1] < currentSmallestSize[1]
      ) {
        smallestScreen[socket.room] = rooms[socket.room].length - 1;
      }
    }
  });

  socket.on("start", () => {
    if (rooms[socket.room][0] == socket && rooms[socket.room].length == 2) {
      // set the position of the paddles
      let screenSize = rooms[socket.room][smallestScreen[socket.room]].size;
      gameData[socket.room].player1Pos = screenSize[1] / 2;
      gameData[socket.room].player2Pos = screenSize[1] / 2;

      // check if we are the earliest person in
      io.to(socket.room).emit(
        "updateBody",
        fs.readFileSync("/app/serverfiles/client.html", "utf8")
      );
      io.to(socket.room).emit(
        "setScreenSize",
        rooms[socket.room][smallestScreen[socket.room]].size
      );
      setInterval(() => {
        // move player 1
        let endLocation =
          gameData[socket.room].player1Pos +
          (gameData[socket.room].downs[0] - gameData[socket.room].ups[0]) *
            speed;

        if (endLocation >= 30 && endLocation <= screenSize[1] - 30)
          gameData[socket.room].player1Pos = endLocation;

        // move player 2
        endLocation =
          gameData[socket.room].player2Pos +
          (gameData[socket.room].downs[1] - gameData[socket.room].ups[1]) *
            speed;

        if (endLocation >= 30 && endLocation <= screenSize[1] - 30)
          gameData[socket.room].player2Pos = endLocation;

        io.to(socket.room).emit("updatePositions", [
          gameData[socket.room].player1Pos,
          gameData[socket.room].player2Pos
        ]);
      }, 10);
    }
  });

  socket.on("setScreenSize", size => {
    socket.size = size;
  });

  socket.on("keydown", code => {
    let player = 1; // player 1 or 2 (really 0 or 1)

    if (rooms[socket.room][0] == socket) {
      player = 0;
    }

    switch (code) {
      case "ArrowUp":
        gameData[socket.room].ups[player] = 1;
        break;
      case "ArrowDown":
        gameData[socket.room].downs[player] = 1;
        break;
      default:
        return;
    }
  });

  socket.on("keyup", code => {
    let player = 1; // player 1 or 2 (really 0 or 1)

    if (rooms[socket.room][0] == socket) {
      player = 0;
    }

    switch (code) {
      case "ArrowUp":
        gameData[socket.room].ups[player] = 0;
        break;
      case "ArrowDown":
        gameData[socket.room].downs[player] = 0;
        break;
      default:
        return;
    }
  });

  socket.on("disconnect", () => {
    rooms[socket.room] = [];

    socket.to(socket.room).emit("playerLeft");

    console.log(socket.id + " disconnected.");
  });
});

http.listen(port);
