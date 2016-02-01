/**
 * Notification model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = locator.get('base-model');

/**
 * Notification model class
 *
 * @constructor
 * @param {object} model    DB row used as source for this instance
 */
function NotificationModel(model) {
    this.id = null;
    this.text = "";         // Notification text is: glMessage(model.text, model.variables)
    this.title = null;      // Notification title is: glMessage(model.title, model.variables)
    this.icon = null;       // Notification icon class is: glMessage(model.icon, model.variables)
    this.variables = {};
    this.user_id = null;    // If set this user will get the notification
    this.role_id = null;    // Or else if role_id is set then all the users of this role will get it

    BaseModel.call(this, model);
};

NotificationModel.prototype = new BaseModel();
NotificationModel.prototype.constructor = NotificationModel;

/**
 * Method for setting/querying model fields
 *
 * @param {object} [model]      New value
 * @return {object}             Current value
 */
NotificationModel.prototype.data = function (model) {
    if (typeof model == 'undefined') {
        model = {
            id: this.id,
            text: this.text,
            title: this.title,
            icon: this.icon,
            variables: this.variables,
            user_id: this.user_id,
            role_id: this.role_id,
        };
    } else {
        this.id = model.id;
        this.text = model.text;
        this.title = model.title;
        this.icon = model.icon;
        this.variables = model.variables;
        this.user_id = model.user_id;
        this.role_id = model.role_id;
    }

    return model;
};

/**
 * ID setter
 *
 * @param {integer} id      New ID
 * @return {object}         Returns self
 */
NotificationModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

/**
 * ID getter
 *
 * @return {integer}        Returns current ID
 */
NotificationModel.prototype.getId = function () {
    return this.field('id');
};

/**
 * Text setter
 *
 * @param {string} text     New text
 * @return {object}         Returns self
 */
NotificationModel.prototype.setText = function (text) {
    this.field('text', text);
    return this;
};

/**
 * Text getter
 *
 * @return {string}         Returns current text
 */
NotificationModel.prototype.getText = function () {
    return this.field('text');
};

/**
 * Title setter
 *
 * @param {string} title    New title
 * @return {object}         Returns self
 */
NotificationModel.prototype.setTitle = function (title) {
    this.field('title', title);
    return this;
};

/**
 * Title getter
 *
 * @return {string}         Returns current title
 */
NotificationModel.prototype.getTitle = function () {
    return this.field('title');
};

/**
 * Icon class setter
 *
 * @param {string} icon     New icon class
 * @return {object}         Returns self
 */
NotificationModel.prototype.setIcon = function (icon) {
    this.field('icon', icon);
    return this;
};

/**
 * Icon class getter
 *
 * @return {srting}         Returns current icon class
 */
NotificationModel.prototype.getIcon = function () {
    return this.field('icon');
};

/**
 * Variables param setter
 *
 * @param {object} variables    New vairables object
 * @return {object}             Returns self
 */
NotificationModel.prototype.setVariables = function (variables) {
    this.field('variables', variables);
    return this;
};

/**
 * Variables param getter
 *
 * @return {object}         Returns variables object
 */
NotificationModel.prototype.getVariables = function () {
    return this.field('variables');
};

/**
 * User ID setter
 *
 * @param {integer} userId  New user ID
 * @return {object}         Returns self
 */
NotificationModel.prototype.setUserId = function (userId) {
    this.field('user_id', userId);
    return this;
};

/**
 * User ID getter
 *
 * @return {integer}        Returns current user ID
 */
NotificationModel.prototype.getUserId = function () {
    return this.field('user_id');
};

/**
 * Role ID setter
 *
 * @param {integer} roleId  New role ID
 * @return {object}         Returns self
 */
NotificationModel.prototype.setRoleId = function (roleId) {
    this.field('role_id', roleId);
    return this;
};

/**
 * Role ID getter
 *
 * @return {integer}        Returns current role ID
 */
NotificationModel.prototype.getRoleId = function () {
    return this.field('role_id');
};

module.exports = NotificationModel;
