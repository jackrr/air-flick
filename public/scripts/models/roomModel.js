var $ = require('jquery')(window);
var Backbone = require('backbone');
var Display = require('./displayModel.js');
var io = require('socket.io-client');


var RoomView = require('../views/roomView.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({
  initialize: function() {
    this.connect();
    this.view = new RoomView({model: this});
    this.view.render();
  },

  connect: function() {
    var self = this;
    var socket = io.connect("http://photoplace.cs.oberlin.edu");
    socket.on('connectSuccess', function(data) {
      self.set({
        status: 'connected',
        socket: socket
      });
    });
  },

  joinRoom: function(roomID) {
    var self = this;
    var socket = self.get('socket');
    if (roomID) {
      socket.emit("rooms:join", { roomID: roomID, type: 'display' });
    } else {
      socket.emit("rooms:new", { type: 'display' });
    }

    socket.on('rooms:joinSuccess', function (data) {
      var room = data.room;
      self.set(data.room);
      self.display = new Display({room: self, socket: socket, message: data.message});
      self.view.hide();
    });

    socket.on('rooms:notification', function (data) {
      self.view.notify(data.message);
    });
  }
});
