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
            logger.error('pg connect', err);
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
                    logger.error('pg query', err);
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
            logger.error('pg connect', err);
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
                    logger.error('pg query', err);
                    process.exit(1);
                }

                db.end();

                var users = [];
                result.rows.forEach(function (row) {
                    var user = new UserModel(row);
                    users.push(user);
                });

                defer.resolve(users);
                db.end();
            }
        );
    });

    return defer.promise;
};

UserRepository.prototype.save = function (model) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getClient();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('pg connect', err);
            process.exit(1);
        }

        var query, params = [];
        if (typeof model['id'] == 'undefined') {
            query = "   INSERT "
                  + "     INTO users(name, email, password, created_at, is_admin) "
                  + "   VALUES ($1, $2, $3, $4, $5) "
                  + "RETURNING id ";
            params = [
                model.getName(),
                model.getEmail(),
                model.getPassword(),
                model.getCreatedAt(),
                model.getIsAdmin(),
            ];
        } else {
            query = "UPDATE users "
                  + "   SET name = $1, "
                  + "       email = $2, "
                  + "       password = $3, "
                  + "       created_at = $4, "
                  + "       is_admin = $5 "
                  + " WHERE id = $6 ";
            params = [
                model.getName(),
                model.getEmail(),
                model.getPassword(),
                model.getCreatedAt(),
                model.getIsAdmin(),
                model.getId(),
            ];
        }

        db.query(query, params, function (err, result) {
            if (err) {
                defer.reject();
                logger.error('pg query', err);
                process.exit(1);
            }

            db.end();

            defer.resolve(result.rows.length ? result.rows[0]['id'] : model['id']);
        });
    });

    return defer.promise;
};

module.exports = UserRepository;
