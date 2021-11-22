const botRoasts = [
  "Bot: Wow, you couldn't even find anyone to play pong with you? I thought I was lame...",
  "Bot: Wow, even I have more friends than you...",
  "Bot: I have so many friends that I have to play multiple games at a time...",
  "Bot: Where's your friend?",
  "Bot: Don't have any friends I see... Don't worry. I'll go easy on you."
];

const botScoreMessages = [
  "Bot: Wow, you're just that bad...",
  "Bot: I could do this in my sleep.",
  "Bot: Wow, I don't think you could beat a calculator.",
  "Bot: Oh come on, try this time.",
  "Bot: What are you doing?",
  "Bot: Too easy.",
  "Bot: Go play with one of your puny human friends... If only you had any...",
  "Bot: Shouldn't you be doing schoolwork?",
  "Bot: Pay attention!!!"
];

const botLoseMessages = [
  "Bot: Obviously I'm not trying...",
  "Bot: I hope you realize that I've been programmed to fail...",
  "Bot: Pffft... That was on purpose.",
  "Bot: Now now, go easy on me, alright?",
  "Bot: Don't try too hard now...",
  "Bot: Now try to beat another one of those peskey humans you call friends... Oh wait! You don't have any."
];

const paddleMargin = 20;
const paddleHeight = 60;
const paddleWidth = 20;
const ballRadius = 10;

const port = 8080;

const speed = 4;
const botSpeed = 4;
const angleFactor = 0.07;
const ballSpeed = 7;
const refreshDelay = 10;
const scoreLimit = 10;

// import all dependencies
var fs = require("fs");
var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);

var rooms = {};
var gameData = {};
var smallestScreen = {};

function requestUserListUpdate(room) {
  let names = [];

  for (let socket of rooms[room]) {
    names.push(socket.name);
  }

  io.to(room).emit("updateUserList", names);
}

function getBallDirection(room) {
  let player1Pos = gameData[room].player1Pos;
  let player2Pos = gameData[room].player2Pos;
  let ballPos = gameData[room].ballPos;
  let ballDirection = gameData[room].ballDirection;
  let screenSize = rooms[room][smallestScreen[room]].size;

  // check if ball is outside the map
  if (ballPos[0] - ballRadius <= 0) {
    if (!rooms[room][1]) {
      io.to(room).emit(
        "message",
        botScoreMessages[Math.floor(Math.random() * botScoreMessages.length)]
      );
    }

    gameData[room].player2Score++;
    resetGameData(room);

    if (gameData[room].player2Score == scoreLimit) {
      if (rooms[room][1]) {
        io.to(room).emit("ended", rooms[room][1].name);
      } else {
        io.to(room).emit("ended", "Bot");
      }

      gameData[room].player1Score = 0;
      gameData[room].player2Score = 0;
    }

    io.to(room).emit("updateScores", [
      gameData[room].player1Score,
      gameData[room].player2Score
    ]);

    return [ballSpeed, 0];
  } else if (ballPos[0] + ballRadius >= screenSize[0]) {
    if (!rooms[room][1]) {
      io.to(room).emit(
        "message",
        botLoseMessages[Math.floor(Math.random() * botLoseMessages.length)]
      );
    }

    gameData[room].player1Score++;
    resetGameData(room);

    if (gameData[room].player1Score == scoreLimit) {
      io.to(room).emit("ended", rooms[room][0].name);

      gameData[room].player1Score = 0;
      gameData[room].player2Score = 0;
    }

    io.to(room).emit("updateScores", [
      gameData[room].player1Score,
      gameData[room].player2Score
    ]);

    return [ballSpeed, 0];
  }

  // check for collision with top or bottom

  if (ballPos[1] - ballRadius <= 0) {
    return [ballDirection[0], Math.abs(ballDirection[1])];
  }

  if (ballPos[1] + ballRadius >= screenSize[1]) {
    return [ballDirection[0], -Math.abs(ballDirection[1])];
  }

  // check for collision with the first paddle

  // check if ball is to the left of the first paddle
  if (ballPos[0] - ballRadius <= paddleWidth + paddleMargin) {
    // check if the ball is in line with the paddle
    if (
      (ballPos[1] + ballRadius >= player1Pos - paddleHeight / 2 &&
        ballPos[1] + ballRadius <= player1Pos + paddleHeight / 2) || // everything in parentheses are for checking the bottom part of the ball
      (ballPos[1] - ballRadius >= player1Pos - paddleHeight / 2 &&
        ballPos[1] - ballRadius <= player1Pos + paddleHeight / 2) // this is for checking the top
    ) {
      return [
        Math.abs(ballDirection[0]),
        -((player1Pos - ballPos[1]) * angleFactor)
      ];
    }
  }

  // check for collision with the second paddle

  // check if ball is to the right of the second paddle
  if (ballPos[0] + ballRadius >= screenSize[0] - paddleMargin - paddleWidth) {
    // check if the ball is in line with the paddle

    if (
      (ballPos[1] + ballRadius >= player2Pos - paddleHeight / 2 &&
        ballPos[1] + ballRadius <= player2Pos + paddleHeight / 2) || // everything in parentheses are for checking the bottom part of the ball
      (ballPos[1] - ballRadius >= player2Pos - paddleHeight / 2 &&
        ballPos[1] - ballRadius <= player2Pos + paddleHeight / 2) // this is for checking the top
    ) {
      return [
        -Math.abs(ballDirection[0]),
        -((player2Pos - ballPos[1]) * angleFactor)
      ];
    }
  }

  return ballDirection;
}

