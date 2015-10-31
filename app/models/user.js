/**
 * User model
 */

'use strict'

var locator = require('node-service-locator');
var bcrypt = require('bcrypt');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = require('./base');

function UserModel(dbRow) {
    this.id = null;
    this.name = null;
    this.email = null;
    this.password = null;
    this.created_at = moment();

    if (dbRow) {
        var utc = moment(dbRow.created_at); // db field is in UTC

        this.id = dbRow.id;
        this.name = dbRow.name;
        this.email = dbRow.email;
        this.password = dbRow.password;
        this.created_at = moment.tz(utc.format('YYYY-MM-DD HH:mm:ss'), 'UTC').local();
    }
};

UserModel.prototype = new BaseModel();
UserModel.prototype.constructor = UserModel;

UserModel.encryptPassword = function (password) {
    var salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
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
