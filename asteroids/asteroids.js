;(function() {
  var Game = function() {
    var screen = document.getElementById("screen").getContext('2d');

    this.size = { x: screen.canvas.width, y: screen.canvas.height };
    this.center = { x: this.size.x / 2, y: this.size.y / 2 };

    this.bodies = [
      new Asteroid(this, { x: 75, y: 75 }, 30),
      new Asteroid(this, { x: 225, y: 75 }, 30),
      new Asteroid(this, { x: 150, y: 225 }, 30),
      new Player(this)
    ];

    this.shootSound = document.getElementById("shoot-sound");

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

      for (var i = 0; i < this.bodies.length; i++) {
        this.bodies[i].update();
      }
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

    wrapIfOffScreen: function(obj) {
      var screen = geom.rect(this);
      if ((obj.points.filter(function(p) { return p.x > screen.l; }).length === 0 &&
           obj.velocity.x < 0) ||
          (obj.points.filter(function(p) { return p.x < screen.r; }).length === 0 &&
           obj.velocity.x > 0)) {
        moveBody(obj, { x: this.size.x - obj.center.x, y: obj.center.y });
      } else if ((obj.points.filter(function(p) { return p.y > screen.t; }).length === 0 &&
                  obj.velocity.y < 0) ||
                 (obj.points.filter(function(p) { return p.y < screen.b; }).length === 0 &&
                  obj.velocity.y > 0)) {
        moveBody(obj, { x: obj.center.x, y: this.size.y - obj.center.y });
      }
    }
  };

  var Asteroid = function(game, center, radius) {
    this.game = game;
    this.angle = 0;
    this.center = center;
    this.radius = radius;
    this.points = asteroidPoints(center, radius, 10);
    this.velocity = { x: Math.random() - 0.5, y: Math.random() - 0.5 };
  };

  Asteroid.prototype = {
    update: function() {
      moveBody(this, geom.translate(this.center, this.velocity));
      this.game.wrapIfOffScreen(this);
    },

    draw: function(screen) {
      drawLinesFromPoints(screen, this.points);
    },

    collision: function(otherBody) {
      if (otherBody instanceof Player || otherBody instanceof Bullet) {
        this.game.removeBody(this);
        this.game.removeBody(otherBody);
        if (this.radius > 10) {
          var radius = this.radius - 10;
          this.game.addBody(new Asteroid(this.game, { x: this.center.x, y: this.center.y }, radius));
          this.game.addBody(new Asteroid(this.game, { x: this.center.x, y: this.center.y }, radius));
        }
      }
    }
  };

  var drawLinesFromPoints = function(screen, points) {
    var lines = pointsToLines(points);
    for (var i = 0; i < lines.length; i++) {
      drawLine(screen, lines[i]);
    }
  };

  var moveBody = function(body, center) {
    var translation = geom.vectorTo(body.center, center);
    body.center = center;
    body.points = body.points.map(function(x) { return geom.translate(x, translation); });
  };

  var Player = function(game) {
    this.game = game;
    this.angle = 0;
    this.center = { x: this.game.center.x, y: this.game.center.y };
    this.points = [{ x: this.center.x - 8, y: this.center.y + 9 },
                   { x: this.center.x,     y: this.center.y - 10 },
                   { x: this.center.x + 8, y: this.center.y + 9 }];
    this.velocity = { x: 0, y: 0 };
    this.keyboarder = new Keyboarder();
    this.lastShotTime = 0;
  };

  Player.prototype = {
    update: function() {
      if (this.keyboarder.isDown(this.keyboarder.KEYS.LEFT)) {
        this.turn(-0.1);
      } else if (this.keyboarder.isDown(this.keyboarder.KEYS.RIGHT)) {
        this.turn(0.1);
      }

      if (this.keyboarder.isDown(this.keyboarder.KEYS.UP)) {
        this.velocity = geom.translate(this.velocity,
                                       geom.rotate({ x: 0, y: -0.05 }, { x: 0, y: 0 }, this.angle));
      }

      var now = new Date().getTime();
      if (this.keyboarder.isDown(this.keyboarder.KEYS.SPACE) &&
          now - this.lastShotTime > 500) {
        this.lastShotTime = now;

        this.game.shootSound.load();
        this.game.shootSound.play();
        this.game.addBody(new Bullet(this.game, { x: this.points[1].x, y: this.points[1].y },
                                        this.angle));
      }

      moveBody(this, geom.translate(this.center, this.velocity));
      this.game.wrapIfOffScreen(this);
    },

    turn: function(angleDelta) {
      var center = this.center;
      this.points = this.points.map(function(x) { return geom.rotate(x, center, angleDelta); })
      this.angle += angleDelta;
    },

    draw: function(screen) {
      drawLinesFromPoints(screen, this.points);
    }
  };

  var Bullet = function(game, start, angle) {
    this.game = game;
    this.velocity = geom.rotate({ x: 0, y: -5 }, { x: 0, y: 0 }, angle);
    this.angle = 0;
    this.center = start;
    this.points = [start, geom.translate(start, { x: this.velocity.x, y: this.velocity.y })];
  };

  Bullet.prototype = {
    update: function() {
      moveBody(this, geom.translate(this.center, this.velocity));

      var gameRect = geom.rect(this.game);
      if (this.center.x < gameRect.l || this.center.x > gameRect.r ||
          this.center.y < gameRect.t || this.center.y > gameRect.b) {
        this.game.removeBody(this);
      }
    },

    draw: function(screen) {
      drawLinesFromPoints(screen, this.points);
    },

    collision: function(otherBody) {
      if (otherBody instanceof Asteroid) {
        this.game.removeBody(this);
        this.game.removeBody(otherBody);
      }
    }
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

    this.KEYS = { LEFT: 37, RIGHT: 39, UP: 38, SPACE: 32 };
  };

  var pointsToLines = function(points) {
    var lines = [];
    var previous = points[0];
    for (var i = 1; i < points.length; i++) {
      lines.push([previous, points[i]]);
      previous = points[i];
    }

    lines.push([previous, lines[0][0]]); // end to beginning
    return lines;
  };

  var drawLine = function(screen, line) {
    screen.beginPath();
    screen.moveTo(line[0].x, line[0].y);
    screen.lineTo(line[1].x, line[1].y);
    screen.stroke();
  };

  var asteroidPoints = function(center, radius, pointCount) {
    var points = [];
    for (var a = 0; a < 2 * Math.PI; a += 2 * Math.PI / pointCount) {
      var random = Math.random();
      points.push(geom.rotate({
        x: center.x + radius * (0.2 + random),
        y: center.y - radius * (0.2 + random)
      }, center, a));
    }

    return points;
  };

  var pairs = function(a, b) {
    var pairs = [];
    for (var i = 0; i < a.length; i++) {
      for (var j = 0; j < b.length; j++) {
        pairs.push([a[i], b[j]]);
      }
    }
    return pairs;
  };

  var isColliding = function(b1, b2) {
    if (b1 === b2) return false;
    return pairs(pointsToLines(b1.points), pointsToLines(b2.points))
      .filter(function(x) {
        return geom.linesIntersecting(x[0], x[1]);
      }).length > 0;
  };

  var reportCollisions = function(bodies) {
    var collisions = [];
    for (var i = 0; i < bodies.length; i++) {
      for (var j = i + 1; j < bodies.length; j++) {
        if (isColliding(bodies[i], bodies[j])) {
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

  var geom = {
    translate: function(point, translation) {
      return { x: point.x + translation.x, y: point.y + translation.y };
    },

    vectorTo: function(point1, point2) {
      return { x: point2.x - point1.x, y: point2.y - point1.y };
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
      var d = (b[1].y - b[0].y) * (a[1].x - a[0].x) -
          (b[1].x - b[0].x) * (a[1].y - a[0].y);
      var n1 = (b[1].x - b[0].x) * (a[0].y - b[0].y) -
          (b[1].y - b[0].y) * (a[0].x - b[0].x);
      var n2 = (a[1].x - a[0].x) * (a[0].y - b[0].y) -
          (a[1].y - a[0].y) * (a[0].x - b[0].x);

      if (d === 0.0) return false;
      return n1 / d >= 0 && n1 / d <= 1 && n2 / d >= 0 && n2 / d <= 1;
    },

    rect: function(obj) {
      return {
        l: obj.center.x - obj.size.x / 2,
        r: obj.center.x + obj.size.x / 2,
        t: obj.center.y - obj.size.y / 2,
        b: obj.center.y + obj.size.y / 2
      }
    }
  };

  window.addEventListener('load', function() {
    new Game();
  });
})(this);
