/**
 * Base model
 */

'use strict';

var uuid = require('uuid');

/**
 * Base model class
 *
 * @constructor
 * @param {object} model    DB row used as source for this instance
 */
function BaseModel(model) {
    this._dirty = false;
    if (typeof model != 'undefined')
        this.data(model);
}

BaseModel.DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
BaseModel.UUID_REGEX = '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$';

/**
 * Mark/query field is dirty (model not saved)
 *
 * Note: If a field is date/time then UTC string should be passed
 *       It will be converted to local time zone Moment.js instance
 *
 * @param {boolean} [newValue]  New value
 * @return {boolean}            Current value
 */
BaseModel.prototype.dirty = function (newValue) {
    if (typeof newValue != 'undefined')
        this._dirty = newValue;

    return this._dirty;
};

/**
 * Set/query model field
 *
 * @param {string} field        Name of the field
 * @param {*} value             New value
 * @return {*}                  Current value
 */
BaseModel.prototype.field = function (name, value) {
    if (typeof value != 'undefined') {
        this[name] = value;
        this._dirty = true;
    }

    return this[name];
};

/**
 * Method for setting/querying model fields
 *
 * @param {object} [model]      New value
 * @return {object}             Current value
 */
BaseModel.prototype.data = function (model) {
    throw new Error('BaseModel.data() must be redefined');
};

/**
 * Generate UUID
 *
 * @return {string}             UUID
 */
BaseModel.prototype.generateUuid = function () {
    return uuid.v1();
};

/**
 * Test if string is a UUID
 *
 * @param {string} value        String to test
 * @return {boolean}
 */
BaseModel.prototype.testUuid = function (value) {
    return new RegExp(BaseModel.UUID_REGEX).test(value);
};

module.exports = BaseModel;
