/**
 * Index route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');

    // Index route
    router.get('/', function (req, res) {
        res.render('index', { loading: res.locals.glMessage('APP_LOADING') });
    });

    app.use('/', router);
};
