/**
 * Session model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = require('./base');

function SessionModel(dbRow) {
    this.id = null;
    this.user_id = null;
    this.ip_address = null;
    this.created_at = moment();
    this.updated_at = moment();

    if (dbRow) {
        var utcCreated = moment(dbRow.created_at); // db field is in UTC
        var utcUpdated = moment(dbRow.updated_at); // db field is in UTC

        this.id = dbRow.id;
        this.user_id = dbRow.user_id;
        this.ip_address = dbRow.ip_address;
        this.created_at = moment.tz(utcCreated.format('YYYY-MM-DD HH:mm:ss'), 'UTC').local();
        this.updated_at = moment.tz(utcUpdated.format('YYYY-MM-DD HH:mm:ss'), 'UTC').local();
    }
};

SessionModel.prototype = new BaseModel();
SessionModel.prototype.constructor = SessionModel;

SessionModel.prototype.setId = function (id) {
    this.filed('id', id);
    return this;
};

SessionModel.prototype.getId = function () {
    return this.field('id');
};

SessionModel.prototype.setUserId = function (userId) {
    this.field('user_id', userId);
    return this;
};

SessionModel.prototype.getUserId = function () {
    return this.field('user_id');
};

SessionModel.prototype.setIpAddress = function (ipAddress) {
    this.field('ip_address', ipAddress);
    return this;
};

SessionModel.prototype.getIpAddress = function () {
    return this.field('ip_address');
};

SessionModel.prototype.setCreatedAt = function (createdAt) {
    this.field('created_at', createdAt);
    return this;
};

SessionModel.prototype.getCreatedAt = function () {
    return this.field('created_at');
};

SessionModel.prototype.setUpdatedAt = function (updatedAt) {
    this.field('updated_at', updatedAt);
    return this;
};

SessionModel.prototype.getUpdatedAt = function () {
    return this.field('updated_at');
};

SessionModel.prototype.save = function (evenIfNotDirty) {
    var logger = locator.get('logger');
    var repo = locator.get('session-repository');
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
            logger.error('SessionModel.save() - pg connect', err);
            process.exit(1);
        }

        var query, params = [];
        if (me.getId()) {
            query = "UPDATE sessions "
                  + "   SET user_id = $1, "
                  + "       ip_address = $2, "
                  + "       created_at = $3, "
                  + "       updated_at = $4 "
                  + " WHERE id = $5 ";
            params = [
                me.getUserId(),
                me.getIpAddress(),
                me.getCreatedAt(),
                me.getUpdatedAt(),
                me.getId(),
            ];
        } else {
            query = "   INSERT "
                  + "     INTO sessions(user_id, ip_address, created_at, updated_at) "
                  + "   VALUES ($1, $2, $3, $4) "
                  + "RETURNING id ";
            params = [
                me.getUserId(),
                me.getIpAddress(),
                me.getCreatedAt().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
                me.getUpdatedAt().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
            ];
        }

        db.query(query, params, function (err, result) {
            if (err) {
                defer.reject();
                logger.error('SessionModel.save() - pg query', err);
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

module.exports = SessionModel;
