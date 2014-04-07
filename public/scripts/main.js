var RoutesIndex = require('./routes/index.js');

var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;

$(function(){
  var router = new RoutesIndex();
  Backbone.history.start();
  router.newRoom();
});
