/**
 * Profile route
 */

'use strict'

var locator = require('node-service-locator');
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
        var userRepo = locator.get('user-repository');

        rl.write("===> Creating administrator\n");
        rl.question("-> Administrator email? [root@example.com] ", function (email) {
            if (!email)
                email = "root@example.com";

            rl.question("-> Administrator password? ", function (password) {
                userRepo.findByEmail(email)
                    .then(function (users) {
                        var user = users.length && users[0];
                        if (!user) {
                            var user = new UserModel();
                            user.setName('Admin');
                            user.setEmail(email);
                            user.setPassword(UserModel.encryptPassword(password));
                            user.setIsAdmin(true);
                        }

                        userRepo.save(user)
                            .then(function (id) {
                                rl.write("=> ID: " + id + "\n");
                                rl.write("==> Done\n");
                                done();
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
