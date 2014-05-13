var $ = require('jquery')(window);
var Backbone = require('backbone');
var View = require('../views/queueActionView.js');
var Queue = require('../modules/queue.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({

  initialize: function() {
    this.queue = new Queue();
    this.views = new Queue();
  },

  enqueue: function(action) {
    this.views.enqueue(new View({model: action, type: this.get('type'), el: '#' + this.get('type') + ' .actionQueue'}));
    return this.queue.enqueue(action);
  },

  dequeue: function() {
    this.views.dequeue().remove();
    return this.queue.dequeue();
  },

  isEmpty: function() {
    return this.queue.isEmpty();
  },

  peek: function() {
    return this.queue.peek();
  }

});
