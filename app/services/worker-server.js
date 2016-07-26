/**
 * Job Server
 */

'use strict';

var locator = require('node-service-locator');
var jwt = require('jsonwebtoken');
var path = require('path');
var fs = require('fs');
var q = require('q');

/**
 * Service for background task execution
 *
 * @constructor
 */
function WorkerServer() {
    this.timer = null;
}

WorkerServer.INTERVAL = 10000;      // Job polling interval

/**
 * Create server and start waiting for the jobs
 */
WorkerServer.prototype.start = function () {
    var me = this;
    var logger = locator.get('logger');

    var jobRepo = locator.get('job-repository');
    jobRepo.restartInterrupted()
        .then(function () {
            var subscriber = jobRepo.getRedis();
            subscriber.on("message", function (channel, message) {
                switch (channel) {
                    case process.env.PROJECT + ":jobs:created":
                    case process.env.PROJECT + ":jobs:success":
                    case process.env.PROJECT + ":jobs:failure":
                        me.work();
                        break;
                }
            });
            subscriber.subscribe(process.env.PROJECT + ":jobs:created");
            subscriber.subscribe(process.env.PROJECT + ":jobs:success");
            subscriber.subscribe(process.env.PROJECT + ":jobs:failure");

            setInterval(function () { me.work(); }, WorkerServer.INTERVAL);
            me.work();
        })
        .catch(function (err) {
            logger.error('WorkerServer.start() - jobRepo.restartInterrupted', err);
        });
};

/**
 * Process current jobs
 */
WorkerServer.prototype.work = function () {
    var me = this;
    var logger = locator.get('logger');

    var jobRepo = locator.get('job-repository');
    jobRepo.processNewJobs()
        .then(function (result) {
            result.expired.forEach(function (job) {
                console.log('[' + me.now() + '] Expired #' + job.getId() + ': ' + job.getName());
            });
            result.started.forEach(function (job) {
                console.log('[' + me.now() + '] Started #' + job.getId() + ': ' + job.getName());
                me.doJob(job);
            });
        })
        .catch(function (err) {
            logger.error('WorkerServer.work() - jobRepo.processNewJobs', err);
        });
};

/**
 * Load and execute job script (app/jobs directory)
 */
WorkerServer.prototype.doJob = function (job) {
    var me = this;
    var logger = locator.get('logger');

    q.fcall(function () {
            var func = require(path.join(__dirname, '..', 'jobs', job.getName()));
            return func(job);
        })
        .then(function () {
            console.log('[' + me.now() + '] Finished #' + job.getId() + ': ' + job.getName());
        })
        .catch(function (err) {
            console.log('[' + me.now() + '] Failed #' + job.getId() + ': ' + job.getName());

            job.setStatus('failure');
            job.setOutputData({ error: err });

            var jobRepo = locator.get('job-repository');
            return jobRepo.save(job)
                .catch(function (err) {
                    logger.error('WorkerServer.doJob() - jobRepo.save()', err);
                });
        });
};

/**
 * Return date as a string
 *
 * @return {string}             Returns the string with current date
 */
WorkerServer.prototype.now = function () {
    var now = new Date();
    var output = now.getFullYear() + '-' + this.padZero(now.getMonth()+1) + '-' + this.padZero(now.getDate());
    output += ' ' + this.padZero(now.getHours()) + ':' + this.padZero(now.getMinutes()) + ':' + this.padZero(now.getSeconds());
    return output;
};

/**
 * Pad number with a zero if not two letters
 *
 * @param {number} number       The number
 * @return {string}             Returns padded string
 */
WorkerServer.prototype.padZero = function (number) {
    var output = String(number);
    if (output.length == 1)
        output = '0' + output;
    return output;
};

module.exports = WorkerServer;
