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

/**
 * User repository
 *
 * @constructor
 */
function UserRepository() {
    BaseRepository.call(this);
}

UserRepository.prototype = new BaseRepository();
UserRepository.prototype.constructor = UserRepository;

/**
 * Find a user by ID
 *
 * @param {integer} id      ID to search by
 * @return {object}         Returns promise resolving to array of models
 */
UserRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'UserRepository.find() - pg connect', err ]);

        db.query(
            "SELECT * "
          + "  FROM users "
          + " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'UserRepository.find() - select', err ]);
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

/**
 * Find users by email
 *
 * @param {string} email        Email to search by
 * @return {object}             Returns promise resolving to array of models
 */
UserRepository.prototype.findByEmail = function (email) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'UserRepository.findByEmail() - pg connect', err ]);

        db.query(
            "SELECT * "
          + "  FROM users "
          + " WHERE email = $1 ",
            [ email ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'UserRepository.findByEmail() - select', err ]);
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

/**
 * Find users by role ID
 *
 * @param {integer} roleID          Role ID to search by
 * @return {object}                 Returns promise resolving to array of models
 */
UserRepository.prototype.findByRoleId = function (roleId) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'UserRepository.findByRoleId() - pg connect', err ]);

        db.query(
            "    SELECT u.* "
          + "      FROM users u "
          + "INNER JOIN user_roles ur "
          + "        ON ur.user_id = u.id "
          + "     WHERE ur.role_id = $1 ",
            [ roleId ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'UserRepository.findByRoleId() - select', err ]);
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

/**
 * Find users by their role handle
 *
 * @param {string} handle           Handle to search by
 * @return {object}                 Return promise resolving to array of models
 */
UserRepository.prototype.findByRoleHandle = function (handle) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'UserRepository.findByRoleHandle() - pg connect', err ]);

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
                    db.end();
                    return defer.reject([ 'UserRepository.findByRoleHandle() - select', err ]);
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

/**
 * Find all the users
 *
 * @return {object}         Returns promise resolving to array of models
 */
UserRepository.prototype.findAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'UserRepository.findAll() - pg connect', err ]);

        db.query(
            "SELECT * "
          + "  FROM users ",
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'UserRepository.findAll() - select', err ]);
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

/**
 * Find users with similar email (LIKE)
 *
 * @param {string} search       Email to search by
 * @param {integer} limit       Max number of resulting models
 * @return {object}             Returns promise resolving to array of models
 */
UserRepository.prototype.searchByEmail = function (search, limit) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'UserRepository.searchByEmail() - pg connect', err ]);

        db.query(
            "SELECT * "
          + "  FROM users "
          + " WHERE email LIKE $1 "
          + " LIMIT $2 ",
            [ '%' + search + '%', limit ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'UserRepository.searchByEmail() - select', err ]);
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

/**
 * Save user model
 *
 * @param {object} user     The user to save
 * @return {object}         Returns promise resolving to user ID or null on failure
 */
UserRepository.prototype.save = function (user) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'UserRepository.save() - pg connect', err ]);

        var retries = 0;
        function transaction() {
            db.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE", [], function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'UserRepository.save() - begin transaction', err ]);
                }

                var query = "SELECT email "
                          + "  FROM users "
                          + " WHERE email = $1 ";
                var params = [
                    user.getEmail()
                ];

                if (user.getId()) {
                    query += " AND id <> $2 ";
                    params.push(user.getId());
                }

                db.query(
                    query,
                    params,
                    function (err, result) {
                        if (err) {
                            db.end();
                            return defer.reject([ 'UserRepository.save() - collision check', err ]);
                        }

                        if (result.rows.length) {
                            db.query("ROLLBACK TRANSACTION", [], function (err, result) {
                                if (err) {
                                    db.end();
                                    return defer.reject([ 'UserRepository.save() - rollback transaction', err ]);
                                }

                                db.end();
                                defer.resolve(null);
                            });
                            return;
                        }

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
                                db.end();
                                return defer.reject([ 'UserRepository.save() - main query', err ]);
                            }

                            var id = result.rows.length && result.rows[0]['id'];
                            if (id)
                                user.setId(id);
                            else
                                id = result.rowCount > 0 ? user.getId() : null;

                            db.query("COMMIT TRANSACTION", [], function (err, result) {
                                if (err) {
                                    if ((err.sqlState || err.code) == '40001') { // serialization failure
                                        if (++retries >= BaseRepository.MAX_TRANSACTION_RETRIES) {
                                            db.end();
                                            return defer.reject('UserRepository.save() - maximum transaction retries reached');
                                        }
                                        return transaction();
                                    }

                                    db.end();
                                    return defer.reject([ 'UserRepository.save() - commit transaction', err ]);
                                }

                                db.end();

                                if (id)
                                    user.dirty(false);

                                defer.resolve(id);
                            });
                        });
                    }
                );
            });
        }
        transaction();
    });

    return defer.promise;
};

