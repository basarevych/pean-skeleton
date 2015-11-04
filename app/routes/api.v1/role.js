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

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');
    var logger = locator.get('logger');

    function parseForm(field, req, res) {
        var defer = q.defer();
        var glMessage = res.locals.glMessage;

        var form = {
            form_type: validator.trim(req.body._form_type),
            parent_id: req.body.parent_id,
            handle: validator.trim(req.body.handle),
            title: validator.trim(req.body.title),
        };

        var roleRepo = locator.get('role-repository');
        var errors = [];
        switch (field) {
            case 'parent_id':
                if (form.parent_id !== null && !validator.isLength(form.parent_id, 1))
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                break;
            case 'handle':
                if (form.form_type == 'create') {
                    if (!validator.isLength(form.handle, 1))
                        errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                }

                roleRepo.findByHandle(form.handle)
                    .then(function (roles) {
                        if (roles.length)
                            errors.push(glMessage('VALIDATOR_RECORD_EXISTS'));

                        defer.resolve({
                            field: field,
                            value: form[field],
                            form: form,
                            valid: errors.length == 0,
                            errors: errors
                        });
                    })
                    .catch(function (err) {
                        defer.reject(err);
                    });

                return defer.promise;
            case 'title':
                if (!validator.isLength(form.title, 1))
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

    router.get('/table', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'role', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var table = new Table();
                table.setColumns({
                    id: {
                        title: res.locals.glMessage('ROLE_ID_COLUMN'),
                        sql_id: 'id',
                        type: Table.TYPE_INTEGER,
                        filters: [ Table.FILTER_EQUAL ],
                        sortable: true,
                        visible: true,
                    },
                    parent: {
                        title: res.locals.glMessage('ROLE_PARENT_COLUMN'),
                        sql_id: 'parent',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE, Table.FILTER_NULL ],
                        sortable: true,
                        visible: true,
                    },
                    handle: {
                        title: res.locals.glMessage('ROLE_HANDLE_COLUMN'),
                        sql_id: 'handle',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE ],
                        sortable: true,
                        visible: true,
                    },
                    title: {
                        title: res.locals.glMessage('ROLE_TITLE_COLUMN'),
                        sql_id: 'title',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE ],
                        sortable: true,
                        visible: true,
                    },
                });
                table.setMapper(function (row) {
                    var result = row;

                    result['parent'] = validator.escape(row['parent']);
                    result['handle'] = validator.escape(row['handle']);
                    result['title'] = validator.escape(row['title']);

                    return result;
                });

                var roleRepo = locator.get('role-repository');
                var adapter = new PgAdapter();
                adapter.setClient(roleRepo.getPostgres());
                adapter.setSelect("*");
                adapter.setFrom("dt_roles");
                adapter.setWhere("");
                adapter.setParams([ ]);
                table.setAdapter(adapter);

                switch (req.query.query) {
                    case 'describe':
                        table.describe(function (err, result) {
                            if (err) {
                                logger.error('GET /v1/role/table failed', err);
                                return app.abort(res, 500, 'GET /v1/role/table failed');
                            }

                            result['success'] = true;
                            res.json(result);
                        });
                        break;
                    case 'data':
                        table.setPageParams(req.query)
                            .fetch(function (err, result) {
                                if (err) {
                                    logger.error('GET /v1/role/table failed', err);
                                    return app.abort(res, 500, 'GET /v1/role/table failed');
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
                logger.error('GET /v1/role/table failed', err);
                app.abort(res, 500, 'GET /v1/role/table failed');
            });
    });

    router.post('/validate', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'role', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                parseForm(req.body._field, req, res)
                    .then(function (data) {
                        res.json({ success: data.valid, errors: data.errors });
                    })
                    .catch(function (err) {
                        logger.error('POST /v1/role/validate failed', err);
                        app.abort(res, 500, 'POST /v1/role/validate failed');
                    });
            })
            .catch(function (err) {
                logger.error('POST /v1/role/validate failed', err);
                app.abort(res, 500, 'POST /v1/role/validate failed');
            });
    });

    router.get('/:roleId', function (req, res) {
        var roleId = parseInt(req.params.roleId, 10);
        if (isNaN(roleId))
            return app.abort(res, 400, "Invalid role ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'role', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var roleRepo = locator.get('role-repository');
                roleRepo.find(roleId)
                    .then(function (roles) {
                        var role = roles.length && roles[0];
                        if (!role)
                            return app.abort(res, 404, "Role " + roleId + " not found");

                        res.json({
                            id: role.getId(),
                            parent_id: role.getParentId(),
                            handle: role.getHandle(),
                            title: role.getTitle(),
                        });
                    })
                    .catch(function (err) {
                        logger.error('GET /v1/role/' + roleId + ' failed', err);
                        app.abort(res, 500, 'GET /v1/role/' + roleId + ' failed');
                    });
            })
            .catch(function (err) {
                logger.error('GET /v1/role/' + roleId + ' failed', err);
                app.abort(res, 500, 'GET /v1/role/' + roleId + ' failed');
            });
    });

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
                        var result = [];
                        if (req.query.view === 'tree') {
                            result = loadRoles(roles, null);
                        } else {
                            roles.forEach(function (role) {
                                result.push({
                                    id: role.getId(),
                                    parent_id: role.getParentId(),
                                    handle: role.getHandle(),
                                    title: role.getTitle(),
                                });
                            });
                        }
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

    router.post('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'role', 'create')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                req.body._form_type = 'create';
                var parentId = parseForm('parent_id', req, res);
                var handle = parseForm('handle', req, res);
                var title = parseForm('title', req, res);
                q.all([ parentId, handle, title ])
                    .then(function (result) {
                        parentId = result[0];
                        handle = result[1];
                        title = result[2];
                        if (!parentId.valid || !handle.valid || !title.valid) {
                            return res.json({
                                success: false,
                                errors: [],
                                fields: {
                                    parent_id: parentId.errors,
                                    handle: handle.errors,
                                    title: title.errors,
                                }
                            });
                        }

                        var role = new RoleModel();
                        role.setParentId(parentId.value);
                        role.setHandle(handle.value);
                        role.setTitle(title.value);

                        var roleRepo = locator.get('role-repository');
                        roleRepo.save(role)
                            .then(function (roleId) {
                                if (roleId === null)
                                    res.json({ success: false, errors: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });
                                else
                                    res.json({ success: true, id: roleId });
                            })
                            .catch(function (err) {
                                logger.error('POST /v1/role failed', err);
                                app.abort(res, 500, 'POST /v1/role failed');
                            });
                    })
                    .catch(function (err) {
                        logger.error('POST /v1/role failed', err);
                        app.abort(res, 500, 'POST /v1/role failed');
                    });
            })
            .catch(function (err) {
                logger.error('POST /v1/role failed', err);
                app.abort(res, 500, 'POST /v1/role failed');
            });
    });

    router.put('/:roleId', function (req, res) {
        var roleId = parseInt(req.params.roleId, 10);
        if (isNaN(roleId))
            return app.abort(res, 400, "Invalid role ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'role', 'update')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                req.body._form_type = 'edit';
                var parentId = parseForm('parent_id', req, res);
                var handle = parseForm('handle', req, res);
                var title = parseForm('title', req, res);
                q.all([ parentId, handle, title ])
                    .then(function (result) {
                        parentId = result[0];
                        handle = result[1];
                        title = result[2];
                        if (!parentId.valid || !handle.valid || !title.valid) {
                            return res.json({
                                success: false,
                                errors: [],
                                fields: {
                                    parent_id: parentId.errors,
                                    handle: handle.errors,
                                    title: title.errors,
                                }
                            });
                        }

                        if (parentId.value == roleId)
                            return res.json({ success: false, errors: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                        var roleRepo = locator.get('role-repository');
                        roleRepo.find(roleId)
                            .then(function (roles) {
                                var role = roles.length && roles[0];
                                if (!role)
                                    return app.abort(res, 404, "Role " + roleId + " not found");

                                role.setParentId(parentId.value);
                                if (handle.value.length)
                                    role.setHandle(handle.value);
                                role.setTitle(title.value);

                                roleRepo.save(role)
                                    .then(function (roleId) {
                                        if (roleId === null)
                                            res.json({ success: false, errors: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });
                                        else
                                            res.json({ success: true });
                                    })
                                    .catch(function (err) {
                                        logger.error('PUT /v1/role/' + roleId + ' failed', err);
                                        app.abort(res, 500, 'PUT /v1/role/' + roleId + ' failed');
                                    });
                            })
                            .catch(function (err) {
                                logger.error('PUT /v1/role/' + roleId + ' failed', err);
                                app.abort(res, 500, 'PUT /v1/role/' + userId + ' failed');
                            });
                    })
                    .catch(function (err) {
                        logger.error('PUT /v1/role/' + roleId + ' failed', err);
                        app.abort(res, 500, 'PUT /v1/role/' + roleId + ' failed');
                    });
            })
            .catch(function (err) {
                logger.error('PUT /v1/role/' + roleId + ' failed', err);
                app.abort(res, 500, 'PUT /v1/role/' + roleId + ' failed');
            });
    });

    router.delete('/:roleId', function (req, res) {
        var roleId = parseInt(req.params.roleId, 10);
        if (isNaN(roleId))
            return app.abort(res, 400, "Invalid role ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'role', 'delete')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var roleRepo = locator.get('role-repository');
                roleRepo.find(roleId)
                    .then(function (roles) {
                        var role = roles.length && roles[0];
                        if (!role)
                            return app.abort(res, 404, "Role " + roleId + " not found");

                        return roleRepo.delete(role);
                    })
                    .then(function (count) {
                        res.json({ success: count > 0 });
                    })
                    .catch(function (err) {
                        logger.error('DELETE /v1/role/' + roleId + ' failed', err);
                        app.abort(res, 500, 'DELETE /v1/role/' + roleId + ' failed');
                    });
            })
            .catch(function (err) {
                logger.error('DELETE /v1/role/' + roleId + ' failed', err);
                app.abort(res, 500, 'DELETE /v1/role/' + roleId + ' failed');
            });
    });

    router.delete('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'role', 'delete')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var roleRepo = locator.get('role-repository');
                roleRepo.deleteAll()
                    .then(function (count) {
                        res.json({ success: count > 0 });
                    })
                    .catch(function (err) {
                        logger.error('DELETE /v1/role failed', err);
                        app.abort(res, 500, 'DELETE /v1/role failed');
                    });
            })
            .catch(function (err) {
                logger.error('DELETE /v1/role failed', err);
                app.abort(res, 500, 'DELETE /v1/role failed');
            });
    });

    app.use('/v1/role', router);
};
