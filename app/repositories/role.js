/**
 * Role repository
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseRepository = locator.get('base-repository');
var BaseModel = locator.get('base-model');
var RoleModel = locator.get('role-model');

/**
 * Role repository
 *
 * @constructor
 */
function RoleRepository() {
    BaseRepository.call(this);
}

RoleRepository.prototype = new BaseRepository();
RoleRepository.prototype.constructor = RoleRepository;

/**
 * Find a role by ID
 *
 * @param {integer} id      ID to search by
 * @return {object}         Returns promise resolving to array of models
 */
RoleRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleRepository.find() - pg connect', err ]);

        db.query(
            "SELECT * " +
            "  FROM roles " +
            " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'RoleRepository.find() - select', err ]);
                }

                db.end();

                var roles = [];
                result.rows.forEach(function (row) {
                    var role = new RoleModel(row);
                    roles.push(role);
                });

                defer.resolve(roles);
            }
        );
    });

    return defer.promise;
};

/**
 * Find roles by handle
 *
 * @param {string} handle       Handle to search by
 * @return {object}             Returns promise resolving to array of models
 */
RoleRepository.prototype.findByHandle = function (handle) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleRepository.findByHandle() - pg connect', err ]);

        db.query(
            "SELECT * " +
            "  FROM roles " +
            " WHERE handle = $1 ",
            [ handle ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'RoleRepository.findByHandle() - select', err ]);
                }

                db.end();

                var roles = [];
                result.rows.forEach(function (row) {
                    var role = new RoleModel(row);
                    roles.push(role);
                });

                defer.resolve(roles);
            }
        );
    });

    return defer.promise;
};

/**
 * Find roles by user ID
 *
 * @param {integer} userId      User ID to search by
 * @return {object}             Return promise resolving to array of models
 */
RoleRepository.prototype.findByUserId = function (userId) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleRepository.findByUserId() - pg connect', err ]);

        db.query(
            "    SELECT r.* " +
            "      FROM roles r " +
            "INNER JOIN user_roles ur " +
            "        ON ur.role_id = r.id " +
            "     WHERE ur.user_id = $1 ",
            [ userId ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'RoleRepository.findByUserId() - select', err ]);
                }

                db.end();

                var roles = [];
                result.rows.forEach(function (row) {
                    var role = new RoleModel(row);
                    roles.push(role);
                });

                defer.resolve(roles);
            }
        );
    });

    return defer.promise;
};

/**
 * Find all the roles
 *
 * @return {object}                 Returns promise resolving to array of models
 */
RoleRepository.prototype.findAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleRepository.findAll() - pg connect', err ]);

        db.query(
            "  SELECT * " +
            "    FROM roles " +
            "ORDER BY handle ",
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'RoleRepository.findAll() - select', err ]);
                }

                db.end();

                var roles = [];
                result.rows.forEach(function (row) {
                    var role = new RoleModel(row);
                    roles.push(role);
                });

                defer.resolve(roles);
            }
        );
    });

    return defer.promise;
};

/**
 * Save role model
 *
 * @param {object} role     The role to save
 * @return {object}         Returns promise resolving to role ID or null on failure
 */
RoleRepository.prototype.save = function (role) {
    var logger = locator.get('logger');
    var defer = q.defer();
    var me = this;

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleRepository.save() - pg connect', err ]);

        var retries = 0;
        var originalId = role.getId();
        function transaction() {
            if (++retries > BaseRepository.MAX_TRANSACTION_RETRIES) {
                db.end();
                return defer.reject('RoleRepository.save() - maximum transaction retries reached');
            }
            role.setId(originalId);

            db.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE", [], function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'RoleRepository.save() - begin transaction', err ]);
                }

                var query = "SELECT handle " +
                            "  FROM roles " +
                            " WHERE handle = $1 ";
                var params = [
                    role.getHandle()
                ];

                if (role.getId()) {
                    query += " AND id <> $2 ";
                    params.push(role.getId());
                }

                db.query(
                    query,
                    params,
                    function (err, result) {
                        if (err) {
                            if ((err.sqlState || err.code) == '40001') // serialization failure
                                return me.restartTransaction(db, defer, transaction);

                            db.end();
                            return defer.reject([ 'RoleRepository.save() - collision check', err ]);
                        }

                        if (result.rows.length) {
                            db.query("ROLLBACK TRANSACTION", [], function (err, result) {
                                if (err) {
                                    db.end();
                                    return defer.reject([ 'RoleRepository.save() - rollback transaction', err ]);
                                }

                                db.end();
                                defer.resolve(null);
                            });
                            return;
                        }

                        if (role.getId()) {
                            query = "UPDATE roles " +
                                    "   SET parent_id = $1, " +
                                    "       handle = $2 " +
                                    " WHERE id = $3 ";
                            params = [
                                role.getParentId(),
                                role.getHandle(),
                                role.getId(),
                            ];
                        } else {
                            query = "   INSERT " +
                                    "     INTO roles(parent_id, handle) " +
                                    "   VALUES ($1, $2) " +
                                    "RETURNING id ";
                            params = [
                                role.getParentId(),
                                role.getHandle(),
                            ];
                        }

                        db.query(query, params, function (err, result) {
                            if (err) {
                                if ((err.sqlState || err.code) == '40001') // serialization failure
                                    return me.restartTransaction(db, defer, transaction);

                                db.end();
                                return defer.reject([ 'RoleRepository.save() - main query', err ]);
                            }

                            var id = result.rows.length && result.rows[0]['id'];
                            if (id)
                                role.setId(id);
                            else
                                id = result.rowCount > 0 ? role.getId() : null;

                            db.query("COMMIT TRANSACTION", [], function (err, result) {
                                if (err) {
                                    if ((err.sqlState || err.code) == '40001') // serialization failure
                                        return me.restartTransaction(db, defer, transaction);

                                    db.end();
                                    return defer.reject([ 'RoleRepository.save() - commit transaction', err ]);
                                }

                                db.end();

                                if (id)
                                    role.dirty(false);

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
 * Delete a role
 *
 * @param {object} role         Role to delete
 * @return {object}             Returns promise resolving to a number of deleted DB rows
 */
RoleRepository.prototype.delete = function (role) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleRepository.delete() - pg connect', err ]);

        db.query(
            "DELETE " +
            "  FROM roles " +
            " WHERE id = $1 ",
            [ role.getId() ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'RoleRepository.delete() - delete', err ]);
                }

                db.end();
                role.setId(null);
                role.dirty(false);

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

/**
 * Delete all the roles
 *
 * @return {object}             Returns promise resolving to a number of deleted DB rows
 */
RoleRepository.prototype.deleteAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleRepository.deleteAll() - pg connect', err ]);

        db.query(
            "DELETE " +
            "  FROM roles ",
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'RoleRepository.deleteAll() - delete', err ]);
                }

                db.end();
                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

module.exports = RoleRepository;
