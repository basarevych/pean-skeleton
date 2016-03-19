/**
 * Permission repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseRepository = locator.get('base-repository');
var BaseModel = locator.get('base-model');
var PermissionModel = locator.get('permission-model');

/**
 * Permission repository
 *
 * @constructor
 */
function PermissionRepository() {
    BaseRepository.call(this);
}

PermissionRepository.prototype = new BaseRepository();
PermissionRepository.prototype.constructor = PermissionRepository;

/**
 * Find a permission by ID
 *
 * @param {integer} id      ID to search by
 * @return {object}         Returns promise resolving to array of models
 */
PermissionRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'PermissionRepository.find() - pg connect', err ]);

        db.query(
            "SELECT * "
          + "  FROM permissions "
          + " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'PermissionRepository.find() - select', err ]);
                }

                db.end();

                var permissions = [];
                result.rows.forEach(function (row) {
                    var permission = new PermissionModel(row);
                    permissions.push(permission);
                });

                defer.resolve(permissions);
            }
        );
    });

    return defer.promise;
};

/**
 * Find permissions by role ID
 *
 * @param {integer} roleId      Role ID to search by
 * @return {object}             Returns promise resolving to array of models
 */
PermissionRepository.prototype.findByRoleId = function (roleId) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'PermissionRepository.findByRoleId() - pg connect', err ]);

        db.query(
            "SELECT * "
          + "  FROM permissions "
          + " WHERE role_id = $1 ",
            [ roleId ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'PermissionRepository.findByRoleId() - select', err ]);
                }

                db.end();

                var permissions = [];
                result.rows.forEach(function (row) {
                    var permission = new PermissionModel(row);
                    permissions.push(permission);
                });

                defer.resolve(permissions);
            }
        );
    });

    return defer.promise;
};

/**
 * Find permissions by role ID, resource and action
 *
 * @param {integer} roleId          Role ID
 * @param {string|null} resource    Resource
 * @param {string|null} action      Action
 * @return {object}                 Returns promise resolving to array of models
 */
PermissionRepository.prototype.findByParams = function (roleId, resource, action) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var ands = [], params = [];

    if (roleId) {
        ands.push(" role_id = $" + (params.length + 1) + " ");
        params.push(roleId);
    } else {
        ands.push(" role_id IS NULL ");
    }

    if (resource) {
        ands.push(" resource = $" + (params.length + 1) + " ");
        params.push(resource);
    } else {
        ands.push(" resource IS NULL ");
    }

    if (action) {
        ands.push(" action = $" + (params.length + 1) + " ");
        params.push(action);
    } else {
        ands.push(" action IS NULL ");
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'PermissionRepository.findByParams() - pg connect', err ]);

        db.query(
            "SELECT * "
          + "  FROM permissions "
          + " WHERE " + ands.join(' AND '),
            params,
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'PermissionRepository.findByParams() - select', err ]);
                }

                db.end();

                var permissions = [];
                result.rows.forEach(function (row) {
                    var permission = new PermissionModel(row);
                    permissions.push(permission);
                });

                defer.resolve(permissions);
            }
        );
    });

    return defer.promise;
};

/**
 * Find all the permissions
 *
 * @return {object}             Returns promise resolving to array of models
 */
PermissionRepository.prototype.findAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'PermissionRepository.findAll() - pg connect', err ]);

        db.query(
            "  SELECT * "
          + "    FROM permissions ",
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'PermissionRepository.findAll() - select', err ]);
                }

                db.end();

                var permissions = [];
                result.rows.forEach(function (row) {
                    var permission = new PermissionModel(row);
                    permissions.push(permission);
                });

                defer.resolve(permissions);
            }
        );
    });

    return defer.promise;
};

/**
 * Save permission model
 *
 * @param {object} permission   The permission to save
 * @return {object}             Returns promise resolving to permission ID or null on failure
 */
PermissionRepository.prototype.save = function (permission) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'PermissionRepository.save() - pg connect', err ]);

        var query, params = [];
        if (permission.getId()) {
            query = "UPDATE permissions "
                  + "   SET role_id = $1, "
                  + "       resource = $2, "
                  + "       action = $3 "
                  + " WHERE id = $4 ";
            params = [
                permission.getRoleId(),
                permission.getResource(),
                permission.getAction(),
                permission.getId(),
            ];
        } else {
            query = "   INSERT "
                  + "     INTO permissions(role_id, resource, action) "
                  + "   VALUES ($1, $2, $3) "
                  + "RETURNING id ";
            params = [
                permission.getRoleId(),
                permission.getResource(),
                permission.getAction(),
            ];
        }

        db.query(query, params, function (err, result) {
            if (err) {
                db.end();
                return defer.reject([ 'PermissionRepository.save() - main query', err ]);
            }

            db.end();

            var id = result.rows.length && result.rows[0]['id'];
            if (id)
                permission.setId(id);
            else
                id = result.rowCount > 0 ? permission.getId() : null;

            if (id)
                permission.dirty(false);

            defer.resolve(id);
        });
    });

    return defer.promise;
};

/**
 * Delete permission
 *
 * @param {object} permission       Model to delete
 * @return {object}                 Returns promise resolving to a number or DB rows deleted
 */
PermissionRepository.prototype.delete = function (permission) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'PermissionRepository.delete() - pg connect', err ]);

        db.query(
            "DELETE "
          + "  FROM permissions "
          + " WHERE id = $1 ",
            [ permission.getId() ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'PermissionRepository.delete() - delete', err ]);
                }

                db.end();
                permission.setId(null);
                permission.dirty(false);

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

/**
 * Delete all the permission
 *
 * @return {object}                 Returns promise resolving to a number or DB rows deleted
 */
PermissionRepository.prototype.deleteAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'PermissionRepository.deleteAll() - pg connect', err ]);

        db.query(
            "DELETE "
          + "  FROM permissions ",
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'PermissionRepository.deleteAll() - delete', err ]);
                }

                db.end();
                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

module.exports = PermissionRepository;
