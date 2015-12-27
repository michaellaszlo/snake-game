var Snake = {
  numRows: 10,
  numCols: 10,
  start: {
    length: 3,
    direction: 'right',
    x: 1, y: 1
  },
  size: {
    cell: 18,
    gap: 1
  },
  color: {
    food: '#a2302a',
    snake: { body: '#2255a2', head: '#0f266b' }
  },
  dirToKeyCode: {  // Codes for arrow keys and W-A-S-D.
    up: [38, 87],
    right: [39, 68],
    down: [40, 83],
    left: [37, 65]
  }
};

Snake.init = function () {
  var direction,
      keyCode,
      dirToKeyCode = this.dirToKeyCode,
      keyCodeToDir = this.keyCodeToDir = {};

  this.canvas = document.getElementById('gameCanvas');
  this.context = this.canvas.getContext('2d');
  this.size.canvas = {
    width: this.numCols * this.size.cell,
    height: this.numRows * this.size.cell
  };
  this.canvas.width = this.size.canvas.width;
  this.canvas.height = this.size.canvas.height;

  // Invert the key mapping for easier lookup.
  for (direction in dirToKeyCode) {
    dirToKeyCode[direction].forEach(function (keyCode) {
      keyCodeToDir[keyCode] = direction;
    });
  }
  window.onkeydown = this.keyDownHandler.bind(this);

  this.messageBox = document.getElementById('messageBox');
  this.startGameButton = document.getElementById('startGameButton');
  this.startGameButton.onclick = this.startGame.bind(this);
  this.pauseGameButton = document.getElementById('pauseGameButton');
  this.pauseGameButton.onclick = this.pauseGame.bind(this);
  this.pauseGameButton.style.display = 'none';
};

Snake.startGame = function () {
  var snake,
      grid,
      rowCount,
      colCount,
      numRows = this.numRows,
      numCols = this.numCols,
      i, x, y;
  this.startGameButton.disabled = true;
  this.direction = this.start.direction;
  snake = this.snake = new Array(this.start.length);
  snake[snake.length - 1] = { x: this.start.x, y: this.start.y };
  for (i = snake.length - 2; i >= 0; --i) {
    snake[i] = { x: snake[i + 1].x, y: snake[i + 1].y + 1 };
  }

  grid = this.grid = new Array(numRows);
  for (y = 0; y < numRows; ++y) {
    grid[y] = new Array(numCols);
  }
  this.count = {
    row: rowCount = new Array(numRows),
    col: colCount = new Array(numCols)
  };
  for (y = 0; y < numRows; ++y) {
    rowCount[y] = 0;
  }
  for (x = 0; x < numCols; ++x) {
    colCount[x] = 0;
  }
  for (i = snake.length - 1; i >= 0; --i) {
    x = snake[i].x;
    y = snake[i].y;
    grid[y][x] = 'snake';
    ++rowCount[y];
    ++colCount[x];
  }

  this.food = {};
  this.placeFood();
  this.paintCanvas();
  this.setMessage('');
  this.pauseGameButton.style.display = 'inline';
  this.gameInterval = window.setInterval(this.gameStep.bind(this), 200);
};

Snake.pauseGame = function () {
  if (this.paused) {
    this.paused = false;
    this.pauseGameButton.innerHTML = 'pause';
    console.log(this.pauseGameButton);
    this.gameInterval = window.setInterval(this.gameStep.bind(this), 200);
  } else {
    this.paused = true;
    this.pauseGameButton.innerHTML = 'resume';
    window.clearInterval(this.gameInterval);
  }
};

Snake.putSnakeSegment = function (x, y) {
  if (this.grid[y][x]) {
    return false;
  }
  this.grid[y][x] = 'snake';
  ++this.count.row[y];
  ++this.count.col[x];
  return true;
};

Snake.eraseSnakeSegment = function (x, y) {
  this.grid[y][x] = null;
  --this.count.row[y];
  --this.count.col[x];
};

Snake.placeFood = function () {
  // Choose a random location that isn't occupied by the this.snake.
  var okay = false,
      snake = this.snake,
      food = this.food,
      i;
  while (!okay) {
    food.x = Math.floor(Math.random() * this.numCols);
    food.y = Math.floor(Math.random() * this.numRows);
    okay = true;
    for (i = 0; i < snake.length; ++i) {
      if (snake[i].x == food.x && snake[i].y == food.y) {
        okay = false;
        break;
      }
    }
  }
};

Snake.paintCell = function (x, y, color) {
  var cellSize = this.size.cell,
      gapSize = this.size.gap;
  this.context.fillStyle = color;
  this.context.fillRect(x * cellSize + gapSize, y * cellSize + gapSize,
      cellSize - gapSize, cellSize - gapSize);
};

Snake.paintCanvas = function () {
  var head,
      snake = this.snake,
      i;
  this.context.clearRect(0, 0,
      this.size.canvas.width, this.size.canvas.height);
  this.paintCell(this.food.x, this.food.y, this.color.food);
  head = this.snake[this.snake.length - 1];
  this.paintCell(head.x, head.y, this.color.snake.head);
  for (i = snake.length - 2; i >= 0; --i) {
    this.paintCell(snake[i].x, snake[i].y, this.color.snake.body);
  }
};
  
Snake.gameStep = function () {
  var snake = this.snake,
      head = snake[snake.length - 1],
      x = head.x,
      y = head.y,
      food = this.food,
      tail,
      i;

  // Move the snake.
  tail = snake.shift();
  this.eraseSnakeSegment(tail.x, tail.y);
  switch (this.direction) {
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
  this.paintCanvas();
  x = head.x;
  y = head.y;

  // Check for wall collision.
  if (x < 0 || x >= this.numCols || y < 0 || y >= this.numRows) {
    this.stopGame('wall collision');
    return;
  }

  // Check for head colliding with body.
  if (!this.putSnakeSegment(head.x, head.y)) {
    this.stopGame('self-collision');
    return;
  }

  // If we ate a piece of food, reattach the tail and place new food.
  if (x == food.x && y == food.y) {
    this.putSnakeSegment(tail.x, tail.y);
    snake.unshift(tail);
    this.setMessage(snake.length + ' segments');
    this.placeFood();
  }
};

Snake.stopGame = function (message) {
  this.setMessage(message +
      '<br> ended with ' + this.snake.length + ' segments');
  window.clearInterval(this.gameInterval);
  this.startGameButton.disabled = false;
  this.pauseGameButton.style.display = 'none';
};

Snake.keyDownHandler = function (event) {
  var keyCode = event.keyCode;
  if (keyCode in this.keyCodeToDir) {
    this.direction = this.keyCodeToDir[keyCode];
  }
};

Snake.setMessage = function (message) {
  this.messageBox.innerHTML = message;
};

window.onload = function () {
  Snake.init();
  Snake.startGame();
};
