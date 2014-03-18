var Room = require('../models/roomModel.js');
var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

module.exports = Backbone.Router.extend({
  routes: {
    "new_room":        "newRoom", // # new_room
    "join/:roomID":    "join" // # begin
  },

  join: function(roomID) {
    var room = new Room({id: roomID});
  },

  newRoom: function() {
    var room = new Room();
  }
});
