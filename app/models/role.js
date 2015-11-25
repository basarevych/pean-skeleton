/**
 * Role model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = locator.get('base-model');

function RoleModel(model) {
    this.id = null;
    this.parent_id = null;
    this.handle = null;

    BaseModel.call(this, model);
};

RoleModel.prototype = new BaseModel();
RoleModel.prototype.constructor = RoleModel;

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

RoleModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

RoleModel.prototype.getId = function () {
    return this.field('id');
};

RoleModel.prototype.setParentId = function (id) {
    this.field('parent_id', id);
    return this;
};

RoleModel.prototype.getParentId = function () {
    return this.field('parent_id');
};

RoleModel.prototype.setHandle = function (handle) {
    this.field('handle', handle);
    return this;
};

RoleModel.prototype.getHandle = function () {
    return this.field('handle');
};

module.exports = RoleModel;
