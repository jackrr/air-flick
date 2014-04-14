var id = 0;

function Display(socket, direction) {
  this.socket = socket;
  this.direction = direction;
  this.id = ++id; // fix to avoid num rollover weirdness (or is it going to be NaN?)
}

Display.prototype.position = function() {
  this.position = true;
}

Display.prototype.positioned = function() {
  return this.position || false;
}

Display.prototype.send = function(event, data) {
  this.socket.emit(event, data);
}

Display.prototype.sendBlock = function(data) {
  this.lastBlock = data.block;
  this.socket.emit('display:block', data);
};

Display.prototype.currentColor = function() {
  return this.lastBlock.color;
};

module.exports = Display;
