/**
 * Role translation model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = locator.get('base-model');

function RoleTranslationModel(model) {
    this.id = null;
    this.role_id = null;
    this.locale = null;
    this.title = null;

    BaseModel.call(this, model);
};

RoleTranslationModel.prototype = new BaseModel();
RoleTranslationModel.prototype.constructor = RoleTranslationModel;

RoleTranslationModel.prototype.data = function (model) {
    if (typeof model == 'undefined') {
        model = {
            id: this.id,
            role_id: this.role_id,
            locale: this.locale,
            title: this.title,
        };
    } else {
        this.id = model.id;
        this.role_id = model.role_id;
        this.locale = model.locale;
        this.title = model.title;
    }

    return model;
};

RoleTranslationModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

RoleTranslationModel.prototype.getId = function () {
    return this.field('id');
};

RoleTranslationModel.prototype.setRoleId = function (id) {
    this.field('role_id', id);
    return this;
};

RoleTranslationModel.prototype.getRoleId = function () {
    return this.field('role_id');
};

RoleTranslationModel.prototype.setLocale = function (locale) {
    this.field('locale', locale);
    return this;
};

RoleTranslationModel.prototype.getLocale = function () {
    return this.field('locale');
};

RoleTranslationModel.prototype.setTitle = function (title) {
    this.field('title', title);
    return this;
};

RoleTranslationModel.prototype.getTitle = function () {
    return this.field('title');
};

module.exports = RoleTranslationModel;
