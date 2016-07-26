/**
 * Token model
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = locator.get('base-model');

/**
 * Token model class
 *
 * @constructor
 * @param {object} model    DB row used as source for this instance
 */
function TokenModel(model) {
    this.id = null;
    this.user_id = null;
    this.payload = {};
    this.ip_address = null;
    this.created_at = moment();
    this.updated_at = moment();

    BaseModel.call(this, model);
}

TokenModel.prototype = new BaseModel();
TokenModel.prototype.constructor = TokenModel;

/**
 * Method for setting/querying model fields
 *
 * Note: If a field is date/time then UTC string should be passed
 *       It will be converted to local time zone Moment.js instance
 *
 * @param {object} [model]      New value
 * @return {object}             Current value
 */
TokenModel.prototype.data = function (model) {
    if (typeof model == 'undefined') {
        model = {
            id: this.id,
            user_id: this.user_id,
            payload: this.payload,
            ip_address: this.ip_address,
            created_at: this.created_at.tz('UTC').format(BaseModel.DATETIME_FORMAT), // return in UTC
            updated_at: this.updated_at.tz('UTC').format(BaseModel.DATETIME_FORMAT),
        };
    } else {
        var utcCreated = moment(model.created_at); // db field is in UTC
        var utcUpdated = moment(model.updated_at);

        this.id = model.id;
        this.user_id = model.user_id;
        this.payload = model.payload;
        this.ip_address = model.ip_address;
        this.created_at = moment.tz(utcCreated.format(BaseModel.DATETIME_FORMAT), 'UTC').local();
        this.updated_at = moment.tz(utcUpdated.format(BaseModel.DATETIME_FORMAT), 'UTC').local();
    }

    return model;
};

/**
 * ID setter
 *
 * @param {integer} id      New ID
 * @return {object}         Returns self
 */
TokenModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

/**
 * ID getter
 *
 * @return {integer}        Returns current ID
 */
TokenModel.prototype.getId = function () {
    return this.field('id');
};

/**
 * User ID setter
 *
 * @param {integer} userId  New user ID
 * @return {object}         Returns self
 */
TokenModel.prototype.setUserId = function (userId) {
    this.field('user_id', userId);
    return this;
};

/**
 * User ID getter
 *
 * @return {integer}        Returns current user ID
 */
TokenModel.prototype.getUserId = function () {
    return this.field('user_id');
};

/**
 * Payload setter
 *
 * @param {object}          New payload object
 * @return {object}         Returns self
 */
TokenModel.prototype.setPayload = function (payload) {
    this.field('payload', payload);
    return this;
};

/**
 * Payload getter
 *
 * @return {object}         Returns current payload object
 */
TokenModel.prototype.getPayload = function () {
    return this.field('payload');
};

/**
 * IP address setter
 *
 * @param {string} ipAddress    New IP address
 * @return {object}             Returns self
 */
TokenModel.prototype.setIpAddress = function (ipAddress) {
    this.field('ip_address', ipAddress);
    return this;
};

/**
 * IP address getter
 *
 * @return {string}         Returns current IP address
 */
TokenModel.prototype.getIpAddress = function () {
    return this.field('ip_address');
};

/**
 * Creation date setter
 *
 * @param {object} createdAt    New creation date (Moment.js)
 * @return {object}             Returns self
 */
TokenModel.prototype.setCreatedAt = function (createdAt) {
    this.field('created_at', createdAt);
    return this;
};

/**
 * Creation date getter
 *
 * @return {object}         Returns current creation date (Moment.js)
 */
TokenModel.prototype.getCreatedAt = function () {
    return this.field('created_at');
};

/**
 * Last update date setter
 *
 * @param {object} updatedAt    New last update date (Moment.js)
 * @return {object}             Returns self
 */
TokenModel.prototype.setUpdatedAt = function (updatedAt) {
    this.field('updated_at', updatedAt);
    return this;
};

/**
 * Last update date getter
 *
 * @return {object}         Returns last update date (Moment.js)
 */
TokenModel.prototype.getUpdatedAt = function () {
    return this.field('updated_at');
};

module.exports = TokenModel;
