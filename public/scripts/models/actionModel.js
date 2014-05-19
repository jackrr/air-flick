var $ = require('jquery')(window);
var Backbone = require('backbone');
var SineView = require('../views/sineView.js');

Backbone.$ = $;

var Action = Backbone.Model.extend({

  initialize: function() {
    this.set('time', Math.floor(this.get('duration')/1000) + "s");
  },

  execute: function() {
    var self = this;
    setTimeout(function() { self.done(); }, this.get('duration') - 2000);
  },

  done: function() {
    this.get('parent').nextAction(this.get('type'));
  }

});

var VolumeModel = Action.extend({
  initialize: function() {
    this.set('type', 'volume');
    if (this.get('default')) {
      this.set('displayText', 'x1');
      this.execute = function() {
        var sound = this.get('parent').sound;
        sound.setVolume(-1, -1, 'default');
      }
    } else {
      this.set('displayText', 'x'+Math.floor(this.get('value')));
    }
    Action.prototype.initialize.apply(this);
  },
  execute: function() {
    var sound = this.get('parent').sound;
    sound.setVolume(this.get('value'), this.get('duration'));
    Action.prototype.execute.apply(this);
  }
});

var ChordModel = Action.extend({
  initialize: function() {
    this.set('type', 'chord');
    if (this.get('default')) {
      this.set('displayText', 'Root');
      this.execute = function() {
        var sound = this.get('parent').sound;
        sound.setChord(-1, -1, 'default');
      }
    } else {
      this.set('displayText', this.get('value'));
    }
    Action.prototype.initialize.apply(this);
  },
  execute: function() {
    var sound = this.get('parent').sound;
    sound.setChord(this.get('value'), this.get('duration'));
    Action.prototype.execute.apply(this);
  }
});

var PitchModel = Action.extend({
  initialize: function() {
    this.set('type', 'pitch');
    if (this.get('default')) {
      this.set('displayText', 'C');
      this.execute = function() {
        var sound = this.get('parent').sound;
        sound.setPitch(-1, -1, 'default');
      }
    } else {
      this.set('displayText', this.get('value'));
    }
    Action.prototype.initialize.apply(this);
  },
  execute: function() {
    var sound = this.get('parent').sound;
    sound.setPitch(this.get('value'), this.get('duration'));
    Action.prototype.execute.apply(this);
  }
});

module.exports = {
  Volume: VolumeModel,
  Chord: ChordModel,
  Pitch: PitchModel
};
