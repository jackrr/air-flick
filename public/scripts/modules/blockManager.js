var Sound = require('../models/soundModel.js');
var Block = require('../models/blockModel.js');
var Bar = require('../models/barModel.js');

var Manager = function() {
  this.blockCount = 0;
  this.blocks = {};
  this.bars = {};
  this.barCount = 0;
  this.largest = '';
  this.smallSound = new Sound({type: 'short'});
  this.longSound = new Sound({type: 'long'});
};

Manager.prototype.addBlock = function(block) {
  var color = block.color;
  if (!this.blocks[color]) {
    this.blocks[color] = [];
    this.bars[color] = new Bar({color: color, count: 0});
    this.barCount++;

    for (var key in this.bars) this.bars[key].barCount(this.barCount);
  }
  this.blocks[color].push(block);
  this.bars[color].addBlock(block);
  this.updateLargest();
  
  this.smallSound.set('color', color);

  if (this.largest == color) {
    if (this.current) this.current.remove();
    var block = new Block({color: color});
    this.longSound.set('color', color);
    this.current = block;
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

  var color = this.current.get('color');
  var block = this.blocks[color].pop();
  this.bars[color].popBlock();

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
