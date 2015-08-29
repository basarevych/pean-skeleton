/**
 * Permission model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var BaseModel = require('./base');

function PermissionModel(dbRow) {
    this.id = null;
    this.role_id = null;
    this.resource = null;
    this.action = null;

    if (dbRow) {
        this.id = dbRow.id;
        this.role_id = dbRow.role_id;
        this.resource = dbRow.resource;
        this.action = dbRow.action;
    }
};

PermissionModel.prototype = new BaseModel();
PermissionModel.prototype.constructor = PermissionModel;

PermissionModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

PermissionModel.prototype.getId = function () {
    return this.field('id');
};

PermissionModel.prototype.setRoleId = function (id) {
    this.field('role_id', id);
    return this;
};

PermissionModel.prototype.getRoleId = function () {
    return this.field('role_id');
};

PermissionModel.prototype.setResource = function (resource) {
    this.field('resource', resource);
    return this;
};

PermissionModel.prototype.getResource = function () {
    return this.field('resource');
};

PermissionModel.prototype.setAction = function (action) {
    this.field('action', action);
    return this;
};

PermissionModel.prototype.getAction = function () {
    return this.field('action');
};

PermissionModel.prototype.save = function (evenIfNotDirty) {
    var logger = locator.get('logger');
    var repo = locator.get('user-repository');
    var defer = q.defer();

    if (this.getId() && !this._dirty && evenIfNotDirty !== true) {
        defer.resolve(this.getId());
        return defer.promise;
    }

    var me = this;
    var db = repo.getClient();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('PermissionModel.save() - pg connect', err);
            process.exit(1);
        }

        var query, params = [];
        if (me.getId()) {
            query = "UPDATE permissions "
                  + "   SET role_id = $1, "
                  + "       resource = $2, "
                  + "       action = $3 "
                  + " WHERE id = $4 ";
            params = [
                me.getRoleId(),
                me.getResource(),
                me.getAction(),
                me.getId(),
            ];
        } else {
            query = "   INSERT "
                  + "     INTO permissions(role_id, resource, action) "
                  + "   VALUES ($1, $2, $3) "
                  + "RETURNING id ";
            params = [
                me.getRoleId(),
                me.getResource(),
                me.getAction(),
            ];
        }

        db.query(query, params, function (err, result) {
            if (err) {
                defer.reject();
                logger.error('PermissionModel.save() - pg query', err);
                process.exit(1);
            }

            db.end();

            var id = result.rows.length && result.rows[0]['id'];
            if (id)
                me.id = id;
            else
                id = me.id;

            defer.resolve(id);
        });
    });

    return defer.promise;
};

module.exports = PermissionModel;
