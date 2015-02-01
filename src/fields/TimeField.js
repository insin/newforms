'use strict';

var time = require('isomorph/time')

var locales = require('../locales')

var BaseTemporalField = require('./BaseTemporalField')
var TimeInput = require('../widgets/TimeInput')

/**
 * Validates that its input is a time.
 * @constructor
 * @extends {BaseTemporalField}
 * @param {Object=} kwargs
 */
var TimeField = BaseTemporalField.extend({
  widget: TimeInput
, inputFormatType: 'TIME_INPUT_FORMATS'
, defaultErrorMessages: {
    invalid: 'Enter a valid time.'
  }

, constructor: function TimeField(kwargs) {
    if (!(this instanceof TimeField)) { return new TimeField(kwargs) }
    BaseTemporalField.call(this, kwargs)
  }
})

/**
 * Validates that the input can be converted to a time.
 * @param {?(string|Date)} value user input.
 * @return {?Date} a Date with its hour, minute and second attributes set, or
 *   null for empty values when they are allowed.
 * @throws {ValidationError} if the input is invalid.
 */
TimeField.prototype.toJavaScript = function(value) {
  if (this.isEmptyValue(value)) {
    return null
  }
  if (value instanceof Date) {
    return new Date(1900, 0, 1, value.getHours(), value.getMinutes(), value.getSeconds())
  }
  return BaseTemporalField.prototype.toJavaScript.call(this, value)
}

/**
 * Creates a Date representing a time from the given input if it's valid based
 * on the format.
 * @param {string} value
 * @param {string} format
 * @return {Date}
 */
TimeField.prototype.strpdate = function(value, format) {
  var t = time.strptime(value, format, locales.getDefaultLocale())
  return new Date(1900, 0, 1, t[3], t[4], t[5])
}

module.exports = TimeField