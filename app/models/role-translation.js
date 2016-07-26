/**
 * Role translation model
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = locator.get('base-model');

/**
 * Role translation model class
 *
 * @constructor
 * @param {object} model    DB row used as source for this instance
 */
function RoleTranslationModel(model) {
    this.id = null;
    this.role_id = null;
    this.locale = null;     // Two letter code
    this.title = null;      // The translation

    BaseModel.call(this, model);
}

RoleTranslationModel.prototype = new BaseModel();
RoleTranslationModel.prototype.constructor = RoleTranslationModel;

/**
 * Method for setting/querying model fields
 *
 * Note: If a field is date/time then UTC string should be passed
 *       It will be converted to local time zone Moment.js instance
 *
 * @param {object} [model]      New value
 * @return {object}             Current value
 */
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

/**
 * ID setter
 *
 * @param {integer} id      New ID
 * @return {object}         Returns self
 */
RoleTranslationModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

/**
 * ID getter
 *
 * @return {integer}        Returns current ID
 */
RoleTranslationModel.prototype.getId = function () {
    return this.field('id');
};

/**
 * Role ID setter
 *
 * @param {integer} roleId  New role ID
 * @return {object}         Returns self
 */
RoleTranslationModel.prototype.setRoleId = function (roleId) {
    this.field('role_id', roleId);
    return this;
};

/**
 * Role ID getter
 *
 * @return {integer}        Returns current role ID
 */
RoleTranslationModel.prototype.getRoleId = function () {
    return this.field('role_id');
};

/**
 * Locale setter
 *
 * @param {string} locale   New locale
 * @return {object}         Returns self
 */
RoleTranslationModel.prototype.setLocale = function (locale) {
    this.field('locale', locale);
    return this;
};

/**
 * Locale getter
 *
 * @return {string}         Returns current locale
 */
RoleTranslationModel.prototype.getLocale = function () {
    return this.field('locale');
};

/**
 * Title setter
 *
 * @param {string} title    New title
 * @return {object}         Returns self
 */
RoleTranslationModel.prototype.setTitle = function (title) {
    this.field('title', title);
    return this;
};

/**
 * Title getter
 *
 * @return {string}         Returns current title
 */
RoleTranslationModel.prototype.getTitle = function () {
    return this.field('title');
};

module.exports = RoleTranslationModel;
