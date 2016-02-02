/**
 * ACL service
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');

/**
 * Access Control List
 *
 * @constructor
 */
function Acl() {
}

/**
 * Is an action allowed for a user?
 *
 * @param {object} user         User model
 * @param {string} resource     Resource
 * @param {string} action       Action
 * @return {object}             Returns promise resolving to a boolean
 */
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
                    .catch(function (err) {
                        roleDefer.reject('Acl.loadRolePermissions() - permissionRepo.findByRoleId', err);
                    });
            })
            .catch(function (err) {
                roleDefer.reject('Acl.loadRolePermissions() - roleRepo.find', err);
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
                .catch(function (err) {
                    defer.reject('Acl.isAllowed() - loadPromises', err);
                });
        })
        .catch(function (err) {
            defer.reject('Acl.isAllowed() - roleRepo.findByUserId', err);
        });

    return defer.promise;
};

module.exports = Acl;
