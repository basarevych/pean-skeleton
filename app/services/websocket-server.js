/**
 * Web socket Server
 */

'use strict';

var locator = require('node-service-locator');

function WebSocketServer() {
    this.server = null;
};

WebSocketServer.prototype.setServer = function (server) {
    this.server = server;
    return this;
};

WebSocketServer.prototype.getServer = function () {
    return this.server;
};

WebSocketServer.prototype.start = function () {
    var logger = locator.get('logger');
    var httpServer = locator.get('http-server');
    var server = httpServer.getServer();
    this.setServer(require('socket.io')(server));

    this.server.on('connection', this.onConnection);

    var me = this;
    var notificationRepo = locator.get('notification-repository');
    var subscriber = notificationRepo.getRedis();
    subscriber.on("message", function (channel, message) {
        switch (channel) {
            case process.env.PROJECT + ":notifications":
                notificationRepo.find(message)
                    .then(function (notifications) {
                        var notification = notifications.length && notifications[0];
                        var params = {
                            text: notification.getText(),
                            variables: notification.getVariables()
                        };
                        if (notification.getTitle())
                            params['title'] = notification.getTitle();
                        if (notification.getIcon())
                            params['icon'] = notification.getIcon();
                        me.server.emit('notification', params);
                    })
                    .catch(function (err) {
                        logger.error('WebSocketServer.start() - notificationRepo.find', err);
                    });
                break;
        }
    });
    subscriber.subscribe(process.env.PROJECT + ":notifications");
};

WebSocketServer.prototype.onConnection = function (socket) {
    console.log("[WebSocket] Connected " + socket.id);
};

module.exports = WebSocketServer;
