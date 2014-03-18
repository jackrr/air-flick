var routeFiles = [
  'monitor.js',
  'device.js'
];

module.exports = function(app) {
  routeFiles.forEach(function(file) {
    require('./'+file)(app);
  });
};
