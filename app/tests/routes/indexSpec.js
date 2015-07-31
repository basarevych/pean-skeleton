'use strict'

var request = require('supertest');
var app = require('../../../app.js');

describe('Index route', function () {
    it('responds to /', function (done) {
        request(app)
            .get('/')
            .expect(200, done);
    });

    it('returns 404 for anything else', function (done) {
        request(app)
            .get('/foo/bar')
            .expect(404, done);
    });
});
