// Scrapes a url using custom scrape function (func).
// page is a phantomjs webpage object.
// url is the url of the webpage to scrape.
// func is the actual scraping function.
// context is an optional argument to be passed to func.
var scrape = function(page, url, func, context) {
    page.open(url, function(status) {
        if ( status === "success" ) {        
            page.injectJs("jquery.min.js");
            
            if (arguments.length == 4)
                page.evaluate(func, context);
            else
                page.evaluate(func);
        }// If status == "success"
        else {
            console.error("Failed to open " + url);
        }
        
        phantom.exit(0);
    });
}

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
    console.error(msgStack.join('\n'));
};

// Error handler that ignores all errors.
var doNothingHandler = function(msg, trace) { };

page.onConsoleMessage = function(msg) {
    console.log(msg);
};

page.onError = doNothingHandler;