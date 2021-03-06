/**
 * Job repository
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
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

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'JobRepository.find() - pg connect', err ]);

        db.query(
            "SELECT * " +
            "  FROM jobs " +
            " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'JobRepository.find() - select query', err ]);
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
 * Find jobs by name
 *
 * @param {string} name     Name to search by
 * @return {object}         Returns promise resolving to array of models
 */
JobRepository.prototype.findByName = function (name) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'JobRepository.findByName() - pg connect', err ]);

        db.query(
            "SELECT * " +
            "  FROM jobs " +
            " WHERE name = $1 ",
            [ name ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'JobRepository.findByName() - select query', err ]);
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
        if (err)
            return defer.reject([ 'JobRepository.findAll() - pg connect', err ]);

        db.query(
            "SELECT * " +
            "  FROM jobs ",
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'JobRepository.findAll() - select query', err ]);
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
        if (err)
            return defer.reject([ 'JobRepository.save() - pg connect', err ]);

        var query, params = [];
        if (job.getId()) {
            query = "UPDATE jobs " +
                    "   SET name = $1, " +
                    "       queue = $2, " +
                    "       status = $3, " +
                    "       created_at = $4, " +
                    "       scheduled_for = $5, " +
                    "       valid_until = $6, " +
                    "       input_data = $7, " +
                    "       output_data = $8 " +
                    " WHERE id = $9 ";
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
            query = "   INSERT " +
                    "     INTO jobs(name, queue, status, created_at, scheduled_for, valid_until, input_data, output_data) " +
                    "   VALUES ($1, $2, $3, $4, $5, $6, $7, $8) " +
                    "RETURNING id ";
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
                db.end();
                return defer.reject([ 'JobRepository.save() - main query', err ]);
            }

            db.end();

            var id = result.rows.length && result.rows[0]['id'];
            if (id)
                job.setId(id);
            else
                id = result.rowCount > 0 ? job.getId() : null;

            if (id)
                job.dirty(false);

            me._sendFailureEmail(job)
                .finally(function () {
                    me._broadcastJob(job, function () { defer.resolve(id); });
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
 * Jobs of the same queue are executed in created order
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
        if (err)
            return defer.reject([ 'JobRepository.processNewJobs() - pg connect', err ]);

        var now; // moment();
        var returnValue; // { expired: [], started: [] };

        function processJob(job, jobDefer) {
            if (job.getStatus == 'started' || now.isBefore(job.getScheduledFor()))
                return jobDefer.resolve();

            if (now.isAfter(job.getValidUntil())) {
                job.setStatus('expired');

                db.query(
                    "UPDATE jobs " +
                    "   SET status = $1 " +
                    " WHERE id = $2 ",
                    [ 'expired', job.getId() ],
                    function (err, result) {
                        if (err)
                            return jobDefer.reject(err);

                        returnValue.expired.push(job);

                        me._sendFailureEmail(job)
                            .finally(function () {
                                jobDefer.resolve();
                            });
                    }
                );
            } else {
                job.setStatus('started');

                db.query(
                    "UPDATE jobs " +
                    "   SET status = $1 " +
                    " WHERE id = $2 ",
                    [ 'started', job.getId() ],
                    function (err, result) {
                        if (err)
                            return jobDefer.reject(err);

                        returnValue.started.push(job);
                        jobDefer.resolve();
                    }
                );
            }
        }

        var retries = 0;
        function transaction() {
            if (++retries > BaseRepository.MAX_TRANSACTION_RETRIES) {
                db.end();
                return defer.reject('JobRepository.processNewJobs() - maximum transaction retries reached');
            }

            now = moment();
            returnValue = { expired: [], started: [] };

            db.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE", [], function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'JobRepository.processNewJobs() - begin transaction', err ]);
                }

                db.query(
                    "  SELECT * " +
                    "    FROM jobs " +
                    "   WHERE queue IS NULL AND status = $1 AND scheduled_for <= $2 " +
                    "ORDER BY created_at ASC ",
                    [ 'created', now.tz('UTC').format(BaseModel.DATETIME_FORMAT) ],
                    function (err, result) {
                        if (err) {
                            if ((err.sqlState || err.code) == '40001') // serialization failure
                                return me.restartTransaction(db, defer, transaction);

                            db.end();
                            return defer.reject([ 'JobRepository.processNewJobs() - select created', err ]);
                        }

                        var promises = [];

                        result.rows.forEach(function (row) {
                            var job = new JobModel(row);
                            var jobDefer = q.defer();
                            promises.push(jobDefer.promise);
                            processJob(job, jobDefer);
                        });

                        q.all(promises)
                            .then(function () {
                                db.query(
                                    "  SELECT DISTINCT queue AS queue " +
                                    "    FROM jobs " +
                                    "   WHERE queue IS NOT NULL AND status = $1 AND scheduled_for <= $2 ",
                                    [ 'created', now.tz('UTC').format(BaseModel.DATETIME_FORMAT) ],
                                    function (err, result) {
                                        if (err) {
                                            if ((err.sqlState || err.code) == '40001') // serialization failure
                                                return me.restartTransaction(db, defer, transaction);

                                            db.end();
                                            return defer.reject([ 'JobRepository.processNewJobs() - select queues with created', err ]);
                                        }

                                        promises = [];

                                        result.rows.forEach(function (row) {
                                            var jobDefer = q.defer();
                                            promises.push(jobDefer.promise);

                                            db.query(
                                                "  SELECT COUNT(*) AS count " +
                                                "    FROM jobs " +
                                                "   WHERE queue = $1 AND status = $2 ",
                                                [ row['queue'], 'started' ],
                                                function (err, result) {
                                                    if (err)
                                                        return jobDefer.reject(err);

                                                    if (result.rows[0]['count'] > 0) {
                                                        jobDefer.resolve();
                                                    } else {
                                                        db.query(
                                                            "  SELECT * " +
                                                            "    FROM jobs " +
                                                            "   WHERE queue = $1 AND status = $2 " +
                                                            "ORDER BY created_at ASC, id ASC " +
                                                            "   LIMIT 1 ",
                                                            [ row['queue'], 'created' ],
                                                            function (err, result) {
                                                                if (err)
                                                                    return jobDefer.reject(err);

                                                                var job = new JobModel(result.rows[0]);
                                                                processJob(job, jobDefer);
                                                            }
                                                        );
                                                    }
                                                }
                                            );
                                        });

                                        q.all(promises)
                                            .then(function () {
                                                db.query("COMMIT TRANSACTION", [], function (err, result) {
                                                    if (err) {
                                                        if ((err.sqlState || err.code) == '40001') // serialization failure
                                                            return me.restartTransaction(db, defer, transaction);

                                                        db.end();
                                                        return defer.reject([ 'JobRepository.processNewJobs() - commit transaction', err ]);
                                                    }

                                                    db.end();

                                                    var jobs = returnValue.expired.concat(returnValue.started);
                                                    function broadcastJob() {
                                                        var job = jobs.shift();
                                                        if (!job)
                                                            return defer.resolve(returnValue);

                                                        me._broadcastJob(job, function () { broadcastJob(); });
                                                    }
                                                    broadcastJob();
                                                });
                                            })
                                            .catch(function (err) {
                                                if ((err.sqlState || err.code) == '40001') // serialization failure
                                                    return me.restartTransaction(db, defer, transaction);

                                                db.end();
                                                defer.reject([ 'JobRepository.processNewJobs() - queue', err ]);
                                            });
                                    }
                                );
                            })
                            .catch(function (err) {
                                if ((err.sqlState || err.code) == '40001') // serialization failure
                                    return me.restartTransaction(db, defer, transaction);

                                db.end();
                                defer.reject([ 'JobRepository.processNewJobs() - no queue', err ]);
                            });
                    }
                );
            });
        }
        transaction();
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
        if (err)
            return defer.reject([ 'JobRepository.restartInterrupted() - pg connect', err ]);

        db.query(
            "UPDATE jobs " +
            "   SET status = $1 " +
            " WHERE status = $2 ",
            [ 'created', 'started' ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'JobRepository.restartInterrupted() - set started back to created', err ]);
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
 * @param {number} seconds  Interval in seconds or undefined for default
 * @return {object}         Returns promise resolving to a number of DB rows affected
 */
