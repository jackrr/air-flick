var Queue = require('./queue.js');
var Sound = require('../models/soundModel.js');
var Actions = require('../models/actionModel.js');
var SineView = require('../views/sineView.js');
var ActionView = require('../views/actionView.js');
var Volume = Actions.Volume;
var Chord = Actions.Chord;
var Pitch = Actions.Pitch;

var Manager = function() {
  this.vols = new Queue();
  this.pitches = new Queue();
  this.chords = new Queue();
  this.sound = new Sound({'freq': 440, 'magnitude': .5});
  this.current = {};
  this.defaults = {
    vol: new Volume({parent: this, default: true}),
    chord: new Chord({parent: this, default: true}),
    pitch: new Pitch({parent: this, default: true}),
  };

  this.plainSine = new SineView({el: '#plain'});
  this.volSine = new SineView({model: this.defaults.vol, el: '#vol'});
  this.chordSine = new SineView({model: this.defaults.chord, el: '#chord'});
  this.pitchSine = new SineView({model: this.defaults.pitch, el: '#pitch'});

  this.views = {
    vol: new ActionView({el: '#vol .action', model: this.defaults.vol}),
    pitch: new ActionView({el: '#pitch .action', model: this.defaults.pitch}),
    chord: new ActionView({el: '#chord .action', model: this.defaults.chord})
  }

  this.startPlaying();
};

Manager.prototype.addAction = function(action) {
  switch (action.type) {
    case 'volume':
      vol = new Volume({parent: this, duration: action.duration, value: action.value});
      if (this.current.vol) {
        this.vols.enqueue(vol);
      } else {
        this.execute(vol);
      }
      break;
    case 'pitch':
      pitch = new Pitch({parent: this, duration: action.duration, value: action.value});
      if (this.current.pitch) {
        this.pitches.enqueue(pitch);
      } else {
        this.execute(pitch);
      }
      break;
    case 'chord':
      chord = new Chord({parent: this, duration: action.duration, value: action.value});
      if (this.current.chord) {
        this.chords.enqueue(chord);
      } else {
        this.execute(chord);
      }
      break;
  }
};

Manager.prototype.nextAction = function(type) {
  switch (type) {
    case 'volume':
      if (this.vols.isEmpty()) {
        this.executeVol(this.defaults.vol);
      } else {
        this.executeVol(this.vols.dequeue());
      }
      break;
    case 'pitch':
      if (this.pitches.isEmpty()) {
        this.executePitch(this.defaults.pitch);
      } else {
        this.executePitch(this.pitches.dequeue());
      }
      break;
    case 'chord':
      if (this.chords.isEmpty()) {
        this.executeChord(this.defaults.chord);
      } else {
        this.executeChord(this.chords.dequeue());
      }
      break;
  }
};

Manager.prototype.startPlaying = function() {
  this.sound.play();
};

Manager.prototype.stopPlaying = function() {
  this.sound.stop();
};

Manager.prototype.executeVol = function(vol) {
  this.current.vol = vol;
  this.views.vol.setModel(vol);
  vol.execute();
  this.volSine.model = vol;
};
Manager.prototype.executePitch = function(p) {
  this.current.pitch = p;
  this.views.pitch.setModel(p);
  p.execute();
  this.pitchSine.model = p;
};
Manager.prototype.executeChord = function(c) {
  this.current.chord = c;
  this.views.chord.setModel(c);
  c.execute();
  this.chordSine.model = c;
};

module.exports = Manager;
