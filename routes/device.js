var rooms = require('../modules/rooms');

module.exports = function(app) {
  app.get('/device/hello', function(req, res) {
    res.send("Hello, device");
  });

  app.post('/device/join', function(req, res) {
    console.log('device joined: ', req.body);
    var body = req.body;
    var room = rooms.getRoom(body.roomID);
    room.addController(body.deviceID);
    res.send("Hello, you fucker");
  });

  app.post('/device/room/:roomID', function(req, res) {
    var body = req.body;
    var room = rooms.getRoom(req.params.roomID);
    console.log(body);
    room.sendTo(body.direction, body.block, body.deviceID);
    res.json({direction: body.direction});
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
