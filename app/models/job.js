/**
 * Job model
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseModel = locator.get('base-model');

/**
 * Job model class
 *
 * @constructor
 * @param {object} model    DB row used as source for this instance
 */
function JobModel(model) {
    this.id = null;
    this.name = null;
    this.queue = null;
    this.status = null;
    this.created_at = moment();
    this.scheduled_for = moment();
    this.valid_until = moment();
    this.input_data = {};
    this.output_data = {};

    BaseModel.call(this, model);
};

JobModel.POSTPONE_INTERVAL = 60; // seconds

JobModel.prototype = new BaseModel();
JobModel.prototype.constructor = JobModel;

/**
 * Method for setting/querying model fields
 *
 * Note: If a field is date/time then UTC string should be passed
 *       It will be converted to local time zone Moment.js instance
 *
 * @param {object} [model]      New value
 * @return {object}             Current value
 */
JobModel.prototype.data = function (model) {
    if (typeof model == 'undefined') {
        model = {
            id: this.id,
            name: this.name,
            queue: this.queue,
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
        this.queue = model.queue;
        this.status = model.status;
        this.created_at = moment.tz(utcCreated.format(BaseModel.DATETIME_FORMAT), 'UTC').local();
        this.scheduled_for = moment.tz(utcScheduled.format(BaseModel.DATETIME_FORMAT), 'UTC').local();
        this.valid_until = moment.tz(utcValid.format(BaseModel.DATETIME_FORMAT), 'UTC').local();
        this.input_data = model.input_data;
        this.output_data = model.output_data;
    }

    return model;
};

/**
 * ID setter
 *
 * @param {integer} id      New ID
 * @return {object}         Returns self
 */
JobModel.prototype.setId = function (id) {
    this.field('id', id);
    return this;
};

/**
 * ID getter
 *
 * @return {integer}        Returns current ID
 */
JobModel.prototype.getId = function () {
    return this.field('id');
};

/**
 * Name setter
 *
 * @param {string} name     New name
 * @return {object}         Returns self
 */
JobModel.prototype.setName = function (name) {
    this.field('name', name);
    return this;
};

/**
 * Name getter
 *
 * @return {string}         Returns current name
 */
JobModel.prototype.getName = function () {
    return this.field('name');
};

/**
 * Queue setter
 *
 * @param {string} queue    New queue
 * @return {object}         Returns self
 */
JobModel.prototype.setQueue = function (queue) {
    this.field('queue', queue);
    return this;
};

/**
 * Queue getter
 *
 * @return {string}         Returns current queue
 */
JobModel.prototype.getQueue = function () {
    return this.field('queue');
};

/**
 * Status setter
 *
 * @param {string} status   New status
 * @return {object}         Returns self
 */
JobModel.prototype.setStatus = function (status) {
    this.field('status', status);
    return this;
};

/**
 * Status getter
 *
 * @return {object}         Returns current status
 */
JobModel.prototype.getStatus = function () {
    return this.field('status');
};

/**
 * Creation date setter
 *
 * @param {object} createdAt    Moment.js instance
 * @return {object}             Returns self
 */
JobModel.prototype.setCreatedAt = function (createdAt) {
    this.field('created_at', createdAt);
    return this;
};

/**
 * Creation date getter
 *
 * @retrun {object}         Returns Moment.js instance
 */
JobModel.prototype.getCreatedAt = function () {
    return this.field('created_at');
};

/**
 * Scheduled for date setter
 *
 * @param {object} scheduledFor     Moment.js instance
 * @return {object}                 Returns self
 */
JobModel.prototype.setScheduledFor = function (scheduledFor) {
    this.field('scheduled_for', scheduledFor);
    return this;
};

/**
 * Scheduled for date getter
 *
 * @return {object}         Returns Moment.js instance
 */
JobModel.prototype.getScheduledFor = function () {
    return this.field('scheduled_for');
};

/**
 * Valid until date setter
 *
 * @param {object} validUntil       Moment.js instance
 * @return {object}                 Returns self
 */
JobModel.prototype.setValidUntil = function (validUntil) {
    this.field('valid_until', validUntil);
    return this;
};

/**
 * Valid until date getter
 *
 * @return {object}         Returns Moment.js instance
 */
JobModel.prototype.getValidUntil = function () {
    return this.field('valid_until');
};

/**
 * Input data object setter
 *
 * @param {object} data     Any JS object
 * @return {object}         Returns self
 */
JobModel.prototype.setInputData = function (data) {
    this.field('input_data', data);
    return this;
};

/**
 * Input data object getter
 *
 * @return {object}         Returns the input object
 */
JobModel.prototype.getInputData = function () {
    return this.field('input_data');
};

/**
 * Output data object setter
 *
 * @param {object} data     Any JS object
 * @return {object}         Returns self
 */
JobModel.prototype.setOutputData = function (data) {
    this.field('output_data', data);
    return this;
};

/**
 * Output data object getter
 *
 * @return {object}         Returns the input object
 */
JobModel.prototype.getOutputData = function () {
    return this.field('output_data');
};

module.exports = JobModel;
