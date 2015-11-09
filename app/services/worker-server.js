/**
 * Job Server
 */

'use strict';

var locator = require('node-service-locator');
var jwt = require('jsonwebtoken');
var path = require('path');
var fs = require('fs');

function WorkerServer() {
    this.timer = null;
};

WorkerServer.prototype.setTimer = function (timer) {
    this.timer = timer;
    return this;
};

WorkerServer.prototype.getTimer = function () {
    return this.timer;
};

WorkerServer.prototype.cancelTimer = function () {
    if (!this.timer)
        return;

    clearTimeout(this.timer);
    this.setTimer(null);
};

WorkerServer.prototype.start = function () {
    var me = this;
    var logger = locator.get('logger');

    var jobRepo = locator.get('job-repository');
    var subscriber = jobRepo.getRedis();
    subscriber.on("message", function (channel, message) {
        switch (channel) {
            case process.env.PROJECT + ":jobs":
                me.work();
                break;
        }
    });
    subscriber.subscribe(process.env.PROJECT + ":jobs");
};

WorkerServer.prototype.work = function () {
    var me = this;
    var logger = locator.get('logger');

    this.cancelTimer();

    var jobRepo = locator.get('job-repository');
    jobRepo.processNewJobs()
        .then(function (result) {
            result.expired.forEach(function (job) {
                console.log('-> Expired #' + job.getId() + ': ' + job.getName());
            });
            result.started.forEach(function (job) {
                console.log('-> Started #' + job.getId() + ': ' + job.getName());
                me.doJob(job);
            });
        })
        .catch(function (err) {
            logger.error('WorkerServer.work() - jobRepo.processNewJobs', err);
        });
};

WorkerServer.prototype.doJob = function (job) {
    var logger = locator.get('logger');

    var dir = path.join(__dirname, '..', 'jobs');
    try {
        require(dir + '/' + job.getName())(job);
        console.log('-> Finished #' + job.getId() + ': ' + job.getName());
    } catch (e) {
        console.log('-> Failed #' + job.getId() + ': ' + job.getName());

        job.setStatus('failure');
        job.setOutputData({ error: e });

        var jobRepo = locator.get('job-repository');
        jobRepo.save(job);
    }
};

module.exports = WorkerServer;
