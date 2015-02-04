'use strict';

var object = require('isomorph/object')
var Field = require('../Field')
var NumberInput = require('../widgets/NumberInput')

var {MaxValueValidator, MinValueValidator, ValidationError} = require('validators')

/**
 * Validates that its input is a valid integer.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var IntegerField = Field.extend({
  widget: NumberInput
, defaultErrorMessages: {
    invalid: 'Enter a whole number.'
  }

, constructor: function IntegerField(kwargs) {
    if (!(this instanceof IntegerField)) { return new IntegerField(kwargs) }
    kwargs = object.extend({maxValue: null, minValue: null}, kwargs)
    this.maxValue = kwargs.maxValue
    this.minValue = kwargs.minValue
    Field.call(this, kwargs)

    if (this.minValue !== null) {
      this.validators.push(MinValueValidator(this.minValue))
    }
    if (this.maxValue !== null) {
      this.validators.push(MaxValueValidator(this.maxValue))
    }
  }
})

/**
 * Validates that Number() can be called on the input with a result that isn't
 * NaN and doesn't contain any decimal points.
 * @param {*} value user input.
 * @return {?number} the result of Number(), or null for empty values.
 * @throws {ValidationError} if the input is invalid.
 */
IntegerField.prototype.toJavaScript = function(value) {
  value = Field.prototype.toJavaScript.call(this, value)
  if (this.isEmptyValue(value)) {
    return null
  }
  value = Number(value)
  if (isNaN(value) || value.toString().indexOf('.') != -1) {
    throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
  }
  return value
}

IntegerField.prototype.widgetAttrs = function(widget) {
  var attrs = Field.prototype.widgetAttrs.call(this, widget)
  if (widget instanceof NumberInput) {
    if (this.minValue !== null) {
      attrs.min = this.minValue
    }
    if (this.maxValue !== null) {
      attrs.max = this.maxValue
    }
  }
  return attrs
}

module.exports = IntegerField