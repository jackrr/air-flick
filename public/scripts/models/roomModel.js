var $ = require('jquery')(window);
var Backbone = require('backbone');
var Display = require('./displayModel.js');
var io = require('socket.io-client');


var RoomView = require('../views/roomView.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({
  initialize: function() {
    this.joinRoom();
    this.view = new RoomView({model: this});
    this.view.render();
  },

  joinRoom: function() {
    var self = this;
    this.socket = io.connect("http://localhost:3000");
    this.socket.on('connectSuccess', function(data) {
      if (self.id) {
        self.socket.emit("rooms:joinDisplay", { roomID: self.id });
      } else {
        self.socket.emit("rooms:newDisplay");
      }

      self.socket.on('rooms:joinSuccess', function (data) {
        self.display = new Display({room: self, socket: self.socket, message: data.message});
      });
    });
  }
});
