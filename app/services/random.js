/**
 * Random sequences service
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');

/**
 * Random service
 *
 * @constructor
 */
function Random() {
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 *
 * @param {number} min          Minimum
 * @param {number} max          Maximum
 * @return {number}             Returns random in range
 */
Random.prototype.getRandomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = Random;
