var id = 0;

function Display(socket) {
  this.socket = socket;
  this.id = ++id; // fix to avoid num rollover weirdness (or is it going to be NaN?)
}

Display.prototype.position = function() {
  this.position = true;
}

Display.prototype.positioned = function() {
  return this.position || false;
}

module.exports = Display;