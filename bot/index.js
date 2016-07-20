var builder = require('botbuilder');
var config = require('../config');
var EventHubClient = require('azure-event-hubs').Client;
var prompts = require('./prompts');
var qna = require('./qna');
var async = require('async');
var uuid = require('node-uuid');

var DocumentClient = require('documentdb').DocumentClient;
var DataDao = require('./DataDao');
var User = require('./User');

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

// Connect database - Move this to config
var databaseHost = config.get( 'DB_HOST' );
var databaseMasterKey = config.get( 'DB_MASTER_KEY' );
var databaseName = config.get( 'DB_NAME' );
var collectionName = config.get( "DB_COLLECTION_NAME" );
var docDbClient = new DocumentClient(databaseHost, {masterKey: databaseMasterKey});

var dataDao = new DataDao(docDbClient, databaseName, collectionName);
dataDao.init( function( error ) {
  console.log( "ERROR CONNECTING TO DATABASE! - ", error );
});

//=========================================================
// Bots Dialogs
//=========================================================



bot.dialog('/', intents);

intents.matches(/^(help|hi)/i, [
    function (session) {
        session.send(prompts.helpMessage);
    }
]);

intents.matches(/^(history)/i, [
      function (session) {
      if ( !session.userData.uniqueID ) {
        session.send( "No user history available");
        return
      }

      // Generate token
      var user = new User( dataDao, session.userData.uniqueID );
      user.getHistory( function( err, history ) {
        if ( err ) {
          session.send( "Sorry, there was an error - " + err );
        } else if ( !history ) { 
          session.send( "Sorry, No user history available" );
        } else {
          session.send( JSON.stringify(history) );
        }
      });
    }
]);

intents.matches(/^(get token)/i, [
    function (session) {
      if ( !session.userData.uniqueID ) {
        session.send( "Unable to get a token at this time. Sorry");
        return
      }

      // Generate token
      var token = "bob";
      var user = new User( dataDao, session.userData.uniqueID );
      user.setToken( token, function( err, userDoc ) {
        if ( err ) {
          session.send( "Sorry, there was an error - " + err );
        } else {
          session.send( "You can change channels with this token - " + userDoc.token + "\nIts valid for 2 minutes" );
        }
      })
    }
]);

intents.matches(/^(use token) ([a-zA-Z0-9]*)/i, [
    function (session) {
      var msg = session.message.text;
      // extract out token
      tokens = msg.match(/use token ([a-zA-Z0-9]*)/);
      var token = null;
      if ( !tokens || tokens.length <= 1 ) {
        session.send( "Sorry, you entered an invalid token");
        return;
      }
      token = tokens[1];

      var user = new User( dataDao, "" );
      user.joinWithToken( token, function( err, userDoc ) {
        if ( err ) {
          console.log( "Error joining with token - ", err );
          session.send( "Sorry, this token is not valid");
        } else if ( !userDoc ) {
          console.log( "Invalid token - ", err );
          session.send( "Sorry, this token is not valid");
        } else {
          session.userData.uniqueID = userDoc.userId;
          session.send( "OK, continuing session - reply history to see your history");
        }
      });
    }
]);


function handleQuestion( session, question, callback ) {
  qna.get({ question: question }, function(err, result) {
    if (err) {
      console.error('Failed to send request to QnAMaker service', err);
      session.send('Sorry, I have some issues connecting to the remote QnA Maker service');
      callback( err, null);
    }

    var score = parseInt(result.score);

    var answer = "";
    if (score > scoreThreshHold) {
      anwer = result.answer;
      session.send(result.answer);
    }
    else if (score > 0) {
      if (eventSender) {
      }

      answer = 'I\'m not sure, but the answer might be: ' + result.answer;

      session.send(answer);
      session.beginDialog('/approve');
    }
    else {
      if (eventSender) {
      }
      answer = 'Sorry, I don\'t know... :/';
      session.send(answer);
    }

    console.log('question:', question, 'result:', result);
    callback( null, answer );
  });
}

// a question was asked
intents.onDefault([function (session, args, next) {

  async.waterfall([
    function(callback) {
      // If no uniqueID found - create a new one and a new user session, otherwise just grab the userDoc
      if ( !session.userData.uniqueID ) {
        session.userData.uniqueID = uuid.v4();
        console.log( "Created new user with session ", session.userData.uniqueID );
      } else {
        console.log( "Have an existing user with session ", session.userData.uniqueID );
      }
      callback( null, session.userData.uniqueID );
    },
    function(userId, callback) {
      // OK, now we get to the meat - handle the users request
      var question = session.message.text;
      handleQuestion( session, question, function( err, result ) {
        if ( err ) {
          callback( err ); 
        } else {
          var historyItem = {"question": question, "answer" : result };
          callback( null, userId, historyItem );
        }
      });
    },
    function( userId, historyItem, callback) {
      // Create or Update the users history
      var user = new User( dataDao, userId ); 
      user.addHistory( historyItem, function( err, status) {
        callback( err, status );  
      })
    }
  ], function( err, result) {
    if ( err ) {
      console.log( "Error updating user doc - ", err );
    }
  });

}]);


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

