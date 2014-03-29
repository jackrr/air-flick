var $ = require('jquery')(window);
var Backbone = require('backbone');
var DisplayView = require("../views/displayView.js");

Backbone.$ = $;

module.exports = Backbone.Model.extend({

  initialize: function() {
    var self = this;
    this.socket.on("rooms:joinSuccess", function(response) {
      self.set("message", response.message);
    });

    this.view = new DisplayView({model: this});
  }
});
