'use strict';

var is = require('isomorph/is')
var object = require('isomorph/object')

var env = require('../env')

var ClearableFileInput = require('../widgets/ClearableFileInput')
var Field = require('../Field')

var {ValidationError} = require('validators')

/**
 * Validates that its input is a valid uploaded file.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var FileField = Field.extend({
  widget: ClearableFileInput
, defaultErrorMessages: {
    invalid: 'No file was submitted. Check the encoding type on the form.'
  , missing: 'No file was submitted.'
  , empty: 'The submitted file is empty.'
  , maxLength: 'Ensure this filename has at most {max} characters (it has {length}).'
  , contradiction: 'Please either submit a file or check the clear checkbox, not both.'
  }

, constructor: function FileField(kwargs) {
    if (!(this instanceof FileField)) { return new FileField(kwargs) }
    kwargs = object.extend({maxLength: null, allowEmptyFile: false, multiple: false}, kwargs)
    this.maxLength = kwargs.maxLength
    this.allowEmptyFile = kwargs.allowEmptyFile
    this.multiple = kwargs.multiple
    delete kwargs.maxLength
    Field.call(this, kwargs)
  }
})

FileField.prototype.getWidgetAttrs = function(widget) {
  var attrs = Field.prototype.getWidgetAttrs.call(this, widget)
  attrs.multiple = this.multiple
  return attrs
}

FileField.prototype.toJavaScript = function(data, initial) {
  if (this.isEmptyValue(data)) {
    return null
  }

  // If the browser doesn't support File objects, we can't do anything more
  if (env.browser && is.String(data)) {
    return data
  }

  // File objects should have name and size attributes
  if (typeof data.name == 'undefined' || typeof data.size == 'undefined') {
    throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
  }

  var fileName = data.name
  var fileSize = Number(data.size)

  if (this.maxLength !== null && fileName.length > this.maxLength) {
    throw ValidationError(this.errorMessages.maxLength, {
      code: 'maxLength'
    , params: {max: this.maxLength, length: fileName.length}
    })
  }
  if (!fileName) {
    throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
  }
  if (!this.allowEmptyFile && fileSize === 0) {
    throw ValidationError(this.errorMessages.empty, {code: 'empty'})
  }
  return data
}

FileField.prototype.clean = function(data, initial) {
  // If the widget got contradictory inputs, we raise a validation error
  if (data === ClearableFileInput.FILE_INPUT_CONTRADICTION) {
    throw ValidationError(this.errorMessages.contradiction,
                          {code: 'contradiction'})
  }
  // false means the field value should be cleared; further validation is
  // not needed.
  if (data === false) {
    if (!this.required) {
      return false
    }
    // If the field is required, clearing is not possible (the widget
    // shouldn't return false data in that case anyway). false is not
    // in EMPTY_VALUES; if a false value makes it this far it should be
    // validated from here on out as null (so it will be caught by the
    // required check).
    data = null
  }
  if (!data && initial) {
    return initial
  }
  return Field.prototype.clean.call(this, data)
}

FileField.prototype.boundData = function(data, initial) {
  if (data === null || data === ClearableFileInput.FILE_INPUT_CONTRADICTION) {
    return initial
  }
  return data
}

FileField.prototype._hasChanged = function(initial, data) {
  return (data !== null)
}

module.exports = FileField