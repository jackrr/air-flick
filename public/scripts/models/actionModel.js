var $ = require('jquery')(window);
var Backbone = require('backbone');
var SineView = require('../views/sineView.js');

Backbone.$ = $;

var Action = Backbone.Model.extend({

  execute: function() {
    setTimeout(this.done, this.get('duration'));
  },

  done: function() {
    this.get('parent').nextAction(this.type);
  }

});

var VolumeModel = Action.extend({
  initialize: function() {
    this.set('type', 'volume');
    if (this.get('default')) {
      this.execute = function() {
        var sound = this.get('parent').sound;
        sound.setVolume(-1, -1, 'default');
      }
    }
  },
  execute: function() {
    var sound = this.get('parent').sound;
    sound.setVolume(this.get('value'), this.get('duration'));
    Action.prototype.execute.apply(this);
  },
  done: function() {
    Action.prototype.done.apply(this);
  }
});

var ChordModel = Action.extend({
  initialize: function() {
    this.set('type', 'chord');
    if (this.get('default')) {
      this.execute = function() {
        var sound = this.get('parent').sound;
        sound.setChord(-1, -1, 'default');
      }
    }
  },
  execute: function() {
    sound.setChord(this.get('value'), this.get('duration'));
    Action.prototype.execute.apply(this);
  },
  done: function() {
    Action.prototype.done.apply(this);
  }
});

var PitchModel = Action.extend({
  initialize: function() {
    this.set('type', 'pitch');
    if (this.get('default')) {
      this.execute = function() {
        var sound = this.get('parent').sound;
        sound.setPitch(-1, -1, 'default');
      }
    }
  },
  type: 'pitch',
  execute: function() {
    sound.setPitch(this.get('value'), this.get('duration'));
    Action.prototype.execute.apply(this);
  },
  done: function() {
    Action.prototype.done.apply(this);
  }

});

module.exports = {
  Volume: VolumeModel,
  Chord: ChordModel,
  Pitch: PitchModel
};
