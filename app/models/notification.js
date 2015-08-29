/**
 * Notification model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var uuid = require('uuid');
var BaseModel = require('./base');

function NotificationModel() {
    this.id = uuid.v1();
    this.text = "";
    this.title = null;
    this.icon = null;
    this.variables = "{}";
};

NotificationModel.prototype = new BaseModel();
NotificationModel.prototype.constructor = NotificationModel;

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

NotificationModel.prototype.save = function (evenIfNotDirty) {
    var logger = locator.get('logger');
    var repo = locator.get('notification-repository');
    var defer = q.defer();

    if (this.getId() && !this._dirty && evenIfNotDirty !== true) {
        defer.resolve(this.getId());
        return defer.promise;
    }

    var name = process.env.PROJECT + ":notification:" + this.getId();
    var value = { text: this.getText(), variables: this.getVariables() };
    if (this.getTitle())
        value['title'] = this.getTitle();
    if (this.getIcon())
        value['icon'] = this.getIcon();

    var me = this;
    var redis = repo.getRedis();
    redis.hmset(name, value, function (err, reply) {
        if (err) {
            defer.reject();
            logger.error('NotificationModel.save() - hmset', err);
            process.exit(1);
        }

        redis.expire(name, 60, function (err, reply) {
            if (err) {
                defer.reject();
                logger.error('NotificationModel.save() - expire', err);
                process.exit(1);
            }

            redis.publish(process.env.PROJECT + ":notifications", me.getId(), function (err, reply) {
                if (err) {
                    defer.reject();
                    logger.error('NotificationModel.save() - publish', err);
                    process.exit(1);
                }

                redis.quit();
                defer.resolve(me.getId());
            });
        });
    });

    return defer.promise;
};

module.exports = NotificationModel;
