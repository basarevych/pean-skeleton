/**
 * Job repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var emailjs = require('emailjs/email')
var BaseRepository = locator.get('base-repository');
var BaseModel = locator.get('base-model');
var JobModel = locator.get('job-model');

/**
 * Job repository
 *
 * @constructor
 */
function JobRepository() {
    BaseRepository.call(this);
}

JobRepository.prototype = new BaseRepository();
JobRepository.prototype.constructor = JobRepository;

/**
 * Find a job by ID
 *
 * @param {integer} id      ID to search by
 * @return {object}         Returns promise resolving to array of models
 */
JobRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    id = parseInt(id, 10);
    if (isNaN(id)) {
        defer.reject('JobRepository.find() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('JobRepository.find() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM jobs "
          + " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('JobRepository.find() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var jobs = [];
                result.rows.forEach(function (row) {
                    var job = new JobModel(row);
                    jobs.push(job);
                });

                defer.resolve(jobs);
            }
        );
    });

    return defer.promise;
};

/**
 * Find all the jobs
 *
 * @return {object}             Returns promise resolving to array of models
 */
JobRepository.prototype.findAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('JobRepository.findAll() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM jobs ",
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('JobRepository.findAll() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var jobs = [];
                result.rows.forEach(function (row) {
                    var job = new JobModel(row);
                    jobs.push(job);
                });

                defer.resolve(jobs);
            }
        );
    });

    return defer.promise;
};

/**
 * Save job model
 *
 * @param {object} job      The job to save
 * @return {object}         Returns promise resolving to job ID or null on failure
 */
JobRepository.prototype.save = function (job) {
    var config = locator.get('config');
    var logger = locator.get('logger');
    var defer = q.defer();
    var me = this;

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('JobRepository.save() - pg connect', err);
            process.exit(1);
        }

        var query, params = [];
        if (job.getId()) {
            query = "UPDATE jobs "
                  + "   SET name = $1, "
                  + "       queue = $2, "
                  + "       status = $3, "
                  + "       created_at = $4, "
                  + "       scheduled_for = $5, "
                  + "       valid_until = $6, "
                  + "       input_data = $7, "
                  + "       output_data = $8 "
                  + " WHERE id = $9 ";
            params = [
                job.getName(),
                job.getQueue(),
                job.getStatus(),
                job.getCreatedAt().tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                job.getScheduledFor().tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                job.getValidUntil().tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                JSON.stringify(job.getInputData()),
                JSON.stringify(job.getOutputData()),
                job.getId(),
            ];
        } else {
            query = "   INSERT "
                  + "     INTO jobs(name, queue, status, created_at, scheduled_for, valid_until, input_data, output_data) "
                  + "   VALUES ($1, $2, $3, $4, $5, $6, $7, $8) "
                  + "RETURNING id ";
            params = [
                job.getName(),
                job.getQueue(),
                job.getStatus(),
                job.getCreatedAt().tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                job.getScheduledFor().tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                job.getValidUntil().tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                JSON.stringify(job.getInputData()),
                JSON.stringify(job.getOutputData()),
            ];
        }

        db.query(query, params, function (err, result) {
            if (err) {
                defer.reject();
                logger.error('JobRepository.save() - pg query', err);
                process.exit(1);
            }

            db.end();
            job.dirty(false);

            var id = result.rows.length && result.rows[0]['id'];
            if (id)
                job.setId(id);
            else
                id = job.getId();

            me._sendFailureEmail(job)
                .catch(function (err) {
                    logger.error('JobRepository._sendFailureEmail', err);
                })
                .finally(function () {
                    if (job.getStatus() != 'created') {
                        defer.resolve(id);
                        return;
                    }

                    var redis = me.getRedis();
                    redis.publish(process.env.PROJECT + ":jobs", id, function (err, reply) {
                        redis.quit();

                        if (err)
                            logger.error('JobRepository.save() - publish', err);

                        defer.resolve(id);
                    });
                });
        });
    });

    return defer.promise;
};

/**
 * Find expired and active jobs
 *
 * Searches for jobs with 'created' status and changes it to either
 * 'expired' or 'started'
 *
 * @return {object}             Returns promise resolving to an object with
 *                              two arrays of expired/started models:
 *                              { expired: [], started: [] }
 */
