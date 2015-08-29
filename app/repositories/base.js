/**
 * Base repository
 */

'use strict'

var locator = require('node-service-locator');
var pg = require('pg');
var redis = require('redis');

function BaseRepository() {
}

BaseRepository.prototype.getPostgres = function () {
    var config = locator.get('config');
    var url = 'postgres://' + config['postgres']['user'] + ':' + config['postgres']['password']
        + '@' + config['postgres']['host'] + '/' + config['postgres']['name'];

    return new pg.Client(url);
};

BaseRepository.prototype.getRedis = function () {
    var config = locator.get('config');
    var options = {};
    if (config['redis']['password'])
        options['auth_pass'] = config['redis']['password'];
    return redis.createClient(config['redis']['port'], config['redis']['host'], options);
};

module.exports = BaseRepository;
