/**
 * Send web-interface notification command
 */

'use strict'

var locator = require('node-service-locator');
var NotificationModel = require('../models/notification');

module.exports = function (argv, rl) {
    var config = locator.get('config');

    function info(done) {
        rl.write("\tnotify\t\t\tWeb-interface notification\n");
        done();
    }

    function help(done) {
        rl.write("\nUsage:\tbin/console notify [--title=<title>] [--icon=<icon>] [--variables=<variables>] <text>\n\n");
        rl.write("\tPopup notification in web-interface\n");
        rl.write("\nParameters:\n\n");
        rl.write("\t<text>\t\t\tText of the notification\n");
        rl.write("\t<title>\t\t\tTitle of the notification\n");
        rl.write("\t<icon>\t\t\tCSS class of the icon\n");
        rl.write("\t<variables>\t\tJSON string representing substitution variables\n");
        done();
    }

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
            notification.setIcon(argv['variables']);

        notification.save()
            .then(function () {
                done();
            })
            .catch(function (err) {
                logger.err('notify.run() failed', err);
                done();
            });
    }

    return {
        info: info,
        help: help,
        run: run,
    };
};