JobRepository.prototype.processNewJobs = function () {
    var logger = locator.get('logger');
    var defer = q.defer();
    var me = this;

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('JobRepository.processNewJobs() - pg connect', err);
            process.exit(1);
        }

        var now = moment();
        var returnValue = { expired: [], started: [] };

        db.query("BEGIN TRANSACTION", [], function (err, result) {
            if (err) {
                defer.reject();
                logger.error('JobRepository.processNewJobs() - pg query', err);
                process.exit(1);
            }

            db.query(
                "  SELECT * "
              + "    FROM jobs "
              + "   WHERE status = $1 AND scheduled_for <= $2 "
              + "ORDER BY id ASC ",
                [ 'created', now.tz('UTC').format(BaseModel.DATETIME_FORMAT) ],
                function (err, result) {
                    if (err) {
                        defer.reject();
                        logger.error('JobRepository.processNewJobs() - pg query', err);
                        process.exit(1);
                    }

                    var promises = [];
                    var queuedJobs = [];
                    result.rows.forEach(function (row) {
                        var job = new JobModel(row);
                        var jobDefer = q.defer();

                        if (now.isAfter(job.getValidUntil())) {
                            job.setStatus('expired');

                            db.query(
                                "UPDATE jobs "
                              + "   SET status = $1 "
                              + " WHERE id = $2 ",
                                [ 'expired', job.getId() ],
                                function (err, result) {
                                    if (err) {
                                        defer.reject();
                                        logger.error('JobRepository.processNewJobs() - pg query', err);
                                        process.exit(1);
                                    }
                                    returnValue.expired.push(job);

                                    me._sendFailureEmail(job)
                                        .catch(function (err) {
                                            logger.error('JobRepository._sendFailureEmail', err);
                                        })
                                        .finally(function () {
                                            jobDefer.resolve();
                                        });
                                }
                            );
                            promises.push(jobDefer.promise);
                            return;
                        }

                        if (job.getQueue() == null) {
                            job.setStatus('started');

                            db.query(
                                "UPDATE jobs "
                              + "   SET status = $1 "
                              + " WHERE id = $2 ",
                                [ 'started', job.getId() ],
                                function (err, result) {
                                    if (err) {
                                        defer.reject();
                                        logger.error('JobRepository.processNewJobs() - pg query', err);
                                        process.exit(1);
                                    }
                                    returnValue.started.push(job);
                                    jobDefer.resolve();
                                }
                            );
                            promises.push(jobDefer.promise);
                            return;
                        }

                        queuedJobs.push(job);
                    });

                    var queuedDefer = q.defer();
                    promises.push(queuedDefer.promise);

                    function processQueue() {
                        var job = queuedJobs.shift();
                        if (!job) {
                            queuedDefer.resolve();
                            return;
                        }

                        db.query(
                            "  SELECT * "
                          + "    FROM jobs "
                          + "   WHERE status = $1 AND queue = $2 ",
                            [ 'started', job.getQueue() ],
                            function (err, result) {
                                if (err) {
                                    defer.reject();
                                    logger.error('JobRepository.processNewJobs() - pg query', err);
                                    process.exit(1);
                                }

                                if (result.rows.length > 0) {
                                    processQueue();
                                    return;
                                }

                                db.query(
                                    "UPDATE jobs "
                                  + "   SET status = $1 "
                                  + " WHERE id = $2 ",
                                    [ 'started', job.getId() ],
                                    function (err, result) {
                                        if (err) {
                                            defer.reject();
                                            logger.error('JobRepository.processNewJobs() - pg query', err);
                                            process.exit(1);
                                        }
                                        returnValue.started.push(job);
                                        processQueue();
                                    }
                                );
                            }
                        );
                    }

                    processQueue();

                    q.all(promises)
                        .then(function (result) {
                            db.query("COMMIT TRANSACTION", [], function (err, result) {
                                if (err) {
                                    defer.reject();
                                    logger.error('JobRepository.processNewJobs() - pg query', err);
                                    process.exit(1);
                                }

                                db.end();
                                defer.resolve(returnValue);
                            });
                        })
                        .catch(function (err) {
                            defer.reject();
                            logger.error('JobRepository.processNewJobs() - q all', err);
                            process.exit(1);
                        });
                }
            );
        });
    });

    return defer.promise;
};

/**
 * Find 'started' jobs and change them to 'created'
 *
 * Intended to be run on server start to reset not-finished jobs
 *
 * @return {object}         Returns promise resolving to a number of processed jobs
 */
