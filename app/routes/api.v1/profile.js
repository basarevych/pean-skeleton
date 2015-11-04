/**
 * Profile route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var q = require('q');
var UserModel = require('../../models/user');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');
    var logger = locator.get('logger');

    function parseForm(field, req, res) {
        var defer = q.defer();
        var glMessage = res.locals.glMessage;

        var form = {
            name: validator.trim(req.body.name),
            new_password: validator.trim(req.body.new_password),
            retyped_password: validator.trim(req.body.retyped_password),
        };

        var errors = [];
        switch (field) {
            case 'new_password':
                if (form.new_password.length && !validator.isLength(form.new_password, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                break;
            case 'retyped_password':
                if (form.retyped_password.length && !validator.isLength(form.retyped_password, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                if ((form.new_password.length || form.retyped_password.length)
                        && form.retyped_password != form.new_password) {
                    errors.push(glMessage('VALIDATOR_INPUT_MISMATCH'));
                }
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

    router.get('/', function (req, res) {
        var config = locator.get('config');
        var roleRepo = locator.get('role-repository');

        var result = {
            locale: {
                current:    locator.get('locale'),
                fallback:   config['lang']['default'],
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

        var name = parseForm('name', req, res);
        var newPassword = parseForm('new_password', req, res);
        var retypedPassword = parseForm('retyped_password', req, res);
        q.all([ name, newPassword, retypedPassword ])
            .then(function (result) {
                name = result[0];
                newPassword = result[1];
                retypedPassword = result[2];
                if (!name.valid || !newPassword.valid || !retypedPassword.valid) {
                    return res.json({
                        success: false,
                        errors: [],
                        fields: {
                            name: name.errors,
                            new_password: newPassword.errors,
                            retyped_password: retypedPassword.errors,
                        }
                    });
                }

                req.user.setName(name.value.length ? name.value : null);
                if (newPassword.value.length)
                    req.user.setPassword(UserModel.encryptPassword(newPassword.value));

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

    router.post('/validate', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        parseForm(req.body.field, req, res)
            .then(function (data) {
                res.json({ success: data.valid, errors: data.errors });
            })
            .catch(function (err) {
                logger.error('POST /v1/profile/validate failed', err);
                app.abort(res, 500, 'POST /v1/profile/validate failed');
            });
    });

    app.use('/v1/profile', router);
};
