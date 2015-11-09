/**
 * Permission model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var BaseModel = require('./base');

function PermissionModel(model) {
    this.id = null;
    this.role_id = null;
    this.resource = null;
    this.action = null;

    BaseModel.call(this, model);
}

PermissionModel.prototype = new BaseModel();
PermissionModel.prototype.constructor = PermissionModel;

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


PermissionModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

PermissionModel.prototype.getId = function () {
    return this.field('id');
};

PermissionModel.prototype.setRoleId = function (id) {
    this.field('role_id', id);
    return this;
};

PermissionModel.prototype.getRoleId = function () {
    return this.field('role_id');
};

PermissionModel.prototype.setResource = function (resource) {
    this.field('resource', resource);
    return this;
};

PermissionModel.prototype.getResource = function () {
    return this.field('resource');
};

PermissionModel.prototype.setAction = function (action) {
    this.field('action', action);
    return this;
};

PermissionModel.prototype.getAction = function () {
    return this.field('action');
};

module.exports = PermissionModel;
