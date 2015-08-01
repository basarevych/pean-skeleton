'use strict'

var request = require('supertest');
var app = require('../../../app.js');

describe('Profile route', function () {
    var config = app.get('config');

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
});
