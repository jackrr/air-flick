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
    for (var key in this.displays) {
      var display = self.displays[key];
      if (!display.positioned) return display.toJSON();
    };
    return false;
  }

  this.positionDisplay = function(displayID) {
    this.displays[displayID].position();
  }

  this.notifyAll = function(msg) {
    for (var key in this.displays) {
      var display = this.displays[key];
      display.send('rooms:notification', { message: msg });
    };
  };

  this.close = function() {};
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
  }
};
