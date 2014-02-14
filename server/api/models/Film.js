/**
 * Film
 *
 * @module      :: Model
 * @description :: Representation of a film. id is the unique identification of the model. Model includes validation on certain attributes.
 * @docs		:: http://sailsjs.org/#!documentation/models
 */

module.exports = {

    /* Sample:
    {
      "theaters": "",
      "theatersUrl": "/cinema/movieplaces.aspx?id=10033720",
      "imdb": "http://www.kinolorber.com/film.php?id=1322",
      "review": "Σινεφίλ κομεντί ημιτονίων πάνω στο χρόνο, τη μοίρα και τις ανθρώπινες σχέσεις, που θυμίζει ανάλαφρο Κισλόφσκι και διασκεδαστικό Ρομέρ. Συμμετοχή στο Διαγωνιστικό Τμήμα του Φεστιβάλ Κανών.",
      "summary": "Σε μια παραλιακή κορεάτικη κωμόπολη μια φοιτήτρια κινηματογράφου γράφει ένα σενάριο το οποίο αφορά τρεις διαφορετικές Γαλλίδες με το ίδιο όνομα (Αν) οι οποίες επισκέπτονται για λίγο την περιοχή.",
      "credits": "Νοτιοκορεάτικη ταινία, σκηνοθεσία Χονγκ Σανγκ-σου με τους: Ιζαμπέλ Ιπέρ, Γιου Τζουν-Σανγκ, Τζεόνγκ Γιου-μι",
      "rated": "-",
      "duration": "Διάρκεια: 89'",
      "id": "10033720",
      "url": "http://www.athinorama.gr/cinema/movie.aspx?id=10033720",
      "image": "/images/blank.gif",
      "title": "Στη Χώρα των Άλλων",
      "origTitle": "In Another Country",
      "category": "Σινεφίλ",
      "year": "2012",
      "filmType": "Έγχρ.",
      "newArrival": true
    }

    */
    attributes: {
        id: { 
            type: "string",
            required: true
        },
        url: {
            type: "url"
        },
        image: "string",
        title: "string",
        origTitle: "string",
        category: "string",
        year: {
            type: "int"
        },
        filmType: "string",
        duration: "string",
        rated: "string",
        credits: "string",
        summary: "string",
        review: "string",
        imdb: {
            type: "url"
        },
        theatersUrl: {
            // url or urlish doesn't work because this is not a full url.
            type: "string"
        },
        theaters: "string",
        newArrival: "string"
    }

};
