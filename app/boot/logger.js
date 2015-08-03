/**
 * Initialize logger
 */

'use strict'

var locator = require('node-service-locator');
var logger = require('tracer').colorConsole();

module.exports = function () {
    locator.register('logger', logger);
};
