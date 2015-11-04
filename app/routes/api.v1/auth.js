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
var TokenModel = require('../../models/token');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');
    var logger = locator.get('logger');

    function parseForm(field, req, res) {
        var defer = q.defer();
        var glMessage = res.locals.glMessage;

        var form = {
            email: validator.trim(req.body.email),
            password: validator.trim(req.body.password),
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
                if (!validator.isLength(form.password, 1))
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
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
        var tokenRepo = locator.get('token-repository');
        var glMessage = res.locals.glMessage;

        var email = parseForm('email', req, res);
        var password = parseForm('password', req, res);
        q.all([ email, password ])
            .then(function (result) {
                email = result[0];
                password = result[1];
                if (!email.valid || !password.valid) {
                    return res.json({
                        success: false,
                        errors: [],
                        fields: {
                            email: email.errors,
                            password: password.errors,
                        }
                    });
                }

                var user = null;
                var token = null;
                var encryptedData = null;

                userRepo.findByEmail(email.value)
                    .then(function (users) {
                        user = users.length && users[0];
                        if (!user || !user.checkPassword(password.value)) {
                            res.json({
                                success: false,
                                errors: [ glMessage('INVALID_CREDENTIALS') ],
                                fields: {},
                            });
                            return;
                        }

                        token = new TokenModel();
                        token.setUserId(user.getId());
                        token.setPayload('{ "user_id": ' + user.getId() + ' }');
                        token.setIpAddress(req.connection.remoteAddress);
                        token.setCreatedAt(moment());
                        token.setUpdatedAt(moment());
                        return tokenRepo.save(token);
                    })
                    .then(function () {
                        if (!user || !token)
                            return;

                        var payload = {
                            token_id: token.getId(),
                            user_id: user.getId(),
                        };

                        encryptedData = jwt.sign(payload, config['jwt']['secret']);

                        token.setPayload(JSON.stringify(payload));
                        return tokenRepo.save(token);
                    })
                    .then(function () {
                        if (!encryptedData)
                            return;

                        res.json({
                            success: true,
                            token: encryptedData,
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
        parseForm(req.body.field, req, res)
            .then(function (data) {
                res.json({ success: data.valid, errors: data.errors });
            })
            .catch(function (err) {
                logger.error('POST /v1/auth/validate failed', err);
                app.abort(res, 500, 'POST /v1/auth/validate failed');
            });
    });

    app.use('/v1/auth', router);
};
