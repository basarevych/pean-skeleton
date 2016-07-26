/**
 * HTTP Server
 */

'use strict';

var locator = require('node-service-locator');
var http = require('http');
var https = require('https');
var fs = require('fs');

/**
 * HTTP/HTTPS Server
 *
 * @constructor
 */
function WebServer() {
    this.httpServer = null;
    this.httpsServer = null;
}

/**
 * HTTP Server setter
 *
 * @param {object} server       The server
 * @return {object}             Returns self
 */
WebServer.prototype.setHttpServer = function (server) {
    this.httpServer = server;
    return this;
};

/**
 * HTTP Server getter
 *
 * @return {object}             Returns current server
 */
WebServer.prototype.getHttpServer = function () {
    return this.httpServer;
};

/**
 * HTTPS Server setter
 *
 * @param {object} server       The server
 * @return {object}             Returns self
 */
WebServer.prototype.setHttpsServer = function (server) {
    this.httpsServer = server;
    return this;
};

/**
 * HTTPS Server getter
 *
 * @return {object}             Returns current server
 */
WebServer.prototype.getHttpsServer = function () {
    return this.httpsServer;
};

/**
 * Create and save HTTP server
 *
 * @param {string} host
 * @param {integer} port
 */
WebServer.prototype.startHttp = function (host, port) {
    var me = this;
    var app = locator.get('app');

    var server = http.createServer(app);
    server.on('error', function (error) { me.onError(error); });
    server.listen(port, host);
    this.setHttpServer(server);
};

/**
 * Create and save HTTPS server
 *
 * @param {string} host
 * @param {integer} port
 */
WebServer.prototype.startHttps = function (host, port, key, cert, ca) {
    var me = this;
    var app = locator.get('app');

    var options = {
        key: fs.readFileSync(key),
        cert: fs.readFileSync(cert),
    };

    if (ca) {
        var caArray = [];
        var caFile = fs.readFileSync(ca).toString();
        var caParts = caFile.split('-----BEGIN CERTIFICATE-----');
        caParts.forEach(function (ca) {
            if (ca.length)
                caArray.push('-----BEGIN CERTIFICATE-----' + ca);
        });

        options['ca'] = caArray;
    }

    var server = https.createServer(options, app);
    server.on('error', function (error) { me.onError(error); });
    server.listen(port, host);
    this.setHttpsServer(server);
};

/**
 * HTTP/HTTPS server error handler
 *
 * @param {object} error        The error
 */
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
