/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals _:true, $:true */
/*globals FileError:true, LocalFileSystem:true, FileReader:true, FileTransfer:true */
"use strict";

var data = {
    newFilms: [],
    allFilms: []
};

var logger = {
    appName: "[Showtimes]",
    log: function(msg) {
        console.log(this.prepareLogEntry(msg));
    },
    error: function(msg) {
        console.log(this.prepareLogEntry(msg, "Error"));
    },
    prepareLogEntry: function(entry, category) {    
        var header = this.appName + " ";
        if (category) {
            header += category + ": ";
        }
        entry = header + entry;        
        return entry;
    }
};

var loadFilms = function(films, $ul) {
    logger.log("loadFilms: started");
    
    // Remove all elements from the list.
    $ul.empty();
    
    var items = [];
    _.forEach(films, function(f) {
        items.push("<li><a href=\"#\">" + f.title + "</a></li>");
    });
    // Add new elements.
    $ul.append(items.join(""));
    
    logger.log("Loaded " + items.length + " films.");
};


var appFS= {
    SIZE: 5 * 1024 * 1024,
    _fs: null,
    root: null,
    errorHandler: function(e) {
        var msg = '';
    
        switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
            msg = 'QUOTA_EXCEEDED_ERR';
            break;
        case FileError.NOT_FOUND_ERR:
            msg = 'NOT_FOUND_ERR';
            break;
        case FileError.SECURITY_ERR:
            msg = 'SECURITY_ERR';
            break;
        case FileError.INVALID_MODIFICATION_ERR:
            msg = 'INVALID_MODIFICATION_ERR';
            break;
        case FileError.INVALID_STATE_ERR:
            msg = 'INVALID_STATE_ERR';
            break;
        default:
            msg = 'Unknown Error';
            break;
        }

        logger.error(msg);
    },
    // Initiate the filesystem.
    init: function (callback) {
        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
    
        if (window.requestFileSystem) {
            window.requestFileSystem(LocalFileSystem.PERSISTENT, appFS.SIZE, function(filesystem) {
                logger.log("File system initialized");
                appFS._fs = filesystem;
                appFS.root = appFS._fs.root;
                if (callback) {
                    callback();
                }
            }, appFS.errorHandler);
        }
    },
    // Read the contents of a file to an array.
    readFile: function(fileURL, success) {
        logger.log("readFile " + fileURL);
        appFS.root.getFile(fileURL, {}, function(fileEntry) {
            logger.log("appFS.root.getFile " + fileURL);
            // Get a File object representing the file,
            // then use FileReader to read its contents.
            fileEntry.file(function(file) {
                logger.log("fileEntry.file " + fileURL);
                var reader = new FileReader();
                reader.onloadend = function(e) {
                    if (success) {
                        success(this.result);
                    }
                };
                reader.readAsText(file);
            }, appFS.errorHandler);    
        }, appFS.errorHandler);
    }
};

var app = {
    URL_NEW_ARRIVALS: "https://raw.github.com/prontog/showtimes.athens/29ebb8a168cea468bee2e47240e88036f4ef173f/scrape/samples/new_arrivals.json",
    URL_ALL_FILMS: "https://raw.github.com/prontog/showtimes.athens/master/scrape/samples/all_films.json",
    FILE_NEW_ARRIVALS: "new_arrivals.json",
    FILE_ALL_FILMS: "all_films.json",
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    prepareViews: function() {
        loadFilms(data.newFilms, $("#new ul"));
        loadFilms(data.allFilms, $("#all ul"));
    },
    loadData: function(filename, to, callback) {
        appFS.readFile(filename, function(text) {
            var allLines = text.split("\n");
            
            logger.log("Number of lines:" + allLines.length);
            
            // Clear the array;
            to.length = 0;
            // Parse each line and add to the array.
            _.forEach(allLines, function(line) {
                try {
                    if (line.length > 0) {
                        to.push(JSON.parse(line));
                    }
                }
                catch(e) {
                    logger.error("parsing " + line);
                }
            });
            
            if (callback) {
                callback();
            }
        });
    },
    download: function(url, filename, callback) {
        var fileTransfer = new FileTransfer();
        var uri = encodeURI(url);
        var fileURL = appFS.root.toURL() + filename;

        fileTransfer.download(
            uri,
            fileURL,
            function(entry) {
                logger.log("Download completed: " + entry.fullPath);
                if (callback) {
                    callback();
                }
            },
            function(error) {
                logger.error("downloading " + JSON.stringify(error));
                //$("div[data-role='footer']").html("download failed");
            }
        );
    },
    update: function(callback) {
        this.download(this.URL_NEW_ARRIVALS, 
                      this.FILE_NEW_ARRIVALS, 
                      function() {
                        app.loadData(app.FILE_NEW_ARRIVALS, data.newFilms, callback);
                      });
        
        this.download(this.URL_ALL_FILMS, 
                      this.FILE_ALL_FILMS, 
                      function() {
                        app.loadData(app.FILE_ALL_FILMS, data.allFilms, callback);
                      });
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        //app.receivedEvent('deviceready');
        appFS.init(function() {
            var needsUpdate = true;
        
            if (needsUpdate) {
                app.update(function() {
                    app.prepareViews();
                });    
            }
            else {
                app.prepareViews();
            }
        });
    }
//    // Update DOM on a Received Event
//    receivedEvent: function(id) {
//        logger.log('Received Event: ' + id);
//    }
};
