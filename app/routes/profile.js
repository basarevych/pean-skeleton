/**
 * Profile route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var locator = require('node-service-locator');
var validator = require('validator');
var UserModel = require('../models/user');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');

    function parse(field, req, res) {
        var glMessage = res.locals.glMessage;
        var form = {
            name: validator.trim(
                req.body.name
                || (req.body.form && req.body.form.name)
            ),
            newPassword: validator.trim(
                req.body.newPassword
                || (req.body.form && req.body.form.newPassword)
            ),
            retypedPassword: validator.trim(
                req.body.retypedPassword
                || (req.body.form && req.body.form.retypedPassword)
            ),
        };

        var errors = [];
        switch (field) {
            case 'newPassword':
                if (form.newPassword != "" && !validator.isLength(form.newPassword, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                break;
            case 'retypedPassword':
                if (form.newPassword != "") {
                    if (!validator.isLength(form.retypedPassword, 6))
                        errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                    if (form.retypedPassword != form.newPassword)
                        errors.push(glMessage('VALIDATOR_INPUT_MISMATCH'));
                }
                break;
        }

        return {
            field: field,
            value: form[field],
            form: form,
            valid: errors.length == 0,
            errors: errors
        };
    }

    router.get('/', function (req, res) {
        var config = locator.get('config');
        var userRepo = locator.get('user-repository');

        var result = {
            locale: {
                current:    locator.get('locale'),
                fallback:   config['lang']['default'],
                available:  config['lang']['locales'],
            },
            userId: null,
            name: 'anonymous',
            email: null,
            roles:  [],
        };

        var token = req.token;
        if (!token)
            return res.json(result);

        userRepo.find(token.user_id)
            .then(function (users) {
                var user = users.length && users[0];
                if (!user)
                    return res.json(result);

                result['userId'] = user.getId();
                result['name'] = user.getName();
                result['email'] = user.getEmail();
                return res.json(result);
            });
    });

    router.put('/', function (req, res) {
        var config = locator.get('config');
        var userRepo = locator.get('user-repository');

        var token = req.token;
        if (!token)
            app.abort(403, "Token required");

        var name = parse('name', req, res);
        var newPassword = parse('newPassword', req, res);
        var retypedPassword = parse('retypedPassword', req, res);
        if (!name.valid || !newPassword.valid || !retypedPassword.valid) {
            return res.json({
                valid: false,
                errors: [],
                fields: {
                    name: name.errors,
                    newPassword: newPassword.errors,
                    retypedPassword: retypedPassword.errors,
                }
            });
        }

        userRepo.find(token.user_id)
            .then(function (users) {
                var user = users.length && users[0];
                if (!user)
                    app.abort(404, "Invalid user ID:" + id);

                user.setName(name.value.length ? name.value : null);
                if (newPassword.value.length)
                    user.setPassword(UserModel.encryptPassword(newPassword.value));

                userRepo.save(user)
                    .then(function (user) {
                        res.json({ valid: true });
                    });
            });
    });

    router.post('/validate', function (req, res) {
        var data = parse(req.body.field, req, res);
        res.json({ valid: data.valid, errors: data.errors });
    });

    app.use('/api/profile', router);
};
