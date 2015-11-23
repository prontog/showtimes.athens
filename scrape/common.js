/*globals phantom:true, $:true */
module.exports = (function() {
    'use strict';

    var fs = require('fs');
    var _webpage = require('webpage');
    var _system = require('system');
    var _env = _system.env;
    var _os = _system.os;

    // Check PhantomJS version. Versions prion to 1.9 are not suppoerted on Windows.
    //This is because system.stderr was introduced in version 1.9.
    var phantomVersion = phantom.version;
    if (_os.name === 'windows' 
        && phantomVersion.major < 2 
        && phantomVersion.minor < 9) {
        console.log('PhantomJS versions prion to 1.9 are not supported on Windows.');
        phantom.exit(1);
    }

    // Tracing settings.
    var debug = _env['DEBUG'];
    var logTime = _env['DEBUG_TIME'];

    /* -----Functions------ */

    var prepareLogEntry = function(entry) {
        if (logTime) {
            var now = new Date();
            entry = now.toLocaleTimeString() + ' ' + entry;
        }

        return entry;
    };

    // Writes to standard error.
    var writeToStderr = function(msg) {
        msg = prepareLogEntry(msg);
        if (_system.stderr) {
            _system.stderr.writeLine(msg);
        }
        else { //PhantomJS versions prior to 1.9.
            fs.write('/dev/stderr', prepareLogEntry(msg) + '\n');
        }
    };

    // Write to terminal. Note: This could be replaced by writeToStderr.
    var writeToTerminal = function(msg) {
        if (_os.name === 'linux') {
           fs.write('/dev/tty', prepareLogEntry(msg) + '\n');
        }
        else {
            writeToStderr(msg);
        }
    };

    // Writes to standard out.
    var writeToConsoleLog = function(msg) {
        console.log(msg);
    };

    var writeDebugInfo = function(msg) {
        if (debug) {
            writeToTerminal(msg);
        }
    };

    // Error handler that outputs the error message and stack trace to std error.
    var errorHandler = function(msg, trace) {
        var msgStack = ['ERROR: ' + msg];

        if (trace && trace.length) {
            msgStack.push('TRACE:');
            trace.forEach(function(t) {
                msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
            });
        }

        writeToStderr(msgStack.join('\n'));
    };

    // Error handler that ignores all errors.
    var doNothingHandler = function(msg, trace) { };

    // Checks if the resource URL ends with a specific suffix. Ignores trailling slash '/'.
    var resourceEndsWith = function(resource, suffix) {
        // Ignore trailing / by making sure both or neither strings end with it.
        if (resource[resource.length - 1] === '/' 
            && 
            suffix[suffix.length - 1] !== '/') 
        {
            suffix += '/';
        }

        return resource.indexOf(suffix, resource.length - suffix.length) !== -1;
    };

    // Subscribe to some of the events of the webpage.
    var subscribeToPageEvents = function(page) {    

        page.onAlert = function(msg) {
            writeToTerminal('->ALERT: ' + msg);
        };

        page.onConfirm = function(msg) {
            writeToTerminal('->CONFIRM: ' + msg);
            return true;  // `true` === pressing the 'OK' button, `false` === pressing the 'Cancel' button
        };

        page.onPrompt = function(msg, defaultVal) {
            writeToTerminal('->PROMPT: ' + msg);
            return defaultVal;
        };

        page.onResourceRequested = function(requestData, networkRequest) {        
            // Allow only the resources of the initial request (page.open).
            // Note: url is a variable in all scrape scripts. Remember that this code is
            // injected (phantom.injectJs).
            if (!resourceEndsWith(requestData.url.toString(), page.url)) {
                writeDebugInfo('->Request (#' + requestData.id + '): ' + requestData.url);
                writeDebugInfo('No match with Url: ' + page.url);
                if (networkRequest) {
                    networkRequest.abort();
                }
            }
        };

        page.onResourceTimeout = function(request) {
            writeToTerminal('<-ResourceTimeout (#' + request.id + '): ' + request.url);
            writeToTerminal('errorString: ' + request.errorString + '(' + request.errorCode + ')');
            phantom.exit(1);
        };

        // Depending on the value of the DEBUG environment variable, subscribe to more events. 
        if (debug) {
            page.onError = errorHandler;

            page.onNavigationRequested = function(url, type, willNavigate, main) {
                writeToTerminal('->NavigationRequested');
                writeToTerminal('Trying to navigate to: ' + url);
                writeToTerminal('Caused by: ' + type);
                writeToTerminal('Will actually navigate: ' + willNavigate);
                writeToTerminal('Sent from the page\'s main frame: ' + main);
            };

            page.onUrlChanged = function(targetUrl) {
                writeToTerminal('->UrlChanged: ' + targetUrl);
            };

            page.onResourceReceived = function(response) {
                writeToTerminal('<-Response (#' + response.id + ', stage "' + response.stage + '"): ' /*+ JSON.stringify(response)*/);
            };


            page.onResourceError = function(resourceError) {
                writeToTerminal('->ResourceError: Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')');
                writeToTerminal('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
            };
        }
    };

    // Wrap a scrape function inside a try-catch block and return
    // the exception if any. Otherwise return null.
    var tryCatchWrapper = function(funct, ctx) {
        // Validates a JQuery object. Throws if invalid.
        var check = function($obj, objName) {
            if ( ! $obj.length) {
                throw 'check $obj=' + objName + ' failed.';
            }
        };

        ctx.check = check;

        try {
            funct(ctx);
        }
        catch(e) {
            return e;
        }

        return null;
    };

    // Scrapes a url using custom scrape function (func).
    // url is the url of the webpage to scrape.
    // func is the actual scraping function.
    // NOTE: Any other params passed will be added to a context object
    //       that will be passed to func.
    var scrape = function(url, func) {
        writeDebugInfo('***** scrape(' + url + ') *****');

        var i;
        var otherArgs = [];
        for (i = 2; i < arguments.length; i++) {
            otherArgs.push(arguments[i]);    
        }

        var context = {
            url: url,
            otherArgs: otherArgs
        };

        var page = _webpage.create();

        // page.settings.resourceTimeout = 5000; // 5 seconds
        // page.settings.loadImages = false;
        // page.settings.javascriptCanOpenWindows = false;

        // By default we do not was errors during loading the page
        // to polute the output.
        page.onError = doNothingHandler;
        // Subscribe to various events.
        subscribeToPageEvents(page);

        var fatalErrorOccured = false;

        page.open(url, function(status) {
            if ( status === 'success' ) {
                writeDebugInfo('Page opened succefully.');

                // By subscribing to the console messages after the page has
                // been loaded we avoid the messages of the page.
                page.onConsoleMessage = writeToConsoleLog;
                // Reset the error handler if the doNothingHalder is stil set.
                if (page.onError === doNothingHandler) {
                    page.onError = errorHandler;
                }

                page.injectJs('jquery.min.js');

                var error = page.evaluate(tryCatchWrapper, func, context);
                if (error) {
                    fatalErrorOccured = true;                
                    writeToStderr(JSON.stringify({ Error: error }));
                }
            }
            else { // Failed to open page.
                fatalErrorOccured = true;
                errorHandler('Failed to open ' + url);
            }

            // Note that the call to phantom.exit is delayed because phantomjs
            // seem to exit asynchronously (https://github.com/ariya/phantomjs/issues/11306).
            phantom.exit(fatalErrorOccured ? 1 : 0);
        });
    };

    //phantom.exit(1);
    //this is a timeout to make sure the phantom process eventually stops
    // window.setTimeout(function(){
    //     writeToStderr('Timed out!');
    //     phantom.exit(1);
    // }, 100000);

    phantom.onError = function(msg, trace) {
        errorHandler(msg, trace);
        phantom.exit(1);
    };

    // Inject JQuery
    if (phantom.injectJs('jquery.min.js') === false) {
        writeToStderr('Missing jquery.min.js file.');
        phantom.exit(2);
    }

    // Sends JSON objects read from a file to a URL. 
    // url is the url where the action will take place.
    // filename is the path of a file containing JSON objects. One per row.
    // transform is an optional function that can transform the data.
    var send = function (type, url, filename, transform) {
        var errorCount = 0;
        var file = fs.open(filename, 'r');

        try {    
            while (!file.atEnd()) {
                var line = file.readLine();
                var data = null;
                try {
                    data = JSON.parse(line);
                } catch (e) {
                    writeToStderr('Could not parse: ' + line);
                    writeToStderr(JSON.stringify(e));
                    return 1;
                }

                if (transform) {
                    try {
                        data = transform(data);
                    } catch (err) {
                        writeToStderr('Error while transforming data.');
                        writeToStderr(JSON.stringify(err));
                        return 1;
                    }
                }

                // Using JQuery AJAX, post the .
                $.ajax({
                    async: false,
                    timeout: 5000,
                    url: url,
                    type: type,
                    data: data,
                    dataType: 'json',
                    success: function (response) {
                        console.log(JSON.stringify(response));
                    },
                    error: function (xhr, status, thrown) {
                        errorCount++;
                        writeToStderr(status);
                        writeToStderr(JSON.stringify(xhr));
                    },
                    complete: function (xhr, status) {
                        //writeToStderr(status);
                        //writeToStderr(JSON.stringify(xhr));
                    }
                });
            }
        } 
        finally {
            file.close();
        }    

        return errorCount;
    };

    // Posts JSON objects read from a file to a URL. 
    // url is the url where the post will take place.
    // filename is the path of a file containing JSON objects. One per row.
    // transform is an optional function that can transform the data.
    var post = function (url, filename, transform) {
        return send('POST', url, filename, transform);
    };

    // Updates JSON objects read from a file to a URL. 
    // url is the url where the update will take place.
    // filename is the path of a file containing JSON objects. One per row.
    // transform is an optional function that can transform the data.
    var put = function (url, filename, transform) {
        return send('PUT', url, filename, transform);
    };

    return {        
        scrape: scrape,
        writeToStderr: writeToStderr,
        post: post,
        put: put
    };
}());