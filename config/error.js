/**
 * Errors
 */

'use strict'

module.exports = function (app) {
    return {
        error: {
            logger_error: {
                enabled: typeof process.env.ERROR_REPORT_TO != 'undefined',
                subject: process.env.ERROR_REPORT_SUBJECT + ' (logger error)',
                to: process.env.ERROR_REPORT_TO,
                from: process.env.ERROR_REPORT_FROM,
            },
            job_failure: {
                enabled: typeof process.env.ERROR_REPORT_TO != 'undefined',
                subject: process.env.ERROR_REPORT_SUBJECT + ' (job failed)',
                to: process.env.ERROR_REPORT_TO,
                from: process.env.ERROR_REPORT_FROM,
            },
        },
    };
};
