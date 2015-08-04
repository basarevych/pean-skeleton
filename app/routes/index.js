/**
 * Index route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');

    router.get('/', function (req, res) {
console.log(req.session.xxx);
        res.render('index');
    });

    app.use('/', router);
};