JobRepository.prototype.restartInterrupted = function () {
    var logger = locator.get('logger');
    var defer = q.defer();
    var me = this;

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('JobRepository.restartInterrupted() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "UPDATE jobs "
          + "   SET status = $1 "
          + " WHERE status = $2 ",
            [ 'created', 'started' ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('JobRepository.restartInterrupted() - pg query', err);
                    process.exit(1);
                }

                db.end();
                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

/**
 * Postpone job execution
 *
 * @param {object} job      The job
 * @return {object}         Returns promise resolving to a number of DB rows affected
 */
JobRepository.prototype.postponeJob = function (job) {
    var logger = locator.get('logger');
    var defer = q.defer();
    var me = this;

    var newTime = clone(job.getScheduledFor()).add(JobModel.POSTPONE_INTERVAL, 'seconds');

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('JobRepository.postponeJob() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "UPDATE jobs "
          + "   SET status = $1, "
          + "       scheduled_for = $2 "
          + " WHERE id = $3 ",
            [
                'created',
                newTime.tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                job.getId(),
            ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('JobRepository.postponeJob() - pg query', err);
                    process.exit(1);
                }

                db.end();
                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

/**
 * Postpone all created/started jobs in the queue
 *
 * @param {string} queue        The queue name
 * @return {object}             Returns promise resolving to a number of DB rows affected
 */
JobRepository.prototype.postponeQueue = function (queue) {
    var logger = locator.get('logger');
    var defer = q.defer();
    var me = this;

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('JobRepository.postponeQueue() - pg connect', err);
            process.exit(1);
        }

        db.query("BEGIN TRANSACTION", [], function (err, result) {
            if (err) {
                defer.reject();
                logger.error('JobRepository.postponeQueue() - pg query', err);
                process.exit(1);
            }

            db.query(
                "SELECT * "
              + "  FROM jobs "
              + " WHERE queue = $1 "
              + "   AND (status = $2 OR status = $3) ",
                [ queue, 'created', 'started' ],
                function (err, result) {
                    if (err) {
                        defer.reject();
                        logger.error('JobRepository.postponeQueue() - pg query', err);
                        process.exit(1);
                    }

                    var count = result.rowCount;
                    var promises = [];
                    result.rows.forEach(function (row) {
                        var job = new JobModel(row);
                        var jobDefer = q.defer();
                        promises.push(jobDefer.promise);

                        var newTime = clone(job.getScheduledFor()).add(JobModel.POSTPONE_INTERVAL, 'seconds');
                        db.query(
                            "UPDATE jobs "
                          + "   SET status = $1, "
                          + "       scheduled_for = $2 "
                          + " WHERE id = $3 ",
                            [
                                'created',
                                newTime.tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                                job.getId(),
                            ],
                            function (err, result) {
                                if (err) {
                                    defer.reject();
                                    logger.error('JobRepository.postponeQueue() - pg query', err);
                                    process.exit(1);
                                }

                                jobDefer.resolve();
                            }
                        );
                    });

                    q.all(promises)
                        .then(function () {
                            db.query("COMMIT TRANSACTION", [], function (err, result) {
                                if (err) {
                                    defer.reject();
                                    logger.error('JobRepository.postponeQueue() - pg query', err);
                                    process.exit(1);
                                }

                                db.end();
                                defer.resolve(count);
                            });
                        })
                        .catch(function (err) {
                            defer.reject();
                            logger.error('JobRepository.postponeQueue() - q all', err);
                            process.exit(1);
                        });
                }
            );
        });
    });

    return defer.promise;
};

/**
 * Delete a job
 *
 * @param {object} job          The job to delete
 * @return {object}             Returns promise resolving to a number of deleted DB rows
 */
JobRepository.prototype.delete = function (job) {
    var logger = locator.get('logger');
    var defer = q.defer();

    if (!job.getId()) {
        defer.resolve(0);
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('JobRepository.delete() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM jobs "
          + " WHERE id = $1 ",
            [ job.getId() ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('JobRepository.delete() - pg query', err);
                    process.exit(1);
                }

                db.end();
                job.setId(null);
                job.dirty(false);

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

/**
 * Delete all the jobs
 *
 * @return {object}             Returns promise resolving to a number of deleted DB rows
 */
JobRepository.prototype.deleteAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('JobRepository.deleteAll() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM jobs ",
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('JobRepository.deleteAll() - pg query', err);
                    process.exit(1);
                }

                db.end();

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

/**
 * Send failure email, does nothing if job hasn't failed or email notification is disabled
 *
 * @param {object} job          Job model
 * @return {object}             Returns promise resolving on send operation success
 */
JobRepository.prototype._sendFailureEmail = function resolve(job) {
    var config = locator.get('config');
    var defer = q.defer();

    if ((job.getStatus() != 'failure' && job.getStatus() != 'expired') || !config['error']['job_failure']['enabled']) {
        defer.resolve();
        return defer.promise;
    }

    var server  = emailjs.server.connect({ host: "127.0.0.1" });

    var data = {
        name: job.getName(),
        queue: job.getQueue(),
        status: job.getStatus(),
        created_at: job.getCreatedAt().tz('UTC').format(BaseModel.DATETIME_FORMAT) + ' (UTC)',
        scheduled_for: job.getScheduledFor().tz('UTC').format(BaseModel.DATETIME_FORMAT) + ' (UTC)',
        valid_until: job.getValidUntil().tz('UTC').format(BaseModel.DATETIME_FORMAT) + ' (UTC)',
        input_data: JSON.stringify(job.getInputData(), null, '    '),
        output_data: JSON.stringify(job.getOutputData(), null, '    '),
    };

    var app = locator.get('app');
    app.render(
        'email/job-failure-text',
        data,
        function (err, text) {
            if (err) {
                defer.reject(err);
                return;
            }

            app.render(
                'email/job-failure-html',
                data,
                function (err, html) {
                    if (err) {
                        defer.reject(err);
                        return;
                    }

                    server.send({
                        text: text,
                        from: config['error']['job_failure']['from'],
                        to: config['error']['job_failure']['to'],
                        subject: config['error']['job_failure']['subject'],
                        attachment: [
                          { data: html, alternative: true },
                        ],
                    });

                    defer.resolve();
                }
            );
        }
    );

    return defer.promise;
};

module.exports = JobRepository;
