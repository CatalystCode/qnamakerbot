var QnAClient = require('qnamaker-client').Client;
var config = require('../config');

function getServiceUrl(faq) {
  if (faq == "BA") {
    return config.get('BA_QNA_SERVICE_URL')
  }
  else {
    return config.get('QNA_SERVICE_URL')
  }
}


function newQnAClient(faq) {
  return new QnAClient({
    serviceUrl: getServiceUrl()
  });
}

var useMock = (config.get('QNA_USE_MOCK') || '').toString().toLowerCase() === 'true';
if (useMock) {
  qnaClient.get = (opts, cb) => {
    process.nextTick(() => {
      var score = opts.question;
      return cb(null, {
        answer: 'some answer',
        score: score
      });
    });
  }
}

module.exports = newQnAClient;
