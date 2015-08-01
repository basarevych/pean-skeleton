/**
 * Profile route
 */

'use strict'

var express = require('express');
var validator = require('validator');
var jwt = require('jsonwebtoken');

module.exports = function (app) {
    var router = express.Router();
    var config = app.get('config');

    function parse(field, form, glMessage) {
        var form = {
            login: validator.trim(form.login),
            password: validator.trim(form.password)
        };

        var errors = [];
        switch (field) {
            case 'login':
                if (!validator.isLength(form.login, 1))
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                break;
            case 'password':
                if (!validator.isLength(form.password, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                break;
        }

        return {
            field: field,
            form: form,
            valid: errors.length == 0,
            errors: errors
        };
    }

    router.post('/token', function (req, res) {
        var glMessage = res.locals.glMessage;

        var loginData = parse('login', req.body, res.locals.glMessage);
        var passwordData = parse('password', req.body, res.locals.glMessage);
        if (!loginData.valid || !passwordData.valid) {
            return res.json({
                valid: false,
                errors: [],
                fields: {
                    login: loginData.errors,
                    password: passwordData.errors,
                }
            });
        }

        if (req.body.login != 'admin' || req.body.password != 'passwd') {
            return res.json({
                valid: false,
                errors: [ glMessage('INVALID_CREDENTIALS') ],
                fields: {},
            });
        }

        var user = { admin: true };

        var config = app.get('config');
        var token = jwt.sign(user, config['jwt']['secret'], { expiresInSeconds: config['jwt']['ttl'] });

        res.json({
            valid: true,
            token: token
        });
    });

    router.post('/validate', function (req, res) {
        var field = req.body.field;
        var data = parse(field, req.body.form, res.locals.glMessage);

        res.json({ valid: data.valid, errors: data.errors });
    });

    app.use('/api/auth', router);
};
