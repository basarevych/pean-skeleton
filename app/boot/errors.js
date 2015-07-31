/**
 * Error handling
 */

'use strict'

var http = require('http');
var express = require('express');

module.exports = function (app) {
    app.use(function(err, req, res, next) {
        var code = err.status || 500;
        var params = {
            statusCode: code,
            statusPhrase: http.STATUS_CODES[code],
            error: err,
            renderStack: app.get('env') === 'development',  // render stack trace or not
        };

        res.status(code);
        res.render('error', params);
    });
};
