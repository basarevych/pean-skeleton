'use strict'

var locator = require('node-service-locator');
var request = require('supertest');
var q = require('q');
var app = require('../../../app.js');
var UserModel = require('../../../models/user');
var RoleModel = require('../../../models/role');

describe('/v1/profile route', function () {
    var config;
    var authUser = new UserModel({
        id: 42,
        name: 'name',
        email: 'email',
    });

    beforeEach(function () {
        config = locator.get('config');
        locator.register('logger', {
            log: function () {},
            trace: function () {},
            debug: function () {},
            info: function () {},
            warn: function () {},
            error: function () {},
        });
    });

    afterEach(function () {
        locator.register('user', undefined);
    });

    it('validates short passwords', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/profile/validate')
            .send({ _field: 'new_password', new_password: 'foo', retyped_password: 'foo' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('validates mistyped passwords', function (done) {
        locator.register('user', authUser);

        request(app)
            .post('/v1/profile/validate')
            .send({ _field: 'retyped_password', new_password: 'foobar1', retyped_password: 'foobar2' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.success).toBeFalsy();
            })
            .expect(200, done);
    });

    it('responds to anonymous', function (done) {
        request(app)
            .get('/v1/profile')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.locale).toEqual({
                    current: config['lang']['default'],
                    default: config['lang']['default'],
                    available: config['lang']['locales']
                });
                expect(res.body.authenticated).toBeFalsy();
                expect(res.body.roles).toEqual([]);
            })
            .expect(200, done);
    });

    it('responds to authenticated', function (done) {
        var searchedId;
        var role = new RoleModel({ handle: 'handle' });

        locator.register('user', authUser);
        locator.register('role-repository', {
            findByUserId: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ role ]);
                return defer.promise;
            },
        });

        request(app)
            .get('/v1/profile')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.locale).toEqual({
                    current: config['lang']['default'],
                    default: config['lang']['default'],
                    available: config['lang']['locales']
                });
                expect(searchedId).toBe(42);
                expect(res.body.authenticated).toBeTruthy();
                expect(res.body.name).toBe('name');
                expect(res.body.email).toBe('email');
                expect(res.body.roles).toEqual([ 'handle' ]);
            })
            .expect(200, done);
    });

    it('autoselects locale', function (done) {
        config['lang']['locales'] = [ 'en', 'ru' ];
        config['lang']['default'] = 'en';
        app.set('config', config);

        request(app)
            .get('/v1/profile')
            .set('Accept-Language', 'ru')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.locale.current).toEqual('ru');
            })
            .expect(200, done);
    });

    it('rejects unauthorized save', function (done) {
        request(app)
            .put('/v1/profile')
            .send({ name: 'Foo' })
            .set('Accept', 'application/json')
            .expect(401, done);
    });

    it('saves profile', function (done) {
        var foundUser = new UserModel();
        var savedUser;

        locator.register('user', authUser);
        locator.register('user-repository', {
            save: function (user) {
                savedUser = user;
                var defer = q.defer();
                defer.resolve([ savedUser ]);
                return defer.promise;
            },
        });

        request(app)
            .put('/v1/profile')
            .send({ name: 'Foo' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect({ success: true })
            .expect(function (res) {
                expect(savedUser.getName()).toBe('Foo');
            })
            .expect(200, done);
    });
});
