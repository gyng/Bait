/* jshint browser: true */
/* global document, window, $ */
(function () {
    'use strict';

    function Cursor() {
        this.x = null;
        this.y = null;
        this.mouseDown = null;
    }

    var game;
    var cursor = new Cursor();

    $(document).ready(function () {
        var canvas = document.getElementById("view");
        game = new Game(canvas);
        game.start();
    });

    $(window).resize(function () {
        game.setSize($(window).width(), $(window).height());
    });

    $(document).on('mousemove', function (e) {
        cursor.x = e.pageX;
        cursor.y = e.pageY;
    });

    function Game(canvas) {
        this.canvas = null;
        this.context = null;
        this.player = null;
        this.entities = [];
        this.antimatter = [];
        this.lives = null;

        this.canvas = canvas;
        this.context = this.canvas.getContext("2d");
        this.width = $(window).width();
        this.height = $(window).height();
        this.setSize(this.width, this.height);
        this.createPlayer(this.width / 2, this.height / 2);
    }

    Game.prototype.start = function (rate) {
        if (typeof rate === "undefined") { rate = 1000 / 60; }
        this.frame = 0;
        this.lives = 3;

        window.requestAnimFrame = (function () {
            return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
        })();

        this.step();
        window.setInterval(this.debug.bind(this), 1000);
    };

    Game.prototype.setSize = function (width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    };

    Game.prototype.createPlayer = function (x, y) {
        this.player = new Player(x, y);
        this.entities.push(this.player);
    };

    Game.prototype.step = function () {
        this.fps++;
        this.frame++;
        this.spawnEntities();
        this.entities.forEach(this.stepEntity.bind(this));
        this.entities.forEach(this.cleanEntity.bind(this));
        this.antimatter.forEach(this.cleanEntity.bind(this));

        // Render
        // Optimise clearing: http://stackoverflow.com/a/6722031
        //this.context.save();
        //this.context.setTransform(1, 0, 0, 1, 0, 0);
        //this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        //this.context.restore();
        // this.context.fillStyle = "rgba(180, 180, 180, " + 0.2 + ")"; // Trails
        this.context.fillStyle = "rgba(240, 240, 240, " + 0.1 + ")"; // Trails
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawCount = 0;
        this.entities.forEach(this.drawEntity.bind(this));
        window.requestAnimFrame(this.step.bind(this));
    };

    Game.prototype.hitEffect = function (style) {
        if (typeof style === "undefined") { style = "rgba(0, 0, 0, 1)"; }
        this.context.fillStyle = style;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    };

    Game.prototype.stepEntity = function (element/*, index, array*/) {
        element.step();
    };

    Game.prototype.drawEntity = function (element/*, index, array*/) {
        if (typeof element === "undefined" ||
            typeof element.x === "undefined" ||
            typeof element.y === "undefined" ||
            element.x < -50 || element.x > $(window).width + 50 ||
            element.y < -50 || element.y > $(window).height + 50) {
            return;
        } else {
            this.drawCount++;
            this.context.save();
            this.context.translate(element.x, element.y);
            this.context.rotate(element.rotation);
            this.context.beginPath();
            this.context.fillStyle = element.appearance;
            this.context.fillRect(-10, -7, 20, 15);
            this.context.closePath();
            this.context.restore();
        }
    };

    Game.prototype.cleanEntity = function (element, index, array) {
        // Cull unwanted entities to save cycles
        if (element.markedForDeletion) {
            array.splice(index, 1);
            return;
        }
    };

    Game.prototype.spawnEntities = function () {
        var width = $(window).width();
        var height = $(window).height();

        // Antimatter
        if (this.frame % 50 === 0) {
            var antimatter = new Antimatter(
                width / 4 + Math.random() * width / 2,
                height / 4 + Math.random() * height / 2);
            this.entities.push(antimatter);
            antimatter.antimatterIndex = this.antimatter.length;
            this.antimatter.push(antimatter);
        }

        // Chaser
        if (this.frame % 80 === 0) {
            var chaser = new Chaser(Math.random() * width, Math.random() * height);
            // Don't spawn on player
            while (chaser.distanceTo(game.player) < 100) {
                chaser.x = Math.random() * width;
                chaser.y = Math.random() * height;
            }
            this.entities.push(chaser);
        }

        // Minder
        if (this.frame >= 600 && this.frame % 600 === 0) {
            var minder = new Minder(Math.random() * width, Math.random() * height);
            // Don't spawn on player
            while (minder.distanceTo(game.player) < 100) {
                minder.x = Math.random() * width;
                minder.y = Math.random() * height;
            }
            this.entities.push(minder);
        }
    };

    Game.prototype.debug = function () {
        $("#debug").html(
            "<h3>Make the red and the orange shit hit the blue shit but not the green shit</h3>" +
            "<p>" + this.fps + " FPS</p>" +
            "<p>" + this.entities.length + " entities</p>" +
            "<p>" + this.frame + " frame</p>" +
            "<p>" + this.drawCount + " draw count</p>" +
            "<p>" + this.lives + " lives </p>"
        );
        this.fps = 0;
    };

    function Entity(x, y) {
        this.rotation = 0;
        this.sprite = null;
        this.x = x;
        this.y = y;
        this.xSize = 20;
        this.ySize = 15;
        this.appearance = "rgb(0, 0, 0)";
        this.markedForDeletion = false;
    }
    Entity.prototype.faceObject = function (object) {
        this.rotation = Math.atan2(object.x - this.x, this.y - object.y);
    };
    Entity.prototype.distanceTo = function (object) {
        return Math.sqrt(Math.pow(object.x - this.x, 2) + Math.pow(object.y - this.y, 2));
    };
    Entity.prototype.collidesWith = function (object, threshold) {
        if (typeof threshold === "undefined") { threshold = 20; }
        return this.distanceTo(object) < threshold ? true : false;
    };

    function Player(x, y) {
        Entity.call(this, x, y);
        this.appearance = "rgb(0, 255, 0)";
    }
    Player.prototype = new Entity();
    Player.prototype.constructor = Player;
    Player.prototype.step = function () {
        var offsetX;
        var offsetY;

        if (cursor.y < $(window).height() / 2) {
            offsetY = this.y + this.ySize / 2 + Math.random() * 10;
        } else {
            offsetY = this.y - this.ySize / 2 - Math.random() * 10;
        }

        if (cursor.x < $(window).width() / 2) {
            offsetX = (this.x + this.xSize / 2 + Math.random() * 10);
        } else {
            offsetX = (this.x - this.xSize / 2 - Math.random() - 10);
        }

        var dX = (cursor.x - offsetX) * 0.1;
        var dY = (cursor.y - offsetY) * 0.1;

        this.x += dX;
        this.y += dY;
        this.faceObject(cursor);
    };

    function Chaser(x, y) {
        Entity.call(this, x, y);
        this.appearance = "rgb(255, 0, 0)";
        this.speedFactor = 1;
    }
    Chaser.prototype = new Entity();
    Chaser.prototype.constructor = Chaser;
    Chaser.prototype.step = function () {
        this.speedFactor *= 1.005;
        this.speedFactor = Math.min(this.speedFactor, 16);
        var dX = (game.player.x - this.x) * 0.01 * this.speedFactor;
        var dY = (game.player.y - this.y) * 0.01 * this.speedFactor;
        this.x += dX;
        this.y += dY;
        this.faceObject(game.player);

        if (this.collidesWith(game.player, 15)) {
            this.markedForDeletion = true;
            game.lives -= 1;
            game.hitEffect(this.appearance);
        }

        for (var i = 0; i < game.antimatter.length; i++) {
            if (this.collidesWith(game.antimatter[i], 25)) {
                this.markedForDeletion = true;
                game.antimatter[i].markedForDeletion = true;
            }
        }
    };

    function Minder(x, y) {
        Entity.call(this, x, y);
        this.appearance = "rgb(255, 150, 0)";
    }
    Minder.prototype = new Entity();
    Minder.prototype.constructor = Minder;
    Minder.prototype.step = function () {
        this.faceObject(game.player);

        if (this.distanceTo(game.player) < 250) {
            this.x += (game.player.x - this.x) * 0.05;
            this.y += (game.player.y - this.y) * 0.05;
        }

        if (this.collidesWith(game.player, 15)) {
            this.markedForDeletion = true;
            game.lives -= 1;
            game.hitEffect(this.appearance);
        }

        for (var i = 0; i < game.antimatter.length; i++) {
            if (this.collidesWith(game.antimatter[i], 25)) {
                this.markedForDeletion = true;
                game.antimatter[i].markedForDeletion = true;
            }
        }
    };

    function Antimatter(x, y) {
        Entity.call(this, x, y);
        this.antimatterIndex = null;
        this.appearance = "rgb(0, 0, 255)";
    }
    Antimatter.prototype = new Entity();
    Antimatter.prototype.constructor = Antimatter;
    Antimatter.prototype.step = function () {
        var dX = (game.player.x - this.x) * 0.008;
        var dY = (game.player.y - this.y) * 0.008;
        this.x -= dX;
        this.y -= dY;
        this.faceObject(game.player);
        if (this.x > $(window).width() + 50 || this.x < -50 ||
            this.y > $(window).height() + 50 || this.y < -50) {
            this.markedForDeletion = true;
        }
    };
}());