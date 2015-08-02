/**
 * Database configuration
 */

'use strict'

module.exports = function (app) {
    return {
        db: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            name: process.env.DB_NAME,
        },
    };
};
