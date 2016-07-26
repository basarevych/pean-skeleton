/**
 * Email service
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var emailjs = require('emailjs/email');

/**
 * Email service
 *
 * @constructor
 */
function Emailer() {
    var options = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        ssl: process.env.SMTP_SSL == 'true',
    };

    if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
        options['user'] = process.env.SMTP_USER;
        options['password'] = process.env.SMTP_PASSWORD;
    }

    this.server = emailjs.server.connect(options);
}

/**
 * Send email
 *
 * Parameters is an object with the following keys:
 * {
 *   from,          // From address
 *   to,            // To address
 *   cc,            // CC address (optional)
 *   subject,       // The subject
 *   text,          // Plain text variant of the message (optional)
 *   html,          // Html variant of the message (optional)
 *   attachments,   // Array of objects (see emailjs help, optional)
 * }
 *
 * @param {object} params   Parameters
 * @return {object}         Returns promise resolving to true
 */
Emailer.prototype.send = function (params) {
    var defer = q.defer();

    var options = {
        text: params['text'] ? params['text'] : '',
        from: params['from'],
        to: params['to'],
        subject: params['subject'],
    };

    if (params['cc'])
        options['cc'] = params['cc'];

    var att = params['attachments'] ? params['attachments'] : [];
    if (params['html'])
        att.push({ data: params['html'], alternative: true });
    if (att.length)
        options['attachment'] = att;

    this.server.send(options, function (err, message) {
        if (err)
            defer.reject(err);
        else
            defer.resolve(true);
    });

    return defer.promise;
};

module.exports = Emailer;
