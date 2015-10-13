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
var UserModel = require('../../models/user');

module.exports = function (app) {
    var router = express.Router();
    var app = locator.get('app');
    var logger = locator.get('logger');

    function parseCreateForm(field, req, res) {
        var defer = q.defer();
        var glMessage = res.locals.glMessage;

        var form = {
            name: validator.trim(
                req.body.name
                || (req.body.form && req.body.form.name)
            ),
        };

        var createForm = null;
        if (typeof req.body.email != 'undefined'
                || (typeof req.body.form != 'undefined'
                    && typeof req.body.form.email != 'undefined')) {
            // create form
            createForm = true;
            form['email'] = validator.trim(
                req.body.email
                || (req.body.form && req.body.form.email)
            );
            form['password'] = validator.trim(
                req.body.password
                || (req.body.form && req.body.form.password)
            );
        } else {
            // update form
            createForm = false;
            form['new_email'] = validator.trim(
                req.body.new_email
                || (req.body.form && req.body.form.new_email)
            );
            form['new_password'] = validator.trim(
                req.body.new_password
                || (req.body.form && req.body.form.new_password)
            );
        }
        
        form['retyped_password'] = validator.trim(
            req.body.retyped_password
            || (req.body.form && req.body.form.retyped_password)
        );

        var userRepo = locator.get('user-repository');
        var errors = [];
        switch (field) {
            case 'email':
                if (!validator.isLength(form.email, 1))
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                if (!validator.isEmail(form.email))
                    errors.push(glMessage('VALIDATOR_EMAIL'));

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
                if (!validator.isLength(form.password, 1))
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                if (!validator.isLength(form.password, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                break;
            case 'new_password':
                if (form.new_password != "" && !validator.isLength(form.new_password, 6))
                    errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                break;
            case 'retyped_password':
                if (createForm === true) {
                    if (!validator.isLength(form.retyped_password, 6))
                        errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                    if (form.retyped_password != form.password)
                        errors.push(glMessage('VALIDATOR_INPUT_MISMATCH'));
                } else if (createForm === false) {
                    if (form.new_password != "") {
                        if (!validator.isLength(form.retyped_password, 6))
                            errors.push(glMessage('VALIDATOR_MIN_LENGTH', { min: 6 }));
                        if (form.retyped_password != form.new_password)
                            errors.push(glMessage('VALIDATOR_INPUT_MISMATCH'));
                    }
                }
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
                        filters: [ Table.FILTER_LIKE, Table.FILTER_NULL ],
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
                        filters: [ Table.FILTER_BETWEEN, Table.FILTER_NULL ],
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

                    result['email'] = validator.escape(row['email']);

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
        parse(req.body.field, req, res)
            .then(function (data) {
                res.json({ valid: data.valid, errors: data.errors });
            })
            .catch(function (err) {
                logger.error('POST /v1/user/validate failed', err);
                app.abort(res, 500, 'POST /v1/user/validate failed');
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
                userRepo.find(userId)
                    .then(function (users) {
                        var user = users.length && users[0];
                        if (!user)
                            return app.abort(res, 404, "User " + userId + " not found");

                        res.json({
                            id: user.getId(),
                            name: user.getName(),
                            email: token.getEmail(),
                            created_at: user.getCreatedAt().unix(),
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
                userRepo.findAll()
                    .then(function (users) {
                        var result = [];
                        users.forEach(function (user) {
                            result.push({
                                id: user.getId(),
                                name: user.getName(),
                                email: token.getEmail(),
                                created_at: user.getCreatedAt().unix(),
                            });
                        });
                        res.json(result);
                    })
                    .catch(function (err) {
                        logger.error('GET /v1/user failed', err);
                        app.abort(res, 500, 'GET /v1/user failed');
                    });
            })
            .catch(function (err) {
                logger.error('GET /v1/token failed', err);
                app.abort(res, 500, 'GET /v1/token failed');
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

                var name = parse('name', req, res);
                var email = parse('email', req, res);
                var password = parse('password', req, res);
                var retypedPassword = parse('retyped_password', req, res);
                q.all([ name, email, password, retypedPassword ])
                    .then(function (result) {
                        name = result[0];
                        email = result[1];
                        password = result[2];
                        retypedPassword = result[3];
                        if (!name.valid || !email.valid || !password.valid || !retypedPassword.valid) {
                            return res.json({
                                valid: false,
                                errors: [],
                                fields: {
                                    name: name.errors,
                                    email: email.errors,
                                    password: password.errors,
                                    retyped_password: retypedPassword.errors,
                                }
                            });
                        }

                        var user = new UserModel();
                        user.setName(name.value.length ? name.value : null);
                        user.setEmail(email.value);
                        user.setPassword(UserModel.encryptPassword(password.value));
                        user.setCreatedAt(moment());

                        user.save()
                            .then(function (userId) {
                                res.json({ valid: userId !== null });
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

                var name = parse('name', req, res);
                var newEmail = parse('new_email', req, res);
                var newPassword = parse('new_password', req, res);
                var retypedPassword = parse('retyped_password', req, res);
                q.all([ name, newEmail, newPassword, retypedPassword ])
                    .then(function (result) {
                        name = result[0];
                        newEmail = result[1];
                        newPassword = result[2];
                        retypedPassword = result[3];
                        if (!name.valid || !newEmail.valid || !newPassword.valid || !retypedPassword.valid) {
                            return res.json({
                                valid: false,
                                errors: [],
                                fields: {
                                    name: name.errors,
                                    new_email: newEmail.errors,
                                    new_password: newPassword.errors,
                                    retyped_password: retypedPassword.errors,
                                }
                            });
                        }

                        var userRepo = locator.get('user-repository');
                        userRepo.find(userId)
                            .then(function (users) {
                                var user = users.length && users[0];
                                if (!user)
                                    return app.abort(res, 404, "User " + userId + " not found");

                                user.setName(name.value.length ? name.value : null);
                                if (newEmail.value.length)
                                    user.setEmail(newEmail.value);
                                if (newPassword.value.length)
                                    user.setPassword(UserModel.encryptPassword(newPassword.value));

                                user.save()
                                    .then(function () {
                                        res.json({ valid: true });
                                    })
                                    .catch(function (err) {
                                        logger.error('PUT /v1/user/' + userId + ' failed', err);
                                        app.abort(res, 500, 'PUT /v1/user' + userId + ' failed');
                                    });
                            })
                            .catch(function (err) {
                                logger.error('PUT /v1/user' + userId + ' failed', err);
                                app.abort(res, 500, 'PUT /v1/user' + userId + ' failed');
                            });
                    })
                    .catch(function (err) {
                        logger.error('PUT /v1/user' + userId + ' failed', err);
                        app.abort(res, 500, 'PUT /v1/user' + userId + ' failed');
                    });
            })
            .catch(function (err) {
                logger.error('PUT /v1/user' + userId + ' failed', err);
                app.abort(res, 500, 'PUT /v1/user' + userId + ' failed');
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

                        return user.delete();
                    })
                    .then(function (count) {
                        res.json({ success: count > 0 });
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
                        res.json({ success: count > 0 });
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
