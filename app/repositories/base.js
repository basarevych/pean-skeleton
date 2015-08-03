/**
 * Base repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var massive = require('massive');

function BaseRepository() {
}

BaseRepository.prototype.connect = function () {
    var defer = q.defer();
    var db = locator.get('db');
    if (db) {
        defer.resolve(db);
        return defer.promise;
    }

    var config = locator.get('config');
    var logger = locator.get('logger');

    var url = 'postgres://' + config['db']['user'] + ':' + config['db']['password']
        + '@' + config['db']['host'] + '/' + config['db']['name'];

    massive.connect({ connectionString: url }, function (err, db) {
        if (err) {
            defer.reject();
            logger.error('massive connect', err);
            process.exit(1);
        }

        locator.register('db', db);
        defer.resolve(db);
    });

    return defer.promise;
};

module.exports = BaseRepository;
