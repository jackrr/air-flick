var $ = require('jquery')(window);
var Backbone = require('backbone');
var DisplayView = require("../views/displayView.js");

Backbone.$ = $;

module.exports = Backbone.Model.extend({

  initialize: function() {
    var self = this;

    this.view = new DisplayView({model: this});
    this.view.render();

    this.socket.on('display:')
  }
});
