/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals _:true, $:true */
/*globals require:true, phantom:true, writeToStderr:true */
"use strict";

var system = require("system");
var fs = require("fs");

// Inject common code. Includes error handling.
if (phantom.injectJs("common.js") === false) {
    console.log("Missing common.js file.");
    phantom.exit(2);
}

// CLI arguments
var args = system.args;
var filename = null;

if (args.length !== 2) {
    writeToStderr("usage: phantomjs " + phantom.scriptName + " FILMS_FILE");
    phantom.exit(1);
} else {
    filename = args[1];
    if (!fs.exists(filename)) {
        writeToStderr("File not exist: " + filename);
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
            //console.log("\"" + film.id + "\" \"" + film.image + "\" \"" + film.theatersUrl + "\"");
            console.log(film.id + " " + film.image + " " + film.theatersUrl);
        } catch (e) {
            writeToStderr("Could not parse: " + line);
            writeToStderr(JSON.stringify(e));
            fatalErrorOccured = true;
        }
    }
} 
finally {
    filmsFile.close();
}

phantom.exit(fatalErrorOccured ? 1 : 0);