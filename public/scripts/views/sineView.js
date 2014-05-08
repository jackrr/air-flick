var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var tpl = require('../templates/sine.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  initialize: function() {
    if (this.model) this.listenTo(this.model, 'change', this.modified);
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

  modified: function() {
    var $canvas = this.$el.find(".sine");
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
    this.animate();
  },

  animate: function() {
    var context = this.context;
    var config = context.stash;

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    function drawWave(t) {
      context.clearRect(0,0, config.width, config.height);

      var x = t;
      var y = Math.sin(x) * config.xAxis;
      context.beginPath();
      context.moveTo(config.yAxis, y + config.xAxis);

      for (var i = config.yAxis; i <= config.width; i += 10) {
        x = t + (i/100);
        y = Math.sin(x) * config.xAxis;
        context.lineTo(i, y+config.xAxis);
      }

      context.stroke();

      this.timeout = setTimeout(function() {drawWave(t+.2)}, 130);
    }
    drawWave(0);
  }
});
