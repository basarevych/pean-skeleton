/**
 * Profile route
 */

'use strict';

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var moment = require('moment-timezone');
var jwt = require('jsonwebtoken');
var q = require('q');
var ValidatorService = locator.get('validator-service');
var TokenModel = locator.get('token-model');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');

    /**
     * Login form validator
     */
    var loginForm = new ValidatorService();
    loginForm.addParser(
        'email',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.email);
            var errors = [];

            if (!validator.isLength(value, 1))
                errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
            else if (!validator.isEmail(value))
                errors.push(glMessage('VALIDATOR_EMAIL'));

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    loginForm.addParser(
        'password',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.password);
            var errors = [];

            if (!validator.isLength(value, 1))
                errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
            else if (!validator.isLength(value, 6))
                errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );

    /**
     * POST routes
     */

    // Validate login field route
    router.post('/validate', function (req, res) {
        var field = req.body._field;
        loginForm.validateField(req, res, field)
            .then(function (success) {
                res.json({ success: success, errors: loginForm.getErrors(field) });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/auth/validate failed', err);
            });
    });

    // Create token route
    router.post('/token', function (req, res) {
        var config = locator.get('config');
        var userRepo = locator.get('user-repository');
        var tokenRepo = locator.get('token-repository');
        var glMessage = res.locals.glMessage;

        loginForm.validateAll(req, res)
            .then(function (success) {
                if (!success) {
                    return res.json({
                        success: false,
                        messages: [],
                        errors: loginForm.getErrors(),
                    });
                }

                var user = null;
                var token = null;
                var encryptedData = null;

                return userRepo.findByEmail(loginForm.getValue('email'))
                    .then(function (users) {
                        user = users.length && users[0];
                        if (!user || !user.checkPassword(loginForm.getValue('password'))) {
                            res.json({
                                success: false,
                                messages: [ glMessage('ERROR_INVALID_CREDENTIALS') ],
                                errors: {},
                            });
                            return;
                        }

                        token = new TokenModel();
                        token.setUserId(user.getId());
                        token.setPayload({ user_id: user.getId() });
                        token.setIpAddress(req.connection.remoteAddress);
                        token.setCreatedAt(moment());
                        token.setUpdatedAt(moment());
                        return tokenRepo.save(token)
                            .then(function (tokenId) {
                                if (!tokenId) {
                                    res.json({
                                        success: false,
                                        messages: [ glMessage('ERROR_OPERATION_FAILED') ],
                                        errors: {},
                                    });
                                    return;
                                }

                                encryptedData = jwt.sign(token.getPayload(), config['jwt']['secret']);
                                res.json({
                                    success: true,
                                    token: encryptedData,
                                });
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/auth/token failed', err);
            });
    });

    app.use('/v1/auth', router);
};
