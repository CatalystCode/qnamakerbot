var builder = require('botbuilder');
var config = require('./config');
var QnAClient = require('qnamaker-client').Client;
var EventHubClient = require('azure-event-hubs').Client;

var opts = {
    appId: config.get('MICROSOFT_APP_ID'),
    appPassword: config.get('MICROSOFT_APP_PASSWORD')
};

// Create chat bot
var connector = new builder.ChatConnector(opts);
var bot = new builder.UniversalBot(connector);
var intents = new builder.IntentDialog();

var qnaClient = new QnAClient({
    serviceUrl: config.get('QNA_SERVICE_URL')
});

var scoreThreshHold = 60;
var eventHubClient = new EventHubClient.fromConnectionString(config.get("EVENT_HUB_READ_CONFIG"));
var eventSender = null;

eventHubClient.createSender()
.then((sender) => {
  eventSender = sender;
})
.catch((e) => {
  console.warn("Couldn't create event sender");
  console.warn(e.stack);
});

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', intents);

intents.onDefault([function (session, args, next) {
    var question = session.message.text;
    return qnaClient.get({ question: question }, function(err, result) {
        if (err) {
            console.error('Failed to send request to QnAMaker service', err);
            return session.send("Sorry, I have some issues connecting to the remote QnA Maker service...");
        }

        var score = parseInt(result.score);

        if (score > scoreThreshHold) {
            session.send(result.answer);
        }
        else if (score > 0) {
            if (eventSender) {
            }
            session.send("I'm not sure, but the answer might be: " + result.answer);
        }
        else {
            if (eventSender) {
            }
            session.send("Sorry, I don't know... :/")
        }

        console.log('question:', question, "result:", result);
    });
}]);

bot.use({
    botbuilder: function (session, next) {
        if (!session.userData.firstRun) {
            session.userData.firstRun = true;
            session.send('Hello I am a faqqer ;) ');
        } else {
            next();
        }
    }
});


module.exports = connector;

