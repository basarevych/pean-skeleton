/**
 * Services
 */

'use strict'

module.exports = function (app) {
    return {
        services: {
            "user-repository": {
                path: "app/repositories/user.js",
                instantiate: true,
            },
        },
    };
};
