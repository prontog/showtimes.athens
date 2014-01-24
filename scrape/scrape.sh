#! /bin/bash
# Scrape film info and showtimes from athinorama.gr.

function scrape_films
{
    # Check if an argument was passed.
    : ${1? "scrape_films: missing first argument"}
    : ${2? "scrape_films: missing second argument"}
    # Scrape the film info from each URL.
    while read film_url
    do
        echo scraping ${film_url}...
        phantomjs scrape_film.js $film_url >> $2 
    done < $1
}

# If the temp dir exists then clean it up. Otherwise create it.
TEMPDIR=./tmp
IMAGES_TEMPDIR=$TEMPDIR/img
if [ -d $TEMPDIR ] 
then 
    echo Cleaning up...
    rm -f $TEMPDIR/*
else
    mkdir $TEMPDIR
    mkdir $IMAGES_TEMPDIR
fi

# Clean up the temp dir if interrupted by control-c.
trap 'rm -vf $TEMPDIR/*; exit 1' TERM INT

# Scrape new films.
echo +New arrivals
NEW_URLS=$TEMPDIR/new_arrivals.url
# Scraped URLs are stored to a file as well as output to STDOUT.
echo scraping URLs...
phantomjs scrape_new_arrivals.js cinema.html > $NEW_URLS
NEW_FILMS=$TEMPDIR/new_arrivals.json
scrape_films $NEW_URLS $NEW_FILMS

# Scrape all films.
echo +All films
ALL_URLS=$TEMPDIR/all_films.url
# Scraped URLs are stored to a file as well as output to STDOUT.
echo scraping URLs...
phantomjs scrape_all_films.js guide.html > $ALL_URLS
ALL_FILMS=$TEMPDIR/all_films.json
scrape_films $ALL_URLS $ALL_FILMS

# Download images.
echo +Images
IMAGES=images.txt
jq -r '.id, .image' < $ALL_FILMS > $IMAGES

while read FILM_ID
do
    read FILM_URL
    curl -L $FILM_URL > $IMAGES_TEMPDIR/$FILM_ID.jpg
done < $IMAGES

echo +Showtimes

exit 0


