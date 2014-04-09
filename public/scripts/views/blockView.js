var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var tpl = require('../templates/block.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  events: {
  },

  el: '#currentBlock',

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  render: function() {
    var self = this;
    console.log('rendering to: ', self.$el);
    dust.render('block', self.model.attributes, function(err, out) {
      if (err) console.log(err);
      self.$el.html(out);
      self.setColor();
    });
  },

  setColor: function(color) {
    if (!color) color = this.model.get('color');
    this.$el.css('background-color', color);
  },

  makeOld: function() {
    this.setElement(Backbone.$('#oldBlock'));
    this.render();
  }
});
