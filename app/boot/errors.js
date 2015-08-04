/**
 * Error handling
 */

'use strict'

var locator = require('node-service-locator');
var http = require('http');
var express = require('express');

module.exports = function () {
    var app = locator.get('app');

    app.use(function(err, req, res, next) {
        var code = err.status || 500;
        var params = {
            statusCode: code,
            statusPhrase: http.STATUS_CODES[code],
            error: err,
            renderStack: [ 'development', 'test' ].indexOf(app.get('env')) != -1,  // render stack trace or not
        };

        res.status(code);
        res.render('error', params);
    });
};
