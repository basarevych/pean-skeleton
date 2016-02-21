/**
 * Setup JSON Web Tokens
 */

'use strict'

var locator = require('node-service-locator');
var jwt = require('jsonwebtoken');
var moment = require('moment-timezone');

module.exports = function (app) {
    var config = locator.get('config');
    if (!config['jwt']['enable'])
        return;

    var logger = locator.get('logger');
    var tokenRepo = locator.get('token-repository');
    var userRepo = locator.get('user-repository');

    // Read token and create req.user and req.token if successful
    app.use(function (req, res, next) {
        if (app.get('env') == 'test') { // override token when testing
            req.token = null;
            req.user = locator.get('user');
            next();
            return;
        }

        var header = req.headers['authorization'];
        if (header) {
            var parts = header.split(' ');
            if (parts.length == 2 && parts[0] == 'Bearer') {
                var token = parts[1];
                jwt.verify(token, config['jwt']['secret'], function (err, payload) {
                    if (err || !payload) {
                        next();
                        return;
                    }

                    tokenRepo.find(payload.token_id)
                        .then(function (tokens) {
                            token = tokens.length && tokens[0];
                            var now = moment();
                            if (!token || (now.unix() - token.getUpdatedAt().unix() > config['jwt']['ttl'])) {
                                next();
                                return;
                            }

                            token.setPayload(payload);
                            token.setIpAddress(req.connection.remoteAddress);
                            token.setUpdatedAt(moment());
                            return tokenRepo.save(token);
                        })
                        .then(function (tokenId) {
                            if (!tokenId) {
                                next();
                                return;
                            }

                            return userRepo.find(token.getUserId())
                                .then(function (users) {
                                    var user = users.length && users[0];
                                    if (user)
                                        req.user = user;

                                    req.token = token;

                                    next();
                                });
                        })
                        .catch(function () {
                            next();
                        });

                });
                return;
            }
        }

        next();
    });
};
