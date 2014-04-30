var $ = require('jquery')(window);
var Backbone = require('backbone');

var BlockView = require('../views/blockView.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({
  initialize: function() {
    this.view = new BlockView({model: this});
    this.view.render();
  },

  makeOld: function() {
    this.view.makeOld();
  },

  forServer: function() {
    return this.attributes;
  }
});
