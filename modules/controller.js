var ids = [];

function Controller(id) {
  if (ids.indexOf(id) > -1) return 'error';
  ids.push(id);
  this.id = id;
}

module.exports = Controller;
