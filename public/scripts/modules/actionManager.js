var Queue = require('./queue.js');
var Sound = require('../models/soundModel.js');
var Actions = require('../models/actionModel.js');
var SineView = require('../views/sineView.js');
var ActionView = require('../views/actionView.js');
// var testModule = require('./testModule.js'); // comment out for production
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
  this.volSine = new SineView({el: '#vol'});
  this.chordSine = new SineView({el: '#chord'});
  this.pitchSine = new SineView({el: '#pitch'});

  this.views = {
    vol: new ActionView({el: '#vol .action', model: this.defaults.vol}),
    pitch: new ActionView({el: '#pitch .action', model: this.defaults.pitch}),
    chord: new ActionView({el: '#chord .action', model: this.defaults.chord})
  }

  this.startPlaying();

  // testModule.runTests(this); // comment out for production
};

Manager.prototype.addAction = function(action) {
  switch (action.type) {
    case 'volume':
      vol = new Volume({parent: this, duration: action.duration, value: action.value});
      if (this.current.vol) {
        this.vols.enqueue(vol);
      } else {
        this.executeVol(vol);
      }
      break;
    case 'pitch':
      pitch = new Pitch({parent: this, duration: action.duration, value: action.value});
      if (this.current.pitch) {
        this.pitches.enqueue(pitch);
      } else {
        this.executePitch(pitch);
      }
      break;
    case 'chord':
      chord = new Chord({parent: this, duration: action.duration, value: action.value});
      if (this.current.chord) {
        this.chords.enqueue(chord);
      } else {
        this.executeChord(chord);
      }
      break;
  }
};

Manager.prototype.nextAction = function(type) {
  switch (type) {
    case 'volume':
      if (this.vols.isEmpty()) {
        this.executeVol(this.defaults.vol, true);
      } else {
        this.executeVol(this.vols.dequeue());
      }
      break;
    case 'pitch':
      if (this.pitches.isEmpty()) {
        this.executePitch(this.defaults.pitch, true);
      } else {
        this.executePitch(this.pitches.dequeue());
      }
      break;
    case 'chord':
      if (this.chords.isEmpty()) {
        this.executeChord(this.defaults.chord, true);
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

Manager.prototype.executeChord = function(c, def) {
  this.views.chord.setModel(c);
  c.execute();
  if (def) {
    delete this.current.chord;
    this.chordSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude')});
  } else {
    this.current.chord = c;
    // this is going to be complex
    this.chordSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude'), color: "#00FF00"});
  }
  this.chordSine.setModel(c);
};

Manager.prototype.executeVol = function(vol, def) {
  vol.execute();
  if (def) {
    delete this.current.vol;
    this.volSine.animate({freq: this.sound.get('freq')});
  } else {
    this.current.vol = vol;
    this.volSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude'), color: "#0000FF"});
  }
  if (this.current.chord) {
    // this is going to be complex
    this.chordSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude'), color: "#00FF00"});
  } else {
    this.chordSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude')});
  }
  this.views.vol.setModel(vol);
};

Manager.prototype.executePitch = function(p, def) {
  p.execute();
  if (def) {
    delete this.current.pitch;
    this.pitchSine.animate();
  } else {
    this.current.pitch = p;
    this.pitchSine.animate({freq: this.sound.get('freq'), color: "#FF00FF"});
  }
  if (this.current.vol) {
    this.volSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude'), color: "#0000FF"});
  } else {
    this.volSine.animate({freq: this.sound.get('freq')});
  }
  if (this.current.chord) {
    // this is going to be complex
    this.chordSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude'), color: "#00FF00"});
  } else {
    this.chordSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude')});
  }
  this.views.pitch.setModel(p);
};

module.exports = Manager;
