/**
 * Index route
 */

'use strict'

var express = require('express');

module.exports = function (app) {
    var router = express.Router();

    router.get('/', function (req, res) {
        res.render('index');
    });

    app.use('/', router);
};
