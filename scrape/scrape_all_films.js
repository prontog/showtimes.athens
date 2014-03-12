/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals _:true, $:true */
/*globals require:true, phantom:true, writeToStderr:true, scrape:true */
"use strict";

var system = require("system");

// Inject common code. Includes error handling.
if (phantom.injectJs("common.js") === false) {
    console.log("Missing common.js file.");
    phantom.exit(2);
}

// CLI arguments
var args = system.args;
var url = null;

if (args.length !== 2) {
    writeToStderr("usage: phantomjs " + phantom.scriptName + " URL");
    phantom.exit(1);
} else {
    url = args[1];
}

scrape(url, function(ctx) {
    var $films = $("h2.placename");
    ctx.check($films, "$films");
    
    $films.each(function() {     
        var $a = $(this).children("a").first();
        ctx.check($a, "$a");
        // Url of film.
        var filmUrl = $a.attr("href");                    
        console.log(filmUrl);
    }); // each                                
});
