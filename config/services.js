/**
 * Services
 */

'use strict'

module.exports = function (app) {
    return {
        services: {
            "http-server": {
                path: "app/services/http-server.js",
                instantiate: true,
            },
            "socket-server": {
                path: "app/services/socket-server.js",
                instantiate: true,
            },
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
