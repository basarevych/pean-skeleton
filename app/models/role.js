/**
 * Role model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = locator.get('base-model');

/**
 * Role model class
 *
 * @constructor
 * @param {object} model    DB row used as source for this instance
 */
function RoleModel(model) {
    this.id = null;
    this.parent_id = null;
    this.handle = null;     // Unique text ID

    BaseModel.call(this, model);
};

RoleModel.prototype = new BaseModel();
RoleModel.prototype.constructor = RoleModel;

/**
 * Method for setting/querying model fields
 *
 * @param {object} [model]      New value
 * @return {object}             Current value
 */
RoleModel.prototype.data = function (model) {
    if (typeof model == 'undefined') {
        model = {
            id: this.id,
            parent_id: this.parent_id,
            handle: this.handle,
        };
    } else {
        this.id = model.id;
        this.parent_id = model.parent_id;
        this.handle = model.handle;
    }

    return model;
};

/**
 * ID setter
 *
 * @param {integer} id      New ID
 * @return {object}         Returns self
 */
RoleModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

/**
 * ID getter
 *
 * @return {integer}        Returns current ID
 */
RoleModel.prototype.getId = function () {
    return this.field('id');
};

/**
 * Parent ID setter
 *
 * @param {integer} parentId    New parent ID
 * @return {object}             Returns self
 */
RoleModel.prototype.setParentId = function (parentId) {
    this.field('parent_id', parentId);
    return this;
};

/**
 * Parent ID getter
 *
 * @return {integer}        Returns curent parent ID
 */
RoleModel.prototype.getParentId = function () {
    return this.field('parent_id');
};

/**
 * Handle setter
 *
 * @param {string} handle   New handle
 * @return {object}         Returns self
 */
RoleModel.prototype.setHandle = function (handle) {
    this.field('handle', handle);
    return this;
};

/**
 * Handle getter
 *
 * @return {string}
 */
RoleModel.prototype.getHandle = function () {
    return this.field('handle');
};

module.exports = RoleModel;
