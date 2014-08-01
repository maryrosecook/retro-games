;(function() {
  var BLOCK_SIZE = 10;

  var Game = function(canvasId) {
    var screen = document.getElementById(canvasId).getContext('2d');

    this.size = { x: screen.canvas.width, y: screen.canvas.height };
    this.center = { x: this.size.x / 2, y: this.size.y / 2 };

    this.bodies = createWalls(this)
    this.bodies = this.bodies.concat(new FoodBlock(this));
    this.player = new Player(this);

    var self = this;
    var tick = function() {
      self.update();
      self.draw(screen);
      requestAnimationFrame(tick);
    };

    tick();
  };

  Game.prototype = {
    update: function() {
      this.player.update();
      reportCollisions(this.bodies);
    },

    draw: function(screen) {
      screen.clearRect(0, 0, this.size.x, this.size.y);
      for (var i = 0; i < this.bodies.length; i++) {
        this.bodies[i].draw(screen);
      }
    },

    addBody: function(body) {
      this.bodies.push(body);
    },

    removeBody: function(body) {
      var bodyIndex = this.bodies.indexOf(body);
      if (bodyIndex !== -1) {
        this.bodies.splice(bodyIndex, 1);
      }
    },

    isSquareFree: function(center) {
      return this.bodies.filter(function(b) {
        return colliding(b, { center: center });
      }).length === 0;
    },

    randomSquare: function() {
      return {
        x: Math.floor(this.size.x / BLOCK_SIZE * Math.random()) * BLOCK_SIZE + BLOCK_SIZE / 2,
        y: Math.floor(this.size.y / BLOCK_SIZE * Math.random()) * BLOCK_SIZE + BLOCK_SIZE / 2
      };
    }
  };

  var WallBlock = function(game, center) {
    this.game = game;
    this.center = center;
    this.size = { x: BLOCK_SIZE, y: BLOCK_SIZE };
  };

  WallBlock.prototype = {
    draw: function(screen) {
      drawRect(screen, this, "black");
    }
  };

  var FoodBlock = function(game) {
    this.game = game;

    while (this.center === undefined) {
      var center = this.game.randomSquare();
      if (this.game.isSquareFree(center)) {
        this.center = center;
      }
    }

    this.size = { x: BLOCK_SIZE, y: BLOCK_SIZE };
  };

  FoodBlock.prototype = {
    draw: function(screen) {
      drawRect(screen, this, "green");
    }
  };

  var SnakeBlock = function(game, player, center, direction) {
    this.game = game;
    this.player = player;
    this.center = center;
    this.size = { x: BLOCK_SIZE, y: BLOCK_SIZE };
    this.direction = direction;
  };

  SnakeBlock.prototype = {
    draw: function(screen) {
      drawRect(screen, this, "black");
    },

    collision: function(otherBody) {
      if (otherBody instanceof WallBlock || otherBody instanceof SnakeBlock) {
        this.player.die();
      } else if (otherBody instanceof FoodBlock) {
        this.player.eat(otherBody);
      }
    }
  };

  var Player = function(game) {
    this.game = game;
    this.keyboarder = new Keyboarder();

    var head = new SnakeBlock(this.game,
                              this,
                              { x: this.game.center.x, y: this.game.center.y },
                              { x: 1, y: 0 });
    this.game.addBody(head);
    this.blocks = [head];

    this.lastMove = 0;
  };

  Player.prototype = {
    update: function() {
      this.handleKeyboard();

      var now = new Date().getTime();
      if (now > this.lastMove + 100) {
        this.move();
        this.lastMove = now;
      }
    },

    move: function() {
      var head = this.blocks[0];
      moveBlock(head, head.direction);

      var prevBlock = head;
      for (var i = 1; i < this.blocks.length; i++) {
        moveBlock(this.blocks[i], prevBlock.direction);
        prevBlock = this.blocks[i];
      }
    },

    handleKeyboard: function() {
      var head = this.blocks[0];
      if (this.keyboarder.isDown(this.keyboarder.KEYS.LEFT) &&
          head.direction.x !== 1) {
        head.direction.x = -1;
        head.direction.y = 0;
      } else if (this.keyboarder.isDown(this.keyboarder.KEYS.RIGHT) &&
                 head.direction.x !== -1) {
        head.direction.x = 1;
        head.direction.y = 0;
      }

      if (this.keyboarder.isDown(this.keyboarder.KEYS.UP) &&
          head.direction.y !== 1) {
        head.direction.y = -1;
        head.direction.x = 0;
      } else if (this.keyboarder.isDown(this.keyboarder.KEYS.DOWN) &&
                 head.direction.y !== -1) {
        head.direction.y = 1;
        head.direction.x = 0;
      }
    },

    eat: function(foodBlock) {

    },

    die: function() {
      for (var i = 0; i < this.blocks.length; i++) {
        this.game.removeBody(this.blocks[i]);
      }
    }
  };

  var moveBlock = function(block, direction) {
    block.center.x += direction.x * BLOCK_SIZE;
    block.center.y += direction.y * BLOCK_SIZE;
  };

  var Keyboarder = function() {
    var keyState = {};

    window.addEventListener('keydown', function(e) {
      keyState[e.keyCode] = true;
    });

    window.addEventListener('keyup', function(e) {
      keyState[e.keyCode] = false;
    });

    this.isDown = function(keyCode) {
      return keyState[keyCode] === true;
    };

    this.KEYS = { LEFT: 37, RIGHT: 39, UP: 38, DOWN: 40 };
  };

  var colliding = function(b1, b2) {
    return b1 !== b2 &&
      b1.center.x === b2.center.x && b1.center.y === b2.center.y;
  };

  var reportCollisions = function(bodies) {
    var collisions = [];
    for (var i = 0; i < bodies.length; i++) {
      for (var j = i + 1; j < bodies.length; j++) {
        if (colliding(bodies[i], bodies[j])) {
          collisions.push([bodies[i], bodies[j]]);
        }
      }
    }

    for (var i = 0; i < collisions.length; i++) {
      if (collisions[i][0].collision !== undefined) {
        collisions[i][0].collision(collisions[i][1]);
      }

      if (collisions[i][1].collision !== undefined) {
        collisions[i][1].collision(collisions[i][0]);
      }
    }
  };

  var createWalls = function(game) {
    var walls = [];

    // top
    for (var x = BLOCK_SIZE / 2; x < game.size.x; x += BLOCK_SIZE) {
      walls.push(new WallBlock(game, { x: x, y: BLOCK_SIZE / 2 }));
    }

    // left
    for (var y = BLOCK_SIZE / 2 + BLOCK_SIZE; y < game.size.y - BLOCK_SIZE; y += BLOCK_SIZE) {
      walls.push(new WallBlock(game, { x: BLOCK_SIZE / 2, y: y }));
    }

    // right
    for (var y = BLOCK_SIZE / 2 + BLOCK_SIZE; y < game.size.y - BLOCK_SIZE; y += BLOCK_SIZE) {
      walls.push(new WallBlock(game, { x: game.size.x - BLOCK_SIZE / 2, y: y }));
    }

    // bottom
    for (var x = BLOCK_SIZE / 2; x < game.size.x; x += BLOCK_SIZE) {
      walls.push(new WallBlock(game, { x: x, y: game.size.y - BLOCK_SIZE / 2 }));
    }

    return walls;
  };

  var drawRect = function(screen, body, color) {
    screen.fillStyle = color;
    screen.fillRect(body.center.x - body.size.x / 2, body.center.y - body.size.y / 2,
                    body.size.x, body.size.y);
  };

  window.addEventListener('load', function() {
    new Game("screen");
  });
})(this);
