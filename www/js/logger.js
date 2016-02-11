/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals define:true, cordova: true */

define(function() {
    'use strict';
    var logger = {
        appName: '[Showtimes]',
        log: function(msg) {
            console.log(this.prepareLogEntry(msg));
            //steroids.logger.log(this.prepareLogEntry(msg));
        },
        error: function(msg) {
            console.log(this.prepareLogEntry(msg, 'Error'));
            //steroids.logger.log(this.prepareLogEntry(msg, 'Error'));
        },
        prepareLogEntry: function(entry, category) {
            var header = this.appName + ' ';
            if (category) {
                header += category + ': ';
            }
            entry = header + entry;
            return entry;
        }
    };
    
    return logger;
});