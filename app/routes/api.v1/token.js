/**
 * Token route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var moment = require('moment-timezone');
var Table = require('dynamic-table').table();
var PgAdapter = require('dynamic-table').pgAdapter();
var TokenModel = locator.get('token-model');

module.exports = function () {
    var router = express.Router();
    var app = locator.get('app');

    router.get('/table', function (req, res) {
        var userId = parseInt(req.query.user_id, 10);
        if (isNaN(userId))
            return app.abort(res, 400, "Invalid user ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'token', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var table = new Table();
                table.setColumns({
                    id: {
                        title: res.locals.glMessage('TOKEN_ID_COLUMN'),
                        sql_id: 'id',
                        type: Table.TYPE_INTEGER,
                        filters: [ Table.FILTER_EQUAL ],
                        sortable: true,
                        visible: true,
                    },
                    ip_address: {
                        title: res.locals.glMessage('TOKEN_IP_ADDRESS_COLUMN'),
                        sql_id: 'ip_address',
                        type: Table.TYPE_STRING,
                        filters: [ Table.FILTER_LIKE, Table.FILTER_NULL ],
                        sortable: true,
                        visible: true,
                    },
                    created_at: {
                        title: res.locals.glMessage('TOKEN_CREATED_AT_COLUMN'),
                        sql_id: 'created_at',
                        type: Table.TYPE_DATETIME,
                        filters: [ Table.FILTER_BETWEEN, Table.FILTER_NULL ],
                        sortable: true,
                        visible: true,
                    },
                    updated_at: {
                        title: res.locals.glMessage('TOKEN_UPDATED_AT_COLUMN'),
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

                var tokenRepo = locator.get('token-repository');
                var adapter = new PgAdapter();
                adapter.setClient(tokenRepo.getPostgres());
                adapter.setSelect("*");
                adapter.setFrom("tokens");
                adapter.setWhere("user_id = $1");
                adapter.setParams([ userId ]);
                table.setAdapter(adapter);

                switch (req.query.query) {
                    case 'describe':
                        table.describe(function (err, result) {
                            if (err)
                                return app.abort(res, 500, 'GET /v1/token/table failed', err);

                            result['success'] = true;
                            res.json(result);
                        });
                        break;
                    case 'data':
                        table.setPageParams(req.query)
                            .fetch(function (err, result) {
                                if (err)
                                    return app.abort(res, 500, 'GET /v1/token/table failed', err);

                                result['success'] = true;
                                res.json(result);
                            });
                        break;
                    default:
                        res.json({ success: false });
                }
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/token/table failed', err);
            });
    });

    router.get('/:tokenId', function (req, res) {
        var tokenId = parseInt(req.params.tokenId, 10);
        if (isNaN(tokenId))
            return app.abort(res, 400, "Invalid token ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'token', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var tokenRepo = locator.get('token-repository');
                tokenRepo.find(tokenId)
                    .then(function (tokens) {
                        var token = tokens.length && tokens[0];
                        if (!token)
                            return app.abort(res, 404, "Token " + tokenId + " not found");

                        res.json({
                            id: token.getId(),
                            user_id: token.getUserId(),
                            ip_address: token.getIpAddress(),
                            created_at: token.getCreatedAt().unix(),
                            updated_at: token.getUpdatedAt().unix(),
                            payload: token.getPayload(),
                        });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'GET /v1/token/' + tokenId + ' failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/token/' + tokenId + ' failed', err);
            });
    });

    router.get('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'token', 'read')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var tokenRepo = locator.get('token-repository');
                tokenRepo.findAll()
                    .then(function (tokens) {
                        var result = [];
                        tokens.forEach(function (token) {
                            result.push({
                                id: token.getId(),
                                user_id: token.getUserId(),
                                ip_address: token.getIpAddress(),
                                created_at: token.getCreatedAt().unix(),
                                updated_at: token.getUpdatedAt().unix(),
                                payload: token.getPayload(),
                            });
                        });
                        res.json(result);
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'GET /v1/token failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'GET /v1/token failed', err);
            });
    });

    router.delete('/:tokenId', function (req, res) {
        var tokenId = parseInt(req.params.tokenId, 10);
        if (isNaN(tokenId))
            return app.abort(res, 400, "Invalid token ID");

        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'token', 'delete')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var tokenRepo = locator.get('token-repository');
                tokenRepo.find(tokenId)
                    .then(function (tokens) {
                        var token = tokens.length && tokens[0];
                        if (!token)
                            return app.abort(res, 404, "Token " + tokenId + " not found");

                        return tokenRepo.delete(token);
                    })
                    .then(function (count) {
                        if (count == 0)
                            return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                        res.json({ success: true });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'DELETE /v1/token/' + tokenId + ' failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/token/' + tokenId + ' failed', err);
            });
    });

    router.delete('/', function (req, res) {
        if (!req.user)
            return app.abort(res, 401, "Not logged in");

        var acl = locator.get('acl');
        acl.isAllowed(req.user, 'token', 'delete')
            .then(function (isAllowed) {
                if (!isAllowed)
                    return app.abort(res, 403, "ACL denied");

                var tokenRepo = locator.get('token-repository');
                tokenRepo.deleteAll()
                    .then(function (count) {
                        if (count == 0)
                            return res.json({ success: false, messages: [ res.locals.glMessage('ERROR_OPERATION_FAILED') ] });

                        res.json({ success: true });
                    })
                    .catch(function (err) {
                        app.abort(res, 500, 'DELETE /v1/token failed', err);
                    });
            })
            .catch(function (err) {
                app.abort(res, 500, 'DELETE /v1/token failed', err);
            });
    });

    app.use('/v1/token', router);
};
