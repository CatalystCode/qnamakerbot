'use strict';

var uuid = require('node-uuid');
var request = require('request');
var querystring = require('querystring');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');

var restify = require('restify');
var botbuilder = require('botbuilder');
var config = require('nconf').env().argv().file({ file: './localConfig.json' });

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

  intents.matches(/^(\/\/history)/i, [
    function (session) {
      session.send(session.userData.history.join('\n'));
      return
    }
  ]);

  intents.matches(/^(\/\/goto)/i, [
    function (session) {

      if (session.message.address.channelId != 'skype') {
        session.send('Sorry.. I only support Skype->Webchat transfers');
        return;
      }

      let token = uuid.v4();

      let values = [
        session.message.user.id, 
        session.message.user.name, 
        token, 
        JSON.stringify(session.userData.history)
      ];

      db.run('insert into users values(\'' + values.join('\',\'') + '\')');

      session.send("Transferring you..\nClick on the link to transfer to the web chat");
      session.send('http://localhost:3978');
      session.send("Paste the following token in the web chat to link your channel ids:");
      session.send(token);
    }
  ]);

  intents.matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, [
    function(session) {
      let stmt = 'select * from users where token = \'' + session.message.text + '\'';
      db.get(stmt, (err, row) => {
        if (err || row === undefined) {
          session.send("Sorry.. that token didn't match anything in my database");
        }
        else {
          session.send("Found a match");
          session.send("Your userId in the Skype chat is: " + row.uid);
          session.send("Your userId in this chat is is: " + session.message.user.id);
          session.send("Skype knows you as: " + row.name);
          session.send('And the last few things you typed in Skype were:' + row.history);
        }
      });
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
}

function initialiseStorage() {
  db.run('create table users (uid text, name text, token text, history text)');
}

function main() {
  initialiseStorage();
  initialiseBot(new botbuilder.UniversalBot(createChatConnector()));
}

if (require.main === module) {
  main();
}
