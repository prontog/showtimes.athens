/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals define:true, FileError:true, LocalFileSystem:true, FileReader:true, FileTransfer:true, cordova: true */

define(["jquery", "jquerymobile", "backbone", "underscore", "tinypubsub"], function($, Mobile, Backbone, _, TinyPubSub) {
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
        NEW_ARRIVALS_AVAILABLE: "new_d",        
        ALL_FILMS_AVAILABLE: "all_films_d",        
        SHOWTIMES_AVAILABLE: "show_d"        
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
            rottenTomatoes: "",
            officialSite: "",
            theatersUrl: "",
            theaters: null
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
            name: "",
            cinemas: null
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

    var Cinema = Backbone.Model.extend({
        defaults: {
            name: "",
            area: "",
            address: "",
            phone: "",
            map: "",
            showtimes: null
        }
    });

    var CinemaCollection = Backbone.Collection.extend({
        model: Cinema,
        comparator: 'name'
    });
    
    var UpdateInfo = Backbone.Model.extend({
        date: null,
        getDateString: function() {
            var date = new Date(this.get("date"));            
            return date.getDate() + "/" + (date.getMonth() + 1) + "/" +  date.getFullYear();
        }        
    });

    var data = {
        // raw data        
        newFilmsRaw: [],
        allFilmsRaw: [],
        showtimesRaw: [],
        // Backbone collections/models        
        newFilms: null,
        allFilms: null,
        film: null,
        showtimes: null,
        categories: null,
        categoryFilms: null,
        allAreas: null,
        area: null,
        allCinemas: null,
        cinema: null,
        updateInfo: null,
        init: function() {
            logger.log('data.init');            
            this.newFilms = new FilmCollection();
            this.allFilms = new FilmCollection();
            this.film = new Film();
            this.showtimes = new ShowtimeCollection();
            this.categories = new CategoryCollection();
            this.categoryFilms = new FilmCollection();
            this.allAreas = new AreaCollection();
            this.area = new Area();
            this.allCinemas = new CinemaCollection();
            this.cinema = new Cinema();
            this.updateInfo = new UpdateInfo();
        },
        setAllFilms: function(filmsRaw) {
            if (!filmsRaw) {
                logger.error("data.setAllFilms: filmsRaw cannot be null");
                return null;
            }

            this.allFilms.reset(filmsRaw);
            var categoriesRaw = _.chain(filmsRaw)
                                 .map(function(o) { return o.category; })
                                 .uniq()
                                 .map(function(c) { return { name: c }; })
                                 .value();
            this.categories.reset(categoriesRaw);
        },
        setShowtimes: function(showtimesRaw) {
            if (!showtimesRaw) {
                logger.error("data.setShowtimes: showtimesRaw cannot be null");
                return;
            }

            // First reset the showtimes.
            this.showtimes.reset(showtimesRaw);
            // Then reset the cinemas.
            var cinemaShowtimes = this.showtimes.groupBy(function(s) { return s.get('area') + "_" + s.get('cinemaName'); });
            var cinemasRaw = _.map(cinemaShowtimes, function(cs) {
                var cinema = new Cinema();
                var s = cs[0];
                cinema.set('name', s.get('cinemaName'));
                cinema.set('area', s.get('area'));
                cinema.set('address', s.get('address'));
                cinema.set('phone', s.get('phone'));
                cinema.set('showtimes', cs);
                return cinema;
            });
            this.allCinemas.reset(cinemasRaw);

            // Finally reset the areas.
            var areaCinemas = this.allCinemas.groupBy(function(c) { return c.get('area'); });
            var areasRaw = _.map(_.pairs(areaCinemas), function(p) {
                return { name: p[0],
                         cinemas: p[1]
                };
            });

            this.allAreas.reset(areasRaw);
        },
        setUpdateInfo: function(updateInfoRaw) {
            this.updateInfo.set(updateInfoRaw);
        },
        filmShowtimes: function(film) {
            if (!film) {
                logger.error("data.filmShowtimes: film cannot be null");
                return null;
            }
            if (!this.showtimes) {
                logger.error("data.filmShowtimes: this.showtimes cannot be null");
                return null;
            }

            return this.showtimes.where({ filmId: film.get("id") });
        },
        findCinema: function(name, area) {
            if (!name) {
                logger.error("data.findCinema: name cannot be null");
                return null;
            }
            if (!area) {
                logger.error("data.findCinema: area cannot be null");
                return null;
            }
            if (!this.showtimes) {
                logger.error("data.findCinema: this.showtimes cannot be null");
                return null;
            }

            return this.allCinemas.findWhere({ name: name, area: area });
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
        tmp: {
            updateInfo: null,
            newFilms: [],
            allFilms: [],
            showtimes: []
        },
        exchange: function() {
            logger.log("data.exchange");
//            data.updateInfo = data.tmp.updateInfo;
//            data.newFilmsRaw = data.tmp.newFilms;
//            data.allFilmsRaw = data.tmp.allFilms;
//            data.allShowtimesRaw = data.tmp.showtimes;
        }                
    };
    
    /*******************************************************************************/
    /**************** Views ********************************************************/

    var FilmCollectionView = Backbone.View.extend({
        filmTemplate: _.template($('#film-collection-template').html()),
        initialize: function(options) {
            logger.log('FilmCollectionView.initialize');

            this.$ul = this.$('ul');
            this.$header = this.$("header h1");
            this.listenTo(this.collection, 'all', this.render);
        },
        render: function() {
            logger.log('FilmCollectionView.render');

            var items = [];
            var filmTemplate = this.filmTemplate;
            this.collection.forEach(function(f) {
                items.push(filmTemplate({ film: f.toJSON() }).trim());
            });
            // Add new elements.
            this.$ul.html(items.join(""));
            this.$ul.listview().listview('refresh');

            return this;
        },
        header: function(title) {
            this.$header.html(title);
        }
    });

    var CategoryCollectionView = Backbone.View.extend({
        categoryTemplate: _.template($('#category-template').html()),
        initialize: function(options) {
            logger.log('CategoryCollectionView.initialize');
            
            this.$ul = this.$('ul');
            this.listenTo(this.collection, 'all', this.render);
        },
        render: function() {
            logger.log('CategoryCollectionView.render');

            var items = [];
            var categoryTemplate = this.categoryTemplate;
            this.collection.forEach(function(c) {
                items.push(categoryTemplate({ category: c.toJSON() }).trim());
            });
            // Add new elements.
            this.$ul.html(items.join(""));

            return this;
        }
    });

    var AreaCollectionView = Backbone.View.extend({
        areaTemplate: _.template($('#area-template').html()),
        initialize: function(options) {
            logger.log('AreaCollectionView.initialize');
            
            this.$ul = this.$('ul');
            this.listenTo(this.collection, 'all', this.render);
        },
        render: function() {
            logger.log('AreaCollectionView.render');

            var items = [];
            var areaTemplate = this.areaTemplate;
            this.collection.forEach(function(a) {
                items.push(areaTemplate({ area: a.toJSON() }).trim());
            });
            // Add new elements.
            this.$ul.html(items.join(""));

            return this;
        }
    });

    var FilmView = Backbone.View.extend({
        filmDetailsTemplate: _.template($('#film-details-template').html()),
        filmShowtimesTemplate: _.template($('#film-showtimes-template').html()),
        initialize: function(options) {
            logger.log('FilmView.initialize');
            
            var $article = this.$('article');            
            this.$filmDetails = $article.find('#film-details');
            this.$filmShowtimes = $article.find('#film-showtimes');
            this.listenTo(this.model, 'all', this.render);
        },
        render: function() {
            logger.log('FilmView.render');

            var filmShowtimes = data.filmShowtimes(this.model);
            var film = this.model.toJSON();
            film.theaters = _.map(filmShowtimes, function(s) { return s.toJSON(); });
            
            this.$filmDetails.html(this.filmDetailsTemplate({ film: film }).trim());
            this.$filmShowtimes.html(this.filmShowtimesTemplate({ film: film }).trim());
            this.$filmShowtimes.listview().listview('refresh');

            return this;
        }
    });

    var CinemaView = Backbone.View.extend({
        cinemaDetailsTemplate: _.template($('#cinema-details-template').html()),
        cinemaShowtimesTemplate: _.template($('#cinema-showtimes-template').html()),
        initialize: function(options) {
            logger.log('CinemaView.initialize');
            
            var $article = this.$('article');            
            this.$cinemaDetails = $article.find('#cinema-details');
            this.$cinemaShowtimes = $article.find('#cinema-showtimes');
            this.listenTo(this.model, 'all', this.render);
        },
        render: function() {
            logger.log('CinemaView.render');

            var cinema = this.model.toJSON();
            cinema.showtimes = _.map(this.model.get('showtimes'), function(s) { return s.toJSON(); });
            // ToDo: This hack probably needs to be replaced.
            cinema.showtimes = _.chain(cinema.showtimes)
                .forEach(function(s) {
                    var film = data.allFilms.findWhere({ id: s.filmId });
                    s.filmTitle = film.get('title');
                })
                .sortBy(function(s) { return s.filmTitle; })
                .value();
            
            this.$cinemaDetails.html(this.cinemaDetailsTemplate({ cinema: cinema }).trim());
            this.$cinemaShowtimes.html(this.cinemaShowtimesTemplate({ cinema: cinema }).trim());
            this.$cinemaShowtimes.listview().listview('refresh');

            return this;
        }
    });

    var AreaView = Backbone.View.extend({
        cinemaCollectionTemplate: _.template($('#cinema-collection-template').html()),
        initialize: function(options) {
            logger.log('AreaView.initialize');
            
            var $article = this.$('article');
            this.$h4 = $article.children('h4');
            this.$ul = $article.find('ul');
            this.listenTo(this.model, 'all', this.render);
        },
        render: function() {
            logger.log('AreaView.render');

            var area = this.model.toJSON();
            this.$h4.html(area.name);

            var items = [];
            var cinemaCollectionTemplate = this.cinemaCollectionTemplate;
            area.cinemas.forEach(function(c) {
                items.push(cinemaCollectionTemplate({ cinema: c.toJSON() }).trim());
            });

            // Add new elements.
            this.$ul.html(items.join(""));
            this.$ul.listview().listview('refresh');

            return this;
        }
    });
    
    var UpdateInfoView = Backbone.View.extend({
        initialize: function(options) {
            logger.log('UpdateInfoView.initialize');
            
            this.listenTo(this.model, 'all', this.render);
        },
        render: function() {
            logger.log('UpdateInfoView.render');
            var dateString = "-";
            if (this.model) {
                dateString = this.model.getDateString();
            }
            
            $("footer[data-role='footer']").find("h1").html("Ένημέρωση:" + dateString);
            return this;
        }
    });

    var views = {
        newFilmsView: null,
        allFilmsView: null,
        filmView: null,
        categoriesView: null,
        categoryFilmsView: null,
        allAreasView: null,
        cinemaView: null,
        areaView: null,
        updateInfoView: null,
        init: function() {
            logger.log('views.init');
            this.newFilmsView = new FilmCollectionView({ el: $("#new-films"), collection: data.newFilms });
            this.allFilmsView = new FilmCollectionView({ el: $("#all-films"), collection: data.allFilms });
            this.filmView = new FilmView({ el: $("#film"), model: data.film });
            this.categoriesView = new CategoryCollectionView({ el: $("#categories"), collection: data.categories });
            this.categoryFilmsView = new FilmCollectionView({ el: $("#category-films"), collection: data.categoryFilms });
            this.allAreasView = new AreaCollectionView({ el: $("#all-areas"), collection: data.allAreas });
            this.areaView = new AreaView({ el: $("#area"), model: data.area });
            this.cinemaView = new CinemaView({ el: $("#cinema"), model: data.cinema });
            this.updateInfoView = new UpdateInfoView({model: data.updateInfo });
        },
        downloadError: function() {
            $("footer[data-role='footer']").find("h1").html("Η ενημέρωση απέτυχε");
        }
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
                    logger.log("window.requestFileSystem: File system initialized");
                    appFS._fs = filesystem;
                    appFS.root = appFS._fs.root;
                    // Notify subscribers that the file system is ready.
                    $.publish(events.FILE_SYSTEM_READY);
                }, appFS.defaultErrorHandler);
            }
        },
        // Read the contents of a file to an array.
        readFile: function(fileURL, success, error) {
            logger.log("appFS.readFile: " + fileURL);
            appFS.root.getFile(fileURL, { create: false }, function(fileEntry) {
                logger.log("appFS.root.getFile: " + fileURL);
                // Get a File object representing the file,
                // then use FileReader to read its contents.
                fileEntry.file(function(file) {
                    logger.log("fileEntry.file: " + fileURL);

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
    /**************** DataManager **************************************************/
    
    var dataManager = {
        URL_NEW_ARRIVALS: "http://showtimes.ronto.net/data/new_arrivals.json",
        URL_ALL_FILMS: "http://showtimes.ronto.net/data/all_films.json",
        URL_SHOWTIMES: "http://showtimes.ronto.net/data/showtimes.json",
        URL_UPDATE_INFO: "http://showtimes.ronto.net/data/update_info.json",
        FILE_NEW_ARRIVALS: "new_arrivals.json",
        FILE_ALL_FILMS: "all_films.json",
        FILE_SHOWTIMES: "showtimes.json",
        FILE_UPDATE_INFO: "update_info.json",
        download: function(url, fileURL, success, error) {
            logger.log("dataManager.download: " + fileURL);
            var fileTransfer = new FileTransfer();
            var uri = encodeURI(url);

            fileTransfer.download(
                uri,
                fileURL,
                function(entry) {
                    logger.log("fileTransfer.download: " + entry.fullPath + " download completed");
                    if (success) {
                        success(entry.fullPath);
                    }
                },
                function(e) {
                    logger.error("fileTransfer.download: " + JSON.stringify(e));
                    if (error) {
                        error();
                    }
                }
            );
        },
        loadFromFile: function(filename, to, success, error) {
            logger.log("dataManager.loadFromFile: " + filename);
            appFS.readFile(filename, function(text) {
                if ($.isArray(to)) {
                    var allLines = text.split("\n");
                    logger.log(filename + ", number of lines:" + allLines.length);

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
                    logger.error("dataManager.loadFromFile: Invalid argument type. 'to' is not an array.");
                }
            }, error);
        },
        downloadUpdateInfo: function() {
            logger.log("dataManager.downloadUpdateInfo");
            
            dataManager.download(dataManager.URL_UPDATE_INFO,
                          appFS.root.toURL() + dataManager.FILE_UPDATE_INFO,
                          function(filename) {
                            $.publish(events.UPDATE_INFO_AVAILABLE, [filename, true]);
                          },
                          views.downloadError);
        },
        loadUpdateInfo: function(error, downloaded) {
            logger.log("dataManager.loadUpdateInfo: downloaded=" + (downloaded ? "true" : "false"));
            
            // This is a hack, loadFromFile can only load to an array.
            var dataContainer = [];
            dataManager.loadFromFile(dataManager.FILE_UPDATE_INFO, dataContainer, function() {
                var updateInfoRaw = dataContainer[0];                
                // This is to avoid back to back downloads in the case where the server is not updated itself.
                //if (downloaded) {
                //    lastUpdateInfo = data.updateInfo;
                //}
                logger.log("dataManager.loadUpdateInfo: updateInfo=" + new Date(updateInfoRaw.date));                
                
                if (dataManager.needsUpdate(updateInfoRaw, downloaded)) {
                    $.publish(events.STALE_DATA);
                }
                else {
                    $.publish(events.FRESH_DATA);
                }

                data.setUpdateInfo(updateInfoRaw);
            }, error);
        },
        bindEvents: function() {
            logger.log("dataManager.bindEvents");

            $.subscribe(events.FILE_SYSTEM_READY, function() {
                // Notify that the update-info file is available. If the loading (subscribed
                // to this events) fails, the file re-downloaded one more time. This is for the
                // case where the update-info file does not exist on the local file system.
                $.publish(events.UPDATE_INFO_AVAILABLE, [dataManager.downloadUpdateInfo, false]);
            });
            $.subscribe(events.STALE_DATA, dataManager.update);
            $.subscribe(events.FRESH_DATA, dataManager.load);
            
            $.subscribe(events.DOWNLOADING_COMPLETED, data.exchange);

            $.subscribe(events.UPDATE_INFO_AVAILABLE, function(e, error, downloaded) {                
                dataManager.loadUpdateInfo(error, downloaded);
            });
            $.subscribe(events.NEW_ARRIVALS_AVAILABLE, function(e, filename) {
                dataManager.loadFromFile(filename, data.newFilmsRaw, function() {                    
                    data.newFilms.reset(data.newFilmsRaw);
                });
            });
            $.subscribe(events.ALL_FILMS_AVAILABLE, function(e, filename) {
                dataManager.loadFromFile(filename, data.allFilmsRaw, function() {                    
                    data.setAllFilms(data.allFilmsRaw);
                });
            });
            $.subscribe(events.SHOWTIMES_AVAILABLE, function(e, filename) {
                dataManager.loadFromFile(filename, data.showtimesRaw, function() {                    
                    data.setShowtimes(data.showtimesRaw);
                });
            });            
        },        
        // Loads everything from file system.
        load: function() {
            logger.log("dataManager.load");
            
            $.publish(events.NEW_ARRIVALS_AVAILABLE, [dataManager.FILE_NEW_ARRIVALS]);
            $.publish(events.ALL_FILMS_AVAILABLE, [dataManager.FILE_ALL_FILMS]);
            $.publish(events.SHOWTIMES_AVAILABLE, [dataManager.FILE_SHOWTIMES]);
        },        
        update: function(all) {
            logger.log("dataManager.update");

            var rootURL = appFS.root.toURL();            

            if (all) {
                dataManager.downloadUpdateInfo();
            }
            
            dataManager.download(dataManager.URL_NEW_ARRIVALS,
                          rootURL + dataManager.FILE_NEW_ARRIVALS,
                          function(filename) {
                            $.publish(events.NEW_ARRIVALS_AVAILABLE, [filename]);
                          },
                          views.downloadError);

            dataManager.download(dataManager.URL_ALL_FILMS,
                          rootURL + dataManager.FILE_ALL_FILMS,
                          function(filename) {
                            $.publish(events.ALL_FILMS_AVAILABLE, [filename]);
                          },
                          views.downloadError);

            dataManager.download(dataManager.URL_SHOWTIMES,
                          rootURL + dataManager.FILE_SHOWTIMES,
                          function(filename) {
                            $.publish(events.SHOWTIMES_AVAILABLE, [filename]);
                          },
                          views.downloadError);
        },
        // Returns true if the data are more than 7 days old.
        needsUpdate: function(updateInfo, downloaded) {        
            logger.log("dataManager.needsUpdate: " + JSON.stringify(updateInfo));
            if (!updateInfo) {
                throw "UpdateInfo cannot be null";
            }

            var diffMs;
            if (downloaded) {
                // This happens when the application is started with fresh storage. Usually
                // it should be the first time ever. An update is needed.
                if (!data.updateInfo.get("date")) {
                    return true;
                }
                
                diffMs = updateInfo.date - data.updateInfo.get("date");
                if (diffMs <= 0) {
                    logger.log("dataManager.needsUpdate: " + "Data is up to date.");
                    return false;
                }                
            }
            else {
                diffMs = new Date().getTime() - updateInfo.date;
                if (diffMs < 0) {
                    // ToDo: Notify the user. This could end up to a never ending update process.
                    logger.log("dataManager.needsUpdate: " + "Invalid date. Something went fishy!");
                    return false;
                }                
            }
            
            var diffDate = new Date(diffMs);
            //logger.log("dataManager.needsUpdate: " + diffDate);
            var diff = {
                    diff: diffDate.getTime(),
                    days: diffDate.getUTCDate(),
                    months: (diffDate.getUTCMonth() + 1),
                    years: diffDate.getFullYear() - 1970
            };

            logger.log("dataManager.needsUpdate: " + JSON.stringify(diff));
            return  diff.days > 7 ||
                    diff.months > 0  ||
                    diff.years > 0;
        },        
        loadRawData: function() {
            logger.log("dataManager.loadRawData");
            
            var rawFilms = [{"id":"10042292","url":"http://www.athinorama.gr/cinema/movie.aspx?id=10042292","image":"/images/blank.gif","title":"Η Έξοδος: Θεοί και Βασιλιάδες","origTitle":"Exodus: Gods and Kings","category":"Περιπέτεια","year":"2014","filmType":"Έγχρ.","duration":"Διάρκεια: 150'","rated":"-","credits":"Αμερικανική ταινία, σκηνοθεσία Ρίντλεϊ Σκοτ με τους: Κρίστιαν Μπέιλ, Τζόελ Έντγκερτον, Μπεν Κίνγκσλεϊ, Τζον Τορτούρο","summary":"Όταν αποκαλυφθεί η πραγματική καταγωγή του, ο Μωυσής θα ηγηθεί της προσπάθειας των σκλαβωμένων Ισραηλιτών να αποτινάξουν τον αιγυπτιακό ζυγό και να φτάσουν στη Γη της Επαγγελίας.","review":"Με σενάριο που θυμίζει απλοϊκό, γραμμικό «ξεφύλλισμα» της γνωστής βιβλικής ιστορίας και μια ακαδημαϊκή σκηνοθετική προσέγγιση που δεν πείθει –ακόμη και σε επίπεδο φαντασμαγορίας–, το θρησκευτικό έπος δεν καταφέρνει να βρει το δρόμο προς τη… Γη της Κινηματογραφικής Πρωτοτυπίας.","imdb":"http://www.exodusgodsandkings.com/#home","theatersUrl":"movieplaces.aspx?id=10042292","theaters":""},
            {"id":"10042286","url":"http://www.athinorama.gr/cinema/movie.aspx?id=10042286","image":"/images/blank.gif","title":"Ο Επιφανής Άγνωστος","origTitle":"Un Illustre Inconnu","category":"Θρίλερ","year":"2014","filmType":"Έγχρ.","duration":"Διάρκεια: 118'","rated":"-","credits":"Γαλλική ταινία, σκηνοθεσία Ματιέ Ντελαπόρτ με τους: Ματιέ Κασοβίτς, Mαρί-Ζοζέ Κροζέ, Ερίκ Καραβακά","summary":"Ο Σεμπαστιάν Νικολά είναι ένας άχρωμος και άοσμος 45άρης. Παρατηρεί τους ανθρώπους, μαθαίνει να τους μιμείται, ενώ συχνά οικειοποιείται μυστικά την ταυτότητά τους. Μέχρι που συναντά τον διάσημο κι εκκεντρικό μουσικό Ανρί ντε Μοντάλτ.","review":"Ρεσιτάλ αλλαγής ρόλων και προσωπείων από τον Ματιέ Κασοβίτς, σε ένα ατμοσφαιρικό, αλλά εύκολων τελικών λύσεων δραματικό θρίλερ. Από τον σεναριογράφο της αστυνομικής περιπέτειας «22 Σφαίρες» και σκηνοθέτη της κομεντί «Για Όλα Φταίει τ’ Όνομά σου».","imdb":"http://www.imdb.com/title/tt3161960/","theatersUrl":"movieplaces.aspx?id=10042286","theaters":""}];

            data.newFilms.reset(rawFilms);
            data.allFilms.reset(rawFilms);
        }
    };
    
    /*******************************************************************************/
    /**************** Router *******************************************************/    
    /* Backbone Router that replaces the default JQM routing. */
    var AppRouter = Backbone.Router.extend({
        initialize: function(options) {
            logger.log("AppRouter.initialize");
            Backbone.history.start({ pushState: false });
        },
        routes: {
            "": "main",
            "film/:id":    "film",
            "category-films/:name": "category",
            "area/:name": "area",
            "cinema/:name/:area": "cinema",
            "update": "update",
            "*path": "defaultHandler"
        },
        main: function() {
            logger.log("AppRouter.main");
            $.mobile.pageContainer.pagecontainer("change", "", { reverse: false, changeHash: false });
        },
        film: function(id) {
            logger.log("AppRouter.film: " + id);

            var film = data.allFilms.findWhere({ id: id });
            if (film) {
                views.filmView.model.set(film.toJSON());

                $.mobile.pageContainer.pagecontainer("change", views.filmView.$el, { reverse: false, changeHash: false });
            }
        },
        category: function(name) {
            name = decodeURIComponent(name);
            logger.log("AppRouter.category: " + name);

            //var film = data.film(id);
            var films = data.allFilms.where({ category: name });
            if (films) {
                data.categoryFilms.reset(films);
                views.categoryFilmsView.header(name);

                $.mobile.pageContainer.pagecontainer("change", views.categoryFilmsView.$el, { reverse: false, changeHash: false });
            }
        },
        area: function(name) {
            name = decodeURIComponent(name);
            logger.log("AppRouter.area: " + name);

            var area = data.allAreas.findWhere({ name: name });
            if (area) {
                views.areaView.model.set(area.toJSON());
            }
            $.mobile.pageContainer.pagecontainer("change", views.areaView.$el, { reverse: false, changeHash: false });
        },
        cinema: function(name, area) {
            name = decodeURIComponent(name);
            area = decodeURIComponent(area);
            logger.log("AppRouter.cinema: " + name + ", " + area);

            var cinema = data.findCinema(name, area);
            if (cinema) {
                views.cinemaView.model.set(cinema.toJSON());
            }
            $.mobile.pageContainer.pagecontainer("change", views.cinemaView.$el, { reverse: false, changeHash: false });
        },
        update: function() {
            logger.log("AppRouter.update");
            
            //dataManager.downloadUpdateInfo();
            dataManager.update(true);
        },
        defaultHandler: function(path) {
            logger.log("AppRouter.default: " + path);
            $.mobile.pageContainer.pagecontainer("change", "#" + path, { reverse: false, changeHash: false });
        }
    });
    
    /*******************************************************************************/
    /**************** Application **************************************************/
    
    var app = {        
        router: null,
        initialize: function() {
            logger.log("app.initialize");

            data.init();
            views.init();

            this.bindEvents();

            // For browser debugging.
            //dataManager.loadRawData();
        },
        // Bind Event Listeners
        //
        // Bind any events that are required on startup. Common events are:
        // 'load', 'deviceready', 'offline', and 'online'.
        bindEvents: function() {
            logger.log("app.bindEvents");
            document.addEventListener('deviceready', this.onDeviceReady, false);
            window.addEventListener('filePluginIsReady', this.onfilePluginIsReady, false);

            dataManager.bindEvents();            
        },
        // deviceready Event Handler
        //
        // Note that the scope of 'this' is the event.
        onDeviceReady: function() {
            logger.log('Received Event: deviceready');

            app.router = new AppRouter();

            if (cordova.platformId !== "browser") {
                appFS.init();
            }

            // Use InAppBrowser plugin to open URLs on system browser.
            window.open = cordova.InAppBrowser.open;
        },
        // filePluginIsReady Event Handler
        //
        // Note that the scope of 'this' is the event.
        onfilePluginIsReady: function() {
            logger.log('Received Event: filePluginIsReady');

            if (cordova.platformId === "browser") {
                appFS.init();
            }
        }
    };
    
    return {
        app: app,
        data: data,
        dataManager: dataManager,
        views: views,
        logger: logger,
        events: events
    };
});