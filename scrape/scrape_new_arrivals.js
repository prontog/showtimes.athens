/*globals phantom:true, $:true */
'use strict';

var system = require('system');
var common = require('./common.js');
if (! common) {
    console.log('Missing common.js file.');
    phantom.exit(2);
}

// CLI arguments
var args = system.args;
var url = null;

if (args.length !== 2) {
    common.writeToStderr('usage: phantomjs ' + phantom.scriptName + ' URL');
    phantom.exit(1);
} else {
    url = args[1];
}

common.scrape(url, function(ctx) {
    var $films = $('#Div3 div.plainlist a');
    ctx.check($films, '$films');

    $films.each(function() {     
        var filmUrl = $(this).attr('href');                    
        console.log(filmUrl);
    }); // each                                
});