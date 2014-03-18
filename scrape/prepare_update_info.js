/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals require:true, phantom:true */
"use strict";

var updateInfo = {};
updateInfo.date = new Date().getTime();

console.log(JSON.stringify(updateInfo));

phantom.exit(0);