var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var tpl = require('../templates/sine.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  initialize: function() {
    this.stopped = true;
    this.render();
  },

  render: function() {
    var self = this;
    dust.render('sine', {}, function(err, out) {
      if (err) console.log(err);
      self.$el.html(out);
      self.modified();
    });
  },

  stop: function() {
    this.stopped = true;
    this.modified();
  },

  start: function() {
    this.stopped = false;
    this.modified();
  },

  changeWave: function(options) {
    this.animate(options);
  },

  modified: function() {
    var $canvas = this.$el.find(".sine");
    $canvas.attr('width', this.$el.width() - 100);
    var canvas = $canvas[0];
    var context = canvas.getContext('2d');
    context.strokeStyle = "#000000";
    context.lineJoin = 'round';
    context.lineWidth = 2;

    context.stash = {};
    context.save();
    context.stash.height = $canvas.height();
    context.stash.width = $canvas.width();
    context.stash.xAxis = context.stash.height/2;
    context.stash.yAxis = 0;
    this.context = context;
    if (this.stopped) {
      this.flatLine();
    } else {
      this.animate();
    }
  },

  flatLine: function() {
    var context = this.context;
    var config = context.stash;
    context.clearRect(0,0, config.width, config.height);
    context.beginPath();
    context.moveTo(config.yAxis, config.xAxis);
    context.lineTo(config.width, config.xAxis);
    context.stroke();
  },

  animate: function(options) {
    options = options || {};
    if (!options.color) options.color = "#000000";
    if (!options.freq) options.freq = 523;
    if (!options.mag) options.mag = 0.5;

    var context = this.context;
    var config = context.stash;
    var self = this;
    clearTimeout(this.timeout);

    context.strokeStyle = options.color;
    function drawWave(t) {
      context.clearRect(0,0, config.width, config.height);

      var x = t;
      var y = options.mag * (Math.sin(4*x) * config.xAxis);
      context.beginPath();
      context.moveTo(config.yAxis+2, y + config.xAxis);

      for (var i = config.yAxis+2; i <= config.width; i += 4) {
        x = (options.freq/523) * (t + (i/100));
        y = options.mag * (Math.sin(4*x) * config.xAxis);
        context.lineTo(i, y+config.xAxis);
      }

      context.stroke();

      self.timeout = setTimeout(function() {drawWave(t+.4)}, 30);
    }
    drawWave(0);
  }
});
