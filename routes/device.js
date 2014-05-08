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
    res.send("Hello, you device.");
  });

  app.post('/device/room/:roomID', function(req, res) {
    var body = req.body;
    var room = rooms.getRoom(req.params.roomID);
    room.sendTo(body.displayID, body.action, body.deviceID);
    res.json({display: room.displays[body.displayID].toJSON(), matches: 0});
  });

  // this is used to ask the server for an unpositioned display
  // if there is a display that needs to be positioned, the response contains:
  //    next -- the display (next.id is the unique identifier for the display)
  //    count -- the number of displays in the room
  // otherwise, the response contains basic info about the room (no next key will be present)
  app.get('/device/room/:roomID/position_displays', function(req, res) {
    var room = rooms.getRoom(req.params.roomID);
    display = room.nextUnmatchedDisplay();
    if (display){
      res.json({next: display.toJSON(), count: room.displayCount});
    } else {
      res.json({room: room.toJSON()});
    }
  });

  app.get('/device/room/:roomID/display_content/:displayID', function(req, res) {
    var room = rooms.getRoom(req.params.roomID);
    room.displays[req.params.displayID].removeBlock(function(block) {
      res.json({block: block});
    });
  });

  app.get('/device/new_room/', function(req, res) {
    var room = rooms.create();
    res.json(room.forDevice());
  });
};
