/**
 * Send and receive web-interface notifications
 */

'use strict'

var locator = require('node-service-locator');
var validator = require('validator');
var moment = require('moment-timezone');
var q = require('q');
var clone = require('clone');
var NotificationModel = locator.get('notification-model');
var JobModel = locator.get('job-model');

module.exports = function (server) {
    var logger = locator.get('logger');

    /**
     * Send the notification via websocket
     *
     * @param {object} notification     Notification model
     */
    function sendNotification(notification) {
        var params = {
            text: notification.getText(),
            variables: notification.getVariables()
        };
        if (notification.getTitle())
            params['title'] = notification.getTitle();
        if (notification.getIcon())
            params['icon'] = notification.getIcon();

        if (notification.getUserId()) {
            var sessions = server.getSessions();
            for (var socketId in sessions) {
                var session = sessions[socketId];
                if (session.user && session.user.getId() == notification.getUserId()) {
                    switch (session.type) {
                        case 'http':
                            if (server.getHttpServer())
                                server.getHttpServer().to(socketId).emit('notification', params);
                            break;
                        case 'https':
                            if (server.getHttpsServer())
                                server.getHttpsServer().to(socketId).emit('notification', params);
                            break;
                    }
                }
            }
        } else if (notification.getRoleId()) {
            var userRepo = locator.get('user-repository');
            userRepo.findByRoleId(notification.getRoleId())
                .then(function (users) {
                    users.forEach(function (user) {
                        var sessions = server.getSessions();
                        for (var socketId in sessions) {
                            var session = sessions[socketId];
                            if (session.user && session.user.getId() == user.getId()) {
                                switch (session.type) {
                                    case 'http':
                                        if (server.getHttpServer())
                                            server.getHttpServer().to(socketId).emit('notification', params);
                                        break;
                                    case 'https':
                                        if (server.getHttpsServer())
                                            server.getHttpsServer().to(socketId).emit('notification', params);
                                        break;
                                }
                            }
                        }
                    });
                })
                .catch(function (err) {
                    logger.error('sendNotification() failed', err);
                });
        } else {
            if (server.getHttpServer())
                server.getHttpServer().emit('notification', params);
            if (server.getHttpsServer())
                server.getHttpsServer().emit('notification', params);
        }
    }

    // Incoming websocket message 'notification'
    server.on('notification', function (socket, data) {
        var session = server.getSession(socket.id);
        if (!session.user)
            return;             // anonymous

        var acl = locator.get('acl');
        acl.isAllowed(session.user, 'notification', 'create')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return;     // ACL denied

                var text = validator.trim(data.text);
                var title = validator.trim(data.title);
                var icon = validator.trim(data.icon);
                if (!text.length)
                    return;

                var variables = data.variables;
                if (typeof variables != 'object' || variables === null)
                    return;

                var userId = validator.trim(data.user_id);
                if (userId.length) {
                    if (!validator.isInt(userId))
                        return;
                    userId = parseInt(userId);
                } else {
                    userId = null;
                }

                var roleId = validator.trim(data.role_id);
                if (roleId.length) {
                    if (!validator.isInt(roleId))
                        return;
                    roleId = parseInt(roleId);
                } else {
                    roleId = null;
                }

                var notification = new NotificationModel();
                notification.setText(text);
                if (title.length)
                    notification.setTitle(title);
                if (icon.length)
                    notification.setIcon(icon);
                notification.setVariables(variables);
                notification.setUserId(userId);
                notification.setRoleId(roleId);

                var scheduledFor = validator.trim(data.scheduled_for);
                if (scheduledFor.length) {
                    scheduledFor = moment.unix(scheduledFor);
                    if (!scheduledFor.isValid())
                        return;

                    var job = new JobModel();
                    job.setName('notify');
                    job.setStatus('created');
                    job.setCreatedAt(moment());
                    job.setScheduledFor(scheduledFor);
                    job.setValidUntil(clone(scheduledFor).add(5, 'minutes'));
                    job.setInputData(notification.data())
                    job.setOutputData({});

                    var jobRepo = locator.get('job-repository');
                    return jobRepo.save(job)
                } else {
                    sendNotification(notification);
                }
            })
            .catch(function (err) {
                logger.error('Incoming notification failed', err);
            });
    });

    // Subscribe to Redis broadcast of new notifications
    var notificationRepo = locator.get('notification-repository');
    var subscriber = notificationRepo.getRedis();
    subscriber.subscribe(process.env.PROJECT + ":notifications");
    subscriber.on("message", function (channel, message) {
        if (channel != process.env.PROJECT + ":notifications")
            return;

        notificationRepo.find(message)
            .then(function (notifications) {
                var notification = notifications.length && notifications[0];
                if (notification)
                    sendNotification(notification);
            })
            .catch(function (err) {
                logger.error('Redis notification', err);
            });
    });
};
