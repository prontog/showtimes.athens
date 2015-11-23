/*globals phantom:true */
'use strict';

var updateInfo = {};
updateInfo.date = new Date().getTime();

console.log(JSON.stringify(updateInfo));

phantom.exit(0);