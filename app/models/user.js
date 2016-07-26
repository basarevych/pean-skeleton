/**
 * User model
 */

'use strict';

var locator = require('node-service-locator');
var bcrypt = require('bcrypt');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = locator.get('base-model');

/**
 * User model class
 *
 * @constructor
 * @param {object} model    DB row used as source for this instance
 */
function UserModel(model) {
    this.id = null;
    this.name = null;               // Could be null
    this.email = null;              // Unique
    this.password = null;           // Bcrypted
    this.created_at = moment();

    BaseModel.call(this, model);
}

UserModel.prototype = new BaseModel();
UserModel.prototype.constructor = UserModel;

/**
 * Create hash of a password
 *
 * @param {string} password     The password
 * @return {string}             Returns the hash
 */
UserModel.encryptPassword = function (password) {
    var salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
};

/**
 * Method for setting/querying model fields
 *
 * Note: If a field is date/time then UTC string should be passed
 *       It will be converted to local time zone Moment.js instance
 *
 * @param {object} [model]      New value
 * @return {object}             Current value
 */
UserModel.prototype.data = function (model) {
    if (typeof model == 'undefined') {
        model = {
            id: this.id,
            name: this.name,
            email: this.email,
            password: this.password,
            created_at: this.created_at.tz('UTC').format(BaseModel.DATETIME_FORMAT), // return in UTC
        };
    } else {
        var utcCreated = moment(model.created_at); // db field is in UTC

        this.id = model.id;
        this.name = model.name;
        this.email = model.email;
        this.password = model.password;
        this.created_at = moment.tz(utcCreated.format(BaseModel.DATETIME_FORMAT), 'UTC').local();
    }

    return model;
};

/**
 * ID setter
 *
 * @param {integer} id      New ID
 * @return {object}         Returns self
 */
UserModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

/**
 * ID getter
 *
 * @return {integer}        Returns current ID
 */
UserModel.prototype.getId = function () {
    return this.field('id');
};

/**
 * Name setter
 *
 * @param {string|null} name    New name
 * @return {object}             Returns self
 */
UserModel.prototype.setName = function (name) {
    this.field('name', name);
    return this;
};

/**
 * Name getter
 *
 * @return {string|null}    Returns current name
 */
UserModel.prototype.getName = function () {
    return this.field('name');
};

/**
 * Email setter
 *
 * @param {string} email    New email
 * @return {object}         Returns self
 */
UserModel.prototype.setEmail = function (email) {
    this.field('email', email);
    return this;
};

/**
 * Email getter
 *
 * @return {string}         Returns current email
 */
UserModel.prototype.getEmail = function () {
    return this.field('email');
};

/**
 * Password setter
 *
 * @param {string} password New password
 * @return {object}         Returns self
 */
UserModel.prototype.setPassword = function (password) {
    this.field('password', password);
    return this;
};

/**
 * Password getter
 *
 * @return {string}         Returns current password
 */
UserModel.prototype.getPassword = function () {
    return this.field('password');
};

/**
 * Check if password matches current user
 *
 * @param {string} password Password to check
 * @return {boolean}
 */
UserModel.prototype.checkPassword = function (password) {
    return bcrypt.compareSync(password, this.getPassword());
};

/**
 * Creation date setter
 *
 * @param {object} createdAt    New creation date (Moment.js)
 * @return {object}             Returns self
 */
UserModel.prototype.setCreatedAt = function (createdAt) {
    this.field('created_at', createdAt);
    return this;
};

/**
 * Creation date getter
 *
 * @return {object}         Returns current creation date (Moment.js)
 */
UserModel.prototype.getCreatedAt = function () {
    return this.field('created_at');
};

module.exports = UserModel;
