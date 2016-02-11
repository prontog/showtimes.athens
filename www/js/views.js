/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals define:true, cordova: true */

define(['jquery', 'jquerymobile', 'backbone', 'underscore', 'tinypubsub', 'logger',  'downloader', 'data'], function($, Mobile, Backbone, _, TinyPubSub, logger, Downloader, data) {
    'use strict';

    var FilmCollectionView = Backbone.View.extend({
        filmTemplate: _.template($('#film-collection-template').html()),
        initialize: function(options) {
            logger.log('FilmCollectionView.initialize');

            this.$ul = this.$('ul');
            if (options.$header) {
                this.$header = options.$header;
            }
            else {
                this.$header = this.$('header h1');
            }
            this.listenTo(this.collection, 'reset', this.render);
        },
        render: function() {
            logger.log('FilmCollectionView.render');

            var items = [];
            var filmTemplate = this.filmTemplate;
            this.collection.forEach(function(f) {
                items.push(filmTemplate({ film: f.toJSON() }).trim());
            });
            // Add new elements.
            this.$ul.html(items.join(''));
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
            this.listenTo(this.collection, 'reset', this.render);
        },
        render: function() {
            logger.log('CategoryCollectionView.render');

            var items = [];
            var categoryTemplate = this.categoryTemplate;
            this.collection.forEach(function(c) {
                items.push(categoryTemplate({ category: c.toJSON() }).trim());
            });
            // Add new elements.
            this.$ul.html(items.join(''));

            return this;
        }
    });

    var AreaCollectionView = Backbone.View.extend({
        areaTemplate: _.template($('#area-template').html()),
        initialize: function(options) {
            logger.log('AreaCollectionView.initialize');
            
            this.$ul = this.$('ul');
            this.listenTo(this.collection, 'reset', this.render);
        },
        render: function() {
            logger.log('AreaCollectionView.render');

            var items = [];
            var areaTemplate = this.areaTemplate;
            this.collection.forEach(function(a) {
                items.push(areaTemplate({ area: a.toJSON() }).trim());
            });
            // Add new elements.
            this.$ul.html(items.join(''));

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
            this.listenTo(this.model, 'change', this.render);
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
            this.listenTo(this.model, 'change', this.render);
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
            this.$name = $article.find('#area-name');
            this.$ul = $article.find('ul');
            this.listenTo(this.model, 'change', this.render);
        },
        render: function() {
            logger.log('AreaView.render');

            var area = this.model.toJSON();
            this.$name.html(area.name);

            var items = [];
            var cinemaCollectionTemplate = this.cinemaCollectionTemplate;
            area.cinemas.forEach(function(c) {
                items.push(cinemaCollectionTemplate({ cinema: c.toJSON() }).trim());
            });

            // Add new elements.
            this.$ul.html(items.join(''));
            this.$ul.listview().listview('refresh');

            return this;
        }
    });
    
    var UpdateInfoView = Backbone.View.extend({
        initialize: function(options) {
            logger.log('UpdateInfoView.initialize');
            
            this.listenTo(this.model, 'change', this.render);
        },
        render: function() {
            logger.log('UpdateInfoView.render');
            var dateString = '-';
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
            this.newFilmsView = new FilmCollectionView({ el: $('#new-films'), collection: data.newFilms });
            this.allFilmsView = new FilmCollectionView({ el: $('#all-films'), collection: data.allFilms });
            this.filmView = new FilmView({ el: $('#film'), model: data.film });
            this.categoriesView = new CategoryCollectionView({ el: $('#categories'), collection: data.categories });
            this.categoryFilmsView = new FilmCollectionView({ el: $('#category-films'), collection: data.categoryFilms, $header: $('#category-films article h4') });
            this.allAreasView = new AreaCollectionView({ el: $('#all-areas'), collection: data.allAreas });
            this.areaView = new AreaView({ el: $('#area'), model: data.area });
            this.cinemaView = new CinemaView({ el: $('#cinema'), model: data.cinema });
            this.updateInfoView = new UpdateInfoView({model: data.updateInfo });
        },
        downloadError: function() {
            $('footer[data-role="footer"]').find('h1').html('Η ενημέρωση απέτυχε');
        }
    };
    
    return views;
});