/**
 * User model
 */

'use strict'

var bcrypt = require('bcrypt');

function User(dbRow) {
    this.name = null;
    this.email = null;
    this.password = null;
    this.created_at = new Date();
    this.is_admin = false;

    if (dbRow) {
        this.setId(dbRow.id);
        this.setName(dbRow.name);
        this.setEmail(dbRow.email);
        this.setPassword(dbRow.password);
        this.setCreatedAt(dbRow.created_at);
        this.setIsAdmin(dbRow.is_admin);
    }
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

User.prototype.setName = function (name) {
    this.name = name;
};

User.prototype.getName = function () {
    return this.name;
};

User.prototype.setEmail = function (email) {
    this.email = email;
};

User.prototype.getEmail = function () {
    return this.email;
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

User.prototype.setCreatedAt = function (createdAt) {
    this.created_at = createdAt;
};

User.prototype.getCreatedAt = function () {
    return this.created_at;
};

User.prototype.setIsAdmin = function (isAdmin) {
    this.is_admin = isAdmin;
};

User.prototype.getIsAdmin = function () {
    return this.is_admin;
};

module.exports = User;