JobRepository.prototype.postponeJob = function (job, interval) {
    var logger = locator.get('logger');
    var defer = q.defer();
    var me = this;

    if (!interval)
        interval = JobModel.POSTPONE_INTERVAL;

    var now = moment();
    var newTime = now.add(interval, 'seconds');

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'JobRepository.postponeJob() - pg connect', err ]);

        db.query(
            "UPDATE jobs " +
            "   SET status = $1, " +
            "       scheduled_for = $2 " +
            " WHERE id = $3 ",
            [
                'created',
                newTime.tz('UTC').format(BaseModel.DATETIME_FORMAT), // save in UTC
                job.getId(),
            ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'JobRepository.postponeJob() - postpone job', err ]);
                }

                db.end();
                defer.resolve(result.rowCount);
            }
        );
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

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'JobRepository.delete() - pg connect', err ]);

        db.query(
            "DELETE " +
            "  FROM jobs " +
            " WHERE id = $1 ",
            [ job.getId() ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'JobRepository.delete() - delete', err ]);
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
        if (err)
            return defer.reject([ 'JobRepository.deleteAll() - pg connect', err ]);

        db.query(
            "DELETE " +
            "  FROM jobs ",
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'JobRepository.deleteAll() - delete', err ]);
                }

                db.end();
                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

/**
 * Broadcast job status change
 *
 * @param {object} job          Job model
 * @param {function} cb         Completition callback
 */
JobRepository.prototype._broadcastJob = function (job, cb) {
    var logger = locator.get('logger');

    var redis = this.getRedis();
    redis.publish(process.env.PROJECT + ":jobs:" + job.getStatus(), job.getId(), function (err, reply) {
        if (err)
            logger.error('JobRepository._broadcastJob() - redis publish', err);

        redis.quit();

        if (cb)
            cb();
    });
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

    var data = {
        id: job.getId(),
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
    var emailer = locator.get('emailer');
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

                    emailer.send({
                        from: config['error']['job_failure']['from'],
                        to: config['error']['job_failure']['to'],
                        subject: config['error']['job_failure']['subject'],
                        text: text,
                        html: html,
                    }).finally(function () {
                        defer.resolve();
                    });
                }
            );
        }
    );

    return defer.promise;
};

module.exports = JobRepository;
