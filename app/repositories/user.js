/**
 * User repository
 */

'use strict'

var q = require('q');
var BaseRepository = require('./base');

function UserRepository(app) {
    BaseRepository.call(this, app);
}

UserRepository.prototype = new BaseRepository();
UserRepository.prototype.constructor = UserRepository;

UserRepository.prototype.find = function (id) {
    var logger = this.app.get('logger');
    var defer = q.defer();

    this.connect()
        .then(function (db) {
            db.users.find({ id: id }, function (err, rows) {
                if (err) {
                    defer.reject();
                    logger.error('find', err);
                    process.exit(1);
                }

                defer.resolve(rows);
            });
        });

    return defer.promise;
};

UserRepository.prototype.findByEmail = function (email) {
    var logger = this.app.get('logger');
    var defer = q.defer();

    this.connect()
        .then(function (db) {
            db.users.where("email = $1", email, function (err, rows) {
                if (err) {
                    defer.reject();
                    logger.error('find by email', err);
                    process.exit(1);
                }

                defer.resolve(rows);
            });
        });

    return defer.promise;
};

UserRepository.prototype.save = function (model) {
    var logger = this.app.get('logger');
    var defer = q.defer();

    this.connect()
        .then(function (db) {
            db.users.save(model, function (err, row) {
                if (err) {
                    defer.reject();
                    logger.error('save user', err);
                    process.exit(1);
                }

                defer.resolve(row);
            });
        });

    return defer.promise;
};

module.exports = UserRepository;
