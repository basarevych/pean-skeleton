/**
 * REST client service
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var fs = require('fs');
var request = require('request');

/**
 * REST client service
 *
 * @constructor
 */
function Rester() {
}

/**
 * Do an HTTP(S) request
 *
 * @param {string} method       HTTP(S) method
 * @param {string} url          URL
 * @param {object} [data]       Data to send with request
 * @return {object}             Returns promise resolving to object { response: {}, body: {} }
 */
Rester.prototype.request = function (method, url, data) {
    var defer = q.defer();

    var options = {
        url: url,
        method: method,
        body: data,
        json: true,
    };

    if (process.env.CLIENT_CERT)
        options['cert'] = fs.readFileSync(process.env.CLIENT_CERT);

    if (process.env.CLIENT_KEY)
        options['key'] = fs.readFileSync(process.env.CLIENT_KEY);

    if (process.env.CLIENT_CA)
        options['ca'] = fs.readFileSync(process.env.CLIENT_CA);

    request(
        options,
        function (err, response, body) {
            if (err) {
                defer.reject(err);
                return;
            }

            defer.resolve({ response: response, body: body });
        }
    );

    return defer.promise;
};

/**
 * GET requst
 *
 * @param {string} url          URL
 * @return {object}             Returns promise resolving to object { response: {}, body: {} }
 */
Rester.prototype.get = function (url) {
    return this.request('GET', url);
};

/**
 * POST requst
 *
 * @param {string} url          URL
 * @param {object} [data]       Data to send with request
 * @return {object}             Returns promise resolving to object { response: {}, body: {} }
 */
Rester.prototype.post = function (url, data) {
    return this.request('POST', url, data);
};

/**
 * PUT requst
 *
 * @param {string} url          URL
 * @param {object} [data]       Data to send with request
 * @return {object}             Returns promise resolving to object { response: {}, body: {} }
 */
Rester.prototype.put = function (url, data) {
    return this.request('PUT', url, data);
};

/**
 * DELETE requst
 *
 * @param {string} url          URL
 * @return {object}             Returns promise resolving to object { response: {}, body: {} }
 */
Rester.prototype.get = function (url) {
    return this.request('DELETE', url);
};

module.exports = Rester;
