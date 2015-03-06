'use strict';

var is = require('isomorph/is')

var env = require('../env')

var Field = require('../Field')
var FileInput = require('../widgets/FileInput')
var FileField = require('./FileField')

var {ValidationError} = require('validators')

/**
 * Validates that its input is a list of valid files.
 * @constructor
 * @extends {FileField}
 * @param {Object=} kwargs
 */
var MultipleFileField = FileField.extend({
  widget: FileInput,

  defaultErrorMessages: {
    invalid: 'No files were submitted. Check the encoding type on the form.',
    missing: 'No files were submitted.',
    empty: '{name} is empty.',
    maxLength: 'Ensure filenames have at most {max} characters ({name} has {length}).'
  },

  constructor: function MultipleFileField(kwargs) {
    if (!(this instanceof MultipleFileField)) { return new MultipleFileField(kwargs) }
    FileField.call(this, kwargs)
  }
})

MultipleFileField.prototype.getWidgetAttrs = function(widget) {
  var attrs = FileField.prototype.getWidgetAttrs.call(this, widget)
  attrs.multiple = true
  return attrs
}

MultipleFileField.prototype.toJavaScript = function(data, initial) {
  if (this.isEmptyValue(data)) {
    return []
  }

  // If the browser doesn't support File objects, we can't do anything more
  if (env.browser && is.String(data)) {
    return data
  }

  for (var i = 0, l = data.length; i < l; i++) {
    var file = data[i]

    // File objects should have name and size attributes
    if (typeof file.name == 'undefined' || typeof file.size == 'undefined') {
      throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
    }

    var name = file.name
    var size = Number(file.size)

    if (this.maxLength !== null && name.length > this.maxLength) {
      throw ValidationError(this.errorMessages.maxLength, {
        code: 'maxLength',
        params: {max: this.maxLength, name, length: name.length}
      })
    }
    if (!name) {
      throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
    }
    if (!this.allowEmptyFile && size === 0) {
      throw ValidationError(this.errorMessages.empty, {
        code: 'empty',
        params: {name}
      })
    }
  }

  return data
}

MultipleFileField.prototype.clean = function(data, initial) {
  if (this.isEmptyValue(data) && !this.isEmptyValue(initial)) {
    return initial
  }
  return Field.prototype.clean.call(this, data)
}

MultipleFileField.prototype.validate = function(value) {
  if (this.required && !value.length) {
    throw ValidationError(this.errorMessages.required, {code: 'required'})
  }
}

MultipleFileField.prototype._hasChanged = function(initial, data) {
  return !this.isEmptyValue(data)
}

module.exports = MultipleFileField