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
    var userRepo = locator.get('user-repository');

    app.use(function (req, res, next) {
        if (app.get('env') == 'test') { // override token when testing
            req.token = locator.get('token');
            next();
            return;
        }

        var header = req.headers['authorization'];
        if (header) {
            var parts = header.split(' ');
            if (parts.length == 2 && parts[0] == 'Bearer') {
                var token = parts[1];
                jwt.verify(token, config['jwt']['secret'], function (err, decoded) {      
                    if (err || !decoded) {
                        next();
                        return;
                    }

                    req.token = decoded;
                    userRepo.find(req.token.user_id)
                        .then(function (users) {
                            var user = users.length && users[0];
                            if (user)
                                req.user = user;

                            next();
                        });
                });
                return;
            }
        }

        next();
    });
};
