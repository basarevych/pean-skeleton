/**
 * Web socket Server
 */

'use strict';

var locator = require('node-service-locator');
var jwt = require('jsonwebtoken');

function WebSocketServer() {
    this.httpServer = null;
    this.httpClients = {};
    this.httpsServer = null;
    this.httpsClients = {};
};

WebSocketServer.prototype.setHttpServer = function (server) {
    this.httpServer = server;
    return this;
};

WebSocketServer.prototype.getHttpServer = function () {
    return this.httpServer;
};

WebSocketServer.prototype.setHttpsServer = function (server) {
    this.httpsServer = server;
    return this;
};

WebSocketServer.prototype.getHttpsServer = function () {
    return this.httpsServer;
};

WebSocketServer.prototype.setHttpClients = function (clients) {
    this.httpClients = clients;
    return this;
};

WebSocketServer.prototype.getHttpClients = function () {
    return this.httpClients;
}

WebSocketServer.prototype.setHttpsClients = function (clients) {
    this.httpsClients = clients;
    return this;
};

WebSocketServer.prototype.getHttpsClients = function () {
    return this.httpsClients;
}

WebSocketServer.prototype.start = function () {
    var me = this;
    var logger = locator.get('logger');
    var webServer = locator.get('web-server');

    if (webServer.getHttpServer()) {
        this.setHttpServer(require('socket.io')(webServer.getHttpServer()));
        this.httpServer.on('connect', function (socket) { me.onConnect('http', socket); });
    }

    if (webServer.getHttpsServer()) {
        this.setHttpsServer(require('socket.io')(webServer.getHttpsServer()));
        this.httpsServer.on('connect', function (socket) { me.onConnect('https', socket); });
    }

    var notificationRepo = locator.get('notification-repository');
    var userRepo = locator.get('user-repository');
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
                            for (var socketId in me.httpClients) {
                                var userId = me.httpClients[socketId];
                                if (userId == notification.getUserId())
                                    me.httpServer.to(socketId).emit('notification', params);
                            }
                            for (var socketId in me.httpsClients) {
                                var userId = me.httpsClients[socketId];
                                if (userId == notification.getUserId())
                                    me.httpsServer.to(socketId).emit('notification', params);
                            }
                        } else if (notification.getRoleId()) {
                            userRepo.findByRoleId(notification.getRoleId())
                                .then(function (users) {
                                    for (var socketId in me.httpClients) {
                                        var userId = me.httpClients[socketId];
                                        users.forEach(function (user) {
                                            if (userId == user.getId())
                                                me.httpServer.to(socketId).emit('notification', params);
                                        });
                                    }
                                    for (var socketId in me.httpsClients) {
                                        var userId = me.httpsClients[socketId];
                                        users.forEach(function (user) {
                                            if (userId == user.getId())
                                                me.httpsServer.to(socketId).emit('notification', params);
                                        });
                                    }
                                })
                                .catch(function (err) {
                                    logger.error('WebSocketServer.start() - userRepo.findByRoleId', err);
                                });
                        } else {
                            if (me.httpServer)
                                me.httpServer.emit('notification', params);
                            if (me.httpsServer)
                                me.httpsServer.emit('notification', params);
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

WebSocketServer.prototype.onConnect = function (type, socket) {
    var me = this;
    console.log("[WebSocket] Connected (" + type + ") " + socket.id);
    socket.on('disconnect', function () { me.onDisconnect(type, socket); });
    socket.on('token', function (data) { me.onToken(type, socket, data); });
};

WebSocketServer.prototype.onDisconnect = function (type, socket) {
    console.log("[WebSocket] Disconnected (" + type + ") " + socket.id);
    if (type == 'http')
        delete this.httpClients[socket.id];
    else if (type == 'https')
        delete this.httpsClients[socket.id];
};

WebSocketServer.prototype.onToken = function (type, socket, data) {
    var config = locator.get('config');

    var me = this;
    jwt.verify(data, config['jwt']['secret'], function (err, payload) {
        if (err || !payload)
            return;

        if (type == 'http')
            me.httpClients[socket.id] = payload.user_id;
        else if (type == 'https')
            me.httpsClients[socket.id] = payload.user_id;
    });
};

module.exports = WebSocketServer;
