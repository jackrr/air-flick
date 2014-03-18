var rooms = require('./rooms.js');

module.exports = function(io) {
  io.sockets.on('connection', function(socket) {
    console.log('********CONNECTION');

    socket.emit('connectSuccess');

    socket.on('rooms:newDisplay', function (data) {
      var room = rooms.create();
      socket.emit('rooms:joinSuccess', {id: room.id, message: "joined room " + room.id});
    });
  });
}
