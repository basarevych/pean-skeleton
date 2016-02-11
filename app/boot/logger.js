/**
 * Initialize logger
 */

'use strict'

var locator = require('node-service-locator');
var logger = require('tracer').colorConsole();
var emailjs = require('emailjs/email')
var path = require('path')

module.exports = function (app) {
    var config = locator.get('config');
    var server  = emailjs.server.connect({ host: "127.0.0.1" });

    var original = logger.error;
    logger.error = function () {
        if (config['error']['logger_error']['enabled']) { // send the error via email
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

                            server.send({
                                text: text,
                                from: config['error']['logger_error']['from'],
                                to: config['error']['logger_error']['to'],
                                subject: config['error']['logger_error']['subject'],
                                attachment: [
                                  { data: html, alternative: true },
                                ],
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
