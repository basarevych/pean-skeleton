/**
 * Send web-interface notification command
 */

'use strict'

var locator = require('node-service-locator');
var NotificationModel = locator.get('notification-model');

module.exports = function (argv, rl) {
    var config = locator.get('config');

    /**
     * One liner for command
     */
    function info(done) {
        rl.write("\tnotify\t\t\tWeb-interface notification\n");
        done();
    }

    /**
     * Detailed help for command
     */
    function help(done) {
        rl.write("\nUsage:");
        rl.write("\tbin/cmd notify [--title=<title>] [--icon=<icon>] [--variables=<variables>]\\\n");
        rl.write("\t               [--user-id=<user-id>] | --role-id=<role-id>] <text>\n\n");
        rl.write("\tPopup notification in web-interface\n");
        rl.write("\nParameters:\n\n");
        rl.write("\t<text>\t\t\tText of the notification\n");
        rl.write("\t<title>\t\t\tTitle of the notification\n");
        rl.write("\t<icon>\t\t\tCSS class of the icon\n");
        rl.write("\t<variables>\t\tJSON string representing substitution variables\n");
        rl.write("\t<user-id>\t\tIf specified then only this user will get the notification\n");
        rl.write("\t<role-id>\t\tIf specified then only users of this role will get the notification\n");
        done();
    }

    /**
     * Execute command
     */
    function run(done) {
        if (!argv['_'][1]) {
            help(function () { rl.write("\n"); done() });
            return;
        }

        var logger = locator.get('logger');

        var notification = new NotificationModel();
        notification.setText(argv['_'][1]);
        if (argv['title'])
            notification.setTitle(argv['title']);
        if (argv['icon'])
            notification.setIcon(argv['icon']);
        if (argv['variables'])
            notification.setVariables(argv['variables']);
        if (argv['user-id'])
            notification.setUserId(argv['user-id']);
        else if (argv['role-id'])
            notification.setRoleId(argv['role-id']);

        var notificationRepo = locator.get('notification-repository');
        notificationRepo.save(notification)
            .then(function () {
                done();
            })
            .catch(function (err) {
                logger.error('notify.run() failed', err);
                done();
            });
    }

    return {
        info: info,
        help: help,
        run: run,
    };
};
