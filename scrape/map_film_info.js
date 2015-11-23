/*globals phantom:true, $:true */
'use strict';

var system = require('system');
var fs = require('fs');
var common = require('./common.js');
if (! common) {
    console.log('Missing common.js file.');
    phantom.exit(2);
}

// CLI arguments
var args = system.args;
var filename = null;

if (args.length !== 2) {
    common.writeToStderr('usage: phantomjs ' + phantom.scriptName + ' FILMS_FILE');
    phantom.exit(1);
} else {
    filename = args[1];
    if (!fs.exists(filename)) {
        common.writeToStderr('File not exist: ' + filename);
        phantom.exit(1);
    }
}

var filmsFile = fs.open(filename, 'r');
var fatalErrorOccured = false;    
    
try {    
    while (!filmsFile.atEnd()) {
        var line = filmsFile.readLine();
        try {
            var film = JSON.parse(line);
            //console.log('\'' + film.id + '\' \'' + film.image + '\' \'' + film.theatersUrl + '\'');
            console.log(film.id + ' ' + film.image + ' ' + film.theatersUrl);
        } catch (e) {
            common.writeToStderr('Could not parse: ' + line);
            common.writeToStderr(JSON.stringify(e));
            fatalErrorOccured = true;
        }
    }
} 
finally {
    filmsFile.close();
}

phantom.exit(fatalErrorOccured ? 1 : 0);