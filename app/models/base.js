/**
 * Base model
 */

'use strict'

var uuid = require('uuid');

function BaseModel(model) {
    this._dirty = false;
    if (typeof model != 'undefined')
        this.data(model);
}

BaseModel.DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
BaseModel.UUID_REGEX = '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$';

BaseModel.prototype.dirty = function (newValue) {
    if (typeof newValue != 'undefined')
        this._dirty = newValue;

    return this._dirty;
};

BaseModel.prototype.field = function (name, value) {
    if (typeof value != 'undefined') {
        this[name] = value;
        this._dirty = true;
    }

    return this[name];
};

BaseModel.prototype.data = function (model) {
    throw new Error('BaseModel.data() must be redefined');
};

BaseModel.prototype.generateUuid = function () {
    return uuid.v1();
};

BaseModel.prototype.testUuid = function (value) {
    return new RegExp(BaseModel.UUID_REGEX).test(value);
};

module.exports = BaseModel;
