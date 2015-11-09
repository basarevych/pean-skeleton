/**
 * Notification model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var uuid = require('uuid');
var BaseModel = require('./base');
var BaseModel = locator.get('base-model');

function NotificationModel(model) {
    this.id = uuid.v1();
    this.text = "";
    this.title = null;
    this.icon = null;
    this.variables = {};
    this.user_id = null;
    this.role_id = null;

    BaseModel.call(this, model);
};

NotificationModel.prototype = new BaseModel();
NotificationModel.prototype.constructor = NotificationModel;

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
