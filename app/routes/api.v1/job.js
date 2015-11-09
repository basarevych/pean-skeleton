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
var JobModel = locator.get('job-model');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');
    var logger = locator.get('logger');

    function parseForm(field, req, res) {
        var defer = q.defer();
        var glMessage = res.locals.glMessage;
        var config = locator.get('config');

        var form = {
            name: validator.trim(req.body.name),
            status: validator.trim(req.body.status),
            scheduled_for: validator.trim(req.body.scheduled_for),
            valid_until: validator.trim(req.body.valid_until),
            input_data: validator.trim(req.body.input_data),
        };

        var errors = [];
        switch (field) {
            case 'name':
                if (!validator.isLength(form.name, 1))
                    errors.push(glMessage('VALIDATOR_REQUIRED_FIELD'));
                break;
            case 'status':
                if (config['job']['statuses'].indexOf(form.status) == -1)
                    errors.push(glMessage('VALIDATOR_NOT_IN_SET'));
                break;
            case 'scheduled_for':
                if (form.scheduled_for.length && !moment.unix(form.scheduled_for).isValid())
                    errors.push(glMessage('VALIDATOR_NOT_A_DATE'));
                break;
            case 'valid_until':
                if (form.valid_until.length && !moment.unix(form.valid_until).isValid())
                    errors.push(glMessage('VALIDATOR_NOT_A_DATE'));
                break;
            case 'input_data':
                try {
                    if (form.input_data.length)
                        JSON.parse(form.input_data);
                } catch (e) {
                    errors.push(glMessage('VALIDATOR_NOT_A_JSON'));
                }
        }

        defer.resolve({
            field: field,
            value: form[field],
            form: form,
            valid: errors.length == 0,
            errors: errors
        });

        return defer.promise;
    }

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
                        visible: true,
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
                        visible: true,
                    },
                });
                table.setMapper(function (row) {
                    var result = row;

                    result['name'] = validator.escape(row['name']);
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
                            if (err) {
                                logger.error('GET /v1/job/table failed', err);
                                return app.abort(res, 500, 'GET /v1/job/table failed');
                            }

                            result['success'] = true;
                            res.json(result);
                        });
                        break;
                    case 'data':
                        table.setPageParams(req.query)
                            .fetch(function (err, result) {
                                if (err) {
                                    logger.error('GET /v1/job/table failed', err);
                                    return app.abort(res, 500, 'GET /v1/job/table failed');
                                }

                                result['success'] = true;
                                res.json(result);
                            });
                        break;
                    default:
                        res.json({ success: false });
                }
            })
            .catch(function (err) {
                logger.error('GET /v1/job/table failed', err);
                app.abort(res, 500, 'GET /v1/job/table failed');
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

                parseForm(req.body._field, req, res)
                    .then(function (data) {
                        res.json({ success: data.valid, errors: data.errors });
                    })
                    .catch(function (err) {
                        logger.error('POST /v1/job/validate failed', err);
                        app.abort(res, 500, 'POST /v1/job/validate failed');
                    });
            })
            .catch(function (err) {
                logger.error('POST /v1/job/validate failed', err);
                app.abort(res, 500, 'POST /v1/job/validate failed');
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

                var config = locator.get('config');
                res.json(config['job']['statuses']);
            })
            .catch(function (err) {
                logger.error('GET /v1/job/statuses failed', err);
                app.abort(res, 500, 'POST /v1/job/statuses failed');
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
                                status: job.getStatus(),
                                created_at: job.getCreatedAt().unix(),
                                scheduled_for: job.getScheduledFor().unix(),
                                valid_until: job.getValidUntil().unix(),
                                input_data: job.getInputData(),
                                output_data: job.getOutputData(),
                            });
                    })
                    .catch(function (err) {
                        logger.error('GET /v1/job/' + jobId + ' failed', err);
                        app.abort(res, 500, 'GET /v1/job/' + jobId + ' failed');
                    });
            })
            .catch(function (err) {
                logger.error('GET /v1/job/' + jobId + ' failed', err);
                app.abort(res, 500, 'GET /v1/job/' + jobId + ' failed');
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
                        logger.error('GET /v1/job failed', err);
                        app.abort(res, 500, 'GET /v1/job failed');
                    });
            })
            .catch(function (err) {
                logger.error('GET /v1/job failed', err);
                app.abort(res, 500, 'GET /v1/job failed');
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

                var name = parseForm('name', req, res);
                var status = parseForm('status', req, res);
                var scheduledFor = parseForm('scheduled_for', req, res);
                var validUntil = parseForm('valid_until', req, res);
                var inputData = parseForm('input_data', req, res);
                q.all([ name, status, scheduledFor, validUntil, inputData ])
                    .then(function (result) {
                        name = result[0];
                        status = result[1];
                        scheduledFor = result[2];
                        validUntil = result[3];
                        inputData = result[4];
                        if (!name.valid || !status.valid || !scheduledFor.valid || !validUntil.valid || !inputData.valid) {
                            return res.json({
                                success: false,
                                errors: [],
                                fields: {
                                    name: name.errors,
                                    status: status.errors,
                                    scheduled_for: scheduledFor.errors,
                                    valid_until: validUntil.errors,
                                    input_data: inputData.errors,
                                }
                            });
                        }

                        var job = new JobModel();
                        job.setName(name.value);
                        job.setStatus(status.value);
                        job.setCreatedAt(moment());
                        job.setScheduledFor(scheduledFor.value.length ? moment.unix(scheduledFor.value) : moment());
                        job.setValidUntil(validUntil.value.length ? moment.unix(validUntil.value) : moment().add(1, 'minutes'));
                        job.setInputData(inputData.value.length ? JSON.parse(inputData.value) : {});
                        job.setOutputData({});

                        var jobRepo = locator.get('job-repository');
                        jobRepo.save(job)
                            .then(function (jobId) {
                                if (jobId === null)
                                    res.json({ success: false, errors: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });
                                else
                                    res.json({ success: true, id: jobId });
                            })
                            .catch(function (err) {
                                logger.error('POST /v1/job failed', err);
                                app.abort(res, 500, 'POST /v1/job failed');
                            });
                    })
                    .catch(function (err) {
                        logger.error('POST /v1/job failed', err);
                        app.abort(res, 500, 'POST /v1/job failed');
                    });
            })
            .catch(function (err) {
                logger.error('POST /v1/job failed', err);
                app.abort(res, 500, 'POST /v1/job failed');
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

                var name = parseForm('name', req, res);
                var status = parseForm('status', req, res);
                var scheduledFor = parseForm('scheduled_for', req, res);
                var validUntil = parseForm('valid_until', req, res);
                var inputData = parseForm('input_data', req, res);
                q.all([ name, status, scheduledFor, validUntil, inputData ])
                    .then(function (result) {
                        name = result[0];
                        status = result[1];
                        scheduledFor = result[2];
                        validUntil = result[3];
                        inputData = result[4];
                        if (!name.valid || !status.valid || !scheduledFor.valid || !validUntil.valid || !inputData.valid) {
                            return res.json({
                                success: false,
                                errors: [],
                                fields: {
                                    name: name.errors,
                                    status: status.errors,
                                    scheduled_for: scheduledFor.errors,
                                    valid_until: validUntil.errors,
                                    input_data: inputData.errors,
                                }
                            });
                        }

                        var jobRepo = locator.get('job-repository');
                        jobRepo.find(jobId)
                            .then(function (jobs) {
                                var job = jobs.length && jobs[0];
                                if (!job)
                                    return app.abort(res, 404, "Job " + jobId + " not found");

                                job.setName(name.value);
                                job.setStatus(status.value);
                                job.setScheduledFor(scheduledFor.value.length ? moment.unix(scheduledFor.value) : moment());
                                job.setValidUntil(validUntil.value.length ? moment.unix(validUntil.value) : moment().add(1, 'minutes'));
                                job.setInputData(inputData.value.length ? JSON.parse(inputData.value) : {});

                                var jobRepo = locator.get('job-repository');
                                jobRepo.save(job)
                                    .then(function (jobId) {
                                        if (jobId === null)
                                            res.json({ success: false, errors: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });
                                        else
                                            res.json({ success: true });
                                    })
                                    .catch(function (err) {
                                        logger.error('PUT /v1/job/' + jobId + ' failed', err);
                                        app.abort(res, 500, 'PUT /v1/job/' + jobId + ' failed');
                                    });
                            })
                            .catch(function (err) {
                                logger.error('PUT /v1/job/' + jobId + ' failed', err);
                                app.abort(res, 500, 'PUT /v1/job/' + jobId + ' failed');
                            });
                    })
                    .catch(function (err) {
                        logger.error('PUT /v1/job/' + jobId + ' failed', err);
                        app.abort(res, 500, 'PUT /v1/job/' + jobId + ' failed');
                    });
            })
            .catch(function (err) {
                logger.error('PUT /v1/job/' + jobId + ' failed', err);
                app.abort(res, 500, 'PUT /v1/job/' + jobId + ' failed');
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

                        return jobRepo.delete(job);
                    })
                    .then(function (count) {
                        res.json({ success: count > 0 });
                    })
                    .catch(function (err) {
                        logger.error('DELETE /v1/job/' + jobId + ' failed', err);
                        app.abort(res, 500, 'DELETE /v1/job/' + jobId + ' failed');
                    });
            })
            .catch(function (err) {
                logger.error('DELETE /v1/job/' + jobId + ' failed', err);
                app.abort(res, 500, 'DELETE /v1/job/' + jobId + ' failed');
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
                        res.json({ success: count > 0 });
                    })
                    .catch(function (err) {
                        logger.error('DELETE /v1/job failed', err);
                        app.abort(res, 500, 'DELETE /v1/job failed');
                    });
            })
            .catch(function (err) {
                logger.error('DELETE /v1/job failed', err);
                app.abort(res, 500, 'DELETE /v1/job failed');
            });
    });

    app.use('/v1/job', router);
};
