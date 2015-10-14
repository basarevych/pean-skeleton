/**
 * Role route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var moment = require('moment-timezone');
var q = require('q');
var Table = require('dynamic-table').table();
var PgAdapter = require('dynamic-table').pgAdapter();
var RoleModel = require('../../models/role');

module.exports = function (app) {
    var router = express.Router();
    var app = locator.get('app');
    var logger = locator.get('logger');

    function loadRoles(roles, parentId) {
        var foundRoles = [];
        roles.forEach(function (role) {
            if (role.getParentId() != parentId)
                return;

            foundRoles.push({
                id: role.getId(),
                handle: role.getHandle(),
                title: role.getTitle(),
                roles: loadRoles(roles, role.getId()),
            });
        });
        return foundRoles;
    }

    router.get('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'role', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var roleRepo = locator.get('role-repository');
                roleRepo.findAll()
                    .then(function (roles) {
                        var result = loadRoles(roles, null);
                        res.json(result);
                    })
                    .catch(function (err) {
                        logger.error('GET /v1/role failed', err);
                        app.abort(res, 500, 'GET /v1/role failed');
                    });
            })
            .catch(function (err) {
                logger.error('GET /v1/role failed', err);
                app.abort(res, 500, 'GET /v1/role failed');
            });
    });

    app.use('/v1/role', router);
};
