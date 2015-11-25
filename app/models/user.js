/**
 * User model
 */

'use strict'

var locator = require('node-service-locator');
var bcrypt = require('bcrypt');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = locator.get('base-model');

function UserModel(model) {
    this.id = null;
    this.name = null;
    this.email = null;
    this.password = null;
    this.created_at = moment();

    BaseModel.call(this, model);
}

UserModel.prototype = new BaseModel();
UserModel.prototype.constructor = UserModel;

UserModel.encryptPassword = function (password) {
    var salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
};

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

UserModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

UserModel.prototype.getId = function () {
    return this.field('id');
};

UserModel.prototype.setName = function (name) {
    this.field('name', name);
    return this;
};

UserModel.prototype.getName = function () {
    return this.field('name');
};

UserModel.prototype.setEmail = function (email) {
    this.field('email', email);
    return this;
};

UserModel.prototype.getEmail = function () {
    return this.field('email');
};

UserModel.prototype.setPassword = function (password) {
    this.field('password', password);
    return this;
};

UserModel.prototype.getPassword = function () {
    return this.field('password');
};

UserModel.prototype.checkPassword = function (password) {
    return bcrypt.compareSync(password, this.getPassword());
};

UserModel.prototype.setCreatedAt = function (createdAt) {
    this.field('created_at', createdAt);
    return this;
};

UserModel.prototype.getCreatedAt = function () {
    return this.field('created_at');
};

module.exports = UserModel;
