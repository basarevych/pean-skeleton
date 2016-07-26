/**
 * User route
 */

'use strict';

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

    /**
     * Job form validator
     */
    var jobForm = new ValidatorService();
    jobForm.addParser(
        'name',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.name);
            var errors = [];

            if (!validator.isLength(value, 1))
                errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    jobForm.addParser(
        'queue',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.queue);
            var errors = [];

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    jobForm.addParser(
        'status',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.status);
            var errors = [];

            if (JobModel.STATUS_TYPES.indexOf(value) == -1)
                errors.push(glMessage('VALIDATOR_NOT_IN_SET'));

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    jobForm.addParser(
        'scheduled_for',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.scheduled_for);
            var errors = [];

            if (value.length && !moment.unix(value).isValid())
                errors.push(glMessage('VALIDATOR_NOT_DATE'));

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    jobForm.addParser(
        'valid_until',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.valid_until);
            var errors = [];

            if (value.length && !moment.unix(value).isValid())
                errors.push(glMessage('VALIDATOR_NOT_DATE'));

            defer.resolve({ value: value, errors: errors });
            return defer.promise;
        }
    );
    jobForm.addParser(
        'input_data',
        function (req, res, id) {
            var defer = q.defer();
            var glMessage = res.locals.glMessage;

            var value = ValidatorService.trim(req.body.input_data);
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

    /**
     * GET routes
     */

    // Job list table route
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
                    row['name'] = ValidatorService.escape(row['name']);
                    row['queue'] = ValidatorService.escape(row['queue']);
                    row['status'] = ValidatorService.escape(row['status']);

                    if (row['created_at'])
                        row['created_at'] = row['created_at'].unix();

                    if (row['scheduled_for'])
                        row['scheduled_for'] = row['scheduled_for'].unix();

                    if (row['valid_until'])
                        row['valid_until'] = row['valid_until'].unix();

                    return row;
                });

                var jobRepo = locator.get('job-repository');
                var adapter = new PgAdapter();
                adapter.setClient(jobRepo.getPostgres());
                adapter.setSelect("*");
                adapter.setFrom("jobs");
                adapter.setWhere("");
                adapter.setParams([ ]);
                adapter.setDbTimezone('UTC');
                table.setAdapter(adapter);

                switch (req.query.query) {
                    case 'describe':
                        table.describe(function (err, result) {
                            if (err)
                                return app.abort(res, 500, 'GET /v1/jobs/table failed', err);

                            result['success'] = true;
                            res.json(result);
                        });
                        break;
                    case 'data':
                        table.setPageParams(req.query)
                            .fetch(function (err, result) {
                                if (err)
                                    return app.abort(res, 500, 'GET /v1/jobs/table failed', err);

                                result['success'] = true;
                                res.json(result);
                            });
                        break;
                    default:
                        res.json({ success: false });
                }
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/jobs/table failed', err);
            });
    });

    // Route for list of job statuses
    router.get('/statuses', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                res.json(JobModel.STATUS_TYPES);
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/jobs/statuses failed', err);
            });
    });

    // Get particular job route
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
                return jobRepo.find(jobId)
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
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/jobs/' + jobId + ' failed', err);
            });
    });

    // Get all the jobs route
    router.get('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var jobRepo = locator.get('job-repository');
                return jobRepo.findAll()
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
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/jobs failed', err);
            });
    });

    /**
     * POST routes
     */

    // Validate job field route
    router.post('/validate', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var id = req.body._id;
                var field = req.body._field;
                return jobForm.validateField(req, res, field, id)
                    .then(function (success) {
                        res.json({ success: success, errors: jobForm.getErrors(field) });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/jobs/validate failed', err);
            });
    });

    // Create job route
    router.post('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'create')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                return jobForm.validateAll(req, res)
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
                        return jobRepo.save(job)
                            .then(function (jobId) {
                                if (jobId === null)
                                    res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });
                                else
                                    res.json({ success: true, id: jobId });
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'POST /v1/jobs failed', err);
            });
    });

    /**
     * PUT routes
     */

    // Update job route
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

                return jobForm.validateAll(req, res, jobId)
                    .then(function (success) {
                        if (!success) {
                            return res.json({
                                success: false,
                                messages: [],
                                errors: jobForm.getErrors(),
                            });
                        }

                        var jobRepo = locator.get('job-repository');
                        return jobRepo.find(jobId)
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

                                return jobRepo.save(job)
                                    .then(function (jobId) {
                                        if (jobId === null)
                                            res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });
                                        else
                                            res.json({ success: true });
                                    });
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'PUT /v1/jobs/' + jobId + ' failed', err);
            });
    });

    /**
     * DELETE routes
     */

    // Delete particular job route
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
                return jobRepo.find(jobId)
                    .then(function (jobs) {
                        var job = jobs.length && jobs[0];
                        if (!job)
                            return app.abort(res, 404, "Job " + jobId + " not found");

                        return jobRepo.delete(job)
                            .then(function (count) {
                                if (count === 0)
                                    return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                                res.json({ success: true });
                            });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/jobs/' + jobId + ' failed', err);
            });
    });

    // Delete all jobs route
    router.delete('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'job', 'delete')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var jobRepo = locator.get('job-repository');
                return jobRepo.deleteAll()
                    .then(function (count) {
                        if (count === 0)
                            return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                        res.json({ success: true });
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/jobs failed', err);
            });
    });

    app.use('/v1/jobs', router);
};
