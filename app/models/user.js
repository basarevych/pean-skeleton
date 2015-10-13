/**
 * User model
 */

'use strict'

var locator = require('node-service-locator');
var bcrypt = require('bcrypt');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = require('./base');

function UserModel(dbRow) {
    this.id = null;
    this.name = null;
    this.email = null;
    this.password = null;
    this.created_at = moment();

    if (dbRow) {
        var utc = moment(dbRow.created_at); // db field is in UTC

        this.id = dbRow.id;
        this.name = dbRow.name;
        this.email = dbRow.email;
        this.password = dbRow.password;
        this.created_at = moment.tz(utc.format('YYYY-MM-DD HH:mm:ss'), 'UTC').local();
    }
};

UserModel.prototype = new BaseModel();
UserModel.prototype.constructor = UserModel;

UserModel.encryptPassword = function (password) {
    var salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
};

UserModel.prototype.setId = function (id) {
    this.filed('id', id);
    return this;
};

UserModel.prototype.getId = function () {
    return this.field('id');
};

UserModel.prototype.setName = function (name) {
    this.field('name', name);
    return this;
};

UserModel.prototype.getName = function () {
    return this.field('name');
};

UserModel.prototype.setEmail = function (email) {
    this.field('email', email);
    return this;
};

UserModel.prototype.getEmail = function () {
    return this.field('email');
};

UserModel.prototype.setPassword = function (password) {
    this.field('password', password);
    return this;
};

UserModel.prototype.getPassword = function () {
    return this.field('password');
};

UserModel.prototype.checkPassword = function (password) {
    return bcrypt.compareSync(password, this.getPassword());
};

UserModel.prototype.setCreatedAt = function (createdAt) {
    this.field('created_at', createdAt);
    return this;
};

UserModel.prototype.getCreatedAt = function () {
    return this.field('created_at');
};

UserModel.prototype.save = function (evenIfNotDirty) {
    var logger = locator.get('logger');
    var repo = locator.get('user-repository');
    var defer = q.defer();

    if (this.getId() && !this._dirty && evenIfNotDirty !== true) {
        defer.resolve(this.getId());
        return defer.promise;
    }

    var me = this;
    var db = repo.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserModel.save() - pg connect', err);
            process.exit(1);
        }

        var query, params = [];
        if (me.getId()) {
            query = "UPDATE users "
                  + "   SET name = $1, "
                  + "       email = $2, "
                  + "       password = $3, "
                  + "       created_at = $4 "
                  + " WHERE id = $5 ";
            params = [
                me.getName(),
                me.getEmail(),
                me.getPassword(),
                me.getCreatedAt(),
                me.getId(),
            ];
        } else {
            query = "   INSERT "
                  + "     INTO users(name, email, password, created_at) "
                  + "   VALUES ($1, $2, $3, $4) "
                  + "RETURNING id ";
            params = [
                me.getName(),
                me.getEmail(),
                me.getPassword(),
                me.getCreatedAt().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
            ];
        }

        db.query(query, params, function (err, result) {
            if (err) {
                defer.reject();
                logger.error('UserModel.save() - pg query', err);
                process.exit(1);
            }

            db.end();
            me.dirty(false);

            var id = result.rows.length && result.rows[0]['id'];
            if (id) {
                me.id = id;
            } else
                id = me.id;

            defer.resolve(id);
        });
    });

    return defer.promise;
};

UserModel.prototype.associateRole = function (role) {
    var logger = locator.get('logger');
    var repo = locator.get('user-repository');
    var defer = q.defer();

    if (!this.getId()) {
        logger.error('save user model first');
        process.exit(1);
    }

    if (!role.getId()) {
        logger.error('save role model first');
        process.exit(1);
    }

    var me = this;
    var db = repo.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserModel.associateRole() - pg connect', err);
            process.exit(1);
        }

        db.query("BEGIN TRANSACTION", [], function (err, result) {
            if (err) {
                defer.reject();
                logger.error('UserModel.associateRole() - pg query', err);
                process.exit(1);
            }

            db.query(
                "SELECT * "
              + "  FROM user_roles "
              + " WHERE user_id = $1 "
              + "       AND role_id = $2 ",
                [ me.id, role.id ],
                function (err, result) {
                    if (err) {
                        defer.reject();
                        logger.error('UserModel.associateRole() - pg query', err);
                        process.exit(1);
                    }

                    if (result.rows.length) {
                        var id = result.rows[0]['id'];
                        db.query("ROLLBACK TRANSACTION", [], function (err, result) {
                            if (err) {
                                defer.reject();
                                logger.error('UserModel.associateRole() - pg query', err);
                                process.exit(1);
                            }

                            db.end();
                            defer.resolve(id);
                        });
                        return;
                    }

                    db.query(
                        "   INSERT "
                      + "     INTO user_roles(user_id, role_id) "
                      + "   VALUES ($1, $2) "
                      + "RETURNING id ",
                        [ me.id, role.id ],
                        function (err, result) {
                            if (err) {
                                defer.reject();
                                logger.error('UserModel.associateRole() - pg query', err);
                                process.exit(1);
                            }

                            var id = result.rows[0]['id'];
                            db.query("COMMIT TRANSACTION", [], function (err, result) {
                                if (err) {
                                    defer.reject();
                                    logger.error('UserModel.associateRole() - pg query', err);
                                    process.exit(1);
                                }

                                db.end();
                                defer.resolve(id);
                            });
                        }
                    );
                }
            );
        });
    });

    return defer.promise;
};

UserModel.prototype.delete = function () {
    var logger = locator.get('logger');
    var repo = locator.get('user-repository');
    var defer = q.defer();

    if (!this.getId()) {
        defer.resolve(0);
        return defer.promise;
    }

    var me = this;
    var db = repo.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserModel.delete() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM users "
          + " WHERE id = $1 ",
            [ me.getId() ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('UserModel.delete() - pg query', err);
                    process.exit(1);
                }

                db.end();
                me.setId(null);
                me.dirty(false);

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

module.exports = UserModel;
