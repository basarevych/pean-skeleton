/**
 * Spawn command service
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var fs = require('fs-ext');
var pty = require('pty.js');
var merge = require('merge');

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
 * Maximum output length
 */
Spawner.MAX_OUTPUT_LENGTH = 102400;

/**
 * Callback for processing return data
 *
 * @callback Spawner~dataCallback
 * @param {object} buffer       Process output chunk (Buffer)
 */

/**
 * Execute a command
 *
 * @param {string} command              Command name
 * @param {string[]} params             Command arguments
 * @param {object} expect               Expect-send strings object { 'wait for regexp string': 'send this' } or undefined
 * @param {object} options              Pty.js options or undefined
 * @param {Spawner~dataCallback} cb     Data callback or undefined
 * @return {object}                     Returns promise resolving to object { code: 0, output: '' }
 *                                      If command failed exit code will be null
 */
Spawner.prototype.exec = function (command, params, expect, options, cb) {
    var defer = q.defer();

    var defOptions = {
        env: {
            "LANGUAGE": "C.UTF-8",
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "PATH": "/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin",
        },
    };
    if (options)
        options = merge.recursive(defOptions, options);
    else
        options = defOptions;

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
        if (typeof cb == 'function')
            cb(data);

        result['output'] += data.toString();
        if (result['output'].length > Spawner.MAX_OUTPUT_LENGTH)
            result['output'] = result['output'].slice(result['output'].length - Spawner.MAX_OUTPUT_LENGTH);

        if (typeof expect != 'object' || expect === null)
            return;

        data.toString().split('\n').forEach(function (line) {
            function sendKey(send) {
                setTimeout(function () { cmd.write(send + "\r"); }, 250);
            }
            for (var key in expect) {
                var re = new RegExp(key, "i");
                if (re.test(line))
                    sendKey(expect[key]);
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
 * @param {object} expect       Expect-send strings object { 'wait for regexp string': 'send this' } or undefined
 */
function Subprocess(cmd, expect) {
    this.defer = q.defer();
    this.cmd = cmd;

    this.result = { code: null };

    var me = this;
    if (typeof expect == 'object' && expect !== null) {
        cmd.on('data', function (data) {
            data.toString().split('\n').forEach(function (line) {
                function sendKey(send) {
                    setTimeout(function () { cmd.write(send + "\r"); }, 250);
                }
                for (var key in expect) {
                    var re = new RegExp(key, "i");
                    if (re.test(line))
                        sendKey(expect[key]);
                }
            });
        });
    }
    cmd.on('exit', function (code, signal) {
        me.result['code'] = code;
        me.defer.resolve(me.result);
    });
    cmd.on('error', function (err) {
        if (err.errno == 'EIO' && err.syscall == 'read')    // TODO: check the status of this bug
            return;                                         // Do nothing here as this is a Debian-specific bug

        me.defer.reject(err);
    });
}

/**
 * Get pty.js object
 *
 * @return {object}             Returns the object
 */
Subprocess.prototype.getCmd = function () {
    return this.cmd;
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
 * Send data to process'es stdin
 *
 * @return {boolean}            Returns success or not
 */
Subprocess.prototype.write = function (data) {
    if (!this.isRunning())
        return false;

    this.cmd.write(data);
    return true;
};

/**
 * Resize terminal
 *
 * @param {number} cols         Number of columns
 * @param {number} rows         Number of rows
 * @return {boolean}            Returns success or not
 */
Subprocess.prototype.resize = function (cols, rows) {
    if (!this.isRunning())
        return false;

    this.cmd.resize(cols, rows);
    return true;
};

/**
 * Terminate process
 *
 * @return {boolean}            Returns success or not
 */
Subprocess.prototype.kill = function (sig) {
    if (!this.isRunning())
        return false;

    this.cmd.kill(sig ? sig : 'SIGKILL');
    return true;
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
 * Get process exit code
 *
 * @return {null|number}        Returns the code
 */
Subprocess.prototype.getCode = function () {
    return this.result.code;
};

/**
 * Spawn a command
 *
 * @param {string} command      Command name
 * @param {string[]} params     Command arguments
 * @param {object} expect       Expect-send strings object { 'wait for regexp string': 'send this' } or undefined
 * @param {object} options      Pty.js options or undefined
 * @return {object}             Returns Subprocess instance
 */
Spawner.prototype.spawn = function (command, params, expect, options) {
    var defOptions = {
        env: {
            "LANGUAGE": "C.UTF-8",
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "PATH": "/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin",
        },
    };
    if (options)
        options = merge.recursive(defOptions, options);
    else
        options = defOptions;

    return new Subprocess(pty.spawn(command, params, options), expect);
};

Spawner.Subprocess = Subprocess;
module.exports = Spawner;
