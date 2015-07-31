/**
 * Initialize logger
 */

'use strict'

var logger = require('tracer').colorConsole();

module.exports = function (app) {
    app.set('logger', logger);
};
