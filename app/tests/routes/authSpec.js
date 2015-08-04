'use strict'

var locator = require('node-service-locator');
var request = require('supertest');
var q = require('q');
var app = require('../../../app.js');
var UserModel = require('../../../app/models/user');

describe('/api/auth route', function () {
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

        request(app)
            .post('/api/auth/token')
            .send({ email: 'root@example.com', password: 'foobar' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(searchedEmail).toBe('root@example.com');
                expect(searchedPassword).toBe('foobar');
                expect(res.body.valid).toBeTruthy();
            })
            .expect(200, done);
    });

    it('validates', function (done) {
        request(app)
            .post('/api/auth/validate')
            .send({ field: 'email', form: { email: 'foo' } })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.valid).toBe(false);
            })
            .expect(200, done);

        request(app)
            .post('/api/auth/validate')
            .send({ field: 'email', form: { email: 'foo@bar.com' } })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.valid).toBe(true);
            })
            .expect(200, done);

        request(app)
            .post('/api/auth/validate')
            .send({ field: 'password', form: { password: 'foo' } })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.valid).toBe(false);
            })
            .expect(200, done);

        request(app)
            .post('/api/auth/validate')
            .send({ field: 'password', form: { password: 'foobar' } })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(function (res) {
                expect(res.body.valid).toBe(true);
            })
            .expect(200, done);
    });
});
