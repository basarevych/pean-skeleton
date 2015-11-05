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
            "role-model": {
                path: "app/models/role.js",
                instantiate: false,
            },
            "role-repository": {
                path: "app/repositories/role.js",
                instantiate: true,
            },
            "permission-model": {
                path: "app/models/permission.js",
                instantiate: false,
            },
            "permission-repository": {
                path: "app/repositories/permission.js",
                instantiate: true,
            },
            "user-model": {
                path: "app/models/user.js",
                instantiate: false,
            },
            "user-repository": {
                path: "app/repositories/user.js",
                instantiate: true,
            },
            "token-model": {
                path: "app/models/token.js",
                instantiate: false,
            },
            "token-repository": {
                path: "app/repositories/token.js",
                instantiate: true,
            },
            "notification-model": {
                path: "app/models/notification.js",
                instantiate: false,
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
