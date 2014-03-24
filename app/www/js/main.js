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
    // General events.
    FILE_SYSTEM_READY: "fs_ok",
    DOWNLOADING_COMPLETED: "down_ok",
    LOADING_COMPLETED: "load_ok",
    STALE_DATA: "stale",
    FRESH_DATA: "fresh",
    // Events for specific files.
    UPDATE_INFO_DOWNLOADED: "update_d",
    UPDATE_INFO_LOADED: "update_l",
    NEW_ARRIVALS_DOWNLOADED: "new_d",
    NEW_ARRIVALS_LOADED: "new_l",
    ALL_FILMS_DOWNLOADED: "all_films_d",
    ALL_FILMS_LOADED: "all_films_l",
    SHOWTIMES_DOWNLOADED: "show_d",
    SHOWTIMES_LOADED: "show_l"
};

var appFS= {
    SIZE: 5 * 1024 * 1024,
    _fs: null,
    root: null,
    defaultErrorHandler: function(e) {
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
        logger.error(JSON.stringify(e));
    },
    // Wraps an error handler function so that the default hanlder is also called.
    wrapErrorHandler: function(someHandler) {
        return function() {
            appFS.defaultErrorHandler();
            if (someHandler) {
                someHandler();
            }
        };
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
            }, appFS.defaultErrorHandler);
        }
    },
    // Read the contents of a file to an array.
    readFile: function(fileURL, success, error) {
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
            }, appFS.defaultErrorHandler);    
        }, appFS.wrapErrorHandler(error));
    }
};

