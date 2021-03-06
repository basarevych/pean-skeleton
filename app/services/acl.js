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
    function loadRolePermissions(roleId) {
        var roleDefer = q.defer();
        if (!roleId) {
            roleDefer.resolve();
            return roleDefer.promise;
        }

        roleRepo.find(roleId)
            .then(function (roles) {
                var role = roles.length && roles[0];
                if (!role)
                    return roleDefer.reject('Role not found: ' + roleId);

                return loadRolePermissions(role.getParentId())
                    .then(function () {
                        return permissionRepo.findByRoleId(role.getId())
                            .then(function (permissions) {
                                permissions.forEach(function (permission) { allPermissions.push(permission); });
                                roleDefer.resolve();
                            });
                    });
            })
            .catch(function (err) {
                roleDefer.reject(err);
            });

        return roleDefer.promise;
    }

    roleRepo.findByUserId(user.getId())
        .then(function (roles) {
            var loadPromises = [];
            roles.forEach(function (role) { loadPromises.push(loadRolePermissions(role.getId())); });

            return q.all(loadPromises)
                .then(function () {
                    var allowed = allPermissions.some(function (permission) {
                        var resourceAllowed = false;
                        if (permission.getResource() === null)
                            resourceAllowed = true;
                        else if (permission.getResource() == resource)
                            resourceAllowed = true;

                        var actionAllowed = false;
                        if (permission.getAction() === null)
                            actionAllowed = true;
                        else if (permission.getAction() == action)
                            actionAllowed = true;

                        return resourceAllowed && actionAllowed;
                    });
                    defer.resolve(allowed);
                });
        })
        .catch(function (err) {
            defer.reject(err);
        });

    return defer.promise;
};

module.exports = Acl;
