/**
 * Permission repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var BaseRepository = require('./base');
var PermissionModel = require('../models/permission');

function PermissionRepository() {
    BaseRepository.call(this);
}

PermissionRepository.prototype = new BaseRepository();
PermissionRepository.prototype.constructor = PermissionRepository;

PermissionRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getClient();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('PermissionRepository.find() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM permissions "
          + " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('PermissionRepository.find() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var roles = [];
                result.rows.forEach(function (row) {
                    var role = new PermissionModel(row);
                    roles.push(role);
                });

                defer.resolve(roles);
            }
        );
    });

    return defer.promise;
};

PermissionRepository.prototype.findByParams = function (roleId, resource, action) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var ands = [], params = [];

    if (roleId) {
        ands.push(" role_id = $" + (params.length + 1) + " ");
        params.push(roleId);
    } else {
        ands.push(" role_id IS NULL ");
    }

    if (resource) {
        ands.push(" resource = $" + (params.length + 1) + " ");
        params.push(resource);
    } else {
        ands.push(" resource IS NULL ");
    }

    if (action) {
        ands.push(" action = $" + (params.length + 1) + " ");
        params.push(action);
    } else {
        ands.push(" action IS NULL ");
    }

    var db = this.getClient();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('PermissionRepository.findByParams() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM permissions "
          + " WHERE " + ands.join(' AND '),
            params,
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('PermissionRepository.findByParams() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var roles = [];
                result.rows.forEach(function (row) {
                    var role = new PermissionModel(row);
                    roles.push(role);
                });

                defer.resolve(roles);
            }
        );
    });

    return defer.promise;
};

module.exports = PermissionRepository;
