var config = require('../config');

var http = require("http");
var appInsights = require("applicationinsights");

var aikey = config.get('APPINSIGHTS_INSTRUMENTATIONKEY') || "";

appInsights.setup(aikey)
    .setAutoCollectRequests(false) // disable auto-collection of requests for this example
    .start();

// assign common properties to all telemetry sent from the default client
// appInsights.client.commonProperties = {
//     environment: process.env.SOME_ENV_VARIABLE
// };

// track a system startup event
// appInsights.client.trackEvent("server start");

// create server
var port = process.env.port || 1337
var server = http.createServer(function (req, res) {
    // track all "GET" requests
    if(req.method === "GET") {
        appInsights.client.trackRequest(req, res);
    }

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hello World\n");
}).listen(port);

// track startup time of the server as a custom metric
// var start = +new Date;
// server.on("listening", () => {
//     var end = +new Date;
//     var duration = end - start;
//     appInsights.client.trackMetric("StartupTime", duration);
// });

var Telemetry = {
    trackEvent: function (key, property, value)
    {
        appInsights.client.trackEvent(key, property, value);
    }
}

module.exports = Telemetry;
