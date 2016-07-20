var path = require('path');
var fs = readline
var readline = require('readline');
var nconf = require('nconf');

var QnAClient = require('qnamaker-client').Client;

var config = nconf.env().file({ file: './config/dev.json' });

var qnaClient = new QnAClient({
    serviceUrl: config.get('serviceUrl')
});

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function getQuestion() {
    rl.question("What's your question? ", function(question) {
        
        // using cb pattern
        qnaClient.get({ question: question }, function(err, result) {
            if (err) return console.error('error from callback:', err);
            console.log('got result (using callback):', result);
        });

        // using promises
        qnaClient.get({ question: question }).then(function(result) {
            console.log('got result (using promises):', result);
        })
        .catch((err) => {
            console.log('error from promis:', err);
        })

    });
}

getQuestion();

