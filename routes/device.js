var rooms = require('../modules/rooms');

module.exports = function(app) {
  app.get('/device/hello', function(req, res) {
    res.send("Hello, device");
  });

  app.get('/device/rooms/join/:roomID', function(req, res) {
  });

  app.get('/device/rooms/:roomID/position_displays', function(req, res) {
    var room = rooms.getRoom(req.params.roomID);
    display = room.nextUnmatchedDisplay();
    if (display){
      res.json({"next": display.toJSON()});
    } else {
      res.json({"room": room.toJSON()});
    }
  });

  app.get('/device/rooms/:roomID/position_display/:displayID', function(req, res) {
    var room = rooms.getRoom(req.params.roomID);
    room.positionDisplay(req.params.roomID);
    res.json(room.toJSON());
  });

  app.get('/device/new_room/', function(req, res) {
    var room = rooms.create();
    res.json(room.forDevice());
  });
};
