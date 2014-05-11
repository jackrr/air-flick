var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var timbre = require('../3rd/timbre.js');

module.exports = Backbone.View.extend({
  el: '#sounds',

  initialize: function() {
    this.listenTo(this.model, 'change:freqs change:freq change:magnitude', this.render);
    this.audios = [timbre("sin", {freq: 440, mul: 0.5})];
  },

  render: function() {
    if (this.model.get('chord')) {
      console.log('render sound with chord');
      this.wasChord = true;
      var tones = this.model.get('freqs');

      for (var i = 0; i < tones.length; i++) {
        if (tones[i] == -1) {
          if (this.audios[i]) this.audios[i].pause();
          continue;
        }
        if (!this.audios[i]) {
          this.audios[i] = timbre("sin", {freq: tones[i], mul: this.model.get('magnitude')});
        } else {
          this.audios[i].set({mul: this.model.get('magnitude'), freq: tones[i]});
        }
        if (this.model.get('playing')) {
          this.audios[i].play();
        } else {
          this.audios[i].pause();
        }
      }
    } else {
      console.log('render sound without chord');
      if (this.wasChord) {
        for (var i = 1; i < this.audios.length; i++) this.audios[i].pause();
        this.wasChord = undefined;
      }
      // switch the comments below to toggle sound
      this.audios[0].set({mul: this.model.get('magnitude'), freq: this.model.get('freq')});
      //this.audio.set({mul: 0.0, freq: this.model.get('freq')}); 
      if (this.model.get('playing')) {
        this.audios[0].play();
      } else {
        this.audios[0].pause();
      }
    }
  }
});
