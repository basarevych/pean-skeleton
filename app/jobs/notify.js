/**
 * Send web-interface notification job
 */

'use strict'

var locator = require('node-service-locator');
var NotificationModel = locator.get('notification-model');

module.exports = function (job) {
    var logger = locator.get('logger');

    var jobRepo = locator.get('job-repository');
    var notificationRepo = locator.get('notification-repository');
    var notification = new NotificationModel(job.getInputData());

    return notificationRepo.save(notification)
        .then(function (id) {
            if (id === null) {
                job.setStatus('failure');
                job.setOutputData({ error: 'NotificationRepository.save() failed' });
            } else {
                job.setStatus('success');
                job.setOutputData({});
            }
            return jobRepo.save(job);
        })
        .catch(function (err) {
            job.setStatus('failure');
            job.setOutputData({ error: err });
            return jobRepository.save(job);
        });
};
