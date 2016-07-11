/**
 * User route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var moment = require('moment-timezone');
var q = require('q');
var clone = require('clone');
var Table = require('dynamic-table').table();
var PgAdapter = require('dynamic-table').pgAdapter();
var ValidatorService = locator.get('validator-service');
var UserModel = locator.get('user-model');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');

    /**
     * User form validator
     */
    var userForm = new ValidatorService();
    userForm.addParser(
        'name',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.name);
            var errors = [];

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    userForm.addParser(
        'email',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.email);
            var errors = [];

            if (!validator.isLength(value, 1)) {
                errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
            } else {
                if (!validator.isEmail(value)) {
                    errors.push(glMessage('VALIDATOR_EMAIL'));
                } else {
                    var userRepo = locator.get('user-repository');
                    userRepo.findByEmail(value)
                        .then(function (users) {
                            var exists = users.some(function (user) {
                                if (user.getId() == id)
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
            }

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    userForm.addParser(
        'password',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.password);
            var errors = [];

            if (!id) { // create
                if (!value.length)
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                else if (!validator.isLength(value, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
            } else { // update
                if (value.length && !validator.isLength(value, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
            }

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    userForm.addParser(
        'retyped_password',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var otherValue = ValidatorService.trim(req.body.password);
            var value = ValidatorService.trim(req.body.retyped_password);
            var errors = [];

            if (!id) { // create
                if (!value.length)
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                else if (!validator.isLength(value, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                else if (value != otherValue)
                    errors.push(glMessage('VALIDATOR_INPUT_MISMATCH'));
            } else { // update
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
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = req.body.roles;
            var errors = [];

            if (!Array.isArray(value)) {
                errors.push(glMessage('VALIDATOR_NOT_ARRAY'));
            } else {
                var toCheck = clone(value);
                function checkRoles() {
                    var role = toCheck.shift();
                    if (!role)
                        return defer.resolve({ value: value, errors: errors });

                    var roleRepo = locator.get('role-repository');
                    roleRepo.find(role)
                        .then(function (roles) {
                            if (roles.length == 0) {
                                errors.push(glMessage('VALIDATOR_NOT_IN_SET'));
                                return defer.resolve({ value: value, errors: errors });
                            }

                            checkRoles();
                        })
                        .catch(function (err) {
                            defer.reject(err);
                        });
                }
                checkRoles();

                return defer.promise;
            }

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );

    /**
     * GET routes
     */

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
                    row['name'] = validator.escape(row['name']);
                    row['email'] = validator.escape(row['email']);
                    row['roles'] = validator.escape(row['roles']);

                    if (row['created_at'])
                        row['created_at'] = row['created_at'].unix();

                    return row;
                });

                var userRepo = locator.get('user-repository');
                var adapter = new PgAdapter();
                adapter.setClient(userRepo.getPostgres());
                adapter.setSelect("*");
                adapter.setFrom("dt_users");
                adapter.setWhere("");
                adapter.setParams([ ]);
                adapter.setDbTimezone('UTC');
                table.setAdapter(adapter);

                switch (req.query.query) {
                    case 'describe':
                        table.describe(function (err, result) {
                            if (err)
                                return app.abort(res, 500, 'GET /v1/users/table failed', err);

                            result['success'] = true;
                            res.json(result);
                        });
                        break;
                    case 'data':
                        table.setPageParams(req.query)
                            .fetch(function (err, result) {
                                if (err)
                                    return app.abort(res, 500, 'GET /v1/users/table failed', err);

                                result['success'] = true;
                                res.json(result);
                            });
                        break;
                    default:
                        res.json({ success: false });
                }
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/users/table failed', err);
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
                return userRepo.find(userId)
                    .then(function (users) {
                        var user = users.length && users[0];
                        if (!user)
                            return app.abort(res, 404, "User " + userId + " not found");

                        return roleRepo.findByUserId(userId)
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
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/users/' + userId + ' failed', err);
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
                return userRepo.findAll()
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

                        return q.all(promises)
                            .then(function (userRoles) {
                                for (var i = 0; i < userRoles.length; i++) {
                                    var roleIds = [];
                                    userRoles[i].forEach(function (role) {
                                        roleIds.push(role.getId());
                                    });
                                    result[i]['roles'] = roleIds;
                                }
                                res.json(result);
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/users failed', err);
            });
    });

    /**
     * POST routes
     */

    // Validate user field route
    router.post('/validate', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'user', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var id = req.body._id;
                var field = req.body._field;
                return userForm.validateField(req, res, field, id)
                    .then(function (success) {
                        res.json({ success: success, errors: userForm.getErrors(field) });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/users/validate failed', err);
            });
    });

    // Find a user by some critera route
    router.post('/search', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var criteria = req.body.criteria;
        if (!criteria || ['email'].indexOf(criteria) == -1)     // Currently only by email
            return app.abort(res, 400, "Invalid criteria");

        var limit = ValidatorService.trim(req.body.limit);
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
                        promise = userRepo.searchByEmail(req.body.search, parseInt(limit));
                        break;
                }

                return promise
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

                        return q.all(promises)
                            .then(function (userRoles) {
                                for (var i = 0; i < userRoles.length; i++) {
                                    var roleIds = [];
                                    userRoles[i].forEach(function (role) {
                                        roleIds.push(role.getId());
                                    });
                                    result[i]['roles'] = roleIds;
                                }
                                res.json(result);
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/users/search failed', err);
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

                return userForm.validateAll(req, res)
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
                        return q.all([ userRepo.save(user), roleRepo.findAll() ])
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

                                return q.all(promises)
                                    .then(function () {
                                        res.json({ success: true, id: userId });
                                    });
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/users failed', err);
            });
    });

    /**
     * PUT routes
     */

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

                return userForm.validateAll(req, res, userId)
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
                        return userRepo.find(userId)
                            .then(function (users) {
                                var user = users.length && users[0];
                                if (!user)
                                    return app.abort(res, 404, "User " + userId + " not found");

                                user.setName(userForm.getValue('name').length ? userForm.getValue('name') : null);
                                user.setEmail(userForm.getValue('email'));
                                if (userForm.getValue('password').length)
                                    user.setPassword(UserModel.encryptPassword(userForm.getValue('password')));

                                return q.all([ userRepo.save(user), roleRepo.findAll() ])
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

                                        return q.all(promises)
                                            .then(function () {
                                                res.json({ success: true });
                                            });
                                    });
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'PUT /v1/users/' + userId + ' failed', err);
            });
    });

    /**
     * DELETE routes
     */

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
                return userRepo.find(userId)
                    .then(function (users) {
                        var user = users.length && users[0];
                        if (!user)
                            return app.abort(res, 404, "User " + userId + " not found");

                        return userRepo.delete(user)
                            .then(function (count) {
                                if (count == 0)
                                    return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                                res.json({ success: true });
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/users/' + userId + ' failed', err);
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
                return userRepo.deleteAll()
                    .then(function (count) {
                        if (count == 0)
                            return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                        res.json({ success: true });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/users failed', err);
            });
    });

    app.use('/v1/users', router);
};
