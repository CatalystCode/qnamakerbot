'use strict';

var request = require('request');
var querystring = require('querystring');

var qnaUri = 'http://qnaservice.cloudapp.net/KBService.svc/GetAnswer';
var qnaQuery = '?kbId=df73c79e6b5649519ffc260ca0cdf670&question=';

function qna(q, cb) {
  q = querystring.escape(q);
  request(qnaUri + qnaQuery + q, function (error, response, body) {
    if (error) {
      cb(error, null);
    }
    else if (response.statusCode !== 200) {
      cb(response, null);
    }
    else {
      cb(null, body);
    }
  });
}

module.exports = qna;
