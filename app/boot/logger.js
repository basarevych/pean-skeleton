/**
 * Initialize logger
 */

'use strict'

var locator = require('node-service-locator');
var logger = require('tracer').colorConsole();
var emailjs = require('emailjs/email')
var path = require('path')

module.exports = function (app) {
    var server  = emailjs.server.connect({ host: "127.0.0.1" });

    var original = logger.error;
    logger.error = function () {
        if (process.env.REPORT_ERROR_TO) { // send the error via email
            var errors = arguments
            app.render(
                'email/error-report-text',
                {
                    errors: errors
                },
                function (err, text) {
                    if (err)
                        return;

                    app.render(
                        'email/error-report-html',
                        {
                            errors: errors
                        },
                        function (err, html) {
                            if (err)
                                return;

                            server.send({
                                text: text,
                                from: process.env.REPORT_ERROR_FROM,
                                to: process.env.REPORT_ERROR_TO,
                                subject: process.env.REPORT_ERROR_SUBJECT,
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
