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

WorkerServer.INTERVAL = 10000;

WorkerServer.prototype.startTimer = function () {
    if (this.timer)
        return;

    var me = this;
    this.timer = setInterval(function () { me.work(); }, WorkerServer.INTERVAL);
};

WorkerServer.prototype.cancelTimer = function () {
    if (!this.timer)
        return;

    clearInterval(this.timer);
    this.timer = null;
};

WorkerServer.prototype.start = function () {
    var me = this;
    var logger = locator.get('logger');

    var jobRepo = locator.get('job-repository');
    jobRepo.restartInterrupted()
        .then(function () {
            var subscriber = jobRepo.getRedis();
            subscriber.on("message", function (channel, message) {
                switch (channel) {
                    case process.env.PROJECT + ":jobs":
                        me.cancelTimer();
                        me.work();
                        break;
                }
            });
            subscriber.subscribe(process.env.PROJECT + ":jobs");

            me.work();
        })
        .catch(function (err) {
            logger.error('WorkerServer.start() - jobRepo.restartInterrupted', err);
        });
};

WorkerServer.prototype.work = function () {
    var me = this;
    var logger = locator.get('logger');

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

    this.startTimer();
};

WorkerServer.prototype.doJob = function (job) {
    var logger = locator.get('logger');

    var dir = path.join(__dirname, '..', 'jobs');
    try {
        require(dir + '/' + job.getName())(job);
        console.log('-> Executing #' + job.getId() + ': ' + job.getName());
    } catch (e) {
        console.log('-> Failed #' + job.getId() + ': ' + job.getName());

        job.setStatus('failure');
        job.setOutputData({ error: e });

        var jobRepo = locator.get('job-repository');
        jobRepo.save(job)
            .catch(function (err) {
                logger.error('WorkerServer.doJob() - jobRepo.save()', err);
            });
    }
};

module.exports = WorkerServer;
