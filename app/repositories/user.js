/**
 * User repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseRepository = locator.get('base-repository');
var BaseModel = locator.get('base-model');
var UserModel = locator.get('user-model');

function UserRepository() {
    BaseRepository.call(this);
}

UserRepository.prototype = new BaseRepository();
UserRepository.prototype.constructor = UserRepository;

UserRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    id = parseInt(id, 10);
    if (isNaN(id)) {
        defer.reject('UserRepository.find() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserRepository.find() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM users "
          + " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('UserRepository.find() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var users = [];
                result.rows.forEach(function (row) {
                    var user = new UserModel(row);
                    users.push(user);
                });

                defer.resolve(users);
            }
        );
    });

    return defer.promise;
};

UserRepository.prototype.findByEmail = function (email) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserRepository.findByEmail() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM users "
          + " WHERE email = $1 ",
            [ email ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('UserRepository.findByEmail() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var users = [];
                result.rows.forEach(function (row) {
                    var user = new UserModel(row);
                    users.push(user);
                });

                defer.resolve(users);
            }
        );
    });

    return defer.promise;
};

UserRepository.prototype.findByRoleId = function (roleId) {
    var logger = locator.get('logger');
    var defer = q.defer();

    roleId = parseInt(roleId, 10);
    if (isNaN(roleId)) {
        defer.reject('UserRepository.findByRoleId() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserRepository.findByRoleId() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "    SELECT u.* "
          + "      FROM users u "
          + "INNER JOIN user_roles ur "
          + "        ON ur.user_id = u.id "
          + "     WHERE ur.role_id = $1 ",
            [ roleId ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('UserRepository.findByRoleId() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var users = [];
                result.rows.forEach(function (row) {
                    var user = new UserModel(row);
                    users.push(user);
                });

                defer.resolve(users);
            }
        );
    });

    return defer.promise;
};

UserRepository.prototype.findByRoleHandle = function (handle) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserRepository.findByRoleHandle() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "    SELECT u.* "
          + "      FROM users u "
          + "INNER JOIN user_roles ur "
          + "        ON ur.user_id = u.id "
          + "INNER JOIN roles r "
          + "        ON r.id = ur.role_id "
          + "     WHERE r.handle = $1 ",
            [ handle ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('UserRepository.findByRoleHandle() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var users = [];
                result.rows.forEach(function (row) {
                    var user = new UserModel(row);
                    users.push(user);
                });

                defer.resolve(users);
            }
        );
    });

    return defer.promise;
};

UserRepository.prototype.findAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserRepository.findAll() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM users ",
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('UserRepository.findAll() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var users = [];
                result.rows.forEach(function (row) {
                    var user = new UserModel(row);
                    users.push(user);
                });

                defer.resolve(users);
            }
        );
    });

    return defer.promise;
};

UserRepository.prototype.searchByEmail = function (search) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserRepository.searchByEmail() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM users "
          + " WHERE email LIKE $1 "
          + " LIMIT 8 ",
            [ '%' + search + '%' ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('UserRepository.searchByEmail() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var users = [];
                result.rows.forEach(function (row) {
                    var user = new UserModel(row);
                    users.push(user);
                });

                defer.resolve(users);
            }
        );
    });

    return defer.promise;
};

UserRepository.prototype.save = function (user) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserRepository.save() - pg connect', err);
            process.exit(1);
        }

        db.query("BEGIN TRANSACTION", [], function (err, result) {
            if (err) {
                defer.reject();
                logger.error('UserRepository.save() - pg query', err);
                process.exit(1);
            }

            db.query(
                "SELECT email "
              + "  FROM users "
              + " WHERE id <> $1 AND email = $2 ",
                [ user.getId(), user.getEmail() ],
                function (err, result) {
                    if (err) {
                        defer.reject();
                        logger.error('UserRepository.save() - pg query', err);
                        process.exit(1);
                    }

                    if (result.rows.length) {
                        db.query("ROLLBACK TRANSACTION", [], function (err, result) {
                            if (err) {
                                defer.reject();
                                logger.error('UserRepository.save() - pg query', err);
                                process.exit(1);
                            }

                            db.end();
                            defer.resolve(null);
                        });
                        return;
                    }

                    var query, params = [];
                    if (user.getId()) {
                        query = "UPDATE users "
                              + "   SET name = $1, "
                              + "       email = $2, "
                              + "       password = $3, "
                              + "       created_at = $4 "
                              + " WHERE id = $5 ";
                        params = [
                            user.getName(),
                            user.getEmail(),
                            user.getPassword(),
                            user.getCreatedAt().tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                            user.getId(),
                        ];
                    } else {
                        query = "   INSERT "
                              + "     INTO users(name, email, password, created_at) "
                              + "   VALUES ($1, $2, $3, $4) "
                              + "RETURNING id ";
                        params = [
                            user.getName(),
                            user.getEmail(),
                            user.getPassword(),
                            user.getCreatedAt().tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                        ];
                    }

                    db.query(query, params, function (err, result) {
                        if (err) {
                            defer.reject();
                            logger.error('UserRepository.save() - pg query', err);
                            process.exit(1);
                        }

                        var id = result.rows.length && result.rows[0]['id'];
                        if (id)
                            user.setId(id);
                        else
                            id = user.getId();

                        db.query("COMMIT TRANSACTION", [], function (err, result) {
                            if (err) {
                                defer.reject();
                                logger.error('UserRepository.save() - pg query', err);
                                process.exit(1);
                            }

                            db.end();
                            user.dirty(false);
                            defer.resolve(id);
                        });
                    });
                }
            );
        });
    });

    return defer.promise;
};

UserRepository.prototype.addRole = function (user, role) {
    var logger = locator.get('logger');
    var defer = q.defer();

    if (!user.getId()) {
        logger.error('Save user model first');
        process.exit(1);
    }

    if (!role.getId()) {
        logger.error('Save role model first');
        process.exit(1);
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserRepository.addRole() - pg connect', err);
            process.exit(1);
        }

        db.query("BEGIN TRANSACTION", [], function (err, result) {
            if (err) {
                defer.reject();
                logger.error('UserRepository.addRole() - pg query', err);
                process.exit(1);
            }

            db.query(
                "SELECT count(*) AS count "
              + "  FROM user_roles "
              + " WHERE user_id = $1 "
              + "       AND role_id = $2 ",
                [ user.getId(), role.getId() ],
                function (err, result) {
                    if (err) {
                        defer.reject();
                        logger.error('UserRepository.addRole() - pg query', err);
                        process.exit(1);
                    }

                    if (result.rows[0]['count'] > 0) {
                        db.query("ROLLBACK TRANSACTION", [], function (err, result) {
                            if (err) {
                                defer.reject();
                                logger.error('UserRepository.addRole() - pg query', err);
                                process.exit(1);
                            }

                            db.end();
                            defer.resolve(0);
                        });
                        return;
                    }

                    db.query(
                        "   INSERT "
                      + "     INTO user_roles(user_id, role_id) "
                      + "   VALUES ($1, $2) ",
                        [ user.getId(), role.getId() ],
                        function (err, result) {
                            if (err) {
                                defer.reject();
                                logger.error('UserRepository.addRole() - pg query', err);
                                process.exit(1);
                            }

                            var count = result.rowCount;
                            db.query("COMMIT TRANSACTION", [], function (err, result) {
                                if (err) {
                                    defer.reject();
                                    logger.error('UserRepository.addRole() - pg query', err);
                                    process.exit(1);
                                }

                                db.end();
                                defer.resolve(count);
                            });
                        }
                    );
                }
            );
        });
    });

    return defer.promise;
};

UserRepository.prototype.removeRole = function (user, role) {
    var logger = locator.get('logger');
    var defer = q.defer();

    if (!user.getId()) {
        logger.error('Save user model first');
        process.exit(1);
    }

    if (!role.getId()) {
        logger.error('Save role model first');
        process.exit(1);
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserRepository.removeRole() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM user_roles "
          + " WHERE user_id = $1 AND role_id = $2 ",
            [ user.getId(), role.getId() ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('UserRepository.removeRole() - pg query', err);
                    process.exit(1);
                }

                db.end();
                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

UserRepository.prototype.delete = function (user) {
    var logger = locator.get('logger');
    var defer = q.defer();

    if (!user.getId()) {
        defer.resolve(0);
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserRepository.delete() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM users "
          + " WHERE id = $1 ",
            [ user.getId() ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('UserRepository.delete() - pg query', err);
                    process.exit(1);
                }

                db.end();
                user.setId(null);
                user.dirty(false);

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

UserRepository.prototype.deleteAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserRepository.deleteAll() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM users ",
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('UserRepository.deleteAll() - pg query', err);
                    process.exit(1);
                }

                db.end();

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

module.exports = UserRepository;
