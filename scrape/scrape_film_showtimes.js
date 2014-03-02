var system = require("system");

// Inject common code. Includes error handling.
if (phantom.injectJs("common.js") == false) {
    console.log("Missing common.js file.");
    phantom.exit(2);
}

// CLI arguments
var args = system.args;
var url = null;
var filmId = null;

if (args.length != 3) {
    writeToStderr("usage: phantomjs " + phantom.scriptName + " FILM_ID URL");
    phantom.exit(1);
} else {
    filmId = args[1];
    url = args[2];
}

scrape(url, function(ctx) {
    var id = ctx.otherArgs[0];
    
    var $areas = $("div.piatsaname");                                
    ctx.check($areas, "$areas");
    
    $areas.each(function() {
        var $piatsaName = $(this);
        // The area the cinema is located at.
        var area = $piatsaName.children("a").text().trim();
        
        var $next = $piatsaName.next();
        ctx.check($next, "$next");
        while ($next[0] && $next[0].tagName == "TABLE")
        {
            var $table = $next;
            
            var $placename = $table.find("h2 a");
            var cinemaName = $placename.text().trim();
            var cinemaUrl = $placename.attr("href");
            
            var $tr_placename = $placename.parent().parent().parent().next();
            var $tr_p = $tr_placename.find("p");
    
            var $p_address = $tr_p.first();
            var address = $p_address.text().trim();
            var map = $p_address.find("a").attr("href");
            
            var $p_phone = $p_address.next("p");
            var phone = $p_phone.text();
            
            var $p_tech_info = $p_phone.next("p");
            var tech_info = $p_tech_info[0] ? $p_tech_info.text() : "";
            
            var $tr_price = $tr_placename.next("tr");
            var price = $tr_price.find("p").text().trim();
            
            var rooms = $tr_price.next("tr").text().trim();
            // ToDo: Probably should split the rooms into an array.
            
            var showtime = {
                filmId: id,
                area: area,
                cinemaName: cinemaName,
                cinemaUrl: cinemaUrl,
                address: address,
                map: map,
                phone: phone,
                tech_info: tech_info,
                price: price,
                rooms: rooms
            };
            
            console.log(JSON.stringify(showtime));                        
            
            $next = $next.next();
        } // while table
    }); // each div.piatsaname                                                        
}, filmId); // scrape