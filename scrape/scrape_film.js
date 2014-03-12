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
    var placeContainerSelector = "div.place-container";
    var $divContainer = $(placeContainerSelector).first();
    ctx.check($divContainer, "$divContainer");
    
    // Page of film
    var url = ctx.url;
    // Image
    var image = $divContainer.children("img").first().attr("src");
                        
    var $h1_titles = $divContainer.children("h1").first();
    ctx.check($h1_titles, "$h1_titles");
    // Original title (EN)
    var origTitle = $h1_titles.children("span").first().text().trim();
    // Title (GRE)
    var title = $h1_titles.text().replace(origTitle, "").trim();
    // stars. The half stars for the film can be found in the last digit.
    var stars = $divContainer.children("div.stars15h")[0].className;
    // ToCheck: Do I need this?
    var $divPlaceData = $divContainer.children("div.placedata").first();
    ctx.check($divPlaceData, "$divPlaceData");
    var $pSimpleData = $divPlaceData.children("p.simpledata").first();
    ctx.check($pSimpleData, "$pSimpleData");
    var _description = $pSimpleData.first().text().trim();
    var category = $pSimpleData.find("span.category").text().trim();
    // Rated (PG13 etc.)
    var rated = $pSimpleData.find("span.rated").text().trim();
    // Description. The description has the format: Year | FilmType | Duration
    var descriptionFields = _description.split("|");                    
    var year = descriptionFields[0].replace(category, "").trim();
    var filmType = descriptionFields[1].trim();
    var duration = descriptionFields[2].replace(rated, "").trim();
    var credits = $pSimpleData.next().text().trim();
    var summary = $pSimpleData.next().next().text().trim(); 
    var review = $divContainer.find(placeContainerSelector).children("p").text().trim();
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
    
    console.log(JSON.stringify(film));        
}); // scrape