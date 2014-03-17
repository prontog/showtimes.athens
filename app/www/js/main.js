/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals _:true, $:true */
/*globals FileError:true, LocalFileSystem:true, FileReader:true, FileTransfer:true */
"use strict";

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

var events = {
    FILE_SYSTEM_READY: "fs_ok",
    NEW_FILMS_DOWNLOADED: "new_d",
    NEW_FILMS_LOADED: "new_l",
    ALL_FILMS_DOWNLOADED: "all_films_d",
    ALL_FILMS_LOADED: "all_films_l",
    SHOWTIMES_DOWNLOADED: "show_d",
    SHOWTIMES_LOADED: "show_l",
    DOWNLOADING_COMPLETED: "down_ok",
    LOADING_COMPLETED: "load_ok"
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
        logger.log("appFS.init");
        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
    
        if (window.requestFileSystem) {
            window.requestFileSystem(LocalFileSystem.PERSISTENT, appFS.SIZE, function(filesystem) {
                logger.log("File system initialized");
                appFS._fs = filesystem;
                appFS.root = appFS._fs.root;
                // Notify subscribers that the file system is ready.
                $.publish(events.FILE_SYSTEM_READY);
            }, appFS.errorHandler);
        }
    },
    // Read the contents of a file to an array.
    readFile: function(fileURL, success) {
        logger.log("appFS.readFile " + fileURL);
        appFS.root.getFile(fileURL, {}, function(fileEntry) {
            logger.log("appFS.root.getFile " + fileURL);
            // Get a File object representing the file,
            // then use FileReader to read its contents.
            fileEntry.file(function(file) {
                logger.log("fileEntry.file " + fileURL);
                
                var reader = new FileReader();
                reader.onloadend = function(e) {
                    if (success) {
                        // 'this' is the reader and the result is
                        // the file text.
                        success(this.result);
                    }
                };
                
                reader.readAsText(file);
            }, appFS.errorHandler);    
        }, appFS.errorHandler);
    }
};

var data = {
    newFilms: [],
    allFilms: [],
    showtimes: [],
    loadFromFile: function(filename, to, callback) {
        logger.log("data.loadFromFile");
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
    tmp: {
        newFilms: [],
        allFilms: [],
        showtimes: []
    },
    exchange: function() {
        logger.log("data.exchange");
        data.newFilms = data.tmp.newFilms;
        data.allFilms = data.tmp.allFilms;
        data.allShowtimes = data.tmp.showtimes;
    },
    bindEvents: function() {
        logger.log("data.bindEvents");
        $.subscribe(events.DOWNLOADING_COMPLETED, data.exchange);
        $.subscribe(events.NEW_FILMS_DOWNLOADED, function(e, filename) {
            data.loadFromFile(filename, data.newFilms, function() {
                $.publish(events.NEW_FILMS_LOADED, [data.newFilms]);                        
            });
        });
        $.subscribe(events.ALL_FILMS_DOWNLOADED, function(e, filename) {
            data.loadFromFile(filename, data.allFilms, function() {
                $.publish(events.ALL_FILMS_LOADED, [data.allFilms]);
            });
        });
        $.subscribe(events.SHOWTIMES_DOWNLOADED, function(e, filename) {
            data.loadFromFile(filename, data.showtimes, function() {
                $.publish(events.SHOWTIMES_LOADED, [data.showtimes]);
            });
        });
    }
};

var views = {
    renderFilm: function(film) {
        return "<li><a href=\"#\">" + film.title + "</a></li>";
    },
    renderSimple: function(title) {
        return "<li><a href=\"#\">" + title + "</a></li>";
    },
    prepareFilms: function(films, $ul) {
        logger.log("views.loadFilms: started");
        
        // Remove all elements from the list.
        $ul.empty();
        
        var items = [];
        _.chain(films).sortBy("title").forEach(function(f) {
            items.push(views.renderFilm(f));
        });
        // Add new elements.
        $ul.append(items.join(""));
        
        logger.log("Loaded " + items.length + " films.");
    },
    prepareCategories: function(films, $ul) {
        logger.log("views.loadCategories: started");
        
        // Remove all elements from the list.
        $ul.empty();
        
        var categories = _.chain(films).map(function(o) {
            return o.category;
        }).uniq().sort().value();
        
        var items = [];
        _.forEach(categories, function(c) {
            items.push(views.renderSimple(c));
        });
        
        // Add new elements.
        $ul.append(items.join(""));
        
        logger.log("Loaded " + items.length + " categories.");
    },
    prepareAll: function() {
        views.prepareFilms(data.newFilms, $("#new ul"));
        views.prepareFilms(data.allFilms, $("#all ul"));
        views.prepareCategories(data.allFilms, $("#categories ul"));
    },
    bindEvents: function() {
        $.subscribe(events.LOADING_COMPLETED, views.prepareAll);
        $.subscribe(events.NEW_FILMS_LOADED, function(e, films) {
            views.prepareFilms(films, $("#new ul"));
        });
        $.subscribe(events.ALL_FILMS_LOADED, function(e, films) {
            views.prepareFilms(films, $("#all ul"));
        });
        $.subscribe(events.ALL_FILMS_LOADED, function(e, films) {
            views.prepareCategories(films, $("#categories ul"));
        });
    }
};

var app = {
    URL_NEW_ARRIVALS: "https://raw.github.com/prontog/showtimes.athens/29ebb8a168cea468bee2e47240e88036f4ef173f/scrape/samples/new_arrivals.json",
    URL_ALL_FILMS: "https://raw.github.com/prontog/showtimes.athens/master/scrape/samples/all_films.json",
    FILE_NEW_ARRIVALS: "new_arrivals.json",
    FILE_ALL_FILMS: "all_films.json",
    
    initialize: function() {
        logger.log("app.initialize");
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        logger.log("app.bindEvents");
        document.addEventListener('deviceready', this.onDeviceReady, false);        
        // FILE_SYSTEM_READY event. 
        $.subscribe(events.FILE_SYSTEM_READY, function() {
            var needsUpdate = true;
            
            if (needsUpdate) {
                app.update();    
            }
            else {
                views.prepareAll();
            }
        });
        
        data.bindEvents();
        views.bindEvents();
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        logger.log('Received Event: ' + id);
    },    
    download: function(url, filename, callback) {
        logger.log("app.download");
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
                $("div[data-role='footer']").html("download failed");
            }
        );
    },
    update: function() {
        logger.log("app.update");
        this.download(app.URL_NEW_ARRIVALS, 
                      app.FILE_NEW_ARRIVALS, 
                      function() {
                        $.publish(events.NEW_FILMS_DOWNLOADED, [app.FILE_NEW_ARRIVALS]);
                      });
        
        this.download(app.URL_ALL_FILMS, 
                      app.FILE_ALL_FILMS, 
                      function() {
                        $.publish(events.ALL_FILMS_DOWNLOADED, [app.FILE_ALL_FILMS]);
                      });
        
        this.download(app.URL_SHOWTIMES,
                      app.FILE_SHOWTIMES,
                      function() {
                        $.publish(events.SHOWTIMES_DOWNLOADED, [app.FILE_SHOWTIMES]);
                      });
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
        appFS.init();
    }
};
