/**
 * Base model
 */

'use strict'

function BaseModel() {
    this._dirty = false;
}

BaseModel.prototype.field = function (name, value) {
    if (typeof value != 'undefined') {
        this[name] = value;
        this._dirty = true;
    }

    return this[name];
};

BaseModel.prototype.dirty = function (newValue) {
    if (typeof newValue != 'undefined')
        this._dirty = newValue;

    return this._dirty;
};

module.exports = BaseModel;
