/**
 * Web socket Server
 */

'use strict';

var locator = require('node-service-locator');
var jwt = require('jsonwebtoken');

function WebSocketServer() {
    this.server = null;
    this.clients = {};
};

WebSocketServer.prototype.setServer = function (server) {
    this.server = server;
    return this;
};

WebSocketServer.prototype.getServer = function () {
    return this.server;
};

WebSocketServer.prototype.setClients = function (clients) {
    this.clients = clients;
    return this;
};

WebSocketServer.prototype.getClients = function () {
    return this.clients;
}

WebSocketServer.prototype.start = function () {
    var me = this;
    var logger = locator.get('logger');
    var httpServer = locator.get('http-server').getServer();
    this.setServer(require('socket.io')(httpServer));

    this.server.on('connect', function (socket) { me.onConnect(socket); });

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

                        if (notification.getUserId()) {
                            for (var socketId in me.clients) {
                                var userId = me.clients[socketId];
                                if (userId == notification.getUserId())
                                    me.server.to(socketId).emit('notification', params);
                            }
                        } else {
                            me.server.emit('notification', params);
                        }
                    })
                    .catch(function (err) {
                        logger.error('WebSocketServer.start() - notificationRepo.find', err);
                    });
                break;
        }
    });
    subscriber.subscribe(process.env.PROJECT + ":notifications");
};

WebSocketServer.prototype.onConnect = function (socket) {
    var me = this;
    console.log("[WebSocket] Connected " + socket.id);
    socket.on('disconnect', function () { me.onDisconnect(socket); });
    socket.on('token', function (data) { me.onToken(socket, data); });
};

WebSocketServer.prototype.onDisconnect = function (socket) {
    console.log("[WebSocket] Disconnected " + socket.id);
    this.clients[socket.id] = null;
};

WebSocketServer.prototype.onToken = function (socket, data) {
    var config = locator.get('config');

    var me = this;
    jwt.verify(data, config['jwt']['secret'], function (err, payload) {
        if (err || !payload)
            return;

         me.clients[socket.id] = payload.user_id;
    });
};

module.exports = WebSocketServer;
