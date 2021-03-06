/**
 * Role route
 */

'use strict';

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var moment = require('moment-timezone');
var q = require('q');
var Table = require('dynamic-table').table();
var PgAdapter = require('dynamic-table').pgAdapter();
var ValidatorService = locator.get('validator-service');
var RoleModel = locator.get('role-model');
var RoleTranslationModel = locator.get('role-translation-model');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');
    var config = locator.get('config');

    /**
     * Role form validator
     */
    var roleForm = new ValidatorService();
    roleForm.addParser(
        'parent_id',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = req.body.parent_id;
            var errors = [];

            if (value !== null) {
                value = ValidatorService.trim(value);
                if (!validator.isLength(value, 1)) {
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                } else if (!validator.isInt(value)) {
                    errors.push(glMessage('VALIDATOR_NOT_INT'));
                } else {
                    value = parseInt(value);
                    var roleRepo = locator.get('role-repository');
                    roleRepo.find(value)
                        .then(function (roles) {
                            if (roles.length === 0)
                                errors.push(glMessage('VALIDATOR_NOT_IN_SET'));
                            defer.resolve({ value: value, errors: errors });
                        })
                        .catch(function (err) {
                            defer.reject(err);
                        });

                    return defer.promise;
                }
            }

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    roleForm.addParser(
        'handle',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.handle);
            var errors = [];

            if (!validator.isLength(value, 1)) {
                errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
            } else {
                var roleRepo = locator.get('role-repository');
                roleRepo.findByHandle(value)
                    .then(function (roles) {
                        var exists = roles.some(function (role) {
                            if (role.getId() == id)
                                return false;
                            return true;
                        });

                        if (exists)
                            errors.push(glMessage('VALIDATOR_RECORD_EXISTS'));

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
    roleForm.addParser(
        'translations',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var data = req.body.translations;
            var value = {};
            var errors = [];

            if (typeof data == 'object' && data !== null && !Array.isArray(data)) {
                config['lang']['locales'].forEach(function (locale) {
                    value[locale] = {
                        title: ValidatorService.trim(data[locale] ? data[locale]['title'] : ''),
                    };
                });

                for (var key in value) {
                    if (!validator.isLength(value[key]['title'], 1)) {
                        errors.push(glMessage('VALIDATOR_FILL_ALL'));
                        break;
                    }
                }
            } else {
                errors.push(glMessage('VALIDATOR_INVALID_FORMAT'));
            }

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );

    /**
     * Generate role tree
     */
    function loadRoles(roles, translations, parentId) {
        var foundRoles = [];
        roles.forEach(function (role) {
            if (role.getParentId() != parentId)
                return;

            var roleTranslations = {};
            translations.forEach(function (translation) {
                if (translation.getRoleId() != role.getId())
                    return;

                roleTranslations[translation.getLocale()] = {
                    title: translation.getTitle(),
                };
            });

            foundRoles.push({
                id: role.getId(),
                handle: role.getHandle(),
                translations: roleTranslations,
                roles: loadRoles(roles, translations, role.getId()),
            });
        });
        return foundRoles;
    }

    /**
     * GET routes
     */

    // Role list table route
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
                    row['parent'] = ValidatorService.escape(row['parent']);
                    row['handle'] = ValidatorService.escape(row['handle']);
                    row['title'] = ValidatorService.escape(row['title']).replace("\\n", '<br>');

                    return row;
                });

                var roleRepo = locator.get('role-repository');
                var adapter = new PgAdapter();
                adapter.setClient(roleRepo.getPostgres());
                adapter.setSelect("*");
                adapter.setFrom("dt_roles");
                adapter.setWhere("");
                adapter.setParams([ ]);
                adapter.setDbTimezone('UTC');
                table.setAdapter(adapter);

                switch (req.query.query) {
                    case 'describe':
                        table.describe(function (err, result) {
                            if (err)
                                return app.abort(res, 500, 'GET /v1/roles/table failed', err);

                            result['success'] = true;
                            res.json(result);
                        });
                        break;
                    case 'data':
                        table.setPageParams(req.query)
                            .fetch(function (err, result) {
                                if (err)
                                    return app.abort(res, 500, 'GET /v1/roles/table failed', err);

                                result['success'] = true;
                                res.json(result);
                            });
                        break;
                    default:
                        res.json({ success: false });
                }
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/roles/table failed', err);
            });
    });

    // Get particular role route
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
                var roleTranslationRepo = locator.get('role-translation-repository');
                return q.all([ roleRepo.find(roleId), roleTranslationRepo.findByRoleId(roleId) ])
                    .then(function (result) {
                        var roles = result[0];
                        var translations = result[1];

                        var role = roles.length && roles[0];
                        if (!role)
                            return app.abort(res, 404, "Role " + roleId + " not found");

                        var roleTranslations = {};
                        translations.forEach(function (translation) {
                            roleTranslations[translation.getLocale()] = {
                                title: translation.getTitle(),
                            };
                        });

                        res.json({
                            id: role.getId(),
                            parent_id: role.getParentId(),
                            handle: role.getHandle(),
                            translations: roleTranslations,
                        });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/roles/' + roleId + ' failed', err);
            });
    });

    // Get all roles route
    router.get('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'role', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var roleRepo = locator.get('role-repository');
                var roleTranslationRepo = locator.get('role-translation-repository');
                return q.all([ roleRepo.findAll(), roleTranslationRepo.findAll() ])
                    .then(function (result) {
                        var roles = result[0];
                        var translations = result[1];

                        result = [];
                        if (req.query.view === 'tree') {
                            result = loadRoles(roles, translations, null);
                        } else {
                            roles.forEach(function (role) {
                                var roleTranslations = {};
                                translations.forEach(function (translation) {
                                    if (translation.getRoleId() == role.getId()) {
                                        roleTranslations[translation.getLocale()] = {
                                            title: translation.getTitle(),
                                        };
                                    }
                                });

                                result.push({
                                    id: role.getId(),
                                    parent_id: role.getParentId(),
                                    handle: role.getHandle(),
                                    translations: roleTranslations,
                                });
                            });
                        }
                        res.json(result);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/roles failed', err);
            });
    });

    /**
     * POST routes
     */

    // Validate role field route
    router.post('/validate', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'role', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var id = req.body._id;
                var field = req.body._field;
                return roleForm.validateField(req, res, field, id)
                    .then(function (success) {
                        res.json({ success: success, errors: roleForm.getErrors(field) });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/roles/validate failed', err);
            });
    });

    // Create role route
    router.post('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'role', 'create')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                return roleForm.validateAll(req, res)
                    .then(function (success) {
                        if (!success) {
                            return res.json({
                                success: false,
                                messages: [],
                                errors: roleForm.getErrors(),
                            });
                        }

                        var role = new RoleModel();
                        role.setParentId(roleForm.getValue('parent_id') ? parseInt(roleForm.getValue('parent_id')) : null);
                        role.setHandle(roleForm.getValue('handle'));

                        var roleRepo = locator.get('role-repository');
                        var roleTranslationRepo = locator.get('role-translation-repository');
                        return roleRepo.save(role)
                            .then(function (roleId) {
                                if (roleId === null)
                                    return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });
                                    
                                var promises = [];
                                config['lang']['locales'].forEach(function (locale) {
                                    var translation = new RoleTranslationModel();
                                    translation.setRoleId(roleId);
                                    translation.setLocale(locale);
                                    translation.setTitle(roleForm.getValue('translations')[locale]['title']);
                                    promises.push(roleTranslationRepo.save(translation));
                                });

                                return q.all(promises)
                                    .then(function (result) {
                                        var success = false;
                                        result.every(function (translationId) {
                                            success = (translationId !== null);
                                            return success;
                                        });
                                        res.json({ success: success, id: roleId });
                                    });
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/roles failed', err);
            });
    });

    /**
     * PUT routes
     */

    // Update role route
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

                return roleForm.validateAll(req, res, roleId)
                    .then(function (success) {
                        if (!success) {
                            return res.json({
                                success: false,
                                messages: [],
                                errors: roleForm.getErrors(),
                            });
                        }

                        if (parseInt(roleForm.getValue('parent_id')) == roleId)
                            return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                        var roleRepo = locator.get('role-repository');
                        var roleTranslationRepo = locator.get('role-translation-repository');
                        return q.all([ roleRepo.find(roleId), roleTranslationRepo.findByRoleId(roleId) ])
                            .then(function (result) {
                                var roles = result[0];
                                var existingTranslations = result[1];

                                var role = roles.length && roles[0];
                                if (!role)
                                    return app.abort(res, 404, "Role " + roleId + " not found");

                                role.setParentId(roleForm.getValue('parent_id') ? parseInt(roleForm.getValue('parent_id')) : null);
                                role.setHandle(roleForm.getValue('handle'));

                                return roleRepo.save(role)
                                    .then(function (roleId) {
                                        if (roleId === null)
                                            return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                                        var promises = [];
                                        config['lang']['locales'].forEach(function (locale) {
                                            var foundTranslation = null;
                                            existingTranslations.some(function (translation) {
                                                if (translation.getLocale() == locale) {
                                                    foundTranslation = translation;
                                                    return true;
                                                }
                                                return false;
                                            });

                                            if (!foundTranslation) {
                                                foundTranslation = new RoleTranslationModel();
                                                foundTranslation.setRoleId(roleId);
                                                foundTranslation.setLocale(locale);
                                            }

                                            foundTranslation.setTitle(roleForm.getValue('translations')[locale]['title']);
                                            promises.push(roleTranslationRepo.save(foundTranslation));
                                        });

                                        return q.all(promises)
                                            .then(function (result) {
                                                var success = false;
                                                result.every(function (translationId) {
                                                    success = (translationId !== null);
                                                    return success;
                                                });
                                                res.json({ success: success });
                                            });
                                    });
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'PUT /v1/roles/' + roleId + ' failed', err);
            });
    });

    /**
     * DELETE routes
     */

    // Delete particular role route
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
                return roleRepo.find(roleId)
                    .then(function (roles) {
                        var role = roles.length && roles[0];
                        if (!role)
                            return app.abort(res, 404, "Role " + roleId + " not found");

                        return roleRepo.delete(role)
                            .then(function (count) {
                                if (count === 0)
                                    return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                                res.json({ success: true });
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/roles/' + roleId + ' failed', err);
            });
    });

    // Delete all roles route
    router.delete('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'role', 'delete')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var roleRepo = locator.get('role-repository');
                return roleRepo.deleteAll()
                    .then(function (count) {
                        if (count === 0)
                            return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                        res.json({ success: true });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/roles failed', err);
            });
    });

    app.use('/v1/roles', router);
};
