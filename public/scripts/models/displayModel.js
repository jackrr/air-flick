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

    this.get('socket').on('display:block', function(data) {
      if (self.block) {
        self.oldBlock = self.block;
        self.oldBlock.makeOld();
      }
      self.block = new Block({ display: self, color: data.block.color, device: data.device});
      self.cardCounter.inc();
    });
  }
});
