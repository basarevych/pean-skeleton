/**
 * Load configuration
 */

'use strict'

var locator = require('node-service-locator');
var http = require('http');
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

    // error function
    app.abort = function (res, status) {
        var errors = [];
        for (var i = 2; i < arguments.length; i++)
            errors.push(arguments[i]);

        var code = status || 500;
        var params = {
            statusCode: code,
            statusPhrase: http.STATUS_CODES[code],
            errors: errors,
            renderStack: [ 'development', 'test' ].indexOf(app.get('env')) != -1,  // render stack trace or not
        };

        if (code == 500) {
            var locator = require('node-service-locator');
            var logger = locator.get('logger');
            logger.error.apply(logger, errors);
        }

        res.status(code);
        res.render('error', params);
    };

    // expose the "env" local variable when views are rendered
    app.use(function (req, res, next) {
        res.locals.env = app.get('env');
        res.locals.project = process.env.PROJECT;
        next();
    });
};
