/**
 * Jobs configuration
 */

'use strict'

module.exports = function (app) {
    return {
        job: {
            statuses: [
                'created',
                'started',
                'success',
                'failure',
            ],
        },
    };
};