/**
 * Assign role to a user
 *
 * @param {object} user     User model
 * @param {object} role     Role model
 * @return {object}         Returns promise resolving to a number of inserted DB rows
 */
UserRepository.prototype.addRole = function (user, role) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'UserRepository.addRole() - pg connect', err ]);

        var retries = 0;
        function transaction() {
            db.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE", [], function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'UserRepository.addRole() - begin transaction', err ]);
                }

                db.query(
                    "SELECT count(*) AS count "
                  + "  FROM user_roles "
                  + " WHERE user_id = $1 "
                  + "       AND role_id = $2 ",
                    [ user.getId(), role.getId() ],
                    function (err, result) {
                        if (err) {
                            db.end();
                            return defer.reject([ 'UserRepository.addRole() - collision check', err ]);
                        }

                        if (result.rows[0]['count'] > 0) {
                            db.query("ROLLBACK TRANSACTION", [], function (err, result) {
                                if (err) {
                                    db.end();
                                    return defer.reject([ 'UserRepository.addRole() - rollback transaction', err ]);
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
                                    db.end();
                                    return defer.reject([ 'UserRepository.addRole() - main query', err ]);
                                }

                                var count = result.rowCount;
                                db.query("COMMIT TRANSACTION", [], function (err, result) {
                                    if (err) {
                                        if ((err.sqlState || err.code) == '40001') { // serialization failure
                                            if (++retries >= BaseRepository.MAX_TRANSACTION_RETRIES) {
                                                db.end();
                                                return defer.reject('UserRepository.addRole() - maximum transaction retries reached');
                                            }
                                            return transaction();
                                        }

                                        db.end();
                                        return defer.reject([ 'UserRepository.addRole() - commit transaction', err ]);
                                    }

                                    db.end();
                                    defer.resolve(count);
                                });
                            }
                        );
                    }
                );
            });
        }
        transaction();
    });

    return defer.promise;
};

/**
 * Remove role from a user
 *
 * @param {object} user     User model
 * @param {object} role     Role model
 * @return {object}         Returns promise resolving to a number of deleted DB rows
 */
UserRepository.prototype.removeRole = function (user, role) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'UserRepository.removeRole() - pg connect', err ]);

        db.query(
            "DELETE "
          + "  FROM user_roles "
          + " WHERE user_id = $1 AND role_id = $2 ",
            [ user.getId(), role.getId() ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'UserRepository.removeRole() - delete', err ]);
                }

                db.end();
                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

/**
 * Delete a user
 *
 * @param {object} user     User to delete
 * @return {promise}        Returns promise resolving to a number of deleted DB rows
 */
UserRepository.prototype.delete = function (user) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'UserRepository.delete() - pg connect', err ]);

        db.query(
            "DELETE "
          + "  FROM users "
          + " WHERE id = $1 ",
            [ user.getId() ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'UserRepository.delete() - delete', err ]);
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

/**
 * Delete all the users
 *
 * @return {object}         Returns promise resolving to a number of deleted DB rows
 */
UserRepository.prototype.deleteAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'UserRepository.deleteAll() - pg connect', err ]);

        db.query(
            "DELETE "
          + "  FROM users ",
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'UserRepository.deleteAll() - delete', err ]);
                }

                db.end();
                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

module.exports = UserRepository;
