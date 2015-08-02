/**
 * Profile route
 */

'use strict'

var express = require('express');
var validator = require('validator');
var jwt = require('jsonwebtoken');
var UserRepository = require('../repositories/user');
var UserModel = require('../models/user');

module.exports = function (app) {
    var router = express.Router();
    var config = app.get('config');
    var userRepo = new UserRepository(app);

    function parse(field, form, glMessage) {
        var form = {
            email: validator.trim(form.email),
            password: validator.trim(form.password)
        };

        var errors = [];
        switch (field) {
            case 'email':
                if (!validator.isLength(form.email, 1))
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

        var emailData = parse('email', req.body, res.locals.glMessage);
        var passwordData = parse('password', req.body, res.locals.glMessage);
        if (!emailData.valid || !passwordData.valid) {
            return res.json({
                valid: false,
                errors: [],
                fields: {
                    email: emailData.errors,
                    password: passwordData.errors,
                }
            });
        }

        var user = null;
        userRepo.findByEmail(req.body.email)
            .then(function (rows) {
                var row = rows && rows[0];
                if (row) {
                    var user = new UserModel(row);
                    if (user.checkPassword(req.body.password)) {
                        var config = app.get('config');
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
                }

                res.json({
                    valid: false,
                    errors: [ glMessage('INVALID_CREDENTIALS') ],
                    fields: {},
                });
            });
    });

    router.post('/validate', function (req, res) {
        var field = req.body.field;
        var data = parse(field, req.body.form, res.locals.glMessage);

        res.json({ valid: data.valid, errors: data.errors });
    });

    app.use('/api/auth', router);
};
