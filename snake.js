var Snake = (function () {
  var hertz = 5,
      tickSpan = 1000 / hertz,
      tickStart,
      tickPause,
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
      displace = {
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
      previousTail,
      grid,
      free,
      foodList,
      running;

  function pauseGame() {
    if (running) {
      running = false;
      tickPause = Date.now() - tickStart;
      pauseGameButton.innerHTML = 'resume';
    } else {
      running = true;
      pauseGameButton.innerHTML = 'pause';
      tickStart = Date.now() - tickPause;
      gameStep();
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
    var i;
    context.save();
    transformToCell(x, y, 'north');
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(polygon[0].x, polygon[0].y);
    for (i = 1; i < polygon.length; ++i) {
      context.lineTo(polygon[i].x, polygon[i].y);
    }
    context.closePath();
    context.fill();
    context.restore();
  }

  function transformToCell(x, y, direction) {
    var s = size.cell,
        w = size.wall;
    context.translate(w + x * s + s / 2, w + y * s + s / 2);
    context.rotate(rotation[direction]);
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

  function paintCanvas(tickRatio) {
    var foodNode = foodList.first,
        s = size.cell,
        w = size.wall,
        c, d,
        here, behind, ahead,
        head, neck, tail,
        i;

    context.fillStyle = color.wall;
    context.fillRect(0, 0, size.canvas.width, size.canvas.height);
    context.clearRect(w, w, numCols * s, numRows * s);

    while (foodNode !== null) {
      paintPolygon(foodNode.x, foodNode.y, foodNode.polygon, color.food);
      foodNode = foodNode.next;
    }

    // Tail.
    behind = previousTail;
    tail = snake[0];
    ahead = snake[1];
    context.fillStyle = color.snake.body;
    context.save();
    c = calculateDirection(behind.x, behind.y, tail.x, tail.y);
    d = calculateDirection(tail.x, tail.y, ahead.x, ahead.y);
    if (behind == tail) {
      transformToCell(behind.x, behind.y, d);
    } else {
      transformToCell(behind.x, behind.y, c);
      if (d == clockwise[c]) {
        context.translate(s / 2, -s / 2);
        context.rotate(tickRatio * pi / 2);
        context.translate(-s / 2, s / 2);
      } else if (d == counterclockwise[c]) {
        context.translate(-s / 2, -s / 2);
        context.rotate(tickRatio * -pi / 2);
        context.translate(s / 2, s / 2);
      } else {
        context.translate(0, -tickRatio * size.cell);
      }
    }
    context.beginPath();
    context.moveTo(-3 * s / 8, -s / 2);
    context.lineTo(-s / 16, s / 2);
    context.lineTo(s / 16, s / 2);
    context.lineTo(3 * s / 8, -s / 2);
    context.closePath();
    context.fill();
    context.restore();

    // Between tail and head.
    for (i = 1; i < snake.length - 2; ++i) {
      behind = snake[i - 1];
      here = snake[i];
      ahead = snake[i + 1];
      c = calculateDirection(behind.x, behind.y, here.x, here.y);
      d = calculateDirection(here.x, here.y, ahead.x, ahead.y);
      context.save();
      transformToCell(here.x, here.y, c);
      context.beginPath();
      context.moveTo(-3 * s / 8, s / 2);
      if (d == c) {
        context.lineTo(-3 * s / 8, -s / 2);
        context.lineTo(3 * s / 8, -s / 2);
        context.lineTo(3 * s / 8, s / 2);
      } else if (d == clockwise[c]) {
        context.lineTo(-3 * s / 8, -s / 8);
        context.arc(-s / 8, -s / 8, s / 4, pi, 3 * pi / 2);
        context.lineTo(s / 2, -3 * s / 8);
        context.lineTo(s / 2, 3 * s / 8);
        context.arc(s / 2, s / 2, s / 8, 3 * pi / 2, pi, true);
      } else {
        context.arc(-s / 2, s / 2, s / 8, 0, 3 * pi / 2, true);
        context.lineTo(-s / 2, -3 * s / 8);
        context.lineTo(s / 8, -3 * s / 8);
        context.arc(s / 8, -s / 8, s / 4, 3 * pi / 2, 0);
        context.lineTo(3 * s / 8, s / 2);
      }
      context.closePath();
      context.fill();
      context.restore();
    }

    // Head.
    head = snake[snake.length - 1];
    neck = snake[snake.length - 2];
    behind = snake[snake.length - 3];
    c = calculateDirection(behind.x, behind.y, neck.x, neck.y);
    d = calculateDirection(neck.x, neck.y, head.x, head.y);
    context.save();
    transformToCell(neck.x, neck.y, c);
    /*
    if (d == clockwise[c]) {
      context.rotate(tickRatio * pi / 2);
    } else if (d == counterclockwise[c]) {
      context.rotate(tickRatio * -pi / 2);
    }
    context.translate(0, -tickRatio * size.cell);
    */
    if (d == clockwise[c]) {
      context.translate(s / 2 - Math.cos(tickRatio * pi / 2) * s / 2,
                        -Math.sin(tickRatio * pi / 2) * s / 2);
      context.translate(0, s / 2);
      context.rotate(tickRatio * pi / 2);
      context.translate(0, -s / 2);
    } else if (d == counterclockwise[c]) {
      context.translate(Math.cos(tickRatio * pi / 2) * s / 2 - s / 2,
                        -Math.sin(tickRatio * pi / 2) * s / 2);
      context.translate(0, s / 2);
      context.rotate(tickRatio * -pi / 2);
      context.translate(0, -s / 2);
    } else {
      context.translate(0, -tickRatio * size.cell);
    }
    context.beginPath();
    context.moveTo(-3 * s / 8, s / 2);
    context.lineTo(-s / 2, s / 6);
    context.lineTo(-s / 6, -s / 2);
    context.lineTo(s / 6, -s / 2);
    context.lineTo(s / 2, s / 6);
    context.lineTo(3 * s / 8, s / 2);
    context.closePath();
    context.fillStyle = color.snake.head;
    context.fill();
    context.restore();
  }

  function finalAnimation() {
    var tick = Date.now() - tickStart;
    paintCanvas(tick / tickSpan);
    if (tick < tickSpan) {
      window.requestAnimationFrame(finalAnimation);
    }
  }
    
  function gameStep() {
    var tick,
        head, tail,
        item, i;

    if (!running) {
      return;
    }
    tick = Date.now() - tickStart;
    if (tick < tickSpan) {
      paintCanvas(tick / tickSpan);
      window.requestAnimationFrame(gameStep);
      return;
    }
    tickStart = Date.now();

    // Chop off the tail and make a new head.
    previousTail = tail = snake.shift();
    wipeCell(tail.x, tail.y);
    head = snake[snake.length - 1];
    head = {
      x: head.x + displace.x[direction],
      y: head.y + displace.y[direction]
    };
    previousDirection = direction;
    snake.push(head);

    // Check for wall collision.
    if (head.x < 0 || head.x >= numCols ||
        head.y < 0 || head.y >= numRows) {
      stopGame('wall collision');
      return;
    }

    // Check for head colliding with body.
    item = getItem(head.x, head.y);
    if (item.kind === 'snake') {
      stopGame('self-collision');
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
    paintCanvas(0);
    window.requestAnimationFrame(gameStep);
  }

  function stopGame(message) {
    running = false;
    finalAnimation();
    setMessage(message + '<br> ended with ' + snake.length + ' segments');
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
    snake[snake.length - 1] = {
      x: start.x + displace.x[direction],
      y: start.y + displace.y[direction]
    };
    snake[snake.length - 2] = {
      x: start.x,
      y: start.y
    };
    for (i = snake.length - 3; i >= 0; --i) {
      snake[i] = { x: snake[i + 1].x, y: snake[i + 1].y + 1 };
    }
    previousTail = { x: snake[i + 1].x, y: snake[i + 1].y + 1 };

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
    tickStart = Date.now();
    running = true;
    gameStep();
  }

  return {
    init: init,
    startGame: startGame
  };
})();

window.onload = Snake.init;
