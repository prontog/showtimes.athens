var system = require("system");

// Inject common code. Includes error handling.
if (phantom.injectJs("common.js") == false) {
    console.log("Missing common.js file.");
    phantom.exit(2);
}

// CLI arguments
var args = system.args;
var url = null;

if (args.length != 2) {
    writeToStderr("usage: phantomjs " + phantom.scriptName + " URL");
    phantom.exit(1);
} else {
    url = args[1];
}

scrape(url, function(ctx) {          
    var $newArrivals = $("#ctl00_ctl00_Stiles_Left_uc_CinemaFilterMain_pnlNewArrivals");                                
    ctx.check($newArrivals, "$newArrivals");
    
    var $a = $newArrivals.first().find("a");
    ctx.check($a, "$a");
    
    $a.each(function() {
        // Url of the new arrival.
        var filmUrl = $(this).attr("href");
        ctx.check(filmUrl, "$this.href");
        console.log(filmUrl);                    
    }); // each                                                       
}); // scrape