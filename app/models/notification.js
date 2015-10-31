/**
 * Notification model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var uuid = require('uuid');
var BaseModel = require('./base');

function NotificationModel() {
    this.id = uuid.v1();
    this.text = "";
    this.title = null;
    this.icon = null;
    this.variables = "{}";
    this.user_id = null;
    this.role_id = null;
};

NotificationModel.prototype = new BaseModel();
NotificationModel.prototype.constructor = NotificationModel;

NotificationModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

NotificationModel.prototype.getId = function () {
    return this.field('id');
};

NotificationModel.prototype.setText = function (text) {
    this.field('text', text);
    return this;
};

NotificationModel.prototype.getText = function () {
    return this.field('text');
};

NotificationModel.prototype.setTitle = function (title) {
    this.field('title', title);
    return this;
};

NotificationModel.prototype.getTitle = function () {
    return this.field('title');
};

NotificationModel.prototype.setIcon = function (icon) {
    this.field('icon', icon);
    return this;
};

NotificationModel.prototype.getIcon = function () {
    return this.field('icon');
};

NotificationModel.prototype.setVariables = function (variables) {
    this.field('variables', variables);
    return this;
};

NotificationModel.prototype.getVariables = function () {
    return this.field('variables');
};

NotificationModel.prototype.setUserId = function (userId) {
    this.field('user_id', userId);
    return this;
};

NotificationModel.prototype.getUserId = function () {
    return this.field('user_id');
};

NotificationModel.prototype.setRoleId = function (roleId) {
    this.field('role_id', roleId);
    return this;
};

NotificationModel.prototype.getRoleId = function () {
    return this.field('role_id');
};

module.exports = NotificationModel;
