var rooms = {};
var Display = require('./display.js');
var Controller = require('./controller.js');

function Room(id) {
  var self = this;
  this.id = id || 'room1';
  this.displays = {};
  this.controllers = {};

  rooms[this.id] = this;

  this.toJSON = function() {
    return {id: this.id};
  }

  this.addDisplay = function(socket, direction) {
    var display = new Display(socket, direction);
    this.displays[direction] = display;
    this.notifyAll('new display for room');
  }

  this.sendTo = function(direction, block, controllerID) {
    console.log("in rooms.js: ", direction, block, controllerID);
    var display = this.displays[direction].send('display:block', {device: this.controllers[controllerID], block: block});
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
