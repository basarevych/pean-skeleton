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

/**
 * Notification repository
 *
 * @constructor
 */
function NotificationRepository() {
    BaseRepository.call(this);
}

NotificationRepository.prototype = new BaseRepository();
NotificationRepository.prototype.constructor = NotificationRepository;

/**
 * Find a notification by ID
 *
 * @param {integer} id      ID to search by
 * @return {object}         Returns promise resolving to array of models
 */
NotificationRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var redis = this.getRedis();
    redis.hgetall(process.env.PROJECT + ":notification:" + id, function (err, reply) {
        if (err) {
            redis.quit();
            return defer.reject([ 'NotificationRepository.find() - get notification', err ]);
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

/**
 * Save notification model
 *
 * @param {object} notification The notification to save
 * @return {object}             Returns promise resolving to notification ID or null on failure
 */
NotificationRepository.prototype.save = function (notification) {
    var logger = locator.get('logger');
    var defer = q.defer();

    if (!notification.getId())
        notification.setId(notification.generateUuid());

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
            redis.quit();
            return defer.reject([ 'NotificationRepository.save() - save notification', err ]);
        }

        redis.expire(name, NotificationModel.NOTIFICATION_TTL, function (err, reply) {
            if (err) {
                redis.quit();
                return defer.reject([ 'NotificationRepository.save() - expire', err ]);
            }

            redis.publish(process.env.PROJECT + ":notifications", notification.getId(), function (err, reply) {
                if (err) {
                    redis.quit();
                    return defer.reject([ 'NotificationRepository.save() - publish', err ]);
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
