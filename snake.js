var Snake = (function () {
  var hertz = 5,
      tick = {
        span: 1000 / hertz
      },
      duration = {
        prologue: 0.25,
        epilogue: 0.75
      },
      numRows,
      numCols,
      grid,
      free,
      snake,
      previousTail,
      levels = [
        { map: [ '            ',
                 '          O ',
                 '  OO        ',
                 '  O         ',
                 '       O    ',
                 '  xX        ',
                 '  x         ',
                 '  x O       ',
                 '         O  ',
                 '        OO  ',
                 ' O          ',
                 '            ' ],
          numFood: 1,
          targetLength: 10
        },
        { map: [ '      O  O  ',
                 ' O          ',
                 '       O  O ',
                 ' O  O       ',
                 '          O ',
                 '    O  O    ',
                 '            ',
                 '  O    O  O ',
                 '            ',
                 '    O     O ',
                 '     X      ',
                 '   xxx      ' ],
          numFood: 1,
          targetLength: 10
        }
      ],
      level,
      levelIndex,
      lives = {
        initial: 1
      },
      direction,
      previousDirection,
      size = {
        cell: 24,
        wall: 5
      },
      shape = {
        food: 7
      },
      color = {
        wall: '#d6d4c6',
        food: { fill: '#559d34' },
        obstacle: { fill: '#abaa8b', stroke: '#868477' },
        snake: { body: '#2255a2', head: '#0f266b', eyes: '#45575e' }
      },
      numFood,
      foodList,
      obstacles,
      pi = Math.PI,
      directions = [ 'north', 'east', 'south', 'west' ],
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
      actionToKeyCode = {  // Codes for arrow keys, WASD, and IJKL.
        north: [38, 87, 73],
        east: [39, 68, 76],
        south: [40, 83, 75],
        west: [37, 65, 74],
        pause: [32, 16, 13]
      },
      keyCodeToAction,
      actions = {
        maxQueueLength: 10
      },
      events = {},
      canvas,
      context,
      startGameButton,
      pauseGameButton,
      container = {},
      status = {};

  function pauseGame() {
    if (!status.gameInProgress || status.noLevelActive) {
      return;
    }
    if (!status.pausedByUser) {
      status.pausedByUser = true;
      tick.paused = Date.now() - tick.start;
      pauseGameButton.innerHTML = 'resume';
    } else {
      status.pausedByUser = false;
      pauseGameButton.innerHTML = 'pause';
      tick.start = Date.now() - tick.paused;
      gameStep();
    }
  }

  function clearGrid() {
    var rowCount,
        x, y;
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
  }

  function isEmpty(x, y) {
    return grid[y][x].kind === 'empty';
  }

  function putItem(x, y, item) {
    if (!isEmpty(x, y)) {
      return false;
    }
    grid[y][x] = item;
    --free.row[y];
    --free.all;
    return true;
  }

  function getItem(x, y) {
    return grid[y][x];
  }

  function wipeCell (x, y) {
    if (isEmpty(x, y)) {
      return false;
    }
    grid[y][x] = { kind: 'empty' };
    ++free.row[y];
    ++free.all;
    return true;
  }

  function componentToPolygon(cells) {
    var inComponent = {},
        polygon = [],
        i, cell,
        x, y, x0, y0;
    for (x = 0; x < numCols; ++x) {
      inComponent[x] = {};
    }
    // Cache cell locations and find a cell with no northern neighbor.
    for (i = 0; i < cells.length; ++i) {
      cell = cells[i];
      x = cell.x;
      y = cell.y;
      inComponent[x][y] = true;
      if (x0 === undefined && (y == 0 || isEmpty(x, y - 1))) {
        x0 = x;
        y0 = y;
      }
    }
    // Follow the border.
    x = x0;
    y = y0;
    while (true) {
      if (inComponent[x][y - 1] && !inComponent[x - 1][y - 1]) {
        --y;
      } else if (inComponent[x][y] && !inComponent[x][y - 1]) {
        ++x;
      } else if (inComponent[x - 1][y] && !inComponent[x][y]) {
        ++y;
      } else if (inComponent[x - 1][y - 1] && !inComponent[x - 1][y]) {
        --x;
      }
      polygon.push({ x: x, y: y });
      if (x == x0 && y == y0) {
        break;
      }
    }
    return polygon;
  }

  function loadLevel(newLevelIndex) {
    var map,
        cells, polygon,
        head, neck,
        element,
        x, y, i;

    function flood(cells, kind, ch, x, y) {
      var i, X, Y;
      cells.push({ x: x, y: y });
      putItem(x, y, { kind: kind });
      for (i = 0; i < 4; ++i) {
        X = x + displace.x[directions[i]];
        Y = y + displace.y[directions[i]];
        if (X >= 0 && X < numCols && Y >= 0 && Y < numRows &&
            map[Y][X] == ch && isEmpty(X, Y)) {
          flood(cells, kind, ch, X, Y);
        }
      }
    }

    levelIndex = newLevelIndex;
    level = levels[levelIndex];
    map = level.map;
    numRows = map.length;
    numCols = map[0].length;
    clearGrid();

    // Obstacle components.
    obstacles = [];
    for (y = 0; y < numRows; ++y) {
      for (x = 0; x < numCols; ++x) {
        switch (map[y][x]) {
          case 'O':
            if (isEmpty(x, y)) {
              cells = [];
              flood(cells, 'obstacle', 'O', x, y);
              polygon = componentToPolygon(cells);
              obstacles.push({ cells: cells, polygon: polygon });
            }
            break;
          case 'X':
            head = { x: x, y: y };
            break;
        }
      }
    }
    // Extract polygon from component.

    // Snake.
    snake = [];
    flood(snake, 'snake', 'x', head.x, head.y);
    snake.reverse();
    previousTail = snake[0];
    neck = snake[snake.length - 2];
    direction = previousDirection = calculateDirection(neck.x, neck.y,
        head.x, head.y);

    // Food.
    foodList = newList();
    numFood = 0;
    while (numFood < level.numFood) {
      placeFood();
      ++numFood;
    }

    // Level title.
    container.currentLevel.innerHTML = 'Level ' + (levelIndex + 1);
    
    // Level target.
    container.levelTarget.innerHTML = '';
    for (i = 0; i < level.targetLength; ++i) {
      element = document.createElement('span');
      element.innerHTML = '&#x25a0;';
      element.className = 'segment';
      if (level.targetLength - i <= snake.length) {
        element.className += ' achieved';
      }
      container.levelTarget.appendChild(element);
    }

    prepareCanvas();
  }

  function chooseFreeCell() {
    var foodNode,
        freeRow = free.row,
        choice = Math.floor(Math.random() * free.all),
        count = 0,
        y = -1,
        x = numCols;
    while (count <= choice) {
      ++y;
      count += freeRow[y];
    }
    while (true) {
      --x;
      if (grid[y][x].kind === 'empty') {
        --count;
        if (count == choice) {
          return { x: x, y: y };
        }
      }
    }
  }

  function removeFood(foodNode) {
    deleteFromList(foodList, foodNode);
  }

  function placeFood() {
    var location = chooseFreeCell(),
        x = location.x,
        y = location.y,
        polygon,
        n = shape.food,
        r = size.cell / 2,
        dr = r / 8, d,
        angle0, angle,
        i, px, py,
        node = addToList(foodList, location);
    node.polygon = polygon = new Array(n);
    angle0 = Math.random() * 2 * pi;
    for (i = 0; i < n; ++i) {
      // Regular polygon vertex.
      angle = angle0 + i * 2 * pi / n;
      px = Math.cos(angle) * (r - dr);
      py = Math.sin(angle) * (r - dr);
      // Random variation.
      angle = Math.random() * 2 * pi;
      d = Math.max(Math.random(), Math.random()) * dr;
      polygon[i] = {
        x: px + Math.cos(angle) * d,
        y: py + Math.sin(angle) * d
      };
    }
    putItem(x, y, { kind: 'food', node: node });
  }
  
  function newList() {
    return { count: 0, first: null };
  }

  function addToList(list, values) {
    var first = list.first,
        node = { previous: null, next: first };
    if (first !== null) {
      first.previous = node;
    }
    list.first = node;
    ++list.count;
    Object.keys(values).forEach(function (key) {
      node[key] = values[key];
    });
    return node;
  }

  function deleteFromList(list, node) {
    var previous = node.previous,
        next = node.next;
    if (previous === null) {
      list.first = next;
    } else {
      previous.next = next
    }
    if (next !== null) {
      next.previous = node.previous;
    }
    --list.count;
  }

  function paintPolygon(x, y, polygon, color) {
    var i;
    context.save();
    transformToCell(x, y, 'north');
    context.beginPath();
    context.moveTo(polygon[0].x, polygon[0].y);
    for (i = 1; i < polygon.length; ++i) {
      context.lineTo(polygon[i].x, polygon[i].y);
    }
    context.closePath();
    context.fillStyle = color.fill;
    context.fill();
    if (color.stroke) {
      context.strokeStyle = color.stroke;
      context.stroke();
    }
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

  function prepareCanvas() {
    size.canvas = {
      width: numCols * size.cell + 2 * size.wall,
      height: numRows * size.cell + 2 * size.wall
    };
    canvas.width = size.canvas.width;
    canvas.height = size.canvas.height;
  }

  function paintCanvas(tickRatio) {
    var node,
        s = size.cell,
        h = s / 2,
        b = s / 8,
        w = size.wall,
        c, d,
        here, behind, ahead,
        head, neck, tail,
        angle, a,
        tx, x, y,
        polygon,
        i;

    context.fillStyle = color.wall;
    context.fillRect(0, 0, size.canvas.width, size.canvas.height);
    context.clearRect(w, w, numCols * s, numRows * s);

    context.strokeStyle = color.obstacle.stroke;
    context.fillStyle = color.obstacle.fill;
    obstacles.forEach(function (obstacle) {
      /*
      obstacle.cells.forEach(function (cell) {
        context.fillRect(w + cell.x * s, w + cell.y * s, s, s);
        context.strokeRect(w + cell.x * s, w + cell.y * s, s, s);
      });
      */
      polygon = obstacle.polygon;
      context.beginPath();
      context.moveTo(w + polygon[polygon.length - 1].x * s,
                     w + polygon[polygon.length - 1].y * s);
      polygon.forEach(function (vertex) {
        context.lineTo(w + vertex.x * s, w + vertex.y * s);
      });
      context.fill();
    });

    node = foodList.first;
    while (node !== null) {
      paintPolygon(node.x, node.y, node.polygon, color.food);
      node = node.next;
    }

    // Our trigonometric calculations rely on tickRatio <= 1.
    tickRatio = Math.min(tickRatio, 1);

    // Tail.
    behind = previousTail;
    tail = snake[0];
    ahead = snake[1];
    context.fillStyle = color.snake.body;
    context.strokeStyle = color.snake.body;
    context.save();
    c = calculateDirection(behind.x, behind.y, tail.x, tail.y);
    d = calculateDirection(tail.x, tail.y, ahead.x, ahead.y);
    angle = tickRatio * pi / 2;
    if (behind == tail) {
      transformToCell(behind.x, behind.y, d);
    } else {
      transformToCell(behind.x, behind.y, c);
      if (d == clockwise[c]) {
        // Fill the pre-tail.
        context.beginPath();
        context.moveTo(h - Math.cos(angle) * b,
                       -h - Math.sin(angle) * b);
        context.lineTo(h - Math.cos(angle) * (s - b),
                       -h - Math.sin(angle) * (s - b));
        context.quadraticCurveTo(-h + tickRatio * s,
                                 -s - h + tickRatio * b,
                                 h, -s - h + b);
        context.lineTo(h, -h - b);
        context.arc(h, -h, b, -pi / 2, -pi + angle, true);
        context.closePath();
        context.fill();
        // Stroke the pre-tail.
        context.beginPath();
        context.moveTo(h - Math.cos(angle) * b,
                       -h - Math.sin(angle) * b);
        context.lineTo(h - Math.cos(angle) * (s - b),
                       -h - Math.sin(angle) * (s - b));
        context.closePath();
        context.stroke();
        // Transform to paint the tail.
        context.translate(h, -h);
        context.rotate(angle);
        context.translate(-h, h);
      } else if (d == counterclockwise[c]) {
        // Fill the pre-tail.
        context.beginPath();
        context.moveTo(-h + Math.cos(angle) * b,
                       -h - Math.sin(angle) * b);
        context.lineTo(-h + Math.cos(angle) * (s - b),
                       -h - Math.sin(angle) * (s - b));
        context.quadraticCurveTo(h - tickRatio * s,
                                 -s - h + tickRatio * b,
                                 -h, -s - h + b);
        context.lineTo(-h, -h - b);
        context.arc(-h, -h, b, -pi / 2, -angle, 0);
        context.closePath();
        context.fill();
        // Stroke the pre-tail.
        context.beginPath();
        context.moveTo(-h + Math.cos(angle) * b,
                       -h - Math.sin(angle) * b);
        context.lineTo(-h + Math.cos(angle) * (s - b),
                       -h - Math.sin(angle) * (s - b));
        context.closePath();
        context.stroke();
        // Transform to paint the tail.
        context.translate(-h, -h);
        context.rotate(-angle);
        context.translate(h, h);
      } else {
        // Fill the pre-tail.
        context.beginPath();
        context.moveTo(h - b, -h - tickRatio * size.cell);
        context.lineTo(h - b, -h - s);
        context.lineTo(-h + b, -h - s);
        context.lineTo(-h + b, -h - tickRatio * size.cell);
        context.closePath();
        context.fill();
        // Stroke the pre-tail.
        context.beginPath();
        context.moveTo(h - b, -h - tickRatio * size.cell);
        context.lineTo(-h + b, -h - tickRatio * size.cell);
        context.closePath();
        context.stroke();
        // Transform to paint the head.
        context.translate(0, -tickRatio * size.cell);
      }
    }
    context.beginPath();
    tx = h - b / 2;
    a = 0;
    if (d != c) {
      a = 2 * Math.min(angle, pi / 2 - angle);
      if (d == counterclockwise[c]) {
        a = -a;
      }
    }
    context.moveTo(-h + b, -h);
    context.quadraticCurveTo(-tx / 2, 0, h * Math.sin(a), h * Math.cos(a));
    context.quadraticCurveTo(tx / 2, 0, h - b, -h);
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
      if (d == c) {
        context.moveTo(-h + b, h);
        context.lineTo(-h + b, -h);
        context.lineTo(h - b, -h);
        context.lineTo(h - b, h);
      } else if (d == clockwise[c]) {
        context.moveTo(-h + b, h);
        context.quadraticCurveTo(-h, -h, h, -h + b);
        context.lineTo(h, h - b);
        context.arc(h, h, b, 3 * pi / 2, pi, true);
      } else {
        context.moveTo(h - b, h);
        context.quadraticCurveTo(h, -h, -h, -h + b);
        context.lineTo(-h, h - b);
        context.arc(-h, h, b, -pi / 2, 0);
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
    context.beginPath();
    context.fillStyle = color.snake.body;
    context.strokeStyle = color.snake.body;
    angle = tickRatio * pi / 2;
    if (d == clockwise[c]) {
      // Fill the neck.
      context.moveTo(-h + b, h);
      context.quadraticCurveTo(-h + b - tickRatio * b,
                               h - tickRatio * s,
                               h - Math.cos(angle) * (s - b),
                               h - Math.sin(angle) * (s - b));
      context.lineTo(h - Math.cos(angle) * b,
                     h - Math.sin(angle) * b);
      context.arc(h, h, b, pi + angle, pi, true);
      context.closePath();
      context.fill();
      // Stroke the neck.
      context.beginPath();
      context.moveTo(h - Math.cos(angle) * (s - b),
                     h - Math.sin(angle) * (s - b));
      context.lineTo(h - Math.cos(angle) * b,
                     h - Math.sin(angle) * b);
      context.closePath();
      context.stroke();
      // Transform to paint the head.
      context.translate(h, h);
      context.rotate(angle);
      context.translate(-h, -h);
    } else if (d == counterclockwise[c]) {
      // Fill the neck.
      context.moveTo(h - b, h);
      context.quadraticCurveTo(h - b + tickRatio * b,
                               h - tickRatio * s,
                               -h + Math.cos(angle) * (s - b),
                               h - Math.sin(angle) * (s - b));
      context.lineTo(-h + Math.cos(angle) * b,
                     h - Math.sin(angle) * b);
      context.arc(-h, h, b, -angle, 0);
      context.closePath();
      context.fill();
      // Stroke the neck.
      context.beginPath();
      context.moveTo(-h + Math.cos(angle) * (s - b),
                     h - Math.sin(angle) * (s - b));
      context.lineTo(-h + Math.cos(angle) * b,
                     h - Math.sin(angle) * b);
      context.closePath();
      context.stroke();
      // Transform to paint the head.
      context.translate(-h, h);
      context.rotate(-angle);
      context.translate(h, -h);
    } else {
      // Fill the neck.
      context.moveTo(h - b, h);
      context.lineTo(h - b, h - tickRatio * size.cell);
      context.lineTo(-h + b, h - tickRatio * size.cell);
      context.lineTo(-h + b, h);
      context.closePath();
      context.fill();
      // Stroke the neck.
      context.beginPath();
      context.moveTo(h - b, h - tickRatio * size.cell);
      context.lineTo(-h + b, h - tickRatio * size.cell);
      context.closePath();
      context.stroke();
      // Transform to paint the head.
      context.translate(0, -tickRatio * size.cell);
    }
    // Main head shape.
    context.beginPath();
    context.moveTo(-h + b, h);
    context.lineTo(-h, h / 3);
    context.lineTo(-h / 4, -h);
    context.lineTo(h / 4, -h);
    context.lineTo(h, h / 3);
    context.lineTo(h - b, h);
    context.closePath();
    context.fillStyle = color.snake.head;
    context.fill();
    // Neck cutout.
    context.beginPath();
    context.moveTo(-h / 2, h + 1);
    context.lineTo(0, h / 2);
    context.lineTo(h / 2, h + 1);
    context.closePath();
    context.fillStyle = color.snake.body;
    context.fill();
    // Eyes.
    context.beginPath();
    context.moveTo(-h / 2 - b / 2, h / 3);
    context.lineTo(-h / 2 + b / 2, -h / 6);
    context.lineTo(-h / 2 + b, h / 3);
    context.moveTo(h / 2 + b / 2, h / 3);
    context.lineTo(h / 2 - b / 2, -h / 6);
    context.lineTo(h / 2 - b, h / 3);
    context.closePath();
    context.fillStyle = color.snake.eyes;
    context.fill();
    context.restore();
  }
    
  function gameStep() {
    var elapsed,
        head, tail,
        event, action, item, i;

    if (!status.gameInProgress || status.pausedByUser) {
      return;
    }

    // If we're midway through the tick, only perform animation.
    elapsed = Date.now() - tick.start;
    if (elapsed < tick.span) {
      paintCanvas(elapsed / tick.span);
      window.requestAnimationFrame(gameStep);
      return;
    }

    // Offset the tick start by the amount we went over the span.
    tick.start = Date.now() - Math.min(elapsed - tick.span, tick.span / 10);
    ++tick.count;

    // Perform the first valid action in the queue.
    while (actions.queue.length > 0) {
      action = actions.queue.shift();
      if (action.direction !== opposite[direction]) {
        direction = action.direction;
        break;
      }
    }

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

    // Process events that were queued during the previous tick.
    while (events.queue.length > 0) {
      event = events.queue.shift();
      event.fun();
      if (event.interrupt) {
        return;
      }
    }

    // Check for wall collision.
    if (head.x < 0 || head.x >= numCols ||
        head.y < 0 || head.y >= numRows) {
      fail('wall collision');
      return;
    }

    // Check for head colliding with body.
    item = getItem(head.x, head.y);
    if (item.kind === 'snake') {
      fail('self-collision');
      return;
    }

    // Check for head colliding with obstacle.
    item = getItem(head.x, head.y);
    if (item.kind === 'obstacle') {
      fail('obstacle collision');
      return;
    }

    // The cell is valid. It is empty or has food. Write the head regardless.
    wipeCell(head.x, head.y);
    putItem(head.x, head.y, { kind: 'snake' });

    // If there is food: remove food, reattach tail, check level target.
    if (item.kind === 'food') {
      snake.unshift(tail);
      putItem(tail.x, tail.y, { kind: 'snake' });
      container.levelTarget.children[level.targetLength - snake.length].
          className += ' achieved';
      if (snake.length == level.targetLength) {
        events.queue.push({ fun: endLevel, interrupt: true });
      } else {
        events.queue.push({ fun: function () {
          removeFood(item.node);
          placeFood();
        }});
      }
    }

    paintCanvas(0);
    window.requestAnimationFrame(gameStep);
  }

  function finalAnimation() {
    var elapsed = Date.now() - tick.start;
    paintCanvas(elapsed / tick.span);
    if (elapsed < tick.span) {
      window.requestAnimationFrame(finalAnimation);
    }
  }

  function fail(message) {
    lives.current -= 1;
    if (lives.current == 0) {
      setMessage(message + '<br> game over');
      stopGame(message);
    } else {
      setMessage(message);
      displayLives();
      endLevel();
    }
  }

  function stopGame(message) {
    status.gameInProgress = false;
    finalAnimation();
    startGameButton.disabled = false;
    pauseGameButton.style.display = 'none';
  }

  function keyDownHandler(event) {
    var action;
    if (event.keyCode in keyCodeToAction) {
      action = keyCodeToAction[event.keyCode];
      if (action === 'pause') {
        pauseGame();
        return;
      }
      if (status.pausedByUser) {
        return;
      }
      if (!status.gameInProgress) {
        if (action === 'north') {
          startGame();
        }
        return;
      }
      // Currently the only actions are pause and the four directions.
      actions.queue.push({ direction: action });
    }
  }

  function setMessage(message) {
    container.message.innerHTML = message;
  }

  function startLevel() {
    var fadeStart;
    function fadeIn() {
      var seconds = (Date.now() - fadeStart) / 1000;
      if (seconds >= duration.prologue) {
        canvas.style.opacity = 1;
        setMessage('');
        actions.queue = [];
        events.queue = [];
        status.gameInProgress = true;
        tick.count = 0;
        tick.start = Date.now() - tick.span;
        gameStep();
      } else {
        canvas.style.opacity = seconds / duration.prologue;
        paintCanvas(0.99999);
        window.requestAnimationFrame(fadeIn);
      }
    }
    loadLevel(levelIndex);
    canvas.style.opacity = 0;
    fadeStart = Date.now();
    fadeIn();
  }

  function endLevel() {
    var fadeStart;
    function fadeOut() {
      var seconds = (Date.now() - fadeStart) / 1000;
      if (seconds >= duration.prologue) {
        startLevel();
      } else {
        canvas.style.opacity = 1 - seconds / duration.epilogue;
        paintCanvas(0);
        window.requestAnimationFrame(fadeOut);
      }
    }
    status.gameInProgress = false;
    fadeStart = Date.now();
    fadeOut();
  }

  function displayLives() {
    container.spareLives.innerHTML = (lives.current - 1) + ' spare lives';
  }

  function startGame() {
    startGameButton.disabled = true;
    lives.current = lives.initial;
    displayLives();
    levelIndex = 0;
    startLevel();
    pauseGameButton.style.display = 'inline';
  }

  function init() {
    var direction,
        keyCode;

    canvas = document.getElementById('gameCanvas');
    context = canvas.getContext('2d');

    // Invert the key mapping for easier lookup.
    keyCodeToAction = {};
    for (direction in actionToKeyCode) {
      actionToKeyCode[direction].forEach(function (keyCode) {
        keyCodeToAction[keyCode] = direction;
      });
    }
    window.onkeydown = keyDownHandler.bind(this);

    container.currentLevel = document.getElementById('currentLevel');
    container.spareLives = document.getElementById('spareLives');
    container.levelTarget = document.getElementById('levelTarget');
    container.message = document.getElementById('message');
    startGameButton = document.getElementById('startGameButton');
    startGameButton.onclick = startGame.bind(this);
    pauseGameButton = document.getElementById('pauseGameButton');
    pauseGameButton.onclick = pauseGame.bind(this);
    pauseGameButton.style.display = 'none';

    startGame();
  }

  return {
    init: init,
    startGame: startGame
  };
})();

window.onload = Snake.init;
