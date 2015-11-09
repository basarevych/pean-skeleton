/**
 * Job repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var BaseRepository = require('./base');
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
                job.getCreatedAt().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
                job.getScheduledFor().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
                job.getValidUntil().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
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
                job.getCreatedAt().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
                job.getScheduledFor().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
                job.getValidUntil().tz('UTC').format('YYYY-MM-DD HH:mm:ss'), // save in UTC
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
