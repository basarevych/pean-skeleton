/**
 * HTTP Server
 */

'use strict';

var locator = require('node-service-locator');
var http = require('http');
var https = require('https');
var fs = require('fs');

function WebServer() {
    this.httpServer = null;
    this.httpsServer = null;
};

WebServer.prototype.setHttpServer = function (server) {
    this.httpServer = server;
    return this;
};

WebServer.prototype.getHttpServer = function () {
    return this.httpServer;
};

WebServer.prototype.setHttpsServer = function (server) {
    this.httpsServer = server;
    return this;
};

WebServer.prototype.getHttpsServer = function () {
    return this.httpsServer;
};

WebServer.prototype.startHttp = function (host, port) {
    var me = this;
    var app = locator.get('app');

    var server = http.createServer(app);
    server.on('error', function (error) { me.onError(error); });
    server.listen(port, host);
    this.setHttpServer(server);
};

WebServer.prototype.startHttps = function (host, port, key, cert) {
    var me = this;
    var app = locator.get('app');

    var keyFile = fs.readFileSync(key);
    var certFile = fs.readFileSync(cert);

    var server = https.createServer({ key: keyFile, cert: certFile }, app);
    server.on('error', function (error) { me.onError(error); });
    server.listen(port, host);
    this.setHttpsServer(server);
};

WebServer.prototype.onError = function (error) {
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

module.exports = WebServer;
