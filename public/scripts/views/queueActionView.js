var $ = require('jquery')(window);
var Backbone = require('backbone');
var _ = require('underscore');
Backbone.$ = $;

var tpl = require('../templates/queueAction.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  initialize: function() {
    switch (this.model.get('type')) {
      case 'volume':
        this.drawShape = this.drawCircle;
        break;
      case 'pitch':
        this.drawShape = this.drawDiamond;
        break;
      case 'chord':
        this.drawShape = this.drawSquare;
        break;
      default:
        console.log('bad action type', this);
    }
    this.render();
  },

  render: function() {
    var self = this;
    dust.render('queueAction', _.extend({cid: this.model.cid}, this.model.attributes), function(err, out) {
      if (err) console.log(err);
      self.$el.append(out);
      var $canvas = self.$el.children('#queueAction_'+self.model.cid).find("canvas");
      var canvas = $canvas[0];
      if (!canvas) return;
      self.context = canvas.getContext('2d');
      self.context.stash = {};
      self.context.stash.height = $canvas.height();
      self.context.stash.width = $canvas.width();
      self.drawShape();
    });
  },

  remove: function() {
    //this.clearShape();
    this.slideRemove();
  },

  clearShape: function() {
    this.context.clearRect(0,0,this.context.stash.width,this.context.stash.height);
  },

  slideRemove: function() {
    var $self = this.$el.children('#queueAction_'+this.model.cid) ;
    $self.animate({top: -220}, 2000, function() {
      $self.remove();
    });
  },

  drawCircle: function() {
    var ratio = 1;
    this.context.clearRect(0,0,this.context.stash.width,this.context.stash.height);
    this.context.fillStyle = "#0000FF";
    this.context.beginPath();
    this.context.arc(this.context.stash.width/2, this.context.stash.height/2, ratio*this.context.stash.height/2, 0, 2*Math.PI);
    this.context.fill();
  },

  drawSquare: function() {
    var ratio = 1;
    this.context.clearRect(0,0,this.context.stash.width,this.context.stash.height);
    this.context.fillStyle = "#00FF00";
    this.context.beginPath();
    var hMiddle = this.context.stash.width/2;
    var vMiddle = this.context.stash.height/2;
    this.context.fillRect(hMiddle - (ratio*hMiddle), vMiddle - (ratio*vMiddle), ratio * 2 * hMiddle, ratio * 2 * vMiddle);
  },

  drawDiamond: function(ratio) {
    var ratio = 1;
    this.context.clearRect(0,0,this.context.stash.width,this.context.stash.height);
    this.context.fillStyle = "#FF00FF";
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
