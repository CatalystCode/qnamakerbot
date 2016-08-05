'use strict';

var request = require('request');
var botbuilder = require('botbuilder');
var qnaClient = require('./qna_client.js');

function MinimalQNABot(connector) {

  var bot = new botbuilder.UniversalBot(connector);

  bot.dialog('/', [
    (session, args, next) => {
      qnaClient(session.message.text, (err, result) => {
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

  return bot;
}

module.exports = MinimalQNABot;
