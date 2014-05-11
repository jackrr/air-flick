


var actions = [{
    type: 'volume',
    duration: '15000',
    value: '1.8'
  }, {
    type: 'chord',
    duration: '10000',
    value: 'maj'
  }, {
    type: 'pitch',
    duration: '10000',
    value: 'D'
  }, {
    type: 'volume',
    duration: '10000',
    value: '0.1'
  }, {
    type: 'pitch',
    duration: '10000',
    value: 'F'
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

  setTimeout(function() { sendActions(index+1,manager)}, 5000);
}


var start = function(manager) {
  setTimeout(function() {
    sendActions(0,manager);
  }, 2000);
};

module.exports = {
  runTests: start
}
