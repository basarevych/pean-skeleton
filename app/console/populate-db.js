/**
 * Profile route
 */

'use strict'

var UserRepository = require('../repositories/user');
var UserModel = require('../models/user');

module.exports = function (app, argv, rl) {
    var config = app.get('config');

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
        var userRepo = new UserRepository(app);

        rl.write("===> Creating administrator\n");
        rl.question("-> Administrator username? [admin] ", function (username) {
            if (!username)
                username = "admin";

            rl.question("-> Administrator email? [root@localhost] ", function (email) {
                if (!email)
                    email = "root@localhost";

                rl.question("-> Administrator password? ", function (password) {
                    userRepo.findByEmail(email)
                        .then(function (users) {
                            var user = users.length && users[0];
                            if (!user) {
                                var user = new UserModel();
                                user.setLogin(username);
                                user.setEmail(email);
                                user.setPassword(UserModel.encryptPassword(password));
                                user.setIsAdmin(true);
                            }

                            userRepo.save(user)
                                .then(function (rows) {
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