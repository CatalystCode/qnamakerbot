var crypto = require('crypto');
var Q = require("Q");


function Client(opts) {
    var self = this;
}

Client.prototype.get = function (opts, cb) {
    var deferred = Q.defer();

    if (!opts.answer) throw new Error('answer is required');
    cb = cb || function() {};
    var self = this;

    var hash = crypto.createHash('md5').update(opts.answer).digest('hex');

    var result = {
      hash: hash,
      imageUrl: 'http://www.freedigitalphotos.net/images/img/homepage/87357.jpg'
    };


    // currently only supporting metadata for the question 'Why do I have an Avios card?'
    // the metadata should come from a storage, lookup of the hash

    var answerHashWithMetadata = '831d8aee8316cdb25e5d85b15288fe03';
    result = (hash === answerHashWithMetadata) ? result : null;

    process.nextTick(() => {
       deferred.resolve(result);
       return cb(null, result);
    });

    return deferred.promise;
}

module.exports.Client = Client;
