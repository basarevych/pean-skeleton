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
    var logger = locator.get('logger');
    var repo = locator.get('user-repository');
    var defer = q.defer();

    if (this.getId() && !this._dirty && evenIfNotDirty !== true) {
        defer.resolve(this.getId());
        return defer.promise;
    }

    var me = this;
    var db = repo.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleModel.save() - pg connect', err);
            process.exit(1);
        }

        var query, params = [];
        if (me.getId()) {
            query = "UPDATE roles "
                  + "   SET parent_id = $1, "
                  + "       handle = $2, "
                  + "       title = $3 "
                  + " WHERE id = $4 ";
            params = [
                me.getParentId(),
                me.getHandle(),
                me.getTitle(),
                me.getId(),
            ];
        } else {
            query = "   INSERT "
                  + "     INTO roles(parent_id, handle, title) "
                  + "   VALUES ($1, $2, $3) "
                  + "RETURNING id ";
            params = [
                me.getParentId(),
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
            me.dirty(false);

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

RoleModel.prototype.delete = function () {
    var logger = locator.get('logger');
    var repo = locator.get('role-repository');
    var defer = q.defer();

    if (!this.getId()) {
        defer.resolve(0);
        return defer.promise;
    }

    var me = this;
    var db = repo.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleModel.delete() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM roles "
          + " WHERE id = $1 ",
            [ me.getId() ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleModel.delete() - pg query', err);
                    process.exit(1);
                }

                db.end();
                me.setId(null);
                me.dirty(false);

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};


module.exports = RoleModel;
