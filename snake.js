var canvas,
    ctx,
    currentDir,
    startX = 1,
    startY = 1,
    startSnakeLength = 3,
    snake,
    cellSize = 18,
    cellGap = 1,
    foodColor = '#a2302a',
    snakeBodyColor = '#2255a2',
    snakeHeadColor = '#0f266b',
    numRows = 10,
    numCols = 10,
    canvasWidth = numCols * cellSize,
    canvasHeight = numRows * cellSize;

var food = {};

function placeFood() {
  // Find a random location that isn't occupied by the snake.
  var okay = false;
  while (!okay) {
    food.x = Math.floor(Math.random() * numCols);
    food.y = Math.floor(Math.random() * numRows);
    okay = true;
    for (var i = 0; i < snake.length; ++i) {
      if (snake[i].x == food.x && snake[i].y == food.y) {
        okay = false;
        break;
      }
    }
  }
}

function paintCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * cellSize + cellGap,
               y * cellSize + cellGap,
               cellSize - cellGap,
               cellSize - cellGap);
}

function paintCanvas() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  paintCell(food.x, food.y, foodColor);
  var head = snake[snake.length - 1];
  paintCell(head.x, head.y, snakeHeadColor);
  for (var i = snake.length - 2; i >= 0; --i) {
    paintCell(snake[i].x, snake[i].y, snakeBodyColor);
  }
}
  
function updateGame() {
  var head = snake[snake.length - 1],
      x = head.x,
      y = head.y;

  // Move the snake.
  var tail = snake.shift();
  switch (currentDir) {
    case 'up': 
      snake.push(head = { x: x, y: y - 1 });
      break;
    case 'right': 
      snake.push(head = { x: x + 1, y: y });
      break;
    case 'down': 
      snake.push(head = { x: x, y: y + 1 });
      break;
    case 'left': 
      snake.push(head = { x: x - 1, y: y });
      break;
  }
  paintCanvas();
  x = head.x;
  y = head.y;

  // Check for wall collision.
  if (x < 0 || x >= numCols || y < 0 || y >= numRows) {
    stopGame('wall collision');
    return;
  }

  // Check for snake head colliding with snake body.
  for (var i = snake.length - 2; i >= 0; --i) {
    if (snake[i].x == x && snake[i].y == y) {
      stopGame('self-collision');
      return;
    }
  }

  // Check for food.
  if (x == food.x && y == food.y) {
    placeFood();
    snake.unshift(tail);
    setMessage(snake.length + ' segments');
  }
}

var dirToKeyCode = {  // Codes for arrow keys and W-A-S-D.
      up: [38, 87],
      right: [39, 68],
      down: [40, 83],
      left: [37, 65]
    },
    keyCodeToDir = {};  // Fill this from dirToKeyCode on page load.

function keyDownHandler(e) {
  var keyCode = e.keyCode;
  if (keyCode in keyCodeToDir) {
    currentDir = keyCodeToDir[keyCode];
  }
}

function setMessage(s) {
  document.getElementById('messageBox').innerHTML = s;
}

function startGame() {
  currentDir = 'right';
  snake = new Array(startSnakeLength);
  snake[snake.length - 1] = { x: startX, y: startY };
  for (var i = snake.length - 2; i >= 0; --i) {
    snake[i] = { x: snake[i + 1].x, y: snake[i + 1].y + 1 };
  }
  placeFood();
  paintCanvas();
  setMessage('');
  gameInterval = setInterval(updateGame, 200);
  startGameButton.disabled = true;
}

function stopGame(message) {
  setMessage(message + '<br> ended with ' + snake.length + ' segments');
  clearInterval(gameInterval);
  startGameButton.disabled = false;
}

var gameInterval,
    startGameButton;

window.onload = function () {
  canvas = document.getElementById('gameCanvas'),
  ctx = canvas.getContext('2d');
  canvas.width = numCols * cellSize;
  canvas.height = numRows * cellSize;
  Object.keys(dirToKeyCode).forEach(function (dir) {
    dirToKeyCode[dir].forEach(function (keyCode) {
      keyCodeToDir[keyCode] = dir;
    })
  });
  document.addEventListener("keydown", keyDownHandler, false);
  startGameButton = document.getElementById('startGameButton');
  startGameButton.onclick = startGame;
}
