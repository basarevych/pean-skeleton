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
var UserModel = locator.get('user-model');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');
    var logger = locator.get('logger');

    function parseForm(field, req, res) {
        var defer = q.defer();
        var glMessage = res.locals.glMessage;

        var form = {
            form_type: validator.trim(req.body._form_type),
            name: validator.trim(req.body.name),
            email: validator.trim(req.body.email),
            encrypted_password: validator.trim(req.body.encrypted_password),
            password: validator.trim(req.body.password),
            retyped_password: validator.trim(req.body.retyped_password),
            roles: req.body.roles,
        };

        var userRepo = locator.get('user-repository');
        var errors = [];
        switch (field) {
            case 'email':
                if (form.form_type == 'create') {
                    if (!validator.isLength(form.email, 1))
                        errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                    if (!validator.isEmail(form.email))
                        errors.push(glMessage('VALIDATOR_EMAIL'));
                } else {
                    if (form.email.length && !validator.isEmail(form.email))
                        errors.push(glMessage('VALIDATOR_EMAIL'));
                }

                if (form.email.length == 0)
                    break;

                userRepo.findByEmail(form.email)
                    .then(function (users) {
                        if (users.length)
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
            case 'password':
                if (form.form_type == 'create') {
                    if (!form.encrypted_password.length) {
                        if (!form.password.length)
                            errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                        else if (!validator.isLength(form.password, 6))
                            errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                    }
                } else {
                    if (!form.encrypted_password.length) {
                        if (form.password.length && !validator.isLength(form.password, 6))
                            errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                    }
                }
                break;
            case 'retyped_password':
                if (form.form_type == 'create') {
                    if (!form.encrypted_password.length) {
                        if (!form.retyped_password.length)
                            errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                        else if (!validator.isLength(form.retyped_password, 6))
                            errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                        if (form.retyped_password != form.password)
                            errors.push(glMessage('VALIDATOR_INPUT_MISMATCH'));
                    }
                } else {
                    if (!form.encrypted_password.length) {
                        if (form.retyped_password.length && !validator.isLength(form.retyped_password, 6))
                            errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                        if ((form.password.length || form.retyped_password.length)
                                && form.retyped_password != form.password) {
                            errors.push(glMessage('VALIDATOR_INPUT_MISMATCH'));
                        }
                    }
                }
                break;
            case 'roles':
                if (typeof form.roles != 'object' || typeof form.roles.forEach != 'function')
                    errors.push(glMessage('VALIDATOR_NOT_ARRAY'));
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
                            if (err) {
                                logger.error('GET /v1/user/table failed', err);
                                return app.abort(res, 500, 'GET /v1/user/table failed');
                            }

                            result['success'] = true;
                            res.json(result);
                        });
                        break;
                    case 'data':
                        table.setPageParams(req.query)
                            .fetch(function (err, result) {
                                if (err) {
                                    logger.error('GET /v1/user/table failed', err);
                                    return app.abort(res, 500, 'GET /v1/user/table failed');
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
                logger.error('GET /v1/user/table failed', err);
                app.abort(res, 500, 'GET /v1/user/table failed');
            });
    });

    router.post('/validate', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'user', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                parseForm(req.body._field, req, res)
                    .then(function (data) {
                        res.json({ success: data.valid, errors: data.errors });
                    })
                    .catch(function (err) {
                        logger.error('POST /v1/user/validate failed', err);
                        app.abort(res, 500, 'POST /v1/user/validate failed');
                    });
            })
            .catch(function (err) {
                logger.error('POST /v1/user/validate failed', err);
                app.abort(res, 500, 'POST /v1/user/validate failed');
            });
    });

    router.post('/search', function (req, res) {
        var criteria = req.body.criteria;
        if (!criteria || ['email'].indexOf(criteria) == -1)
            return app.abort(res, 400, "Invalid criteria");

        var limit = req.body.limit;
        if (!limit || !validator.isInt(limit))
            return app.abort(res, 400, "Invalid limit");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

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
                                logger.error('POST /v1/user/search failed', err);
                                app.abort(res, 500, 'POST /v1/user/search failed');
                            });
                    })
                    .catch(function (err) {
                        logger.error('POST /v1/user/search failed', err);
                        app.abort(res, 500, 'POST /v1/user/search failed');
                    });
            })
            .catch(function (err) {
                logger.error('POST /v1/user/search failed', err);
                app.abort(res, 500, 'POST /v1/user/search failed');
            });
    });

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
                                logger.error('GET /v1/user/' + userId + ' failed', err);
                                app.abort(res, 500, 'GET /v1/user/' + userId + ' failed');
                            });
                    })
                    .catch(function (err) {
                        logger.error('GET /v1/user/' + userId + ' failed', err);
                        app.abort(res, 500, 'GET /v1/user/' + userId + ' failed');
                    });
            })
            .catch(function (err) {
                logger.error('GET /v1/user/' + userId + ' failed', err);
                app.abort(res, 500, 'GET /v1/user/' + userId + ' failed');
            });
    });

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
                                logger.error('GET /v1/user failed', err);
                                app.abort(res, 500, 'GET /v1/user failed');
                            });
                    })
                    .catch(function (err) {
                        logger.error('GET /v1/user failed', err);
                        app.abort(res, 500, 'GET /v1/user failed');
                    });
            })
            .catch(function (err) {
                logger.error('GET /v1/user failed', err);
                app.abort(res, 500, 'GET /v1/user failed');
            });
    });

    router.post('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'user', 'create')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                req.body._form_type = 'create';
                var name = parseForm('name', req, res);
                var email = parseForm('email', req, res);
                var encryptedPassword = parseForm('encrypted_password', req, res);
                var password = parseForm('password', req, res);
                var retypedPassword = parseForm('retyped_password', req, res);
                var roles = parseForm('roles', req, res);
                q.all([ name, email, encryptedPassword, password, retypedPassword, roles ])
                    .then(function (result) {
                        name = result[0];
                        email = result[1];
                        encryptedPassword = result[2];
                        password = result[3];
                        retypedPassword = result[4];
                        roles = result[5];
                        if (!name.valid || !email.valid || !encryptedPassword.valid || !password.valid || !retypedPassword.valid || !roles.valid) {
                            return res.json({
                                success: false,
                                errors: [],
                                fields: {
                                    name: name.errors,
                                    email: email.errors,
                                    encrypted_password: encryptedPassword.errors,
                                    password: password.errors,
                                    retyped_password: retypedPassword.errors,
                                    roles: roles.errors,
                                }
                            });
                        }

                        var user = new UserModel();
                        user.setName(name.value.length ? name.value : null);
                        user.setEmail(email.value);
                        if (encryptedPassword.value.length)
                            user.setPassword(encryptedPassword.value);
                        else
                            user.setPassword(UserModel.encryptPassword(password.value));
                        user.setCreatedAt(moment());

                        var userRepo = locator.get('user-repository');
                        var roleRepo = locator.get('role-repository');
                        q.all([ userRepo.save(user), roleRepo.findAll() ])
                            .then(function (result) {
                                var userId = result[0];
                                var allRoles = result[1];
                                if (userId === null)
                                    return res.json({ success: false, errors: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                                var promises = [];
                                allRoles.forEach(function (role) {
                                    if (roles.value.indexOf(role.getId()) != -1)
                                        promises.push(userRepo.addRole(user, role));
                                });

                                q.all(promises)
                                    .then(function () {
                                        res.json({ success: true, id: userId });
                                    })
                                    .catch(function (err) {
                                        logger.error('POST /v1/user failed', err);
                                        app.abort(res, 500, 'POST /v1/user failed');
                                    });
                            })
                            .catch(function (err) {
                                logger.error('POST /v1/user failed', err);
                                app.abort(res, 500, 'POST /v1/user failed');
                            });
                    })
                    .catch(function (err) {
                        logger.error('POST /v1/user failed', err);
                        app.abort(res, 500, 'POST /v1/user failed');
                    });
            })
            .catch(function (err) {
                logger.error('POST /v1/user failed', err);
                app.abort(res, 500, 'POST /v1/user failed');
            });
    });

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
                var name = parseForm('name', req, res);
                var email = parseForm('email', req, res);
                var encryptedPassword = parseForm('encrypted_password', req, res);
                var password = parseForm('password', req, res);
                var retypedPassword = parseForm('retyped_password', req, res);
                var roles = parseForm('roles', req, res);
                q.all([ name, email, encryptedPassword, password, retypedPassword, roles ])
                    .then(function (result) {
                        name = result[0];
                        email = result[1];
                        encryptedPassword = result[2];
                        password = result[3];
                        retypedPassword = result[4];
                        roles = result[5];
                        if (!name.valid || !email.valid || !encryptedPassword.valid || !password.valid || !retypedPassword.valid || !roles.valid) {
                            return res.json({
                                success: false,
                                errors: [],
                                fields: {
                                    name: name.errors,
                                    email: email.errors,
                                    encrypted_password: encryptedPassword.errors,
                                    password: password.errors,
                                    retyped_password: retypedPassword.errors,
                                    roles: roles.errors,
                                }
                            });
                        }

                        var userRepo = locator.get('user-repository');
                        var roleRepo = locator.get('role-repository');
                        userRepo.find(userId)
                            .then(function (users) {
                                var user = users.length && users[0];
                                if (!user)
                                    return app.abort(res, 404, "User " + userId + " not found");

                                user.setName(name.value.length ? name.value : null);
                                if (email.value.length)
                                    user.setEmail(email.value);
                                if (encryptedPassword.value.length)
                                    user.setPassword(encryptedPassword.value);
                                else if (password.value.length)
                                    user.setPassword(UserModel.encryptPassword(password.value));

                                q.all([ userRepo.save(user), roleRepo.findAll() ])
                                    .then(function (result) {
                                        var userId = result[0];
                                        var allRoles = result[1];
                                        if (userId === null)
                                            return res.json({ success: false, errors: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                                        var promises = [];
                                        allRoles.forEach(function (role) {
                                            if (roles.value.indexOf(role.getId()) == -1)
                                                promises.push(userRepo.removeRole(user, role));
                                            else
                                                promises.push(userRepo.addRole(user, role));
                                        });

                                        q.all(promises)
                                            .then(function () {
                                                res.json({ success: true });
                                            })
                                            .catch(function (err) {
                                                logger.error('PUT /v1/user/' + userId + ' failed', err);
                                                app.abort(res, 500, 'PUT /v1/user/' + userId + ' failed');
                                            });
                                    })
                                    .catch(function (err) {
                                        logger.error('PUT /v1/user/' + userId + ' failed', err);
                                        app.abort(res, 500, 'PUT /v1/user' + userId + ' failed');
                                    });
                            })
                            .catch(function (err) {
                                logger.error('PUT /v1/user/' + userId + ' failed', err);
                                app.abort(res, 500, 'PUT /v1/user/' + userId + ' failed');
                            });
                    })
                    .catch(function (err) {
                        logger.error('PUT /v1/user/' + userId + ' failed', err);
                        app.abort(res, 500, 'PUT /v1/user/' + userId + ' failed');
                    });
            })
            .catch(function (err) {
                logger.error('PUT /v1/user/' + userId + ' failed', err);
                app.abort(res, 500, 'PUT /v1/user/' + userId + ' failed');
            });
    });

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
                                    return res.json({ success: false, errors: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                                res.json({ success: true });
                            })
                            .catch(function (err) {
                                logger.error('DELETE /v1/user/' + userId + ' failed', err);
                                app.abort(res, 500, 'DELETE /v1/user/' + userId + ' failed');
                            });
                    })
                    .catch(function (err) {
                        logger.error('DELETE /v1/user/' + userId + ' failed', err);
                        app.abort(res, 500, 'DELETE /v1/user/' + userId + ' failed');
                    });
            })
            .catch(function (err) {
                logger.error('DELETE /v1/user/' + userId + ' failed', err);
                app.abort(res, 500, 'DELETE /v1/user/' + userId + ' failed');
            });
    });

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
                            return res.json({ success: false, errors: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                        res.json({ success: true });
                    })
                    .catch(function (err) {
                        logger.error('DELETE /v1/user failed', err);
                        app.abort(res, 500, 'DELETE /v1/user failed');
                    });
            })
            .catch(function (err) {
                logger.error('DELETE /v1/user failed', err);
                app.abort(res, 500, 'DELETE /v1/user failed');
            });
    });

    app.use('/v1/user', router);
};
