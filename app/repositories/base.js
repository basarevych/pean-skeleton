/**
 * Base repository
 */

'use strict'

var q = require('q');
var massive = require('massive');

function BaseRepository(app) {
    this.app = app;
}

BaseRepository.prototype.connect = function () {
    var defer = q.defer();
    var db = this.app.get('db');
    if (db) {
        defer.resolve(db);
        return defer.promise;
    }

    var me = this;
    var config = this.app.get('config');
    var logger = this.app.get('logger');

    var url = 'postgres://' + config['db']['user'] + ':' + config['db']['password']
        + '@' + config['db']['host'] + '/' + config['db']['name'];

    massive.connect({ connectionString: url }, function (err, db) {
        if (err) {
            defer.reject();
            logger.error('massive connect', err);
            process.exit(1);
        }

        me.app.set('db', db);
        defer.resolve(db);
    });

    return defer.promise;
};

module.exports = BaseRepository;
