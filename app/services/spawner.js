/**
 * Spawn command service
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var pty = require('pty.js');

/**
 * Spawn a command
 *
 * @constructor
 */
function Spawner() {
}

Spawner.TIMEOUT = 60 * 1000;        // Command execution time limit

/**
 * Execute a command
 *
 * @param {string} command      Command name
 * @param {string[]} params     Command arguments
 * @param {object} [expect]     Expect-send strings object { 'wait for regexp string': 'send this' }
 * @return {object}             Returns promise resolving to object { code: 0, output: '' }
                                If command failed exit code will be null
 */
Spawner.prototype.exec = function (command, params, expect) {
    var defer = q.defer();

    var cmd = pty.spawn(command, params);

    var result = {
        code: null,
        output: '',
    };

    var timer = setTimeout(function () {
        timer = null;
        cmd.kill();
    }, Spawner.TIMEOUT);

    cmd.on('data', function (data) {
        result['output'] += data.toString();

        if (typeof expect != 'object')
            return;

        data.toString().split('\n').forEach(function (line) {
            for (var key in expect) {
                var re = new RegExp(key, "i");
                if (re.test(line))
                    setTimeout(function () { cmd.write(expect[key] + "\r"); }, 250);
            }
        });
    });
    cmd.on('exit', function (code, signal) {
        if (timer === null) {
            result['code'] = null;
        } else {
            clearTimeout(timer);
            result['code'] = code;
        }
        defer.resolve(result);
    });
    cmd.on('error', function (err) {
        if (err.errno == 'EIO' && err.syscall == 'read')    // TODO: check the status of this bug
            return;                                         // Do nothing here as this is a Debian-specific bug

        defer.reject(err);
    });

    return defer.promise;
};

module.exports = Spawner;