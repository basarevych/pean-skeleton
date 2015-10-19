/**
 * HTTP Server
 */

'use strict';

var locator = require('node-service-locator');
var http = require('http');

function HttpServer() {
    this.server = null;
};

HttpServer.prototype.setServer = function (server) {
    this.server = server;
    return this;
};

HttpServer.prototype.getServer = function () {
    return this.server;
};

HttpServer.prototype.start = function () {
    var hostname = process.env.HOSTNAME || undefined;
    var port = process.env.PORT || '3000';
    locator.register('hostname', hostname);
    locator.register('port', port);

    var me = this;
    var app = locator.get('app');
    this.setServer(http.createServer(app));

    this.server.on('error', function (error) { me.onError(error); });
    this.server.listen(port, hostname);
};

HttpServer.prototype.onError = function (error) {
    if (error.syscall !== 'listen')
        throw error;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error('Port requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error('Port is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
};

module.exports = HttpServer;
