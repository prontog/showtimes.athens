#! /bin/bash
# Scrape film info and showtimes from athinorama.gr.

URL_CINEMA=http://www.athinorama.gr/cinema/
#URL_CINEMA=cinema.html
URL_ALL_FILMS=http://www.athinorama.gr/cinema/guide.aspx?show=1
#URL_ALL_FILMS=guide.html
URL_ATHINORAMA=http://www.athinorama.gr

DIR_TMP=./tmp
DIR_IMAGES=$DIR_TMP/img
DIR_OUT=./out

FN_NEW_ARRIVAL_URLS=$DIR_TMP/new_arrivals.url
FN_NEW_ARRIVALS=$DIR_TMP/new_arrivals.json
FN_ALL_FILMS_URLS=$DIR_TMP/all_films.url
FN_ALL_FILMS=$DIR_TMP/all_films.json
FN_FILM_INFO=$DIR_TMP/images.url
FN_SHOWTIMES=$DIR_TMP/showtimes.json

function scrape_films
{
    # Check if an argument was passed.
    : ${1? "scrape_films: missing first argument"}
    : ${2? "scrape_films: missing second argument"}
    # Scrape the film info from each URL.
    while read film_url
    do
        echo scraping ${URL_CINEMA}${film_url}...
        phantomjs scrape_film.js ${URL_CINEMA}$film_url >> $2 
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

# Creates the dir passed as param 1 if it does not already exist. If it fails to 
# create the dir it exits. 
function prepare_dir
{
    if [ ! -d $1 ]
    then
        if ! mkdir $1 ; then exit 1; fi
    fi           
}

# If the temp dir exists then clean it up. Otherwise create it.
if [ -d $DIR_TMP ] 
then 
    clean_up
else
    prepare_dir $DIR_TMP
fi

# The same for the images folder.
prepare_dir $DIR_IMAGES
# The same for the out folder.
prepare_dir $DIR_OUT

# Clean up the temp dir if interrupted by control-c.
trap 'clean_up; exit 1' TERM INT

# Scrape new films.
echo +New arrivals
# Scraped URLs are stored to a file as well as output to STDOUT.
echo scraping URLs...
if ! phantomjs scrape_new_arrivals.js $URL_CINEMA > $FN_NEW_ARRIVAL_URLS
then 
    exit 
fi
scrape_films $FN_NEW_ARRIVAL_URLS $FN_NEW_ARRIVALS

# Scrape all films.
echo +All films
# Scraped URLs are stored to a file as well as output to STDOUT.
echo scraping URLs...
if ! phantomjs scrape_all_films.js $URL_ALL_FILMS > $FN_ALL_FILMS_URLS
then 
    exit 
fi
scrape_films $FN_ALL_FILMS_URLS $FN_ALL_FILMS

echo +Images and Shotimes
jq -r '.id, .image, .theatersUrl' < $FN_ALL_FILMS > $FN_FILM_INFO

while read FILM_ID
do
    read FILM_URL
    # Download image.
    FILM_URL=http://www.athinorama.gr/lmnts/events/cinema/${FILM_ID}/Poster.jpg
    echo downloading $FILM_URL
    curl -L $FILM_URL > ${DIR_IMAGES}/${FILM_ID}.jpg
    read SHOWTIMES_URL
    echo scraping ${URL_ATHINORAMA}/${SHOWTIMES_URL}
    phantomjs scrape_film_showtimes.js $FILM_ID ${URL_ATHINORAMA}/${SHOWTIMES_URL} >> $FN_SHOWTIMES 
done < $FN_FILM_INFO

# Rename the tmp folder now that the process has completed successfully.
mv $DIR_TMP $DIR_OUT/$(date +%Y%m%d_%H%M%S)

exit 0