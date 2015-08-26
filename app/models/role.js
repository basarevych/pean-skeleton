/**
 * Role model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var BaseModel = require('./base');

function RoleModel(dbRow) {
    this.id = null;
    this.parent_id = null;
    this.handle = null;
    this.title = null;

    if (dbRow) {
        this.id = dbRow.id;
        this.parent_id = dbRow.parent_id;
        this.handle = dbRow.handle;
        this.title = dbRow.title;
    }
};

RoleModel.prototype = new BaseModel();
RoleModel.prototype.constructor = RoleModel;

RoleModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

RoleModel.prototype.getId = function () {
    return this.field('id');
};

RoleModel.prototype.setParentId = function (id) {
    this.field('parent_id', id);
    return this;
};

RoleModel.prototype.getParentId = function () {
    return this.field('parent_id');
};

RoleModel.prototype.setHandle = function (handle) {
    this.field('handle', handle);
    return this;
};

RoleModel.prototype.getHandle = function () {
    return this.field('handle');
};

RoleModel.prototype.setTitle = function (title) {
    this.field('title', title);
    return this;
};

RoleModel.prototype.getTitle = function () {
    return this.field('title');
};

RoleModel.prototype.save = function (evenIfNotDirty) {
    if (this.getId() && !this._dirty && evenIfNotDirty !== true)
        return;

    var logger = locator.get('logger');
    var repo = locator.get('user-repository');
    var defer = q.defer();

    var me = this;
    var db = repo.getClient();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleModel.save() - pg connect', err);
            process.exit(1);
        }

        var query, params = [];
        if (me.getId()) {
            query = "UPDATE roles "
                  + "   SET handle = $1, "
                  + "       title = $2 "
                  + " WHERE id = $3 ";
            params = [
                me.getHandle(),
                me.getTitle(),
                me.getId(),
            ];
        } else {
            query = "   INSERT "
                  + "     INTO roles(handle, title) "
                  + "   VALUES ($1, $2) "
                  + "RETURNING id ";
            params = [
                me.getHandle(),
                me.getTitle(),
            ];
        }

        db.query(query, params, function (err, result) {
            if (err) {
                defer.reject();
                logger.error('RoleModel.save() - pg query', err);
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

module.exports = RoleModel;
