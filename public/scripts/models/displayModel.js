var $ = require('jquery')(window);
var Backbone = require('backbone');
var DisplayView = require("../views/displayView.js");
var CardCounter = require("../models/cardCounterModel.js");
var Block = require("./blockModel.js");

Backbone.$ = $;

module.exports = Backbone.Model.extend({

  initialize: function() {
    var self = this;
    this.set('cardCount', 1);

    this.view = new DisplayView({model: this});
    this.view.render();

    this.cardCounter = new CardCounter();

    this.blockStack = [];

    var socket = this.get('socket');

    socket.on('display:block', function(data) {
      self.addBlock(data.block, data.device);
      self.block = new Block({ display: self, color: data.block.color, device: data.device});
    });

    socket.on('display:removeBlock', function() {
      var data = self.removeBlock();

      socket.emit('rooms:blockRemoved', {
        removedBlock: data.removedBlock.forServer(),
        currentBlock: data.currentBlock.forServer()
      });
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
  },

  addBlock: function(block, sender) {
    var blocks = this.blockStack;
    if (blocks.length > 0) blocks[blocks.length - 1].makeOld();

    blocks.push(new Block({display: self, color: block.color, device: sender}));
    this.cardCounter.inc();
  },

  removeBlock: function() {
    var blocks = this.blockStack;
    if (blocks.length == 0) return {};

    this.cardCounter.dec();
    return {
      removedBlock: blocks.pop(),
      currentBlock: blocks[blocks.length - 1]
    };
  }
});
