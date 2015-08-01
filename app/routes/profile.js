/**
 * Profile route
 */

'use strict'

var express = require('express');

module.exports = function (app) {
    var router = express.Router();
    var config = app.get('config');

    router.get('/', function (req, res) {
        var token = req.token;

        var result = {
            locale: {
                current:    app.get('locale'),
                fallback:   config['lang']['default'],
                available:  config['lang']['locales'],
            },
            userId: null,
            login:  'anonymous',
            roles:  [],
        };

        if (token) {
            result['userId'] = 1;
            result['login'] = 'admin';
        }

        res.json(result);
    });

    app.use('/api/profile', router);
};
