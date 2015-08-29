/**
 * Session configuration
 */

'use strict'

var crypto = require('crypto');

module.exports = function (app) {
    var secret = process.env.SECRET;
    var sha256 = crypto.createHash('sha256').update(secret).digest("hex");

    return {
        session: {
            enable: false,                  // enable session support
            cookie: process.env.PROJECT,    // set it to your app name, alphanumeric
            secret: sha256,                 // encrypt cookie with this passphrase
            ttl: 14 * 24 * 60 * 60,         // time to live, seconds, or 0 for browser session
        },
    };
};
