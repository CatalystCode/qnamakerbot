var builder = require('botbuilder');
var config = require('../config');
var EventHubClient = require('azure-event-hubs').Client;
var prompts = require('./prompts');
var qna = require('./qna');

var opts = {
  appId: config.get('MICROSOFT_APP_ID'),
  appPassword: config.get('MICROSOFT_APP_PASSWORD')
};

// Create chat bot
var connector = new builder.ChatConnector(opts);
var bot = new builder.UniversalBot(connector);
var intents = new builder.IntentDialog();

var scoreThreshHold = config.get('QNA_SCORE_THRESHHOLD') || 60;
scoreThreshHold = parseInt(scoreThreshHold);

var eventHubConfig = config.get('EVENT_HUB_READ_CONFIG');
var eventSender = null;
if (eventHubConfig) {
  var eventHubClient = new EventHubClient.fromConnectionString(eventHubConfig);
  eventHubClient.createSender()
  .then((sender) => {
    eventSender = sender;
  })
  .catch((e) => {
    console.warn('Couldn\'t create event sender');
    console.warn(e.stack);
  });
}

//=========================================================
// Bots Dialogs
//=========================================================



bot.dialog('/', intents);

intents.matches(/^(help|hi)/i, [
    function (session) {
        session.send(prompts.helpMessage);
    }
]);

// a question was asked
intents.onDefault([
    function (session, args, next) {
      var question = session.message.text;
      return qna.get({ question: question }, function(err, result) {
        if (err) {
          console.error('Failed to send request to QnAMaker service', err);
          return session.send('Sorry, I have some issues connecting to the remote QnA Maker service');
        }

        var score = parseInt(result.score);

        if (score > scoreThreshHold) {
          session.send(result.answer);
        }
        else if (score > 0) {
          if (eventSender) {
          }
          session.send('I\'m not sure, but the answer might be: ' + result.answer);
          session.beginDialog('/approve');
        }
        else {
          if (eventSender) {
          }
          session.send('Sorry, I don\'t know... :/');
        }

        console.log('question:', question, 'result:', result);
      });
    }
]);


bot.dialog('/approve', [
    function (session) {
        builder.Prompts.text(session, 'Was that helpful?');
    },
    function (session, results) {
        var answer = results.response;
        if (answer === 'yes') {
          session.send('great! glade I could help!');
        } else {
          session.send('oh.. sorry I couldn\'t help... :/');
        }

        session.endDialog();
    }
]);


bot.use({
  botbuilder: function (session, next) {
    if (!session.userData.firstRun) {
      session.userData.firstRun = true;
      session.send(prompts.helpMessage);
    } else {
      next();
    }
  }
});


module.exports = connector;

