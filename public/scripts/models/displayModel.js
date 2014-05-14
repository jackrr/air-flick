var $ = require('jquery')(window);
var Backbone = require('backbone');
var DisplayView = require("../views/displayView.js");
var ActionManager = require("../modules/actionManager.js");

Backbone.$ = $;

module.exports = Backbone.Model.extend({

  initialize: function() {
    var self = this;

    this.view = new DisplayView({model: this});
    this.view.render();


    var socket = this.get('socket');

    this.actions = new ActionManager();

    // *** comment out for production:
    // console.log('starting run in 3 seconds');
    // setTimeout(function() {
      // self.view.allPositioned();
      // self.actions = new ActionManager();
    // }, 3000);



    socket.on('display:sendAction', function(data) {
      self.addAction(data.action, data.device);
    });

    socket.on('display:positioningStart', function() {
      self.view.silence();
    });

    socket.on('display:position', function() {
      self.view.ident();
    });

    socket.on('display:positioningDone', function() {
      self.view.silence();
    });

    socket.on('display:allPositioningDone', function() {
      self.view.allPositioned();
      self.actions = new ActionManager();
    });
  },

  addAction: function(action, sender) {
    switch (action.type) {
      case 'start':
        self.actions.startPlaying();
        break;
      case 'stop':
        self.actions.stopPlaying();
        break;
      default:
        self.actions.addAction(action);
    }
  }
});
