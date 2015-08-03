/**
 * Load configuration
 */

'use strict'

var locator = require('node-service-locator');
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

    var dir = path.join(__dirname, '..', '..');
    locator.init(config['services'], dir);

    // initial services
    locator.register('app', app);
    locator.register('config', config);

    // expose the "env" local variable when views are rendered
    app.use(function (req, res, next) {
        res.locals.env = app.get('env');
        next();
    });
};
