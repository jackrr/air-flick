var $ = require('jquery')(window);
var Backbone = require('backbone');
var Display = require('./displayModel.js');
var io = require('socket.io-client');


var RoomView = require('../views/roomView.js');
var Logger = require('./logger.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({
  initialize: function() {
    this.connect();
    this.view = new RoomView({model: this});
    this.view.render();
  },

  connect: function() {
    var self = this;
    // var socket = io.connect("http://photoplace.cs.oberlin.edu");
    var socket = io.connect("http://localhost:3000");
    socket.on('connectSuccess', function(data) {
      self.set({
        status: 'connected',
        socket: socket
      });


      self.logger = new Logger({socket: socket});
      self.joinRoom('test'); // *** comment out for production
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
      self.display = new Display({room: self, socket: socket, message: data.message, id: data.id});
      self.view.hide();
    });
  }
});
