var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var timbre = require('../3rd/timbre.js');

module.exports = Backbone.View.extend({
  el: '#sounds',

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
    this.audio = timbre("sin", {freq: 440, mul: 0.5});
  },

  render: function() {
    // switch the comments below to toggle sound
    this.audio.set({mul: this.model.get('magnitude'), freq: this.model.get('freq')});
    //this.audio.set({mul: 0.0, freq: this.model.get('freq')}); 
    if (this.model.get('playing')) {
      this.audio.play();
    } else {
      this.audio.pause();
    }
  }
});
