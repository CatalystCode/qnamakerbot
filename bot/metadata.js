var crypto = require('crypto');
var Q = require("Q");

function Client(opts) {
    var self = this;
}

Client.prototype.get = function (opts, cb) {
    
    if (!opts.answer) {
      throw new Error('answer is required');
    }

    cb = cb || function() {};
    var self = this;

    var metadata = null;

    // Extract metatdata from the answer
    // There's almost certainly a module that does this
    var startTag = "[metadata]";
    var endTag = "[!metadata]";
    var metaStart = opts.answer.indexOf(startTag);
    if (metaStart != -1) {
      // Right now we're smuggling this along with the answer,
      // production system should use the metadata capability
      // of the API (once it exists).
      var metaEnd = opts.answer.indexOf(endTag);
      var meta = opts.answer.slice(metaStart + startTag.length, metaEnd);      
      metadata = JSON.parse(meta);
      metadata.answer = opts.answer.slice(0, metaStart);
    }

    /*var hash = crypto.createHash('md5').update(opts.answer).digest('hex');

    var result = {
      hash: hash,
      imageUrl: 'http://www.freedigitalphotos.net/images/img/homepage/87357.jpg'
    };


    // currently only supporting metadata for the question 'Why do I have an Avios card?'
    // the metadata should come from a storage, lookup of the hash

    var answerHashWithMetadata = '831d8aee8316cdb25e5d85b15288fe03';
    result = (hash === answerHashWithMetadata) ? result : null;
    */

    process.nextTick(() => {
       console.log("getmetadata - resolve");
       return cb(null, metadata);
    });
}

module.exports.Client = Client;
