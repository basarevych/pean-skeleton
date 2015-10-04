/**
 * Session repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var BaseRepository = require('./base');
var SessionModel = require('../models/session');

function SessionRepository() {
    BaseRepository.call(this);
}

SessionRepository.prototype = new BaseRepository();
SessionRepository.prototype.constructor = SessionRepository;

SessionRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    id = parseInt(id, 10);
    if (isNaN(id)) {
        defer.reject('SessionRepository.find() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('SessionRepository.find() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM sessions "
          + " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('SessionRepository.find() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var sessions = [];
                result.rows.forEach(function (row) {
                    var session = new SessionModel(row);
                    sessions.push(session);
                });

                defer.resolve(sessions);
            }
        );
    });

    return defer.promise;
};

SessionRepository.prototype.findByUserId = function (userId) {
    var logger = locator.get('logger');
    var defer = q.defer();

    userId = parseInt(userId, 10);
    if (isNaN(userId)) {
        defer.reject('SessionRepository.findByUserId() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('SessionRepository.findByUserId() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "    SELECT * "
          + "      FROM sessions "
          + "     WHERE user_id = $1 ",
            [ userId ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('SessionRepository.findByUserId() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var sessions = [];
                result.rows.forEach(function (row) {
                    var session = new SessionModel(row);
                    sessions.push(session);
                });

                defer.resolve(sessions);
            }
        );
    });

    return defer.promise;
};

module.exports = SessionRepository;
