/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals define:true, cordova: true */

define(['jquery', 'jquerymobile', 'backbone', 'underscore', 'tinypubsub', 'logger',  'downloader', 'data', 'views'], function($, Mobile, Backbone, _, TinyPubSub, logger, Downloader, data, views) {
    'use strict';
    
    /*******************************************************************************/
    /**************** Events *******************************************************/

    var events = {
        // General events.
        FILE_SYSTEM_READY: 'fs_ok',
        DOWNLOADING_COMPLETED: 'down_ok',
        LOADING_COMPLETED: 'load_ok',
        // Events for specific files.
        UPDATE_INFO_AVAILABLE: 'update_d',        
        NEW_ARRIVALS_AVAILABLE: 'new_d',        
        ALL_FILMS_AVAILABLE: 'all_films_d',        
        SHOWTIMES_AVAILABLE: 'show_d'        
    };

    
    /*******************************************************************************/
    /**************** DataManager **************************************************/
    
    var dataManager = {
        URL_NEW_ARRIVALS: 'http://showtimes.ronto.net/data/new_arrivals.json',
        URL_ALL_FILMS: 'http://showtimes.ronto.net/data/all_films.json',
        URL_SHOWTIMES: 'http://showtimes.ronto.net/data/showtimes.json',
        URL_UPDATE_INFO: 'http://showtimes.ronto.net/data/update_info.json',
        FILE_NEW_ARRIVALS: 'new_arrivals.json',
        FILE_ALL_FILMS: 'all_films.json',
        FILE_SHOWTIMES: 'showtimes.json',
        FILE_UPDATE_INFO: 'update_info.json',
        getFilenameFromUrl: function(url) {
            return url.substr(url.lastIndexOf('/') + 1);
        },
        saveToSessionStorage: function(url, data) {
            var entry = dataManager.getFilenameFromUrl(url);
            logger.log('dataManager.saveToSessionStorage: ' + entry);
            
            window.sessionStorage.setItem(entry, data);            
        },
        loadFromStorage: function(entry, to, success, error) {            
            logger.log('dataManager.loadFromStorage: ' + entry);
            if ( ! $.isArray(to)) {
                logger.error('dataManager.loadFromStorage: Invalid argument type. "to" is not an array.');
            }
            
            var text = window.localStorage.getItem(entry);
            if (text) {
                logger.log('dataManager.loadFromStorage: ' + entry + ' was found in localstorage.');
                
                var allLines = text.split('\n');
                logger.log(entry + ', number of lines:' + allLines.length);

                // Clear the array.
                to.length = 0;
                // Parse each line and add to the array.
                _.forEach(allLines, function(line) {
                    if (line) {
                        to.push(data.loadSingleObject(line));
                    }
                });

                if (success) {
                    success(entry);
                }
                
                return true;
            }
            else {
                logger.log('dataManager.loadFromStorage: ' + entry + ' could not be found in localstorage.');
                
                if (error) {
                    error();
                }
                
                return false;
            }            
        },
        moveToLocalStorage: function(entry) {
            logger.log('dataManager.moveToLocalStorage: entry=' + entry);
            window.localStorage.setItem(entry,
                                        window.sessionStorage.getItem(entry));
        },
        downloadUpdateInfo: function() {
            logger.log('dataManager.downloadUpdateInfo');
            
            var dl = new Downloader(
                            [dataManager.URL_UPDATE_INFO],
                            dataManager.saveToSessionStorage,
                            function(filename) {
                                $.publish(events.UPDATE_INFO_AVAILABLE, [filename]);
                            },
                            views.downloadError).download();
        },
        updateInfoDownloaded: function() {
            return window.sessionStorage.getItem(dataManager.FILE_UPDATE_INFO);
        },
        loadUpdateInfo: function(error) {
            logger.log('dataManager.loadUpdateInfo');
            
            // This is a hack, loadFromStorage can only load to an array.
            var dataContainer = [];
            dataManager.loadFromStorage(dataManager.FILE_UPDATE_INFO, dataContainer, function() {
                var updateInfoRaw = dataContainer[0];
                logger.log('dataManager.loadUpdateInfo: updateInfo=' + new Date(updateInfoRaw.date));
                
                data.setUpdateInfo(updateInfoRaw);
            }, error);
        },
        init: function() {
            logger.log('dataManager.init');
            // Notify that the update-info file is available. If the loading (subscribed
            // to this events) fails, the file re-downloaded one more time. This is for the
            // case where the update-info file does not exist on the local storage.
            if (this.needsUpdate()) {
                this.update();
            }
            else {
                this.load();
            }
        },
        bindEvents: function() {
            logger.log('dataManager.bindEvents');
            
            $.subscribe(events.STALE_DATA, function(e) {
                dataManager.update();
            });
            $.subscribe(events.FRESH_DATA, function(e) {
                dataManager.load();
            });
            
            $.subscribe(events.DOWNLOADING_COMPLETED, function(e) {
                dataManager.moveToLocalStorage(dataManager.FILE_UPDATE_INFO);
                dataManager.moveToLocalStorage(dataManager.FILE_NEW_ARRIVALS);
                dataManager.moveToLocalStorage(dataManager.FILE_ALL_FILMS);
                dataManager.moveToLocalStorage(dataManager.FILE_SHOWTIMES);
                $.publish(events.UPDATE_INFO_AVAILABLE, [dataManager.FILE_UPDATE_INFO]);
                $.publish(events.NEW_ARRIVALS_AVAILABLE, [dataManager.FILE_NEW_ARRIVALS]);
                $.publish(events.ALL_FILMS_AVAILABLE, [dataManager.FILE_ALL_FILMS]);
                $.publish(events.SHOWTIMES_AVAILABLE, [dataManager.FILE_SHOWTIMES]);
            });

            $.subscribe(events.UPDATE_INFO_AVAILABLE, function(e, error) {    
                dataManager.loadUpdateInfo(error);
            });
            $.subscribe(events.NEW_ARRIVALS_AVAILABLE, function(e, filename) {
                dataManager.loadFromStorage(filename, data.newFilmsRaw, function() {                    
                    data.newFilms.reset(data.newFilmsRaw);
                });
            });
            $.subscribe(events.ALL_FILMS_AVAILABLE, function(e, filename) {
                dataManager.loadFromStorage(filename, data.allFilmsRaw, function() {                    
                    data.setAllFilms(data.allFilmsRaw);
                });
            });
            $.subscribe(events.SHOWTIMES_AVAILABLE, function(e, filename) {
                dataManager.loadFromStorage(filename, data.showtimesRaw, function() {                    
                    data.setShowtimes(data.showtimesRaw);
                });
            });            
        },        
        // Loads everything from file system.
        load: function() {
            logger.log('dataManager.load');
            
            $.publish(events.UPDATE_INFO_AVAILABLE, [dataManager.FILE_UPDATE_INFO]);
            $.publish(events.NEW_ARRIVALS_AVAILABLE, [dataManager.FILE_NEW_ARRIVALS]);
            $.publish(events.ALL_FILMS_AVAILABLE, [dataManager.FILE_ALL_FILMS]);
            $.publish(events.SHOWTIMES_AVAILABLE, [dataManager.FILE_SHOWTIMES]);
        },        
        update: function() {
            logger.log('dataManager.update');                        

            var filesToUpdate = [dataManager.URL_UPDATE_INFO,
                                 dataManager.URL_NEW_ARRIVALS,
                                 dataManager.URL_ALL_FILMS, 
                                 dataManager.URL_SHOWTIMES];
            
            var dl = new Downloader(filesToUpdate,
                                    dataManager.saveToSessionStorage,
                                    function() {
                                        $.publish(events.DOWNLOADING_COMPLETED);
                                    },
                                    views.downloadError).download();
        },
        // Returns true if the data are more than 7 days old.
        needsUpdate: function() {        
            logger.log('dataManager.needsUpdate');
                                    
            var loadedUpdateInfo = JSON.parse(window.localStorage.getItem(dataManager.FILE_UPDATE_INFO));            
            
            var downloadedUpdateInfo = JSON.parse(window.sessionStorage.getItem(dataManager.FILE_UPDATE_INFO));
            
            var diffMs;
            
            if (loadedUpdateInfo) {
                if (downloadedUpdateInfo) {
                    diffMs = downloadedUpdateInfo.date - loadedUpdateInfo.date;
                    if (diffMs <= 0) {
                        logger.log('dataManager.needsUpdate: ' + 'Data is up to date.');
                        return false;
                    }
                }
                else {
                    diffMs = new Date().getTime() - loadedUpdateInfo.date;
                    if (diffMs < 0) {
                        // ToDo: Notify the user. This could end up to a never ending update process.
                        logger.log('dataManager.needsUpdate: ' + 'Invalid date. Something went fishy!');
                        return false;
                    }
                }
            }
            else {
                return true;
            }
            
            var diffDate = new Date(diffMs);
            //logger.log('dataManager.needsUpdate: ' + diffDate);
            var diff = {
                    diff: diffDate.getTime(),
                    days: diffDate.getUTCDate() - 1,
                    months: diffDate.getUTCMonth(),
                    years: diffDate.getFullYear() - 1970
            };

            logger.log('dataManager.needsUpdate: ' + JSON.stringify(diff));
            return  diff.days >= 7 ||
                    diff.months > 0  ||
                    diff.years > 0;
        },        
        loadRawData: function() {
            logger.log('dataManager.loadRawData');
            
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
            logger.log('AppRouter.initialize');
            Backbone.history.start({ pushState: false });
        },
        routes: {
            'main':'main',
            'film/:id':    'film',
            'category-films/:name': 'category',
            'area/:name': 'area',
            'cinema/:name/:area': 'cinema',
            'update': 'update',
            '*path': 'defaultHandler'
        },
        main: function() {
            logger.log('AppRouter.main');
            $.mobile.pageContainer.pagecontainer('change', '#main', { reverse: false, changeHash: false });
        },
        film: function(id) {
            logger.log('AppRouter.film: ' + id);

            var film = data.allFilms.findWhere({ id: id });
            if (film) {
                views.filmView.model.set(film.toJSON());

                $.mobile.pageContainer.pagecontainer('change', views.filmView.$el, { reverse: false, changeHash: false });
            }
        },
        category: function(name) {
            name = decodeURIComponent(name);
            logger.log('AppRouter.category: ' + name);

            //var film = data.film(id);
            var films = data.allFilms.where({ category: name });
            if (films) {
                data.categoryFilms.reset(films);
                views.categoryFilmsView.header(name);

                $.mobile.pageContainer.pagecontainer('change', views.categoryFilmsView.$el, { reverse: false, changeHash: false });
            }
        },
        area: function(name) {
            name = decodeURIComponent(name);
            logger.log('AppRouter.area: ' + name);

            var area = data.allAreas.findWhere({ name: name });
            if (area) {
                views.areaView.model.set(area.toJSON());
            }
            $.mobile.pageContainer.pagecontainer('change', views.areaView.$el, { reverse: false, changeHash: false });
        },
        cinema: function(name, area) {
            name = decodeURIComponent(name);
            area = decodeURIComponent(area);
            logger.log('AppRouter.cinema: ' + name + ', ' + area);

            var cinema = data.findCinema(name, area);
            if (cinema) {
                views.cinemaView.model.set(cinema.toJSON());
            }
            $.mobile.pageContainer.pagecontainer('change', views.cinemaView.$el, { reverse: false, changeHash: false });
        },
        update: function() {
            logger.log('AppRouter.update');
            
            dataManager.update(true);
        },
        defaultHandler: function(path) {
            logger.log('AppRouter.default: ' + path);
            $.mobile.pageContainer.pagecontainer('change', '#' + path, { reverse: false, changeHash: false });
        }
    });
    
    /*******************************************************************************/
    /**************** Application **************************************************/
    
    var app = {        
        router: null,
        initialize: function() {
            logger.log('app.initialize');

            data.init();
            views.init();

            this.bindEvents();

            dataManager.init();
            // For browser debugging.
            //dataManager.loadRawData();
        },
        // Bind Event Listeners
        //
        // Bind any events that are required on startup. Common events are:
        // 'load', 'deviceready', 'offline', and 'online'.
        bindEvents: function() {
            logger.log('app.bindEvents');
            document.addEventListener('deviceready', this.onDeviceReady, false);            

            dataManager.bindEvents();            
        },
        // deviceready Event Handler
        //
        // Note that the scope of 'this' is the event.
        onDeviceReady: function() {
            logger.log('Received Event: deviceready');
                        
            app.router = new AppRouter();
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