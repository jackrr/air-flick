


var actions = [{
    type: 'volume',
    duration: '10000',
    value: '1.8'
  }, {
    type: 'volume',
    duration: '10000',
    value: '1.2'
  }, {
    type: 'volume',
    duration: '10000',
    value: '0.2'
  }, {
    type: 'chord',
    duration: '10000',
    value: 'maj'
  }, {
    type: 'pitch',
    duration: '10000',
    value: 'D'
  }, {
    type: 'pitch',
    duration: '10000',
    value: 'E'
  }, {
    type: 'pitch',
    duration: '10000',
    value: 'F'
  }, {
    type: 'volume',
    duration: '10000',
    value: '0.2'
  }, {
    type: 'volume',
    duration: '10000',
    value: '0.7'
  }, {
    type: 'volume',
    duration: '10000',
    value: '1.6'
  }, {
    type: 'pitch',
    duration: '10000',
    value: 'D'
  }, {
    type: 'chord',
    duration: '10000',
    value: 'min'
  }, {
    type: 'chord',
    duration: '10000',
    value: 'maj7'
  }, {
    type: 'chord',
    duration: '10000',
    value: 'min7'
  }, {
    type: 'chord',
    duration: '10000',
    value: '7'
  }, {
    type: 'pitch',
    duration: '20000',
    value: 'A'
  }
];

function sendActions(index, manager) {
  if (!actions[index]) return;
  console.log('sending action', actions[index]);

  manager.addAction(actions[index]);

  setTimeout(function() { sendActions(index+1,manager)}, 1000);
}


var start = function(manager) {
  setTimeout(function() {
    sendActions(0,manager);
  }, 1000);
};

module.exports = {
  runTests: start
}
