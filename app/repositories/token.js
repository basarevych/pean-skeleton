/**
 * Token repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var BaseRepository = require('./base');
var TokenModel = require('../models/token');

function TokenRepository() {
    BaseRepository.call(this);
}

TokenRepository.prototype = new BaseRepository();
TokenRepository.prototype.constructor = TokenRepository;

TokenRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    id = parseInt(id, 10);
    if (isNaN(id)) {
        defer.reject('TokenRepository.find() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('TokenRepository.find() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM tokens "
          + " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('TokenRepository.find() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var tokens = [];
                result.rows.forEach(function (row) {
                    var token = new TokenModel(row);
                    tokens.push(token);
                });

                defer.resolve(tokens);
            }
        );
    });

    return defer.promise;
};

TokenRepository.prototype.findByUserId = function (userId) {
    var logger = locator.get('logger');
    var defer = q.defer();

    userId = parseInt(userId, 10);
    if (isNaN(userId)) {
        defer.reject('TokenRepository.findByUserId() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('TokenRepository.findByUserId() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM tokens "
          + " WHERE user_id = $1 ",
            [ userId ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('TokenRepository.findByUserId() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var tokens = [];
                result.rows.forEach(function (row) {
                    var token = new TokenModel(row);
                    tokens.push(token);
                });

                defer.resolve(tokens);
            }
        );
    });

    return defer.promise;
};

TokenRepository.prototype.findAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('TokenRepository.findAll() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM tokens ",
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('TokenRepository.findAll() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var tokens = [];
                result.rows.forEach(function (row) {
                    var token = new TokenModel(row);
                    tokens.push(token);
                });

                defer.resolve(tokens);
            }
        );
    });

    return defer.promise;
};

TokenRepository.prototype.save = function (token) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('TokenRepository.save() - pg connect', err);
            process.exit(1);
        }

        var query, params = [];
        if (token.getId()) {
            query = "UPDATE tokens "
                  + "   SET user_id = $1, "
                  + "       payload = $2, "
                  + "       ip_address = $3, "
                  + "       created_at = $4, "
                  + "       updated_at = $5 "
                  + " WHERE id = $6 ";
            params = [
                token.getUserId(),
                token.getPayload(),
                token.getIpAddress(),
                token.getCreatedAt().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
                token.getUpdatedAt().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
                token.getId(),
            ];
        } else {
            query = "   INSERT "
                  + "     INTO tokens(user_id, payload, ip_address, created_at, updated_at) "
                  + "   VALUES ($1, $2, $3, $4, $5) "
                  + "RETURNING id ";
            params = [
                token.getUserId(),
                token.getPayload(),
                token.getIpAddress(),
                token.getCreatedAt().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
                token.getUpdatedAt().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
            ];
        }

        db.query(query, params, function (err, result) {
            if (err) {
                defer.reject();
                logger.error('TokenRepository.save() - pg query', err);
                process.exit(1);
            }

            db.end();
            token.dirty(false);

            var id = result.rows.length && result.rows[0]['id'];
            if (id)
                token.setId(id);
            else
                id = token.getId();

            defer.resolve(id);
        });
    });

    return defer.promise;
};

TokenRepository.prototype.delete = function (token) {
    var logger = locator.get('logger');
    var defer = q.defer();

    if (!token.getId()) {
        defer.resolve(0);
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('TokenRepository.delete() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM tokens "
          + " WHERE id = $1 ",
            [ token.getId() ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('TokenRepository.delete() - pg query', err);
                    process.exit(1);
                }

                db.end();
                token.setId(null);
                token.dirty(false);

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

TokenRepository.prototype.deleteAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('TokenRepository.deleteAll() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM tokens ",
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('TokenRepository.deleteAll() - pg query', err);
                    process.exit(1);
                }

                db.end();

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

module.exports = TokenRepository;
