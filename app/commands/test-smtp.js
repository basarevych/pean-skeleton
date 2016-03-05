/**
 * Test SMTP command
 */

'use strict'

var locator = require('node-service-locator');

module.exports = function (argv, rl) {
    var config = locator.get('config');
    var logger = locator.get('logger');

    /**
     * One liner for command
     */
    function info(done) {
        rl.write("\ttest-smtp\t\tTest email functionality\n");
        done();
    }

    /**
     * Detailed help for command
     */
    function help(done) {
        rl.write("\nUsage:");
        rl.write("\tbin/cmd test-smtp <to-address> [<from-address>]\n\n");
        rl.write("\tSend an email to test SMTP server\n");
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

        var emailer = locator.get('emailer');
        var from = argv['_'][2] ? argv['_'][2] : 'www@localhost';
        emailer.send({
            from: from,
            to: argv['_'][1],
            subject: 'Test email',
            text: 'This is a test',
            html: '<h3>This is a test</h3>',
        }).then(function () {
                done();
            })
            .catch(function (err) {
                logger.error('test-smtp.run() failed', err);
                done();
            });
    }

    return {
        info: info,
        help: help,
        run: run,
    };
};
