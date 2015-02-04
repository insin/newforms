'use strict';

var is = require('isomorph/is')
var object = require('isomorph/object')
var time = require('isomorph/time')

var formats = require('../formats')
var locales = require('../locales')

var Field = require('../Field')

var {ValidationError} = require('validators')
var {strip} = require('../util')

/**
 * Base field for fields which validate that their input is a date or time.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var BaseTemporalField = Field.extend({
  inputFormatType: ''
, constructor: function BaseTemporalField(kwargs) {
    kwargs = object.extend({inputFormats: null}, kwargs)
    Field.call(this, kwargs)
    this.inputFormats = kwargs.inputFormats
  }
})

/**
 * Validates that its input is a valid date or time.
 * @param {(string|Date)} value user input.
 * @return {Date}
 * @throws {ValidationError} if the input is invalid.
 */
BaseTemporalField.prototype.toJavaScript = function(value) {
  if (!is.Date(value)) {
    value = strip(value)
  }
  if (is.String(value)) {
    if (this.inputFormats === null) {
      this.inputFormats = formats.getFormat(this.inputFormatType)
    }
    for (var i = 0, l = this.inputFormats.length; i < l; i++) {
      try {
        return this.strpdate(value, this.inputFormats[i])
      }
      catch (e) {
        // pass
      }
    }
  }
  throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
}

/**
 * Creates a Date from the given input if it's valid based on a format.
 * @param {string} value
 * @param {string} format
 * @return {Date}
 */
BaseTemporalField.prototype.strpdate = function(value, format) {
  return time.strpdate(value, format, locales.getDefaultLocale())
}

BaseTemporalField.prototype._hasChanged = function(initial, data) {
  try {
    data = this.toJavaScript(data)
  }
  catch (e) {
    if (!(e instanceof ValidationError)) { throw e }
    return true
  }
  initial = this.toJavaScript(initial)
  if (!!initial && !!data) {
    return initial.getTime() !== data.getTime()
  }
  else {
    return initial !== data
  }
}


module.exports = BaseTemporalField