var QnAClient = require('qnamaker-client').Client;
var config = require('../config');

var qnaClient = new QnAClient({ serviceUrl: config.get('QNA_SERVICE_URL') });

var useMock = (config.get('QNA_USE_MOCK') || '').toString().toLowerCase() === 'true';
if (useMock) {
  qnaClient.get = baQnaClient.get = (opts, cb) => {
    process.nextTick(() => {
      var score = opts.question;
      return cb(null, {
        answer: 'some answer',
        score: score
      });
    });
  };
}

module.exports = qnaClient;
