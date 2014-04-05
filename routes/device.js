var rooms = require('../modules/rooms');

module.exports = function(app) {
  app.get('/device/hello', function(req, res) {
    res.send("Hello, device");
  });

    app.post('/device/hello', function(req, res){
	var body = req.body;
	console.log(body);
	var dir = body["direction"];
	console.log("Swipe detected: "+dir);
	res.send({message:"hello, device!"});
    });

  app.get('/device/join_room/:roomID', function(req, res) {
  });
  
  app.get('/device/new_room/', function(req, res) {
    var room = rooms.create();
    res.json(room.forDevice());
  });
};
