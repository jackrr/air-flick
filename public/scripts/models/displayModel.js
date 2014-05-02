var $ = require('jquery')(window);
var Backbone = require('backbone');
var DisplayView = require("../views/displayView.js");
var CardCounter = require("../models/cardCounterModel.js");
var Block = require("./blockModel.js");
var Manager = require("../modules/blockManager.js");

Backbone.$ = $;

module.exports = Backbone.Model.extend({

  initialize: function() {
    var self = this;
    this.set('cardCount', 1);

    this.view = new DisplayView({model: this});
    this.view.render();

    this.cardCounter = new CardCounter();

    this.blocks = new Manager();

    var socket = this.get('socket');

    socket.on('display:sendBlock', function(data) {
      self.addBlock(data.block, data.device);
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

    socket.on('display:allPositioningDone', function() {
      self.view.allPositioned();
    });
  },

  addBlock: function(block, sender) {
    var block = new Block({display: self, color: block.color, device: sender});
    this.blocks.addBlock(block)
  },

  removeBlock: function() {
    if (this.blocks.blockCount == 0) return {};
    return this.blocks.removeBlock();
  }
});
