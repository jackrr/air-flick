var routeFiles = [
  'display.js',
  'device.js'
];

module.exports = function(app) {
  routeFiles.forEach(function(file) {
    require('./'+file)(app);
  });
};
