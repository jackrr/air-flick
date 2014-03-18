var tpl = require('../templates/display.js');
var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

module.exports = Backbone.View.extend({
  el: 'body',
  template: tpl,


  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  render: function() {
    dust.render(this.template, this.model.attributes, function(err, out) {
      if (err) console.log(err);
      this.$el.html(out);
    });
  }
});
