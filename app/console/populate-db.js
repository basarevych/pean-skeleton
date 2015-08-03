/**
 * Profile route
 */

'use strict'

var UserRepository = require('../repositories/user');

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
        rl.question("-> Administrator email? [root@localhost] ", function (email) {
            if (!email)
                email = "root@localhost";

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
                            .then(function (user) {
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
