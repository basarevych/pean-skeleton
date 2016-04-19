/**
 * File service
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var fs = require('fs-ext');

/**
 * File operations service
 *
 * @constructor
 */
function Filer() {
}

/**
 * Read file descriptor
 *
 * @param {integer} fd      File descriptor
 * @return {object}         Returns promise resolving to file contents as UTF8 string
 */
Filer.prototype.read = function (fd) {
    var defer = q.defer();

    fs.fstat(fd, function (err, stats) {
        if (err)
            return defer.reject(err);

        var buffer = new Buffer(stats.size);
        fs.read(
            fd,
            buffer,
            0,
            buffer.length,
            null,
            function (err, bytesRead, buffer) {
                if (err)
                    return defer.reject(err);
                if (bytesRead != stats.size)
                    return defer.reject('Only ' + bytesRead + ' out of ' + stats.size + ' has been read on fd ' + fd);

                defer.resolve(buffer.toString('utf8', 0, buffer.length));
            }
        );

    });

    return defer.promise;
};

/**
 * Write to file descriptor
 *
 * @param {integer} fd          File descriptor
 * @param {string} contents     New contents of the file
 * @return {object}             Returns promise resolving to true on success
 */
Filer.prototype.write = function (fd, contents) {
    var defer = q.defer();

    var buffer = new Buffer(contents);
    fs.write(
        fd,
        buffer,
        0,
        buffer.length,
        null,
        function (err) {
            if (err)
                return defer.reject(err);

            defer.resolve(true);
        }
    );

    return defer.promise;
};

/*
 * Lock a file (shared) and read it
 *
 * @param {string} filename             File path and name
 * @param {string} defaultContents      Contents to return on failure to open the file
 * @return {object}                     Returns promise resolving to file contents
 */
Filer.prototype.lockRead = function (filename, defaultContents) {
    var me = this;
    var defer = q.defer();

    var fd;
    try {
        fd = fs.openSync(filename, 'r');
    } catch (err) {
        defer.resolve(defaultContents);
        return defer.promise;
    }

    fs.flock(fd, 'sh', function (err) {
        if (err)
            return defer.reject(err);

        me.read(fd)
            .then(function (data) {
                fs.flock(fd, 'un', function (err) {
                    if (err) {
                        fs.closeSync(fd);
                        return defer.reject(err);
                    }

                    fs.closeSync(fd);
                    defer.resolve(data);
                });
            })
            .catch(function (err) {
                fs.closeSync(fd);
                defer.reject(err);
            });
    });

    return defer.promise;
};

/**
 * Lock a file (exclusively) and write to it
 *
 * @param {string} filename     File path and name
 * @param {string} contents     New file contents
 * @param {string} mode         Mode (as a string representing octal number) or undefined
 * @param {string} uid          UID or undefined
 * @param {string} gid          GID or undefined
 * @return {object}             Returns promise resolving to true on success
 */
Filer.prototype.lockWrite = function (filename, contents, mode, uid, gid) {
    var me = this;
    var defer = q.defer();

    var fd;
    try {
        fd = fs.openSync(filename, 'w');
    } catch (err) {
        defer.reject(err);
        return defer.promise;
    }

    fs.flock(fd, 'ex', function (err) {
        if (err)
            return defer.reject(err);

        me.write(fd, contents)
            .then(function () {
                if (typeof mode != 'undefined')
                    fs.chmodSync(filename, parseInt(mode, 8));
                if (typeof uid != 'undefined' && typeof gid != 'undefined')
                    fs.chownSync(filename, parseInt(uid, 10), parseInt(gid, 10));
                fs.flock(fd, 'un', function (err) {
                    if (err) {
                        fs.closeSync(fd);
                        return defer.reject(err);
                    }

                    fs.closeSync(fd);
                    defer.resolve(true);
                });
            })
            .catch(function (err) {
                fs.closeSync(fd);
                defer.reject(err);
            });
    });

    return defer.promise;
};

/**
 * Updater callback
 *
 * @callback Filer~updater
 * @param {string} contents     Previous file contents
 * @return {object}             Returns promise resolving to new file contents
 */

/**
 * Lock a file (exclusively) and update it
 *
 * @param {string} filename     File path and name
 * @param {Filer~updater} cb    Updater callback
 * @param {string} mode         Mode (as a string representing octal number) or undefined
 * @param {string} uid          UID or undefined
 * @param {string} gid          GID or undefined
 * @return {object}             Returns promise resolving to true on success
 */
Filer.prototype.lockUpdate = function (filename, cb, mode, uid, gid) {
    var me = this;
    var defer = q.defer();

    var fd;
    try {
        fd = fs.openSync(filename, 'a+');
    } catch (err) {
        defer.reject(err);
        return defer.promise;
    }

    fs.flock(fd, 'ex', function (err) {
        if (err)
            return defer.reject(err);

        me.read(fd)
            .then(function (contents) {
                return cb(contents)
            })
            .then(function (newContents) {
                fs.ftruncateSync(fd, 0);
                return me.write(fd, newContents)
            })
            .then(function () {
                if (typeof mode != 'undefined')
                    fs.chmodSync(filename, parseInt(mode, 8));
                if (typeof uid != 'undefined' && typeof gid != 'undefined')
                    fs.chownSync(filename, parseInt(uid, 10), parseInt(gid, 10));
                fs.flock(fd, 'un', function (err) {
                    if (err) {
                        fs.closeSync(fd);
                        return defer.reject(err);
                    }

                    fs.closeSync(fd);
                    defer.resolve(true);
                });
            })
            .catch(function (err) {
                fs.closeSync(fd);
                defer.reject(err);
            });
    });

    return defer.promise;
};

/**
 * Create a directory (recursively)
 *
 * @param {string} path         Path of directory
 * @param {string} mode         Mode (as a string representing octal number) or undefined
 * @param {string} uid          UID or undefined
 * @param {string} gid          GID or undefined
 * @return {object}             Returns promise resolving on success
 */
Filer.prototype.createDirectory = function (path, mode, uid, gid) {
    var defer = q.defer();

    if (path.length < 2 || path[0] != '/') {
        defer.reject('Invalid path');
        return defer.promise;
    }

    var parts = path.split('/');
    parts.shift();

    function mkdir(i) {
        var dir = '';
        for (var j = 0; j <= i; j++)
            dir += '/' + parts[j];

        try {
            if (!fs.statSync(dir).isDirectory())
                return defer.reject('Path exists and not a directory: ' + dir);
            return;
        } catch (err) {
            // do nothing
        }

        try {
            fs.mkdirSync(dir, typeof mode == 'undefined' ? undefined : parseInt(mode, 8));
            if (typeof uid != 'undefined' && typeof gid != 'undefined')
                fs.chownSync(dir, parseInt(uid, 10), parseInt(gid, 10));
        } catch (err) {
            defer.reject(err);
        }
    }

    for (var i = 0; i < parts.length; i++) {
        mkdir(i);
        if (!defer.promise.isPending())
            break;
    }

    if (defer.promise.isPending())
        defer.resolve();

    return defer.promise;
};

module.exports = Filer;
