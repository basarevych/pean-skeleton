/**
 * Setup JSON Web Tokens
 */

'use strict'

var locator = require('node-service-locator');
var jwt = require('jsonwebtoken');
var moment = require('moment-timezone');

module.exports = function () {
    var config = locator.get('config');
    if (!config['jwt']['enable'])
        return;

    var app = locator.get('app');
    var logger = locator.get('logger');
    var tokenRepo = locator.get('token-repository');
    var userRepo = locator.get('user-repository');

    function loadModels(req, token, next) {
        req.token = token;

        userRepo.find(token.getUserId())
            .then(function (users) {
                var user = users.length && users[0];
                if (user)
                    req.user = user;

                next();
            })
            .catch(function () {
                next();
            });
    }

    app.use(function (req, res, next) {
        if (app.get('env') == 'test') { // override token when testing
            var token = locator.get('token');
            loadModels(req, token, next);
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

                            loadModels(req, token, next);
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
