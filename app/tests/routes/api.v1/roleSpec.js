'use strict'

var locator = require('node-service-locator');
var request = require('supertest');
var q = require('q');
var moment = require('moment-timezone');
var app = require('../../../app.js');
var UserModel = require('../../../models/user');
var RoleModel = require('../../../models/role');
var RoleTranslationModel = require('../../../models/role-translation');

describe('/v1/role route', function () {
    var config;
    var authUser = new UserModel({ id: 42 });
    var aclQueried;

    beforeEach(function () {
        config = locator.get('config');
        config['lang'] = {
            locales: [ 'en' ],
            default: 'en',
        };
        locator.register('config', config);

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
            .get('/v1/role/table?query=data')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('describes table', function (done) {
        locator.register('user', authUser);

        request(app)
            .get('/v1/role/table?query=describe')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
            })
            .expect(200, done);
    });

    it('renders table', function (done) {
        locator.register('user', authUser);
        locator.register('role-repository', {
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
            .get('/v1/role/table?query=data&filters={}&sort_column="id"&sort_dir="asc"&page_number=1&page_size=0')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
            })
            .expect(200, done);
    });

    it('protects validate', function (done) {
        request(app)
            .post('/v1/role/validate')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('validates parent_id', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/role/validate')
            .send({ _form_type: 'create', _field: 'parent_id', parent_id: '' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('validates handle', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/role/validate')
            .send({ _form_type: 'create', _field: 'handle', handle: '' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('validates translations', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/role/validate')
            .send({ _form_type: 'create', _field: 'translations', translations: 'foo' })
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
            .get('/v1/role')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('returns LIST', function (done) {
        var role = new RoleModel({
            id: 42,
            parent_id: null,
            handle: 'foo',
        });
        var roleTranslation = new RoleTranslationModel({
            id: 9000,
            role_id: 42,
            locale: 'en',
            title: 'bar',
        });

        locator.register('user', authUser);
        locator.register('role-repository', {
            findAll: function () {
                var defer = q.defer();
                defer.resolve([ role ]);
                return defer.promise;
            },
        });
        locator.register('role-translation-repository', {
            findAll: function () {
                var defer = q.defer();
                defer.resolve([ roleTranslation ]);
                return defer.promise;
            },
        });

        request(app)
            .get('/v1/role')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(Array.isArray(res.body)).toBeTruthy();
                expect(res.body[0].id).toBe(42);
                expect(res.body[0].parent_id).toBe(null);
                expect(res.body[0].handle).toBe('foo');
                expect(res.body[0].translations).toEqual({ en: { title: 'bar' }});
            })
            .expect(200, done);
    });

    it('protects READ', function (done) {
        request(app)
            .get('/v1/role/1')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('returns READ', function (done) {
        var searchedId1, searchedId2;
        var role = new RoleModel({
            id: 42,
            parent_id: null,
            handle: 'foo',
        });
        var roleTranslation = new RoleTranslationModel({
            id: 9000,
            role_id: 42,
            locale: 'en',
            title: 'bar',
        });

        locator.register('user', authUser);
        locator.register('role-repository', {
            find: function (id) {
                searchedId1 = id
                var defer = q.defer();
                defer.resolve([ role ]);
                return defer.promise;
            },
        });
        locator.register('role-translation-repository', {
            findByRoleId: function (id) {
                searchedId2 = id;
                var defer = q.defer();
                defer.resolve([ roleTranslation ]);
                return defer.promise;
            },
        });

        request(app)
            .get('/v1/role/1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId1).toBe(1);
                expect(searchedId2).toBe(1);
                expect(res.body.id).toBe(42);
                expect(res.body.parent_id).toBe(null);
                expect(res.body.handle).toBe('foo');
                expect(res.body.translations).toEqual({ en: { title: 'bar' }});
            })
            .expect(200, done);
    });

    it('protects CREATE', function (done) {
        request(app)
            .post('/v1/role')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs CREATE', function (done) {
        var searchedHandle, savedRole, savedTranslation;

        locator.register('user', authUser);
        locator.register('role-repository', {
            findByHandle: function (handle) {
                searchedHandle = handle;
                var defer = q.defer();
                defer.resolve([]);
                return defer.promise;
            },
            save: function (model) {
                savedRole = model;
                var defer = q.defer();
                defer.resolve(42);
                return defer.promise;
            },
        });
        locator.register('role-translation-repository', {
            save: function (model) {
                savedTranslation = model;
                var defer = q.defer();
                defer.resolve(9000);
                return defer.promise;
            },
        });

        request(app)
            .post('/v1/role')
            .send({
                parent_id: null,
                handle: 'foo',
                translations: {
                    en: {
                        title: 'bar',
                    },
                },
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedHandle).toBe('foo');
                expect(res.body.success).toBeTruthy();
                expect(res.body.id).toBe(42);
                expect(savedRole.getParentId()).toBe(null);
                expect(savedRole.getHandle()).toBe('foo');
                expect(savedTranslation.getLocale()).toBe('en');
                expect(savedTranslation.getTitle()).toBe('bar');
            })
            .expect(200, done);
    });

    it('protects UPDATE', function (done) {
        request(app)
            .put('/v1/role/1')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs UPDATE', function (done) {
        var searchedId1, searchedId2, searchedHandle, savedRole, savedTranslation;
        var role = new RoleModel({
            id: 42,
            parent_id: null,
            handle: 'foo',
        });
        var roleTranslation = new RoleTranslationModel({
            id: 9000,
            role_id: 42,
            locale: 'en',
            title: 'bar',
        });

        locator.register('user', authUser);
        locator.register('role-repository', {
            find: function (id) {
                searchedId1 = id
                var defer = q.defer();
                defer.resolve([ role ]);
                return defer.promise;
            },
            findByHandle: function (handle) {
                searchedHandle = handle;
                var defer = q.defer();
                defer.resolve([]);
                return defer.promise;
            },
            save: function (model) {
                savedRole = model;
                var defer = q.defer();
                defer.resolve(42);
                return defer.promise;
            },
        });
        locator.register('role-translation-repository', {
            findByRoleId: function (id) {
                searchedId2 = id;
                var defer = q.defer();
                defer.resolve([ roleTranslation ]);
                return defer.promise;
            },
            save: function (model) {
                savedTranslation = model;
                var defer = q.defer();
                defer.resolve(9000);
                return defer.promise;
            },
        });

        request(app)
            .put('/v1/role/1')
            .send({
                parent_id: null,
                handle: 'foo',
                translations: {
                    en: {
                        title: 'bar',
                    },
                },
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId1).toBe(1);
                expect(searchedId2).toBe(1);
                expect(searchedHandle).toBe('foo');
                expect(res.body.success).toBeTruthy();
                expect(savedRole.getParentId()).toBe(null);
                expect(savedRole.getHandle()).toBe('foo');
                expect(savedTranslation.getLocale()).toBe('en');
                expect(savedTranslation.getTitle()).toBe('bar');
            })
            .expect(200, done);
    });

    it('protects DELETE', function (done) {
        request(app)
            .delete('/v1/role/1')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs DELETE', function (done) {
        var searchedId, deletedModel;
        var role = new RoleModel({ id: 42 });

        locator.register('user', authUser);
        locator.register('role-repository', {
            find: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ role ]);
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
            .delete('/v1/role/1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId).toBe(1);
                expect(res.body.success).toBeTruthy();
                expect(deletedModel).toEqual(role);
            })
            .expect(200, done);
    });

    it('protects DELETE ALL', function (done) {
        request(app)
            .delete('/v1/role')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs DELETE ALL', function (done) {
        var allDeleted = false;

        locator.register('user', authUser);
        locator.register('role-repository', {
            deleteAll: function () {
                allDeleted = true;
                var defer = q.defer();
                defer.resolve(1);
                return defer.promise;
            },
        });

        request(app)
            .delete('/v1/role')
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
