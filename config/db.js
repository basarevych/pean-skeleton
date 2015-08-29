/**
 * Databases configuration
 */

'use strict'

module.exports = function (app) {
    return {
        postgres: {
            host: process.env.PG_HOST,
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
            name: process.env.PG_NAME,
        },
        redis: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            database: process.env.REDIS_DATABASE,
            password: process.env.REDIS_PASSWORD,
            namespace: process.env.PROJECT,
        },
    };
};
