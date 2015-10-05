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
            "    SELECT * "
          + "      FROM tokens "
          + "     WHERE user_id = $1 ",
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

module.exports = TokenRepository;
