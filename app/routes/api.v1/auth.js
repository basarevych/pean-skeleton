/**
 * Profile route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var moment = require('moment-timezone');
var jwt = require('jsonwebtoken');
var q = require('q');
var SessionModel = require('../../models/session');

module.exports = function (app) {
    var router = express.Router();
    var app = locator.get('app');
    var logger = locator.get('logger');

    function parse(field, req, res) {
        var defer = q.defer();
        var glMessage = res.locals.glMessage;
        var form = {
            email: validator.trim(
                req.body.email
                || (req.body.form && req.body.form.email)
            ),
            password: validator.trim(
                req.body.password
                || (req.body.form && req.body.form.password)
            ),
        };

        var errors = [];
        switch (field) {
            case 'email':
                if (!validator.isLength(form.email, 1))
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                if (!validator.isEmail(form.email))
                    errors.push(glMessage('VALIDATOR_EMAIL'));
                break;
            case 'password':
                if (!validator.isLength(form.password, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                break;
        }

        defer.resolve({
            field: field,
            value: form[field],
            form: form,
            valid: errors.length == 0,
            errors: errors
        });

        return defer.promise;
    }

    router.post('/token', function (req, res) {
        var config = locator.get('config');
        var userRepo = locator.get('user-repository');
        var sessionRepo = locator.get('session-repository');
        var glMessage = res.locals.glMessage;

        var email = parse('email', req, res);
        var password = parse('password', req, res);
        q.all([ email, password ])
            .then(function (result) {
                email = result[0];
                password = result[1];
                if (!email.valid || !password.valid) {
                    return res.json({
                        valid: false,
                        errors: [],
                        fields: {
                            email: email.errors,
                            password: password.errors,
                        }
                    });
                }

                var userId = null;
                userRepo.findByEmail(email.value)
                    .then(function (users) {
                        var user = users.length && users[0];
                        if (!user || !user.checkPassword(password.value)) {
                            res.json({
                                valid: false,
                                errors: [ glMessage('INVALID_CREDENTIALS') ],
                                fields: {},
                            });
                            return;
                        }

                        userId = user.getId();

                        var session = new SessionModel();
                        session.setUserId(userId);
                        session.setIpAddress(req.connection.remoteAddress);
                        session.setCreatedAt(moment());
                        session.setUpdatedAt(moment());
                        return session.save();
                    })
                    .then(function (sessionId) {
                        var token = jwt.sign(
                            {
                                user_id: userId,
                                session_id: sessionId,
                            },
                            config['jwt']['secret'],
                            { expiresInSeconds: config['jwt']['ttl'] }
                        );

                        return res.json({
                            valid: true,
                            token: token
                        });
                    })
                    .catch(function (err) {
                        logger.error('POST /v1/auth/token failed', err);
                        app.abort(res, 500, 'POST /v1/auth/token failed');
                    });
            })
            .catch(function (err) {
                logger.error('POST /v1/auth/token failed', err);
                app.abort(res, 500, 'POST /v1/auth/token failed');
            });
    });

    router.post('/validate', function (req, res) {
        parse(req.body.field, req, res)
            .then(function (data) {
                res.json({ valid: data.valid, errors: data.errors });
            })
            .catch(function (err) {
                logger.error('POST /v1/auth/validate failed', err);
                app.abort(res, 500, 'POST /v1/auth/validate failed');
            });
    });

    app.use('/v1/auth', router);
};
