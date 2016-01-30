/**
 * Services
 */

'use strict'

module.exports = function (app) {
    return {
        services: {
            "acl": {
                path: "app/services/acl.js",
                instantiate: true,
            },
            "validator-service": {
                path: "app/services/validator.js",
                instantiate: false,
            },
            "web-server": {
                path: "app/services/web-server.js",
                instantiate: true,
            },
            "websocket-server": {
                path: "app/services/websocket-server.js",
                instantiate: true,
            },
            "worker-server": {
                path: "app/services/worker-server.js",
                instantiate: true,
            },
            "base-model": {
                path: "app/models/base.js",
                instantiate: false,
            },
            "base-repository": {
                path: "app/repositories/base.js",
                instantiate: false,
            },
            "role-model": {
                path: "app/models/role.js",
                instantiate: false,
            },
            "role-repository": {
                path: "app/repositories/role.js",
                instantiate: true,
            },
            "role-translation-model": {
                path: "app/models/role-translation.js",
                instantiate: false,
            },
            "role-translation-repository": {
                path: "app/repositories/role-translation.js",
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
            "job-model": {
                path: "app/models/job.js",
                instantiate: false,
            },
            "job-repository": {
                path: "app/repositories/job.js",
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
        },
    };
};
