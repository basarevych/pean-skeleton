'use strict'

var locator = require('node-service-locator');
var request = require('supertest');
var q = require('q');
var app = require('../../app.js');
var UserModel = require('../../models/user');

describe('/v1/profile route', function () {
    var config;

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

    it('responds to GET', function (done) {
        request(app)
            .get('/v1/profile')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.locale).toEqual({
                    current: config['lang']['default'],
                    default: config['lang']['default'],
                    available: config['lang']['locales']
                });
                expect(res.body.user_id).toBeNull();
                expect(res.body.roles).toEqual([]);
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
        var authUser = new UserModel();
        authUser.setId(42);
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

    it('validates', function (done) {
        request(app)
            .post('/v1/profile/validate')
            .send({ _field: 'new_password', new_password: 'foo', retyped_password: 'bar' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.success).toBe(false);
            })
            .expect(200, done);

        request(app)
            .post('/v1/profile/validate')
            .send({ _field: 'new_password', new_password: 'foo', retyped_password: 'foo' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.success).toBe(false);
            })
            .expect(200, done);

        request(app)
            .post('/v1/profile/validate')
            .send({ _field: 'new_password', new_password: 'foobar', retyped_password: 'foobar' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.success).toBe(true);
            })
            .expect(200, done);
    });
});
