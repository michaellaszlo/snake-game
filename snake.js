var Snake = (function () {
  var hertz = 5,
      numRows = 10,
      numCols = 10,
      start = {
        length: 3,
        direction: 'east',
        x: 1, y: 1
      },
      size = {
        cell: 18,
        wall: 8
      },
      shape = {
        food: 7
      },
      color = {
        wall: '#d6d4c6',
        food: '#559d34',
        snake: { body: '#2255a2', head: '#0f266b' }
      },
      pi = Math.PI,
      rotation = {
        north: 0, east: pi / 2, south: pi, west: 3 * pi / 2
      },
      opposite = {
        north: 'south', south: 'north', east: 'west', west: 'east'
      },
      clockwise = {
        north: 'east', east: 'south', south: 'west', west: 'north'
      },
      counterclockwise = {
        north: 'west', east: 'north', south: 'east', west: 'south'
      },
      neighbor = {
        x: { north: 0, east: 1, south: 0, west: -1 },
        y: { north: -1, east: 0, south: 1, west: 0 }
      },
      dirToKeyCode = {  // Codes for arrow keys and W-A-S-D.
        north: [38, 87],
        east: [39, 68],
        south: [40, 83],
        west: [37, 65]
      },
      keyCodeToDir,
      canvas,
      context,
      messageBox,
      startGameButton,
      pauseGameButton,
      direction,
      previousDirection,
      snake,
      grid,
      free,
      foodList,
      paused,
      gameInterval;

  function pauseGame() {
    if (paused) {
      paused = false;
      pauseGameButton.innerHTML = 'pause';
      gameInterval = window.setInterval(gameStep.bind(this), 1000 / hertz);
    } else {
      paused = true;
      pauseGameButton.innerHTML = 'resume';
      window.clearInterval(gameInterval);
    }
  }

  function getItem(x, y) {
    return grid[y][x];
  }

  function putItem(x, y, item) {
    if (grid[y][x].kind !== 'empty') {
      return false;
    }
    grid[y][x] = item;
    --free.row[y];
    --free.all;
    return true;
  }

  function wipeCell (x, y) {
    if (grid[y][x].kind === 'empty') {
      return false;
    }
    grid[y][x] = { kind: 'empty' };
    ++free.row[y];
    ++free.all;
    return true;
  }

  function placeFood() {
    // Choose a random location that isn't occupied by the snake.
    var foodNode,
        freeRow = free.row,
        choice = Math.floor(Math.random() * free.all),
        count = 0,
        y = -1,
        x = numCols,
        polygon,
        n = shape.food,
        r = size.cell / 2,
        dr = r / 8, d,
        angle0, angle,
        i, px, py;
    while (count <= choice) {
      ++y;
      count += freeRow[y];
    }
    while (true) {
      --x;
      if (grid[y][x].kind === 'empty') {
        --count;
        if (count == choice) {
          break;
        }
      }
    }
    foodNode = addToFoodList(x, y);
    foodNode.polygon = polygon = new Array(n);
    angle0 = Math.random() * 2 * Math.PI;
    for (i = 0; i < n; ++i) {
      // Regular placement.
      angle = angle0 + i * 2 * Math.PI / n;
      px = Math.cos(angle) * (r - dr);
      py = Math.sin(angle) * (r - dr);
      // Random variation.
      angle = Math.random() * 2 * Math.PI;
      d = Math.max(Math.random(), Math.random()) * dr;
      polygon[i] = {
        x: px + Math.cos(angle) * d,
        y: py + Math.sin(angle) * d
      };
    }
    putItem(x, y, { kind: 'food', node: foodNode });
  }

  function addToFoodList(x, y) {
    var first = foodList.first,
        foodNode = { x: x, y: y, previous: null, next: first };
    if (first !== null) {
      first.previous = foodNode;
    }
    foodList.first = foodNode;
    foodList.count += 1;
    return foodNode;
  }

  function deleteFromFoodList(foodNode) {
    if (foodNode.previous === null) {
      foodList.first = foodNode.next;
    } else {
      foodNode.previous.next = foodNode.next;
    }
    if (foodNode.next !== null) {
      foodNode.next.previous = foodNode.previous;
    }
    foodList.count -= 1;
  }

  function paintPolygon(x, y, polygon, color) {
    var w = size.wall,
        s = size.cell,
        x0 = w + x * s + s / 2,
        y0 = w + y * s + s / 2;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x0 + polygon[0].x, y0 + polygon[0].y);
    for (i = 1; i < polygon.length; ++i) {
      context.lineTo(x0 + polygon[i].x, y0 + polygon[i].y);
    }
    context.closePath();
    context.fill();
  }

  function transformToCell(x, y, direction) {
    var s = size.cell,
        w = size.wall;
    context.translate(w + x * s + s / 2, w + y * s + s / 2);
    context.rotate(rotation[direction]);
    context.translate(-s / 2, -s / 2);
  }

  function calculateDirection(x0, y0, x1, y1) {
    if (x0 == x1) {
      if (y1 < y0) {
        return 'north';
      }
      return 'south';
    }
    if (x1 > x0) {
      return 'east';
    }
    return 'west';
  }

  function paintCanvas() {
    var foodNode = foodList.first,
        s = size.cell,
        w = size.wall,
        c, d,
        here, behind, ahead,
        i;

    context.fillStyle = color.wall;
    context.fillRect(0, 0, size.canvas.width, size.canvas.height);
    context.clearRect(w, w, numCols * s, numRows * s);

    while (foodNode !== null) {
      paintPolygon(foodNode.x, foodNode.y, foodNode.polygon, color.food);
      foodNode = foodNode.next;
    }

    // Tail.
    context.fillStyle = color.snake.body;
    here = snake[0];
    ahead = snake[1];
    d = calculateDirection(here.x, here.y, ahead.x, ahead.y);
    context.save();
    transformToCell(here.x, here.y, d);
    context.beginPath();
    context.moveTo(s / 8, 0);
    context.lineTo(7 * s / 16, s);
    context.lineTo(9 * s / 16, s);
    context.lineTo(7 * s / 8, 0);
    context.closePath();
    context.fill();
    context.restore();

    // Between tail and head.
    for (i = 1; i < snake.length - 1; ++i) {
      behind = snake[i - 1];
      here = snake[i];
      ahead = snake[i + 1];
      c = calculateDirection(behind.x, behind.y, here.x, here.y);
      d = calculateDirection(here.x, here.y, ahead.x, ahead.y);
      context.save();
      transformToCell(here.x, here.y, c);
      context.beginPath();
      context.moveTo(s / 8, s);
      if (d == c) {
        context.lineTo(s / 8, 0);
        context.lineTo(7 * s / 8, 0);
        context.lineTo(7 * s / 8, s);
      } else if (d == clockwise[c]) {
        context.lineTo(s / 8, 3 * s / 8);
        context.arc(3 * s / 8, 3 * s / 8, s / 4, pi, 3 * pi / 2);
        context.lineTo(s, s / 8);
        context.lineTo(s, 7 * s / 8);
        context.arc(s, s, s / 8, 3 * pi / 2, pi, true);
      } else {
        context.arc(0, s, s / 8, 0, 3 * pi / 2, true);
        context.lineTo(0, s / 8);
        context.lineTo(5 * s / 8, s / 8);
        context.arc(5 * s / 8, 3 * s / 8, s / 4, 3 * pi / 2, 0);
        context.lineTo(7 * s / 8, s);
      }
      context.closePath();
      context.fill();
      context.restore();
    }

    // Head.
    here = snake[snake.length - 1];
    context.save();
    transformToCell(here.x, here.y, direction);
    context.beginPath();
    context.moveTo(s / 8, s);
    context.lineTo(0, 2 * s / 3);
    context.lineTo(s / 3, 0);
    context.lineTo(2 * s / 3, 0);
    context.lineTo(s, 2 * s / 3);
    context.lineTo(7 * s / 8, s);
    context.closePath();
    context.fillStyle = color.snake.head;
    context.fill();
    context.restore();
  }
    
  function gameStep() {
    var head = snake[snake.length - 1],
        tail,
        item,
        i;

    // Chop off the tail and make a new head.
    tail = snake.shift();
    wipeCell(tail.x, tail.y);
    head = {
      x: head.x + neighbor.x[direction],
      y: head.y + neighbor.y[direction]
    };
    previousDirection = direction;
    snake.push(head);

    // Check for wall collision.
    if (head.x < 0 || head.x >= numCols ||
        head.y < 0 || head.y >= numRows) {
      stopGame('wall collision');
      paintCanvas();
      return;
    }

    // Check for head colliding with body.
    item = getItem(head.x, head.y);
    if (item.kind === 'snake') {
      stopGame('self-collision');
      paintCanvas();
      return;
    }

    // The cell is valid. It is empty or has food. Write the head regardless.
    wipeCell(head.x, head.y);
    putItem(head.x, head.y, { kind: 'snake' });

    // If the cell contained food, reattach the tail and place new food.
    if (item.kind === 'food') {
      snake.unshift(tail);
      putItem(tail.x, tail.y, { kind: 'snake' });
      setMessage(snake.length + ' segments');
      deleteFromFoodList(item.node);
      placeFood();
    }
    paintCanvas();
  }

  function stopGame(message) {
    setMessage(message + '<br> ended with ' + snake.length + ' segments');
    window.clearInterval(gameInterval);
    startGameButton.disabled = false;
    pauseGameButton.style.display = 'none';
  }

  function keyDownHandler(event) {
    var keyCode = event.keyCode,
        inputDirection;
    if (keyCode in keyCodeToDir) {
      inputDirection = keyCodeToDir[keyCode];
      if (inputDirection == opposite[previousDirection]) {
        return;
      }
      direction = inputDirection;
    }
  }

  function setMessage(message) {
    messageBox.innerHTML = message;
  }

  function init() {
    var direction,
        keyCode;

    canvas = document.getElementById('gameCanvas');
    context = canvas.getContext('2d');
    size.canvas = {
      width: numCols * size.cell + 2 * size.wall,
      height: numRows * size.cell + 2 * size.wall
    };
    canvas.width = size.canvas.width;
    canvas.height = size.canvas.height;

    // Invert the key mapping for easier lookup.
    keyCodeToDir = {};
    for (direction in dirToKeyCode) {
      dirToKeyCode[direction].forEach(function (keyCode) {
        keyCodeToDir[keyCode] = direction;
      });
    }
    window.onkeydown = keyDownHandler.bind(this);

    messageBox = document.getElementById('messageBox');
    startGameButton = document.getElementById('startGameButton');
    startGameButton.onclick = startGame.bind(this);
    pauseGameButton = document.getElementById('pauseGameButton');
    pauseGameButton.onclick = pauseGame.bind(this);
    pauseGameButton.style.display = 'none';

    startGame();
  }

  function startGame() {
    var rowCount,
        i, x, y;
    startGameButton.disabled = true;
    direction = previousDirection = start.direction;
    snake = new Array(start.length);
    snake[snake.length - 1] = { x: start.x, y: start.y };
    for (i = snake.length - 2; i >= 0; --i) {
      snake[i] = { x: snake[i + 1].x, y: snake[i + 1].y + 1 };
    }

    grid = new Array(numRows);
    for (y = 0; y < numRows; ++y) {
      grid[y] = new Array(numCols);
      for (x = 0; x < numCols; ++x) {
        grid[y][x] = { kind: 'empty' };
      }
    }

    free = {
      row: rowCount = new Array(numRows),
      all: numRows * numCols
    };
    for (y = 0; y < numRows; ++y) {
      rowCount[y] = numCols;
    }
    for (i = snake.length - 1; i >= 0; --i) {
      putItem(snake[i].x, snake[i].y, { kind: 'snake' });
    }

    foodList = { count: 0, first: null };
    placeFood();
    placeFood();
    paintCanvas();
    setMessage('');
    pauseGameButton.style.display = 'inline';
    gameInterval = window.setInterval(gameStep.bind(this), 1000 / hertz);
  }

  return {
    init: init,
    startGame: startGame
  };
})();

window.onload = Snake.init;
