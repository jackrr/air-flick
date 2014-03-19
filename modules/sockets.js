var rooms = require('./rooms.js');

module.exports = function(io) {
  io.sockets.on('connection', function(socket) {

    socket.emit('connectSuccess');

    socket.on('rooms:new', function (data) {
      var room = rooms.create();
      if (data.type == 'display') {
        room.addDisplay(socket);
      } else {
        room.addController(socket);
      }
      socket.emit('rooms:joinSuccess', {room: room.toJSON(), message: "joined room " + room.id});
    });

    socket.on('rooms:join', function (data) {
      var room = rooms.getRoom(data.roomID);
      if (!room) socket.emit('rooms:joinFailed', { room: { id: data.roomID }, message: "room does not exist"});
      if (data.type == 'display') {
        room.addDisplay(socket);
      } else {
        room.addController(socket);
      }
      socket.emit('rooms:joinSuccess', {room: room.toJSON(), message: "joined room " + room.id});
    });
  });
}
