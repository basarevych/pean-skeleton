/**
 * Notification repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var BaseRepository = require('./base');
var NotificationModel = require('../models/notification');

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
        notification.setVariables(reply['variables']);
        if (reply['user_id'])
            notification.setUserId(reply['user_id']);
        if (reply['role_id'])
            notification.setRoleId(reply['role_id']);

        notification.dirty(false);
        defer.resolve([ notification ]);
    });

    return defer.promise;
};

module.exports = NotificationRepository;
