"use strict";
var system = require("system");

// Inject common code. Includes error handling.
if (phantom.injectJs("common.js") == false) {
    system.stderr.writeLine("Missing common.js file.");
    phantom.exit(2);
}

var fs = require("fs");
// CLI arguments
var args = system.args;
var url = null;
var filename = null;

if (args.length !== 3) {
    system.stderr.writeLine("usage: phantomjs " + phantom.scriptName + " URL FILE.json");
    phantom.exit(1);
} else {
    url = args[1];
    filename = args[2];
    if (!fs.exists(filename)) {
        system.stderr.writeLine("File not exist: " + filename);
        phantom.exit(1);
    }
}

// Mark the film as a new arrival.
var asNewArrival = function(data) {
    data.newArrival = "true";
    return data;
};

// Post the new arrivals.
var errorCode = put(url, filename, asNewArrival);

phantom.exit(errorCode);
