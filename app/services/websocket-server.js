/**
 * Web socket Server
 */

'use strict';

var locator = require('node-service-locator');
var jwt = require('jsonwebtoken');
var moment = require('moment-timezone');
var q = require('q');
var fs = require('fs');
var path = require('path');

/**
 * Web socket server
 *
 * @constructor
 */
function WebSocketServer() {
    this.httpServer = null;
    this.httpsServer = null;

    this.sessions = {};
    /**
     * sessions[sessionId] = {
     *   type: 'http' | 'https',
     *   user: UserModel instance or null,
     * }
     */

    this.handlers = [];
    /**
     * [
     *   {
     *     message: 'web socket message',
     *     cb: the callback,
     *   },
     *   ...
     * ]
     */
}

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
 * Get all the sessions
 *
 * @return {object}         Returns the sessions object
 */
WebSocketServer.prototype.getSessions = function () {
    return this.sessions;
};

/**
 * Get session by socket ID
 *
 * @param {string} socketId     Socket ID
 * @return {object|null}        Returns the session or null
 */
WebSocketServer.prototype.getSession = function (socketId) {
    if (typeof this.sessions[socketId] == 'undefined')
        return null;

    return this.sessions[socketId];
};

/**
 * WebSocket message callback
 *
 * @callback WebSocketServer~handler
 * @param {object} socket       The socket
 * @apram {object} data         Received data
 */

/**
 * Add a message handler
 *
 * @param {string} message              WebSocket message
 * @param {WebSocketServer~handler} cb  Handler callback
 */
WebSocketServer.prototype.on = function (message, cb) {
    this.handlers.push({ message: message, cb: cb });
};

/**
 * Create HTTP and HTTPS Web socket servers
 */
WebSocketServer.prototype.start = function () {
    var me = this;
    var logger = locator.get('logger');
    var webServer = locator.get('web-server');

    if (webServer.getHttpServer())
        this.setHttpServer(require('socket.io')(webServer.getHttpServer()));

    if (webServer.getHttpsServer())
        this.setHttpsServer(require('socket.io')(webServer.getHttpsServer()));

    var dir = path.join(__dirname, '..', 'messages');
    try {
        fs.readdirSync(dir).forEach(function (name) {
            require(path.join(dir, name))(me);
        });
    } catch (err) {
        logger.error('Could not read message file', err);
        process.exit(1);
    }

    if (this.getHttpServer()) {
        this.getHttpServer().on('connect', function (socket) {
            me.onConnect('http', socket);
            me.handlers.forEach(function (handler) {
                socket.on(handler.message, function (data) { handler.cb(socket, data); });
            });
        });
    }

    if (this.getHttpsServer()) {
        this.getHttpsServer().on('connect', function (socket) {
            me.onConnect('https', socket);
            me.handlers.forEach(function (handler) {
                socket.on(handler.message, function (data) { handler.cb(socket, data); });
            });
        });
    }
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

    this.sessions[socket.id] = {
        type: type,
        user: null,
    };

    socket.on('disconnect', function () { me.onDisconnect(socket); });
    socket.on('token', function (data) { me.onToken(socket, data); });
};

/**
 * Web socket server 'disconnect' event handler
 *
 * @param {object} socket   Web socket
 */
WebSocketServer.prototype.onDisconnect = function (socket) {
    console.log("[WebSocket] Disconnected (" + this.sessions[socket.id]['type'] + ") " + socket.id);
    delete this.sessions[socket.id];
};

/**
 * Handle 'token' message sent by client
 *
 * @param {object} socket   Web socket
 * @param {string} data     The message (encrypted token)
 */
WebSocketServer.prototype.onToken = function (socket, data) {
    var config = locator.get('config');
    var logger = locator.get('logger');

    var me = this;
    jwt.verify(data, config['jwt']['secret'], function (err, payload) {
        if (err || !payload || !payload.token_id)
            return;

        var tokenRepo = locator.get('token-repository');
        var userRepo = locator.get('user-repository');

        tokenRepo.find(payload.token_id)
            .then(function (tokens) {
                var token = tokens.length && tokens[0];
                var now = moment();
                if (!token || (now.unix() - token.getUpdatedAt().unix() > config['jwt']['ttl']))
                    return;

                return userRepo.find(token.getUserId())
                    .then(function (users) {
                        var user = users.length && users[0];
                        if (user)
                            me.sessions[socket.id]['user'] = user;
                    });
            })
            .catch(function () {
                logger.error('WebSocket token handler failed', err);
            });
    });
};

module.exports = WebSocketServer;
