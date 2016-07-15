var builder = require('botbuilder');

var opts = {
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
};

// Create chat bot
var connector = new builder.ChatConnector(opts);
var bot = new builder.UniversalBot(connector);
var intents = new builder.IntentDialog();

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', intents);

intents.onDefault([function (session, args, next) {
    session.send(askQuestion(session.message.text))
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

function askQuestion(question) {
    console.log(question);
    return "canned answer";
}

module.exports = connector;