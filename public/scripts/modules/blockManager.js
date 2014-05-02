var Manager = function() {
  this.blockCount = 0;
  this.blocks = {};
  this.largest = '';
};

Manager.prototype.addBlock = function(block) {
  var color = block.get('color');
  if (!this.blocks[color]) this.blocks[color] = [];
  this.blocks[color].push(block);
  this.updateLargest();
  
  block.playSound(1);

  if (this.largest == color) {
    if (this.current) this.current.sendBack();
    this.current = block;
    this.current.makePrimary();
  }

  this.blockCount++;
};

Manager.prototype.updateLargest = function() {
  var max = -1;
  for (var key in this.blocks) {
    if (this.blocks[key].length > max) {
      max = this.blocks[key].length;
      this.largest = key;
    }
  }
};

Manager.prototype.removeBlock = function() {
  if (!this.current) return {};

  var block = this.blocks[this.current.get('color')].pop();
  this.updateLargest();

  var large = this.blocks[this.largest];
  this.current = large[large.length-1];

  block.sendBack();
  this.current.makePrimary();

  this.blockCount--;
  return {
    removedBlock: block,
    currentBlock: this.current
  };
};

module.exports = Manager;
