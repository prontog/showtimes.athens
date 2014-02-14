#! /bin/bash
# Update latest film info and showtimes.

URL_API=http://localhost:1337
URL_API_FILMS=$URL_API/film
URL_API_SHOWTIMES=$URL_API/showtimes

# Scrape films and showtimes from www.athinorama.gr
. ./scrape.sh

# Delete all films before posting the new scraped ones.
if ! curl -X DELETE $URL_API_FILMS/deleteAll
then
    exit
fi

# Post all films.
if ! phantomjs post_all_films.js $URL_API_FILMS $DIR_OUT_CURR/all_films.json
then
    #exit
    true
fi

# Put new films.
if ! phantomjs put_new_arrivals.js $URL_API_FILMS $DIR_OUT_CURR/new_arrivals.json
then
    #exit
    true
fi

# Delete all showtimes before posting the new scraped ones.
if ! curl -X DELETE $URL_API_SHOWTIMES/deleteAll
then
    exit
fi

# Post film showtimes.
if ! phantomjs post_showtimes.js $URL_API_SHOWTIMES $DIR_OUT_CURR/showtimes.json
then
    #exit
    true
fi