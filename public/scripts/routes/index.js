var Room = require('../models/roomModel.js');
var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

module.exports = Backbone.Router.extend({
  routes: {
    "new_room":        "newRoom" // # new_room
  },

  newRoom: function() {
    var room = new Room();
  }
});
