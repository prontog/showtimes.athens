/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals require:true */
require.config({
    // 3rd party script alias names (Easier to type 'jquery' than 'libs/jquery-1.8.3.min')
    paths: {
        // Core Libraries
        'jquery': 'jquery-1.10.2.min',
        'jquerymobile': 'jquery.mobile-1.4.5.min',
        'underscore': 'underscore-min',
        'backbone': 'backbone-min',
        'tinypubsub': 'jquery.ba-tinypubsub.min'
    },

    // Sets the configuration for your third party scripts that are not AMD compatible
    shim: {
        backbone: {
            deps: ['jquery', 'underscore'],
            exports: 'Backbone'
        },
        underscore: {
            exports: '_'
        },
        tinypubsub: {
            deps: ['jquery']
        }
    } // end Shim Configuration
});

// Includes File Dependencies
require([ 'jquery' ], function($) {
    'use strict';
    $( document ).on('mobileinit', function() {
                console.log('Received Event: mobileinit');
                // Prevents all anchor click handling
                $.mobile.linkBindingEnabled = false;
                // Disabling this will prevent jQuery Mobile from handling hash changes
                $.mobile.hashListeningEnabled = false;
                //$.mobile.ajaxEnabled = false;
                //$.mobile.pushStateEnabled = false;
                //$.mobile.changePage.defaults.changeHash = false;
            });
        
    require(['jquerymobile', 'app'], function(Mobile, showtimes) {
        showtimes.app.initialize();
        // Make app available globally. For debugging purposes.
        window.showtimes = showtimes;
    });
});
