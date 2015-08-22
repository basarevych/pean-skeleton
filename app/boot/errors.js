/**
 * Error handling
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');

module.exports = function () {
    var app = locator.get('app');

    app.use(function(err, req, res, next) {
        app.abort(res, 500, err);
    });
};
