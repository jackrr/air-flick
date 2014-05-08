var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var tpl = require('../templates/action.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
    this.render();
  },

  render: function() {
    var self = this;
    dust.render('action', self.model.attributes, function(err, out) {
      if (err) console.log(err);
      self.$el.html(out);
      self.drawSpout();
      var $canvas = self.$el.find("canvas.shape");
      var canvas = $canvas[0];
      self.context = canvas.getContext('2d');
      self.context.stash = {};
      self.context.stash.height = $canvas.height();
      self.context.stash.width = $canvas.width();
      self.drawShape();
    });
  },

  drawSpout: function() {
    var $canvas = this.$el.find(".spout");
    var canvas = $canvas[0];
    var context = canvas.getContext('2d');

    // draw the background stuff
  },

  drawShape: function() {
    var func;
    var self = this;
    switch (this.model.get('type')) {
      case 'volume':
        func = this.drawCircle;
        break;
      case 'pitch':
        func = this.drawDiamond;
        break;
      case 'chord':
        func = this.drawSquare;
        break;
      default:
        console.log('oops', this);
    }

    var time = this.model.get('duration');
    if (time) {
      var inc = time;
      function draw() {
        func.apply(self,[inc/time]);
        inc = inc-100;
        if (inc > 0) setTimeout(draw, 100);
      }
    } else {
      func.apply(self,[-1]);
    }
  },

  drawCircle: function(ratio) {
    console.log('drawing circle', ratio);
    this.context.fillStyle = "#0000FF";
    if (ratio == -1) {
      this.context.fillStyle = "#BBBBBB";
      ratio = 1;
    }
    this.context.arc(this.context.stash.width/2, this.context.stash.height/2, ratio*this.context.stash.height/2, 0, 2*Math.PI, false);
    this.context.fill();
  },

  drawSquare: function(ratio) {
    console.log('drawing square', ratio);
    this.context.fillStyle = "#00FF00";
    if (ratio == -1) {
      this.context.fillStyle = "#BBBBBB";
      ratio = 1;
    }
    var hMiddle = this.context.stash.width/2;
    var vMiddle = this.context.stash.height/2;
    this.context.fillRect(hMiddle - (ratio*hMiddle), vMiddle - (ratio*vMiddle), ratio * 2 * hMiddle, ratio * 2 * vMiddle);
  },

  drawDiamond: function(ratio) {
    console.log('drawing diamond', ratio);
    this.context.fillStyle = "#FF00FF";
    if (ratio == -1) {
      this.context.fillStyle = "#BBBBBB";
      ratio = 1;
    }
    var hMiddle = this.context.stash.width/2;
    var vMiddle = this.context.stash.height/2;
    this.context.beginPath();
    this.context.moveTo(hMiddle - (ratio * hMiddle), vMiddle);
    this.context.lineTo(hMiddle, vMiddle - (ratio * vMiddle));
    this.context.lineTo(hMiddle + (ratio * hMiddle), vMiddle);
    this.context.lineTo(hMiddle, vMiddle + (ratio * vMiddle));
    this.context.fill();
  }

});
