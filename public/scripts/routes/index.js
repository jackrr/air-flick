var Room = require('../models/roomModel.js');
var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

module.exports = Backbone.Router.extend({
  routes: {
    "new_room":        "newRoom", // # new_room
    "clear_rooms":      "clearRooms"
  },

  newRoom: function() {
    var room = new Room();
  },

  clearRooms: function() {
    Backbone.$.get("rooms/clear_all", function(data) {
      if (data.success) {
        alert('rooms emptied');
      } else {
        alert('room clear failed');
      }
    });
  }
});
