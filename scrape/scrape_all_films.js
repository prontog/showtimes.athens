var system = require('system');

// Inject common code. Includes error handling.
if (phantom.injectJs("common.js") == false) {
    console.log("Missing common.js file.");
    phantom.exit(2);
}

// CLI arguments
var args = system.args;
var url = null;

if (args.length != 2) {
    console.log("usage: phantomjs " + phantom.scriptName + " URL");
    phantom.exit(1);
} else {
    url = args[1];
}

scrape(url, function(ctx) {
    var $films = $("h2.placename");
                                    
    $films.each(function() {
        var $a = $(this).children("a").first();
        // Url of film.
        var filmUrl = $a.attr("href");                    
        console.log(filmUrl);
    }); // each                                
});
