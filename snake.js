var Snake = {
  numRows: 10,
  numCols: 10,
  start: {
    length: 3,
    direction: 'east',
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
  neighbor: {
    x: { north: 0, east: 1, south: 0, west: -1 },
    y: { north: -1, east: 0, south: 1, west: 0 }
  },
  dirToKeyCode: {  // Codes for arrow keys and W-A-S-D.
    north: [38, 87],
    east: [39, 68],
    south: [40, 83],
    west: [37, 65]
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
    col: colCount = new Array(numCols),
    all: 0
  };
  for (y = 0; y < numRows; ++y) {
    rowCount[y] = 0;
  }
  for (x = 0; x < numCols; ++x) {
    colCount[x] = 0;
  }
  for (i = snake.length - 1; i >= 0; --i) {
    this.putItem(snake[i].x, snake[i].y, 'snake');
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
    this.gameInterval = window.setInterval(this.gameStep.bind(this), 200);
  } else {
    this.paused = true;
    this.pauseGameButton.innerHTML = 'resume';
    window.clearInterval(this.gameInterval);
  }
};

Snake.getItem = function (x, y) {
  return this.grid[y][x];
};

Snake.putItem = function (x, y, item) {
  if (this.grid[y][x]) {
    return false;
  }
  this.grid[y][x] = item;
  ++this.count.row[y];
  ++this.count.col[x];
  ++this.count.all;
  return true;
};

Snake.wipeCell = function (x, y) {
  if (!this.grid[y][x]) {
    return false;
  }
  this.grid[y][x] = null;
  --this.count.row[y];
  --this.count.col[x];
  --this.count.all;
  return true;
};

Snake.placeFood = function () {
  // Choose a random location that isn't occupied by the snake.
  var count = 0,
      r = 0,
      count = this.count,
      all = count.all;
  //while (count + count.row[r] < this.count
  return;
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
  this.putItem(food.x, food.y, 'food');
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
  for (i = snake.length - 2; i >= 0; --i) {
    this.paintCell(snake[i].x, snake[i].y, this.color.snake.body);
  }
  head = this.snake[this.snake.length - 1];
  this.paintCell(head.x, head.y, this.color.snake.head);
};
  
Snake.gameStep = function () {
  var snake = this.snake,
      head = snake[snake.length - 1],
      neighbor = this.neighbor,
      direction = this.direction,
      tail,
      item,
      i;

  // Chop off the tail and make a new head.
  tail = snake.shift();
  this.wipeCell(tail.x, tail.y);
  head = {
    x: head.x + neighbor.x[direction],
    y: head.y + neighbor.y[direction]
  };
  snake.push(head);
  this.paintCanvas();

  // Check for wall collision.
  if (head.x < 0 || head.x >= this.numCols ||
      head.y < 0 || head.y >= this.numRows) {
    this.stopGame('wall collision');
    return;
  }

  // Check for head colliding with body.
  item = this.getItem(head.x, head.y);
  if (item == 'snake') {
    this.stopGame('self-collision');
    return;
  }

  // The cell is valid. It is empty or has food. Write the head regardless.
  this.wipeCell(head.x, head.y);
  this.putItem(head.x, head.y, 'snake');

  // If the head overwrote food, reattach the tail and place new food.
  if (item == 'food') {
    snake.unshift(tail);
    this.putItem(tail.x, tail.y, 'snake');
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
