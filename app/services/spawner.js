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

/**
 * Command execution time limit
 */
Spawner.EXEC_TIMEOUT = 600;          // seconds

/**
 * Execute a command
 *
 * @param {string} command      Command name
 * @param {string[]} params     Command arguments
 * @param {object} [expect]     Expect-send strings object { 'wait for regexp string': 'send this' }
 * @return {object}             Returns promise resolving to object { code: 0, output: '' }
 *                              If command failed exit code will be null
 */
Spawner.prototype.exec = function (command, params, expect) {
    var defer = q.defer();

    var options = {
        env: {
            "LANGUAGE": "C",
            "LANG": "C",
            "LC_ALL": "C",
            "PATH": "/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin",
        },
    };
    var cmd = pty.spawn(command, params, options);

    var result = {
        code: null,
        output: '',
    };

    var timer = setTimeout(function () {
        timer = null;
        cmd.kill();
    }, Spawner.EXEC_TIMEOUT * 1000);

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
            timer = null;
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

/**
 * Spawned subprocess
 *
 * @constructor
 * @param {object} cmd          pty.spawn object
 * @params {object} [expect]    Expect object as in Spawner.spawn()
 */
function Subprocess(cmd, expect) {
    this.defer = q.defer();
    this.cmd = cmd;

    this.result = {
        code: null,
        output: '',
    };

    var me = this;
    cmd.on('data', function (data) {
        me.result['output'] += data.toString();

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
        me.result['code'] = code;
        me.defer.resolve(me.result);
    });
    cmd.on('error', function (err) {
        if (err.errno == 'EIO' && err.syscall == 'read')    // TODO: check the status of this bug
            return;                                         // Do nothing here as this is a Debian-specific bug

        me.defer.reject(err);
    });
};

/**
 * Is process still running?
 *
 * @return {boolean}            Returns status
 */
Subprocess.prototype.isRunning = function () {
    return this.defer.promise.isPending();
};

/**
 * Get process exit code
 *
 * @return {null|number}        Returns the code
 */
Subprocess.prototype.getCode = function () {
    return this.result.code;
};

/**
 * Get process output so far
 *
 * @return {string}             Returns the output
 */
Subprocess.prototype.getOutput = function () {
    return this.result.output;
};

/**
 * Terminate process
 */
Subprocess.prototype.kill = function () {
    return this.cmd.kill();
};

/**
 * Get result promise
 *
 * @return {object}             Returns result promise resolving as Spawner.exec() method
 */
Subprocess.prototype.getResult = function () {
    return this.defer.promise;
};

/**
 * Spawn a command
 *
 * @param {string} command      Command name
 * @param {string[]} params     Command arguments
 * @param {object} [expect]     Expect-send strings object { 'wait for regexp string': 'send this' }
 * @return {object}             Returns Subprocess instance
 */
Spawner.prototype.spawn = function (command, params, expect) {
    var options = {
        env: {
            "LANGUAGE": "C",
            "LANG": "C",
            "LC_ALL": "C",
            "PATH": "/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin",
        },
    };
    
    return new Subprocess(pty.spawn(command, params, options), expect);
};

Spawner.Subprocess = Subprocess;
module.exports = Spawner;
