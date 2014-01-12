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

//page.onError = doNothingHandler;
page.onError = errorHandler;

// ToDo: This should be replaced by the actual url passed as param 1.
var url = "film_showtimes.html";

page.open(url, function(status) {
    if ( status === "success" ) {
		page.injectJs("jquery.min.js");
        
        page.evaluate(function() {
            var scrapeFilmShowtimes = function() {
                var $areas = $("div.piatsaname");
                
                var filmShowtimes = [];
                
                $areas.each(function() {
                    var $piatsaName = $(this);
                    // The area the cinema is located at.
                    var area = $piatsaName.children("a").text().trim();
                    
                    var $next = $piatsaName.next();
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
                        
                        filmShowtimes.push(showtime);
                        
                        $next = $next.next();
                    } // while table
                }); // each div.piatsaname
                
                return filmShowtimes;
	    }; // scrapeFilmShowtimes     
            
            var showtimes = scrapeFilmShowtimes();
            showtimes.forEach(function(s) { 
                console.log(JSON.stringify(s));
                console.log();
            });
            
        }); // page.evaluate
    }// If status == "success"
    else {
        console.error("Failed to open " + url);
    }
	
	phantom.exit();
});
