/**
 * Base repository
 */

'use strict'

var locator = require('node-service-locator');
var pg = require('pg');
var redis = require('redis');

/**
 * Repository base class
 *
 * @constructor
 */
function BaseRepository() {
}

/**
 * Max number of transaction retries on serialization failures
 */
BaseRepository.MAX_TRANSACTION_RETRIES = 60;

/**
 * Minimum time to wait before retrying transaction
 */
BaseRepository.MIN_TRANSACTION_DELAY = 100;     // ms

/**
 * Maximum time to wait before retrying transaction
 */
BaseRepository.MAX_TRANSACTION_DELAY = 1000;    // ms

/**
 * Retrieve Postgres DB client
 *
 * @return {object}
 */
BaseRepository.prototype.getPostgres = function () {
    var config = locator.get('config');
    var url = 'postgres://' + config['postgres']['user'] + ':' + config['postgres']['password']
        + '@' + config['postgres']['host'] + '/' + config['postgres']['name'];

    return new pg.Client(url);
};

/**
 * Retrieve Redis DB client
 *
 * @return {object}
 */
BaseRepository.prototype.getRedis = function () {
    var config = locator.get('config');
    var options = {};
    if (config['redis']['password'])
        options['auth_pass'] = config['redis']['password'];
    return redis.createClient(config['redis']['port'], config['redis']['host'], options);
};

/**
 * Rollback and restart a transaction
 *
 * If transaction could not be rolled back defer's promise is rejected
 * otherwise transaction function is called
 *
 * @param {object} db               Postgres client
 * @param {object} defer            Caller's defer
 * @param {function} transaction    Transaction function
 */
BaseRepository.prototype.restartTransaction = function (db, defer, transaction) {
    db.query("ROLLBACK TRANSACTION", [], function (err, result) {
        if (err) {
            db.end();
            defer.reject([ 'BaseRepository.restartTransaction() - rollback', err ]);
            return;
        }

        var random = locator.get('random');
        var delay = random.getRandomInt(BaseRepository.MIN_TRANSACTION_DELAY, BaseRepository.MAX_TRANSACTION_DELAY);
        return setTimeout(function () { transaction(); }, delay);
    });
};

module.exports = BaseRepository;
