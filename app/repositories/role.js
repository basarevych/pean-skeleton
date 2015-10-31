/**
 * Role repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var BaseRepository = require('./base');
var RoleModel = require('../models/role');

function RoleRepository() {
    BaseRepository.call(this);
}

RoleRepository.prototype = new BaseRepository();
RoleRepository.prototype.constructor = RoleRepository;

RoleRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    id = parseInt(id, 10);
    if (isNaN(id)) {
        defer.reject('RoleRepository.find() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleRepository.find() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM roles "
          + " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleRepository.find() - pg query', err);
                    process.exit(1);
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

RoleRepository.prototype.findByHandle = function (handle) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleRepository.findByHandle() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM roles "
          + " WHERE handle = $1 ",
            [ handle ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleRepository.findByHandle() - pg query', err);
                    process.exit(1);
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

RoleRepository.prototype.findByUserId = function (userId) {
    var logger = locator.get('logger');
    var defer = q.defer();

    userId = parseInt(userId, 10);
    if (isNaN(userId)) {
        defer.reject('RoleRepository.findByUserId() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleRepository.findByUserId() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "    SELECT r.* "
          + "      FROM roles r "
          + "INNER JOIN user_roles ur "
          + "        ON ur.role_id = r.id "
          + "     WHERE ur.user_id = $1 ",
            [ userId ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleRepository.findByUserId() - pg query', err);
                    process.exit(1);
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

RoleRepository.prototype.findAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleRepository.findAll() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "  SELECT * "
          + "    FROM roles "
          + "ORDER BY handle ",
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleRepository.findAll() - pg query', err);
                    process.exit(1);
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

RoleRepository.prototype.save = function (role) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleRepository.save() - pg connect', err);
            process.exit(1);
        }

        var query, params = [];
        if (role.getId()) {
            query = "UPDATE roles "
                  + "   SET parent_id = $1, "
                  + "       handle = $2, "
                  + "       title = $3 "
                  + " WHERE id = $4 ";
            params = [
                role.getParentId(),
                role.getHandle(),
                role.getTitle(),
                role.getId(),
            ];
        } else {
            query = "   INSERT "
                  + "     INTO roles(parent_id, handle, title) "
                  + "   VALUES ($1, $2, $3) "
                  + "RETURNING id ";
            params = [
                role.getParentId(),
                role.getHandle(),
                role.getTitle(),
            ];
        }

        db.query(query, params, function (err, result) {
            if (err) {
                defer.reject();
                logger.error('RoleRepository.save() - pg query', err);
                process.exit(1);
            }

            db.end();
            role.dirty(false);

            var id = result.rows.length && result.rows[0]['id'];
            if (id)
                role.setId(id);
            else
                id = role.getId();

            defer.resolve(id);
        });
    });

    return defer.promise;
};

RoleRepository.prototype.delete = function (role) {
    var logger = locator.get('logger');
    var defer = q.defer();

    if (!role.getId()) {
        defer.resolve(0);
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleRepository.delete() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM roles "
          + " WHERE id = $1 ",
            [ role.getId() ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleRepository.delete() - pg query', err);
                    process.exit(1);
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

RoleRepository.prototype.deleteAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleRepository.deleteAll() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM roles ",
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleRepository.deleteAll() - pg query', err);
                    process.exit(1);
                }

                db.end();

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

module.exports = RoleRepository;
