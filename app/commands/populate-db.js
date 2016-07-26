/**
 * Populate the database command
 */

'use strict';

var locator = require('node-service-locator');
var RoleModel = locator.get('role-model');
var RoleTranslationModel = locator.get('role-translation-model');
var PermissionModel = locator.get('permission-model');
var UserModel = locator.get('user-model');

module.exports = function (argv, rl) {
    var config = locator.get('config');
    var logger = locator.get('logger');

    /**
     * One liner for command
     */
    function info(done) {
        rl.write("\tpopulate-db\t\tPopulate the database\n");
        done();
    }

    /**
     * Detailed help for command
     */
    function help(done) {
        rl.write("\nUsage:\tbin/cmd populate-db\n\n");
        rl.write("\tThis command will populate the database with initial data\n");
        done();
    }

    /**
     * Execute command
     */
    function run(done) {
        var roleRepo = locator.get('role-repository');
        var roleTranslationRepo = locator.get('role-translation-repository');
        var permissionRepo = locator.get('permission-repository');
        var userRepo = locator.get('user-repository');

        var memberRole, adminRole;
        rl.write("===> Creating roles\n");
        roleRepo.findByHandle("member")
            .then(function (roles) {
                rl.write("-> Member\n");
                memberRole = roles.length && roles[0];
                if (memberRole)
                    return;

                memberRole = new RoleModel();
                memberRole.setParentId(null);
                memberRole.setHandle("member");
                return roleRepo.save(memberRole);
            })
            .then(function () {
                return roleTranslationRepo.findByRoleIdAndLocale(memberRole.getId(), 'en');
            })
            .then(function (translations) {
                var translation = translations.length && translations[0];
                if (translation)
                    return;

                translation = new RoleTranslationModel();
                translation.setRoleId(memberRole.getId());
                translation.setLocale('en');
                translation.setTitle('Member');
                return roleTranslationRepo.save(translation);
            })
            .then(function () {
                return roleRepo.findByHandle("admin");
            })
            .then(function (roles) {
                rl.write("-> Administrator\n");
                adminRole = roles.length && roles[0];
                if (adminRole)
                    return;

                adminRole = new RoleModel();
                adminRole.setParentId(null);
                adminRole.setHandle("admin");
                return roleRepo.save(adminRole);
            })
            .then(function () {
                return roleTranslationRepo.findByRoleIdAndLocale(adminRole.getId(), 'en');
            })
            .then(function (translations) {
                var translation = translations.length && translations[0];
                if (translation)
                    return;

                translation = new RoleTranslationModel();
                translation.setRoleId(adminRole.getId());
                translation.setLocale('en');
                translation.setTitle('Administrator');
                return roleTranslationRepo.save(translation);
            })
            .then(function () {
                rl.write("===> Creating permissions\n");
                return permissionRepo.findByParams(adminRole.getId(), null, null);
            })
            .then(function (permissions) {
                rl.write("-> Administrator allowed all\n");
                var permission = permissions.length && permissions[0];
                if (!permission) {
                    permission = new PermissionModel();
                    permission.setRoleId(adminRole.getId());
                    permission.setResource(null);
                    permission.setAction(null);
                    return permissionRepo.save(permission);
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
                                }

                                user.setPassword(UserModel.encryptPassword(password));
                                return userRepo.save(user)
                                    .then(function () {
                                        userRepo.addRole(user, adminRole);
                                        rl.write("==> Done\n");
                                        done();
                                    });
                            })
                            .catch(function (err) {
                                logger.error('populate-db.run() failed', err);
                                done();
                            });
                    });
                });
            })
            .catch(function (err) {
                logger.error('populate-db.run() failed', err);
                done();
            });
    }

    return {
        info: info,
        help: help,
        run: run,
    };
};
