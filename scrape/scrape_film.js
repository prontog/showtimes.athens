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
    var $placeContainer = $(".place-container").first();
    ctx.check($placeContainer, "$placeContainer");
    
    // Page of film
    var url = ctx.url;
    // Image
    var $img = $placeContainer.find("img").first();
    ctx.check($img, "$img");
    var image = $img.attr("src");
                        
    var $h1_titles = $placeContainer.find("h1").first();
    ctx.check($h1_titles, "$h1_titles");
    // Original title (EN)
    var origTitle = $h1_titles.children("span").first().text().trim();
    // Title (GRE)
    var title_html = $h1_titles.html();
    var title = title_html.substr(0, title_html.search("<br>")).trim();
    // When both titles are the same, the span is empty.
    if (origTitle === "") {
        origTitle = title;
    }    
    // stars. The half stars for the film can be found in the last digit.
    //var stars = $placeContainer.children("div.stars15h")[0].className;
    // ToCheck: Do I need this?
    var $divPlaceData = $placeContainer.find("div.placedata").first();
    ctx.check($divPlaceData, "$divPlaceData");
    var $pSimpleData = $divPlaceData.children("p.simpledata").first();
    ctx.check($pSimpleData, "$pSimpleData");
    var _description = $pSimpleData.first().text().trim();
    var category = $pSimpleData.find("span.category").text().trim();
    // Rated (PG13 etc.)
    var rated = $pSimpleData.find("span.rated").text().trim();
    // Athinorama uses '-' for no rating.
    if (rated === "-") {
        rated = "";
    }
    // Description. The description has the format: Year | FilmType | Duration
    var descriptionFields = _description.split("|");                    
    var year = descriptionFields[0].replace(category, "").trim();
    var filmType = descriptionFields[1].trim();
    var duration = descriptionFields[2].replace(rated, "").trim();
    var credits = $pSimpleData.next().text().trim();
    var summary = $pSimpleData.next().next().text().trim(); 
    var review = $placeContainer.find("place-container").children("p").text().trim();
    var links = $placeContainer.find("ul.tainialink li");
    var imdb = links.find("a:contains('IMDB')").first();
    if (imdb) {
        imdb = imdb.attr("href");
    }
    var rottenTomatoes = links.find("a:contains('Rotten Tomatoes')").first();
    if (rottenTomatoes) {
        rottenTomatoes = rottenTomatoes.attr("href");
    }
    var officialSite = links.find("a:contains('Επίσημο website')").first();
    if (officialSite) {
        officialSite = officialSite.attr("href");
    }
    var theatersUrl = $placeContainer.find("a.big-button").first().attr("href");
    var id = theatersUrl.match(/[\d]+$/)[0];
    var theaters = "";
    
    var film = {
        id: id,
        url: url,
        image: "http://showtimes.ronto.net/data/img/" + id + ".jpg",
        athinoramaImage: "http://www.athinorama.gr/lmnts/events/cinema/" + id + "/Poster.jpg",
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
        rottenTomatoes: rottenTomatoes,
        officialSite: officialSite,
        theatersUrl: theatersUrl,
        theaters: theaters
    };
    
    console.log(JSON.stringify(film));        
}); // scrape