var $ = require('jquery')(window);
var Backbone = require('backbone');
var BarView = require('../views/barView.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({

  initialize: function() {
    this.blocks = [];
    this.view = new BarView({model: this});
    this.view.render();
  },

  addBlock: function(block) {
    this.blocks.push(block);
    this.set('count', this.blocks.length);
  },

  barCount: function(count) {
    this.view.barCount(count);
  },

  popBlock: function() {
    if (this.blocks.length == 0) return {};
    var block = this.blocks.pop();
    this.view.render();
    return block;
  }
});
