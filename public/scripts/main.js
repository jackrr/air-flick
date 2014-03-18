var RoutesIndex = require('./routes/index.js');

var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;

$(function(){
  new RoutesIndex();
  Backbone.history.start({pushState: true});
});
