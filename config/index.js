var nconf = require('nconf');
var path = require('path');

var dev = path.join(__dirname, 'dev.json')

var config = nconf.env().file({ file: dev });

module.exports = config;
