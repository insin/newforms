'use strict';

var BaseTemporalField = require('./BaseTemporalField')
var DateInput = require('../widgets/DateInput')

/**
 * Validates that its input is a date.
 * @constructor
 * @extends {BaseTemporalField}
 * @param {Object=} kwargs
 */
var DateField = BaseTemporalField.extend({
  widget: DateInput
, inputFormatType: 'DATE_INPUT_FORMATS'
, defaultErrorMessages: {
    invalid: 'Enter a valid date.'
  }

, constructor: function DateField(kwargs) {
    if (!(this instanceof DateField)) { return new DateField(kwargs) }
    BaseTemporalField.call(this, kwargs)
  }
})

/**
 * Validates that the input can be converted to a date.
 * @param {?(string|Date)} value user input.
 * @return {?Date} a with its year, month and day attributes set, or null for
 *   empty values when they are allowed.
 * @throws {ValidationError} if the input is invalid.
 */
DateField.prototype.toJavaScript = function(value) {
  if (this.isEmptyValue(value)) {
    return null
  }
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }
  return BaseTemporalField.prototype.toJavaScript.call(this, value)
}

module.exports = DateField