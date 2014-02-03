/**
 * Showtimes
 *
 * @module      :: Model
 * @description :: Representation of a film showtime. id is the unique identification of the model. Model includes validation on certain attributes.
 * @docs		:: http://sailsjs.org/#!documentation/models
 */

module.exports = {

    /* Sample
    {
      "rooms": "Αίθουσα  3 Cosmote  Πέμ., Σάβ., Κυρ.: 17.50 μεταγλ.",
      "area": "ΠΑΓΚΡΑΤΙ",
      "filmId": "10032785",
      "cinemaName": "Village Cinemas Παγκράτι",
      "cinemaUrl": "hall.aspx?id=1000069",
      "address": "Υμηττού 110 & Χρεμωνίδου (Εμπ. Κέντρο Athens Millenium), Παγκράτι",
      "map": "javascript:openmarkerwindow(1000069) ;",
      "phone": "Τηλ. 14848 (χρέωση 0,49€/min (από σταθερό) και 0,98€/min (από κινητό).",
      "tech_info": "DOLBY SRD",
      "price": "€ 7,00, φοιτ. € 5 (Δευτ., Τρ.). Προβολές 3D : € 12,00, φοιτ., παιδ., στρατιωτικό € 11,00."
    }
    */
    attributes: {
        filmId: { 
            type: "string",
            required: true
        },
        rooms: "string",
        area: { 
            type: "string",
            required: true
        },
        cinemaName: { 
            type: "string",
            required: true
        },
        cinemaUrl: "string",
        address: { 
            type: "string",
            required: true
        },
        map: "string",
        phone: "string",
        tech_info: "string",
        price: "string"
    }

};
