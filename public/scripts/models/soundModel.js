var $ = require('jquery')(window);
var Backbone = require('backbone');
var SoundView = require('../views/soundView.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({

  initialize: function() {
    this.view = new SoundView({model: this});
    var mul = Math.pow(2, 1/12);
    this.intervals = {
      3: {major: Math.pow(mul,4), minor: Math.pow(mul,3)},
      5: {major: Math.pow(mul,7), dim: Math.pow(mul,6)},
      7: {major: Math.pow(mul,11), minor: Math.pow(mul,10)}
    }
  },

  setTones: function() {
    var name = this.get('chord');
    var root = this.get('freq');
    var freqs = [];
    // the root
    freqs.push(root);

    // the third
    if (name == 'maj' || name == 'dom7' || name == 'maj7') {
      freqs.push(this.intervals[3].major * root);
    } else {
      freqs.push(this.intervals[3].minor * root);
    }

    // 5th is always the same
    freqs.push(this.intervals[5].major * root);

    // the 7th, not always present
    if (name == 'min' || name == 'maj') {
      freqs.push(-1);
    } else if (name == 'dom7' || 'min7') {
      freqs.push(this.intervals[7].minor * root);
    } else { // maj7
      freqs.push(this.intervals[7].major * root);
    }
    this.set('freqs', freqs);
  },

  setChord: function(name, duration, def) {
    var names = ['maj', 'maj7', 'min', 'dom7', 'min7'];
    if (def) {
      console.log('unsetting chord');
      this.unset('chord'); 
    } else if (names.indexOf(name) > -1) {
      this.set('chord', name);
      this.setTones();
    } else {
      console.log('ERROR: bad chord name ', name);
    }
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
      if (this.get('chord')) this.setTones();
      return;
    }
    var freq = pitches[pitch];
    if (!freq) {
      console.log('ERROR: Invalid pitch', pitch);
      return;
    }
    this.set('freq', freq);
    if (this.get('chord')) this.setTones();
  },

  setVolume: function(value, duration, def) {
    if (def) {
      this.set('magnitude', .5);
    } else {
      this.set('magnitude', value * .5);
    }
  },


  play: function() {
    this.set('playing', true);
  },

  stop: function() {
    this.set('playing', false);
  }
});
