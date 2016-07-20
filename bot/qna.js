var QnAClient = require('qnamaker-client').Client;
var config = require('../config');


function getServiceUrl(faq) {
  if (faq === "BA") {
    return config.get('BA_QNA_SERVICE_URL');
  }
  else {
    return config.get('QNA_SERVICE_URL');
  }
}

var baQnaClient = new QnAClient({
  serviceUrl: getServiceUrl('BA')
});

var qnaClient = new QnAClient({
  serviceUrl: getServiceUrl()
});

function getQnAClient(faq) {
  if (faq === "BA") {
    return baQnaClient;
  }
  else {
    return qnaClient;
  }
}

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
  }
}

module.exports = getQnAClient;
