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

//page.onError = doNothingHandler;

// ToDo: This should be replaced by the actual url passed as param 1.
var url = "film.html";

page.open(url, function(status) {
    if ( status === "success" ) {
		//page.injectJs("jquery.min.js");       
        
        page.evaluate(function(filmUrl) {
            var scrapeFilm = function() {
                var placeContainerSelector = "div.place-container";
                var $divContainer = $(placeContainerSelector).first();
                
                // Page of film
                var url = filmUrl;
                // Image
                var image = $divContainer.children("img").first().attr("src");
                                    
                var $h1_titles = $divContainer.children("h1").first();
                // Original title (EN)
                var origTitle = $h1_titles.children("span").first().text();
                // Title (GRE)
                var title = $h1_titles.text().replace(origTitle, "").trim();
                // stars. The half stars for the film can be found in the last digit.
                var stars = $divContainer.children("div.stars15h")[0].className;
                // ToCheck: Do I need this?
                var $divPlaceData = $divContainer.children("div.placedata").first();
                var $pSimpleData = $divPlaceData.children("p.simpledata").first();
                var _description = $pSimpleData.first().text();
                var category = $pSimpleData.find("span.category").text();
                // Rated (PG13 etc.)
                var rated = $pSimpleData.find("span.rated").text();
                // Description. The description has the format: Year | FilmType | Duration
                var descriptionFields = _description.split("|");                    
                var year = descriptionFields[0].replace(category, "").trim();
                var filmType = descriptionFields[1].trim();
                var duration = descriptionFields[2].replace(rated, "").trim();
                var credits = $pSimpleData.next().text();
                var summary = $pSimpleData.next().next().text(); 
                var review = $divContainer.find(placeContainerSelector).children("p").text();
                var imdb = $divContainer.find("ul.tainialink").find("li a").first().attr("href");
                var theatersUrl = $divContainer.find("a.big-button").first().attr("href");
                var id = theatersUrl.match(/[\d]+$/)[0];
                var theaters = "";
                
                
                var film = {
                    id: id,
                    url: url,
                    image: image,
                    title: title,
                    origTitle: origTitle,
                    category: category,
                    year: year,
                    filmType: filmType,
                    duration: duration,
                    rated: rated,
                    credits: credits,
                    summary: summary,
                    review: review,
                    imdb: imdb,
                    theatersUrl: theatersUrl,
                    theaters: theaters
                };
                
                return film;
            }; // scrapeFilm     
            
            console.log(JSON.stringify(scrapeFilm()));
            console.log("");
                
        }, page.url); // page.evaluate
    }// If status == "success"
    else {
        console.error("Failed to open " + url);
    }
	
	phantom.exit();
});

