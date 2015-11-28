/**
 * Notification repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseRepository = locator.get('base-repository');
var BaseModel = locator.get('base-model');
var NotificationModel = locator.get('notification-model');

function NotificationRepository() {
    BaseRepository.call(this);
}

NotificationRepository.prototype = new BaseRepository();
NotificationRepository.prototype.constructor = NotificationRepository;

NotificationRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var redis = this.getRedis();
    redis.hgetall(process.env.PROJECT + ":notification:" + id, function (err, reply) {
        if (err) {
            defer.reject();
            logger.error('NotificationRepository.find() - hgetall', err);
            process.exit(1);
        }

        redis.quit();

        var notification = new NotificationModel();
        notification.setId(reply['id']);
        notification.setText(reply['text']);
        if (reply['title'])
            notification.setTitle(reply['title']);
        if (reply['icon'])
            notification.setIcon(reply['icon']);
        try {
            notification.setVariables(JSON.parse(reply['variables']));
        } catch (e) {
            // do nothing
        }
        if (reply['user_id'])
            notification.setUserId(reply['user_id']);
        if (reply['role_id'])
            notification.setRoleId(reply['role_id']);

        notification.dirty(false);
        defer.resolve([ notification ]);
    });

    return defer.promise;
};

NotificationRepository.prototype.save = function (notification) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var name = process.env.PROJECT + ":notification:" + notification.getId();
    var value = { text: notification.getText(), variables: JSON.stringify(notification.getVariables()) };
    if (notification.getTitle())
        value['title'] = notification.getTitle();
    if (notification.getIcon())
        value['icon'] = notification.getIcon();
    if (notification.getUserId())
        value['user_id'] = notification.getUserId();
    if (notification.getRoleId())
        value['role_id'] = notification.getRoleId();

    var redis = this.getRedis();
    redis.hmset(name, value, function (err, reply) {
        if (err) {
            defer.reject();
            logger.error('NotificationRepository.save() - hmset', err);
            process.exit(1);
        }

        redis.expire(name, 60, function (err, reply) {
            if (err) {
                defer.reject();
                logger.error('NotificationRepository.save() - expire', err);
                process.exit(1);
            }

            redis.publish(process.env.PROJECT + ":notifications", notification.getId(), function (err, reply) {
                if (err) {
                    defer.reject();
                    logger.error('NotificationRepository.save() - publish', err);
                    process.exit(1);
                }

                redis.quit();
                notification.dirty(false);
                defer.resolve(notification.getId());
            });
        });
    });

    return defer.promise;
};

module.exports = NotificationRepository;
