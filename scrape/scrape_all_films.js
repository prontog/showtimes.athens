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
// http://www.athinorama.gr/cinema/guide.aspx?show=1
var url = "guide.html";

page.open(url, function(status) {
    if ( status === "success" ) {
        page.injectJs("jquery.min.js");
        
        page.evaluate(function() {
            var scrapeFilmUrls = function() {
                var $films = $("h2.placename");
                
                var filmUrls = [];
                
                $films.each(function() {
                    var $a = $(this).children("a").first();
                    // Page of film
                    var page = $a.attr("href");
                    
                    filmUrls.push(page);
                }); // each
                
                return filmUrls;
            }; // scrapeAllFilms     
            
            var films = scrapeFilmUrls();
            films.forEach(function(p) { 
                console.log(p);
            });
            
        }); // page.evaluate
    }// If status == "success"
    else {
        console.error("Failed to open " + url);
    }
	
	phantom.exit();
});
