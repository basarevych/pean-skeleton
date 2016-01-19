'use strict'

var locator = require('node-service-locator');
var request = require('supertest');
var q = require('q');
var app = require('../../app.js');
var Acl = require('../../services/acl');
var UserModel = require('../../models/user');
var RoleModel = require('../../models/role');
var PermissionModel = require('../../models/permission');

describe('ACL service', function () {
    var config;
    var acl;
    var user;

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
        acl = new Acl();
        user = new UserModel({ id: 42 });
    });

    afterEach(function () {
    });

    it('inherits roles', function (done) {
        var role1 = new RoleModel({ id: 1, parent_id: null });
        var role2 = new RoleModel({ id: 2, parent_id: 1 });
        var role3 = new RoleModel({ id: 3, parent_id: 1 });

        locator.register('role-repository', {
            find: function (id) {
                var defer = q.defer();
                if (id == 1)
                    defer.resolve([ role1 ]);
                else if (id == 2)
                    defer.resolve([ role2 ]);
                else if (id == 3)
                    defer.resolve([ role3 ]);
                return defer.promise;
            },
            findByUserId: function (id) {
                var defer = q.defer();
                defer.resolve([ role2 ]);
                return defer.promise;
            },
        });
        locator.register('permission-repository', {
            findByRoleId: function (id) {
                var defer = q.defer();
                if (id == 1)
                    defer.resolve([ new PermissionModel({ resource: 'resource1', action: 'action1' }) ]);
                else if (id == 2)
                    defer.resolve([ new PermissionModel({ resource: 'resource2', action: 'action2' }) ]);
                else if (id == 3)
                    defer.resolve([ new PermissionModel({ resource: 'resource3', action: 'action3' }) ]);
                return defer.promise;
            },
        });

        acl.isAllowed(user, 'resource1', 'action1')
            .then(function (allowed) {
                expect(allowed).toBeTruthy();

                acl.isAllowed(user, 'resource2', 'action2')
                    .then(function (allowed) {
                        expect(allowed).toBeTruthy();

                        acl.isAllowed(user, 'resource3', 'action3')
                            .then(function (allowed) {
                                expect(allowed).toBeFalsy();

                                done();
                            });
                    });
            });
    });

    it('supports wildcard for resource', function (done) {
        var role = new RoleModel({ id: 1, parent_id: null });

        locator.register('role-repository', {
            find: function (id) {
                var defer = q.defer();
                if (id == 1)
                    defer.resolve([ role ]);
                return defer.promise;
            },
            findByUserId: function (id) {
                var defer = q.defer();
                defer.resolve([ role ]);
                return defer.promise;
            },
        });
        locator.register('permission-repository', {
            findByRoleId: function (id) {
                var defer = q.defer();
                if (id == 1)
                    defer.resolve([ new PermissionModel({ resource: null, action: 'action1' }) ]);
                return defer.promise;
            },
        });

        acl.isAllowed(user, 'resource1', 'action1')
            .then(function (allowed) {
                expect(allowed).toBeTruthy();

                acl.isAllowed(user, 'resource2', 'action1')
                    .then(function (allowed) {
                        expect(allowed).toBeTruthy();

                        acl.isAllowed(user, 'resource3', 'action3')
                            .then(function (allowed) {
                                expect(allowed).toBeFalsy();

                                done();
                            });
                    });
            });
    });

    it('supports wildcard for action', function (done) {
        var role = new RoleModel({ id: 1, parent_id: null });

        locator.register('role-repository', {
            find: function (id) {
                var defer = q.defer();
                if (id == 1)
                    defer.resolve([ role ]);
                return defer.promise;
            },
            findByUserId: function (id) {
                var defer = q.defer();
                defer.resolve([ role ]);
                return defer.promise;
            },
        });
        locator.register('permission-repository', {
            findByRoleId: function (id) {
                var defer = q.defer();
                if (id == 1)
                    defer.resolve([ new PermissionModel({ resource: 'resource1', action: null }) ]);
                return defer.promise;
            },
        });

        acl.isAllowed(user, 'resource1', 'action1')
            .then(function (allowed) {
                expect(allowed).toBeTruthy();

                acl.isAllowed(user, 'resource1', 'action2')
                    .then(function (allowed) {
                        expect(allowed).toBeTruthy();

                        acl.isAllowed(user, 'resource3', 'action3')
                            .then(function (allowed) {
                                expect(allowed).toBeFalsy();

                                done();
                            });
                    });
            });
    });

    it('supports wildcard for both', function (done) {
        var role = new RoleModel({ id: 1, parent_id: null });

        locator.register('role-repository', {
            find: function (id) {
                var defer = q.defer();
                if (id == 1)
                    defer.resolve([ role ]);
                return defer.promise;
            },
            findByUserId: function (id) {
                var defer = q.defer();
                defer.resolve([ role ]);
                return defer.promise;
            },
        });
        locator.register('permission-repository', {
            findByRoleId: function (id) {
                var defer = q.defer();
                if (id == 1)
                    defer.resolve([ new PermissionModel({ resource: null, action: null }) ]);
                return defer.promise;
            },
        });

        acl.isAllowed(user, 'resource', 'action')
            .then(function (allowed) {
                expect(allowed).toBeTruthy();

                done();
            });
    });
});
