'use strict'

var locator = require('node-service-locator');
var request = require('supertest');
var q = require('q');
var moment = require('moment-timezone');
var app = require('../../../app.js');
var BaseModel = require('../../../models/base');
var UserModel = require('../../../models/user');
var RoleModel = require('../../../models/role');

describe('/v1/user route', function () {
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
            .get('/v1/user/table?query=data')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('describes table', function (done) {
        locator.register('user', authUser);
        locator.register('user-repository', {
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
            .get('/v1/user/table?query=describe')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
            })
            .expect(200, done);
    });

    it('renders table', function (done) {
        locator.register('user', authUser);
        locator.register('user-repository', {
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
            .get('/v1/user/table?query=data&filters={}&sort_column="id"&sort_dir="asc"&page_number=1&page_size=0')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
            })
            .expect(200, done);
    });

    it('protects validate', function (done) {
        request(app)
            .post('/v1/user/validate')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('validates email', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/user/validate')
            .send({ _form_type: 'create', _field: 'email', email: 'foo' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('validates password', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/user/validate')
            .send({ _form_type: 'create', _field: 'password', password: '' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('validates retyped_password', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/user/validate')
            .send({ _form_type: 'create', _field: 'retyped_password', retyped_password: '' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('validates roles', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/user/validate')
            .send({ _form_type: 'create', _field: 'roles', roles: '' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('protects search', function (done) {
        request(app)
            .post('/v1/user/search')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('searches by email', function (done) {
        var utcCreated = moment.unix(123);
        var localCreated = moment.tz(utcCreated.format(BaseModel.DATETIME_FORMAT), 'UTC').local();

        var searchedId, searchedEmail, searchedLimit;
        var user = new UserModel({
            id: 42,
            name: 'foo',
            email: 'bar',
            password: UserModel.encryptPassword('baz'),
            created_at: utcCreated,
        });
        var role = new RoleModel({
            id: 9000,
            parent_id: null,
            handle: 'foo',
        });

        locator.register('user', authUser);
        locator.register('user-repository', {
            searchByEmail: function (email, limit) {
                searchedEmail = email;
                searchedLimit = limit;
                var defer = q.defer();
                defer.resolve([ user ]);
                return defer.promise;
            },
        });
        locator.register('role-repository', {
            findByUserId: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ role ]);
                return defer.promise;
            },
        });

        request(app)
            .post('/v1/user/search')
            .send({
                criteria: 'email',
                limit: 10,
                search: 'foobar',
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId).toBe(42);
                expect(searchedEmail).toBe('foobar');
                expect(searchedLimit).toBe(10);
                expect(Array.isArray(res.body)).toBeTruthy();
                expect(res.body[0].id).toBe(42);
                expect(res.body[0].name).toBe('foo');
                expect(res.body[0].email).toBe('bar');
                expect(res.body[0].created_at).toBe(localCreated.unix());
                expect(res.body[0].roles).toEqual([ 9000 ]);
            })
            .expect(200, done);
    });

    it('protects LIST', function (done) {
        request(app)
            .get('/v1/user')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('returns LIST', function (done) {
        var utcCreated = moment.unix(123);
        var localCreated = moment.tz(utcCreated.format(BaseModel.DATETIME_FORMAT), 'UTC').local();

        var searchedId;
        var user = new UserModel({
            id: 42,
            name: 'foo',
            email: 'bar',
            password: UserModel.encryptPassword('baz'),
            created_at: utcCreated,
        });
        var role = new RoleModel({
            id: 9000,
            parent_id: null,
            handle: 'foo',
        });

        locator.register('user', authUser);
        locator.register('user-repository', {
            findAll: function () {
                var defer = q.defer();
                defer.resolve([ user ]);
                return defer.promise;
            },
        });
        locator.register('role-repository', {
            findByUserId: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ role ]);
                return defer.promise;
            },
        });

        request(app)
            .get('/v1/user')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId).toBe(42);
                expect(Array.isArray(res.body)).toBeTruthy();
                expect(res.body[0].id).toBe(42);
                expect(res.body[0].name).toBe('foo');
                expect(res.body[0].email).toBe('bar');
                expect(res.body[0].created_at).toBe(localCreated.unix());
                expect(res.body[0].roles).toEqual([ 9000 ]);
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
        var utcCreated = moment.unix(123);
        var localCreated = moment.tz(utcCreated.format(BaseModel.DATETIME_FORMAT), 'UTC').local();

        var searchedId1, searchedId2;
        var user = new UserModel({
            id: 42,
            name: 'foo',
            email: 'bar',
            password: UserModel.encryptPassword('baz'),
            created_at: utcCreated,
        });
        var role = new RoleModel({
            id: 9000,
            parent_id: null,
            handle: 'foo',
        });

        locator.register('user', authUser);
        locator.register('user-repository', {
            find: function (id) {
                searchedId1 = id;
                var defer = q.defer();
                defer.resolve([ user ]);
                return defer.promise;
            },
        });
        locator.register('role-repository', {
            findByUserId: function (id) {
                searchedId2 = id;
                var defer = q.defer();
                defer.resolve([ role ]);
                return defer.promise;
            },
        });

        request(app)
            .get('/v1/user/1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId1).toBe(1);
                expect(searchedId2).toBe(1);
                expect(res.body.id).toBe(42);
                expect(res.body.name).toBe('foo');
                expect(res.body.email).toBe('bar');
                expect(res.body.created_at).toBe(localCreated.unix());
                expect(res.body.roles).toEqual([ 9000 ]);
            })
            .expect(200, done);
    });

    it('protects CREATE', function (done) {
        request(app)
            .post('/v1/user')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs CREATE', function (done) {
        var savedModel, addedUser, addedRole;

        var role = new RoleModel({
            id: 9000,
            parent_id: null,
            handle: 'foo',
        });

        locator.register('user', authUser);
        locator.register('user-repository', {
            findByEmail: function (email) {
                var defer = q.defer();
                defer.resolve([]);
                return defer.promise;
            },
            save: function (model) {
                savedModel = model;
                var defer = q.defer();
                defer.resolve(42);
                return defer.promise;
            },
            addRole: function (userModel, roleModel) {
                addedUser = userModel;
                addedRole = roleModel;
                var defer = q.defer();
                defer.resolve(1);
                return defer.promise;
            },
        });
        locator.register('role-repository', {
            findAll: function () {
                var defer = q.defer();
                defer.resolve([ role ]);
                return defer.promise;
            },
        });

        request(app)
            .post('/v1/user')
            .send({
                name: 'foo',
                email: 'bar@example.com',
                password: 'passwd',
                retyped_password: 'passwd',
                roles: [ 9000 ],
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(res.body.success).toBeTruthy();
                expect(res.body.id).toBe(42);
                expect(savedModel.getName()).toBe('foo');
                expect(savedModel.getEmail()).toBe('bar@example.com');
                expect(savedModel.checkPassword('passwd')).toBeTruthy();
                expect(addedUser).toEqual(savedModel);
                expect(addedRole).toEqual(role);
            })
            .expect(200, done);
    });

    it('protects UPDATE', function (done) {
        request(app)
            .put('/v1/user/1')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs UPDATE', function (done) {
        var searchedId, savedModel, addedUser, addedRole, removedUser, removedRole;
        var user = new UserModel({ id: 42 });
        var role1 = new RoleModel({
            id: 9000,
            parent_id: null,
            handle: 'foo',
        });
        var role2 = new RoleModel({
            id: 9001,
            parent_id: null,
            handle: 'bar',
        });


        locator.register('user', authUser);
        locator.register('user-repository', {
            find: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ user ]);
                return defer.promise;
            },
            findByEmail: function (email) {
                var defer = q.defer();
                defer.resolve([]);
                return defer.promise;
            },
            save: function (model) {
                savedModel = model;
                var defer = q.defer();
                defer.resolve(user.getId());
                return defer.promise;
            },
            addRole: function (userModel, roleModel) {
                addedUser = userModel;
                addedRole = roleModel;
                var defer = q.defer();
                defer.resolve(1);
                return defer.promise;
            },
            removeRole: function (userModel, roleModel) {
                removedUser = userModel;
                removedRole = roleModel;
                var defer = q.defer();
                defer.resolve(1);
                return defer.promise;
            },
        });
        locator.register('role-repository', {
            findAll: function () {
                var defer = q.defer();
                defer.resolve([ role1, role2 ]);
                return defer.promise;
            },
        });


        request(app)
            .put('/v1/user/1')
            .send({
                name: 'foo',
                email: 'bar@example.com',
                password: 'passwd',
                retyped_password: 'passwd',
                roles: [ 9000 ],
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId).toBe(1);
                expect(res.body.success).toBeTruthy();
                expect(savedModel.getName()).toBe('foo');
                expect(savedModel.getEmail()).toBe('bar@example.com');
                expect(savedModel.checkPassword('passwd')).toBeTruthy();
                expect(addedUser).toEqual(savedModel);
                expect(addedRole).toEqual(role1);
                expect(removedUser).toEqual(savedModel);
                expect(removedRole).toEqual(role2);
            })
            .expect(200, done);
    });

    it('protects DELETE', function (done) {
        request(app)
            .delete('/v1/user/1')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs DELETE', function (done) {
        var searchedId, deletedModel;
        var user = new UserModel({ id: 42 });

        locator.register('user', authUser);
        locator.register('user-repository', {
            find: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ user ]);
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
            .delete('/v1/user/1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(aclQueried).toBeTruthy();
                expect(searchedId).toBe(1);
                expect(res.body.success).toBeTruthy();
                expect(deletedModel).toEqual(user);
            })
            .expect(200, done);
    });

    it('protects DELETE ALL', function (done) {
        request(app)
            .delete('/v1/user')
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('runs DELETE ALL', function (done) {
        var allDeleted = false;

        locator.register('user', authUser);
        locator.register('user-repository', {
            deleteAll: function () {
                allDeleted = true;
                var defer = q.defer();
                defer.resolve(1);
                return defer.promise;
            },
        });

        request(app)
            .delete('/v1/user')
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
