/**
 * Web socket Server
 */

'use strict';

var locator = require('node-service-locator');
var jwt = require('jsonwebtoken');

/**
 * Web socket server
 *
 * @constructor
 */
function WebSocketServer() {
    this.httpServer = null;
    this.httpClients = {};
    this.httpsServer = null;
    this.httpsClients = {};
};

/**
 * HTTP Web socket server setter
 *
 * @param {object}          The server
 * @return {object}         Returns self
 */
WebSocketServer.prototype.setHttpServer = function (server) {
    this.httpServer = server;
    return this;
};

/**
 * HTTP Web socket server getter
 *
 * @return {object}         Returns current server
 */
WebSocketServer.prototype.getHttpServer = function () {
    return this.httpServer;
};

/**
 * HTTPS Web socket server setter
 *
 * @param {object}          The server
 * @return {object}         Returns self
 */
WebSocketServer.prototype.setHttpsServer = function (server) {
    this.httpsServer = server;
    return this;
};

/**
 * HTTPS Web socket server getter
 *
 * @return {object}         Returns current server
 */
WebSocketServer.prototype.getHttpsServer = function () {
    return this.httpsServer;
};

/**
 * Create HTTP and HTTPS Web socket servers
 */
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
            case process.env.PROJECT + ":notifications":        // Notification has been created - send it
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

/**
 * Web socket server 'connect' event handler
 *
 * @param {string} type     Possible values: 'http', 'https'
 * @param {object} socket   Web socket
 */
WebSocketServer.prototype.onConnect = function (type, socket) {
    var me = this;
    console.log("[WebSocket] Connected (" + type + ") " + socket.id);
    socket.on('disconnect', function () { me.onDisconnect(type, socket); });
    socket.on('token', function (data) { me.onToken(type, socket, data); });
};

/**
 * Web socket server 'disconnect' event handler
 *
 * @param {string} type     Possible values: 'http', 'https'
 * @param {object} socket   Web socket
 */
WebSocketServer.prototype.onDisconnect = function (type, socket) {
    console.log("[WebSocket] Disconnected (" + type + ") " + socket.id);
    if (type == 'http')
        delete this.httpClients[socket.id];
    else if (type == 'https')
        delete this.httpsClients[socket.id];
};

/**
 * Handle 'token' message sent by client
 *
 * @param {string} type     Possible values: 'http', 'https'
 * @param {object} socket   Web socket
 * @param {string} data     The message (encrypted token)
 */
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
