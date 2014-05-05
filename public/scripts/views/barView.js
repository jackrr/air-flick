var $ = require('jquery')(window);
var Backbone = require('backbone');
var _ = require('underscore');
Backbone.$ = $;

var tpl = require('../templates/bar.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({

  el: '#bars',

  initialize: function() {
    this.listenTo(this.model, 'change:count', this.resize);
  },

  dom: function() {
    return this.$el.children('#bar'+this.model.cid);
  },

  barCount: function(count) {
    this.dom().css({
      'margin-left': Math.floor(20/count)+"%",
      'width': Math.floor(80/count)+"%"
    });
  },

  resize: function() {
    this.dom().children('.scale').height(this.model.get('count') * 15);
  },

  setColor: function(color) {
    if (!color) color = this.model.get('color');
    this.dom().children('.scale').css('background-color', '#'+color);
  },

  render: function() {
    var self = this;
    dust.render('bar', _.extend({cid: self.model.cid}, self.model.attributes), function(err, out) {
      if (err) console.log(err);
      self.$el.append(out);
      self.setColor();
    });
  }
});
