var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var tpl = require('../templates/action.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
    this.listenTo(this.model.get('parent').sound, 'change:magnitude', this.drawSpout);
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
    var width = $canvas.width();
    var height = $canvas.height();
    var canvas = $canvas[0];
    var context = canvas.getContext('2d');

    var type = this.model.get('type');
    var lheight, rheight;
    var mag = this.model.get('parent').sound.get('magnitude');
    if (type == 'chord') {
      lheight = height*mag;
      rheight = this.model.get('default') ? height * mag : height;
    } else if (type == 'volume') {
      lheight = height*0.5;
      rheight = height*mag;
    } else {
      lheight = height*0.5;
      rheight = height*0.5;
    }

    var skipl = (height-lheight)/2;
    var skipr = (height-rheight)/2;

    context.clearRect(0,0,width,height);
    context.fillStyle = "#000000";
    // left triangle
    context.beginPath();
    context.moveTo(0, skipl);
    context.lineTo(width/2, height/2);
    context.lineTo(0, skipl+lheight);
    context.fill();

    // right triangle
    context.beginPath();
    context.moveTo(width, skipr);
    context.lineTo(width/2, height/2);
    context.lineTo(width, skipr+rheight);
    context.fill();
  },

  setModel: function(model) {
    this.model = model;
    this.render();
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
    var shrink = 0.9;
    if (time) {
      var inc = time;
      function draw() {
        if (inc > 15000) {
          func.apply(self,[shrink*1]); // just sit at max size until small enough to start shrinking
        } else {
          func.apply(self,[shrink*inc/15000]);
        }
        inc = inc-100;
        if (inc > 0) self.timeout = setTimeout(draw, 100);
      }
      draw();
    } else {
      clearTimeout(this.timeout);
      func.apply(this,[-1]);
    }
  },

  drawCircle: function(ratio) {
    this.context.clearRect(0,0,this.context.stash.width,this.context.stash.height);
    this.context.fillStyle = "#0000FF";
    if (ratio == -1) {
      this.context.fillStyle = "#BBBBBB";
      ratio = 0.5;
    }
    this.context.beginPath();
    this.context.arc(this.context.stash.width/2, this.context.stash.height/2, ratio*this.context.stash.height/2, 0, 2*Math.PI);
    this.context.fill();
  },

  drawSquare: function(ratio) {
    this.context.clearRect(0,0,this.context.stash.width,this.context.stash.height);
    this.context.fillStyle = "#00FF00";
    if (ratio == -1) {
      this.context.fillStyle = "#BBBBBB";
      ratio = 0.5;
    }
    this.context.beginPath();
    var hMiddle = this.context.stash.width/2;
    var vMiddle = this.context.stash.height/2;
    this.context.fillRect(hMiddle - (ratio*hMiddle), vMiddle - (ratio*vMiddle), ratio * 2 * hMiddle, ratio * 2 * vMiddle);
  },

  drawDiamond: function(ratio) {
    this.context.clearRect(0,0,this.context.stash.width,this.context.stash.height);
    this.context.fillStyle = "#FF00FF";
    if (ratio == -1) {
      this.context.fillStyle = "#BBBBBB";
      ratio = 0.5;
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
