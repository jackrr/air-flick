var $ = require('jquery')(window);
var Backbone = require('backbone');

var BlockView = require('../views/blockView.js');
var Sound = require('./soundModel.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({
  initialize: function() {
    //this.sound = new Sound({color: this.get('color')});
    this.view = new BlockView({model: this});
    this.view.render();
  },

  playSound: function(time) {
    if (time) {
      this.sound.playOnce(time);
    } else {
      this.sound.play();
    }
  },

  stopSound: function() {
    this.sound.stop();
  },

  sendBack: function() {
    this.stopSound();
    this.view.makeOld();
  },

  makePrimary: function() {
    this.playSound();
    this.view.makePrimary();
  },

  remove: function() {
    this.view.makeOld();
  },

  forServer: function() {
    return this.attributes;
  }
});
