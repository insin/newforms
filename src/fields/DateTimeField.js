'use strict';

var is = require('isomorph/is')

var BaseTemporalField = require('./BaseTemporalField')
var DateTimeInput = require('../widgets/DateTimeInput')

var {ValidationError} = require('validators')

/**
 * Validates that its input is a date/time.
 * @constructor
 * @extends {BaseTemporalField}
 * @param {Object=} kwargs
 */
var DateTimeField = BaseTemporalField.extend({
  widget: DateTimeInput
, inputFormatType: 'DATETIME_INPUT_FORMATS'
, defaultErrorMessages: {
    invalid: 'Enter a valid date/time.'
  }

, constructor: function DateTimeField(kwargs) {
    if (!(this instanceof DateTimeField)) { return new DateTimeField(kwargs) }
    BaseTemporalField.call(this, kwargs)
  }
})

/**
 * @param {?(string|Date|Array.<string>)} value user input.
 * @return {?Date}
 * @throws {ValidationError} if the input is invalid.
 */
DateTimeField.prototype.toJavaScript = function(value) {
  if (this.isEmptyValue(value)) {
    return null
  }
  if (value instanceof Date) {
    return value
  }
  if (is.Array(value)) {
    // Input comes from a SplitDateTimeWidget, for example, so it's two
    // components: date and time.
    if (value.length != 2) {
      throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
    }
    if (this.isEmptyValue(value[0]) && this.isEmptyValue(value[1])) {
      return null
    }
    value = value.join(' ')
  }
  return BaseTemporalField.prototype.toJavaScript.call(this, value)
}


module.exports = DateTimeField