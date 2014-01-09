// Read the webpage element text using jQuery.
var page = require('webpage').create();

// Error handler that outputs the error message and stack trace to std error.
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

// This doesn't seem to do anything.
phantom.onError = function(msg, trace) {
    errorHandler(msg, trace);
    phantom.exit();
}

page.onConsoleMessage = function(msg) {
    console.log(msg);
};

page.onError = doNothingHandler;

// ToDo: This should be replaced by the actual url:
// http://www.athinorama.gr/cinema/guide.aspx?show=1
var url = "guide.html";

page.open(url, function(status) {
    if ( status === "success" ) {
		page.injectJs("jquery.min.js");       
        
        page.evaluate(function() {
            var scrapeAllFilms = function() {
                var $newArrivals = $("h2.placename");
                
                var films = [];
                
                $newArrivals.each(function() {
                    var $this = $(this);
                    var $a = $this.children("a").first();
                    
                    // Page of film
                    var page = $a.attr("href");
                    
                    films.push({
                        page: page,                        
                    });
                }); // each
                
                return films;
	    }; // scrapeAllFilms     
            
            var films = scrapeAllFilms();
            films.forEach(function(e) { 
                console.log(JSON.stringify(e));
                console.log("");
            });
            
        }); // page.evaluate
    }// If status == "success"
    else {
        console.error("Failed to open " + url);
    }
	
	phantom.exit();
});

