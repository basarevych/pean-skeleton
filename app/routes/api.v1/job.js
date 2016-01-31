/**
 * User route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var moment = require('moment-timezone');
var q = require('q');
var clone = require('clone');
var Table = require('dynamic-table').table();
var PgAdapter = require('dynamic-table').pgAdapter();
var ValidatorService = locator.get('validator-service');
var JobModel = locator.get('job-model');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');
    var config = locator.get('config');

    var jobForm = new ValidatorService();
    jobForm.addParser(
        'name',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = validator.trim(req.body.name);
            var errors = [];

            if (!validator.isLength(value, 1))
                errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    jobForm.addParser(
        'queue',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = validator.trim(req.body.queue);
            var errors = [];

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    jobForm.addParser(
        'status',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = validator.trim(req.body.status);
            var errors = [];

            if (config['job']['statuses'].indexOf(value) == -1)
                errors.push(glMessage('VALIDATOR_NOT_IN_SET'));

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    jobForm.addParser(
        'scheduled_for',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = validator.trim(req.body.scheduled_for);
            var errors = [];

            if (value.length && !moment.unix(value).isValid())
                errors.push(glMessage('VALIDATOR_NOT_DATE'));

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    jobForm.addParser(
        'valid_until',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = validator.trim(req.body.valid_until);
            var errors = [];

            if (value.length && !moment.unix(value).isValid())
                errors.push(glMessage('VALIDATOR_NOT_DATE'));

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    jobForm.addParser(
        'input_data',
        function (req, res) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = validator.trim(req.body.input_data);
            var errors = [];

            try {
                if (value.length)
                    JSON.parse(value);
            } catch (e) {
                errors.push(glMessage('VALIDATOR_NOT_JSON'));
            }

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );

    router.get('/table', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var table = new Table();
                table.setColumns({
                    id: {
                        title: res.locals.glMessage('JOB_ID_COLUMN'),
                        sql_id: 'id',
                        type: Table.TYPE_INTEGER,
                        filters: [ Table.FILTER_EQUAL ],
                        sortable: true,
                        visible: true,
                    },
                    name: {
                        title: res.locals.glMessage('JOB_NAME_COLUMN'),
                        sql_id: 'name',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE ],
                        sortable: true,
                        visible: true,
                    },
                    queue: {
                        title: res.locals.glMessage('JOB_QUEUE_COLUMN'),
                        sql_id: 'queue',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE, Table.FILTER_NULL ],
                        sortable: true,
                        visible: true,
                    },
                    status: {
                        title: res.locals.glMessage('JOB_STATUS_COLUMN'),
                        sql_id: 'status',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE ],
                        sortable: true,
                        visible: true,
                    },
                    created_at: {
                        title: res.locals.glMessage('JOB_CREATED_AT_COLUMN'),
                        sql_id: 'created_at',
                        type: Table.TYPE_DATETIME,
                        filters: [ Table.FILTER_BETWEEN ],
                        sortable: true,
                        visible: false,
                    },
                    scheduled_for: {
                        title: res.locals.glMessage('JOB_SCHEDULED_FOR_COLUMN'),
                        sql_id: 'scheduled_for',
                        type: Table.TYPE_DATETIME,
                        filters: [ Table.FILTER_BETWEEN ],
                        sortable: true,
                        visible: true,
                    },
                    valid_until: {
                        title: res.locals.glMessage('JOB_VALID_UNTIL_COLUMN'),
                        sql_id: 'valid_until',
                        type: Table.TYPE_DATETIME,
                        filters: [ Table.FILTER_BETWEEN ],
                        sortable: true,
                        visible: false,
                    },
                });
                table.setMapper(function (row) {
                    var result = row;

                    result['name'] = validator.escape(row['name']);
                    result['queue'] = validator.escape(row['queue']);
                    result['status'] = validator.escape(row['status']);

                    if (row['created_at']) {
                        var utc = moment(row['created_at']); // db field is in UTC
                        var m = moment.tz(utc.format('YYYY-MM-DD HH:mm:ss'), 'UTC');
                        result['created_at'] = m.unix();
                    }

                    if (row['scheduled_for']) {
                        var utc = moment(row['scheduled_for']); // db field is in UTC
                        var m = moment.tz(utc.format('YYYY-MM-DD HH:mm:ss'), 'UTC');
                        result['scheduled_for'] = m.unix();
                    }

                    if (row['valid_until']) {
                        var utc = moment(row['valid_until']); // db field is in UTC
                        var m = moment.tz(utc.format('YYYY-MM-DD HH:mm:ss'), 'UTC');
                        result['valid_until'] = m.unix();
                    }

                    return result;
                });

                var jobRepo = locator.get('job-repository');
                var adapter = new PgAdapter();
                adapter.setClient(jobRepo.getPostgres());
                adapter.setSelect("*");
                adapter.setFrom("jobs");
                adapter.setWhere("");
                adapter.setParams([ ]);
                table.setAdapter(adapter);

                switch (req.query.query) {
                    case 'describe':
                        table.describe(function (err, result) {
                            if (err)
                                return app.abort(res, 500, 'GET /v1/job/table failed', err);

                            result['success'] = true;
                            res.json(result);
                        });
                        break;
                    case 'data':
                        table.setPageParams(req.query)
                            .fetch(function (err, result) {
                                if (err)
                                    return app.abort(res, 500, 'GET /v1/job/table failed', err);

                                result['success'] = true;
                                res.json(result);
                            });
                        break;
                    default:
                        res.json({ success: false });
                }
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/job/table failed', err);
            });
    });

    router.post('/validate', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var field = req.body._field;
                jobForm.validateField(field, req, res)
                    .then(function (success) {
                        res.json({ success: success, errors: jobForm.getErrors(field) });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'POST /v1/job/validate failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/job/validate failed', err);
            });
    });

    router.get('/statuses', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                res.json(config['job']['statuses']);
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/job/statuses failed', err);
            });
    });

    router.get('/:jobId', function (req, res) {
        var jobId = parseInt(req.params.jobId, 10);
        if (isNaN(jobId))
            return app.abort(res, 400, "Invalid job ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var jobRepo = locator.get('job-repository');
                jobRepo.find(jobId)
                    .then(function (jobs) {
                        var job = jobs.length && jobs[0];
                        if (!job)
                            return app.abort(res, 404, "Job " + jobId + " not found");

                            res.json({
                                id: job.getId(),
                                name: job.getName(),
                                queue: job.getQueue(),
                                status: job.getStatus(),
                                created_at: job.getCreatedAt().unix(),
                                scheduled_for: job.getScheduledFor().unix(),
                                valid_until: job.getValidUntil().unix(),
                                input_data: job.getInputData(),
                                output_data: job.getOutputData(),
                            });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'GET /v1/job/' + jobId + ' failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/job/' + jobId + ' failed', err);
            });
    });

    router.get('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var jobRepo = locator.get('job-repository');
                jobRepo.findAll()
                    .then(function (jobs) {
                        var result = [];
                        jobs.forEach(function (job) {
                            result.push({
                                id: job.getId(),
                                name: job.getName(),
                                queue: job.getQueue(),
                                status: job.getStatus(),
                                created_at: job.getCreatedAt().unix(),
                                scheduled_for: job.getScheduledFor().unix(),
                                valid_until: job.getValidUntil().unix(),
                                input_data: job.getInputData(),
                                output_data: job.getOutputData(),
                            });
                        });
                        res.json(result);
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'GET /v1/job failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/job failed', err);
            });
    });

    router.post('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'create')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                jobForm.validateAll(req, res)
                    .then(function (success) {
                        if (!success) {
                            return res.json({
                                success: false,
                                messages: [],
                                errors: jobForm.getErrors(),
                            });
                        }

                        var job = new JobModel();
                        job.setName(jobForm.getValue('name'));
                        job.setQueue(jobForm.getValue('queue').length ? jobForm.getValue('queue') : null);
                        job.setStatus(jobForm.getValue('status'));
                        job.setCreatedAt(moment());
                        job.setScheduledFor(jobForm.getValue('scheduled_for').length ? moment.unix(jobForm.getValue('scheduled_for')) : moment());
                        job.setValidUntil(jobForm.getValue('valid_until').length ? moment.unix(jobForm.getValue('valid_until')) : moment().add(5, 'minutes'));
                        job.setInputData(jobForm.getValue('input_data').length ? JSON.parse(jobForm.getValue('input_data')) : {});
                        job.setOutputData({});

                        var jobRepo = locator.get('job-repository');
                        jobRepo.save(job)
                            .then(function (jobId) {
                                if (jobId === null)
                                    res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });
                                else
                                    res.json({ success: true, id: jobId });
                            })
                            .catch(function (err) {
                                app.abort(res, 500, 'POST /v1/job failed', err);
                            });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'POST /v1/job failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/job failed', err);
            });
    });

    router.put('/:jobId', function (req, res) {
        var jobId = parseInt(req.params.jobId, 10);
        if (isNaN(jobId))
            return app.abort(res, 400, "Invalid job ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'update')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                jobForm.validateAll(req, res)
                    .then(function (success) {
                        if (!success) {
                            return res.json({
                                success: false,
                                messages: [],
                                errors: jobForm.getErrors(),
                            });
                        }

                        var jobRepo = locator.get('job-repository');
                        jobRepo.find(jobId)
                            .then(function (jobs) {
                                var job = jobs.length && jobs[0];
                                if (!job)
                                    return app.abort(res, 404, "Job " + jobId + " not found");

                                job.setName(jobForm.getValue('name'));
                                job.setQueue(jobForm.getValue('queue').length ? jobForm.getValue('queue') : null);
                                job.setStatus(jobForm.getValue('status'));
                                job.setScheduledFor(jobForm.getValue('scheduled_for').length ? moment.unix(jobForm.getValue('scheduled_for')) : moment());
                                job.setValidUntil(jobForm.getValue('valid_until').length ? moment.unix(jobForm.getValue('valid_until')) : moment().add(5, 'minutes'));
                                job.setInputData(jobForm.getValue('input_data').length ? JSON.parse(jobForm.getValue('input_data')) : {});

                                var jobRepo = locator.get('job-repository');
                                jobRepo.save(job)
                                    .then(function (jobId) {
                                        if (jobId === null)
                                            res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });
                                        else
                                            res.json({ success: true });
                                    })
                                    .catch(function (err) {
                                        app.abort(res, 500, 'PUT /v1/job/' + jobId + ' failed', err);
                                    });
                            })
                            .catch(function (err) {
                                app.abort(res, 500, 'PUT /v1/job/' + jobId + ' failed', err);
                            });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'PUT /v1/job/' + jobId + ' failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'PUT /v1/job/' + jobId + ' failed', err);
            });
    });

    router.delete('/:jobId', function (req, res) {
        var jobId = parseInt(req.params.jobId, 10);
        if (isNaN(jobId))
            return app.abort(res, 400, "Invalid job ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'delete')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var jobRepo = locator.get('job-repository');
                jobRepo.find(jobId)
                    .then(function (jobs) {
                        var job = jobs.length && jobs[0];
                        if (!job)
                            return app.abort(res, 404, "Job " + jobId + " not found");

                        jobRepo.delete(job)
                            .then(function (count) {
                                if (count == 0)
                                    return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                                res.json({ success: true });
                            })
                            .catch(function (err) {
                                app.abort(res, 500, 'DELETE /v1/job/' + jobId + ' failed', err);
                            });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'DELETE /v1/job/' + jobId + ' failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/job/' + jobId + ' failed', err);
            });
    });

    router.delete('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'delete')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var jobRepo = locator.get('job-repository');
                jobRepo.deleteAll()
                    .then(function (count) {
                        if (count == 0)
                            return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                        res.json({ success: true });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'DELETE /v1/job failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/job failed', err);
            });
    });

    app.use('/v1/job', router);
};
