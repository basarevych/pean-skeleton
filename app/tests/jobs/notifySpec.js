'use strict'

process.env.PROJECT = 'node';
delete require.cache[require.resolve('../../app.js')];

var locator = require('node-service-locator');
var request = require('supertest');
var q = require('q');
var moment = require('moment-timezone');
var app = require('../../app.js');
var Job = require('../../jobs/notify');
var JobModel = require('../../models/job');
var NotificationModel = require('../../models/notification');

describe('Node notify job', function () {
    var config;
    var model;

    beforeEach(function () {
        process.env.PROJECT = 'node';
        config = locator.get('config');

        locator.register('logger', {
            log: function () {},
            trace: function () {},
            debug: function () {},
            info: function () {},
            warn: function () {},
            error: function () {},
        });

        model = new JobModel();
        model.setName('notify');
        model.setQueue('queue');
        model.setStatus('created');
        model.setCreatedAt(moment());
        model.setScheduledFor(moment());
        model.setValidUntil(moment().add(5, 'days'));
        model.setInputData({});
        model.setOutputData({});
    });

    afterEach(function () {
    });

    it('works', function (done) {
        var notification = new NotificationModel();
        notification.setId('id');
        notification.setText('text');
        notification.setTitle('title');
        notification.setIcon('icon');
        notification.setVariables({ foo: 'bar' });
        notification.setUserId(42);
        notification.setRoleId(9000);
        model.setInputData(notification.data());

        var savedNotification;
        locator.register('notification-repository', {
            save: function (model) {
                savedNotification = model;
                var defer = q.defer();
                defer.resolve('resolved_id');
                return defer.promise;
            },
        });

        var savedJob;
        locator.register('job-repository', {
            save: function (model) {
                expect(model.getStatus()).toBe('success');
                expect(savedNotification.data()).toEqual(notification.data());
                done();
            },
        });

        Job(model);
    });
});
