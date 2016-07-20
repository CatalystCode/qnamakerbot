process.on('uncaughtException', function (er) {
  console.error('uncaughtException', er.stack)
  setTimeout(() => {
    process.exit(1);
  }, 3000);
});

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

  var appInsights = require('./bot/telemetry').appInsights;
  
  server.pre(function(req, res, next) {
    //console.log('REQUEST:', req.url);
    if (req.method !== 'GET') return next();

    appInsights.client.trackRequest(req, res);
    return next();
  });

  var botConnector = require('./bot');
  server.post('/api/messages', botConnector.listen());
}
