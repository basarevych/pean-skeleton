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
var PermissionModel = locator.get('permission-model');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');
    var logger = locator.get('logger');

    function parseForm(field, req, res) {
        var defer = q.defer();
        var glMessage = res.locals.glMessage;

        var form = {
            role_id: req.body.role_id,
            resource: validator.trim(req.body.resource),
            action: validator.trim(req.body.action),
        };

        var errors = [];
        switch (field) {
            case 'role_id':
                if (!validator.isLength(form.role_id, 1))
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                break;
        }

        defer.resolve({
            field: field,
            value: form[field],
            form: form,
            valid: errors.length == 0,
            errors: errors
        });

        return defer.promise;
    }

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
                    var result = row;

                    result['role'] = validator.escape(row['role']);
                    result['resource'] = validator.escape(row['resource']);
                    result['action'] = validator.escape(row['action']);

                    return result;
                });

                var permissionRepo = locator.get('permission-repository');
                var adapter = new PgAdapter();
                adapter.setClient(permissionRepo.getPostgres());
                adapter.setSelect("*");
                adapter.setFrom("dt_permissions");
                adapter.setWhere("");
                adapter.setParams([ ]);
                table.setAdapter(adapter);

                switch (req.query.query) {
                    case 'describe':
                        table.describe(function (err, result) {
                            if (err) {
                                logger.error('GET /v1/permission/table failed', err);
                                return app.abort(res, 500, 'GET /v1/permission/table failed');
                            }

                            result['success'] = true;
                            res.json(result);
                        });
                        break;
                    case 'data':
                        table.setPageParams(req.query)
                            .fetch(function (err, result) {
                                if (err) {
                                    logger.error('GET /v1/permission/table failed', err);
                                    return app.abort(res, 500, 'GET /v1/permission/table failed');
                                }

                                result['success'] = true;
                                res.json(result);
                            });
                        break;
                    default:
                        res.json({ success: false });
                }
            })
            .catch(function (err) {
                logger.error('GET /v1/permission/table failed', err);
                app.abort(res, 500, 'GET /v1/permission/table failed');
            });
    });

    router.post('/validate', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'permission', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                parseForm(req.body._field, req, res)
                    .then(function (data) {
                        res.json({ success: data.valid, errors: data.errors });
                    })
                    .catch(function (err) {
                        logger.error('POST /v1/permission/validate failed', err);
                        app.abort(res, 500, 'POST /v1/permission/validate failed');
                    });
            })
            .catch(function (err) {
                logger.error('POST /v1/permission/validate failed', err);
                app.abort(res, 500, 'POST /v1/permission/validate failed');
            });
    });

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
                permissionRepo.find(permissionId)
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
                    })
                    .catch(function (err) {
                        logger.error('GET /v1/permission/' + permissionId + ' failed', err);
                        app.abort(res, 500, 'GET /v1/permission/' + permissionId + ' failed');
                    });
            })
            .catch(function (err) {
                logger.error('GET /v1/permission/' + permissionId + ' failed', err);
                app.abort(res, 500, 'GET /v1/permission/' + permissionId + ' failed');
            });
    });

    router.get('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'permission', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var permissionRepo = locator.get('permission-repository');
                permissionRepo.findAll()
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
                    })
                    .catch(function (err) {
                        logger.error('GET /v1/permission failed', err);
                        app.abort(res, 500, 'GET /v1/permission failed');
                    });
            })
            .catch(function (err) {
                logger.error('GET /v1/permission failed', err);
                app.abort(res, 500, 'GET /v1/permission failed');
            });
    });

    router.post('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'permission', 'create')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var roleId = parseForm('role_id', req, res);
                var resource = parseForm('resource', req, res);
                var action = parseForm('action', req, res);
                q.all([ roleId, resource, action ])
                    .then(function (result) {
                        roleId = result[0];
                        resource = result[1];
                        action = result[2];
                        if (!roleId.valid || !resource.valid || !action.valid) {
                            return res.json({
                                success: false,
                                errors: [],
                                fields: {
                                    role_id: roleId.errors,
                                    resource: resource.errors,
                                    action: action.errors,
                                }
                            });
                        }

                        var permission = new PermissionModel();
                        permission.setRoleId(roleId.value);
                        permission.setResource(resource.value);
                        permission.setAction(action.value);

                        var permissionRepo = locator.get('permission-repository');
                        permissionRepo.save(permission)
                            .then(function (permissionId) {
                                if (permissionId === null)
                                    res.json({ success: false, errors: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });
                                else
                                    res.json({ success: true, id: permissionId });
                            })
                            .catch(function (err) {
                                logger.error('POST /v1/permission failed', err);
                                app.abort(res, 500, 'POST /v1/permission failed');
                            });
                    })
                    .catch(function (err) {
                        logger.error('POST /v1/permission failed', err);
                        app.abort(res, 500, 'POST /v1/permission failed');
                    });
            })
            .catch(function (err) {
                logger.error('POST /v1/permission failed', err);
                app.abort(res, 500, 'POST /v1/permission failed');
            });
    });

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

                var roleId = parseForm('role_id', req, res);
                var resource = parseForm('resource', req, res);
                var action = parseForm('action', req, res);
                q.all([ roleId, resource, action ])
                    .then(function (result) {
                        roleId = result[0];
                        resource = result[1];
                        action = result[2];
                        if (!roleId.valid || !resource.valid || !action.valid) {
                            return res.json({
                                success: false,
                                errors: [],
                                fields: {
                                    role_id: roleId.errors,
                                    resource: resource.errors,
                                    action: action.errors,
                                }
                            });
                        }

                        var permissionRepo = locator.get('permission-repository');
                        permissionRepo.find(permissionId)
                            .then(function (permissions) {
                                var permission = permissions.length && permissions[0];
                                if (!permission)
                                    return app.abort(res, 404, "Permission " + permissionId + " not found");

                                permission.setRoleId(roleId.value);
                                permission.setResource(resource.value.length ? resource.value : null);
                                permission.setAction(action.value.length ? action.value : null);

                                permissionRepo.save(permission)
                                    .then(function (permissionId) {
                                        if (permissionId === null)
                                            res.json({ success: false, errors: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });
                                        else
                                            res.json({ success: true });
                                    })
                                    .catch(function (err) {
                                        logger.error('PUT /v1/permission/' + permissionId + ' failed', err);
                                        app.abort(res, 500, 'PUT /v1/permission/' + permissionId + ' failed');
                                    });
                            })
                            .catch(function (err) {
                                logger.error('PUT /v1/permission/' + permissionId + ' failed', err);
                                app.abort(res, 500, 'PUT /v1/permission/' + permissionId + ' failed');
                            });
                    })
                    .catch(function (err) {
                        logger.error('PUT /v1/permission/' + permissionId + ' failed', err);
                        app.abort(res, 500, 'PUT /v1/permission/' + permissionId + ' failed');
                    });
            })
            .catch(function (err) {
                logger.error('PUT /v1/permission/' + permissionId + ' failed', err);
                app.abort(res, 500, 'PUT /v1/permission/' + permissionId + ' failed');
            });
    });

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
                permissionRepo.find(permissionId)
                    .then(function (permissions) {
                        var permission = permissions.length && permissions[0];
                        if (!permission)
                            return app.abort(res, 404, "Permission " + permissionId + " not found");

                        return permissionRepo.delete(permission);
                    })
                    .then(function (count) {
                        res.json({ success: count > 0 });
                    })
                    .catch(function (err) {
                        logger.error('DELETE /v1/permission/' + permissionId + ' failed', err);
                        app.abort(res, 500, 'DELETE /v1/permission/' + permissionId + ' failed');
                    });
            })
            .catch(function (err) {
                logger.error('DELETE /v1/permission/' + permissionId + ' failed', err);
                app.abort(res, 500, 'DELETE /v1/permission/' + permissionId + ' failed');
            });
    });

    router.delete('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'permission', 'delete')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var permissionRepo = locator.get('permission-repository');
                permissionRepo.deleteAll()
                    .then(function (count) {
                        res.json({ success: count > 0 });
                    })
                    .catch(function (err) {
                        logger.error('DELETE /v1/permission failed', err);
                        app.abort(res, 500, 'DELETE /v1/permission failed');
                    });
            })
            .catch(function (err) {
                logger.error('DELETE /v1/permission failed', err);
                app.abort(res, 500, 'DELETE /v1/permission failed');
            });
    });

    app.use('/v1/permission', router);
};
