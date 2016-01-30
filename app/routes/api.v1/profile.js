/**
 * Profile route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var q = require('q');
var ValidatorService = locator.get('validator-service');
var UserModel = locator.get('user-model');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');
    var logger = locator.get('logger');

    var profileForm = new ValidatorService();
    profileForm.addParser(
        'name',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = validator.trim(req.body.name);
            var errors = [];

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    profileForm.addParser(
        'new_password',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = validator.trim(req.body.new_password);
            var errors = [];

            if (value.length && !validator.isLength(value, 6))
                errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    profileForm.addParser(
        'retyped_password',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = validator.trim(req.body.retyped_password);
            var otherValue = validator.trim(req.body.new_password);
            var errors = [];

            if (value.length && !validator.isLength(value, 6))
                errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
            if ((value.length || otherValue.length) && value != otherValue)
                errors.push(glMessage('VALIDATOR_INPUT_MISMATCH'));

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );

    router.post('/validate', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var field = req.body._field
        profileForm.validateField(field, req, res)
            .then(function (success) {
                res.json({ success: success, errors: profileForm.getErrors(field) });
            })
            .catch(function (err) {
                logger.error('POST /v1/profile/validate failed', err);
                app.abort(res, 500, 'POST /v1/profile/validate failed');
            });
    });

    router.get('/', function (req, res) {
        var config = locator.get('config');
        var roleRepo = locator.get('role-repository');

        var result = {
            locale: {
                current:    locator.get('locale'),
                default:    config['lang']['default'],
                available:  config['lang']['locales'],
            },
            user_id: null,
            name: 'anonymous',
            email: null,
            roles:  [],
        };

        var user = req.user;
        if (!user)
            return res.json(result);

        result['user_id'] = user.getId();
        result['name'] = user.getName();
        result['email'] = user.getEmail();
        roleRepo.findByUserId(user.getId())
            .then(function (roles) {
                roles.forEach(function (role) {
                    result['roles'].push(role.getHandle());
                });
                res.json(result);
            })
            .catch(function (err) {
                logger.error('GET /v1/profile failed', err);
                app.abort(res, 500, 'GET /v1/profile failed');
            });
    });

    router.put('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        profileForm.validateAll(req, res)
            .then(function (success) {
                if (!success) {
                    return res.json({
                        success: false,
                        messages: [],
                        errors: profileForm.getErrors(),
                    });
                }

                req.user.setName(profileForm.getValue('name').length ? profileForm.getValue('name') : null);
                if (profileForm.getValue('new_password').length)
                    req.user.setPassword(UserModel.encryptPassword(profileForm.getValue('new_password')));

                var userRepo = locator.get('user-repository');
                userRepo.save(req.user)
                    .then(function () {
                        res.json({ success: true });
                    })
                    .catch(function (err) {
                        logger.error('PUT /v1/profile failed', err);
                        app.abort(res, 500, 'PUT /v1/profile failed');
                    });
            })
            .catch(function (err) {
                logger.error('PUT /v1/profile failed', err);
                app.abort(res, 500, 'PUT /v1/profile failed');
            });
    });

    app.use('/v1/profile', router);
};
