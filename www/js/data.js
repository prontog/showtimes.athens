/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals define:true, cordova: true */

/*******************************************************************************/
/**************** Data/Models/Collections **************************************/

define(['jquery', 'jquerymobile', 'backbone', 'underscore', 'tinypubsub', 'logger',  'downloader'], function($, Mobile, Backbone, _, TinyPubSub, logger, Downloader) {
    'use strict';

    var Film = Backbone.Model.extend({
        defaults: {
            id: '',
            url: '',
            image: '',
            title: '',
            origTitle: '',
            category: '',
            year: '',
            filmType: '',
            duration: '',
            rated: '',
            credits: '',
            summary: '',
            review: '',
            imdb: '',
            rottenTomatoes: '',
            officialSite: '',
            theatersUrl: '',
            theaters: null
        }
    });

    var FilmCollection = Backbone.Collection.extend({
        model: Film,
        comparator: 'title'
    });

    var Category = Backbone.Model.extend({
        defaults: {
            name: ''
        }
    });

    var CategoryCollection = Backbone.Collection.extend({
        model: Category,
        comparator: 'name'
    });

    var Area = Backbone.Model.extend({
        defaults: {
            name: '',
            cinemas: null
        }
    });

    var AreaCollection = Backbone.Collection.extend({
        model: Area,
        comparator: 'name'
    });

    var Showtime = Backbone.Model.extend({
        defaults: {
            filmId: '',
            area: '',
            cinemaName: '',
            cinemaUrl: '',
            address: '',
            map: '',
            phone: '',
            tech_info: '',
            price: '',
            rooms: ''
        }
    });

    var ShowtimeCollection = Backbone.Collection.extend({
        model: Showtime,
        comparator: 'area'
    });

    var Cinema = Backbone.Model.extend({
        defaults: {
            name: '',
            area: '',
            address: '',
            phone: '',
            map: '',
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
            var date = new Date(this.get('date'));            
            return date.getDate() + '/' + (date.getMonth() + 1) + '/' +  date.getFullYear();
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
                logger.error('data.setAllFilms: filmsRaw cannot be null');
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
                logger.error('data.setShowtimes: showtimesRaw cannot be null');
                return;
            }

            // First reset the showtimes.
            this.showtimes.reset(showtimesRaw);
            // Then reset the cinemas.
            var cinemaShowtimes = this.showtimes.groupBy(function(s) { return s.get('area') + '_' + s.get('cinemaName'); });
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
                logger.error('data.filmShowtimes: film cannot be null');
                return null;
            }
            if (!this.showtimes) {
                logger.error('data.filmShowtimes: this.showtimes cannot be null');
                return null;
            }

            return this.showtimes.where({ filmId: film.get('id') });
        },
        findCinema: function(name, area) {
            if (!name) {
                logger.error('data.findCinema: name cannot be null');
                return null;
            }
            if (!area) {
                logger.error('data.findCinema: area cannot be null');
                return null;
            }
            if (!this.showtimes) {
                logger.error('data.findCinema: this.showtimes cannot be null');
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
                logger.error('parsing ' + text);
            }

            return retObj;
        }               
    };
    
    return data;
});