function resetGameData(room) {
  let screenSize = rooms[room][smallestScreen[room]].size;

  if (gameData[room] == undefined) {
    gameData[room] = {
      player1Pos: 0,
      player2Pos: 0,
      ups: [0, 0],
      downs: [0, 0],
      ballPos: [0, 0],
      ballDirection: [0, 0],
      updateInterval: undefined,
      player1Score: 0,
      player2Score: 0,
      botEnabled: [false, false]
    };
  }

  gameData[room].player1Pos = screenSize[1] / 2;
  gameData[room].player2Pos = screenSize[1] / 2;
  gameData[room].ballPos = [screenSize[0] / 2, screenSize[1] / 2];
  gameData[room].ballDirection = [ballSpeed, 0];

  // check if we are the earliest person in
  io.to(room).emit(
    "updateBody",
    fs.readFileSync("/app/serverfiles/client.html", "utf8")
  );
  io.to(room).emit("setScreenSize", rooms[room][smallestScreen[room]].size);
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
    if (gameData[room] && gameData[room].playerLeft) {
      rooms[room] = [];
    }

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

    requestUserListUpdate(socket.room);
  });

  socket.on("start", () => {
    if (rooms[socket.room][0] == socket) {
      if (rooms[socket.room].length == 1) {
        io.to(socket.room).emit(
          "message",
          botRoasts[Math.floor(Math.random() * botRoasts.length)]
        );
      }

      let screenSize = rooms[socket.room][smallestScreen[socket.room]].size;

      resetGameData(socket.room);

      gameData[socket.room].updateInterval = setInterval(() => {
        // move player 1
        let endLocation =
          gameData[socket.room].player1Pos +
          (gameData[socket.room].downs[0] - gameData[socket.room].ups[0]) *
            speed;

        if (gameData[socket.room].botEnabled[0]) {
          endLocation +=
            ((gameData[socket.room].ballPos[1] >
              gameData[socket.room].player1Pos + 30) -
              (gameData[socket.room].ballPos[1] <
                gameData[socket.room].player1Pos - 30)) *
            speed;
        }

        if (endLocation >= 30 && endLocation <= screenSize[1] - 30)
          gameData[socket.room].player1Pos = endLocation;

        // move player 2
        // check if you are playing with 2 players
        endLocation =
          gameData[socket.room].player2Pos +
          (gameData[socket.room].downs[1] - gameData[socket.room].ups[1]) *
            speed;
        if (!rooms[socket.room][1] || gameData[socket.room].botEnabled[1]) {
          // one player
          endLocation +=
            ((gameData[socket.room].ballPos[1] >
              gameData[socket.room].player2Pos + 30) -
              (gameData[socket.room].ballPos[1] <
                gameData[socket.room].player2Pos - 30)) *
            botSpeed;
        }

        if (endLocation >= 30 && endLocation <= screenSize[1] - 30)
          gameData[socket.room].player2Pos = endLocation;

        // move ball

        // update ball's direction

        gameData[socket.room].ballDirection = getBallDirection(socket.room);

        gameData[socket.room].ballPos[0] +=
          gameData[socket.room].ballDirection[0];
        gameData[socket.room].ballPos[1] +=
          gameData[socket.room].ballDirection[1];

        io.to(socket.room).emit("updatePositions", [
          gameData[socket.room].player1Pos,
          gameData[socket.room].player2Pos,
          gameData[socket.room].ballPos
        ]);
      }, refreshDelay);
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
      case "KeyW":
        gameData[socket.room].ups[player] = 1;
        break;
      case "ArrowDown":
      case "KeyS":
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
      case "KeyW":
        gameData[socket.room].ups[player] = 0;
        break;
      case "ArrowDown":
      case "KeyS":
        gameData[socket.room].downs[player] = 0;
        break;
      default:
        return;
    }
  });

  socket.on("playername", name => {
    socket.name = name;
  });

  socket.on("message", data => {
    if (data == "//bot") {
      let player = 1;

      if (rooms[socket.room][0] == socket) {
        // we are player 1
        player = 0;
      }

      gameData[socket.room].botEnabled[player] = !gameData[socket.room]
        .botEnabled[player];

      socket.emit("message", "Toggled bot...");
    } else {
      io.to(socket.room).emit("message", socket.name + ": " + data);
    }
  });

  socket.on("disconnect", () => {
    if (gameData[socket.room] && gameData[socket.room].updateInterval) {
      clearInterval(gameData[socket.room].updateInterval);
    }

    gameData[socket.room].playerLeft = true;

    socket.to(socket.room).emit("playerLeft");

    console.log(socket.id + " disconnected.");
  });
});

http.listen(port);
