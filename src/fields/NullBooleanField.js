'use strict';

var BooleanField = require('./BooleanField')
var NullBooleanSelect = require('../widgets/NullBooleanSelect')

/**
 * A field whose valid values are null, true and false.
 * Invalid values are cleaned to null.
 * @constructor
 * @extends {BooleanField}
 * @param {Object=} kwargs
 */
var NullBooleanField = BooleanField.extend({
  widget: NullBooleanSelect

, constructor: function NullBooleanField(kwargs) {
    if (!(this instanceof NullBooleanField)) { return new NullBooleanField(kwargs) }
    BooleanField.call(this, kwargs)
  }
})

NullBooleanField.prototype.toJavaScript = function(value) {
  // Explicitly checks for the string 'True' and 'False', which is what a
  // hidden field will submit for true and false, and for '1' and '0', which
  // is what a RadioField will submit. Unlike the BooleanField we also need
  // to check for true, because we are not using Boolean() function.
  if (value === true || value == 'True' || value == 'true' || value == '1') {
    return true
  }
  else if (value === false || value == 'False' || value == 'false' || value == '0') {
    return false
  }
  return null
}

NullBooleanField.prototype.validate = function(value) {}

NullBooleanField.prototype._hasChanged = function(initial, data) {
  // null (unknown) and false (No) are not the same
  if (initial !== null) {
      initial = Boolean(initial)
  }
  if (data !== null) {
      data = Boolean(data)
  }
  return initial != data
}

module.exports = NullBooleanField