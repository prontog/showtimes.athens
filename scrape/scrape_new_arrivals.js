// Read the webpage element text using jQuery.
var page = require('webpage').create();

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

// ToDo: This should be replaced by the actual url:
//http://www.athinorama.gr/cinema/
var url = "cinema.html";

page.open(url, function(status) {
    if ( status === "success" ) {
		
        page.evaluate(function() {
            var scrapeNewArrivals = function() {
                var $newArrivals = $("#ctl00_ctl00_Stiles_Left_uc_CinemaFilterMain_pnlNewArrivals");
                
                var arrivals = [];
                
                $newArrivals.first().find("a").each(function() {
                    // Page of new arrival
                    var page = $(this).attr("href");
                    arrivals.push(page);
                }); // each
                
                return arrivals;
	    }; // scrapeNewArrivals     
            
            var arrivals = scrapeNewArrivals();
            arrivals.forEach(function(p) { 
                console.log(p);
            });
            
        }); // page.evaluate
    }// If status == "success"
    else {
        console.error("Failed to open " + url);
    }
	
	phantom.exit();
});
