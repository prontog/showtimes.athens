/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals _:true, $:true */
/*globals FileError:true, LocalFileSystem:true, FileReader:true, FileTransfer:true, Backbone:true, cordova: true */
"use strict";

/*******************************************************************************/
/**************** Logger *******************************************************/
var logger = {
    appName: "[Showtimes]",
    log: function(msg) {
        console.log(this.prepareLogEntry(msg));
        //steroids.logger.log(this.prepareLogEntry(msg));
    },
    error: function(msg) {
        console.log(this.prepareLogEntry(msg, "Error"));
        //steroids.logger.log(this.prepareLogEntry(msg, "Error"));
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

/*******************************************************************************/
/**************** Events *******************************************************/

var events = {
    // General events.
    FILE_SYSTEM_READY: "fs_ok",
    DOWNLOADING_COMPLETED: "down_ok",
    LOADING_COMPLETED: "load_ok",
    STALE_DATA: "stale",
    FRESH_DATA: "fresh",
    // Events for specific files.
    UPDATE_INFO_AVAILABLE: "update_d",
    UPDATE_INFO_LOADED: "update_l",
    NEW_ARRIVALS_AVAILABLE: "new_d",
    NEW_ARRIVALS_LOADED: "new_l",
    ALL_FILMS_AVAILABLE: "all_films_d",
    ALL_FILMS_LOADED: "all_films_l",
    SHOWTIMES_AVAILABLE: "show_d",
    SHOWTIMES_LOADED: "show_l"
};

/*******************************************************************************/
/**************** FileSystem ***************************************************/
var appFS= {
    SIZE: 5 * 1024 * 1024,
    _fs: null,
    root: null,
    // Add a description to the error object.This description
    // is for the user.
    enrichError: function(e) {        
        var whatHappened = "";
    
        switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
            whatHappened = "QUOTA_EXCEEDED_ERR";
            break;
        case FileError.NOT_FOUND_ERR:
            whatHappened = "NOT_FOUND_ERR";
            break;
        case FileError.SECURITY_ERR:
            whatHappened = "SECURITY_ERR";
            break;
        case FileError.INVALID_MODIFICATION_ERR:
            whatHappened = "INVALID_MODIFICATION_ERR";
            break;
        case FileError.INVALID_STATE_ERR:
            whatHappened = "INVALID_STATE_ERR";
            break;
        default:
            whatHappened = "Unknown Error";
            break;
        }

        var enriched = _.clone(e);
        enriched.whatHappened = whatHappened;
        return enriched;
    },
    // Simple FS error handler that adds a description of what happened
    // and logs the error.
    defaultErrorHandler: function(e) { 
        if (e) {
            logger.error(JSON.stringify(appFS.enrichError(e), ["name", "message", "whatHappened"]));
        }
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
        appFS.root.getFile(fileURL, { create: false }, function(fileEntry) {
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

/*******************************************************************************/
/**************** Data/Models/Collections **************************************/

var Film = Backbone.Model.extend({
    defaults: {
        id: "",
        url: "",
        image: "",
        title: "",
        origTitle: "",
        category: "",
        year: "",
        filmType: "",
        duration: "",
        rated: "",
        credits: "",
        summary: "",
        review: "",
        imdb: "",
        theatersUrl: "",
        theaters: ""
    }
});

var FilmCollection = Backbone.Collection.extend({
    model: Film,
    comparator: 'title'
});

var Category = Backbone.Model.extend({
    defaults: {
        name: ""
    }
});

var CategoryCollection = Backbone.Collection.extend({
    model: Category,
    comparator: 'name'
});

var Area = Backbone.Model.extend({
    defaults: {
        name: ""
    }
});

var AreaCollection = Backbone.Collection.extend({
    model: Area,
    comparator: 'name'
});


var Showtime = Backbone.Model.extend({
    defaults: {
        filmId: "",
        area: "",
        cinemaName: "",
        cinemaUrl: "",
        address: "",
        map: "",
        phone: "",
        tech_info: "",
        price: "",
        rooms: ""
    }
});

var ShowtimeCollection = Backbone.Collection.extend({
    model: Showtime,
    comparator: 'area'
});

var data = {
    // raw data
    updateInfo: null,
    newFilmsRaw: [],
    allFilmsRaw: [],
    showtimesRaw: [],
    // Backbone collections/models
    newFilms: null,
    allFilms: null,
    showtimes: null,
    categories: null,
    categoryFilms: null,
    film: null,
    areas: null,
    init: function() {
        logger.log('Initalizing data');
        this.newFilms = new FilmCollection();
        this.allFilms = new FilmCollection();
        this.showtimes = new ShowtimeCollection();
        this.categories = new CategoryCollection();
        this.categoryFilms = new FilmCollection();
        this.film = new Film();
        this.areas = new AreaCollection();
    },    
    categoriesFromFilms: function(films) {
        var categoriesRaw = _.chain(films).map(function(o) {
                return o.category;
            }).uniq().value();
        return _.map(categoriesRaw, function(c) { return { name: c };});
    },
    areasFromShowtimes: function(showtimes) {
        var areasRaw = _.chain(showtimes).map(function(o) {
                return o.area;
            }).uniq().value();
        return _.map(areasRaw, function(c) { return { name: c };});
    },
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
        updateInfo: null,
        newFilms: [],
        allFilms: [],
        showtimes: []
    },
    exchange: function() {
        logger.log("data.exchange");
        data.updateInfo = data.tmp.updateInfo;
        data.newFilmsRaw = data.tmp.newFilms;
        data.allFilmsRaw = data.tmp.allFilms;
        data.allShowtimesRaw = data.tmp.showtimes;
    },
    // Returns true if the data are more than 7 days old.
    needsUpdate: function(lastUpdateInfo) {
        var msgHeader = "data.needsUpdate: ";
        var diffDate;
        
        logger.log(msgHeader + JSON.stringify(lastUpdateInfo));
        
        if (data.updateInfo === null) {
            return true;
        }
        
        var diffMs;
        if (lastUpdateInfo) {
            diffMs = data.updateInfo.date - lastUpdateInfo.date;
            if (diffMs === 0) {
                logger.log(msgHeader + "Data is up to date.");
                return false;
            }
            diffDate = new Date(diffMs);
        }
        else {
            diffMs = new Date().getTime() - data.updateInfo.date;
            if (diffMs < 0) {
                // ToDo: Notify the user. This could end up to a never ending update process.
                logger.log(msgHeader + "Invalid date. Something went fishy!");
                return false;
            }            
            diffDate = new Date(diffMs);
        }
        
        logger.log(msgHeader + diffDate);
        
        var diff = { 
                diff: diffDate.getTime(), 
                days: diffDate.getUTCDate(), 
                months: diffDate.getUTCMonth(),
                years: diffDate.getFullYear() - 1970
        };
        
        logger.log("data.needsUpdate: " + JSON.stringify(diff));
        return  diff.days > 7 || 
                diff.months > 0  ||
                diff.years > 0;
    },
    bindEvents: function() {
        logger.log("data.bindEvents");
        
        $.subscribe(events.DOWNLOADING_COMPLETED, data.exchange);
        
        $.subscribe(events.UPDATE_INFO_AVAILABLE, function(e, filename, error) {
            // This is a hack, loadFromFile can only load to an array.
            var dataContainer = [];
            data.loadFromFile(filename, dataContainer, function() {
                var lastUpdateInfo = data.updateInfo;
                data.updateInfo = dataContainer[0];
                logger.log("loaded data.updateInfo: " + new Date(data.updateInfo.date));
                
                // ToDo: This should be published after the whole update is finished.
                $.publish(events.UPDATE_INFO_LOADED, [data.updateInfo]);
                
                if (data.needsUpdate(lastUpdateInfo)) {                    
                    $.publish(events.STALE_DATA);
                }
                else {
                    $.publish(events.FRESH_DATA);
                }
            }, error);
        });
        $.subscribe(events.NEW_ARRIVALS_AVAILABLE, function(e, filename) {
            data.loadFromFile(filename, data.newFilmsRaw, function() {
                $.publish(events.NEW_ARRIVALS_LOADED, [data.newFilmsRaw]);                        
            });
        });
        $.subscribe(events.ALL_FILMS_AVAILABLE, function(e, filename) {
            data.loadFromFile(filename, data.allFilmsRaw, function() {
                $.publish(events.ALL_FILMS_LOADED, [data.allFilmsRaw]);
            });
        });
        $.subscribe(events.SHOWTIMES_AVAILABLE, function(e, filename) {
            data.loadFromFile(filename, data.showtimesRaw, function() {
                $.publish(events.SHOWTIMES_LOADED, [data.showtimesRaw]);
            });
        });
    }
};

/*******************************************************************************/
/**************** Views ********************************************************/

var FilmCollectionView = Backbone.View.extend({    
    filmTemplate: _.template($('#film-collection-template').html()),
    initialize: function(options) {
        logger.log('Initializing FilmCollectionView');
        
        this.$ul = this.$('ul');
        this.listenTo(this.collection, 'all', this.render);
    },
    render: function() { 
        logger.log('Rendering FilmCollectionView');
        
        var items = [];
        var filmTemplate = this.filmTemplate;
        this.collection.forEach(function(f) {
            items.push(filmTemplate({ film: f.toJSON() }).trim());
        });
        // Add new elements.
        this.$ul.html(items.join(""));
        
        return this;
    }
});

var CategoryCollectionView = Backbone.View.extend({
    categoryTemplate: _.template($('#category-template').html()),
    initialize: function(options) {
        this.$ul = this.$('ul');
        this.listenTo(this.collection, 'all', this.render);
    },
    render: function() {
        logger.log('Rendering CategoryCollectionView');
        
        var items = [];
        var categoryTemplate = this.categoryTemplate;
        this.collection.forEach(function(c) {
            items.push(categoryTemplate({ category: c.toJSON() }).trim());
        });
        // Add new elements.
        this.$ul.html(items.join(""));        
    }
});

var AreaCollectionView = Backbone.View.extend({
    areaTemplate: _.template($('#area-template').html()),
    initialize: function(options) {
        this.$ul = this.$('ul');
        this.listenTo(this.collection, 'all', this.render);
    },
    render: function() {
        logger.log('Rendering AreaCollectionView');
        
        var items = [];
        var areaTemplate = this.areaTemplate;
        this.collection.forEach(function(a) {
            items.push(areaTemplate({ area: a.toJSON() }).trim());
        });
        // Add new elements.
        this.$ul.html(items.join(""));
    }
});

var FilmView = Backbone.View.extend({
    filmTemplate: _.template($('#film-template').html()),
    initialize: function(options) {   
        this.$details = this.$('#details');
        this.listenTo(this.model, 'all', this.render);
    },
    render: function() {
        logger.log('Rendering FilmView');
        this.$details.html(this.filmTemplate({ film: this.model.toJSON() }).trim());        
    }
});

var views = {
    newFilmsView: null,
    allFilmsView: null,
    filmView: null,
    categoriesView: null,
    categoryFilmsView: null,
    areasView: null,
    init: function() {
        logger.log('Initializing views');
        views.newFilmsView = new FilmCollectionView({ el: $("#new"), collection: data.newFilms });
        views.allFilmsView = new FilmCollectionView({ el: $("#all"), collection: data.allFilms });
        views.filmView = new FilmView({ el: $("#film"), model: data.film });
        views.categoriesView = new CategoryCollectionView({ el: $("#categories"), collection: data.categories });
        views.categoryFilmsView = new FilmCollectionView({ el: $("#category-films"), collection: data.categoryFilms });
        views.areasView = new AreaCollectionView({ el: $("#areas"), collection: data.areas });
    },
    downloadError: function() {
        $("div[data-role='footer']").find("h1").html("Η ενημέρωση απέτυχε");
    },
    bindEvents: function() {
        //$.subscribe(events.LOADING_COMPLETED, views.prepareAll);
        $.subscribe(events.UPDATE_INFO_LOADED, function(e, updateInfo) {
            $("div[data-role='footer']").find("h1").html("Τελευταία ενημέρωση:" + new Date(updateInfo.date).toDateString());
        });
        $.subscribe(events.NEW_ARRIVALS_LOADED, function(e, films) {
            data.newFilms.reset(films);
        });
        $.subscribe(events.ALL_FILMS_LOADED, function(e, films) {
            data.allFilms.reset(films);
            data.categories.reset(data.categoriesFromFilms(films));
        });        
        $.subscribe(events.SHOWTIMES_LOADED, function(e, showtimes) {                        
            data.showtimes.reset(showtimes);
            data.areas.reset(data.areasFromShowtimes(showtimes));
        });
    }
};

/*var AppView = Backbone.View.extend({
    el: $("#showtimes-app"),
    filmCounterTemplate: _.template($('#film-counter-template').html()),
    initialize: function() {
        logger.log('Initializing app');
        this.$main = $('#main');

        this.listenTo(films, 'all', this.render);
    },
    render: function() { 
        logger.log('Rendering app');
        this.$main.html(this.filmCounterTemplate({count: films.length}));

        return this;
    }
});

var app = new AppView();*/

/*******************************************************************************/
/**************** Router *******************************************************/

var AppRouter = Backbone.Router.extend({
    routes: {            
        "film/:id":    "film",
        "category-films/:name": "category",
        "area/:name": "area"
        //"*path": "defaultHandler"
    },
    film: function(id) {
        logger.log("AppRouter.film " + id);
                
        //var film = data.film(id);
        var film = data.allFilms.findWhere({ id: id });
        if (film) {            
            // Get the header for the page.
            views.filmView.model.set(film.toJSON());
            
            // Pages are lazily enhanced. We call page() on the page
            // element to make sure it is always enhanced before we
            // attempt to enhance the listview markup we just injected.
            // Subsequent calls to page() are ignored since a page/widget
            // can only be enhanced once.
            //$page.page();
    
            // We don't want the data-url of the page we just modified
            // to be the url that shows up in the browser's location field,
            // so set the dataUrl option to the URL for the category
            // we just loaded.
            //options.dataUrl = urlObj.href;
    
            // Now call changePage() and tell it to switch to
            // the page we just modified.
            $.mobile.changePage(views.filmView.$el, { reverse: false, changeHash: false });            
        }
    },
    category: function(name) {
        logger.log("AppRouter.category " + name);
        
        //var film = data.film(id);
        var films = data.allFilms.where({ category: name });
        if (films) {            
            data.categoryFilms.reset(films);
            views.categoryFilmsView.$el.find("div h1").first().html(name);
            // Now call changePage() and tell it to switch to
            // the page we just modified.
            $.mobile.changePage(views.categoryFilmsView.$el, { reverse: false, changeHash: false });
        }
    },
    area: function(name) {
        logger.log("AppRouter.area " + name);
            
    },
    defaultHandler: function(path) {
        logger.log("AppRouter.default " + path);
    }
});

/*******************************************************************************/
/**************** Application **************************************************/

var app = {
    URL_NEW_ARRIVALS: "http://showtimes.ronto.net/data/new_arrivals.json",
    URL_ALL_FILMS: "http://showtimes.ronto.net/data/all_films.json",
    URL_SHOWTIMES: "http://showtimes.ronto.net/data/showtimes.json",
    URL_UPDATE_INFO: "http://showtimes.ronto.net/data/update_info.json",
    FILE_NEW_ARRIVALS: "new_arrivals.json",
    FILE_ALL_FILMS: "all_films.json",
    FILE_SHOWTIMES: "showtimes.json",
    FILE_UPDATE_INFO: "update_info.json",
    router: null,
    initialize: function() {
        logger.log("app.initialize");                                
        
        data.init();
        views.init();
        
        this.bindEvents();
        
        // For browser debugging.
        //this.loadRawData();
    },    
    // Loads everything from file system.
    load: function() {
        $.publish(events.NEW_ARRIVALS_AVAILABLE, [app.FILE_NEW_ARRIVALS]);
        $.publish(events.ALL_FILMS_AVAILABLE, [app.FILE_ALL_FILMS]);
        $.publish(events.SHOWTIMES_AVAILABLE, [app.FILE_SHOWTIMES]);
    },   
    update: function(all) {
        logger.log("app.update");
        
        var rootURL = appFS.root.toURL();
        
        if (all) {
            data.download(app.URL_UPDATE_INFO, 
                      rootURL + app.FILE_UPDATE_INFO, 
                      function(filename) {
                        $.publish(events.UPDATE_INFO_AVAILABLE, [filename]);
                      },
                      views.downloadError);
        }
        
        data.download(app.URL_NEW_ARRIVALS, 
                      rootURL + app.FILE_NEW_ARRIVALS, 
                      function(filename) {
                        $.publish(events.NEW_ARRIVALS_AVAILABLE, [filename]);
                      },
                      views.downloadError);
        
        data.download(app.URL_ALL_FILMS, 
                      rootURL + app.FILE_ALL_FILMS, 
                      function(filename) {
                        $.publish(events.ALL_FILMS_AVAILABLE, [filename]);
                      },
                      views.downloadError);
        
        data.download(app.URL_SHOWTIMES,
                      rootURL + app.FILE_SHOWTIMES,
                      function(filename) {
                        $.publish(events.SHOWTIMES_AVAILABLE, [filename]);
                      },
                      views.downloadError);
    },
    loadRawData: function() {                               
        var rawFilms = [{"id":"10042292","url":"http://www.athinorama.gr/cinema/movie.aspx?id=10042292","image":"/images/blank.gif","title":"Η Έξοδος: Θεοί και Βασιλιάδες","origTitle":"Exodus: Gods and Kings","category":"Περιπέτεια","year":"2014","filmType":"Έγχρ.","duration":"Διάρκεια: 150'","rated":"-","credits":"Αμερικανική ταινία, σκηνοθεσία Ρίντλεϊ Σκοτ με τους: Κρίστιαν Μπέιλ, Τζόελ Έντγκερτον, Μπεν Κίνγκσλεϊ, Τζον Τορτούρο","summary":"Όταν αποκαλυφθεί η πραγματική καταγωγή του, ο Μωυσής θα ηγηθεί της προσπάθειας των σκλαβωμένων Ισραηλιτών να αποτινάξουν τον αιγυπτιακό ζυγό και να φτάσουν στη Γη της Επαγγελίας.","review":"Με σενάριο που θυμίζει απλοϊκό, γραμμικό «ξεφύλλισμα» της γνωστής βιβλικής ιστορίας και μια ακαδημαϊκή σκηνοθετική προσέγγιση που δεν πείθει –ακόμη και σε επίπεδο φαντασμαγορίας–, το θρησκευτικό έπος δεν καταφέρνει να βρει το δρόμο προς τη… Γη της Κινηματογραφικής Πρωτοτυπίας.","imdb":"http://www.exodusgodsandkings.com/#home","theatersUrl":"movieplaces.aspx?id=10042292","theaters":""},
        {"id":"10042286","url":"http://www.athinorama.gr/cinema/movie.aspx?id=10042286","image":"/images/blank.gif","title":"Ο Επιφανής Άγνωστος","origTitle":"Un Illustre Inconnu","category":"Θρίλερ","year":"2014","filmType":"Έγχρ.","duration":"Διάρκεια: 118'","rated":"-","credits":"Γαλλική ταινία, σκηνοθεσία Ματιέ Ντελαπόρτ με τους: Ματιέ Κασοβίτς, Mαρί-Ζοζέ Κροζέ, Ερίκ Καραβακά","summary":"Ο Σεμπαστιάν Νικολά είναι ένας άχρωμος και άοσμος 45άρης. Παρατηρεί τους ανθρώπους, μαθαίνει να τους μιμείται, ενώ συχνά οικειοποιείται μυστικά την ταυτότητά τους. Μέχρι που συναντά τον διάσημο κι εκκεντρικό μουσικό Ανρί ντε Μοντάλτ.","review":"Ρεσιτάλ αλλαγής ρόλων και προσωπείων από τον Ματιέ Κασοβίτς, σε ένα ατμοσφαιρικό, αλλά εύκολων τελικών λύσεων δραματικό θρίλερ. Από τον σεναριογράφο της αστυνομικής περιπέτειας «22 Σφαίρες» και σκηνοθέτη της κομεντί «Για Όλα Φταίει τ’ Όνομά σου».","imdb":"http://www.imdb.com/title/tt3161960/","theatersUrl":"movieplaces.aspx?id=10042286","theaters":""}];

        data.newFilms.reset(rawFilms);
        data.allFilms.reset(rawFilms);
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        logger.log("app.bindEvents");
        document.addEventListener('deviceready', this.onDeviceReady, false);        
        window.addEventListener('filePluginIsReady', this.onfilePluginIsReady, false);
        // FILE_SYSTEM_READY event. 
        $.subscribe(events.FILE_SYSTEM_READY, function() {
            // Notify that the update-info file is available. If the loading (subscribed 
            // to this events) fails, the file re-downloaded one more time. This is for the
            // case where the update-info file does not exist on the local file system.
            $.publish(events.UPDATE_INFO_AVAILABLE, [app.FILE_UPDATE_INFO, function() {
                data.download(app.URL_UPDATE_INFO, 
                      appFS.root.toURL() + app.FILE_UPDATE_INFO, 
                      function(filename) {
                        $.publish(events.UPDATE_INFO_AVAILABLE, [filename]);
                      },
                      views.downloadError);
            }]);
        });
        
        $.subscribe(events.STALE_DATA, app.update);
        $.subscribe(events.FRESH_DATA, app.load);
        
        data.bindEvents();
        views.bindEvents();
    },    
    // deviceready Event Handler
    //
    // Note that the scope of 'this' is the event.
    onDeviceReady: function() {
        logger.log('Received Event: deviceready');
        
        // Prevents all anchor click handling
        $.mobile.linkBindingEnabled = false;
        // Disabling this will prevent jQuery Mobile from handling hash changes
        $.mobile.hashListeningEnabled = false;          
        $.mobile.ajaxEnabled = false;
        $.mobile.pushStateEnabled = false;
        
        app.router = new AppRouter();
        Backbone.history.start(); 
        
        if (cordova.platformId !== "browser") {
            appFS.init();
        }
    },
    // filePluginIsReady Event Handler
    //
    // Note that the scope of 'this' is the event.
    onfilePluginIsReady: function() {
        if (cordova.platformId === "browser") {
            logger.log('Received Event: filePluginIsReady');                
            appFS.init();            
        }        
    }
};
 