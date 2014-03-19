var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var dust = require('../dust-core.min.js');
var tpl = require('../templates/display.js');

module.exports = Backbone.View.extend({
  el: 'body',

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  render: function() {
    var self = this;
    dust.render('display', this.model.attributes, function(err, out) {
      if (err) console.log(err);
      self.$el.html(out);
    });
  }
});
