'use strict';

var is = require('isomorph/is')

var CheckboxInput = require('../widgets/CheckboxInput')
var Field = require('../Field')

var {ValidationError} = require('validators')

/**
 * Normalises its input to a Boolean primitive.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var BooleanField = Field.extend({
  widget: CheckboxInput

, constructor: function BooleanField(kwargs) {
    if (!(this instanceof BooleanField)) { return new BooleanField(kwargs) }
    Field.call(this, kwargs)
  }
})

BooleanField.prototype.toJavaScript = function(value) {
  // Explicitly check for a 'false' string, which is what a hidden field will
  // submit for false. Also check for '0', since this is what RadioSelect will
  // provide. Because Boolean('anything') == true, we don't need to handle that
  // explicitly.
  if (is.String(value) && (value.toLowerCase() == 'false' || value == '0')) {
    value = false
  }
  else {
    value = Boolean(value)
  }
  value = Field.prototype.toJavaScript.call(this, value)
  if (!value && this.required) {
    throw ValidationError(this.errorMessages.required, {code: 'required'})
  }
  return value
}

BooleanField.prototype._hasChanged = function(initial, data) {
  // Sometimes data or initial could be null or '' which should be the same
  // thing as false.
  if (initial === 'false') {
    // showHiddenInitial may have transformed false to 'false'
    initial = false
  }
  return (Boolean(initial) != Boolean(data))
}

module.exports = BooleanField