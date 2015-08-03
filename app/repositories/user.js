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

    this.connect()
        .then(function (db) {
            db.users.find({ id: id }, function (err, rows) {
                if (err) {
                    defer.reject();
                    logger.error('find', err);
                    process.exit(1);
                }

                var users = [];
                rows.forEach(function (el) {
                    var user = new UserModel(el);
                    users.push(user);
                });

                defer.resolve(users);
            });
        });

    return defer.promise;
};

UserRepository.prototype.findByEmail = function (email) {
    var logger = locator.get('logger');
    var defer = q.defer();

    this.connect()
        .then(function (db) {
            db.users.where("email = $1", email, function (err, rows) {
                if (err) {
                    defer.reject();
                    logger.error('find by email', err);
                    process.exit(1);
                }

                var users = [];
                rows.forEach(function (el) {
                    var user = new UserModel(el);
                    users.push(user);
                });

                defer.resolve(users);
            });
        });

    return defer.promise;
};

UserRepository.prototype.save = function (model) {
    var logger = locator.get('logger');
    var defer = q.defer();

    this.connect()
        .then(function (db) {
            db.users.save(model, function (err, rows) {
                if (err) {
                    defer.reject();
                    logger.error('save user', err);
                    process.exit(1);
                }

                var user = new UserModel(rows.length ? rows[0] : undefined);
                defer.resolve(user);
            });
        });

    return defer.promise;
};

module.exports = UserRepository;
