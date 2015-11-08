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
    this.payload = {};
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

module.exports = TokenModel;
