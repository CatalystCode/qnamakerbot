var restify = require('restify');

var log = require('./log');

if (log.config.enabled) {
  log.init({
    domain: process.env.COMPUTERNAME || '',
    instanceId: log.getInstanceId(),
    app: 'airbots',
    level: log.config.level,
    transporters: log.config.transporters
  }, function(err) {
    if (err) {
      return console.error(err);
    }
    console.log('starting bot...');
    startBot();
  });
} else {
  startBot();
}


function startBot() {

  // Setup Restify Server
  var server = restify.createServer();
  server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
  });

  var botConnector = require('./bot');
  server.post('/api/messages', botConnector.listen());
}
