/**
 * Populate the database command
 */

'use strict'

var locator = require('node-service-locator');
var RoleModel = require('../models/role');
var PermissionModel = require('../models/permission');
var UserModel = require('../models/user');

module.exports = function (argv, rl) {
    var config = locator.get('config');

    function info(done) {
        rl.write("\tpopulate-db\t\tPopulate the database\n");
        done();
    }

    function help(done) {
        rl.write("\nUsage:\tbin/console populate-db\n\n");
        rl.write("\tThis command will populate the database with initial data\n");
        done();
    }

    function run(done) {
        var roleRepo = locator.get('role-repository');
        var permissionRepo = locator.get('permission-repository');
        var userRepo = locator.get('user-repository');

        var adminRole;
        rl.write("===> Creating roles\n");
        roleRepo.findByHandle("member")
            .then(function (roles) {
                rl.write("-> Member\n");
                var role = roles.length && roles[0];
                if (!role) {
                    role = new RoleModel();
                    role.setHandle("member");
                    role.setTitle("ROLE_MEMBER");
                    return role.save();
                }
            })
            .then(function () {
                return roleRepo.findByHandle("admin");
            })
            .then(function (roles) {
                rl.write("-> Administrator\n");
                var role = roles.length && roles[0];
                if (!role) {
                    role = new RoleModel();
                    role.setHandle("admin");
                    role.setTitle("ROLE_ADMIN");
                    adminRole = role;
                    return role.save();
                }
                adminRole = role;
            })
            .then(function () {
                rl.write("===> Creating permissions\n");
                return permissionRepo.findByParams(adminRole.id, null, null);
            })
            .then(function (permissions) {
                rl.write("-> Administrator allowed all\n");
                var permission = permissions.length && permissions[0];
                if (!permission) {
                    permission = new PermissionModel();
                    permission.setRoleId(adminRole.id);
                    permission.setResource(null);
                    permission.setAction(null);
                    return permission.save();
                }
            })
            .then(function () {
                rl.write("===> Creating administrator\n");
                rl.question("-> Administrator email? [root@example.com] ", function (email) {
                    if (!email)
                        email = "root@example.com";

                    rl.question("-> Administrator password? ", function (password) {
                        userRepo.findByEmail(email)
                            .then(function (users) {
                                var user = users.length && users[0];
                                if (!user) {
                                    user = new UserModel();
                                    user.setName('Admin');
                                    user.setEmail(email);
                                    user.setPassword(UserModel.encryptPassword(password));
                                }

                                user.save()
                                    .then(function () {
                                        user.associateRole(adminRole);
                                        rl.write("==> Done\n");
                                        done();
                                    });
                            });
                    });
                });
            });
    }

    return {
        info: info,
        help: help,
        run: run,
    };
};
