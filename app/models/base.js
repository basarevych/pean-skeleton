/**
 * Base model
 */

'use strict'

function BaseModel(model) {
    this._dirty = false;
    if (typeof model != 'undefined')
        this.data(model);
}

BaseModel.DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

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

module.exports = BaseModel;
