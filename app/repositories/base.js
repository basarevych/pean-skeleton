/**
 * Base repository
 */

'use strict'

var locator = require('node-service-locator');
var pg = require('pg');

function BaseRepository() {
}

BaseRepository.prototype.getClient = function () {
    var config = locator.get('config');
    var url = 'postgres://' + config['db']['user'] + ':' + config['db']['password']
        + '@' + config['db']['host'] + '/' + config['db']['name'];

    return new pg.Client(url);
};

module.exports = BaseRepository;
