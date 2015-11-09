/**
 * Job model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = locator.get('base-model');

function JobModel(model) {
    this.id = null;
    this.name = null;
    this.status = null;
    this.created_at = moment();
    this.scheduled_for = moment();
    this.valid_until = moment();
    this.input_data = {};
    this.output_data = {};

    BaseModel.call(this, model);
};

JobModel.prototype = new BaseModel();
JobModel.prototype.constructor = JobModel;

JobModel.prototype.data = function (model) {
    if (typeof model == 'undefined') {
        model = {
            id: this.id,
            name: this.name,
            status: this.status,
            created_at: this.created_at.tz('UTC').format(BaseModel.DATETIME_FORMAT), // return in UTC
            scheduled_for: this.scheduled_for.tz('UTC').format(BaseModel.DATETIME_FORMAT),
            valid_until: this.valid_until.tz('UTC').format(BaseModel.DATETIME_FORMAT),
            input_data: this.input_data,
            output_data: this.output_data,
        };
    } else {
        var utcCreated = moment(model.created_at); // db field is in UTC
        var utcScheduled = moment(model.scheduled_for);
        var utcValid = moment(model.valid_until);

        this.id = model.id;
        this.name = model.name;
        this.status = model.status;
        this.created_at = moment.tz(utcCreated.format(BaseModel.DATETIME_FORMAT), 'UTC').local();
        this.scheduled_for = moment.tz(utcScheduled.format(BaseModel.DATETIME_FORMAT), 'UTC').local();
        this.valid_until = moment.tz(utcValid.format(BaseModel.DATETIME_FORMAT), 'UTC').local();
        this.input_data = model.input_data;
        this.output_data = model.output_data;
    }

    return model;
};

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

JobModel.prototype.setValidUntil = function (validUntil) {
    this.field('valid_until', validUntil);
    return this;
};

JobModel.prototype.getValidUntil = function () {
    return this.field('valid_until');
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
