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

module.exports = BaseModel;
