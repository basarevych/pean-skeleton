'use strict'

var locator = require('node-service-locator');
var request = require('supertest');
var q = require('q');
var app = require('../../../app.js');
var UserModel = require('../../../app/models/user');

describe('Profile route', function () {
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

    it('responds to /api/profile', function (done) {
        request(app)
            .get('/api/profile')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.locale).toEqual({
                    current: config['lang']['default'],
                    fallback: config['lang']['default'],
                    available: config['lang']['locales']
                });
                expect(res.body.userId).toBeNull();
                expect(res.body.roles).toEqual([]);
            })
            .end(done);
    });

    it('autoselects locale', function (done) {
        config['lang']['locales'] = [ 'en', 'ru' ];
        config['lang']['default'] = 'en';
        app.set('config', config);

        request(app)
            .get('/api/profile')
            .set('Accept-Language', 'ru')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.locale.current).toEqual('ru');
            })
            .end(done);
    });

    it('saves profile', function (done) {
        var searchedId, savedUser;
        var foundUser = new UserModel();

        locator.register('token', { user_id: 42 });
        locator.register('user-repository', {
            find: function (id) {
                searchedId = id;
                var defer = q.defer();
                defer.resolve([ foundUser ]);
                return defer.promise;
            },
            save: function (user) {
                savedUser = user;
                var defer = q.defer();
                defer.resolve([ savedUser ]);
                return defer.promise;
            },
        });

        request(app)
            .put('/api/profile')
            .send({ name: 'Foo' })
            .set('Accept', 'application/json')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({ valid: true })
            .end(function () {
                expect(searchedId).toBe(42);
                expect(savedUser.getName()).toBe('Foo');
                done();
            });
    });
});
