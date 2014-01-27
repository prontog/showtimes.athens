// Scrapes a url using custom scrape function (func).
// page is a phantomjs webpage object.
// url is the url of the webpage to scrape.
// func is the actual scraping function.
// NOTE: Any other params passed will be added to a context object
//       that will be passed to func.
var scrape = function(page, url, func) {
    var otherArgs = [];
    for (var i = 3; i < arguments.length; i++) {
        otherArgs.push(arguments[i]);    
    }
    
    var context = {
        url: url,
        otherArgs: otherArgs
    };
    
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

var writeToStderr = function(msg) {
    //fs.write("/dev/stderr", msg);
    system.stderr.writeLine(msg);
}

var writeToTerminal = function(msg) {
    fs.write("/dev/tty", msg);
}

var writeToConsoleLog = function(msg) {
    console.log(msg);
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
    //console.error(msgStack.join('\n'));
};

// Error handler that ignores all errors.
var doNothingHandler = function(msg, trace) { };

//page.onError = doNothingHandler;
page.onError = errorHandler;
page.onAlert = function(msg) {
    writeToTerminal("ALERT: " + msg);
};