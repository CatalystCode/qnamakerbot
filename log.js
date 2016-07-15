
var logging = require('azure-logging');

/*
 * This module uses azure-logging to encapsulate console.log with a substitute
 * method that logs messages to an azure table.
 */
function init(options, cb) {
    logging.writer(options, function (err, logwriter) {
        if (err) return cb(err);

        // replace console.xxx with logwriter.xxx
        logging.interceptor.replace(console, logwriter);

        return cb();
    });
};

function getInstanceId() {
    var instanceId = process.env.COMPUTERNAME;
    if (!instanceId) return 'local';
    return instanceId;
}


// log azure storage account name
var log_storage_account = process.env.LOG_STORAGE_ACCOUNT;
//
// log azure storage acount key
var log_storage_account_key = process.env.LOG_STORAGE_KEY;


// this should be outside in a config file
var config = {
        // minimum level to show logs
        level: process.env.LOG_LEVEL || 'log',

        // supported transporters for the application logs.
        // currently redirecting logs to both the console and Azure storage
        transporters: [
        {
            name: 'console', 
            write : true, 
            default: false,
            options: {
                level: 'log'
            }
        },
        {
            name: 'azuretable',
            write: true,
            default: true,
            options: {
                storage: {
                    account: log_storage_account,
                    key: log_storage_account_key
                }
            }
        }],

        enabled: log_storage_account && log_storage_account_key
      };

module.exports = {
    init: init,
    getInstanceId: getInstanceId,
    config: config
};
