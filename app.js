'use strict';

/*
  qnamakerbot - Relatively minimal demo of integrating a bot with the QnA Maker 
  (https://qnamaker.botframework.com/). For bomnus points we also demonstrate
  channel transfer with state whererby a user can be taken between different channels or 
  perhaps even to a custom app in a manner which allows user id's to be linked and state
  to persist across channels.
*/

var uuid = require('node-uuid');
var request = require('request');
var querystring = require('querystring');
var sqlite3 = require('sqlite3').verbose();

// !!! Don't use sqllite or in-memory databases for this in real life.
// Your bot application could be running across multple servers !!!! 
var db = new sqlite3.Database(':memory:');

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

  intents.matches(/^(\/\/history)/i, [
    function (session) {
      // Just dump the user's message history
      session.send(session.userData.history.join('\n'));
      return;
    }
  ]);

  intents.matches(/^(\/\/goto)/i, [
    function (session) {

      // Transfer from Skype->Webchat

      if (session.message.address.channelId !== 'skype') {
        session.send('Sorry.. I only support Skype->Webchat transfers');
        return;
      }

      // All this works by simply generating a token we can supply to the 
      // destination channel that'll map to our data in this channel.

      let token = uuid.v4();

      let values = [
        session.message.user.id, 
        session.message.user.name, 
        token, 
        JSON.stringify(session.userData.history)
      ];

      // Create a record for ourselves
      db.run('insert into users values(\'' + values.join('\',\'') + '\')');

      session.send('Transferring you..\nClick on the link to transfer to the web chat');
      session.send('http://localhost:3978');
      session.send('Paste the following token in the web chat to link your channel ids:');
      session.send(token);
    }
  ]);

  // Match a GUID
  intents.matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, [
    function(session) {

      if (session.message.address.channelId === 'skype') {
        session.send('Sorry.. GUID only valid in webchat');
      }

      // Do we have a mapping from GUID to user data from previous channel?
      let stmt = 'select * from users where token = \'' + session.message.text + '\'';
      db.get(stmt, (err, row) => {
        if (err || row === undefined) {
          session.send('Sorry.. that token didn\'t match anything in my database');
        }
        else {
          // Found the user, show them what we know about them
          session.send('Found a match');
          session.send('Your userId in the Skype chat is: ' + row.uid);
          session.send('Your userId in this chat is is: ' + session.message.user.id);
          session.send('Skype knows you as: ' + row.name);
          session.send('And the last few things you typed in Skype were:' + row.history);
        }
      });
    }
  ]);

  // Any message not matching the previous intents ends up here
  intents.onDefault((session, args, next) => {

    // Record everything the user types, the framework will
    // take care of persisting this for us.. which is nice.

    if (!('history' in session.userData)) {
      session.userData.history = [];
    }
    session.userData.history.push(session.message.text);

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

function initialiseStorage() {
  // Set up a simple table to store our user data in. This can obviously
  // be a complex as you like, perhaps even a view into your CRM
  db.run('create table users (uid text, name text, token text, history text)');
}

function main() {
  initialiseStorage();
  initialiseBot(new botbuilder.UniversalBot(createChatConnector()));
}

if (require.main === module) {
  main();
}
