/**
 * Profile route
 */

'use strict'

var express = require('express');
var UserRepository = require('../repositories/user');
var UserModel = require('../models/user');

module.exports = function (app) {
    var router = express.Router();
    var config = app.get('config');
    var userRepo = new UserRepository(app);

    router.get('/', function (req, res) {
        var token = req.token;

        var result = {
            locale: {
                current:    app.get('locale'),
                fallback:   config['lang']['default'],
                available:  config['lang']['locales'],
            },
            userId: null,
            name: 'anonymous',
            email: null,
            roles:  [],
        };

        if (!token)
            return res.json(result);

        userRepo.find(token.user_id)
            .then(function (rows) {
                var row = rows && rows[0];
                if (!row)
                    return res.json(result);

                var user = new UserModel(row);
                result['userId'] = user.getId();
                result['name'] = user.getName();
                result['email'] = user.getEmail();
                return res.json(result);
            });
    });

    app.use('/api/profile', router);
};
