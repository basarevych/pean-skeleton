/**
 * Form validator service
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var validator = require('validator');
var logger = locator.get('logger');

/**
 * Form validator
 *
 * @constructor
 */
function Validator() {
    this.fields = [];           // Form fields
    this.parsers = {};          // Form field parsers
    this.reset();
}

/**
 * Convert value to a trimmed string
 *
 * @param {*} value             The value
 * @return {string}             Returns a string
 */
Validator.trim = function (value) {
    if (typeof value == 'string')
        return validator.trim(value);
    if (typeof value == 'number')
        return String(value);
    return '';
};

/**
 * Escape a value, string or not
 *
 * @param {*} value             The value
 * @return {string}             Returns a string
 */
Validator.escape = function (value) {
    if (typeof value == 'string')
        return validator.escape(value);
    if (typeof value == 'number')
        return String(value);
    return '';
};

/**
 * Reset field values and errors
 */
Validator.prototype.reset = function () {
    this.values = {};
    this.errors = {};
};

/**
 * Get field value
 *
 * @param {string} field        Field name
 * @return {*}                  Returns the value
 */
Validator.prototype.getValue = function (field) {
    return this.values[field];
};

/**
 * Get field validation errors
 *
 * @param {string} [field]      Field name, all fields if ommited
 * @return {string[]}           Returns object or array of errors
 */
Validator.prototype.getErrors = function (field) {
    if (field)
        return this.errors[field];          // Return array of errors

    var me = this;
    var result = {};
    this.fields.forEach(function (field) {
        result[field] = me.errors[field];   // Object: { field_name: [ 'errors' ], ... }
    });

    return result;
};

/**
 * Field parser callback which sets field value and errors
 *
 * @callback Validator~fieldParser
 * @param {object} req          Express.js request object
 * @param {object} res          Express.js response object
 * @param {*} [id]              ID of the object being validated
 * @return {object}             Returns object { value: 'some value', errors: [ 'an error' ] }
 */

/**
 * Create form field by assigning its parser
 *
 * @param {string} field                    Field name
 * @param {Validator~fieldParser} parser    Field parser
 */
Validator.prototype.addParser = function (field, parser) {
    if (this.fields.indexOf(field) == -1)
        this.fields.push(field);

    this.parsers[field] = parser;
};

/**
 * Validate single field
 *
 * @param {object} req          Express.js request object
 * @param {object} res          Express.js response object
 * @param {string} field        Field name
 * @param {*} [id]              ID of the object being validated
 * @return {object}             Returns promise resolving to validation result
 */
Validator.prototype.validateField = function(req, res, field, id) {
    this.reset();
    return this._validate(req, res, field, id);
};

/**
 * Validate all the fields
 *
 * @param {object} req          Express.js request object
 * @param {object} res          Express.js response object
 * @param {*} [id]              ID of the object being validated
 * @return {object}             Returns promise resolving to validation result
 */
Validator.prototype.validateAll = function (req, res, id) {
    var me = this;
    var defer = q.defer();

    this.reset();

    var promises = [];
    this.fields.forEach(function (field) {
        promises.push(me._validate(req, res, field, id));
    });

    q.all(promises)
        .then(function () {
            var success = me.fields.every(function (field) {
                return (me.errors[field].length === 0);
            });
            defer.resolve(success);
        })
        .catch(function (err) {
            logger.error('Validator.validateAll', err);
        });

    return defer.promise;
};

/**
 * Do actual validation on a field
 *
 * @param {object} req          Express.js request object
 * @param {object} res          Express.js response object
 * @param {string} field        Field name
 * @param {*} [id]              ID of the object being validated
 * @return {object}             Returns promise resolving to validation result
 */
Validator.prototype._validate = function (req, res, field, id) {
    var me = this;
    var defer = q.defer();

    if (typeof this.parsers[field] == 'undefined') {
        var glMessage = res.locals.glMessage;
        me.errors[field] = [ glMessage('VALIDATOR_UNKNOWN_FIELD') ];
        defer.resolve(false);
        return defer.promise;
    }

    this.parsers[field](req, res, id)
        .then(function (result) {
            me.values[field] = result.value;
            me.errors[field] = result.errors;
            defer.resolve(result.errors.length === 0);
        })
        .catch(function (err) {
            logger.error('Validator.validateField', err);
        });

    return defer.promise;
};

module.exports = Validator;
