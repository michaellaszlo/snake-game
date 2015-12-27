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
};

Snake.startGame = function () {
  var snake, i;
  this.startGameButton.disabled = true;
  this.direction = this.start.direction;
  snake = this.snake = new Array(this.start.length);
  snake[snake.length - 1] = { x: this.start.x, y: this.start.y };
  for (i = snake.length - 2; i >= 0; --i) {
    snake[i] = { x: snake[i + 1].x, y: snake[i + 1].y + 1 };
  }
  this.food = {};
  this.placeFood();
  this.paintCanvas();
  this.setMessage('');
  this.gameInterval = window.setInterval(this.updateGame.bind(this), 200);
};

Snake.stopGame = function (message) {
  this.setMessage(message +
      '<br> ended with ' + this.snake.length + ' segments');
  window.clearInterval(this.gameInterval);
  this.startGameButton.disabled = false;
};

Snake.placeFood = function () {
  // Choose a random location that isn't occupied by the this.snake.
  var okay = false,
      snake = this.snake,
      food = this.food;
  while (!okay) {
    food.x = Math.floor(Math.random() * this.numCols);
    food.y = Math.floor(Math.random() * this.numRows);
    okay = true;
    for (var i = 0; i < snake.length; ++i) {
      if (snake[i].x == food.x && snake[i].y == food.y) {
        okay = false;
        break;
      }
    }
  }
}

Snake.paintCell = function (x, y, color) {
  this.context.fillStyle = color;
  this.context.fillRect(x * this.size.cell + this.size.gap,
                        y * this.size.cell + this.size.gap,
                        this.size.cell - this.size.gap,
                        this.size.cell - this.size.gap);
}

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
}
  
Snake.updateGame = function () {
  var snake = this.snake,
      head = snake[snake.length - 1],
      x = head.x,
      y = head.y,
      food = this.food,
      tail,
      i;

  // Move the snake.
  tail = snake.shift();
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

  // Check for snake head colliding with snake body.
  for (i = snake.length - 2; i >= 0; --i) {
    if (snake[i].x == x && snake[i].y == y) {
      this.stopGame('self-collision');
      return;
    }
  }

  // If we ate a piece of food, reattach the tail and place new food.
  if (x == food.x && y == food.y) {
    snake.unshift(tail);
    this.setMessage(snake.length + ' segments');
    this.placeFood();
  }
}

Snake.keyDownHandler = function (event) {
  var keyCode = event.keyCode;
  if (keyCode in this.keyCodeToDir) {
    this.direction = this.keyCodeToDir[keyCode];
  }
}

Snake.setMessage = function (message) {
  this.messageBox.innerHTML = message;
}

window.onload = function () {
  Snake.init();
}
