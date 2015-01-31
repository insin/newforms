'use strict';

var is = require('isomorph/is')
var object = require('isomorph/object')
var time = require('isomorph/time')

var formats = require('../formats')
var locales = require('../locales')
var TextInput = require('./TextInput')

/**
 * A <input type="text"> which, if given a Date object to display, formats it as
 * an appropriate date/time String.
 * @constructor
 * @extends {TextInput}
 * @param {Object=} kwargs
 */
var DateTimeBaseInput = TextInput.extend({
  formatType: ''
, constructor: function DateTimeBaseInput(kwargs) {
    kwargs = object.extend({format: null}, kwargs)
    TextInput.call(this, kwargs)
    this.format = kwargs.format
  }
})

DateTimeBaseInput.prototype._formatValue = function(value) {
  if (is.Date(value)) {
    if (this.format === null) {
      this.format = formats.getFormat(this.formatType)[0]
    }
    return time.strftime(value, this.format, locales.getDefaultLocale())
  }
  return value
}

module.exports = DateTimeBaseInput