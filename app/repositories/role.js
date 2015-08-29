/**
 * Role repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var BaseRepository = require('./base');
var RoleModel = require('../models/role');

function RoleRepository() {
    BaseRepository.call(this);
}

RoleRepository.prototype = new BaseRepository();
RoleRepository.prototype.constructor = RoleRepository;

RoleRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleRepository.find() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM roles "
          + " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleRepository.find() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var roles = [];
                result.rows.forEach(function (row) {
                    var role = new RoleModel(row);
                    roles.push(role);
                });

                defer.resolve(roles);
            }
        );
    });

    return defer.promise;
};

RoleRepository.prototype.findByHandle = function (handle) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleRepository.findByHandle() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM roles "
          + " WHERE handle = $1 ",
            [ handle ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleRepository.findByHandle() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var roles = [];
                result.rows.forEach(function (row) {
                    var role = new RoleModel(row);
                    roles.push(role);
                });

                defer.resolve(roles);
            }
        );
    });

    return defer.promise;
};

RoleRepository.prototype.findByUserId = function (userId) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleRepository.findByUserId() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "    SELECT r.* "
          + "      FROM roles r "
          + "INNER JOIN user_roles ur "
          + "        ON ur.role_id = r.id "
          + "     WHERE ur.user_id = $1 ",
            [ userId ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleRepository.findByUserId() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var roles = [];
                result.rows.forEach(function (row) {
                    var role = new RoleModel(row);
                    roles.push(role);
                });

                defer.resolve(roles);
            }
        );
    });

    return defer.promise;
};

module.exports = RoleRepository;