var data = {
    updateInfo: {},
    newFilms: [],
    allFilms: [],
    showtimes: [],
    loadSingleObject: function(text) {
        var retObj = {};
        
        try {
            if (text.length > 0) {
                retObj = JSON.parse(text);
            }
        }
        catch(e) {
            logger.error("parsing " + text);
        }
        
        return retObj;
    },
    download: function(url, fileURL, success, error) {
        logger.log("data.download: " + fileURL);
        var fileTransfer = new FileTransfer();
        var uri = encodeURI(url);
        
        fileTransfer.download(
            uri,
            fileURL,
            function(entry) {
                logger.log("Download completed: " + entry.fullPath);
                if (success) {
                    success(entry.fullPath);
                }
            },
            function(e) {
                logger.error("downloading " + JSON.stringify(e));
                if (error) {
                    error();
                }
            }
        );
    },
    loadFromFile: function(filename, to, success, error) {
        logger.log("data.loadFromFile");
        appFS.readFile(filename, function(text) {
            if ($.isArray(to)) {
                var allLines = text.split("\n");
                logger.log("Number of lines:" + allLines.length);
                
                // Clear the array.
                to.length = 0;
                // Parse each line and add to the array.
                _.forEach(allLines, function(line) {
                    if (line) {
                        to.push(data.loadSingleObject(line));
                    }
                });
                
                if (success) {
                    success(filename);
                }
            }
            else {
                logger.error("data.loadFromFile: Invalid argument type. 'to' is not an array.");
            }
        }, error);
    },
    tmp: {
        updateInfo: {},
        newFilms: [],
        allFilms: [],
        showtimes: []
    },
    exchange: function() {
        logger.log("data.exchange");
        data.updateInfo = data.tmp.updateInfo;
        data.newFilms = data.tmp.newFilms;
        data.allFilms = data.tmp.allFilms;
        data.allShowtimes = data.tmp.showtimes;
    },
    // Returns true if the data are more than 7 days old.
    needsUpdate: function() {
        var diff = new Date().getTime() - data.updateInfo.date;
        var diffDate = new Date(diff);
        logger.log("data.needsUpdate: " + JSON.stringify({diff: diff, 
                                                          days: diffDate.getUTCDate(), 
                                                          months: diffDate.getUTCMonth(),
                                                          years: diffDate.getFullYear()}));
        return  diffDate.getUTCDate() > 7 || 
                diffDate.getUTCMonth > 0  ||
                diffDate.getFullYear > 1970;
    },
    bindEvents: function() {
        logger.log("data.bindEvents");
        
        $.subscribe(events.DOWNLOADING_COMPLETED, data.exchange);
        
        $.subscribe(events.UPDATE_INFO_DOWNLOADED, function(e, filename, error) {
            var dataContainer = [];
            data.loadFromFile(filename, dataContainer, function() {
                data.updateInfo = dataContainer[0];
                logger.log(JSON.stringify(data.updateInfo));
                
                $.publish(events.UPDATE_INFO_LOADED, [data.updateInfo]);
                
                if (data.needsUpdate()) {                    
                    $.publish(events.STALE_DATA);
                }
                else {
                    $.publish(events.FRESH_DATA);
                }
            }, error);
        });
        $.subscribe(events.NEW_ARRIVALS_DOWNLOADED, function(e, filename) {
            data.loadFromFile(filename, data.newFilms, function() {
                $.publish(events.NEW_ARRIVALS_LOADED, [data.newFilms]);                        
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
    downloadError: function() {
        $("div[data-role='footer']").html("Η ενημέρωση απέτυχε");
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
        $.subscribe(events.UPDATE_INFO_LOADED, function(e, updateInfo) {
            $("div[data-role='footer']").html("Τελευταία ενημέρωση:" + new Date(updateInfo.date).toDateString());
        });
        $.subscribe(events.NEW_ARRIVALS_LOADED, function(e, films) {
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
    URL_NEW_ARRIVALS: "https://raw.github.com/prontog/showtimes.athens/master/scrape/samples/new_arrivals.json",
    URL_ALL_FILMS: "https://raw.github.com/prontog/showtimes.athens/master/scrape/samples/all_films.json",
    URL_SHOWTIMES: "https://raw.github.com/prontog/showtimes.athens/master/scrape/samples/showtimes.json",
    URL_UPDATE_INFO: "https://raw.github.com/prontog/showtimes.athens/master/scrape/samples/update_info.json",
    FILE_NEW_ARRIVALS: "new_arrivals.json",
    FILE_ALL_FILMS: "all_films.json",
    FILE_SHOWTIMES: "showtimes.json",
    FILE_UPDATE_INFO: "update_info.json",
    
    initialize: function() {
        logger.log("app.initialize");
        this.bindEvents();
    },
    // Loads everything from file system.
    load: function() {
        $.publish(events.NEW_ARRIVALS_DOWNLOADED, [app.FILE_NEW_ARRIVALS]);
        $.publish(events.ALL_FILMS_DOWNLOADED, [app.FILE_ALL_FILMS]);
        $.publish(events.SHOWTIMES_DOWNLOADED, [app.FILE_SHOWTIMES]);
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
            // Notify that the update-info file is available. If the loading (subscribed 
            // to this events) fails, the file re-downloaded one more time. This is for the
            // case where the update-info file does not exist on the local file system.
            $.publish(events.UPDATE_INFO_DOWNLOADED, [app.FILE_UPDATE_INFO, function() {
                data.download(app.URL_UPDATE_INFO, 
                      appFS.root.toURL() + app.FILE_UPDATE_INFO, 
                      function(filename) {
                        $.publish(events.UPDATE_INFO_DOWNLOADED, [filename]);
                      },
                      views.downloadError);
            }]);
        });
        
        $.subscribe(events.STALE_DATA, app.update);
        $.subscribe(events.FRESH_DATA, app.load);
        
        data.bindEvents();
        views.bindEvents();
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        logger.log('Received Event: ' + id);
    },    
    update: function() {
        logger.log("app.update");
        
        var rootURL = appFS.root.toURL();
        
        data.download(app.URL_NEW_ARRIVALS, 
                      rootURL + app.FILE_NEW_ARRIVALS, 
                      function(filename) {
                        $.publish(events.NEW_ARRIVALS_DOWNLOADED, [filename]);
                      },
                      views.downloadError);
        
        data.download(app.URL_ALL_FILMS, 
                      rootURL + app.FILE_ALL_FILMS, 
                      function(filename) {
                        $.publish(events.ALL_FILMS_DOWNLOADED, [filename]);
                      },
                      views.downloadError);
        
        data.download(app.URL_SHOWTIMES,
                      rootURL + app.FILE_SHOWTIMES,
                      function(filename) {
                        $.publish(events.SHOWTIMES_DOWNLOADED, [filename]);
                      },
                      views.downloadError);
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
 