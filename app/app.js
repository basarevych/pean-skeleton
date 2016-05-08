/**
 * The application
 */

'use strict'

// check .env file presence
try {
    var fs = require('fs');
    var path = require('path');
    var fd = fs.openSync(path.join(__dirname, "..", ".env"), "r");
    fs.closeSync(fd);
} catch (err) {
    console.log("Could not open .env file");
    process.exit(1);
}

require('dotenv').load();

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var app = module.exports = express();

// load application
require('./boot/init.js')(app);         // initialize the app
require('./boot/logger.js')(app);       // logger

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Return if this is a console command
if (process.env.CONSOLE) return;

// are we behind proxy?
var trustProxy = process.env.TRUST_PROXY;
if (trustProxy === 'true')
    trustProxy = true;
app.set('trust proxy', typeof trustProxy == 'undefined' ? false : trustProxy);

// middleware
if (process.env.NODE_ENV != 'test') app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(favicon(path.join(__dirname, '..', 'public', 'img', 'favicon.ico')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// bootstrap the app
require('./boot/lang.js')(app);     // translations
require('./boot/session.js')(app);  // session support
require('./boot/jwt.js')(app);      // JSON Web Tokens
require('./boot/routes.js')(app);   // load routes
require('./boot/errors.js')(app);   // error handling
