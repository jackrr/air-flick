var $ = require('jquery')(window);
var Backbone = require('backbone');
var _ = require('underscore');
Backbone.$ = $;

var tpl = require('../templates/logInstance.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  events: {
    "click .close": "remove"
  },

  el: '#logInstances',

  domID: function() {
    return '#logInstance'+this.model.cid;
  },

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  remove: function() {
    this.$el.children(this.domID()).remove();
    this.model.remove();
  },

  hide: function() {
    this.$el.children(this.domID()).hide();
  },

  render: function() {
    var self = this;
    dust.render('logInstance', _.extend({cid: self.model.cid}, self.model.attributes), function(err, out) {
      if (err) console.log(err);
      self.$el.append(out);
    });
  }
});
