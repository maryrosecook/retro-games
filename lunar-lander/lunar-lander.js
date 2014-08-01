;(function() {
  var Game = function(canvasId) {
    var screen = document.getElementById(canvasId).getContext('2d');

    this.size = { x: screen.canvas.width, y: screen.canvas.height };
    this.center = { x: this.size.x / 2, y: this.size.y / 2 };

    this.bodies = createMountains(this);
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
      reportCollisions(this.bodies);
      this.player.update();
    },

    draw: function(screen) {
      screen.clearRect(0, 0, this.size.x, this.size.y);
      for (var i = 0; i < this.bodies.length; i++) {
        drawLine(screen, this.bodies[i]);
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
    }
  };

  var ShipBaseLine = function(game, p1, p2) {
    this.game = game;
    this.p1 = p1;
    this.p2 = p2;
  };

  ShipBaseLine.prototype = {
    collision: function(otherBody) {
      // this.game.player.resolveCollision(this, otherBody);
    }
  };

  var ShipHullLine = function(game, p1, p2) {
    this.game = game;
    this.p1 = p1;
    this.p2 = p2;
  };

  ShipHullLine.prototype = {
    collision: function(otherBody) {
      // this.game.player.resolveCollision(this, otherBody);
    }
  };

  var MountainLine = function(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
  };

  var BoostLine = function(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
  };

  var Player = function(game) {
    this.game = game;
    var h = 5;
    var w = 5;

    this.angle = 0;
    this.center = { x: this.game.center.x, y: h * 2 };

    var c = this.center;
    this.lines = [
      new ShipHullLine(game, { x: c.x, y: c.y - h }, { x: c.x + w, y: c.y + h }),
      new ShipHullLine(game, { x: c.x - w, y: c.y + h }, { x: c.x, y: c.y - h }),
      new ShipBaseLine(game,
                       { x: c.x - w * 2, y: c.y + h * 3 },
                       { x: c.x + w * 2, y: c.y + h * 3 }),
      new BoostLine({ x: c.x - w, y: c.y + h * 3 }, { x: c.x, y: c.y + h * 3 }),
      new BoostLine({ x: c.x + w, y: c.y + h * 3 }, { x: c.x, y: c.y + h * 3 })
    ];

    this.lines.forEach(function(l) {
      this.game.addBody(l);
    }, this);

    this.boosting = false;
    this.velocity = { x: 0, y: 0 };
    this.keyboarder = new Keyboarder();
  };

  Player.prototype = {
    update: function() {
      this.applyGravity();
      this.applyBoost();

      this.center = geom.translate(this.center, this.velocity);
      this.lines.forEach(function(l) {
        l.p1 = geom.translate(l.p1, this.velocity);
        l.p2 = geom.translate(l.p2, this.velocity);
      }, this);

      this.handleKeyboard();
    },

    applyGravity: function() {
      this.velocity.y += 0.002;
    },

    applyBoost: function() {
      if (this.boosting === true) {
        this.velocity = geom.translate(this.velocity,
                                       geom.rotate({ x: 0, y: -0.004 },
                                                   { x: 0, y: 0 },
                                                   this.angle));
      }
    },

    handleKeyboard: function() {
      if (this.keyboarder.isDown(this.keyboarder.KEYS.LEFT)) {
        this.rotate(-0.07);
      } else if (this.keyboarder.isDown(this.keyboarder.KEYS.RIGHT)) {
        this.rotate(0.07);
      }

      if (this.keyboarder.isDown(this.keyboarder.KEYS.UP) && this.boosting === false) {
        this.boosting = true;
        var boostPointOffset = geom.rotate({ x: 0, y: 10 }, { x: 0, y: 0 }, this.angle);
        this.lines[3].p2 = geom.translate(this.lines[3].p2, boostPointOffset);
        this.lines[4].p2 = geom.translate(this.lines[4].p2, boostPointOffset);
      } else if (this.keyboarder.isDown(this.keyboarder.KEYS.DOWN) && this.boosting === true) {
        this.boosting = false;
        var boostPointOffset = geom.rotate({ x: 0, y: -10 }, { x: 0, y: 0 }, this.angle);
        this.lines[3].p2 = geom.translate(this.lines[3].p2, boostPointOffset);
        this.lines[4].p2 = geom.translate(this.lines[4].p2, boostPointOffset);
      }
    },

    // resolveCollision: function(shipLine, otherLine) {
    //   if (shipLine instanceof ShipBaseLine && otherBody instanceof LandingPadLine) {
    //     // allow terrible landing for now
    //     this.rotate(-this.angle);
    //     this.velocity = { x: 0, y: 0 };
    //   } else {
    //     this.die();
    //   }
    // },

    rotate: function(angleChange) {
      this.angle += angleChange;
      this.lines.forEach(function(l) {
        l.p1 = geom.rotate(l.p1, this.center, angleChange);
        l.p2 = geom.rotate(l.p2, this.center, angleChange);
      }, this);
    },

    // die: function() {
    //   this.lines.forEach(function(l) {
    //     this.game.removeBody(l);
    //   }, this);
    // }
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

  var drawLine = function(screen, line) {
    screen.beginPath();
    screen.moveTo(line.p1.x, line.p1.y);
    screen.lineTo(line.p2.x, line.p2.y);
    screen.stroke();
  };

  var colliding = function(b1, b2) {
    return b1 !== b2 && geom.linesIntersecting(b1, b2);
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

  var createMountains = function(game) {
    var lines = [];

    var w = game.size.x;
    var h = game.size.y;

    var ordinate = function(min, max) {
      return min + (max - min) * Math.random();
    };

    var p = { x: 0, y: ordinate(h * 0.7, h) };
    while (p.x < w) {
      var nextP = { x: p.x + ordinate(30, 40), y: ordinate(h * 0.7, h) };
      lines.push(new MountainLine({ x: p.x, y: p.y }, nextP));
      p = nextP;
    }

    return lines;
  };

  var geom = {
    translate: function(point, translation) {
      return { x: point.x + translation.x, y: point.y + translation.y };
    },

    rotate: function(point, pivot, angle) {
      return {
        x: (point.x - pivot.x) * Math.cos(angle) -
          (point.y - pivot.y) * Math.sin(angle) +
          pivot.x,
        y: (point.x - pivot.x) * Math.sin(angle) +
          (point.y - pivot.y) * Math.cos(angle) +
          pivot.y
      };
    },

    linesIntersecting: function(a, b) {
      var d = (b.p2.y - b.p1.y) * (a.p2.x - a.p1.x) -
          (b.p2.x - b.p1.x) * (a.p2.y - a.p1.y);
      var n1 = (b.p2.x - b.p1.x) * (a.p1.y - b.p1.y) -
          (b.p2.y - b.p1.y) * (a.p1.x - b.p1.x);
      var n2 = (a.p2.x - a.p1.x) * (a.p1.y - b.p1.y) -
          (a.p2.y - a.p1.y) * (a.p1.x - b.p1.x);

      if (d === 0.0) return false;
      return n1 / d >= 0 && n1 / d <= 1 && n2 / d >= 0 && n2 / d <= 1;
    }
  };

  window.addEventListener('load', function() {
    new Game("screen");
  });
})(this);
