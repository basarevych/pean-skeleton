/**
 * Token model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = require('./base');

function TokenModel(dbRow) {
    this.id = null;
    this.user_id = null;
    this.payload = null;
    this.ip_address = null;
    this.created_at = moment();
    this.updated_at = moment();

    if (dbRow) {
        var utcCreated = moment(dbRow.created_at); // db field is in UTC
        var utcUpdated = moment(dbRow.updated_at); // db field is in UTC

        this.id = dbRow.id;
        this.user_id = dbRow.user_id;
        this.payload = dbRow.payload;
        this.ip_address = dbRow.ip_address;
        this.created_at = moment.tz(utcCreated.format('YYYY-MM-DD HH:mm:ss'), 'UTC').local();
        this.updated_at = moment.tz(utcUpdated.format('YYYY-MM-DD HH:mm:ss'), 'UTC').local();
    }
};

TokenModel.prototype = new BaseModel();
TokenModel.prototype.constructor = TokenModel;

TokenModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

TokenModel.prototype.getId = function () {
    return this.field('id');
};

TokenModel.prototype.setUserId = function (userId) {
    this.field('user_id', userId);
    return this;
};

TokenModel.prototype.getUserId = function () {
    return this.field('user_id');
};

TokenModel.prototype.setPayload = function (payload) {
    this.field('payload', payload);
    return this;
};

TokenModel.prototype.getPayload = function () {
    return this.field('payload');
};

TokenModel.prototype.setIpAddress = function (ipAddress) {
    this.field('ip_address', ipAddress);
    return this;
};

TokenModel.prototype.getIpAddress = function () {
    return this.field('ip_address');
};

TokenModel.prototype.setCreatedAt = function (createdAt) {
    this.field('created_at', createdAt);
    return this;
};

TokenModel.prototype.getCreatedAt = function () {
    return this.field('created_at');
};

TokenModel.prototype.setUpdatedAt = function (updatedAt) {
    this.field('updated_at', updatedAt);
    return this;
};

TokenModel.prototype.getUpdatedAt = function () {
    return this.field('updated_at');
};

TokenModel.prototype.save = function (evenIfNotDirty) {
    var logger = locator.get('logger');
    var repo = locator.get('token-repository');
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
            logger.error('TokenModel.save() - pg connect', err);
            process.exit(1);
        }

        var query, params = [];
        if (me.getId()) {
            query = "UPDATE tokens "
                  + "   SET user_id = $1, "
                  + "       payload = $2, "
                  + "       ip_address = $3, "
                  + "       created_at = $4, "
                  + "       updated_at = $5 "
                  + " WHERE id = $6 ";
            params = [
                me.getUserId(),
                me.getPayload(),
                me.getIpAddress(),
                me.getCreatedAt().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
                me.getUpdatedAt().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
                me.getId(),
            ];
        } else {
            query = "   INSERT "
                  + "     INTO tokens(user_id, payload, ip_address, created_at, updated_at) "
                  + "   VALUES ($1, $2, $3, $4, $5) "
                  + "RETURNING id ";
            params = [
                me.getUserId(),
                me.getPayload(),
                me.getIpAddress(),
                me.getCreatedAt().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
                me.getUpdatedAt().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
            ];
        }

        db.query(query, params, function (err, result) {
            if (err) {
                defer.reject();
                logger.error('TokenModel.save() - pg query', err);
                process.exit(1);
            }

            db.end();
            me.dirty(false);

            var id = result.rows.length && result.rows[0]['id'];
            if (id) {
                me.id = id;
            } else
                id = me.id;

            defer.resolve(id);
        });
    });

    return defer.promise;
};

TokenModel.prototype.delete = function () {
    var logger = locator.get('logger');
    var repo = locator.get('token-repository');
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
            logger.error('TokenModel.delete() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM tokens "
          + " WHERE id = $1 ",
            [ me.getId() ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('TokenModel.delete() - pg query', err);
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

module.exports = TokenModel;
