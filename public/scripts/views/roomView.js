var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var tpl = require('../templates/room.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  events: {
    "click .joinExisting": "join",
    "click .left": "joinLeft",
    "click .up": "joinUp",
    "click .right": "joinRight"
  },
  el: '#room',

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  join: function() {
    var roomID = prompt("Enter the name of the room to join", "room1");
    this.model.joinRoom("up", roomID);
  },

  joinNew: function() {
    this.model.joinRoom();
  },
  joinLeft: function() {
    var roomID = prompt("Enter the name of the room to join", "room1");
    this.model.joinRoom("left", roomID);
  },
  joinRight: function() {
    var roomID = prompt("Enter the name of the room to join", "room1");
    this.model.joinRoom("right", roomID);
  },
  joinUp: function() {
    var roomID = prompt("Enter the name of the room to join", "room1");
    this.model.joinRoom("up", roomID);
  },

  notify: function(msg) {
    alert(msg);
  },

  hide: function() {
    // somehow, $ is being stepped on
    Backbone.$(this.$el).hide();
  },

  render: function() {
    var self = this;
    dust.render('room', self.model.attributes, function(err, out) {
      if (err) console.log(err);
      self.$el.html(out);
    });
  }
});
