var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var timbre = require('../3rd/timbre.js');

module.exports = Backbone.View.extend({
  el: '#sounds',

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  notes: {
    'C4': 261,
    'E4': 329,
    'G4': 392,
    'Bb4': 466
  },

  render: function() {

    var audio = timbre("sin", {freq: this.notes[this.model.get('note')], mul: 0.8});
    setTimeout(function() {
      audio.pause();
    }, 1000);
  },

  playFor: function(duration) {
    var audio = timbre("sin", {freq: this.notes[this.model.get('note')], mul: 0.8});
    audio.play();

    setTimeout(function() {
      audio.pause();
    }, duration * 1000);
  },

  play: function() {
    this.audio = timbre("sin", {freq: this.notes[this.model.get('note')], mul: 0.3});
    this.audio.play();
  },

  stop: function() {
    this.audio.pause();
    delete this.audio;
  }
});
