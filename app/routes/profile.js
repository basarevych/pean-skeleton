/**
 * Profile route
 */

'use strict'

var express = require('express');
var UserRepository = require('../repositories/user');

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

    app.use('/api/profile', router);
};
