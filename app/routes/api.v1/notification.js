/**
 * Notification route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var q = require('q');
var NotificationModel = require('../../models/notification');

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

                if (!text.length || typeof variables != "object")
                    return res.json({ success: false });

                var notification = new NotificationModel();
                notification.setText(text);
                if (title.length)
                    notification.setTitle(title);
                if (icon.length)
                    notification.setIcon(icon);
                notification.setVariables(JSON.stringify(variables));
                if (userId.length)
                    notification.setUserId(userId);

                notification.save()
                    .then(function (userId) {
                        res.json({ success: true });
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
