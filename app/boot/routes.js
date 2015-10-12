/**
 * Load application routers
 */

'use strict'

var locator = require('node-service-locator');
var fs = require('fs');
var path = require('path');

module.exports = function () {
    var app = locator.get('app');

    var dir = path.join(__dirname, '..', 'routes');
    loadDir(dir);

    // catch 404 and forward to error handler
    app.use(function(req, res, next) {
        if (res.headersSent)
            return;

        var err = new Error('Route not found');
        err.status = 404;
        next(err);
    });
};


function loadDir(dir) {
    fs.readdirSync(dir).forEach(function (name) {
        var path = dir + '/' + name;
        if (fs.statSync(path).isDirectory())
            loadDir(path);
        else
            require(path)();
    });
}
