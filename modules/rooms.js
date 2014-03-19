var rooms = {};

function Room() {
  this.id = 'room1';
  this.displays = [];
  this.controllers = [];

  rooms[this.id] = this;

  this.toJSON = function() {
    return {id: this.id};
  }

  this.addDisplay = function(socket) {
    this.displays.push(socket);
    this.notifyAll('new display for room');
  }

  this.addController = function(socket) {
    this.controllers.push(socket);
    this.notifyAll('new controller for room');
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
