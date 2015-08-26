/**
 * Services
 */

'use strict'

module.exports = function (app) {
    return {
        services: {
            "role-repository": {
                path: "app/repositories/role.js",
                instantiate: true,
            },
            "permission-repository": {
                path: "app/repositories/permission.js",
                instantiate: true,
            },
            "user-repository": {
                path: "app/repositories/user.js",
                instantiate: true,
            },
            "acl": {
                path: "app/services/acl.js",
                instantiate: true,
            },
        },
    };
};
