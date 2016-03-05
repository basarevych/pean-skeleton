/**
 * Initialize logger
 */

'use strict'

var locator = require('node-service-locator');
var logger = require('tracer').colorConsole();

module.exports = function (app) {
    var config = locator.get('config');

    var original = logger.error;
    logger.error = function () {
        if (config['error']['logger_error']['enabled']) { // send the error via email
            var emailer = locator.get('emailer');
            var errors = arguments
            app.render(
                'email/logger-error-text',
                {
                    errors: errors
                },
                function (err, text) {
                    if (err)
                        return;

                    app.render(
                        'email/logger-error-html',
                        {
                            errors: errors
                        },
                        function (err, html) {
                            if (err)
                                return;

                            emailer.send({
                                from: config['error']['logger_error']['from'],
                                to: config['error']['logger_error']['to'],
                                subject: config['error']['logger_error']['subject'],
                                text: text,
                                html: html,
                            });
                        }
                    );
                }
            );
        }

        original.apply(logger, arguments);
    };

    locator.register('logger', logger);
};
