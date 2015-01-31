'use strict';

var object = require('isomorph/object')
var validators = require('validators')

var util = require('../util')

var Field = require('../Field')
var IntegerField = require('./IntegerField')
var NumberInput = require('../widgets/NumberInput')

var ValidationError = validators.ValidationError

/**
 * Validates that its input is a decimal number.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var DecimalField = IntegerField.extend({
  defaultErrorMessages: {
    invalid: 'Enter a number.'
  , maxDigits: 'Ensure that there are no more than {max} digits in total.'
  , maxDecimalPlaces: 'Ensure that there are no more than {max} decimal places.'
  , maxWholeDigits: 'Ensure that there are no more than {max} digits before the decimal point.'
  }

, constructor: function DecimalField(kwargs) {
    if (!(this instanceof DecimalField)) { return new DecimalField(kwargs) }
    kwargs = object.extend({maxDigits: null, decimalPlaces: null}, kwargs)
    this.maxDigits = kwargs.maxDigits
    this.decimalPlaces = kwargs.decimalPlaces
    IntegerField.call(this, kwargs)
  }
})

/** Decimal validation regular expression, in lieu of a Decimal type. */
DecimalField.DECIMAL_REGEXP = /^[-+]?(?:\d+(?:\.\d*)?|(?:\d+)?\.\d+)$/

/**
 * DecimalField overrides the clean() method as it performs its own validation
 * against a different value than that given to any defined validators, due to
 * JavaScript lacking a built-in Decimal type. Decimal format and component size
 * checks will be performed against a normalised string representation of the
 * input, whereas Validators will be passed a float version of the value for
 * min/max checking.
 * @param {string|Number} value
 * @return {string} a normalised version of the input.
 */
DecimalField.prototype.clean = function(value) {
  // Take care of empty, required validation
  Field.prototype.validate.call(this, value)
  if (this.isEmptyValue(value)) {
    return null
  }

  // Coerce to string and validate that it looks Decimal-like
  value = util.strip(''+value)
  if (!DecimalField.DECIMAL_REGEXP.test(value)) {
    throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
  }

  // In lieu of a Decimal type, DecimalField validates against a string
  // representation of a Decimal, in which:
  // * Any leading sign has been stripped
  var negative = false
  if (value.charAt(0) == '+' || value.charAt(0) == '-') {
    negative = (value.charAt(0) == '-')
    value = value.substr(1)
  }
  // * Leading zeros have been stripped from digits before the decimal point,
  //   but trailing digits are retained after the decimal point.
  value = value.replace(/^0+/, '')
  // Reset to zero if we just wiped out all the digits in the input
  if (value === '' || value == '.') {
    value = '0'
  }
  // * If the input ended with a '.', it is stripped
  if (value.indexOf('.') == value.length - 1) {
    value = value.substring(0, value.length - 1)
  }

  // Perform own validation
  var pieces = value.split('.')
  var wholeDigits = pieces[0].length
  var decimals = (pieces.length == 2 ? pieces[1].length : 0)
  var digits = wholeDigits + decimals
  if (this.maxDigits !== null && digits > this.maxDigits) {
    throw ValidationError(this.errorMessages.maxDigits, {
      code: 'maxDigits'
    , params: {max: this.maxDigits}
    })
  }
  if (this.decimalPlaces !== null && decimals > this.decimalPlaces) {
    throw ValidationError(this.errorMessages.maxDecimalPlaces, {
      code: 'maxDecimalPlaces'
    , params: {max: this.decimalPlaces}
    })
  }
  if (this.maxDigits !== null &&
      this.decimalPlaces !== null &&
      wholeDigits > (this.maxDigits - this.decimalPlaces)) {
    throw ValidationError(this.errorMessages.maxWholeDigits, {
      code: 'maxWholeDigits'
    , params: {max: (this.maxDigits - this.decimalPlaces)}
    })
  }

  // * Values which did not have a leading zero gain a single leading zero
  if (value.charAt(0) == '.') {
    value = '0' + value
  }
  // Restore sign if necessary
  if (negative) {
    value = '-' + value
  }

  // Validate against a float value - best we can do in the meantime
  this.runValidators(parseFloat(value))

  // Return the normalised String representation
  return value
}

DecimalField.prototype.widgetAttrs = function(widget) {
  var attrs = IntegerField.prototype.widgetAttrs.call(this, widget)
  if (widget instanceof NumberInput &&
      !object.hasOwn(widget.attrs, 'step')) {
    var step = 'any'
    if (this.decimalPlaces !== null) {
      // Use exponential notation for small values since they might
      // be parsed as 0 otherwise.
      if (this.decimalPlaces === 0) {
        step = '1'
      }
      else if (this.decimalPlaces < 7) {
        step = '0.' + '000001'.slice(-this.decimalPlaces)
      }
      else {
        step = '1e-' + this.decimalPlaces
      }
    }
    object.setDefault(attrs, 'step', step)
  }
  return attrs
}

module.exports = DecimalField