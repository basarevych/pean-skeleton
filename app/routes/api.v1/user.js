/**
 * User route
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
var UserModel = locator.get('user-model');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');

    // User form validator
    var userForm = new ValidatorService();
    userForm.addParser(
        'name',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = validator.trim(req.body.name);
            var errors = [];

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    userForm.addParser(
        'email',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = validator.trim(req.body.email);
            var errors = [];

            if (req.body._form_type == 'create') {
                if (!validator.isLength(value, 1))
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                else if (!validator.isEmail(value))
                    errors.push(glMessage('VALIDATOR_EMAIL'));
            } else {
                if (value.length && !validator.isEmail(value))
                    errors.push(glMessage('VALIDATOR_EMAIL'));
            }

            if (value.length) {
                var userRepo = locator.get('user-repository');
                userRepo.findByEmail(value)
                    .then(function (users) {
                        if (users.length)
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
    userForm.addParser(
        'password',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = validator.trim(req.body.password);
            var errors = [];

            if (req.body._form_type == 'create') {
                if (!value.length)
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                else if (!validator.isLength(value, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
            } else {
                if (value.length && !validator.isLength(value, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
            }

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    userForm.addParser(
        'retyped_password',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var otherValue = validator.trim(req.body.password);
            var value = validator.trim(req.body.retyped_password);
            var errors = [];

            if (req.body._form_type == 'create') {
                if (!value.length)
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                else if (!validator.isLength(value, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                else if (value != otherValue)
                    errors.push(glMessage('VALIDATOR_INPUT_MISMATCH'));
            } else {
                if (value.length && !validator.isLength(value, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                else if ((value.length || otherValue.length) && value != otherValue) {
                    errors.push(glMessage('VALIDATOR_INPUT_MISMATCH'));
                }
            }

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    userForm.addParser(
        'roles',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = req.body.roles;
            var errors = [];

            if (typeof value != 'object' || !Array.isArray(value))
                errors.push(glMessage('VALIDATOR_NOT_ARRAY'));

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );

    // User list table route
    router.get('/table', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'user', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var table = new Table();
                table.setColumns({
                    id: {
                        title: res.locals.glMessage('USER_ID_COLUMN'),
                        sql_id: 'id',
                        type: Table.TYPE_INTEGER,
                        filters: [ Table.FILTER_EQUAL ],
                        sortable: true,
                        visible: true,
                    },
                    name: {
                        title: res.locals.glMessage('USER_NAME_COLUMN'),
                        sql_id: 'name',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE, Table.FILTER_NULL ],
                        sortable: true,
                        visible: true,
                    },
                    email: {
                        title: res.locals.glMessage('USER_EMAIL_COLUMN'),
                        sql_id: 'email',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE ],
                        sortable: true,
                        visible: true,
                    },
                    roles: {
                        title: res.locals.glMessage('USER_ROLES_COLUMN'),
                        sql_id: 'roles',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE, Table.FILTER_NULL ],
                        sortable: true,
                        visible: true,
                    },
                    created_at: {
                        title: res.locals.glMessage('USER_CREATED_AT_COLUMN'),
                        sql_id: 'created_at',
                        type: Table.TYPE_DATETIME,
                        filters: [ Table.FILTER_BETWEEN ],
                        sortable: true,
                        visible: true,
                    },
                    tokens: {
                        title: res.locals.glMessage('USER_TOKENS_COLUMN'),
                        sql_id: 'tokens',
                        type: Table.TYPE_INTEGER,
                        filters: [ Table.FILTER_BETWEEN ],
                        sortable: true,
                        visible: true,
                    },
                });
                table.setMapper(function (row) {
                    var result = row;

                    result['name'] = validator.escape(row['name']);
                    result['email'] = validator.escape(row['email']);
                    result['roles'] = validator.escape(row['roles']);

                    if (row['created_at']) {
                        var utc = moment(row['created_at']); // db field is in UTC
                        var m = moment.tz(utc.format('YYYY-MM-DD HH:mm:ss'), 'UTC');
                        result['created_at'] = m.unix();
                    }

                    return result;
                });

                var userRepo = locator.get('user-repository');
                var adapter = new PgAdapter();
                adapter.setClient(userRepo.getPostgres());
                adapter.setSelect("*");
                adapter.setFrom("dt_users");
                adapter.setWhere("");
                adapter.setParams([ ]);
                table.setAdapter(adapter);

                switch (req.query.query) {
                    case 'describe':
                        table.describe(function (err, result) {
                            if (err)
                                return app.abort(res, 500, 'GET /v1/user/table failed', err);

                            result['success'] = true;
                            res.json(result);
                        });
                        break;
                    case 'data':
                        table.setPageParams(req.query)
                            .fetch(function (err, result) {
                                if (err)
                                    return app.abort(res, 500, 'GET /v1/user/table failed', err);

                                result['success'] = true;
                                res.json(result);
                            });
                        break;
                    default:
                        res.json({ success: false });
                }
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/user/table failed', err);
            });
    });

    // Validate user field route
    router.post('/validate', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'user', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var field = req.body._field;
                userForm.validateField(field, req, res)
                    .then(function (success) {
                        res.json({ success: success, errors: userForm.getErrors(field) });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'POST /v1/user/validate failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/user/validate failed', err);
            });
    });

    // Find a user by some critera route
    router.post('/search', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var criteria = req.body.criteria;
        if (!criteria || ['email'].indexOf(criteria) == -1)     // Currently only by email
            return app.abort(res, 400, "Invalid criteria");

        var limit = req.body.limit;
        if (!limit || !validator.isInt(limit))
            return app.abort(res, 400, "Invalid limit");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'user', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var promise;
                var userRepo = locator.get('user-repository');
                var roleRepo = locator.get('role-repository');
                switch (criteria) {
                    case 'email':
                        promise = userRepo.searchByEmail(req.body.search, limit);
                        break;
                }

                promise
                    .then(function (users) {
                        var result = [];
                        var promises = [];
                        users.forEach(function (user) {
                            result.push({
                                id: user.getId(),
                                name: user.getName(),
                                email: user.getEmail(),
                                created_at: user.getCreatedAt().unix(),
                            });
                            promises.push(roleRepo.findByUserId(user.getId()));
                        });

                        q.all(promises)
                            .then(function (userRoles) {
                                for (var i = 0; i < userRoles.length; i++) {
                                    var roleIds = [];
                                    userRoles[i].forEach(function (role) {
                                        roleIds.push(role.getId());
                                    });
                                    result[i]['roles'] = roleIds;
                                }
                                res.json(result);
                            })
                            .catch(function (err) {
                                app.abort(res, 500, 'POST /v1/user/search failed', err);
                            });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'POST /v1/user/search failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/user/search failed', err);
            });
    });

    // Get particular user route
    router.get('/:userId', function (req, res) {
        var userId = parseInt(req.params.userId, 10);
        if (isNaN(userId))
            return app.abort(res, 400, "Invalid user ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'user', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var userRepo = locator.get('user-repository');
                var roleRepo = locator.get('role-repository');
                userRepo.find(userId)
                    .then(function (users) {
                        var user = users.length && users[0];
                        if (!user)
                            return app.abort(res, 404, "User " + userId + " not found");

                        roleRepo.findByUserId(userId)
                            .then(function (roles) {
                                var roleIds = [];
                                roles.forEach(function (role) {
                                    roleIds.push(role.getId());
                                });
                                res.json({
                                    id: user.getId(),
                                    name: user.getName(),
                                    email: user.getEmail(),
                                    created_at: user.getCreatedAt().unix(),
                                    roles: roleIds,
                                });
                            })
                            .catch(function (err) {
                                app.abort(res, 500, 'GET /v1/user/' + userId + ' failed', err);
                            });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'GET /v1/user/' + userId + ' failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/user/' + userId + ' failed', err);
            });
    });

    // Get all users route
    router.get('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'user', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var userRepo = locator.get('user-repository');
                var roleRepo = locator.get('role-repository');
                userRepo.findAll()
                    .then(function (users) {
                        var result = [];
                        var promises = [];
                        users.forEach(function (user) {
                            result.push({
                                id: user.getId(),
                                name: user.getName(),
                                email: user.getEmail(),
                                created_at: user.getCreatedAt().unix(),
                            });
                            promises.push(roleRepo.findByUserId(user.getId()));
                        });

                        q.all(promises)
                            .then(function (userRoles) {
                                for (var i = 0; i < userRoles.length; i++) {
                                    var roleIds = [];
                                    userRoles[i].forEach(function (role) {
                                        roleIds.push(role.getId());
                                    });
                                    result[i]['roles'] = roleIds;
                                }
                                res.json(result);
                            })
                            .catch(function (err) {
                                app.abort(res, 500, 'GET /v1/user failed', err);
                            });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'GET /v1/user failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/user failed', err);
            });
    });

    // Create user route
    router.post('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'user', 'create')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                req.body._form_type = 'create';
                userForm.validateAll(req, res)
                    .then(function (success) {
                        if (!success) {
                            return res.json({
                                success: false,
                                messages: [],
                                errors: userForm.getErrors(),
                            });
                        }

                        var user = new UserModel();
                        user.setName(userForm.getValue('name').length ? userForm.getValue('name') : null);
                        user.setEmail(userForm.getValue('email'));
                        user.setPassword(UserModel.encryptPassword(userForm.getValue('password')));
                        user.setCreatedAt(moment());

                        var userRepo = locator.get('user-repository');
                        var roleRepo = locator.get('role-repository');
                        q.all([ userRepo.save(user), roleRepo.findAll() ])
                            .then(function (result) {
                                var userId = result[0];
                                var allRoles = result[1];
                                if (userId === null)
                                    return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                                var promises = [];
                                allRoles.forEach(function (role) {
                                    if (userForm.getValue('roles').indexOf(role.getId()) != -1)
                                        promises.push(userRepo.addRole(user, role));
                                });

                                q.all(promises)
                                    .then(function () {
                                        res.json({ success: true, id: userId });
                                    })
                                    .catch(function (err) {
                                        app.abort(res, 500, 'POST /v1/user failed', err);
                                    });
                            })
                            .catch(function (err) {
                                app.abort(res, 500, 'POST /v1/user failed', err);
                            });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'POST /v1/user failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/user failed', err);
            });
    });

    // Update user route
    router.put('/:userId', function (req, res) {
        var userId = parseInt(req.params.userId, 10);
        if (isNaN(userId))
            return app.abort(res, 400, "Invalid user ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'user', 'update')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                req.body._form_type = 'edit';
                userForm.validateAll(req, res)
                    .then(function (success) {
                        if (!success) {
                            return res.json({
                                success: false,
                                messages: [],
                                errors: userForm.getErrors(),
                            });
                        }

                        var userRepo = locator.get('user-repository');
                        var roleRepo = locator.get('role-repository');
                        userRepo.find(userId)
                            .then(function (users) {
                                var user = users.length && users[0];
                                if (!user)
                                    return app.abort(res, 404, "User " + userId + " not found");

                                user.setName(userForm.getValue('name').length ? userForm.getValue('name') : null);
                                if (userForm.getValue('email').length)
                                    user.setEmail(userForm.getValue('email'));
                                if (userForm.getValue('password').length)
                                    user.setPassword(UserModel.encryptPassword(userForm.getValue('password')));

                                q.all([ userRepo.save(user), roleRepo.findAll() ])
                                    .then(function (result) {
                                        var userId = result[0];
                                        var allRoles = result[1];
                                        if (userId === null)
                                            return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                                        var promises = [];
                                        allRoles.forEach(function (role) {
                                            if (userForm.getValue('roles').indexOf(role.getId()) == -1)
                                                promises.push(userRepo.removeRole(user, role));
                                            else
                                                promises.push(userRepo.addRole(user, role));
                                        });

                                        q.all(promises)
                                            .then(function () {
                                                res.json({ success: true });
                                            })
                                            .catch(function (err) {
                                                app.abort(res, 500, 'PUT /v1/user/' + userId + ' failed', err);
                                            });
                                    })
                                    .catch(function (err) {
                                        app.abort(res, 500, 'PUT /v1/user' + userId + ' failed', err);
                                    });
                            })
                            .catch(function (err) {
                                app.abort(res, 500, 'PUT /v1/user/' + userId + ' failed', err);
                            });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'PUT /v1/user/' + userId + ' failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'PUT /v1/user/' + userId + ' failed', err);
            });
    });

    // Delete particular user route
    router.delete('/:userId', function (req, res) {
        var userId = parseInt(req.params.userId, 10);
        if (isNaN(userId))
            return app.abort(res, 400, "Invalid user ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'user', 'delete')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var userRepo = locator.get('user-repository');
                userRepo.find(userId)
                    .then(function (users) {
                        var user = users.length && users[0];
                        if (!user)
                            return app.abort(res, 404, "User " + userId + " not found");

                        userRepo.delete(user)
                            .then(function (count) {
                                if (count == 0)
                                    return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                                res.json({ success: true });
                            })
                            .catch(function (err) {
                                app.abort(res, 500, 'DELETE /v1/user/' + userId + ' failed', err);
                            });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'DELETE /v1/user/' + userId + ' failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/user/' + userId + ' failed', err);
            });
    });

    // Delete all users route
    router.delete('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'user', 'delete')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var userRepo = locator.get('user-repository');
                userRepo.deleteAll()
                    .then(function (count) {
                        if (count == 0)
                            return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                        res.json({ success: true });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'DELETE /v1/user failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/user failed', err);
            });
    });

    app.use('/v1/user', router);
};
