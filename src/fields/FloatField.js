'use strict';

var object = require('isomorph/object')

var Field = require('../Field')
var IntegerField = require('./IntegerField')
var NumberInput = require('../widgets/NumberInput')

var {ValidationError} = require('validators')
var {strip} = require('../util')

/**
 * Validates that its input is a valid float.
 * @constructor
 * @extends {IntegerField}
 * @param {Object=} kwargs
 */
var FloatField = IntegerField.extend({
  defaultErrorMessages: {
    invalid: 'Enter a number.'
  }

, constructor: function FloatField(kwargs) {
    if (!(this instanceof FloatField)) { return new FloatField(kwargs) }
    IntegerField.call(this, kwargs)
  }
})

/** Float validation regular expression, as parseFloat() is too forgiving. */
FloatField.FLOAT_REGEXP = /^[-+]?(?:\d+(?:\.\d*)?|(?:\d+)?\.\d+)$/

/**
 * Validates that the input looks like valid input for parseFloat() and the
 * result of calling it isn't NaN.
 * @param {*} value user input.
 * @return a Number obtained from parseFloat(), or null for empty values.
 * @throws {ValidationError} if the input is invalid.
 */
FloatField.prototype.toJavaScript = function(value) {
  value = Field.prototype.toJavaScript.call(this, value)
  if (this.isEmptyValue(value)) {
    return null
  }
  value = strip(value)
  if (!FloatField.FLOAT_REGEXP.test(value)) {
    throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
  }
  value = parseFloat(value)
  if (isNaN(value)) {
    throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
  }
  return value
}

/**
 * Determines if data has changed from initial. In JavaScript, trailing zeroes
 * in floats are dropped when a float is coerced to a String, so e.g., an
 * initial value of 1.0 would not match a data value of '1.0' if we were to use
 * the Widget object's _hasChanged, which checks coerced String values.
 * @return {boolean} true if data has changed from initial.
 */
FloatField.prototype._hasChanged = function(initial, data) {
  // For purposes of seeing whether something has changed, null is the same
  // as an empty string, if the data or initial value we get is null, replace
  // it with ''.
  var dataValue = (data === null ? '' : data)
  var initialValue = (initial === null ? '' : initial)
  if (initialValue === dataValue) {
    return false
  }
  else if (initialValue === '' || dataValue === '') {
    return true
  }
  return (parseFloat(''+initialValue) != parseFloat(''+dataValue))
}

FloatField.prototype.widgetAttrs = function(widget) {
  var attrs = IntegerField.prototype.widgetAttrs.call(this, widget)
  if (widget instanceof NumberInput &&
      !object.hasOwn(widget.attrs, 'step')) {
    object.setDefault(attrs, 'step', 'any')
  }
  return attrs
}

module.exports = FloatField