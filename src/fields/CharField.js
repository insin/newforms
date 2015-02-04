'use strict';

var object = require('isomorph/object')

var Field = require('../Field')
var PasswordInput = require('../widgets/PasswordInput')
var TextInput = require('../widgets/TextInput')

var {MinLengthValidator, MaxLengthValidator} = require('validators')

/**
 * Validates that its input is a valid String.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var CharField = Field.extend({
  constructor: function CharField(kwargs) {
    if (!(this instanceof CharField)) { return new CharField(kwargs) }
    kwargs = object.extend({maxLength: null, minLength: null}, kwargs)
    this.maxLength = kwargs.maxLength
    this.minLength = kwargs.minLength
    Field.call(this, kwargs)
    if (this.minLength !== null) {
      this.validators.push(MinLengthValidator(this.minLength))
    }
    if (this.maxLength !== null) {
      this.validators.push(MaxLengthValidator(this.maxLength))
    }
  }
})

/**
 * @return {string}
 */
CharField.prototype.toJavaScript = function(value) {
  if (this.isEmptyValue(value)) {
    return ''
  }
  return ''+value
}

/**
 * If this field is configured to enforce a maximum length, adds a suitable
 * maxLength attribute to text input fields.
 * @param {Widget} widget the widget being used to render this field's value.
 * @return {Object} additional attributes which should be added to the widget.
 */
CharField.prototype.widgetAttrs = function(widget) {
  var attrs = {}
  if (this.maxLength !== null && (widget instanceof TextInput ||
                                  widget instanceof PasswordInput)) {
    attrs.maxLength = ''+this.maxLength
  }
  return attrs
}

module.exports = CharField