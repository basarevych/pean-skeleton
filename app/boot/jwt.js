/**
 * Setup JSON Web Tokens
 */

'use strict'

var locator = require('node-service-locator');
var jwt = require('jsonwebtoken');

module.exports = function () {
    var config = locator.get('config');
    if (!config['jwt']['enable'])
        return;

    var app = locator.get('app');
    var logger = locator.get('logger');

    app.use(function (req, res, next) {
        var header = req.headers['authorization'];
        if (header) {
            var parts = header.split(' ');
            if (parts.length == 2 && parts[0] == 'Bearer') {
                var token = parts[1];
                jwt.verify(token, config['jwt']['secret'], function (err, decoded) {      
                    if (err)
                        logger.warn('invalid token', err);
                    else
                        req.token = decoded;

                    next();
                });
                return;
            }
        }

        next();
    });
};
