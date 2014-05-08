var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var timbre = require('../3rd/timbre.js');

module.exports = Backbone.View.extend({
  el: '#sounds',

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  render: function() {
    if (this.model.get('playing')) {
      this.audio = timbre("sin", {freq: this.model.get('freq'), mul: this.model.get('magnitude')});
      this.audio.play();
    } else {
      this.audio.pause();
    }
  }
});
