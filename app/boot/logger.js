/**
 * Initialize logger
 */

'use strict'

var locator = require('node-service-locator');
var logger = require('tracer').colorConsole();
var emailjs = require('emailjs/email')
var EmailTemplate = require('email-templates').EmailTemplate
var path = require('path')

module.exports = function () {
    var server  = emailjs.server.connect({ host: "127.0.0.1" });

    var templateDir = path.join(__dirname, '..', 'views', 'email', 'error-report')
    var newsletter = new EmailTemplate(templateDir)

    var original = logger.error;
    logger.error = function () {
        if (process.env.REPORT_ERROR_TO) {
            newsletter.render(
                {
                    errors: arguments
                },
                function (err, result) {
                    if (err)
                        return;

                    server.send({
                        text: result.text,
                        from: process.env.REPORT_ERROR_FROM,
                        to: process.env.REPORT_ERROR_TO,
                        subject: process.env.REPORT_ERROR_SUBJECT,
                        attachment: [
                          { data: result.html, alternative: true },
                        ],
                    });
                }
            );
        }

        original.apply(logger, arguments);
    };

    locator.register('logger', logger);
};
