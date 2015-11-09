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

function PermissionRepository() {
    BaseRepository.call(this);
}

PermissionRepository.prototype = new BaseRepository();
PermissionRepository.prototype.constructor = PermissionRepository;

PermissionRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    id = parseInt(id, 10);
    if (isNaN(id)) {
        defer.reject('PermissionRepository.find() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('PermissionRepository.find() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM permissions "
          + " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('PermissionRepository.find() - pg query', err);
                    process.exit(1);
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

PermissionRepository.prototype.findByRoleId = function (roleId) {
    var logger = locator.get('logger');
    var defer = q.defer();

    roleId = parseInt(roleId, 10);
    if (isNaN(roleId)) {
        defer.reject('PermissionRepository.findByRoleId() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('PermissionRepository.findByRoleId() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM permissions "
          + " WHERE role_id = $1 ",
            [ roleId ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('PermissionRepository.findByRoleId() - pg query', err);
                    process.exit(1);
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

PermissionRepository.prototype.findByParams = function (roleId, resource, action) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var ands = [], params = [];

    if (roleId) {
        roleId = parseInt(roleId, 10);
        if (isNaN(roleId)) {
            defer.reject('PermissionRepository.findByParams() - invalid parameters');
            return defer.promise;
        }

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
        if (err) {
            defer.reject();
            logger.error('PermissionRepository.findByParams() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM permissions "
          + " WHERE " + ands.join(' AND '),
            params,
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('PermissionRepository.findByParams() - pg query', err);
                    process.exit(1);
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

PermissionRepository.prototype.findAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('PermissionRepository.findAll() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "  SELECT * "
          + "    FROM permissions ",
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('PermissionRepository.findAll() - pg query', err);
                    process.exit(1);
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

PermissionRepository.prototype.save = function (permission) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('PermissionRepository.save() - pg connect', err);
            process.exit(1);
        }

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
                defer.reject();
                logger.error('PermissionRepository.save() - pg query', err);
                process.exit(1);
            }

            db.end();
            permission.dirty(false);

            var id = result.rows.length && result.rows[0]['id'];
            if (id)
                permission.setId(id);
            else
                id = permission.getId();

            defer.resolve(id);
        });
    });

    return defer.promise;
};

PermissionRepository.prototype.delete = function (permission) {
    var logger = locator.get('logger');
    var defer = q.defer();

    if (!permission.getId()) {
        defer.resolve(0);
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('PermissionRepository.delete() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM permissions "
          + " WHERE id = $1 ",
            [ permission.getId() ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('PermissionRepository.delete() - pg query', err);
                    process.exit(1);
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

PermissionRepository.prototype.deleteAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('PermissionRepository.deleteAll() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM permissions ",
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('PermissionRepository.deleteAll() - pg query', err);
                    process.exit(1);
                }

                db.end();

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

module.exports = PermissionRepository;
