/**
 * ShowtimesController
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
    
    deleteAll: function(req, res) {
        
        Showtimes.find()
            .exec(function(err, allShowtimes) {
                if (err) {
                    return res.send(err,500);
                } 
                else {    
                    for (var i = 0; i < allShowtimes.length; i++) {
                        var showtimes = allShowtimes[i];
                        showtimes.destroy(function(err) {
                                if (err) {
                                    console.error(err);
                                } else {
                                    console.log("Deleted showtimes with id " + showtimes.id);
                                }
                            });
                    }
                    
                    return res.json(null);
                }
            });
    },
    
    /**
    * Overrides for the settings in `config/controllers.js`
    * (specific to ShowtimesController)
    */
    _config: {}
  
};
