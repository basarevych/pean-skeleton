/**
 * Error handling
 */

'use strict';

var locator = require('node-service-locator');
var express = require('express');

module.exports = function (app) {
    app.use(function(err, req, res, next) {
        app.abort(res, typeof err.status == 'undefined' ? 500 : err.status, err);
    });
};
