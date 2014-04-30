var $ = require('jquery')(window);
var Backbone = require('backbone');

var LoggerView = require('../views/loggerView.js');
var LogInstance = require('./logInstance.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({
  initialize: function() {
    this.view = new LoggerView({model: this});
    this.view.render();
    this.logs = [];

    var socket = this.get('socket');
    var self = this;

    socket.on('rooms:notification', function (data) {
      self.logs.push(new LogInstance({ logger: self, message: data.message }));
    });
  },

  removeLog: function(logID) {
    newlogs = [];
    this.logs.map(function(log) {
      if (log.cid != logID) {
        newlogs.push(log);
      }
    });
    this.logs = newlogs;
  }

});
