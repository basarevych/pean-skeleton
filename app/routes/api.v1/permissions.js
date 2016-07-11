/**
 * Permission route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var moment = require('moment-timezone');
var q = require('q');
var Table = require('dynamic-table').table();
var PgAdapter = require('dynamic-table').pgAdapter();
var ValidatorService = locator.get('validator-service');
var PermissionModel = locator.get('permission-model');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');

    /**
     * Permission form validator
     */
    var permissionForm = new ValidatorService();
    permissionForm.addParser(
        'role_id',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.role_id);
            var errors = [];

            if (!validator.isLength(value, 1)) {
                errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
            } else if (!validator.isInt(value)) {
                errors.push(glMessage('VALIDATOR_NOT_INT'));
            } else {
                value = parseInt(value);
                var roleRepo = locator.get('role-repository');
                roleRepo.find(value)
                    .then(function (roles) {
                        if (roles.length == 0)
                            errors.push(glMessage('VALIDATOR_NOT_IN_SET'));
                        defer.resolve({ value: value, errors: errors });
                    })
                    .catch(function (err) {
                        defer.reject(err);
                    });

                return defer.promise;
            }

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    permissionForm.addParser(
        'resource',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.resource);
            var errors = [];

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    permissionForm.addParser(
        'action',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.action);
            var errors = [];

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );

    /**
     * GET routes
     */

    // Permission list table route
    router.get('/table', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'permission', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var table = new Table();
                table.setColumns({
                    id: {
                        title: res.locals.glMessage('PERMISSION_ID_COLUMN'),
                        sql_id: 'id',
                        type: Table.TYPE_INTEGER,
                        filters: [ Table.FILTER_EQUAL ],
                        sortable: true,
                        visible: true,
                    },
                    role: {
                        title: res.locals.glMessage('PERMISSION_ROLE_COLUMN'),
                        sql_id: 'role',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE ],
                        sortable: true,
                        visible: true,
                    },
                    resource: {
                        title: res.locals.glMessage('PERMISSION_RESOURCE_COLUMN'),
                        sql_id: 'resource',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE, Table.FILTER_NULL ],
                        sortable: true,
                        visible: true,
                    },
                    action: {
                        title: res.locals.glMessage('PERMISSION_ACTION_COLUMN'),
                        sql_id: 'action',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE, Table.FILTER_NULL ],
                        sortable: true,
                        visible: true,
                    },
                });
                table.setMapper(function (row) {
                    row['role'] = ValidatorService.escape(row['role']);
                    row['resource'] = ValidatorService.escape(row['resource']);
                    row['action'] = ValidatorService.escape(row['action']);

                    return row;
                });

                var permissionRepo = locator.get('permission-repository');
                var adapter = new PgAdapter();
                adapter.setClient(permissionRepo.getPostgres());
                adapter.setSelect("*");
                adapter.setFrom("dt_permissions");
                adapter.setWhere("");
                adapter.setParams([ ]);
                adapter.setDbTimezone('UTC');
                table.setAdapter(adapter);

                switch (req.query.query) {
                    case 'describe':
                        table.describe(function (err, result) {
                            if (err)
                                return app.abort(res, 500, 'GET /v1/permissions/table failed', err);

                            result['success'] = true;
                            res.json(result);
                        });
                        break;
                    case 'data':
                        table.setPageParams(req.query)
                            .fetch(function (err, result) {
                                if (err)
                                    return app.abort(res, 500, 'GET /v1/permissions/table failed', err);

                                result['success'] = true;
                                res.json(result);
                            });
                        break;
                    default:
                        res.json({ success: false });
                }
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/permissions/table failed', err);
            });
    });

    // Get particular permission route
    router.get('/:permissionId', function (req, res) {
        var permissionId = parseInt(req.params.permissionId, 10);
        if (isNaN(permissionId))
            return app.abort(res, 400, "Invalid permission ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'permission', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var permissionRepo = locator.get('permission-repository');
                return permissionRepo.find(permissionId)
                    .then(function (permissions) {
                        var permission = permissions.length && permissions[0];
                        if (!permission)
                            return app.abort(res, 404, "Permission " + permissionId + " not found");

                        res.json({
                            id: permission.getId(),
                            role_id: permission.getRoleId(),
                            resource: permission.getResource(),
                            action: permission.getAction(),
                        });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/permissions/' + permissionId + ' failed', err);
            });
    });

    // Get all permissions route
    router.get('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'permission', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var permissionRepo = locator.get('permission-repository');
                return permissionRepo.findAll()
                    .then(function (permissions) {
                        var result = [];
                        permissions.forEach(function (permission) {
                            result.push({
                                id: permission.getId(),
                                role_id: permission.getRoleId(),
                                resource: permission.getResource(),
                                action: permission.getAction(),
                            });
                        });
                        res.json(result);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/permissions failed', err);
            });
    });

    /**
     * POST routes
     */

    // Validate permission field route
    router.post('/validate', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'permission', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var id = req.body._id;
                var field = req.body._field;
                return permissionForm.validateField(req, res, field, id)
                    .then(function (success) {
                        res.json({ success: success, errors: permissionForm.getErrors(field) });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/permissions/validate failed', err);
            });
    });

    // Create permission route
    router.post('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'permission', 'create')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                return permissionForm.validateAll(req, res)
                    .then(function (success) {
                        if (!success) {
                            return res.json({
                                success: false,
                                messages: [],
                                errors: permissionForm.getErrors(),
                            });
                        }

                        var permission = new PermissionModel();
                        permission.setRoleId(parseInt(permissionForm.getValue('role_id')));
                        permission.setResource(permissionForm.getValue('resource').length ? permissionForm.getValue('resource') : null);
                        permission.setAction(permissionForm.getValue('action').length ? permissionForm.getValue('action') : null);

                        var permissionRepo = locator.get('permission-repository');
                        return permissionRepo.save(permission)
                            .then(function (permissionId) {
                                if (permissionId === null)
                                    res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });
                                else
                                    res.json({ success: true, id: permissionId });
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/permissions failed', err);
            });
    });

    /**
     * PUT routes
     */

    // Update perimission route
    router.put('/:permissionId', function (req, res) {
        var permissionId = parseInt(req.params.permissionId, 10);
        if (isNaN(permissionId))
            return app.abort(res, 400, "Invalid permission ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'permission', 'update')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                return permissionForm.validateAll(req, res, permissionId)
                    .then(function (success) {
                        if (!success) {
                            return res.json({
                                success: false,
                                messages: [],
                                errors: permissionForm.getErrors(),
                            });
                        }

                        var permissionRepo = locator.get('permission-repository');
                        return permissionRepo.find(permissionId)
                            .then(function (permissions) {
                                var permission = permissions.length && permissions[0];
                                if (!permission)
                                    return app.abort(res, 404, "Permission " + permissionId + " not found");

                                permission.setRoleId(parseInt(permissionForm.getValue('role_id')));
                                permission.setResource(permissionForm.getValue('resource').length ? permissionForm.getValue('resource') : null);
                                permission.setAction(permissionForm.getValue('action').length ? permissionForm.getValue('action') : null);

                                return permissionRepo.save(permission)
                                    .then(function (permissionId) {
                                        if (permissionId === null)
                                            res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });
                                        else
                                            res.json({ success: true });
                                    });
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'PUT /v1/permissions/' + permissionId + ' failed', err);
            });
    });

    /**
     * DELETE routes
     */

    // Delete particular permission route
    router.delete('/:permissionId', function (req, res) {
        var permissionId = parseInt(req.params.permissionId, 10);
        if (isNaN(permissionId))
            return app.abort(res, 400, "Invalid permission ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'permission', 'delete')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var permissionRepo = locator.get('permission-repository');
                return permissionRepo.find(permissionId)
                    .then(function (permissions) {
                        var permission = permissions.length && permissions[0];
                        if (!permission)
                            return app.abort(res, 404, "Permission " + permissionId + " not found");

                        return permissionRepo.delete(permission)
                            .then(function (count) {
                                if (count == 0)
                                    return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                                res.json({ success: true });
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/permissions/' + permissionId + ' failed', err);
            });
    });

    // Delete all permissions route
    router.delete('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'permission', 'delete')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var permissionRepo = locator.get('permission-repository');
                return permissionRepo.deleteAll()
                    .then(function (count) {
                        if (count == 0)
                            return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                        res.json({ success: true });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/permissions failed', err);
            });
    });

    app.use('/v1/permissions', router);
};
