/**
 * Job model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = require('./base');

function JobModel(dbRow) {
    this.id = null;
    this.name = null;
    this.status = null;
    this.created_at = moment();
    this.scheduled_for = moment();
    this.input_data = {};
    this.output_data = {};

    if (dbRow) {
        var utcCreated = moment(dbRow.created_at); // db field is in UTC
        var utcScheduled = moment(dbRow.scheduled_for); // db field is in UTC

        this.id = dbRow.id;
        this.name = dbRow.name;
        this.status = dbRow.status;
        this.created_at = moment.tz(utcCreated.format('YYYY-MM-DD HH:mm:ss'), 'UTC').local();
        this.scheduled_for = moment.tz(utcScheduled.format('YYYY-MM-DD HH:mm:ss'), 'UTC').local();
        this.input_data = dbRow.input_data;
        this.output_data = dbRow.output_data;
    }
};

JobModel.prototype = new BaseModel();
JobModel.prototype.constructor = JobModel;

JobModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

JobModel.prototype.getId = function () {
    return this.field('id');
};

JobModel.prototype.setName = function (name) {
    this.field('name', name);
    return this;
};

JobModel.prototype.getName = function () {
    return this.field('name');
};

JobModel.prototype.setStatus = function (status) {
    this.field('status', status);
    return this;
};

JobModel.prototype.getStatus = function () {
    return this.field('status');
};

JobModel.prototype.setCreatedAt = function (createdAt) {
    this.field('created_at', createdAt);
    return this;
};

JobModel.prototype.getCreatedAt = function () {
    return this.field('created_at');
};

JobModel.prototype.setScheduledFor = function (scheduledFor) {
    this.field('scheduled_for', scheduledFor);
    return this;
};

JobModel.prototype.getScheduledFor = function () {
    return this.field('scheduled_for');
};

JobModel.prototype.setInputData = function (data) {
    this.field('input_data', data);
    return this;
};

JobModel.prototype.getInputData = function () {
    return this.field('input_data');
};

JobModel.prototype.setOutputData = function (data) {
    this.field('output_data', data);
    return this;
};

JobModel.prototype.getOutputData = function () {
    return this.field('output_data');
};

module.exports = JobModel;
