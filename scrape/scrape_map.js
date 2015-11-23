/*globals phantom:true, $:true */
'use strict';

var system = require('system');
var common = require('./common.js');
    if (! common) {
    system.stderr.writeLine('Missing common.js file.');
    phantom.exit(2);
}

// CLI arguments
var args = system.args;
var url = null;
var filmId = null;

if (args.length !== 3) {
    common.writeToStderr('usage: phantomjs ' + phantom.scriptName + ' FILM_ID URL');
    phantom.exit(1);
} else {
    filmId = args[1];
    url = args[2];
}

common.scrape(url, function(ctx) {
    var id = ctx.otherArgs[0];
    
    var $script = $('#map_canvas').next('script');
    var text = $script.text().split('=')[1].trim();
    var mapCoords = eval(text);
    $.each(mapCoords, function(n, o){
        console.log(JSON.stringify(o));
    });
    
                                                            
}, filmId); // scrape