'use strict'

var locator = require('node-service-locator');
var request = require('supertest');
var q = require('q');
var moment = require('moment-timezone');
var app = require('../../../app.js');
var UserModel = require('../../../models/user');
var RoleModel = require('../../../models/role');
var PermissionModel = require('../../../models/permission');

describe('/v1/permission route', function () {
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
            .get('/v1/permission/table?query=data')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('describes table', function (done) {
        locator.register('user', authUser);
        locator.register('permission-repository', {
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
            .get('/v1/permission/table?query=describe')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
            })
            .expect(200, done);
    });

    it('renders table', function (done) {
        locator.register('user', authUser);
        locator.register('permission-repository', {
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
            .get('/v1/permission/table?query=data&filters={}&sort_column="id"&sort_dir="asc"&page_number=1&page_size=0')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
            })
            .expect(200, done);
    });

    it('protects validate', function (done) {
        request(app)
            .post('/v1/permission/validate')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('validates role_id', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/permission/validate')
            .send({ _field: 'role_id', role_id: '' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('protects LIST', function (done) {
        request(app)
            .get('/v1/permission')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('returns LIST', function (done) {
        var permission = new PermissionModel({
            id: 42,
            role_id: 9000,
            resource: 'res',
            action: 'act',
        });

        locator.register('user', authUser);
        locator.register('permission-repository', {
            findAll: function () {
                var defer = q.defer();
                defer.resolve([ permission ]);
                return defer.promise;
            },
        });

        request(app)
            .get('/v1/permission')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(Array.isArray(res.body)).toBeTruthy();
                expect(res.body[0].id).toBe(42);
                expect(res.body[0].role_id).toBe(9000);
                expect(res.body[0].resource).toBe('res');
                expect(res.body[0].action).toBe('act');
            })
            .expect(200, done);
    });

    it('protects READ', function (done) {
        request(app)
            .get('/v1/permission/1')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('returns READ', function (done) {
        var searchedId;
        var permission = new PermissionModel({
            id: 42,
            role_id: 9000,
            resource: 'res',
            action: 'act',
        });


        locator.register('user', authUser);
        locator.register('permission-repository', {
            find: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ permission ]);
                return defer.promise;
            },
        });

        request(app)
            .get('/v1/permission/1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId).toBe(1);
                expect(res.body.id).toBe(42);
                expect(res.body.role_id).toBe(9000);
                expect(res.body.resource).toBe('res');
                expect(res.body.action).toBe('act');
            })
            .expect(200, done);
    });

    it('protects CREATE', function (done) {
        request(app)
            .post('/v1/permission')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs CREATE', function (done) {
        var searchedRoleId, savedModel;
        var role = new RoleModel({ id: 42 });

        locator.register('user', authUser);
        locator.register('role-repository', {
            find: function (id) {
                searchedRoleId = id;
                var defer = q.defer();
                defer.resolve([ role ]);
                return defer.promise;
            },
        });
        locator.register('permission-repository', {
            save: function (model) {
                savedModel = model;
                var defer = q.defer();
                defer.resolve(42);
                return defer.promise;
            },
        });

        request(app)
            .post('/v1/permission')
            .send({
                role_id: 42,
                resource: 'res',
                action: 'act',
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
                expect(res.body.id).toBe(42);
                expect(searchedRoleId).toBe(42);
                expect(savedModel.getRoleId()).toBe(42);
                expect(savedModel.getResource()).toBe('res');
                expect(savedModel.getAction()).toBe('act');
            })
            .expect(200, done);
    });

    it('protects UPDATE', function (done) {
        request(app)
            .put('/v1/permission/1')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs UPDATE', function (done) {
        var searchedId, savedModel;
        var permission = new PermissionModel({ id: 42 });

        locator.register('user', authUser);
        locator.register('permission-repository', {
            find: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ permission ]);
                return defer.promise;
            },
            save: function (model) {
                savedModel = model;
                var defer = q.defer();
                defer.resolve(permission.getId());
                return defer.promise;
            },
        });

        request(app)
            .put('/v1/permission/1')
            .send({
                role_id: 9000,
                resource: 'res',
                action: 'act',
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId).toBe(1);
                expect(res.body.success).toBeTruthy();
                expect(savedModel.getId()).toBe(42);
                expect(savedModel.getRoleId()).toBe(9000);
                expect(savedModel.getResource()).toBe('res');
                expect(savedModel.getAction()).toBe('act');
            })
            .expect(200, done);
    });

    it('protects DELETE', function (done) {
        request(app)
            .delete('/v1/permission/1')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs DELETE', function (done) {
        var searchedId, deletedModel;
        var permission = new PermissionModel({ id: 42 });

        locator.register('user', authUser);
        locator.register('permission-repository', {
            find: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ permission ]);
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
            .delete('/v1/permission/1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId).toBe(1);
                expect(res.body.success).toBeTruthy();
                expect(deletedModel).toEqual(permission);
            })
            .expect(200, done);
    });

    it('protects DELETE ALL', function (done) {
        request(app)
            .delete('/v1/permission')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs DELETE ALL', function (done) {
        var allDeleted = false;

        locator.register('user', authUser);
        locator.register('permission-repository', {
            deleteAll: function () {
                allDeleted = true;
                var defer = q.defer();
                defer.resolve(1);
                return defer.promise;
            },
        });

        request(app)
            .delete('/v1/permission')
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
