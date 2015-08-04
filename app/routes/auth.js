/**
 * Profile route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var locator = require('node-service-locator');
var validator = require('validator');
var jwt = require('jsonwebtoken');

module.exports = function (app) {
    var router = express.Router();
    var app = locator.get('app');

    function parse(field, req, res) {
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

        return {
            field: field,
            value: form[field],
            form: form,
            valid: errors.length == 0,
            errors: errors
        };
    }

    router.post('/token', function (req, res) {
        var config = locator.get('config');
        var userRepo = locator.get('user-repository');
        var glMessage = res.locals.glMessage;

        var email = parse('email', req, res);
        var password = parse('password', req, res);
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

        var user = null;
        userRepo.findByEmail(email.value)
            .then(function (users) {
                var user = users.length && users[0];
                if (user && user.checkPassword(password.value)) {
                    var token = jwt.sign(
                        { user_id: user.getId() },
                        config['jwt']['secret'],
                        { expiresInSeconds: config['jwt']['ttl'] }
                    );

                    return res.json({
                        valid: true,
                        token: token
                    });
                }

                res.json({
                    valid: false,
                    errors: [ glMessage('INVALID_CREDENTIALS') ],
                    fields: {},
                });
            });
    });

    router.post('/validate', function (req, res) {
        var data = parse(req.body.field, req, res);
        res.json({ valid: data.valid, errors: data.errors });
    });

    app.use('/api/auth', router);
};
