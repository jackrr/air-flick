var $ = require('jquery')(window);
var Backbone = require('backbone');
var DisplayView = require("../views/displayView.js");
var Block = require("./blockModel.js");

Backbone.$ = $;

module.exports = Backbone.Model.extend({

  initialize: function() {
    var self = this;

    this.view = new DisplayView({model: this});
    this.view.render();

    this.get('socket').on('display:block', function(data) {
      if (self.block) {
        self.oldBlock = self.block;
        self.oldBlock.makeOld();
      }
      self.block = new Block({ display: self, color: data.block.color, device: data.device});
    });
  }
});
