/**
 * Form validator service
 */

'use strict';

var locator = require('node-service-locator');
var q = require('q');
var logger = locator.get('logger');

function Validator() {
    this.fields = [];
    this.parsers = {};
    this.reset();
}

Validator.prototype.reset = function () {
    this.values = {};
    this.errors = {};
};

Validator.prototype.getValue = function (field) {
    return this.values[field];
};

Validator.prototype.getErrors = function (field) {
    if (field)
        return this.errors[field];

    var me = this;
    var result = {};
    this.fields.forEach(function (field) {
        result[field] = me.errors[field];
    });

    return result;
};

Validator.prototype.addParser = function (field, parser) {
    if (this.fields.indexOf(field) == -1)
        this.fields.push(field);

    this.parsers[field] = parser;
};

Validator.prototype.validateField = function(field, req, res) {
    var me = this;
    var defer = q.defer();

    this.parsers[field](req, res)
        .then(function (result) {
            me.values[field] = result.value;
            me.errors[field] = result.errors;
            defer.resolve(result.errors.length == 0);
        })
        .catch(function (err) {
            logger.error('Validator.validateField', err);
        });

    return defer.promise;
};

Validator.prototype.validateAll = function (req, res) {
    var me = this;
    var defer = q.defer();

    this.reset();

    var promises = [];
    this.fields.forEach(function (field) {
        promises.push(me.validateField(field, req, res));
    });

    q.all(promises)
        .then(function () {
            var success = me.fields.every(function (field) {
                return me.errors[field].length == 0;
            });
            defer.resolve(success);
        })
        .catch(function (err) {
            logger.error('Validator.validateAll', err);
        });

    return defer.promise;
};

module.exports = Validator;
