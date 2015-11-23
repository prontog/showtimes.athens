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
    
    var $areas = $('.piatsaname');                                
    ctx.check($areas, '$areas');
    
    $areas.each(function() {
        var $piatsaName = $(this);
        // The area the cinema is located at.
        var area = $piatsaName.children('a').text().trim();
        
        var $table = $piatsaName.next('table');
        ctx.check($table, '$table');
        while ($table[0] && $table[0].tagName === 'TABLE')
        {            
            var $tr_first = $table.find('tr').first();
            
            var $placename = $tr_first.find('a h3');
            ctx.check($placename, '$placename');
            var cinemaName = $placename.text().trim();
            var cinemaUrl = $placename.parent().attr('href');
            
            var $p_address = $placename.parent().next('p');
            ctx.check($p_address, '$p_address');
            var address = $p_address.text().trim();
            var map = $p_address.find('a').attr('href');
            
            var $p_phone = $p_address.next('p');
            ctx.check($p_phone, '$p_phone');
            var phone = $p_phone.text();
            
            var $p_tech_info = $p_phone.next('p');
            ctx.check($p_tech_info, '$p_tech_info');
            var tech_info = $p_tech_info[0] ? $p_tech_info.text() : '';
                        
            var $p_price = $p_tech_info.next('p');
            
            var price = '';
            if ($p_price.length) {
                price = $p_price.text().trim();
            } 
            else {
                price = tech_info;
                tech_info = '';
            }
            
            var $tr_second = $tr_first.next('tr');
            var rooms = $tr_second.text().trim();
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
            
            $table = $table.next();
        } // while table
    }); // each .piatsaname                                                        
}, filmId); // scrape