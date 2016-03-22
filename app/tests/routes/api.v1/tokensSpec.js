'use strict'

var locator = require('node-service-locator');
var request = require('supertest');
var q = require('q');
var moment = require('moment-timezone');
var app = require('../../../app.js');
var BaseModel = require('../../../models/base');
var UserModel = require('../../../models/user');
var TokenModel = require('../../../models/token');

describe('/v1/tokens route', function () {
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

    it('protects table', function (done) {
        request(app)
            .get('/v1/tokens/table?user_id=1&query=data')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('describes table', function (done) {
        locator.register('user', authUser);
        locator.register('token-repository', {
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
            .get('/v1/tokens/table?user_id=1&query=describe')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
            })
            .expect(200, done);
    });

    it('renders table', function (done) {
        locator.register('user', authUser);
        locator.register('token-repository', {
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
            .get('/v1/tokens/table?user_id=1&query=data&filters={}&sort_column="id"&sort_dir="asc"&page_number=1&page_size=0')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
            })
            .expect(200, done);
    });

    it('protects LIST', function (done) {
        request(app)
            .get('/v1/tokens')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('returns LIST', function (done) {
        var utcCreated = moment.unix(123);
        var localCreated = moment.tz(utcCreated.format(BaseModel.DATETIME_FORMAT), 'UTC').local();
        var utcUpdated = moment.unix(456);
        var localUpdated = moment.tz(utcUpdated.format(BaseModel.DATETIME_FORMAT), 'UTC').local();

        var token = new TokenModel({
            id: 42,
            user_id: 9000,
            payload: { test: "test" },
            ip_address: 'foo',
            created_at: utcCreated,
            updated_at: utcUpdated,
        });

        locator.register('user', authUser);
        locator.register('token-repository', {
            findAll: function () {
                var defer = q.defer();
                defer.resolve([ token ]);
                return defer.promise;
            },
        });

        request(app)
            .get('/v1/tokens')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(Array.isArray(res.body)).toBeTruthy();
                expect(res.body[0].id).toBe(42);
                expect(res.body[0].user_id).toBe(9000);
                expect(res.body[0].payload).toEqual({ test: "test" });
                expect(res.body[0].ip_address).toBe('foo');
                expect(res.body[0].created_at).toBe(localCreated.unix());
                expect(res.body[0].updated_at).toBe(localUpdated.unix());
            })
            .expect(200, done);
    });

    it('protects READ', function (done) {
        request(app)
            .get('/v1/tokens/1')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('returns READ', function (done) {
        var searchedId;
        var utcCreated = moment.unix(123);
        var localCreated = moment.tz(utcCreated.format(BaseModel.DATETIME_FORMAT), 'UTC').local();
        var utcUpdated = moment.unix(456);
        var localUpdated = moment.tz(utcUpdated.format(BaseModel.DATETIME_FORMAT), 'UTC').local();

        var token = new TokenModel({
            id: 42,
            user_id: 9000,
            payload: { test: "test" },
            ip_address: 'foo',
            created_at: utcCreated,
            updated_at: utcUpdated,
        });

        locator.register('user', authUser);
        locator.register('token-repository', {
            find: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ token ]);
                return defer.promise;
            },
        });

        request(app)
            .get('/v1/tokens/1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId).toBe(1);
                expect(res.body.id).toBe(42);
                expect(res.body.user_id).toBe(9000);
                expect(res.body.payload).toEqual({ test: "test" });
                expect(res.body.ip_address).toBe('foo');
                expect(res.body.created_at).toBe(localCreated.unix());
                expect(res.body.updated_at).toBe(localUpdated.unix());
            })
            .expect(200, done);
    });

    it('protects DELETE', function (done) {
        request(app)
            .delete('/v1/tokens/1')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs DELETE', function (done) {
        var searchedId, deletedModel;
        var token = new TokenModel({ id: 42 });

        locator.register('user', authUser);
        locator.register('token-repository', {
            find: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ token ]);
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
            .delete('/v1/tokens/1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId).toBe(1);
                expect(res.body.success).toBeTruthy();
                expect(deletedModel).toEqual(token);
            })
            .expect(200, done);
    });

    it('protects DELETE ALL', function (done) {
        request(app)
            .delete('/v1/tokens')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs DELETE ALL', function (done) {
        var allDeleted = false;

        locator.register('user', authUser);
        locator.register('token-repository', {
            deleteAll: function () {
                allDeleted = true;
                var defer = q.defer();
                defer.resolve(1);
                return defer.promise;
            },
        });

        request(app)
            .delete('/v1/tokens')
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
