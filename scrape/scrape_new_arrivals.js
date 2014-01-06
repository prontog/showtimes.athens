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
//http://www.athinorama.gr/cinema/
var url = "cinema.html";

page.open(url, function(status) {
    if ( status === "success" ) {
		page.injectJs("jquery.min.js");       
        
        page.evaluate(function() {
            var scrapeNewArrivals = function() {
                var newArrivalsId = "ctl00_ctl00_Stiles_Left_uc_CinemaFilterMain_pnlNewArrivals";
                var $newArrivals = $("#" + newArrivalsId);
                
                var arrivals = [];
                
                $newArrivals.first().find("a").each(function() {
                    var $this = $(this);
                    
                    // Page of new arrival (na)
                    var na_page = $this.attr("href");
                    // Image
                    var na_image = $this.children("img").first().attr("src");
                    
                    var $spans = $this.children("span");
                    // Title (GRE)
                    var na_title = $spans.filter(".title").first().text();
                    // ToDo: The stars for the film can be found in a span inside the title.
                    // Original title (EN)
                    var na_origTitle = $spans.filter(".orgtitle").first().text();
                    // Description. The description has the format: Genre | Year | FilmType
                    var description = $spans.filter(".description").first().text();
                    var descriptionFields = description.split("|");
                    var na_genre = descriptionFields[0].trim();
                    var na_year = descriptionFields[1].trim();
                    var na_filmType = descriptionFields[2].trim();
                    
                    arrivals.push({
                        page: na_page,
                        image: na_image,
                        title: na_title,
                        origTitle: na_origTitle,
                        genre: na_genre,
                        year: na_year,
                        filmType: na_filmType
                    });
                }); // each
                
                return arrivals;
			}; // scrapeNewArrivals     
            
            var arrivals = scrapeNewArrivals();
            arrivals.forEach(function(e) { 
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

