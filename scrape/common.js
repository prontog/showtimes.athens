var fs = require("fs");
var webpage = require('webpage');

var logTime = false;

var prepareLogEntry = function(entry) {
    if (logTime) {
        var now = new Date();
        entry = now.toLocaleTimeString() + " " + entry;
    }
    
    return entry;
}

// Writes to standard error.
var writeToStderr = function(msg) {
    system.stderr.writeLine(prepareLogEntry(msg));
}

// Write to terminal.
var writeToTerminal = function(msg) {    
	fs.write("/dev/tty", prepareLogEntry(msg) + "\n");
}

// Writes to standard out.
var writeToConsoleLog = function(msg) {
    console.log(prepareLogEntry(msg));
};

// Error handler that outputs the error message and stack trace to std error.
// ToDo: Change this to write to a file instead.
var errorHandler = function(msg, trace) {
    var msgStack = ['ERROR: ' + msg];
    
    if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function(t) {
            msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
        });
    }
    
    writeToStderr(msgStack.join('\n'));
};

// Error handler that ignores all errors.
var doNothingHandler = function(msg, trace) { };

var endsWith = function(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

// Subscribe to some of the events of the webpage.
var subscribeToPageEvents = function(page) {    
    
    // WebPage Events
    page.onError = doNothingHandler;
    
    page.onAlert = function(msg) {
        writeToTerminal("ALERT: " + msg);
    };
    
    page.onConfirm = function(msg) {
        writeToTerminal("CONFIRM: " + msg);
        return true;  // `true` === pressing the "OK" button, `false` === pressing the "Cancel" button
    };
    
    page.onPrompt = function(msg, defaultVal) {
        writeToTerminal("PROMPT: " + msg);
        return defaultVal;
    };
    
    page.onResourceRequested = function(requestData, networkRequest) {
        //writeToTerminal('  Url: ' + url);
        //writeToTerminal('->Request (#' + requestData.id + '): ' + requestData.url);
        
        // Allow only the resources of the initial request (page.open).
        // Note: url is a variable in all scrape scripts. Remember that this code is
        // injected (phantom.injectJs).
        if (!endsWith(url, requestData.url.toString()))
            networkRequest.abort();
    };
    
    page.onResourceTimeout = function(request) {
        writeToTerminal('Response (#' + request.id + '): ' + request.url);
    };
    
    //page.onError = errorHandler;
    
//    page.onNavigationRequested = function(url, type, willNavigate, main) {
//        writeToTerminal('Trying to navigate to: ' + url);
//        writeToTerminal('Caused by: ' + type);
//        writeToTerminal('Will actually navigate: ' + willNavigate);
//        writeToTerminal("Sent from the page's main frame: " + main);
//    }
    
//    page.onUrlChanged = function(targetUrl) {
//        writeToTerminal('New URL: ' + targetUrl);
//    };
    
    //page.onResourceReceived = function(response) {
    //    writeToTerminal('<-Response (#' + response.id + ', stage "' + response.stage + '"): ' /*+ JSON.stringify(response)*/);
    //};
    
//    page.onResourceError = function(resourceError) {
//        writeToTerminal('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')');
//        writeToTerminal('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
//    };
}

// Scrapes a url using custom scrape function (func).
// url is the url of the webpage to scrape.
// func is the actual scraping function.
// NOTE: Any other params passed will be added to a context object
//       that will be passed to func.
var scrape = function(url, func) {
    var otherArgs = [];
    for (var i = 3; i < arguments.length; i++) {
        otherArgs.push(arguments[i]);    
    }
    
    var context = {
        url: url,
        otherArgs: otherArgs
    };
    
    var page = webpage.create();
    
    subscribeToPageEvents(page);
    
    page.open(url, function(status) {
        if ( status === "success" ) {     
            page.onConsoleMessage = writeToConsoleLog;
            page.injectJs("jquery.min.js");
            
            page.evaluate(func, context);
        }// If status == "success"
        else {
            console.error("Failed to open " + url);
        }
        
        phantom.exit(0);
    });
}