var $ = require('jquery')(window);
var Backbone = require('backbone');
var Display = require('./displayModel.js');
var io = require('socket.io-client');

Backbone.$ = $;

module.exports = Backbone.Model.extend({
  initialize: function() {

    this.joinRoom();
    this.display = new DisplayModel({room: this, socket: this.socket});
  },

  joinRoom: function() {
    this.socket = io.connect(serverURL);
    if (this.id) {
      socket.emit("rooms:joinDisplay", { roomID: this.id });
    } else {
      socket.emit("rooms:newDisplay");
    }
  }
});
