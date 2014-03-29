var rooms = require('../modules/rooms');

module.exports = function(app) {
  app.get('/device/hello', function(req, res) {
    res.send("Hello, device");
  });

  app.get('/device/join_room/:roomID', function(req, res) {
  });
  
  app.get('/device/new_room/', function(req, res) {
    var room = rooms.create();
    res.json(room.forDevice());
  });
};
