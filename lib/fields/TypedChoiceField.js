'use strict';

var object = require('isomorph/object')
var validators = require('validators')

var ChoiceField = require('./ChoiceField')

var ValidationError = validators.ValidationError

/**
 * A ChoiceField which returns a value coerced by some provided function.
 * @constructor
 * @extends {ChoiceField}
 * @param {Object=} kwargs
 */
var TypedChoiceField = ChoiceField.extend({
  constructor: function TypedChoiceField(kwargs) {
    if (!(this instanceof TypedChoiceField)) { return new TypedChoiceField(kwargs) }
    kwargs = object.extend({
      coerce: function(val) { return val }, emptyValue: ''
    }, kwargs)
    this.coerce = object.pop(kwargs, 'coerce')
    this.emptyValue = object.pop(kwargs, 'emptyValue')
    ChoiceField.call(this, kwargs)
  }
})

/**
 * Validate that the value can be coerced to the right type (if not empty).
 */
TypedChoiceField.prototype._coerce = function(value) {
  if (value === this.emptyValue || this.isEmptyValue(value)) {
    return this.emptyValue
  }
  try {
    value = this.coerce(value)
  }
  catch (e) {
    throw ValidationError(this.errorMessages.invalidChoice, {
      code: 'invalidChoice'
    , params: {value: value}
    })
  }
  return value
}

TypedChoiceField.prototype.clean = function(value) {
  value = ChoiceField.prototype.clean.call(this, value)
  return this._coerce(value)
}


module.exports = TypedChoiceField