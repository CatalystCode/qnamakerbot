'use strict';

/*
  qnamakerbot - Minimal demo of integrating a bot with the QnA Maker 
  (https://qnamaker.botframework.com/). 
*/

var request = require('request');
var querystring = require('querystring');

var restify = require('restify');
var botbuilder = require('botbuilder');

// Config can appear in the environment, argv or in the local config
// file (don't check this in!!)
var config = require('nconf').env().argv().file({ file: './localConfig.json' });

function createChatConnector() {

  // Create the chat connector which will hook us up to the Bot framework
  // servers. This is all very standard stuff.

  let opts = {
    // You generate these two values when you create your bot at
    // https://dev.botframework.com/
    appId: config.get('BOT_APP_ID'),
    appPassword: config.get('BOT_APP_PASSWORD')
  };

  let chatConnector = new botbuilder.ChatConnector(opts);

  let server = restify.createServer();

  server.post('/qna', chatConnector.listen());

  // Serve the static file containing the embedded web control
  // directly from local storage
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

  // Here's where we pass anything the user typed along to the
  // QnA service. Super simple stuff!!

  q = querystring.escape(q);
  request(config.get('qnaUri') + q, function (error, response, body) {
    if (error) {
      cb(error, null);
    }
    else if (response.statusCode !== 200) {
      // Looks like we got a valid response from QnA
      cb(response, null);
    }
    else {
      cb(null, body);
    }
  });
}

function initialiseBot(bot) {

  // Someone set up us the bot :-)

  // Use IntentDialog to watch for messages that match regexes
  let intents = new botbuilder.IntentDialog();

  // Any message not matching the previous intents ends up here
  intents.onDefault((session, args, next) => {

    // Just throw everything into the qna service
    qna(session.message.text, (err, result) => {
      if (err) {
        console.error(err);
        session.send('Unfortunately an error occurred. Try again.');
      }
      else {
        // The QnA returns a JSON: { answer:XXXX, score: XXXX: }
        // where score is a confidence the answer matches the question.
        // Advanced implementations might log lower scored questions and
        // answers since they tend to indicate either gaps in the FAQ content
        // or a model that needs training
        session.send(JSON.parse(result).answer);
      }
    });
  });

  bot.dialog('/', intents);
}

function main() {
  initialiseBot(new botbuilder.UniversalBot(createChatConnector()));
}

if (require.main === module) {
  main();
}
