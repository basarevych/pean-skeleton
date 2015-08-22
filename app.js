/**
 * The application
 */

'use strict'

require('dotenv').load();

var express = require('express');
var http = require('http');
var path = require('path');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var app = module.exports = express();

// are we behind proxy?
var trustProxy = process.env.TRUST_PROXY;
if (trustProxy === 'true')
    trustProxy = true;
app.set('trust proxy', typeof trustProxy == 'undefined' ? false : trustProxy);

// view engine setup
app.set('views', path.join(__dirname, 'app', 'views'));
app.set('view engine', 'jade');

// error function
app.abort = function (res, status, err) {
    if (typeof err != 'object')
        err = new Error(err);

    var code = status || 500;
    var params = {
        statusCode: code,
        statusPhrase: http.STATUS_CODES[code],
        error: err,
        renderStack: [ 'development', 'test' ].indexOf(app.get('env')) != -1,  // render stack trace or not
    };

    if (code == 500) {
        var locator = require('node-service-locator');
        var logger = locator.get('logger');
        logger.error(err);
    }

    res.status(code);
    res.render('error', params);
};

// middleware
if (process.env.NODE_ENV != 'test') app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(favicon(path.join(__dirname, 'public/img', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));

// load application
require('./app/boot/init.js')(app);         // initialize the app
require('./app/boot/logger.js')();          // logger
require('./app/boot/lang.js')();            // translations

if (!process.env.CONSOLE) {
    require('./app/boot/session.js')();     // session support
    require('./app/boot/jwt.js')();         // JSON Web Tokens
    require('./app/boot/routes.js')();      // load routes
    require('./app/boot/errors.js')();      // error handling
}
