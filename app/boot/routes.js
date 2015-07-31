/**
 * Load application routers
 */

'use strict'

var fs = require('fs');
var path = require('path');

module.exports = function (app) {
    var dir = path.join(__dirname, '..', 'routes');
    fs.readdirSync(dir).forEach(function (name) {
        require(dir + '/' + name)(app);
    });

    // catch 404 and forward to error handler
    app.use(function(req, res, next) {
        var err = new Error('Route not found');
        err.status = 404;
        next(err);
    });
};
