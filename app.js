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

  let opts = {
    appId: config.get('MICROSOFT_APP_ID'),
    appPassword: config.get('MICROSOFT_APP_PASSWORD')
  };

  let chatConnector = new botbuilder.ChatConnector(opts);

  let server = restify.createServer();
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

  let connector = config.get('console') ? createConsoleConnector() : createChatConnector();
  let bot = new botbuilder.UniversalBot(connector);
  let intents = new botbuilder.IntentDialog();

  intents.matches(/^(\/history)/i, [
    function (session) {
      session.send(session.userData.history.join('\n'));
      return
    }
  ]);

  intents.onDefault((session, args, next) => {

    if (!('history' in session.userData)) {
      session.userData.history = [];
    }
    session.userData.history.push(session.message.text);

    qna(session.message.text, (err, result) => {
      if (err) {
        console.error(err);
        session.send('Unfortunately an error occurred. Try again.');
      }
      else {
        session.send(JSON.parse(result).answer);
      }
    });
  });

  bot.dialog('/', intents);
}

if (require.main === module) {
  main();
}
