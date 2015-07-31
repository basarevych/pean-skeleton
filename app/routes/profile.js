/**
 * Profile route
 */

'use strict'

var express = require('express');

module.exports = function (app) {
    var router = express.Router();
    var config = app.get('config');

    router.get('/profile', function (req, res) {
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

        res.json(result);
    });

    app.use('/api', router);
};
