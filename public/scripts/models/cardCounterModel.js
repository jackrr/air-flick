var $ = require('jquery')(window);
var Backbone = require('backbone');
var CardCountView = require("../views/cardCountView.js");
var Block = require("./blockModel.js");

Backbone.$ = $;

module.exports = Backbone.Model.extend({

  initialize: function() {
    this.set('count', 0);

    this.view = new CardCountView({model: this});
    this.view.render();
  },

  inc: function() {
    this.set('count', this.get('count') + 1);
  },

  dec: function() {
    this.set('count', this.get('count') - 1);
  }
});
