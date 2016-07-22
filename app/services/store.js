/**
 * Variables store service
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var path = require('path');
var BaseRepository = locator.get('base-repository');

/**
 * Variables store service
 *
 * @constructor
 */
function Store() {
}

/**
 * Default TTL
 */
Store.DEFAULT_TTL = 60;            // seconds

/**
 * Set variable to a new value
 *
 * @param {string} prefix       Name prefix
 * @param {string|null} name    The name
 * @param {*} value             The value
 * @param {number} ttl          Time before expiration is seconds,
                                0 to disable, undefined for default
 * @return {object}             Returns promise resolving on success
 */
Store.prototype.set = function (prefix, name, value, ttl) {
    var defer = q.defer();

    var key = process.env.PROJECT + ':' + prefix;
    if (name)
        key += ':' + name;
    if (typeof ttl == 'undefined')
        ttl = Store.DEFAULT_TTL;

    var repo = new BaseRepository();
    var redis = repo.getRedis();
    redis.set(key, JSON.stringify(value), function (err) {
        if (err) {
            redis.quit();
            return defer.reject([ 'Store.set() - set', err ]);
        }

        if (!ttl) {
            redis.quit();
            return defer.resolve();
        }

        redis.expire(key, ttl, function (err) {
            if (err) {
                redis.quit();
                return defer.reject([ 'Store.set() - expire', err ]);
            }

            redis.quit();
            defer.resolve();
        });
    });

    return defer.promise;
};

/**
 * Get variable value
 *
 * @param {string} prefix       Name prefix
 * @param {string} name         The name
 * @return {object}             Returns promise resolving to the value on success
 */
Store.prototype.get = function (prefix, name) {
    var defer = q.defer();
    var me = this;

    var key = process.env.PROJECT + ':' + prefix;
    if (name)
        key += ':' + name;

    var repo = new BaseRepository();
    var redis = repo.getRedis();
    redis.get(key, function (err, value) {
        redis.quit();

        if (err)
            return defer.reject([ 'Store.get() - get', err ]);

        if (value !== null)
            return defer.resolve(JSON.parse(value));

        var func;
        try {
            func = require(path.join(__dirname, '..', 'store', prefix));
        } catch (err) {
            // do nothing
        }

        if (!func)
            return defer.resolve(undefined);

        q.fcall(function () {
                return func(name);
            })
            .then(function (value) {
                defer.resolve(value);
            })
            .catch(function (err) {
                return defer.reject(err);
            });
    });

    return defer.promise;
};

/**
 * Remove variable
 *
 * @param {string} prefix       Name prefix
 * @param {string} name         The name
 * @return {object}             Returns promise resolving on success
 */
Store.prototype.unset = function (prefix, name) {
    var defer = q.defer();

    var key = process.env.PROJECT + ':' + prefix;
    if (name)
        key += ':' + name;

    var repo = new BaseRepository();
    var redis = repo.getRedis();
    redis.del(key, function (err) {
        if (err) {
            redis.quit();
            return defer.reject([ 'Store.unset() - del', err ]);
        }

        redis.quit();
        return defer.resolve();
    });

    return defer.promise;
};

module.exports = Store;
