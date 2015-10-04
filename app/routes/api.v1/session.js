/**
 * Session route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var moment = require('moment-timezone');
var Table = require('dynamic-table').table();
var PgAdapter = require('dynamic-table').pgAdapter();

module.exports = function (app) {
    var router = express.Router();
    var app = locator.get('app');
    var logger = locator.get('logger');

    router.get('/table', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'session', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var table = new Table();
                table.setColumns({
                    id: {
                        title: res.locals.glMessage('SESSION_ID_COLUMN'),
                        sql_id: 'id',
                        type: Table.TYPE_INTEGER,
                        filters: [ Table.FILTER_EQUAL ],
                        sortable: true,
                        visible: true,
                    },
                    ip_address: {
                        title: res.locals.glMessage('SESSION_IP_ADDRESS_COLUMN'),
                        sql_id: 'ip_address',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE, Table.FILTER_NULL ],
                        sortable: true,
                        visible: true,
                    },
                    created_at: {
                        title: res.locals.glMessage('SESSION_CREATED_AT_COLUMN'),
                        sql_id: 'created_at',
                        type: Table.TYPE_DATETIME,
                        filters: [ Table.FILTER_BETWEEN, Table.FILTER_NULL ],
                        sortable: true,
                        visible: true,
                    },
                    updated_at: {
                        title: res.locals.glMessage('SESSION_UPDATED_AT_COLUMN'),
                        sql_id: 'updated_at',
                        type: Table.TYPE_DATETIME,
                        filters: [ Table.FILTER_BETWEEN, Table.FILTER_NULL ],
                        sortable: true,
                        visible: true,
                    },
                });
                table.setMapper(function (row) {
                    var result = row;

                    result['ip_address'] = validator.escape(row['ip_address']);

                    if (row['created_at']) {
                        var utc = moment(row['created_at']); // db field is in UTC
                        var m = moment.tz(utc.format('YYYY-MM-DD HH:mm:ss'), 'UTC');
                        result['created_at'] = m.unix();
                    }

                    if (row['updated_at']) {
                        var utc = moment(row['updated_at']); // db field is in UTC
                        var m = moment.tz(utc.format('YYYY-MM-DD HH:mm:ss'), 'UTC');
                        result['updated_at'] = m.unix();
                    }

                    return result;
                });

                var sessionRepo = locator.get('session-repository');
                var adapter = new PgAdapter();
                adapter.setClient(sessionRepo.getPostgres());
                adapter.setSelect("*");
                adapter.setFrom("sessions");
                adapter.setWhere("user_id = $1");
                adapter.setParams([ req.query.user_id ]);
                table.setAdapter(adapter);

                switch (req.query.query) {
                    case 'describe':
                        table.describe(function (err, result) {
                            if (err) {
                                logger.error('GET /v1/session/table failed', err);
                                return app.abort(res, 500, 'GET /v1/session/table failed');
                            }

                            result['success'] = true;
                            res.json(result);
                        });
                        break;
                    case 'data':
                        table.setPageParams(req.query)
                            .fetch(function (err, result) {
                                if (err) {
                                    logger.error('GET /v1/session/table failed', err);
                                    return app.abort(res, 500, 'GET /v1/session/table failed');
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
                logger.error('GET /v1/session/table failed', err);
                app.abort(res, 500, 'GET /v1/session/table failed');
            });
    });

    app.use('/v1/session', router);
};
