'use strict'

var locator = require('node-service-locator');
var request = require('supertest');
var q = require('q');
var app = require('../../../app.js');
var UserModel = require('../../../models/user');

describe('/v1/auth route', function () {
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

    it('creates token', function (done) {
        var searchedEmail, searchedPassword;
        var foundUser = new UserModel();
        foundUser.checkPassword = function (password) {
            searchedPassword = password;
            return true;
        };

        locator.register('user-repository', {
            findByEmail: function (email) {
                searchedEmail = email;
                var defer = q.defer();
                defer.resolve([ foundUser ]);
                return defer.promise;
            },
        });
        locator.register('token-repository', {
            save: function () {
                var defer = q.defer();
                defer.resolve(1);
                return defer.promise;
            },
        });

        request(app)
            .post('/v1/auth/token')
            .send({ email: 'root@example.com', password: 'foobar' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(searchedEmail).toBe('root@example.com');
                expect(searchedPassword).toBe('foobar');
                expect(res.body.success).toBeTruthy();
            })
            .expect(200, done);
    });

    it('validates', function (done) {
        request(app)
            .post('/v1/auth/validate')
            .send({ _field: 'email', email: 'foo' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.success).toBe(false);
            })
            .expect(200, done);

        request(app)
            .post('/v1/auth/validate')
            .send({ _field: 'email', email: 'foo@bar.com' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.success).toBe(true);
            })
            .expect(200, done);

        request(app)
            .post('/v1/auth/validate')
            .send({ _field: 'password', password: 'foo' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.success).toBe(false);
            })
            .expect(200, done);

        request(app)
            .post('/v1/auth/validate')
            .send({ _field: 'password', password: 'foobar' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.success).toBe(true);
            })
            .expect(200, done);
    });
});
