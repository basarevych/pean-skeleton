/**
 * User repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var BaseRepository = require('./base');
var UserModel = require('../models/user');

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
