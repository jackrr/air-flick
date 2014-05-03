var $ = require('jquery')(window);
var Backbone = require('backbone');
var SoundView = require('../views/soundView.js');
var url = "media/";

Backbone.$ = $;

module.exports = Backbone.Model.extend({


  initialize: function() {
    this.on('change:color', this.setNote);
    this.view = new SoundView({model: this});
  },

  setNote: function() {
    var cnotes = {
      'FF00FF': 'C4',
      '00FFFF': 'E4',
      'FFFF00': 'G4'
    };
    this.set('note', cnotes[this.get('color')]);
  },

  playOnce: function(duration) {
    this.view.playFor(duration);
  },

  play: function() {
    this.view.play();
  },

  stop: function() {
    this.view.stop();
  }
});
