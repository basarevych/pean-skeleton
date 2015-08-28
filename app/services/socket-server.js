/**
 * Web socket Server
 */

var locator = require('node-service-locator');

function SocketServer() {
    this.server = null;
};

SocketServer.prototype.setServer = function (server) {
    this.server = server;
    return this;
};

SocketServer.prototype.getServer = function () {
    return this.server;
};

SocketServer.prototype.start = function () {
    var httpServer = locator.get('http-server');
    var server = httpServer.getServer();
    this.setServer(require('socket.io')(server));

    this.server.on('connection', this.onConnection);
};

SocketServer.prototype.onConnection = function (socket) {
    console.log("Socket connected");
    socket.emit('notification', 'Test');
};

module.exports = SocketServer;
