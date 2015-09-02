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
            "websocket-server": {
                path: "app/services/websocket-server.js",
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
            "notification-repository": {
                path: "app/repositories/notification.js",
                instantiate: true,
            },
            "acl": {
                path: "app/services/acl.js",
                instantiate: true,
            },
        },
    };
};
