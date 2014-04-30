var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var tpl = require('../templates/logger.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  events: {
  },
  el: '#log',

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  hide: function() {
    Backbone.$(this.$el).hide();
  },

  render: function() {
    var self = this;
    dust.render('logger', self.model.attributes, function(err, out) {
      if (err) console.log(err);
      self.$el.html(out);
    });
  }
});
