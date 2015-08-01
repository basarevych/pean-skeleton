'use strict'

var request = require('supertest');
var app = require('../../../app.js');

describe('Profile route', function () {
    var config;

    beforeEach(function () {
        config = app.get('config');
        app.set('logger', {
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
});
