'use strict';

var request = require('request');
var querystring = require('querystring');

var restify = require('restify');
var botbuilder = require('botbuilder');
var config = require('nconf').env().argv().file({ file: './localConfig.json' });

function createConsoleConnector() {
  console.log('Hi.. ask about the Microsoft Bot Framework and I\'ll do my best to answer.');
  return new botbuilder.ConsoleConnector().listen();
}

function createChatConnector() {

  var opts = {
    appId: config.get('MICROSOFT_APP_ID'),
    appPassword: config.get('MICROSOFT_APP_PASSWORD')
  };

  var chatConnector = new botbuilder.ChatConnector(opts);

  var server = restify.createServer();
  server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
  });

  server.post('/qna', chatConnector.listen());

  return chatConnector;
}

function qna(q, cb) {
  q = querystring.escape(q);
  request(config.get('qnaUri') + q, function (error, response, body) {
    if (error) {
      cb(error, null);
    }
    else if (response.statusCode !== 200) {
      cb(response, null);
    }
    else {
      cb(null, body);
    }
  });
}

function main() {
  var connector = config.get('console') ? createConsoleConnector() : createChatConnector();
  var bot = new botbuilder.UniversalBot(connector);

  bot.dialog('/', [
    (session, args, next) => {
      qna(session.message.text, (err, result) => {
        if (err) {
          console.error(err);
          session.send('Unfortunately an error occurred. Try again.');
        }
        else {
          session.send(JSON.parse(result).answer);
        }
      });
    }
  ]);
}

if (require.main === module) {
  main();
}
