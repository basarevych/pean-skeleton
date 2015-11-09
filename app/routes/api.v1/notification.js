/**
 * Notification route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var moment = require('moment-timezone');
var q = require('q');
var NotificationModel = locator.get('notification-model');
var JobModel = locator.get('job-model');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');
    var logger = locator.get('logger');

    router.post('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'notification', 'create')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var text = validator.trim(req.body.text);
                var title = validator.trim(req.body.title);
                var icon = validator.trim(req.body.icon);
                var variables = req.body.variables;
                var userId = validator.trim(req.body.user_id);
                var roleId = validator.trim(req.body.role_id);

                if (!text.length || typeof variables != "object")
                    return res.json({ success: false });

                var notification = new NotificationModel();
                notification.setText(text);
                if (title.length)
                    notification.setTitle(title);
                if (icon.length)
                    notification.setIcon(icon);
                notification.setVariables(variables);
                if (userId.length)
                    notification.setUserId(userId);
                if (roleId.length)
                    notification.setRoleId(roleId);

                var promise;
                if (req.body.scheduled_for === null) {
                    var notificationRepo = locator.get('notification-repository');
                    promise = notificationRepo.save(notification);
                } else {
                    var job = new JobModel();
                    job.setName('notify');
                    job.setStatus('created');
                    job.setCreatedAt(moment());
                    job.setScheduledFor(moment.unix(req.body.scheduled_for));
                    job.setValidUntil(moment.unix(req.body.scheduled_for).add(1, 'minutes'));
                    job.setInputData(notification.data())
                    job.setOutputData({});

                    var jobRepo = locator.get('job-repository');
                    promise = jobRepo.save(job)
                }

                promise
                    .then(function (id) {
                        res.json({ success: id !== null });
                    })
                    .catch(function (err) {
                        logger.error('POST /v1/notification failed', err);
                        app.abort(res, 500, 'POST /v1/notification failed');
                    });
            })
            .catch(function (err) {
                logger.error('POST /v1/notification failed', err);
                app.abort(res, 500, 'POST /v1/notification failed');
            });
    });

    app.use('/v1/notification', router);
};
