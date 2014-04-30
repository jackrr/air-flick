var $ = require('jquery')(window);
var Backbone = require('backbone');

var LogInsView = require('../views/logInstanceView.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({
  initialize: function() {
    this.view = new LogInsView({model: this});
    this.view.render();
  },

  remove: function() {
    this.get('logger').removeLog(this.cid);
  }
});
