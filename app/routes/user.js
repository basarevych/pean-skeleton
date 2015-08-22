/**
 * User route
 */

'use strict'

var locator = require('node-service-locator');
var express = require('express');
var validator = require('validator');
var Table = require('dynamic-table').table();
var PgAdapter = require('dynamic-table').pgAdapter();

module.exports = function (app) {
    var router = express.Router();
    var app = locator.get('app');

    var columns = {
        id: {
            title: 'ID',
            sql_id: 'id',
            type: Table.TYPE_INTEGER,
            filters: [ Table.FILTER_EQUAL ],
            sortable: true,
            visible: true,
        },
        name: {
            title: 'Name',
            sql_id: 'name',
            type: Table.TYPE_STRING,
            filters: [ Table.FILTER_LIKE, Table.FILTER_NULL ],
            sortable: true,
            visible: true,
        },
        email: {
            title: 'Email',
            sql_id: 'email',
            type: Table.TYPE_STRING,
            filters: [ Table.FILTER_LIKE, Table.FILTER_NULL ],
            sortable: true,
            visible: true,
        },
        created_at: {
            title: 'Created at',
            sql_id: 'created_at',
            type: Table.TYPE_DATETIME,
            filters: [ Table.FILTER_BETWEEN, Table.FILTER_NULL ],
            sortable: true,
            visible: true,
        },
        is_admin: {
            title: 'Is admin',
            sql_id: 'is_admin',
            type: Table.TYPE_BOOLEAN,
            filters: [ Table.FILTER_EQUAL, Table.FILTER_NULL ],
            sortable: true,
            visible: true,
        },
    };

    var mapper = function (row) {
        var result = row;

        result['email'] = validator.escape(row['email']);

        if (row['created_at'] && typeof row['created_at'].getTime == 'function')
            result['created_at'] = row['created_at'].getTime() / 1000;

        return result;
    };

    router.get('/table', function (req, res) {
        var userRepo = locator.get('user-repository');

        var table = new Table();
        table.setColumns(columns);
        table.setMapper(mapper);

        var adapter = new PgAdapter();
        adapter.setClient(userRepo.getClient());
        adapter.setSelect('*');
        adapter.setFrom('users');
        adapter.setWhere("");
        adapter.setParams([ ]);
        table.setAdapter(adapter);

        switch (req.query.query) {
            case 'describe':
                table.describe(function (err, result) {
                    if (err) {
                        console.error(err);
                        return res.json({ success: false });
                    }

                    result['success'] = true;
                    res.json(result);
                });
                break;
            case 'data':
                table.setPageParams(req.query)
                    .fetch(function (err, result) {
                        if (err) {
                            console.error(err);
                            return res.json({ success: false });
                        }

                        result['success'] = true;
                        res.json(result);
                    });
                break;
            default:
                res.json({ success: false });
        }
    });

    app.use('/api/user', router);
};
