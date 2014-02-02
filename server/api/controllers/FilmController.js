/**
 * FilmController
 *
 * @module      :: Controller
 * @description	:: A set of functions called `actions`.
 *
 *                 Actions contain code telling Sails how to respond to a certain type of request.
 *                 (i.e. do stuff, then send some JSON, show an HTML page, or redirect to another URL)
 *
 *                 You can configure the blueprint URLs which trigger these actions (`config/controllers.js`)
 *                 and/or override them with custom routes (`config/routes.js`)
 *
 *                 NOTE: The code you write here supports both HTTP and Socket.io automatically.
 *
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

module.exports = {     
  
    /**
    * Returns all new arrivals. All new arrivals have the newArrival 
    * attribute set to true.
    */
    new: function(req, res) {
        
        Film.find()
            .where({ newArrival: true })
            .exec(function(err, newFilms) {
                
                // Error handling
                if (err) {
                    return res.send(err,500);
                // New arrivals found successfully!
                } else {
                    return res.json(newFilms);
                }
            });
    },
    /**
    * Overrides for the settings in `config/controllers.js`
    * (specific to FilmController)
    */
    _config: {}
};
