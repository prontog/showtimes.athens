var system = require('system');
var page = require('webpage').create();

// CLI arguments
var args = system.args;
var url = null;

if (args.length != 2) {
    console.log("usage: phantomjs " + phantom.scriptName + " URL");
    phantom.exit(1);
} else {
    url = args[1];
}

// Inject common code. Includes error handling.
if (phantom.injectJs("common.js") == false) {
    console.log("Missing common.js file.");
    phantom.exit(2);
}

scrape(page, url, function() {                        
    var $newArrivals = $("#ctl00_ctl00_Stiles_Left_uc_CinemaFilterMain_pnlNewArrivals");                                
    
    $newArrivals.first().find("a").each(function() {
        // Page of new arrival
        var page = $(this).attr("href");
        console.log(page);                    
    }); // each                                                       
}); // scrape