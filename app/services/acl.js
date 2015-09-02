/**
 * ACL service
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');

function Acl() {
}

Acl.prototype.isAllowed = function (user, resource, action) {
    var defer = q.defer();

    if (!user) {
        defer.resolve(false);
        return defer.promise;
    }

    var roleRepo = locator.get('role-repository');
    var permissionRepo = locator.get('permission-repository');

    var allPermissions = [];
    var loadPromises = [];

    function loadRolePermissions(roleId) {
        var roleDefer = q.defer();
        loadPromises.push(roleDefer.promise);

        roleRepo.find(roleId)
            .then(function (roles) {
                var role = roles.length && roles[0];
                if (!role)
                    return roleDefer.reject('Role not found: ' + roleId);

                if (role.getParentId())
                    loadRolePermissions(role.getParentId());

                permissionRepo.findByRoleId(role.getId())
                    .then(function (permissions) {
                        permissions.forEach(function (permission) { allPermissions.push(permission); });
                        roleDefer.resolve();
                    })
                    .catch(function () {
                        roleDefer.reject('Acl.loadRolePermissions() - permissionRepo.findByRoleId');
                    });
            })
            .catch(function () {
                loadDefer.reject('Acl.loadRolePermissions() - roleRepo.find');
            });
    }

    roleRepo.findByUserId(user.getId())
        .then(function (roles) {
            roles.forEach(function (role) { loadRolePermissions(role.getId()) });

            q.all(loadPromises)
                .then(function () {
                    var allowed = allPermissions.some(function (permission) {
                        var resourceAllowed = false;
                        if (permission.getResource() == null)
                            resourceAllowed = true;
                        else if (permission.getResource() == resource)
                            resourceAllowed = true;

                        var actionAllowed = false;
                        if (permission.getAction() == null)
                            actionAllowed = true;
                        else if (permission.getAction() == action)
                            actionAllowed = true;

                        return resourceAllowed && actionAllowed;
                    });
                    defer.resolve(allowed);
                })
                .catch(function () {
                    defer.reject('Acl.isAllowed() - loadPromises');
                });
        })
        .catch(function () {
            defer.reject('Acl.isAllowed() - roleRepo.findByUserId');
        });

    return defer.promise;
};

module.exports = Acl;
