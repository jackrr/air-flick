var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var tpl = require('../templates/room.js');
var dust = require('../dust-core.min.js');
console.log(tpl);

module.exports = Backbone.View.extend({
  events: {
    "click .joinExisting": "join",
    "click .joinNew": "joinNew"
  },
  el: 'body',

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  join: function() {
    var roomID = prompt("Enter the name of the room to join", "e.g. poopbutt");
    this.model.joinRoom(roomID);
  },

  joinNew: function() {
    this.model.joinRoom();
  },

  notify: function(msg) {
    alert(msg);
  },

  render: function() {
    var self = this;
    console.log('rendering room', this.model, this.model.attributes);
    dust.render('room', self.model.attributes, function(err, out) {
      if (err) console.log(err);
      self.$el.html(out);
    });
  }
});
