'use strict'

var locator = require('node-service-locator');
var request = require('supertest');
var q = require('q');
var moment = require('moment-timezone');
var app = require('../../app.js');
var UserModel = require('../../models/user');
var JobModel = require('../../models/job');

describe('/v1/job route', function () {
    var config;
    var authUser = new UserModel({ id: 42 });
    var aclQueried;

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

    beforeEach(function () {
        config = locator.get('config');
        aclQueried = false;
    });

    afterEach(function () {
        locator.register('user', undefined);
    });

    it('protects table', function (done) {
        request(app)
            .get('/v1/job/table?query=data')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('describes table', function (done) {
        locator.register('user', authUser);

        request(app)
            .get('/v1/job/table?query=describe')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
            })
            .expect(200, done);
    });

    it('renders table', function (done) {
        locator.register('user', authUser);
        locator.register('job-repository', {
            getPostgres: function () {
                return {
                    connect: function (cb) {
                        cb();
                    },
                    query: function (sql, params, cb) {
                        cb(null, {
                            rows: [
                                { count: 0 },
                            ]
                        });
                    },
                    end: function () {},
                };
            },
        });

        request(app)
            .get('/v1/job/table?query=data&filters={}&sort_column="id"&sort_dir="asc"&page_number=1&page_size=0')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
            })
            .expect(200, done);
    });

    it('protects validate', function (done) {
        request(app)
            .post('/v1/job/validate')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('validates name', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/job/validate')
            .send({ _field: 'name', name: '' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('validates status', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/job/validate')
            .send({ _field: 'status', status: '' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('validates scheduled_for', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/job/validate')
            .send({ _field: 'scheduled_for', scheduled_for: 'abc' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('validates valid_until', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/job/validate')
            .send({ _field: 'valid_until', valid_until: 'abc' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('validates input_data', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/job/validate')
            .send({ _field: 'input_data', input_data: '*' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('protects statuses', function (done) {
        request(app)
            .get('/v1/job/statuses')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('returns statuses', function (done) {
        locator.register('user', authUser);

        request(app)
            .get('/v1/job/statuses')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(Array.isArray(res.body)).toBeTruthy();
            })
            .expect(200, done);
    });

    it('protects LIST', function (done) {
        request(app)
            .get('/v1/job')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('returns LIST', function (done) {
        var job1 = new JobModel({ id: 42 });
        var job2 = new JobModel({ id: 43 });

        locator.register('user', authUser);
        locator.register('job-repository', {
            findAll: function () {
                var defer = q.defer();
                defer.resolve([ job1, job2 ]);
                return defer.promise;
            },
        });

        request(app)
            .get('/v1/job')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(Array.isArray(res.body)).toBeTruthy();
                expect(res.body[0].id).toBe(42);
                expect(res.body[1].id).toBe(43);
            })
            .expect(200, done);
    });

    it('protects READ', function (done) {
        request(app)
            .get('/v1/job/1')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('returns READ', function (done) {
        var searchedId;
        var job = new JobModel({ id: 42 });

        locator.register('user', authUser);
        locator.register('job-repository', {
            find: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ job ]);
                return defer.promise;
            },
        });

        request(app)
            .get('/v1/job/1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId).toBe(1);
                expect(res.body.id).toBe(job.getId());
            })
            .expect(200, done);
    });

    it('protects CREATE', function (done) {
        request(app)
            .post('/v1/job')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs CREATE', function (done) {
        var savedModel;

        locator.register('user', authUser);
        locator.register('job-repository', {
            save: function (model) {
                savedModel = model;
                var defer = q.defer();
                defer.resolve(42);
                return defer.promise;
            },
        });

        request(app)
            .post('/v1/job')
            .send({
                name: 'foo',
                queue: 'bar',
                status: 'created',
                scheduled_for: 123,
                valid_until: 456,
                input_data: '{ "test": "baz" }',
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
                expect(res.body.id).toBe(42);
                expect(savedModel.getName()).toBe('foo');
                expect(savedModel.getQueue()).toBe('bar');
                expect(savedModel.getStatus()).toBe('created');
                expect(savedModel.getScheduledFor()).toEqual(moment.unix(123));
                expect(savedModel.getValidUntil()).toEqual(moment.unix(456));
                expect(savedModel.getInputData()).toEqual({ "test": "baz" });
            })
            .expect(200, done);
    });

    it('protects UPDATE', function (done) {
        request(app)
            .put('/v1/job/1')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs UPDATE', function (done) {
        var searchedId, savedModel;
        var job = new JobModel({ id: 42 });

        locator.register('user', authUser);
        locator.register('job-repository', {
            find: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ job ]);
                return defer.promise;
            },
            save: function (model) {
                savedModel = model;
                var defer = q.defer();
                defer.resolve(job.getId());
                return defer.promise;
            },
        });

        request(app)
            .put('/v1/job/1')
            .send({
                name: 'foo',
                queue: 'bar',
                status: 'created',
                scheduled_for: 123,
                valid_until: 456,
                input_data: '{ "test": "baz" }',
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId).toBe(1);
                expect(res.body.success).toBeTruthy();
                expect(savedModel.getId()).toBe(42);
                expect(savedModel.getName()).toBe('foo');
                expect(savedModel.getQueue()).toBe('bar');
                expect(savedModel.getStatus()).toBe('created');
                expect(savedModel.getScheduledFor()).toEqual(moment.unix(123));
                expect(savedModel.getValidUntil()).toEqual(moment.unix(456));
                expect(savedModel.getInputData()).toEqual({ "test": "baz" });
            })
            .expect(200, done);
    });

    it('protects DELETE', function (done) {
        request(app)
            .delete('/v1/job/1')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs DELETE', function (done) {
        var searchedId, deletedModel;
        var job = new JobModel({ id: 42 });

        locator.register('user', authUser);
        locator.register('job-repository', {
            find: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ job ]);
                return defer.promise;
            },
            delete: function (model) {
                deletedModel = model;
                var defer = q.defer();
                defer.resolve(1);
                return defer.promise;
            },
        });

        request(app)
            .delete('/v1/job/1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId).toBe(1);
                expect(res.body.success).toBeTruthy();
                expect(deletedModel).toEqual(job);
            })
            .expect(200, done);
    });

    it('protects DELETE ALL', function (done) {
        request(app)
            .delete('/v1/job')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs DELETE ALL', function (done) {
        var allDeleted = false;

        locator.register('user', authUser);
        locator.register('job-repository', {
            deleteAll: function () {
                allDeleted = true;
                var defer = q.defer();
                defer.resolve(1);
                return defer.promise;
            },
        });

        request(app)
            .delete('/v1/job')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(allDeleted).toBeTruthys
                expect(res.body.success).toBeTruthy();
            })
            .expect(200, done);
    });
});
