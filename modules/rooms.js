var rooms = {};
var Display = require('./display.js');
var Controller = require('./controller.js');

function Room() {
  this.id = 'room1';
  this.displays = {};
  this.controllers = {};

  rooms[this.id] = this;

  this.toJSON = function() {
    return {id: this.id};
  }

  this.addDisplay = function(socket) {
    var display = new Display(socket);
    this.displays[display.id] = display;
    this.notifyAll('new display for room');
  }

  this.addController = function(socket) {
    var controller = new Controller(socket);
    this.controllers[controller.id] = controller;
    this.notifyAll('new controller for room');
  }

  this.nextUnmatchedDisplay = function() {
    this.displays.forEach(function(display) {
      if (!display.positioned) return display.toJSON();
    });
    return false;
  }

  this.positionDisplay = function(displayID) {
    this.displays[displayID].position();
  }

  this.notifyAll = function(msg) {
    this.displays.forEach(function(socket) {
      socket.emit('rooms:notification', { message: msg });
    });

    this.controllers.forEach(function(socket) {
      socket.emit('rooms:notification', { message: msg });
    });
  };

  this.close = function() {};
}

module.exports = {
  getRoom: function(roomID) {
    return rooms[roomID];
  },
  close: function(room) {
    rooms[room].close();
  },
  create: function(io) {
    return new Room();
  }
};
