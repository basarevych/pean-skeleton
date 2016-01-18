'use strict'

var locator = require('node-service-locator');
var request = require('supertest');
var q = require('q');
var moment = require('moment-timezone');
var app = require('../../app.js');
var UserModel = require('../../models/user');
var NotificationModel = require('../../models/notification');

describe('/v1/notification route', function () {
    var config;
    var authUser = new UserModel({ id: 42 });
    var aclQueried;

    beforeEach(function () {
        config = locator.get('config');
        aclQueried = false;
        locator.register('logger', {
            log: function () {},
            trace: function () {},
            debug: function () {},
            info: function () {},
            warn: function () {},
            error: function () {},
        });
        locator.register('acl', {
            isAllowed: function () {
                aclQueried = true;
                var defer = q.defer();
                defer.resolve(true);
                return defer.promise;
            },
        });
    });

    afterEach(function () {
        locator.register('user', undefined);
    });

    it('protects CREATE', function (done) {
        request(app)
            .post('/v1/notification')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs CREATE', function (done) {
        var savedNotification;

        locator.register('user', authUser);
        locator.register('notification-repository', {
            save: function (model) {
                savedNotification = model;
                var defer = q.defer();
                defer.resolve(42);
                return defer.promise;
            },
        });

        request(app)
            .post('/v1/notification')
            .send({
                text: 'foo',
                title: 'bar',
                icon: 'baz',
                variables: { test: "test" },
                user_id: 1,
                role_id: 2,
                scheduled_for: null,
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
                expect(savedNotification.getText()).toBe('foo');
                expect(savedNotification.getTitle()).toBe('bar');
                expect(savedNotification.getIcon()).toBe('baz');
                expect(savedNotification.getVariables()).toEqual({ test: "test" });
                expect(savedNotification.getUserId()).toBe('1');
                expect(savedNotification.getRoleId()).toBe('2');
            })
            .expect(200, done);
    });

    it('runs delayed CREATE', function (done) {
        var savedJob;

        locator.register('user', authUser);
        locator.register('job-repository', {
            save: function (model) {
                savedJob = model;
                var defer = q.defer();
                defer.resolve(42);
                return defer.promise;
            },
        });

        var data = {
            id: null,
            text: 'foo',
            title: 'bar',
            icon: 'baz',
            variables: { test: "test" },
            user_id: '1',
            role_id: '2',
            scheduled_for: 123,
        };
        request(app)
            .post('/v1/notification')
            .send(data)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
                expect(savedJob.getName()).toBe('notify');
                expect(savedJob.getStatus()).toBe('created');
                expect(savedJob.getScheduledFor()).toEqual(moment.unix(123));
                expect(savedJob.getValidUntil()).toEqual(moment.unix(123).add(5, 'minutes'));
                expect(savedJob.getInputData()).toEqual(new NotificationModel(data).data());
                expect(savedJob.getOutputData()).toEqual({});
            })
            .expect(200, done);
    });
});
