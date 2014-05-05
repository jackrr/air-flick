var rooms = require('../modules/rooms');

module.exports = function(app) {
  
  app.get('/rooms/clear_all', function(req, res) {
    rooms.reset();
    res.json({success: true});
  });

};
