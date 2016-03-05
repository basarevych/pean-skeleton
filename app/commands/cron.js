/**
 * Cron job command
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
        rl.write("\tcron\t\t\tRun periodic tasks\n");
        done();
    }

    /**
     * Detailed help for command
     */
    function help(done) {
        rl.write("\nUsage:");
        rl.write("\tbin/cmd cron\n\n");
        rl.write("\tRun periodic tasks\n");
        done();
    }

    /**
     * Delete expired tokens
     */
    function deleteExpiredTokens(done) {
        var tokenRepo = locator.get('token-repository');
        tokenRepo.deleteExpired()
            .then(function () {
                done();
            })
            .catch(function (err) {
                logger.error('cron.deleteExpiredTokens() failed', err);
                done();
            });
    }

    /**
     * Execute command
     */
    function run(done) {
        deleteExpiredTokens(done);
    }

    return {
        info: info,
        help: help,
        run: run,
    };
};
