var $ = require('jquery')(window);
var Backbone = require('backbone');
var SoundView = require('../views/soundView.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({

  initialize: function() {
    this.view = new SoundView({model: this});
  },

  setPitch: function(pitch, duration, def) {
    var pitches = {
      A: 440,
      B: 494,
      C: 523,
      D: 587,
      E: 659,
      F: 698,
      G: 784
    };
    if (def) {
      this.set('freq', pitches.C);
      return;
    }
    var freq = pitches[pitch];
    if (!freq) {
      console.log('ERROR: Invalid pitch', pitch);
      return;
    }
    this.set('freq', freq);
  },

  setVolume: function(value, duration, def) {
    if (def) {
      this.set('magnitude', .5);
    } else {
      this.set('magnitude', value * .5);
    }
  },

  setChord: function(name, duration, def) {
    // this stuff is harder
  },

  play: function() {
    this.set('playing', true);
  },

  stop: function() {
    this.set('playing', false);
  }
});
