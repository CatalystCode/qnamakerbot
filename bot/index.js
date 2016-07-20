var builder = require('botbuilder');
var config = require('../config');
var EventHubClient = require('azure-event-hubs').Client;
var prompts = require('./prompts');
var async = require('async');
var uuid = require('node-uuid');
var DocumentClient = require('documentdb').DocumentClient;
var MetadataClient = require('./metadata').Client;
var qna = require('./qna')();
var ba_qna = require('./qna')("BA");

var DataDao = require('./DataDao');
var User = require('./User');

var opts = {
  appId: config.get('MICROSOFT_APP_ID'),
  appPassword: config.get('MICROSOFT_APP_PASSWORD')
};

var metadataClient = new MetadataClient();

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

var dataDao = null;
try {
  dataDao = new DataDao(docDbClient, databaseName, collectionName);
  dataDao.init( function( error ) {
    console.log( "ERROR CONNECTING TO DATABASE! - ", error );
  });
}
catch (e) {
  console.warn("Error initialising DocumentDb client");
}

//=========================================================
// Bots Dialogs
//=========================================================


bot.dialog('/', intents);

intents.matches(/^(help|hi|hello)/i, [
    function (session) {
        session.send(prompts.helpMessage);
    }
]);

intents.matches(/^read history ([-a-zA-Z0-9]*)/i, [
  function (session) {
    var msg = session.message.text;

    tokens = msg.match(/read history ([-a-zA-Z0-9]*)/);
    var token = null;
    if ( !tokens || tokens.length <= 1 ) {
      session.send( "Sorry, you entered an invalid token");
      return;
    }
    token = tokens[1];

    var user = new User( dataDao, "" );
    user.findUserWithToken( token, function( err, userDoc ) {
      if ( err ) {
        console.log( "Error finding user with token - ", err );
        session.send( "Sorry, this token is not valid");
      } else if ( !userDoc ) {
        console.log( "Invalid token - ", err );
        session.send( "Sorry, this token is not valid");
      } else {
        session.send( JSON.stringify(userDoc.history) );
      }
    });
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
        if (err) {
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

      // Generate token - TODO: Make sure that this token is unique in the DB!
      var token = generateToken();
      var user = new User( dataDao, session.userData.uniqueID );
      user.setToken( token, function( err, userDoc ) {
        if ( err ) {
          session.send( "Sorry, there was an error - " + err );
        } else {
          var bacomLink = "https://ba.com/?botid=" + token;
          var mobileLink = "IAGMSBot://" + token;
          session.send( "You can continue this conversation on either ba.com using the link: " +
            bacomLink + "\n\nOr alternatively on the BA Mobile App using " + mobileLink +
            "\n\nNote - this link is valid for 2 minutes");
        }
      })
    }
]);

intents.matches(/^(use token) ([-a-zA-Z0-9]*)/i, [
    function (session) {
      var msg = session.message.text;

      // extract out token
      tokens = msg.match(/use token ([-a-zA-Z0-9]*)/);
      var token = null;
      if ( !tokens || tokens.length <= 1 ) {
        session.send( "Sorry, you entered an invalid token");
        return;
      }
      token = tokens[1];

      var user = new User( dataDao, "" );
      user.findUserWithToken( token, function( err, userDoc ) {
        if ( err ) {
          console.log( "Error finding user with token - ", err );
          session.send( "Sorry, this token is not valid");
        } else if ( !userDoc ) {
          console.log( "Invalid token - ", err );
          session.send( "Sorry, this token is not valid");
        } else {
          session.userData.uniqueID = userDoc.userId;
          session.send( JSON.stringify(userDoc.history) );
        }
      });
    }
]);



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
       builder.Prompts.confirm(session, 'Was that helpful?', { listStyle: builder.ListStyle.button });
    },
    function (session, promptConfirmResult) {
        var answer = promptConfirmResult.response;
        if (answer) {
          session.send('great! Glad I could help!');
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

function generateToken(args) {

    var text = '';
    var possible = 'abcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < 3; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    text += '-';

    for (var j = 0; j < 3; j++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    text += '-';

    for (var k = 0; k < 3; k++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function handleQuestion( session, question, callback ) {

  console.log("qna.get");
  qna.get({ question: question }, function(err, result) {

    console.log(question);
    console.log(result);

    if (err) {
      console.error('Failed to send request to QnAMaker service', err);
      session.send('Sorry, I have some issues connecting to the remote QnA Maker service');
      return callback( err, null);
    }

    var score = parseInt(result.score);

    var answer = "";

    if (score > scoreThreshHold) {
      answer = result.answer;
      sendAnswer({session, answer, origAnswer: answer});
    }
    else if (score > 0) {
      if (eventSender) {
      }

      answer = 'I\'m not sure, but the answer might be: ' + result.answer;
      sendAnswer({session, answer, origAnswer: result.answer}, (err) => {
        if (!err) {
          session.beginDialog('/approve');
        }
      });
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

function sendAnswer(opts, cb) {
  cb = cb || function(){};

  var session = opts.session;
  var answer = opts.answer;
  var origAnswer = opts.origAnswer;

  metadataClient.get({
      answer: origAnswer
    }, (err, metadata) => {

      if (err) {
        console.error('error getting metadata for answer', answer, err);
        return cb(err);
      }

      console.log('answer metadata', metadata);

      if (!metadata) {
        session.send(answer);
        return cb();
      }

      if ("cardType" in metadata && metadata.cardType != null) {
        if (cardType == "hero") {
          var card = new builder.HeroCard(session)
          .title(metadata.introText)
          .buttons([
            builder.CardAction.postBack(session, "option1", metadata.button1Text),
            builder.CardAction.postBack(session, "option2", metadata.button2Text),
          ])
          .images([
            builder.CardImage.create(session, metadata.mainImage)
          ]);

          var msg = new builder.Message(session).attachments([card]);
          session.send(msg);
        }

      /*if (metadata.imageUrl) {
        var card = new builder.HeroCard(session)
          .title("Airbot")
          .text(answer)
          .images([
                builder.CardImage.create(session, metadata.imageUrl)
          ]);
        */

      }
      else if (metadata.action == "RichContent") {
          session.send(metadata.introText)
      }
      else {
        session.send(answer);
      }
      return cb();
    }
  );
}
