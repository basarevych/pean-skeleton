/**
 * Session configuration
 */

'use strict'

module.exports = function (app) {
    return {
        session: {
            enable: true,                   // enable session support
            cookie: 'pean',                 // set it to your app name, alphanumeric
            secret: process.env.SECRET,     // encrypt cookie with this passphrase
            ttl: 14 * 24 * 60 * 60,         // time to live, seconds, or 0 for browser session
        },
    };
};
