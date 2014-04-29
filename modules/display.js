var uuid = require('node-uuid');
var id = 0;

function Display(socket) {
  this.socket = socket;
  this.id = uuid.v1(); // fix to avoid num rollover weirdness (or is it going to be NaN?)
  
  this.toJSON = function() {
    return {
      id: this.id
    }
  }

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
  this.currentBlock = data.block;
  this.socket.emit('display:sendBlock', data);
};

Display.prototype.removeBlock = function(callback) {
  var self = this;
  this.socket.emit('display:removeBlock');
  this.socket.on('rooms:blockRemoved', function(data) {
    self.socket.removeAllListeners('rooms:blockRemoved');
    self.currentBlock = data.currentBlock;
    callback(data.removedBlock);
  });
};

Display.prototype.blockRemoved = function(data) {
  this.currentBlock = data.currentBlock;
  
};

Display.prototype.currentColor = function() {
  return this.lastBlock.color;
};

module.exports = Display;
