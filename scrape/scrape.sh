#! /bin/bash
# Scrape film info and showtimes from athinorama.gr.

URL_CINEMA=http://www.athinorama.gr/cinema/
URL_ATHINORAMA=http://www.athinorama.gr

DIR_TMP=./tmp
DIR_IMAGES=$DIR_TMP/img
DIR_OUT=./out

FN_NEW_ARRIVAL_URLS=$DIR_TMP/new_arrivals.url
FN_NEW_ARRIVALS=$DIR_TMP/new_arrivals.json
FN_ALL_FILMS_URLS=$DIR_TMP/all_films.url
FN_ALL_FILMS=$DIR_TMP/all_films.json
FN_FILM_INFO=$DIR_TMP/films.info
FN_SHOWTIMES=$DIR_TMP/showtimes.json
FN_UPDATE_INFO=$DIR_TMP/update_info.json
SLEEP_BETWEEN_REQUEST=1

function scrape_films
{
    # Check if an argument was passed.
    : ${1? "scrape_films: missing first argument"}
    : ${2? "scrape_films: missing second argument"}
    # Scrape the film info from each URL.
    while read film_url
    do        
        echo scraping ${URL_ATHINORAMA}${film_url}...
        phantomjs scrape_film.js ${URL_ATHINORAMA}$film_url >> $2
        sleep $SLEEP_BETWEEN_REQUEST
    done < $1
}

function clean_up
{
    echo Cleaning up...
    if [[ -d $DIR_IMAGES ]]
    then
        rm -vf $DIR_IMAGES/*
        rmdir $DIR_IMAGES
    fi
    
    if [[ -d $DIR_TMP ]]
    then
        rm -vf $DIR_TMP/*
    fi
}

# Creates the dir passed as param 1 if it does not already exist. If it fails to 
# create the dir it exits. 
function prepare_dir
{
    if [[ ! -d $1 ]]
    then
        if ! mkdir $1 ; then exit 1; fi
    fi           
}

# If the temp dir exists then clean it up. Otherwise create it.
if [[ -d $DIR_TMP ]]
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
# Enabling auto exit when a command fails. This simplifies error-handling.
# Note that this excludes commands following the if keyword as well as other
# cases mentioned in the BASH manual pages.
set -o errexit

# Scrape new films.
echo +New arrivals
# Scraped URLs are stored to a file as well as output to STDOUT.
echo scraping URLs...
phantomjs scrape_new_arrivals.js $URL_CINEMA > $FN_NEW_ARRIVAL_URLS
sleep $SLEEP_BETWEEN_REQUEST
scrape_films $FN_NEW_ARRIVAL_URLS $FN_NEW_ARRIVALS

# Scrape all films.
echo +All films
# Scraped URLs are stored to a file as well as output to STDOUT.
echo scraping URLs...
phantomjs scrape_all_films.js $URL_CINEMA > $FN_ALL_FILMS_URLS
sleep $SLEEP_BETWEEN_REQUEST
scrape_films $FN_ALL_FILMS_URLS $FN_ALL_FILMS

echo +Images and Showtimes
phantomjs map_film_info.js $FN_ALL_FILMS > $FN_FILM_INFO
sleep $SLEEP_BETWEEN_REQUEST

while read FILM_ID FILM_URL SHOWTIMES_URL
do    
    # Download image.    
    FILM_URL="http://www.athinorama.gr/lmnts/events/cinema/${FILM_ID}/Poster.jpg.ashx?w=170&h=250&mode=max"
    echo downloading $FILM_URL
    IMG_FILE=${DIR_IMAGES}/${FILM_ID}.jpg
    curl -L "$FILM_URL" > $IMG_FILE
    # Test if downloaded file is a JPEG. Sometimes it can be an HTML file
    # because there is no image on the site for the film.
    set +o errexit
    file $IMG_FILE | grep -s 'JPEG'
    if [[ $? -eq 0 ]]; then
        # Resize image to 170x250.
        convert $IMG_FILE -strip -resize 170x250 $IMG_FILE    
    else
        rm -f $IMG_FILE
    fi    
    set -o errexit
    
    echo scraping showtimes ${URL_ATHINORAMA}${SHOWTIMES_URL}
    phantomjs scrape_film_showtimes.js $FILM_ID ${URL_ATHINORAMA}${SHOWTIMES_URL} >> $FN_SHOWTIMES
    sleep $SLEEP_BETWEEN_REQUEST
done < $FN_FILM_INFO

echo +UpdateInfo
phantomjs prepare_update_info.js > $FN_UPDATE_INFO

# Rename the tmp folder now that the process has completed successfully.
DIR_OUT_NAME=$(date +%Y%m%d_%H%M%S)
mv $DIR_TMP $DIR_OUT/$DIR_OUT_NAME
# Zip the out dir.
cd $DIR_OUT
zip -r ${DIR_OUT_NAME}.zip $DIR_OUT_NAME
