/**
 * Token repository
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseRepository = locator.get('base-repository');
var BaseModel = locator.get('base-model');
var TokenModel = locator.get('token-model');

/**
 * Token repository
 *
 * @constructor
 */
function TokenRepository() {
    BaseRepository.call(this);
}

TokenRepository.prototype = new BaseRepository();
TokenRepository.prototype.constructor = TokenRepository;

/**
 * Find a token by ID
 *
 * @param {integer} id      ID to search by
 * @return {object}         Returns promise resolving to array of models
 */
TokenRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'TokenRepository.find() - pg connect', err ]);

        db.query(
            "SELECT * " +
            "  FROM tokens " +
            " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'TokenRepository.find() - select', err ]);
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

/**
 * Find tokens by user ID
 *
 * @param {integer} userId          User ID to search by
 * @return {object}                 Returns promise resolving to array of models
 */
TokenRepository.prototype.findByUserId = function (userId) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'TokenRepository.findByUserId() - pg connect', err ]);

        db.query(
            "SELECT * " +
            "  FROM tokens " +
            " WHERE user_id = $1 ",
            [ userId ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'TokenRepository.findByUserId() - select', err ]);
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

/**
 * Find all the tokens
 *
 * @return {object}         Returns promise resolving to array of models
 */
TokenRepository.prototype.findAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'TokenRepository.findAll() - pg connect', err ]);

        db.query(
            "SELECT * " +
            "  FROM tokens ",
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'TokenRepository.findAll() - select', err ]);
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

/**
 * Save token model
 *
 * @param {object} token   The token to save
 * @return {object}         Returns promise resolving to token ID or null on failure
 */
TokenRepository.prototype.save = function (token) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();

    function updateToken() {
        var updateDefer = q.defer();
        token.setUpdatedAt(moment());

        db.query(
            "UPDATE tokens " +
            "   SET user_id = $1, " +
            "       payload = $2, " +
            "       ip_address = $3, " +
            "       updated_at = $4 " +
            " WHERE id = $5 ",
            [
                token.getUserId(),
                JSON.stringify(token.getPayload()),
                token.getIpAddress(),
                token.getUpdatedAt().tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                token.getId(),
            ],
            function (err, result) {
                if (err)
                    return updateDefer.reject([ 'TokenRepository.save() - update query', err ]);

                var id = result.rowCount > 0 ? token.getId() : null;

                if (id)
                    token.dirty(false);

                updateDefer.resolve(id);
            }
        );

        return updateDefer.promise;
    }

    db.connect(function (err) {
        if (err)
            return defer.reject([ 'TokenRepository.save() - pg connect', err ]);

        if (token.getId()) {
            updateToken()
                .then(function (tokenId) {
                    db.end();
                    defer.resolve(tokenId);
                })
                .catch(function (err) {
                    db.end();
                    defer.reject(err);
                });
        } else {
            db.query(
                "   INSERT " +
                "     INTO tokens(user_id, payload, ip_address, created_at, updated_at) " +
                "   VALUES ($1, $2, $3, $4, $5) " +
                "RETURNING id ",
                [
                    token.getUserId(),
                    JSON.stringify(token.getPayload()),
                    token.getIpAddress(),
                    token.getCreatedAt().tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                    token.getUpdatedAt().tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                ],
                function (err, result) {
                    if (err) {
                        db.end();
                        return defer.reject([ 'TokenRepository.save() - insert', err ]);
                    }

                    token.setId(result.rows[0]['id']);

                    var payload = token.getPayload();
                    payload['token_id'] = token.getId();
                    token.setPayload(payload);

                    updateToken()
                        .then(function (tokenId) {
                            db.end();
                            defer.resolve(tokenId);
                        })
                        .catch(function (err) {
                            db.end();
                            defer.reject(err);
                        });
                }
            );
        }
    });

    return defer.promise;
};

/**
 * Delete the token
 *
 * @param {object} token        Token to delete
 * @return {object}             Returns promise resolving to a number of deleted DB rows
 */
TokenRepository.prototype.delete = function (token) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'TokenRepository.delete() - pg connect', err ]);

        db.query(
            "DELETE " +
            "  FROM tokens " +
            " WHERE id = $1 ",
            [ token.getId() ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'TokenRepository.delete() - delete', err ]);
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

/**
 * Delete expired tokens
 *
 * @return {object}             Returns promise resolving to a number of deleted DB rows
 */
TokenRepository.prototype.deleteExpired = function () {
    var logger = locator.get('logger');
    var config = locator.get('config');
    var defer = q.defer();

    var time = moment().subtract(config['jwt']['ttl'], 'seconds');

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'TokenRepository.deleteExpired() - pg connect', err ]);

        db.query(
            "DELETE " +
            "  FROM tokens " +
            " WHERE updated_at < $1 ",
            [
                time.tz('UTC').format(BaseModel.DATETIME_FORMAT), // DB uses UTC
            ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'TokenRepository.deleteExpired() - delete', err ]);
                }

                db.end();

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

/**
 * Delete all the tokens
 *
 * @return {object}             Returns promise resolving to a number of deleted DB rows
 */
TokenRepository.prototype.deleteAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'TokenRepository.deleteAll() - pg connect', err ]);

        db.query(
            "DELETE " +
            "  FROM tokens ",
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'TokenRepository.deleteAll() - delete', err ]);
                }

                db.end();
                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

module.exports = TokenRepository;
