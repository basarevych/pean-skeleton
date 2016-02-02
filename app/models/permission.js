/**
 * Permission model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = locator.get('base-model');

/**
 * Permission model class
 *
 * @constructor
 * @param {object} model    DB row used as source for this instance
 */
function PermissionModel(model) {
    this.id = null;
    this.role_id = null;
    this.resource = null;
    this.action = null;

    BaseModel.call(this, model);
}

PermissionModel.prototype = new BaseModel();
PermissionModel.prototype.constructor = PermissionModel;

/**
 * Method for setting/querying model fields
 *
 * Note: If a field is date/time then UTC string should be passed
 *       It will be converted to local time zone Moment.js instance
 *
 * @param {object} [model]      New value
 * @return {object}             Current value
 */
PermissionModel.prototype.data = function (model) {
    if (typeof model == 'undefined') {
        model = {
            id: this.id,
            role_id: this.role_id,
            resource: this.resource,
            action: this.action,
        };
    } else {
        this.id = model.id;
        this.role_id = model.role_id;
        this.resource = model.resource;
        this.action = model.action;
    }

    return model;
};

/**
 * ID setter
 *
 * @param {integer} id      New ID
 * @return {object}         Returns self
 */
PermissionModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

/**
 * ID getter
 *
 * @return {integer}        Returns current ID
 */
PermissionModel.prototype.getId = function () {
    return this.field('id');
};

/**
 * Role ID setter
 *
 * @param {integer} roleId  New role ID
 * @return {object}         Returns self
 */
PermissionModel.prototype.setRoleId = function (roleId) {
    this.field('role_id', roleId);
    return this;
};

/**
 * Role ID getter
 *
 * @return {integer}        Returns curent role ID
 */
PermissionModel.prototype.getRoleId = function () {
    return this.field('role_id');
};

/**
 * Resource setter
 *
 * @param {string} resource New resource
 * @return {object}         Returns self
 */
PermissionModel.prototype.setResource = function (resource) {
    this.field('resource', resource);
    return this;
};

/**
 * Resource getter
 *
 * @return {integer}        Returns current resource
 */
PermissionModel.prototype.getResource = function () {
    return this.field('resource');
};

/**
 * Action setter
 *
 * @param {string} action   New action
 * @return {object}         Returns self
 */
PermissionModel.prototype.setAction = function (action) {
    this.field('action', action);
    return this;
};

/**
 * Action getter
 *
 * @return {string}         Returns current action
 */
PermissionModel.prototype.getAction = function () {
    return this.field('action');
};

module.exports = PermissionModel;
