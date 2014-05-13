var Sound = require('../models/soundModel.js');
var Actions = require('../models/actionModel.js');
var ActionQueue = require('../models/actionQueueModel.js');
var SineView = require('../views/sineView.js');
var ActionView = require('../views/actionView.js');
// var testModule = require('./testModule.js'); // comment out for production
var Volume = Actions.Volume;
var Chord = Actions.Chord;
var Pitch = Actions.Pitch;

var Manager = function() {
  this.vols = new ActionQueue({type: 'vol'});
  this.pitches = new ActionQueue({type: 'pitch'});
  this.chords = new ActionQueue({type: 'chord'});

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
  var self = this;
  switch (type) {
    case 'volume':
      if (this.vols.isEmpty()) {
        setTimeout(function() {self.executeVol(self.defaults.vol, true);}, 2000);
      } else {
        var next = this.vols.dequeue();
        setTimeout(function() {self.executeVol(next);}, 2000);
      }
      break;
    case 'pitch':
      if (this.pitches.isEmpty()) {
        setTimeout(function() {self.executePitch(self.defaults.pitch, true);}, 2000);
      } else {
        var next = this.pitches.dequeue();
        setTimeout(function() {self.executePitch(next);}, 2000);
      }
      break;
    case 'chord':
      if (this.chords.isEmpty()) {
        setTimeout(function() {self.executeChord(self.defaults.chord, true);}, 2000);
      } else {
        var next = this.chords.dequeue();
        setTimeout(function() {self.executeChord(next);}, 2000);
      }
      break;
  }
};

Manager.prototype.startPlaying = function() {
  this.plainSine.start();
  this.volSine.start();
  this.chordSine.start();
  this.pitchSine.start();

  this.sound.play();
};

Manager.prototype.stopPlaying = function() {
  this.sound.stop();
};

Manager.prototype.executeChord = function(c, def) {
  c.execute();
  if (def) {
    delete this.current.chord;
    this.chordSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude')});
  } else {
    this.current.chord = c;
    this.chordSine.animateChord({freqs: this.sound.get('freqs'), mag: this.sound.get('magnitude'), color: "#00FF00"});
  }
  this.views.chord.setModel(c);
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
    this.chordSine.animateChord({freqs: this.sound.get('freqs'), mag: this.sound.get('magnitude'), color: "#00FF00"});
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
    this.chordSine.animateChord({freqs: this.sound.get('freqs'), mag: this.sound.get('magnitude'), color: "#00FF00"});
  } else {
    this.chordSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude')});
  }
  this.views.pitch.setModel(p);
};

module.exports = Manager;
