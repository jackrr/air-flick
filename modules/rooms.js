var rooms = {};

function Room() {
  this.id = 'room'+rooms.length;

  rooms[this.id] = this;

  this.forDevice = function() {
    return {id: this.id};
  }
}

module.exports = {
  addMonitor: function(room) {
  },
  addDevice: function(room) {
  },
  send: function(room, message) {
    rooms[room].send(message);
  },
  close: function(room) {
    rooms[room].close();
  },
  create: function() {
    return new Room();
  }
};
