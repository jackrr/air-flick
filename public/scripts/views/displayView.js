var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var dust = require('../dust-core.min.js');
var tpl = require('../templates/display.js');

module.exports = Backbone.View.extend({
  el: '#display',

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  render: function() {
    var self = this;
    dust.render('display', self.model.attributes, function(err, out) {
      if (err) console.log(err);
      self.$el.html(out);
    });
  },

  silence: function() {
    this.render();
    this.$el.css('background-color', '#000000');
  },

  ident: function() {
    this.render();
    this.$el.css('background-color', '#ffffff');
    this.$el.append('<div class="attn">LOOK AT ME</div>');
  },

  allPositioned: function() {
    this.render();
    this.$el.css('background-color', '');
  }
});
