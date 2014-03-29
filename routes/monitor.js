module.exports = function(app) {
  app.get('/monitor/hello', function(req, res) {
    res.send("Hello, monitor");
  });
};
