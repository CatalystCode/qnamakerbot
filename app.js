'use strict';

var restify = require('restify');
var botbuilder = require('botbuilder');

function createConsoleConnector() {
  console.log('Hi.. ask me a question!');
  return new botbuilder.ConsoleConnector().listen();
}

function createChatConnector() {

  var config = require('nconf').env().file({ file: './localConfig.json' });

  var opts = {
    appId: config.get('MICROSOFT_APP_ID'),
    appPassword: config.get('MICROSOFT_APP_PASSWORD')
  };

  var chatConnector = new botbuilder.ChatConnector(opts);

  // Create http server
  var server = restify.createServer();
  server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
  });

  server.post('/qna', chatConnector.listen());

  return chatConnector;
}

function main() {
  var connector = createConsoleConnector();
  var bot = require('./lib/qnabot_minimal.js')(connector);
}

if (require.main === module) {
  main();
}
