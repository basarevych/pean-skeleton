/**
 * User model
 */

'use strict'

var bcrypt = require('bcrypt');

function User() {
    this.login = null;
    this.password = null;
    this.email = null;
    this.is_admin = false;
    this.created_at = new Date();
};

User.encryptPassword = function (password) {
    var salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
};

User.prototype.setId = function (id) {
    this.id = id;
};

User.prototype.getId = function () {
    return this.id;
};

User.prototype.setLogin = function (login) {
    this.login = login;
};

User.prototype.getLogin = function () {
    return this.login;
};

User.prototype.setPassword = function (password) {
    this.password = password;
};

User.prototype.getPassword = function () {
    return this.password;
};

User.prototype.checkPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

User.prototype.setEmail = function (email) {
    this.email = email;
};

User.prototype.getEmail = function () {
    return this.email;
};

User.prototype.setIsAdmin = function (isAdmin) {
    this.is_admin = isAdmin;
};

User.prototype.getIsAdmin = function () {
    return this.is_admin;
};

User.prototype.setCreatedAt = function (createdAt) {
    this.created_at = createdAt;
};

User.prototype.getCreatedAt = function () {
    return this.created_at;
};

module.exports = User;