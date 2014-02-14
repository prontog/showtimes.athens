var fs = require("fs");
var webpage = require('webpage');
var env = require("system").env;
var os = require("system").os;

var logTime = false;

var prepareLogEntry = function(entry) {
    if (logTime) {
        var now = new Date();
        entry = now.toLocaleTimeString() + " " + entry;
    }
    
    return entry;
}

// Writes to standard error.
var writeToStderr = function(msg) {
    system.stderr.writeLine(prepareLogEntry(msg));
}

// Write to terminal. Note: This could be replaced by writeToStderr.
var writeToTerminal = function(msg) {
    if (os.name == "linux") {
	   fs.write("/dev/tty", prepareLogEntry(msg) + "\n");
    }
    else {
        writeToStderr(msg);
    }
}

// Writes to standard out.
var writeToConsoleLog = function(msg) {
    console.log(prepareLogEntry(msg));
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

// Checks if the resource URL ends with a specific suffix. Ignores trailling slash "/".
var resourceEndsWith = function(resource, suffix) {
    // Ignore trailing / by making sure both or neither strings end with it.
    if (resource[resource.length - 1] === "/" 
        && 
        suffix[suffix.length - 1] !== "/") 
    {
        suffix += "/";
    }
    
    return resource.indexOf(suffix, resource.length - suffix.length) !== -1;
}

// Subscribe to some of the events of the webpage.
var subscribeToPageEvents = function(page, debug) {    
    
    page.onAlert = function(msg) {
        writeToTerminal("->ALERT: " + msg);
    };
    
    page.onConfirm = function(msg) {
        writeToTerminal("->CONFIRM: " + msg);
        return true;  // `true` === pressing the "OK" button, `false` === pressing the "Cancel" button
    };
    
    page.onPrompt = function(msg, defaultVal) {
        writeToTerminal("->PROMPT: " + msg);
        return defaultVal;
    };
    
    page.onResourceRequested = function(requestData, networkRequest) {        
        // Allow only the resources of the initial request (page.open).
        // Note: url is a variable in all scrape scripts. Remember that this code is
        // injected (phantom.injectJs).
        if (!resourceEndsWith(requestData.url.toString(), url)) {
            networkRequest.abort();
            if (debug) {
                writeToTerminal('->Request (#' + requestData.id + '): ' + requestData.url);
                writeToTerminal('No match with Url: ' + url);
            }
        }
    };
    
    page.onResourceTimeout = function(request) {
        writeToTerminal('<-Response (#' + request.id + '): ' + request.url);
    };
    
    if (debug) {
        page.onError = errorHandler;
        
        page.onNavigationRequested = function(url, type, willNavigate, main) {
            writeToTerminal("->NavigationRequested");
            writeToTerminal('Trying to navigate to: ' + url);
            writeToTerminal('Caused by: ' + type);
            writeToTerminal('Will actually navigate: ' + willNavigate);
            writeToTerminal("Sent from the page's main frame: " + main);
        }
        
        page.onUrlChanged = function(targetUrl) {
            writeToTerminal('->UrlChanged: ' + targetUrl);
        };
        
        page.onResourceReceived = function(response) {
            writeToTerminal('<-Response (#' + response.id + ', stage "' + response.stage + '"): ' /*+ JSON.stringify(response)*/);
        };
        
        /*
        page.onResourceError = function(resourceError) {
            writeToTerminal('->ResourceError: Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')');
            writeToTerminal('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
        };*/
    }
}

// Wrap a scrape function inside a try-catch block and return
// the exception if any. Otherwise return null.
var tryCatchWrapper = function(funct, ctx) {
    // Validates a JQuery object. Throws if invalid.
    var check = function($obj, objName) {
        if ( ! $obj.length) {
            throw "check $obj=" + objName + " failed.";
        }
    }
    
    ctx.check = check;
    
    try {
        funct(ctx);
    }
    catch(e) {
        return e;
    }
    
    return null;
}

// Scrapes a url using custom scrape function (func).
// url is the url of the webpage to scrape.
// func is the actual scraping function.
// NOTE: Any other params passed will be added to a context object
//       that will be passed to func.
var scrape = function(url, func) {
    var otherArgs = [];
    for (var i = 2; i < arguments.length; i++) {
        otherArgs.push(arguments[i]);    
    }
    
    var context = {
        url: url,
        otherArgs: otherArgs
    };
    
    var page = webpage.create();
    
    // By default we do not was errors during loading the page
    // to polute the output.
    page.onError = doNothingHandler;
    // Subscribe to various events depending on the value of the DEBUG 
    // environment variable. 
    subscribeToPageEvents(page, env["DEBUG"]);
    
    var fatalErrorOccured = false;
    
    page.open(url, function(status) {
        if ( status === "success" ) {     
            // By subscribing to the console messages after the page has
            // been loaded we avoid the messages of the page.
            page.onConsoleMessage = writeToConsoleLog;
            // Reset the error handler if the doNothingHalder is stil set.
            if (page.onError === doNothingHandler) {
                page.onError = errorHandler;
            }
            
            page.injectJs("jquery.min.js");
            
            var error = page.evaluate(tryCatchWrapper, func, context);
            if (error) {
                fatalErrorOccured = true;                
                writeToStderr(JSON.stringify({ Error: error }));
            }
        }// If status == "success"
        else {
            fatalErrorOccured = true;
            errorHandler("Failed to open " + url);
        }
        
        // Note that the call to phantom.exit is delayed because phantomjs
        // seem to exit asynchronously (https://github.com/ariya/phantomjs/issues/11306).
        phantom.exit(fatalErrorOccured ? 1 : 0);
    });
}

// Inject JQuery
if (phantom.injectJs("jquery.min.js") === false) {
    system.stderr.writeLine("Missing jquery.min.js file.");
    phantom.exit(2);
}

// Posts JSON objects read from a file to a URL. 
// url is the url where the post will take place.
// filename is the path of a file containing JSON objects. One per row.
// transform is an optional function that can transform the data.
var post = function (url, filename, transform) {
    return send("POST", url, filename, transform);
}

// Updates JSON objects read from a file to a URL. 
// url is the url where the update will take place.
// filename is the path of a file containing JSON objects. One per row.
// transform is an optional function that can transform the data.
var put = function (url, filename, transform) {
    return send("PUT", url, filename, transform);
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
            try {
                var data = JSON.parse(line);
            } catch (e) {
                system.stderr.writeLine("Could not parse: " + line);
                system.stderr.writeLine(JSON.stringify(e));
                return 1;
            }
            
            if (transform) {
                try {
                    data = transform(data);
                } catch (e) {
                    system.stderr.writeLine("Error while transforming data.");
                    system.stderr.writeLine(JSON.stringify(e));
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
                dataType: "json",
                success: function (response) {
                    console.log(JSON.stringify(response));
                },
                error: function (xhr, status, thrown) {
                    errorCount++;
                    system.stderr.writeLine(status);
                    system.stderr.writeLine(JSON.stringify(xhr));
                },
                complete: function (xhr, status) {
                    //system.stderr.writeLine(status);
                    //system.stderr.writeLine(JSON.stringify(xhr));
                }
            });
        }
    } 
    finally {
        file.close();
    }    
    
    return errorCount;
}