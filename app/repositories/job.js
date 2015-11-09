/**
 * Job repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseRepository = locator.get('base-repository');
var BaseModel = locator.get('base-model');
var JobModel = locator.get('job-model');

function JobRepository() {
    BaseRepository.call(this);
}

JobRepository.prototype = new BaseRepository();
JobRepository.prototype.constructor = JobRepository;

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
                "SELECT * "
              + "  FROM jobs "
              + " WHERE status = $1 AND scheduled_for <= $2 ",
                [ 'created', now.tz('UTC').format(BaseModel.DATETIME_FORMAT) ],
                function (err, result) {
                    if (err) {
                        defer.reject();
                        logger.error('JobRepository.processNewJobs() - pg query', err);
                        process.exit(1);
                    }

                    if (result.rows.length == 0) {
                        db.query("ROLLBACK TRANSACTION", [], function (err, result) {
                            if (err) {
                                defer.reject();
                                logger.error('JobRepository.processNewJobs() - pg query', err);
                                process.exit(1);
                            }

                            db.end();
                            defer.resolve(returnValue);
                        });
                        return;
                    }

                    var promises = [];
                    result.rows.forEach(function (row) {
                        var job = new JobModel(row);
                        if (now.isAfter(job.getValidUntil())) {
                            job.setStatus('expired');
                            returnValue.expired.push(job);
                        } else {
                            job.setStatus('started');
                            returnValue.started.push(job);
                        }
                        promises.push(me.save(job));
                    });

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

JobRepository.prototype.save = function (job) {
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
                  + "       status = $2, "
                  + "       created_at = $3, "
                  + "       scheduled_for = $4, "
                  + "       valid_until = $5, "
                  + "       input_data = $6, "
                  + "       output_data = $7 "
                  + " WHERE id = $8 ";
            params = [
                job.getName(),
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
                  + "     INTO jobs(name, status, created_at, scheduled_for, valid_until, input_data, output_data) "
                  + "   VALUES ($1, $2, $3, $4, $5, $6, $7) "
                  + "RETURNING id ";
            params = [
                job.getName(),
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

            if (job.getStatus() != 'created') {
                defer.resolve(id);
                return;
            }

            var redis = me.getRedis();
            redis.publish(process.env.PROJECT + ":jobs", id, function (err, reply) {
                if (err) {
                    defer.reject();
                    logger.error('JobRepository.save() - publish', err);
                    process.exit(1);
                }

                redis.quit();
                defer.resolve(id);
            });
        });
    });

    return defer.promise;
};

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

module.exports = JobRepository;
