'use strict';

var uuid = require('node-uuid');
var request = require('request');
var querystring = require('querystring');

var restify = require('restify');
var botbuilder = require('botbuilder');
var config = require('nconf').env().argv().file({ file: './localConfig.json' });

function createConsoleConnector() {
  console.log('Hi.. ask me about the Microsoft Bot Framework.');
  return new botbuilder.ConsoleConnector().listen();
}

function createChatConnector() {

  let opts = {
    appId: config.get('BOT_APP_ID'),
    appPassword: config.get('BOT_APP_PASSWORD')
  };

  let chatConnector = new botbuilder.ChatConnector(opts);

  let server = restify.createServer();

  server.post('/qna', chatConnector.listen());
  server.get(/\/?.*/, restify.serveStatic({
    directory: __dirname + '/html',
    default: 'index.html',
  }));

  server.listen(3978, function () {
    console.log('%s listening to %s', server.name, server.url);
  });

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

function initialiseBot(bot) {

  let intents = new botbuilder.IntentDialog();

  intents.matches(/^(\/history)/i, [
    function (session) {
      session.send(session.userData.history.join('\n'));
      return
    }
  ]);

  intents.matches(/^(\/goto)/i, [
    function (session) {
      session.send("Transferring you..");
      session.send("Click on the link to transfer to the web chat");
      session.send('http://localhost:3978');
      session.send("When prompted, use the following token to identify yourself:");
      let uid = uuid.v4();
      session.send(uid);
      return
    }
  ]);

  intents.matches(/^(\/firstRun)/i, [
    function (session) {
      botbuilder.Prompts.text(session, "Hello... What's your name?");
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
        console.log(result);
        session.send(JSON.parse(result).answer);
      }
    });
  });

  bot.dialog('/', intents);

  bot.on('conversationUpdate', function (message) {
  //  console.log(message);
  });
  bot.on('message', function (message) {
  //  console.log(message);
  });
}

function main() {
  initialiseBot(new botbuilder.UniversalBot(createChatConnector()));
  initialiseBot(new botbuilder.UniversalBot(createConsoleConnector()));
}

if (require.main === module) {
  main();
}
