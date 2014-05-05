var rooms = {};
var Display = require('./display.js');
var Controller = require('./controller.js');
var uuid = require('node-uuid');

function Room(id) {
  var self = this;
  this.id = id || uuid.v1();
  this.displays = {};
  this.controllers = {};
  this.displayCount = 0;

  rooms[this.id] = this;

  this.toJSON = function() {
    return {id: this.id};
  }

  this.addDisplay = function(socket) {
    var display = new Display(socket);
    this.displays[display.id] = display;
    this.displayCount++;
    this.notifyAll('new display for room');
    return display;
  }

  this.sendTo = function(displayID, block, controllerID) {
    this.displays[displayID].sendBlock({device: this.controllers[controllerID], block: block});
  }

  this.displaysMatching = function() {
    var colors = {};
    for (var key in this.displays) {
      var display = self.displays[key];
      var color = display.currentColor();
      if (colors[color]) {
        colors[color] += 1;
      } else {
        colors[color] = 1;
      }
    }

    var max = 0;
    for (var key in colors) {
      if (colors[key] > max) max = colors[key];
    }
      
    return colors[key];
  }

  this.addController = function(id) {
    var controller = new Controller(id);
    this.controllers[controller.id] = controller;
    this.notifyAll('new controller for room');
  }

  this.nextUnmatchedDisplay = function() {
    if (this.lastPositioned) {
      this.lastPositioned.position();
    } else {
      for (var key in this.displays) {
        this.displays[key].startPositioning();
      }
    }

    for (var key in this.displays) {
      var display = this.displays[key];
      if (!display.isPositioned()) {
        display.setPosition();
        this.lastPositioned = display;
        return display;
      }
    }

    // all displays have been positioned
    for (var key in this.displays) {
      this.displays[key].allPostioningDone();
    }
    return false;
  }

  this.notifyAll = function(msg) {
    for (var key in this.displays) {
      var display = this.displays[key];
      display.send('rooms:notification', { message: msg });
    };
  };

  this.close = function() {
    for (var key in this.displays) {
      this.displays[key].close();
    }
    for (var key in this.controllers) {
      this.controllers[key].close();
    }
  };
}

module.exports = {
  getRoom: function(roomID) {
    var room = rooms[roomID];
    if (room) return room;
    return new Room(roomID);
  },
  close: function(room) {
    rooms[room].close();
  },
  create: function(io) {
    return new Room();
  },
  reset: function() {
    for (var key in rooms) {
      rooms[key].close();
      delete rooms[key];
    }
  }
};
