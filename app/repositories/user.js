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

    var db = this.getClient();
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

    var db = this.getClient();
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

UserRepository.prototype.findByRole = function (handle) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getClient();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('UserRepository.findByRole() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "    SELECT * "
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
                    logger.error('UserRepository.findByRole() - pg query', err);
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

module.exports = UserRepository;
