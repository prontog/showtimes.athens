#! /bin/bash
# Scrape film info and showtimes from athinorama.gr.

URL_CINEMA=http://www.athinorama.gr/cinema/
#URL_CINEMA=cinema.html
URL_ALL_FILMS=http://www.athinorama.gr/cinema/guide.aspx?show=1
#URL_ALL_FILMS=guide.html
URL_ATHINORAMA=http://www.athinorama.gr

DIR_TMP=./tmp
DIR_IMAGES=$DIR_TMP/img

FN_NEW_ARRIVAL_URLS=$DIR_TMP/new_arrivals.url
FN_NEW_ARRIVALS=$DIR_TMP/new_arrivals.json
FN_ALL_FILMS_URLS=$DIR_TMP/all_films.url
FN_ALL_FILMS=$DIR_TMP/all_films.json
FN_FILM_INFO=$DIR_TMP/images.url
$FN_SHOWTIMES=$DIR_TMP/showtimes.json

function scrape_films
{
    # Check if an argument was passed.
    : ${1? "scrape_films: missing first argument"}
    : ${2? "scrape_films: missing second argument"}
    # Scrape the film info from each URL.
    while read film_url
    do
        echo scraping ${URL_CINEMA}/${film_url}...
        phantomjs scrape_film.js ${URL_CINEMA}/$film_url >> $2 
    done < $1
}

function clean_up
{
    echo Cleaning up...
    if [ -d $DIR_IMAGES ]
    then
        rm -vf $DIR_IMAGES/*
        rmdir $DIR_IMAGES
    fi
    
    if [ -d $DIR_TMP ]
    then
        rm -vf $DIR_TMP/*
        #rmdir $DIR_TMP
    fi
}

# If the temp dir exists then clean it up. Otherwise create it.
if [ -d $DIR_TMP ] 
then 
    clean_up
else
    mkdir $DIR_TMP
fi

# The same for the images folder.
if [ ! -d $DIR_IMAGES ]
then
    mkdir $DIR_IMAGES
fi

# Clean up the temp dir if interrupted by control-c.
trap 'clean_up; exit 1' TERM INT

# Scrape new films.
echo +New arrivals
# Scraped URLs are stored to a file as well as output to STDOUT.
echo scraping URLs...
phantomjs scrape_new_arrivals.js $URL_CINEMA > $FN_NEW_ARRIVAL_URLS
scrape_films $FN_NEW_ARRIVAL_URLS $FN_NEW_ARRIVALS

# Scrape all films.
echo +All films
# Scraped URLs are stored to a file as well as output to STDOUT.
echo scraping URLs...
phantomjs scrape_all_films.js $URL_ALL_FILMS > $FN_ALL_FILMS_URLS
scrape_films $FN_ALL_FILMS_URLS $FN_ALL_FILMS

echo +Images and Shotimes
jq -r '.id, .image, .theatersUrl' < $FN_ALL_FILMS > $FN_FILM_INFO

while read FILM_ID
do
    read FILM_URL
    # Download image.
    curl -L $FILM_URL > ${DIR_IMAGES}/${FILM_ID}.jpg
    read SHOWTIMES_URL
    phantomjs scrape_film_showtimes.js $FILM_ID ${URL_ATHINORAMA}/${FILM_URL} >> $FN_SHOWTIMES 
done < $FN_FILM_INFO

exit 0