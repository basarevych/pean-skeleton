/**
 * File service
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var fs = require('fs-ext');
var rimraf = require('rimraf');

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
 * @return {object}         Returns promise resolving to file contents as Buffer
 */
Filer.prototype.read = function (fd) {
    var defer = q.defer();

    fs.fstat(fd, function (err, stats) {
        if (err)
            return defer.reject(err);

        if (stats.size === 0)
            return defer.resolve('');

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

                defer.resolve(buffer);
            }
        );
    });

    return defer.promise;
};

/**
 * Write to file descriptor
 *
 * @param {integer} fd          File descriptor
 * @param {object} buffer       New contents of the file
 * @return {object}             Returns promise resolving to true on success
 */
Filer.prototype.write = function (fd, buffer) {
    var defer = q.defer();

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
 * Lock a file (shared) and read it returning as Buffer
 *
 * @param {string} filename             File path and name
 * @param {string} defaultContents      Contents to return on failure to open the file
 * @return {object}                     Returns promise resolving to file contents
 */
Filer.prototype.lockReadBuffer = function (filename, defaultContents) {
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

/*
 * Lock a file (shared) and read it returning string
 *
 * @param {string} filename             File path and name
 * @param {string} defaultContents      Contents to return on failure to open the file
 * @return {object}                     Returns promise resolving to file contents
 */
Filer.prototype.lockRead = function (filename, defaultContents) {
    return this.lockReadBuffer(filename, defaultContents)
        .then(function (buffer) {
            return buffer.toString('utf8', 0, buffer.length);
        });
};

/**
 * Lock a file (exclusively) and write to it
 *
 * @param {string} filename     File path and name
 * @param {object} buffer       New file contents
 * @param {string} mode         Mode (as a string representing octal number) or undefined
 * @param {string} uid          UID or undefined
 * @param {string} gid          GID or undefined
 * @return {object}             Returns promise resolving to true on success
 */
Filer.prototype.lockWriteBuffer = function (filename, buffer, mode, uid, gid) {
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

        me.write(fd, buffer)
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
    var buffer = new Buffer(contents);
    return this.lockWriteBuffer(filename, buffer, mode, uid, gid);
};

/**
 * Buffer updater callback
 *
 * @callback Filer~bufferUpdater
 * @param {object} buffer       Previous file contents (Buffer)
 * @return {object}             Returns promise resolving to new file contents (Buffer)
 */

/**
 * Lock a file (exclusively) and update it using Buffer
 *
 * @param {string} filename         File path and name
 * @param {Filer~bufferUpdater} cb  Buffer updater callback
 * @param {string} mode             Mode (as a string representing octal number) or undefined
 * @param {string} uid              UID or undefined
 * @param {string} gid              GID or undefined
 * @return {object}                 Returns promise resolving to true on success
 */
Filer.prototype.lockUpdateBuffer = function (filename, cb, mode, uid, gid) {
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
            .then(function (buffer) {
                return cb(buffer);
            })
            .then(function (newBuffer) {
                fs.ftruncateSync(fd, 0);
                return me.write(fd, newBuffer);
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
 * String updater callback
 *
 * @callback Filer~stringUpdater
 * @param {string} contents     Previous file contents (string)
 * @return {object}             Returns promise resolving to new file contents (string)
 */

/**
 * Lock a file (exclusively) and update it using string
 *
 * @param {string} filename         File path and name
 * @param {Filer~stringUpdater} cb  String updater callback
 * @param {string} mode             Mode (as a string representing octal number) or undefined
 * @param {string} uid              UID or undefined
 * @param {string} gid              GID or undefined
 * @return {object}                 Returns promise resolving to true on success
 */
Filer.prototype.lockUpdate = function (filename, cb, mode, uid, gid) {
    var stringCb = function (buffer) {
        return cb(buffer.toString('utf8', 0, buffer.length))
            .then(function (result) {
                return new Buffer(result);
            });
    };
    return this.lockUpdateBuffer(filename, stringCb, mode, uid, gid);
};

/**
 * Create a directory (recursively)
 *
 * @param {string} path         Absolute path of the directory
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

/**
 * Create a file (its base dir must exist)
 *
 * @param {string} path         Absolute path of the file
 * @param {string} mode         Mode (as a string representing octal number) or undefined
 * @param {string} uid          UID or undefined
 * @param {string} gid          GID or undefined
 * @return {object}             Returns promise resolving on success
 */
Filer.prototype.createFile = function (path, mode, uid, gid) {
    var defer = q.defer();

    if (path.length < 2 || path[0] != '/') {
        defer.reject('Invalid path');
        return defer.promise;
    }

    try {
        if (!fs.statSync(path).isFile()) {
            defer.reject('Path exists and not a file: ' + path);
            return defer.promise;
        }

        defer.resolve();
        return defer.promise;
    } catch (err) {
        // do nothing
    }

    try {
        var fd = fs.openSync(path, 'a', typeof mode == 'undefined' ? undefined : parseInt(mode, 8));
        fs.closeSync(fd);

        if (typeof uid != 'undefined' && typeof gid != 'undefined')
            fs.chownSync(path, parseInt(uid, 10), parseInt(gid, 10));

        defer.resolve();
    } catch (err) {
        defer.reject(err);
    }

    return defer.promise;
};

/**
 * Remove a file or directory recursively
 *
 * @param {string} path         Path of directory
 * @return {object}             Returns promise resolving on success
 */
Filer.prototype.remove = function (path) {
    var defer = q.defer();

    if (path.length < 2 || path[0] != '/') {
        defer.reject('Invalid path');
        return defer.promise;
    }

    try {
        fs.lstatSync(path);
    } catch (err) {
        defer.resolve();
        return defer.promise;
    }

    rimraf(path, { disableGlob: true }, function (err) {
        if (err)
            return defer.reject(err);

        defer.resolve();
    });

    return defer.promise;
};

module.exports = Filer;
