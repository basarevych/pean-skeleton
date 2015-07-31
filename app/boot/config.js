/**
 * Load configuration
 */

'use strict'

var fs = require('fs');
var path = require('path');
var merge = require('merge');

module.exports = function (app) {
    var dir = path.join(__dirname, '..', '..', 'config');
    var config = {};
    fs.readdirSync(dir).forEach(function (name) {
        var obj = require(dir + '/' + name)(app);
        config = merge(config, obj);
    });
    app.set('config', config);

    // expose the "env" local variable when views are rendered
    app.use(function (req, res, next) {
        res.locals.env = app.get('env');
        next();
    });
};
