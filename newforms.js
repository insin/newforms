/**
 * newforms 0.5.0-dev - https://github.com/insin/newforms
 * MIT Licensed
 */
!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.forms=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

module.exports = {
  browser: typeof process == 'undefined'
}
},{}],2:[function(require,module,exports){
'use strict';

var Concur = require('Concur')
var is = require('isomorph/is')
var object = require('isomorph/object')
var time = require('isomorph/time')
var url = require('isomorph/url')
var validators = require('validators')

var env = require('./env')
var util = require('./util')
var widgets = require('./widgets')

var ValidationError = validators.ValidationError
var Widget = widgets.Widget
var cleanIPv6Address = validators.ipv6.cleanIPv6Address

/**
 * An object that is responsible for doing validation and normalisation, or
 * "cleaning", for example: an EmailField makes sure its data is a valid
 * e-mail address and makes sure that acceptable "blank" values all have the
 * same representation.
 * @constructor
 * @param {Object=} kwargs
 */
var Field = Concur.extend({
  widget: widgets.TextInput         // Default widget to use when rendering this type of Field
, hiddenWidget: widgets.HiddenInput // Default widget to use when rendering this as "hidden"
, defaultValidators: []             // Default list of validators
  // Add an 'invalid' entry to defaultErrorMessages if you want a specific
  // field error message not raised by the field validators.
, defaultErrorMessages: {
    required: 'This field is required.'
  }
, emptyValues: validators.EMPTY_VALUES.slice()
, emptyValueArray: true // Should isEmptyValue check for empty Arrays?

, constructor: function Field(kwargs) {
    kwargs = object.extend({
      required: true, widget: null, label: null, initial: null,
      helpText: null, errorMessages: null, showHiddenInitial: false,
      validators: [], cssClass: null
    }, kwargs)
    this.required = kwargs.required
    this.label = kwargs.label
    this.initial = kwargs.initial
    this.showHiddenInitial = kwargs.showHiddenInitial
    this.helpText = kwargs.helpText || ''
    this.cssClass = kwargs.cssClass

    var widget = kwargs.widget || this.widget
    if (!(widget instanceof Widget)) {
      // We must have a Widget constructor, so construct with it
      widget = new widget()
    }
    // Let the widget know whether it should display as required
    widget.isRequired = this.required
    // Hook into this.widgetAttrs() for any Field-specific HTML attributes
    object.extend(widget.attrs, this.widgetAttrs(widget))
    this.widget = widget

    // Increment the creation counter and save our local copy
    this.creationCounter = Field.creationCounter++

    // Copy error messages for this instance into a new object and override
    // with any provided error messages.
    var messages = [{}]
    for (var i = this.constructor.__mro__.length - 1; i >=0; i--) {
      messages.push(object.get(this.constructor.__mro__[i].prototype,
                               'defaultErrorMessages', null))
    }
    messages.push(kwargs.errorMessages)
    this.errorMessages = object.extend.apply(object, messages)

    this.validators = this.defaultValidators.concat(kwargs.validators)
  }
})

/**
 * Tracks each time a Field instance is created; used to retain order.
 */
Field.creationCounter = 0

Field.prototype.prepareValue = function(value) {
  return value
}

Field.prototype.toJavaScript = function(value) {
  return value
}

/**
 * Checks for the given value being === one of the configured empty values, plus
 * any additional checks required due to JavaScript's lack of a generic object
 * equality checking mechanism.
 */
Field.prototype.isEmptyValue = function(value) {
  if (this.emptyValues.indexOf(value) != -1) {
    return true
  }
  if (this.emptyValueArray === true && is.Array(value) && value.length === 0) {
    return true
  }
  return false
}

Field.prototype.validate = function(value) {
  if (this.required && this.isEmptyValue(value)) {
    throw ValidationError(this.errorMessages.required, {code: 'required'})
  }
}

Field.prototype.runValidators = function(value) {
  if (this.isEmptyValue(value)) {
    return
  }
  var errors = []
  for (var i = 0, l = this.validators.length; i < l; i++) {
    var validator = this.validators[i]
    try {
      validator(value)
    }
    catch (e) {
      if (!(e instanceof ValidationError)) { throw e }
      if (object.hasOwn(e, 'code') &&
          object.hasOwn(this.errorMessages, e.code)) {
        e.message = this.errorMessages[e.code]
      }
      errors.push.apply(errors, e.errorList)
    }
  }
  if (errors.length > 0) {
    throw ValidationError(errors)
  }
}

/**
 * Validates the given value and returns its "cleaned" value as an appropriate
 * JavaScript object.
 * Throws a ValidationError for any errors.
 * @param {String} value the value to be validated.
 */
Field.prototype.clean = function(value) {
  value = this.toJavaScript(value)
  this.validate(value)
  this.runValidators(value)
  return value
}

/**
 * Return the value that should be shown for this field on render of a bound
 * form, given the submitted POST data for the field and the initial data, if
 * any.
 *
 * For most fields, this will simply be data; FileFields need to handle it a bit
 * differently.
 */
Field.prototype.boundData = function(data, initial) {
  return data
}

/**
 * Specifies HTML attributes which should be added to a given widget for this
 * field.
 *
 * @param {Widget} widget a widget.
 * @return an object specifying HTML attributes that should be added to the
 *         given widget, based on this field.
 */
Field.prototype.widgetAttrs = function(widget) {
  return {}
}

/**
 * Returns true if data differs from initial.
 */
Field.prototype._hasChanged = function(initial, data) {
  // For purposes of seeing whether something has changed, null is the same
  // as an empty string, if the data or inital value we get is null, replace
  // it with ''.
  var initialValue = (initial === null ? '' : initial)
  try {
    data = this.toJavaScript(data)
    if (typeof this._coerce == 'function') {
      data = this._coerce(data)
    }
  }
  catch (e) {
    if (!(e instanceof ValidationError)) { throw e }
    return true
  }
  var dataValue = (data === null ? '' : data)
  return (''+initialValue != ''+dataValue) // TODO is forcing to string necessary?
}

/**
 * Validates that its input is a valid String.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var CharField = Field.extend({
  constructor: function CharField(kwargs) {
    if (!(this instanceof Field)) { return new CharField(kwargs) }
    kwargs = object.extend({maxLength: null, minLength: null}, kwargs)
    this.maxLength = kwargs.maxLength
    this.minLength = kwargs.minLength
    Field.call(this, kwargs)
    if (this.minLength !== null) {
      this.validators.push(validators.MinLengthValidator(this.minLength))
    }
    if (this.maxLength !== null) {
      this.validators.push(validators.MaxLengthValidator(this.maxLength))
    }
  }
})

CharField.prototype.toJavaScript = function(value) {
  if (this.isEmptyValue(value)) {
    return ''
  }
  return ''+value
}

/**
 * If this field is configured to enforce a maximum length, adds a suitable
 * maxLength attribute to text input fields.
 *
 * @param {Widget} widget the widget being used to render this field's value.
 *
 * @return additional attributes which should be added to the given widget.
 */
CharField.prototype.widgetAttrs = function(widget) {
  var attrs = {}
  if (this.maxLength !== null && (widget instanceof widgets.TextInput ||
                                  widget instanceof widgets.PasswordInput)) {
    attrs.maxLength = ''+this.maxLength
  }
  return attrs
}

/**
 * Validates that its input is a valid integer.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var IntegerField = Field.extend({
  widget: widgets.NumberInput
, defaultErrorMessages: {
    invalid: 'Enter a whole number.'
  }

, constructor: function IntegerField(kwargs) {
    if (!(this instanceof Field)) { return new IntegerField(kwargs) }
    kwargs = object.extend({maxValue: null, minValue: null}, kwargs)
    this.maxValue = kwargs.maxValue
    this.minValue = kwargs.minValue
    Field.call(this, kwargs)

    if (this.minValue !== null) {
      this.validators.push(validators.MinValueValidator(this.minValue))
    }
    if (this.maxValue !== null) {
      this.validators.push(validators.MaxValueValidator(this.maxValue))
    }
  }
})

/**
 * Validates that Number() can be called on the input with a result that isn't
 * NaN and doesn't contain any decimal points.
 *
 * @param value the value to be val idated.
 * @return the result of Number(), or null for empty values.
 */
IntegerField.prototype.toJavaScript = function(value) {
  value = Field.prototype.toJavaScript.call(this, value)
  if (this.isEmptyValue(value)) {
    return null
  }
  value = Number(value)
  if (isNaN(value) || value.toString().indexOf('.') != -1) {
    throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
  }
  return value
}

IntegerField.prototype.widgetAttrs = function(widget) {
  var attrs = Field.prototype.widgetAttrs.call(this, widget)
  if (widget instanceof widgets.NumberInput) {
    if (this.minValue !== null) {
      attrs.min = this.minValue
    }
    if (this.maxValue !== null) {
      attrs.max = this.maxValue
    }
  }
  return attrs
}

/**
 * Validates that its input is a valid float.
 * @constructor
 * @extends {IntegerField}
 * @param {Object=} kwargs
 */
var FloatField = IntegerField.extend({
  defaultErrorMessages: {
    invalid: 'Enter a number.'
  }

, constructor: function FloatField(kwargs) {
    if (!(this instanceof Field)) { return new FloatField(kwargs) }
    IntegerField.call(this, kwargs)
  }
})

/** Float validation regular expression, as parseFloat() is too forgiving. */
FloatField.FLOAT_REGEXP = /^[-+]?(?:\d+(?:\.\d*)?|(?:\d+)?\.\d+)$/

/**
 * Validates that the input looks like valid input for parseFloat() and the
 * result of calling it isn't NaN.
 * @param value the value to be validated.
 * @return a Number obtained from parseFloat(), or null for empty values.
 */
FloatField.prototype.toJavaScript = function(value) {
  value = Field.prototype.toJavaScript.call(this, value)
  if (this.isEmptyValue(value)) {
    return null
  }
  value = util.strip(value)
  if (!FloatField.FLOAT_REGEXP.test(value)) {
    throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
  }
  value = parseFloat(value)
  if (isNaN(value)) {
    throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
  }
  return value
}

/**
 * Determines if data has changed from initial. In JavaScript, trailing zeroes
 * in floats are dropped when a float is coerced to a String, so e.g., an
 * initial value of 1.0 would not match a data value of '1.0' if we were to use
 * the Widget object's _hasChanged, which checks coerced String values.
 * @type Boolean
 */
FloatField.prototype._hasChanged = function(initial, data) {
  // For purposes of seeing whether something has changed, null is the same
  // as an empty string, if the data or inital value we get is null, replace
  // it with ''.
  var dataValue = (data === null ? '' : data)
  var initialValue = (initial === null ? '' : initial)
  if (initialValue === dataValue) {
    return false
  }
  else if (initialValue === '' || dataValue === '') {
    return true
  }
  return (parseFloat(''+initialValue) != parseFloat(''+dataValue))
}

FloatField.prototype.widgetAttrs = function(widget) {
  var attrs = IntegerField.prototype.widgetAttrs.call(this, widget)
  if (widget instanceof widgets.NumberInput &&
      !object.hasOwn(widget.attrs, 'step')) {
    object.setDefault(attrs, 'step', 'any')
  }
  return attrs
}

/**
 * Validates that its input is a decimal number.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var DecimalField = IntegerField.extend({
  defaultErrorMessages: {
    invalid: 'Enter a number.'
  , maxDigits: 'Ensure that there are no more than {maxDigits} digits in total.'
  , maxDecimalPlaces: 'Ensure that there are no more than {maxDecimalPlaces} decimal places.'
  , maxWholeDigits: 'Ensure that there are no more than {maxWholeDigits} digits before the decimal point.'
  }

, constructor: function DecimalField(kwargs) {
    if (!(this instanceof Field)) { return new DecimalField(kwargs) }
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
    , params: {maxDigits: this.maxDigits}
    })
  }
  if (this.decimalPlaces !== null && decimals > this.decimalPlaces) {
    throw ValidationError(this.errorMessages.maxDecimalPlaces, {
      code: 'maxDecimalPlaces'
    , params: {maxDecimalPlaces: this.decimalPlaces}
    })
  }
  if (this.maxDigits !== null &&
      this.decimalPlaces !== null &&
      wholeDigits > (this.maxDigits - this.decimalPlaces)) {
    throw ValidationError(this.errorMessages.maxWholeDigits, {
      code: 'maxWholeDigits'
    , params: {maxWholeDigits: (this.maxDigits - this.decimalPlaces)}
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

  // Return the normalited String representation
  return value
}

DecimalField.prototype.widgetAttrs = function(widget) {
  var attrs = IntegerField.prototype.widgetAttrs.call(this, widget)
  if (widget instanceof widgets.NumberInput &&
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

/**
 * Base field for fields which validate that their input is a date or time.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var BaseTemporalField = Field.extend({
  constructor: function BaseTemporalField(kwargs) {
    kwargs = object.extend({inputFormats: null}, kwargs)
    Field.call(this, kwargs)
    if (kwargs.inputFormats !== null) {
      this.inputFormats = kwargs.inputFormats
    }
  }
})

/**
 * Validates that its input is a valid date or time.
 * @param {String|Date}
 * @return {Date}
 */
BaseTemporalField.prototype.toJavaScript = function(value) {
  if (!is.Date(value)) {
    value = util.strip(value)
  }
  if (is.String(value)) {
    for (var i = 0, l = this.inputFormats.length; i < l; i++) {
      try {
        return this.strpdate(value, this.inputFormats[i])
      }
      catch (e) {
        continue
      }
    }
  }
  throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
}

/**
 * Creates a Date from the given input if it's valid based on a format.
 * @param {String} value
 * @param {String} format
 * @return {Date}
 */
BaseTemporalField.prototype.strpdate = function(value, format) {
  return time.strpdate(value, format)
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

/**
 * Validates that its input is a date.
 * @constructor
 * @extends {BaseTemporalField}
 * @param {Object=} kwargs
 */
var DateField = BaseTemporalField.extend({
  widget: widgets.DateInput
, inputFormats: util.DEFAULT_DATE_INPUT_FORMATS
, defaultErrorMessages: {
    invalid: 'Enter a valid date.'
  }

, constructor: function DateField(kwargs) {
    if (!(this instanceof Field)) { return new DateField(kwargs) }
    BaseTemporalField.call(this, kwargs)
  }
})

/**
 * Validates that the input can be converted to a date.
 * @param {String|Date} value the value to be validated.
 * @return {?Date} a with its year, month and day attributes set, or null for
 *     empty values when they are allowed.
 */
DateField.prototype.toJavaScript = function(value) {
  if (this.isEmptyValue(value)) {
    return null
  }
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }
  return BaseTemporalField.prototype.toJavaScript.call(this, value)
}

/**
 * Validates that its input is a time.
 * @constructor
 * @extends {BaseTemporalField}
 * @param {Object=} kwargs
 */
var TimeField = BaseTemporalField.extend({
  widget: widgets.TimeInput
, inputFormats: util.DEFAULT_TIME_INPUT_FORMATS
, defaultErrorMessages: {
    invalid: 'Enter a valid time.'
  }

, constructor: function TimeField(kwargs) {
    if (!(this instanceof Field)) { return new TimeField(kwargs) }
    BaseTemporalField.call(this, kwargs)
  }
})

/**
 * Validates that the input can be converted to a time.
 * @param {String|Date} value the value to be validated.
 * @return {?Date} a Date with its hour, minute and second attributes set, or
 *     null for empty values when they are allowed.
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
 * @param {String} value
 * @param {String} format
 * @return {Date}
 */
TimeField.prototype.strpdate = function(value, format) {
  var t = time.strptime(value, format)
  return new Date(1900, 0, 1, t[3], t[4], t[5])
}

/**
 * Validates that its input is a date/time.
 * @constructor
 * @extends {BaseTemporalField}
 * @param {Object=} kwargs
 */
var DateTimeField = BaseTemporalField.extend({
  widget: widgets.DateTimeInput
, inputFormats: util.DEFAULT_DATETIME_INPUT_FORMATS
, defaultErrorMessages: {
    invalid: 'Enter a valid date/time.'
  }

, constructor: function DateTimeField(kwargs) {
    if (!(this instanceof Field)) { return new DateTimeField(kwargs) }
    BaseTemporalField.call(this, kwargs)
  }
})

/**
 * @param {String|Date|Array.<Date>}
 * @return {?Date}
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

/**
 * Validates that its input matches a given regular expression.
 * @constructor
 * @extends {CharField}
 * @param {{regexp|string}} regex
 * @param {Object=} kwargs
 */
var RegexField = CharField.extend({
  constructor: function RegexField(regex, kwargs) {
    if (!(this instanceof Field)) { return new RegexField(regex, kwargs) }
    CharField.call(this, kwargs)
    if (is.String(regex)) {
      regex = new RegExp(regex)
    }
    this.regex = regex
    this.validators.push(validators.RegexValidator({regex: this.regex}))
  }
})

/**
 * Validates that its input appears to be a valid e-mail address.
 * @constructor
 * @extends {CharField}
 * @param {Object=} kwargs
 */
var EmailField = CharField.extend({
  widget: widgets.EmailInput
, defaultValidators: [validators.validateEmail]

, constructor: function EmailField(kwargs) {
    if (!(this instanceof Field)) { return new EmailField(kwargs) }
    CharField.call(this, kwargs)
  }
})

EmailField.prototype.clean = function(value) {
  value = util.strip(this.toJavaScript(value))
  return CharField.prototype.clean.call(this, value)
}

/**
 * Validates that its input is a valid uploaded file.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var FileField = Field.extend({
  widget: widgets.ClearableFileInput
, defaultErrorMessages: {
    invalid: 'No file was submitted. Check the encoding type on the form.'
  , missing: 'No file was submitted.'
  , empty: 'The submitted file is empty.'
  , maxLength: 'Ensure this filename has at most {max} characters (it has {length}).'
  , contradicton: 'Please either submit a file or check the clear checkbox, not both.'
  }

, constructor: function FileField(kwargs) {
    if (!(this instanceof Field)) { return new FileField(kwargs) }
    kwargs = object.extend({maxLength: null, allowEmptyFile: false}, kwargs)
    this.maxLength = kwargs.maxLength
    this.allowEmptyFile = kwargs.allowEmptyFile
    delete kwargs.maxLength
    Field.call(this, kwargs)
  }
})

FileField.prototype.toJavaScript = function(data, initial) {
  if (this.isEmptyValue(data)) {
    return null
  }

  if (env.browser) {
    return data
  }

  // UploadedFile objects should have name and size attributes
  if (typeof data.name == 'undefined' || typeof data.size == 'undefined') {
    throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
  }

  var fileName = data.name
  var fileSize = data.size

  if (this.maxLength !== null && fileName.length > this.maxLength) {
    throw ValidationError(this.errorMessages.maxLength, {
      code: 'maxLength'
    , params: {max: this.maxLength, length: fileName.length}
    })
  }
  if (!fileName) {
    throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
  }
  if (!this.allowEmptyFile && !fileSize) {
    throw ValidationError(this.errorMessages.empty, {code: 'empty'})
  }
  return data
}

FileField.prototype.clean = function(data, initial) {
  // If the widget got contradictory inputs, we raise a validation error
  if (data === widgets.FILE_INPUT_CONTRADICTION) {
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
  if (data === null || data === widgets.FILE_INPUT_CONTRADICTION) {
    return initial
  }
  return data
}

FileField.prototype._hasChanged = function(initial, data) {
  if (data === null) {
    return false
  }
  return true
}

/**
 * Validates that its input is a valid uploaded image.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var ImageField = FileField.extend({
  defaultErrorMessages: {
    invalidImage: 'Upload a valid image. The file you uploaded was either not an image or a corrupted image.'
  }

, constructor: function ImageField(kwargs) {
    if (!(this instanceof Field)) { return new ImageField(kwargs) }
    FileField.call(this, kwargs)
  }
})

/**
 * Checks that the file-upload field data contains a valid image.
 */
ImageField.prototype.toJavaScript = function(data, initial) {
  var f = FileField.prototype.toJavaScript.call(this, data, initial)
  if (f === null) {
    return null
  }

  // TODO Plug in image processing code when running on the server

  return f
}

/**
 * Validates that its input appears to be a valid URL.
 * @constructor
 * @extends {CharField}
 * @param {Object=} kwargs
 */
var URLField = CharField.extend({
  widget: widgets.URLInput
, defaultErrorMessages: {
    invalid: 'Enter a valid URL.'
  }
, defaultValidators: [validators.URLValidator()]

, constructor: function URLField(kwargs) {
    if (!(this instanceof Field)) { return new URLField(kwargs) }
    CharField.call(this, kwargs)
  }
})

URLField.prototype.toJavaScript = function(value) {
  if (value) {
    var urlFields = url.parseUri(value)
    if (!urlFields.protocol) {
      // If no URL protocol given, assume http://
      urlFields.protocol = 'http'
    }
    if (!urlFields.path) {
      // The path portion may need to be added before query params
      urlFields.path = '/'
    }
    value = url.makeUri(urlFields)
  }
  return CharField.prototype.toJavaScript.call(this, value)
}

URLField.prototype.clean = function(value) {
  value = util.strip(this.toJavaScript(value))
  return CharField.prototype.clean.call(this, value)
}

/**
 * Normalises its input to a Booleanprimitive.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var BooleanField = Field.extend({
  widget: widgets.CheckboxInput

, constructor: function BooleanField(kwargs) {
    if (!(this instanceof Field)) { return new BooleanField(kwargs) }
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

/**
 * A field whose valid values are null, true and false.
 * Invalid values are cleaned to null.
 * @constructor
 * @extends {BooleanField}
 * @param {Object=} kwargs
 */
var NullBooleanField = BooleanField.extend({
  widget: widgets.NullBooleanSelect

, constructor: function NullBooleanField(kwargs) {
    if (!(this instanceof Field)) { return new NullBooleanField(kwargs) }
    BooleanField.call(this, kwargs)
  }
})

NullBooleanField.prototype.toJavaScript = function(value) {
  // Explicitly checks for the string 'True' and 'False', which is what a
  // hidden field will submit for true and false, and for '1' and '0', which
  // is what a RadioField will submit. Unlike the Booleanfield we also need
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

/**
 * Validates that its input is one of a valid list of choices.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var ChoiceField = Field.extend({
  widget: widgets.Select
, defaultErrorMessages: {
    invalidChoice: 'Select a valid choice. {value} is not one of the available choices.'
  }

, constructor: function ChoiceField(kwargs) {
    if (!(this instanceof Field)) { return new ChoiceField(kwargs) }
    kwargs = object.extend({choices: []}, kwargs)
    Field.call(this, kwargs)
    this.setChoices(kwargs.choices)
  }
})

ChoiceField.prototype.choices = function() { return this._choices }
ChoiceField.prototype.setChoices = function(choices) {
  // Setting choices also sets the choices on the widget
  this._choices = this.widget.choices = choices
}

ChoiceField.prototype.toJavaScript = function(value) {
  if (this.isEmptyValue(value)) {
    return ''
  }
  return ''+value
}

/**
 * Validates that the given value is in this field's choices.
 */
ChoiceField.prototype.validate = function(value) {
  Field.prototype.validate.call(this, value)
  if (value && !this.validValue(value)) {
    throw ValidationError(this.errorMessages.invalidChoice, {
      code: 'invalidChoice'
    , params: {value: value}
    })
  }
}

/**
 * Checks to see if the provided value is a valid choice.
 *
 * @param {String} value the value to be validated.
 */
ChoiceField.prototype.validValue = function(value) {
  var choices = this.choices()
  for (var i = 0, l = choices.length; i < l; i++) {
    if (is.Array(choices[i][1])) {
      // This is an optgroup, so look inside the group for options
      var optgroupChoices = choices[i][1]
      for (var j = 0, k = optgroupChoices.length; j < k; j++) {
        if (value === ''+optgroupChoices[j][0]) {
          return true
        }
      }
    }
    else if (value === ''+choices[i][0]) {
      return true
    }
  }
  return false
}

/**
 * A ChoiceField which returns a value coerced by some provided function.
 * @constructor
 * @extends {ChoiceField}
 * @param {Object=} kwargs
 */
var TypedChoiceField = ChoiceField.extend({
  constructor: function TypedChoiceField(kwargs) {
    if (!(this instanceof Field)) { return new TypedChoiceField(kwargs) }
    kwargs = object.extend({
      coerce: function(val) { return val }, emptyValue: ''
    }, kwargs)
    this.coerce = object.pop(kwargs, 'coerce')
    this.emptyValue = object.pop(kwargs, 'emptyValue')
    ChoiceField.call(this, kwargs)
  }
})

/**
 * Validate that the value can be coerced to the right type (if not empty).
 */
TypedChoiceField.prototype._coerce = function(value) {
  if (value === this.emptyValue || this.isEmptyValue(value)) {
    return this.emptyValue
  }
  try {
    value = this.coerce(value)
  }
  catch (e) {
    throw ValidationError(this.errorMessages.invalidChoice, {
      code: 'invalidChoice'
    , params: {value: value}
    })
  }
  return value
}

TypedChoiceField.prototype.clean = function(value) {
  value = ChoiceField.prototype.clean.call(this, value)
  return this._coerce(value)
}

/**
 * Validates that its input is one or more of a valid list of choices.
 * @constructor
 * @extends {ChoiceField}
 * @param {Object=} kwargs
 */
var MultipleChoiceField = ChoiceField.extend({
  hiddenWidget: widgets.MultipleHiddenInput
, widget: widgets.SelectMultiple
, defaultErrorMessages: {
    invalidChoice: 'Select a valid choice. {value} is not one of the available choices.'
  , invalidList: 'Enter a list of values.'
  }

, constructor: function MultipleChoiceField(kwargs) {
    if (!(this instanceof Field)) { return new MultipleChoiceField(kwargs) }
    ChoiceField.call(this, kwargs)
  }
})

MultipleChoiceField.prototype.toJavaScript = function(value) {
  if (!value) {
    return []
  }
  else if (!(is.Array(value))) {
    throw ValidationError(this.errorMessages.invalidList, {code: 'invalidList'})
  }
  var stringValues = []
  for (var i = 0, l = value.length; i < l; i++) {
    stringValues.push(''+value[i])
  }
  return stringValues
}

/**
 * Validates that the input is a list and that each item is in this field's
 * choices.
 */
MultipleChoiceField.prototype.validate = function(value) {
  if (this.required && !value.length) {
    throw ValidationError(this.errorMessages.required, {code: 'required'})
  }
  for (var i = 0, l = value.length; i < l; i++) {
    if (!this.validValue(value[i])) {
      throw ValidationError(this.errorMessages.invalidChoice, {
        code: 'invalidChoice'
      , params: {value: value[i]}
      })
    }
  }
}

MultipleChoiceField.prototype._hasChanged = function(initial, data) {
  if (initial === null) {
    initial = []
  }
  if (data === null) {
    data = []
  }
  if (initial.length != data.length) {
    return true
  }
  var dataLookup = object.lookup(data)
  for (var i = 0, l = initial.length; i < l; i++) {
    if (typeof dataLookup[''+initial[i]] == 'undefined') {
      return true
    }
  }
  return false
}

/**
 * AMultipleChoiceField which returns values coerced by some provided function.
 * @constructor
 * @extends {MultipleChoiceField}
 * @param {Object=} kwargs
 */
var TypedMultipleChoiceField = MultipleChoiceField.extend({
  constructor: function TypedMultipleChoiceField(kwargs) {
    if (!(this instanceof Field)) { return new TypedMultipleChoiceField(kwargs) }
    kwargs = object.extend({
      coerce: function(val) { return val }, emptyValue: []
    }, kwargs)
    this.coerce = object.pop(kwargs, 'coerce')
    this.emptyValue = object.pop(kwargs, 'emptyValue')
    MultipleChoiceField.call(this, kwargs)
  }
})

TypedMultipleChoiceField.prototype._coerce = function(value) {
  if (value === this.emptyValue || this.isEmptyValue(value) ||
      (is.Array(value) && !value.length)) {
    return this.emptyValue
  }
  var newValue = []
  for (var i = 0, l = value.length; i < l; i++) {
    try {
      newValue.push(this.coerce(value[i]))
    }
    catch (e) {
      throw ValidationError(this.errorMessages.invalidChoice, {
        code: 'invalidChoice'
      , params: {value: value[i]}
      })
    }
  }
  return newValue
}

TypedMultipleChoiceField.prototype.clean = function(value) {
  value = MultipleChoiceField.prototype.clean.call(this, value)
  return this._coerce(value)
}

TypedMultipleChoiceField.prototype.validate = function(value) {
  if (value !== this.emptyValue || (is.Array(value) && value.length)) {
    MultipleChoiceField.prototype.validate.call(this, value)
  }
  else if (this.required) {
    throw ValidationError(this.errorMessages.required, {code: 'required'})
  }
}

/**
 * Allows choosing from files inside a certain directory.
 * @constructor
 * @extends {ChoiceField}
 * @param {string} path
 * @param {Object=} kwargs
 */
var FilePathField = ChoiceField.extend({
  constructor: function FilePathField(path, kwargs) {
    if (!(this instanceof Field)) { return new FilePathField(path, kwargs) }
    kwargs = object.extend({
      match: null, recursive: false, required: true, widget: null,
      label: null, initial: null, helpText: null
    }, kwargs)

    this.path = path
    this.match = kwargs.match
    this.recursive = kwargs.recursive
    delete kwargs.match
    delete kwargs.recursive

    kwargs.choices = []
    ChoiceField.call(this, kwargs)

    if (this.required) {
      this.setChoices([])
    }
    else {
      this.setChoices([['', '---------']])
    }
    if (this.match !== null) {
      this.matchRE = new RegExp(this.match)
    }

    // TODO Plug in file paths when running on the server

    this.widget.choices = this.choices()
  }
})

/**
 * A Field whose clean() method calls multiple Field clean() methods.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var ComboField = Field.extend({
  constructor: function ComboField(kwargs) {
    if (!(this instanceof Field)) { return new ComboField(kwargs) }
    kwargs = object.extend({fields: []}, kwargs)
    Field.call(this, kwargs)
    // Set required to False on the individual fields, because the required
    // validation will be handled by ComboField, not by those individual fields.
    for (var i = 0, l = kwargs.fields.length; i < l; i++) {
      kwargs.fields[i].required = false
    }
    this.fields = kwargs.fields
  }
})

ComboField.prototype.clean = function(value) {
  Field.prototype.clean.call(this, value)
  for (var i = 0, l = this.fields.length; i < l; i++) {
    value = this.fields[i].clean(value)
  }
  return value
}

/**
 * A Field that aggregates the logic of multiple Fields.
 *
 * Its clean() method takes a "decompressed" list of values, which are then
 * cleaned into a single value according to this.fields. Each value in this
 * list is cleaned by the corresponding field -- the first value is cleaned by
 * the first field, the second value is cleaned by the second field, etc. Once
 * all fields are cleaned, the list of clean values is "compressed" into a
 * single value.
 *
 * Subclasses should not have to implement clean(). Instead, they must
 * implement compress(), which takes a list of valid values and returns a
 * "compressed" version of those values -- a single value.
 *
 * You'll probably want to use this with MultiWidget.
 *
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var MultiValueField = Field.extend({
  defaultErrorMessages: {
    invalid: 'Enter a list of values.'
  , incomplete: 'Enter a complete value.'
  }

, constructor: function MultiValueField(kwargs) {
    if (!(this instanceof Field)) { return new MultiValueField(kwargs) }
    kwargs = object.extend({fields: []}, kwargs)
    this.requireAllFields = object.pop(kwargs, 'requireAllFields', true)
    Field.call(this, kwargs)

    for (var i = 0, l = kwargs.fields.length; i < l; i++) {
      var f = kwargs.fields[i]
      object.setDefault(f.errorMessages, 'incomplete',
                        this.errorMessages.incomplete)
      if (this.requireAllFields) {
        // Set required to false on the individual fields, because the required
        // validation will be handled by MultiValueField, not by those
        // individual fields.
        f.required = false
      }
    }
    this.fields = kwargs.fields
  }
})

MultiValueField.prototype.validate = function() {}

/**
 * Validates every value in the given list. A value is validated against the
 * corresponding Field in this.fields.
 *
 * For example, if this MultiValueField was instantiated with
 * {fields: [forms.DateField(), forms.TimeField()]}, clean() would call
 * DateField.clean(value[0]) and TimeField.clean(value[1]).
 *
 * @param {Array} value the input to be validated.
 *
 * @return the result of calling compress() on the cleaned input.
 */
MultiValueField.prototype.clean = function(value) {
  var cleanData = []
  var errors = []

  if (!value || is.Array(value)) {
    var allValuesEmpty = true
    if (is.Array(value)) {
      for (var i = 0, l = value.length; i < l; i++) {
        if (value[i]) {
          allValuesEmpty = false
          break
        }
      }
    }

    if (!value || allValuesEmpty) {
      if (this.required) {
        throw ValidationError(this.errorMessages.required, {code: 'required'})
      }
      else {
        return this.compress([])
      }
    }
  }
  else {
    throw ValidationError(this.errorMessages.invalid, {code: 'invalid'})
  }

  for (i = 0, l = this.fields.length; i < l; i++) {
    var field = this.fields[i]
    var fieldValue = value[i]
    if (fieldValue === undefined) {
      fieldValue = null
    }
    if (this.isEmptyValue(fieldValue)) {
      if (this.requireAllFields) {
        // Throw a 'required' error if the MultiValueField is required and any
        // field is empty.
        if (this.required) {
          throw ValidationError(this.errorMessages.required, {code: 'required'})
        }
      }
      else if (field.required) {
        // Otherwise, add an 'incomplete' error to the list of collected errors
        // and skip field cleaning, if a required field is empty.
        if (errors.indexOf(field.errorMessages.incomplete) == -1) {
          errors.push(field.errorMessages.incomplete)
        }
        continue
      }
    }

    try {
      cleanData.push(field.clean(fieldValue))
    }
    catch (e) {
      if (!(e instanceof ValidationError)) { throw e }
      // Collect all validation errors in a single list, which we'll throw at
      // the end of clean(), rather than throwing a single exception for the
      // first error we encounter. Skip duplicates.
      errors = errors.concat(e.messages().filter(function(m) {
        return errors.indexOf(m) == -1
      }))
    }
  }

  if (errors.length !== 0) {
    throw ValidationError(errors)
  }

  var out = this.compress(cleanData)
  this.validate(out)
  this.runValidators(out)
  return out
}

/**
 * Returns a single value for the given list of values. The values can be
 * assumed to be valid.
 *
 * For example, if this MultiValueField was instantiated with
 * {fields: [forms.DateField(), forms.TimeField()]}, this might return a Date
 * object created by combining the date and time in dataList.
 *
 * @param {Array} dataList
 */
MultiValueField.prototype.compress = function(dataList) {
  throw new Error('Subclasses must implement this method.')
}

MultiValueField.prototype._hasChanged = function(initial, data) {
  if (initial === null) {
    initial = []
    for (var i = 0, l = data.length; i < l; i++) {
      initial.push('')
    }
  }
  else if (!(is.Array(initial))) {
    initial = this.widget.decompress(initial)
  }

  for (i = 0, l = this.fields.length; i < l; i++) {
    if (this.fields[i]._hasChanged(initial[i], data[i])) {
      return true
    }
  }
  return false
}

/**
 * A MultiValueField consisting of a DateField and a TimeField.
 * @constructor
 * @extends {MultiValueField}
 * @param {Object=} kwargs
 */
var SplitDateTimeField = MultiValueField.extend({
  hiddenWidget: widgets.SplitHiddenDateTimeWidget
, widget: widgets.SplitDateTimeWidget
, defaultErrorMessages: {
    invalidDate: 'Enter a valid date.'
  , invalidTime: 'Enter a valid time.'
  }

, constructor: function SplitDateTimeField(kwargs) {
    if (!(this instanceof Field)) { return new SplitDateTimeField(kwargs) }
    kwargs = object.extend({
      inputDateFormats: null, inputTimeFormats: null
    }, kwargs)
    var errors = object.extend({}, this.defaultErrorMessages)
    if (typeof kwargs.errorMessages != 'undefined') {
      object.extend(errors, kwargs.errorMessages)
    }
    kwargs.fields = [
      DateField({inputFormats: kwargs.inputDateFormats,
                 errorMessages: {invalid: errors.invalidDate}})
    , TimeField({inputFormats: kwargs.inputTimeFormats,
                 errorMessages: {invalid: errors.invalidTime}})
    ]
    MultiValueField.call(this, kwargs)
  }
})

/**
 * Validates that, if given, its input does not contain empty values.
 *
 * @param {Array} [dataList] a two-item list consisting of two Date
 *                           objects, the first of which represents a date, the
 *                           second a time.
 *
 * @return a Date object representing the given date and time, or
 *         null for empty values.
 */
SplitDateTimeField.prototype.compress = function(dataList) {
  if (is.Array(dataList) && dataList.length > 0) {
    var d = dataList[0]
    var t = dataList[1]
    // Raise a validation error if date or time is empty (possible if
    // SplitDateTimeField has required == false).
    if (this.isEmptyValue(d)) {
      throw ValidationError(this.errorMessages.invalidDate, {code: 'invalidDate'})
    }
    if (this.isEmptyValue(t)) {
      throw ValidationError(this.errorMessages.invalidTime, {code: 'invalidTime'})
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(),
                    t.getHours(), t.getMinutes(), t.getSeconds())
  }
  return null
}

/**
 * Validates that its input is a valid IPv4 address.
 * @constructor
 * @extends {CharField}
 * @param {Object=} kwargs
 * @deprecated
 */
var IPAddressField = CharField.extend({
  defaultValidators: [validators.validateIPv4Address]

, constructor: function IPAddressField(kwargs) {
    if (!(this instanceof Field)) { return new IPAddressField(kwargs) }
    CharField.call(this, kwargs)
  }
})

var GenericIPAddressField = CharField.extend({
  constructor: function GenericIPAddressField(kwargs) {
    if (!(this instanceof Field)) { return new GenericIPAddressField(kwargs) }
    kwargs = object.extend({protocol: 'both', unpackIPv4: false}, kwargs)
    this.unpackIPv4 = kwargs.unpackIPv4
    this.defaultValidators =
      validators.ipAddressValidators(kwargs.protocol, kwargs.unpackIPv4).validators
    CharField.call(this, kwargs)
  }
})

GenericIPAddressField.prototype.toJavaScript = function(value) {
  if (!value) {
    return ''
  }
  if (value && value.indexOf(':') != -1) {
    return cleanIPv6Address(value, {unpackIPv4: this.unpackIPv4})
  }
  return value
}

/**
 * Validates that its input is a valid slug.
 * @constructor
 * @extends {CharField}
 * @param {Object=} kwargs
 */
var SlugField = CharField.extend({
  defaultValidators: [validators.validateSlug]
, constructor: function SlugField(kwargs) {
    if (!(this instanceof Field)) { return new SlugField(kwargs) }
    CharField.call(this, kwargs)
  }
})

SlugField.prototype.clean = function(value) {
  value = util.strip(this.toJavaScript(value))
  return CharField.prototype.clean.call(this, value)
}

module.exports = {
  Field: Field
, CharField: CharField
, IntegerField: IntegerField
, FloatField: FloatField
, DecimalField: DecimalField
, BaseTemporalField: BaseTemporalField
, DateField: DateField
, TimeField: TimeField
, DateTimeField: DateTimeField
, RegexField: RegexField
, EmailField: EmailField
, FileField: FileField
, ImageField: ImageField
, URLField: URLField
, BooleanField: BooleanField
, NullBooleanField: NullBooleanField
, ChoiceField: ChoiceField
, TypedChoiceField: TypedChoiceField
, MultipleChoiceField: MultipleChoiceField
, TypedMultipleChoiceField: TypedMultipleChoiceField
, FilePathField: FilePathField
, ComboField: ComboField
, MultiValueField: MultiValueField
, SplitDateTimeField: SplitDateTimeField
, IPAddressField: IPAddressField
, GenericIPAddressField: GenericIPAddressField
, SlugField: SlugField
}

},{"./env":1,"./util":6,"./widgets":7,"Concur":8,"isomorph/is":12,"isomorph/object":13,"isomorph/time":14,"isomorph/url":15,"validators":18}],3:[function(require,module,exports){
'use strict';

var Concur = require('Concur')
var is = require('isomorph/is')
var format = require('isomorph/format').formatObj
var object = require('isomorph/object')
var copy = require('isomorph/copy')
var validators = require('validators')

var util = require('./util')
var fields = require('./fields')
var widgets = require('./widgets')

var ErrorList = util.ErrorList
var ErrorObject = util.ErrorObject
var ValidationError = validators.ValidationError
var Field = fields.Field
var FileField = fields.FileField
var Textarea = widgets.Textarea
var TextInput = widgets.TextInput

/** Property under which non-field-specific errors are stored. */
var NON_FIELD_ERRORS = '__all__'

/**
 * A field and its associated data.
 * @param {Form} form a form.
 * @param {Field} field one of the form's fields.
 * @param {String} name the name under which the field is held in the form.
 * @constructor
 */
var BoundField = Concur.extend({
  constructor: function BoundField(form, field, name) {
    if (!(this instanceof BoundField)) { return new BoundField(form, field, name) }
    this.form = form
    this.field = field
    this.name = name
    this.htmlName = form.addPrefix(name)
    this.htmlInitialName = form.addInitialPrefix(name)
    this.htmlInitialId = form.addInitialPrefix(this.autoId())
    this.label = this.field.label !== null ? this.field.label : util.prettyName(name)
    this.helpText = field.helpText || ''
  }
})

BoundField.prototype.errors = function() {
  return this.form.errors(this.name) || new this.form.errorConstructor()
}

BoundField.prototype.isHidden = function() {
  return this.field.widget.isHidden
}

/**
 * Calculates and returns the id attribute for this BoundField if the associated
 * form has an autoId. Returns an empty string otherwise.
 */
BoundField.prototype.autoId = function() {
  var autoId = this.form.autoId
  if (autoId) {
    autoId = ''+autoId
    if (autoId.indexOf('{name}') != -1) {
      return format(autoId, {name: this.htmlName})
    }
    return this.htmlName
  }
  return ''
}

/**
 * Returns the data for this BoundFIeld, or null if it wasn't given.
 */
BoundField.prototype.data = function() {
  return this.field.widget.valueFromData(this.form.data,
                                         this.form.files,
                                         this.htmlName)
}

/**
 * Wrapper around the field widget's idForLabel method. Useful, for example, for
 * focusing on this field regardless of whether it has a single widget or a
 * MutiWidget.
 */
BoundField.prototype.idForLabel = function() {
  var widget = this.field.widget
  var id = object.get(widget.attrs, 'id', this.autoId())
  return widget.idForLabel(id)
}

BoundField.prototype.render = function(kwargs) {
  if (this.field.showHiddenInitial) {
    return React.DOM.div(null, this.asWidget(kwargs),
                         this.asHidden({onlyInitial: true}))
  }
  return this.asWidget(kwargs)
}

/**
 * Returns a list of SubWidgets that comprise all widgets in this BoundField.
 * This really is only useful for RadioSelect widgets, so that you can iterate
 * over individual radio buttons when rendering.
 */
BoundField.prototype.subWidgets = BoundField.prototype.__iter__ = function() {
  return this.field.widget.subWidgets(this.htmlName, this.value())
}

/**
 * Renders a widget for the field.
 * @param {Object} [kwargs] configuration options
 * @config {Widget} [widget] an override for the widget used to render the field
 *   - if not provided, the field's configured widget will be used
 * @config {Object} [attrs] additional attributes to be added to the field's widget.
 */
BoundField.prototype.asWidget = function(kwargs) {
  kwargs = object.extend({
    widget: null, attrs: null, onlyInitial: false
  }, kwargs)
  var widget = (kwargs.widget !== null ? kwargs.widget : this.field.widget)
  var attrs = (kwargs.attrs !== null ? kwargs.attrs : {})
  var autoId = this.autoId()
  var name = !kwargs.onlyInitial ? this.htmlName : this.htmlInitialName
  if (autoId &&
      typeof attrs.id == 'undefined' &&
      typeof widget.attrs.id == 'undefined') {
    attrs.id = (!kwargs.onlyInitial ? autoId : this.htmlInitialId)
  }

  return widget.render(name, this.value(), {attrs: attrs})
}

/**
 * Renders the field as a text input.
 * @param {Object} [kwargs] widget options.
 */
BoundField.prototype.asText = function(kwargs) {
  kwargs = object.extend({}, kwargs, {widget: TextInput()})
  return this.asWidget(kwargs)
}

/**
 * Renders the field as a textarea.
 * @param {Object} [kwargs] widget options.
 */
BoundField.prototype.asTextarea = function(kwargs) {
  kwargs = object.extend({}, kwargs, {widget: Textarea()})
  return this.asWidget(kwargs)
}

/**
 * Renders the field as a hidden field.
 * @param {Object} [kwargs] widget options.
 */
BoundField.prototype.asHidden = function(kwargs) {
  kwargs = object.extend({}, kwargs, {widget: new this.field.hiddenWidget()})
  return this.asWidget(kwargs)
}

/**
 * Returns the value for this BoundField, using the initial value if the form
 * is not bound or the data otherwise.
 */
BoundField.prototype.value = function() {
  var data
  if (!this.form.isBound) {
    data = object.get(this.form.initial, this.name, this.field.initial)
    if (is.Function(data)) {
      data = data()
    }
  }
  else {
    data = this.field.boundData(this.data(),
                                object.get(this.form.initial,
                                           this.name,
                                           this.field.initial))
  }
  return this.field.prepareValue(data)
}

BoundField.prototype._addLabelSuffix = function(label, labelSuffix) {
  // Only add the suffix if the label does not end in punctuation
  if (labelSuffix && ':?.!'.indexOf(label.charAt(label.length - 1)) == -1) {
    return label + labelSuffix
  }
  return label
}

/**
 * Wraps the given contents in a <label> if the field has an id attribute. If
 * contents aren't given, uses the field's label.
 *
 * If attrs are given, they're used as HTML attributes on the <label> tag.
 *
 * @param {Object} [kwargs] configuration options.
 * @config {String} [contents] contents for the label - if not provided, label
 *                             contents will be generated from the field itself.
 * @config {Object} [attrs] additional attributes to be added to the label.
 * @config {String} [labelSuffix] allows overriding the form's labelSuffix.
 */
BoundField.prototype.labelTag = function(kwargs) {
  kwargs = object.extend({
    contents: this.label, attrs: null, labelSuffix: this.form.labelSuffix
  }, kwargs)
  var contents = this._addLabelSuffix(kwargs.contents, kwargs.labelSuffix)
  var widget = this.field.widget
  var id = object.get(widget.attrs, 'id', this.autoId())
  if (id) {
    var attrs = object.extend(kwargs.attrs || {}, {htmlFor: widget.idForLabel(id)})
    contents = React.DOM.label(attrs, contents)
  }
  return contents
}

/**
 * Puts together additional CSS classes for this field based on the field, the
 * form and whether or not the field has errors.
 * @param {string=} extra CSS classes for the field.
 * @return {string} space-separated CSS classes for this field.
 */
BoundField.prototype.cssClasses = function(extraCssClasses) {
  var cssClasses = extraCssClasses ? [extraCssClasses] : []
  if (this.field.cssClass !== null) {
    cssClasses.push(this.field.cssClass)
  }
  if (typeof this.form.rowCssClass != 'undefined') {
    cssClasses.push(this.form.rowCssClass)
  }
  if (this.errors().isPopulated() &&
      typeof this.form.errorCssClass != 'undefined') {
    cssClasses.push(this.form.errorCssClass)
  }
  if (this.field.required &&
     typeof this.form.requiredCssClass != 'undefined') {
    cssClasses.push(this.form.requiredCssClass)
  }
  return cssClasses.join(' ')
}

/**
 * A collection of Fields that knows how to validate and display itself.
 * @constructor
 * @param {Object}
 */
var BaseForm = Concur.extend({
  constructor: function BaseForm(kwargs) {
    kwargs = object.extend({
      data: null, files: null, autoId: 'id_{name}', prefix: null,
      initial: null, errorConstructor: ErrorList, labelSuffix: ':',
      emptyPermitted: false
    }, kwargs)
    this.isBound = kwargs.data !== null || kwargs.files !== null
    this.data = kwargs.data || {}
    this.files = kwargs.files || {}
    this.autoId = kwargs.autoId
    this.prefix = kwargs.prefix
    this.initial = kwargs.initial || {}
    this.errorConstructor = kwargs.errorConstructor
    this.labelSuffix = kwargs.labelSuffix
    this.emptyPermitted = kwargs.emptyPermitted
    this._errors = null; // Stores errors after clean() has been called
    this._changedData = null

    // The baseFields attribute is the *prototype-wide* definition of fields.
    // Because a particular *instance* might want to alter this.fields, we
    // create this.fields here by deep copying baseFields. Instances should
    // always modify this.fields; they should not modify baseFields.
    this.fields = copy.deepCopy(this.baseFields)
  }
})

/**
 * Getter for errors, which first cleans the form if there are no errors
 * defined yet.
 * @param {string=} name if given, errors for this field name will be returned
 *   instead of the full error object.
 * @return errors for the data provided for the form.
 */
BaseForm.prototype.errors = function(name) {
  if (this._errors === null) {
    this.fullClean()
  }
  if (name) {
    return this._errors.get(name)
  }
  return this._errors
}

BaseForm.prototype.changedData = function() {
  if (this._changedData === null) {
    this._changedData = []
    var initialValue
    // XXX: For now we're asking the individual fields whether or not
    // the data has changed. It would probably be more efficient to hash
    // the initial data, store it in a hidden field, and compare a hash
    // of the submitted data, but we'd need a way to easily get the
    // string value for a given field. Right now, that logic is embedded
    // in the render method of each field's widget.
    for (var name in this.fields) {
      if (!object.hasOwn(this.fields, name)) { continue }

      var field = this.fields[name]
      var prefixedName = this.addPrefix(name)
      var dataValue = field.widget.valueFromData(this.data,
                                                 this.files,
                                                 prefixedName)
      if (!field.showHiddenInitial) {
        initialValue = object.get(this.initial, name, field.initial)
        if (is.Function(initialValue)) {
          initialValue = initialValue()
        }
      }
      else {
        var initialPrefixedName = this.addInitialPrefix(name)
        var hiddenWidget = new field.hiddenWidget()
        try {
          initialValue = hiddenWidget.valueFromData(
                  this.data, this.files, initialPrefixedName)
        }
        catch (e) {
          if (!(e instanceof ValidationError)) { throw e }
          // Always assume data has changed if validation fails
          this._changedData.push(name)
          continue
        }
      }

      if (field._hasChanged(initialValue, dataValue)) {
        this._changedData.push(name)
      }
    }
  }
  return this._changedData
}

BaseForm.prototype.render = function() {
  return this.asTable()
}

/**
 * Creates a BoundField for each field in the form, in the order in which the
 * fields were created.
 * @param {Function} [test] if provided, this function will be called with
 *   field and name arguments - BoundFields will only be generated for fields
 *   for which true is returned.
 * @return a list of BoundField objects - one for each field in the form, in the
 *   order in which the fields were created.
 */
BaseForm.prototype.boundFields = function(test) {
  test = test || function() { return true }

  var fields = []
  for (var name in this.fields) {
    if (object.hasOwn(this.fields, name) &&
        test(this.fields[name], name) === true) {
      fields.push(BoundField(this, this.fields[name], name))
    }
  }
  return fields
}

/**
 * {name -> BoundField} version of boundFields
 */
BaseForm.prototype.boundFieldsObj = function(test) {
  test = test || function() { return true }

  var fields = {}
  for (var name in this.fields) {
    if (object.hasOwn(this.fields, name) &&
        test(this.fields[name], name) === true) {
      fields[name] = BoundField(this, this.fields[name], name)
    }
  }
  return fields
}

/**
 * Creates a BoundField for the field with the given name.
 *
 * @param {String} name a field name.
 * @return a BoundField for the field with the given name, if one exists.
 */
BaseForm.prototype.boundField = function(name) {
  if (!object.hasOwn(this.fields, name)) {
    throw new Error("Form does not have a '" + name + "' field.")
  }
  return BoundField(this, this.fields[name], name)
}

/**
 * Determines whether or not the form has errors.
 * @return {Boolean}
 */
BaseForm.prototype.isValid = function() {
  if (!this.isBound) {
    return false
  }
  return !this.errors().isPopulated()
}

/**
 * Returns the field name with a prefix appended, if this Form has a prefix set.
 * @param {String} fieldName a field name.
 * @return a field name with a prefix appended, if this Form has a prefix set,
 *         otherwise <code>fieldName</code> is returned as-is.
 */
BaseForm.prototype.addPrefix = function(fieldName) {
  if (this.prefix !== null) {
      return format('{prefix}-{fieldName}',
                    {prefix: this.prefix, fieldName: fieldName})
  }
  return fieldName
}

/**
 * Adds an initial prefix for checking dynamic initial values.
 */
BaseForm.prototype.addInitialPrefix = function(fieldName) {
  return format('initial-{fieldName}',
                {fieldName: this.addPrefix(fieldName)})
}

/**
 * Helper function for outputting HTML.
 * @param {Function} normalRow a function which produces a normal row.
 * @param {Function} errorRow a function which produces an error row.
 * @return a list of React.DOM components representing rows.
 */
BaseForm.prototype._htmlOutput = function(normalRow, errorRow) {
  var bf
  var bfErrors
  var topErrors = this.nonFieldErrors() // Errors that should be displayed above all fields

  var hiddenFields = []
  var hiddenBoundFields = this.hiddenFields()
  for (var i = 0, l = hiddenBoundFields.length; i < l; i++) {
    bf = hiddenBoundFields[i]
    bfErrors = bf.errors()
    if (bfErrors.isPopulated) {
      topErrors.extend(bfErrors.messages().map(function(error) {
        return '(Hidden field ' + bf.name + ') ' + error
      }))
    }
    hiddenFields.push(bf.render())
  }

  var rows = []
  var errors
  var label
  var helpText
  var extraContent
  var visibleBoundFields = this.visibleFields()
  for (i = 0, l = visibleBoundFields.length; i < l; i++) {
    bf = visibleBoundFields[i]
    bfErrors = bf.errors()

    // Variables which can be optional in each row
    errors = (bfErrors.isPopulated() ? bfErrors.render() : null)
    label = (bf.label ? bf.labelTag() : null)
    helpText = bf.helpText
    if (helpText) {
      helpText = ((is.Object(helpText) && object.hasOwn(helpText, '__html'))
                  ? React.DOM.span({className: 'helpText', dangerouslySetInnerHTML: helpText})
                  : React.DOM.span({className: 'helpText'}, helpText))
    }
    // If this is the last row, it should include any hidden fields
    extraContent = (i == l - 1 && hiddenFields.length > 0 ? hiddenFields : null)

    rows.push(normalRow(bf.htmlName,
                        bf.cssClasses(),
                        label,
                        bf.render(),
                        helpText,
                        errors,
                        extraContent))
  }

  if (topErrors.isPopulated()) {
    // Add hidden fields to the top error row if it's being displayed and
    // there are no other rows.
    extraContent = (hiddenFields.length > 0 && rows.length === 0 ? hiddenFields : null)
    rows.unshift(errorRow(this.addPrefix(NON_FIELD_ERRORS),
                          topErrors.render(),
                          extraContent))
  }

  // Put hidden fields in their own error row if there were no rows to
  // display.
  if (hiddenFields.length > 0 && rows.length === 0) {
    rows.push(errorRow(this.addPrefix('__hiddenFields__'),
                       null,
                       hiddenFields,
                       this.hiddenFieldRowCssClass))
  }

  return rows
}

/**
 * Returns this form rendered as HTML <tr>s - excluding the <table>.
 */
BaseForm.prototype.asTable = (function() {
  function normalRow(key, cssClasses, label, field, helpText, errors, extraContent) {
    var contents = [null]
    if (errors) { contents.push(errors) }
    contents.push(field)
    if (helpText) {
      contents.push(React.DOM.br(null))
      contents.push(helpText)
    }
    if (extraContent) { contents.push.apply(contents, extraContent) }
    var rowAttrs = {key: key}
    if (cssClasses) { rowAttrs.className = cssClasses }
    return React.DOM.tr(rowAttrs
    , React.DOM.th(null, label)
    , React.DOM.td.apply(null, contents)
    )
  }

  function errorRow(key, errors, extraContent, cssClasses) {
    var contents = [{colSpan: 2}]
    if (errors) { contents.push(errors) }
    if (extraContent) { contents.push.apply(contents, extraContent) }
    var rowAttrs = {key: key}
    if (cssClasses) { rowAttrs.className = cssClasses }
    return React.DOM.tr(rowAttrs
    , React.DOM.td.apply(null, contents)
    )
  }

  return function() { return this._htmlOutput(normalRow, errorRow) }
})()

function _normalRow(reactEl, key, cssClasses, label, field, helpText, errors, extraContent) {
  var rowAttrs = {key: key}
  if (cssClasses) { rowAttrs.className = cssClasses }
  var contents = [rowAttrs]
  if (errors) { contents.push(errors) }
  if (label) { contents.push(label) }
  contents.push(' ')
  contents.push(field)
  if (helpText) {
    contents.push(' ')
    contents.push(helpText)
  }
  if (extraContent) { contents.push.apply(contents, extraContent) }
  return reactEl.apply(null, contents)
}

function _errorRow(reactEl, key, errors, extraContent, cssClasses) {
  var rowAttrs = {key: key}
  if (cssClasses) { rowAttrs.className = cssClasses }
  var contents = [rowAttrs]
  if (errors) { contents.push(errors) }
  if (extraContent) { contents.push.apply(contents, extraContent) }
  return reactEl.apply(null, contents)
}

function _singleElementRow(reactEl) {
  var normalRow = _normalRow.bind(null, reactEl)
  var errorRow = _errorRow.bind(null, reactEl)
  return function() {
    return this._htmlOutput(normalRow, errorRow)
  }
}

/**
 * Returns this form rendered as HTML <li>s - excluding the <ul>.
 */
BaseForm.prototype.asUl = _singleElementRow(React.DOM.li)

/**
 * Returns this form rendered as HTML <div>s.
 */
BaseForm.prototype.asDiv = _singleElementRow(React.DOM.div)

/**
 * Returns errors that aren't associated with a particular field.
 * @return errors that aren't associated with a particular field - i.e., errors
 *   generated by clean(). Will be empty if there are none.
 */
BaseForm.prototype.nonFieldErrors = function() {
  return (this.errors(NON_FIELD_ERRORS) || new this.errorConstructor())
}

/**
 * Returns the raw value for a particular field name. This is just a convenient
 * wrapper around widget.valueFromData.
 */
BaseForm.prototype._rawValue = function(fieldname) {
  var field = this.fields[fieldname]
  var prefix = this.addPrefix(fieldname)
  return field.widget.valueFromData(this.data, this.files, prefix)
}

/**
 * Updates the content of this._errors.
 *
 * The field argument is the name of the field to which the errors should be
 * added. If its value is null the errors will be treated as NON_FIELD_ERRORS.
 *
 * The error argument can be a single error, a list of errors, or an object that
 * maps field names to lists of errors. What we define as an "error" can be
 * either a simple string or an instance of ValidationError with its message
 * attribute set and what we define as list or object can be an actual list or
 * object or an instance of ValidationError with its errorList or errorObj
 * property set.
 *
 * If error is an object, the field argument *must* be null and errors will be
 * added to the fields that correspond to the properties of the object.
 */
BaseForm.prototype.addError = function(field, error) {
  if (!(error instanceof ValidationError)) {
    // Normalise to ValidationError and let its constructor do the hard work of
    // making sense of the input.
    error = ValidationError(error)
  }

  if (object.hasOwn(error, 'errorObj')) {
    if (field !== null) {
      throw new Error("The argument 'field' must be null when the 'error' " +
                      'argument contains errors for multiple fields.')
    }
    error = error.errorObj
  }
  else {
    var errorList = error.errorList
    error = {}
    error[field || NON_FIELD_ERRORS] = errorList
  }

  var fields = Object.keys(error)
  for (var i = 0, l = fields.length; i < l; i++) {
    field = fields[i]
    errorList = error[field]
    if (!this._errors.hasField(field)) {
      if (field !== NON_FIELD_ERRORS && !object.hasOwn(this.fields, field)) {
        var formName = (this.constructor.name
                        ? "'" + this.constructor.name + "'"
                        : 'Form')
        throw new Error(formName + " has no field named '" + field + "'")
      }
      this._errors.set(field, new this.errorConstructor())
    }
    this._errors.get(field).extend(errorList)
    if (object.hasOwn(this.cleanedData, field)) {
      delete this.cleanedData[field]
    }
  }
}

/**
 * Cleans all of data and populates _errors and cleanedData.
 */
BaseForm.prototype.fullClean = function() {
  this._errors = ErrorObject()
  if (!this.isBound) {
    return; // Stop further processing
  }

  this.cleanedData = {}

  // If the form is permitted to be empty, and none of the form data has
  // changed from the initial data, short circuit any validation.
  if (this.emptyPermitted && !this.hasChanged()) {
    return
  }

  this._cleanFields()
  this._cleanForm()
  this._postClean()
}

BaseForm.prototype._cleanFields = function() {
  for (var name in this.fields) {
    if (!object.hasOwn(this.fields, name)) { continue }

    var field = this.fields[name]
    // valueFromData() gets the data from the data objects.
    // Each widget type knows how to retrieve its own data, because some widgets
    // split data over several HTML fields.
    var value = field.widget.valueFromData(this.data, this.files,
                                           this.addPrefix(name))
    try {
      if (field instanceof FileField) {
        var initial = object.get(this.initial, name, field.initial)
        value = field.clean(value, initial)
      }
      else {
        value = field.clean(value)
      }
      this.cleanedData[name] = value

      // Try cleanName
      var customClean = 'clean' + name.charAt(0).toUpperCase() + name.substr(1)
      if (typeof this[customClean] != 'undefined' &&
          is.Function(this[customClean])) {
        value = this[customClean]()
        if (typeof value != 'undefined') {
          this.cleanedData[name] = value
        }
      }
      else {
        // Otherwise, try clean_name
        customClean = 'clean_' + name
        if (typeof this[customClean] != 'undefined' &&
            is.Function(this[customClean])) {
          value = this[customClean]()
          if (typeof value != 'undefined') {
            this.cleanedData[name] = value
          }
        }
      }
    }
    catch (e) {
      if (!(e instanceof ValidationError)) {
        throw e
      }
      this.addError(name, e)
    }
  }
}

BaseForm.prototype._cleanForm = function() {
  var cleanedData
  try {
    cleanedData = this.clean()
  }
  catch (e) {
    if (!(e instanceof ValidationError)) {
      throw e
    }
    this.addError(null, e)
  }
  if (cleanedData) {
    this.cleanedData = cleanedData
  }
}

/**
 * An internal hook for performing additional cleaning after form cleaning is
 * complete.
 */
BaseForm.prototype._postClean = function() {}

/**
 * Hook for doing any extra form-wide cleaning after each Field's clean() has
 * been called. Any ValidationError raised by this method will not be associated
 * with a particular field; it will have a special-case association with the
 * field named '__all__'.
 * @return validated, cleaned data.
 */
BaseForm.prototype.clean = function() {
  return this.cleanedData
}

/**
 * Determines if data differs from initial.
 */
BaseForm.prototype.hasChanged = function() {
  return (this.changedData().length > 0)
}

/**
 * Determines if the form needs to be multipart-encoded in other words, if it
 * has a FileInput.
 * @return true if the form needs to be multipart-encoded.
 */
BaseForm.prototype.isMultipart = function() {
  for (var name in this.fields) {
    if (object.hasOwn(this.fields, name) &&
        this.fields[name].widget.needsMultipartForm) {
      return true
    }
  }
  return false
}

/**
 * Returns a list of all the BoundField objects that correspond to hidden
 * fields. Useful for manual form layout.
 */
BaseForm.prototype.hiddenFields = function() {
  return this.boundFields(function(field) {
    return field.widget.isHidden
  })
}

/**
 * Returns a list of BoundField objects that do not correspond to hidden fields.
 * The opposite of the hiddenFields() method.
 */
BaseForm.prototype.visibleFields = function() {
  return this.boundFields(function(field) {
    return !field.widget.isHidden
  })
}

function DeclarativeFieldsMeta(prototypeProps, constructorProps) {
  // Pop Fields instances from prototypeProps to build up the new form's own
  // declaredFields.
  var fields = []
  Object.keys(prototypeProps).forEach(function(name) {
    if (prototypeProps[name] instanceof Field) {
      fields.push([name, prototypeProps[name]])
      delete prototypeProps[name]
    }
  })
  fields.sort(function(a, b) {
    return a[1].creationCounter - b[1].creationCounter
  })
  prototypeProps.declaredFields = object.fromItems(fields)

  // Build up final declaredFields from the form being extended, forms being
  // mixed in and the new form's own declaredFields, in that order of
  // precedence.
  var declaredFields = {}

  // If we're extending another form, we don't need to check for shadowed
  // fields, as it's at the bottom of the pile for inheriting declaredFields.
  if (object.hasOwn(this, 'declaredFields')) {
    object.extend(declaredFields, this.declaredFields)
  }

  // If any mixins which look like Form constructors were given, inherit their
  // declaredFields and check for shadowed fields.
  if (object.hasOwn(prototypeProps, '__mixin__')) {
    var mixins = prototypeProps.__mixin__
    if (!is.Array(mixins)) { mixins = [mixins] }
    // Note that we loop over mixed in forms in *reverse* to preserve the
    // correct order of fields.
    for (var i = mixins.length - 1; i >= 0; i--) {
      var mixin = mixins[i]
      if (is.Function(mixin) && object.hasOwn(mixin.prototype, 'declaredFields')) {
        // Extend mixed-in declaredFields over the top of what's already there,
        // then delete any fields which have been shadowed by a non-Field
        // property in its prototype.
        object.extend(declaredFields, mixin.prototype.declaredFields)
        Object.keys(mixin.prototype).forEach(function(name) {
          if (object.hasOwn(declaredFields, name)) {
            delete declaredFields[name]
          }
        })
        // To avoid overwriting the new form's baseFields or declaredFields when
        // the rest of the mixin's prototype is mixed-in by Concur, replace the
        // mixin with an object containing only its other prototype properties.
        var mixinPrototype = object.extend({}, mixin.prototype)
        delete mixinPrototype.baseFields
        delete mixinPrototype.declaredFields
        mixins[i] = mixinPrototype
      }
    }
    // We may have wrapped a single mixin in an Array - assign it back to the
    // new form's prototype for processing by Concur.
    prototypeProps.__mixin__ = mixins
  }

  // Finally - extend the new form's own declaredFields over the top of
  // decalredFields being inherited, then delete any fields which have been
  // shadowed by a non-Field property in its prototype.
  object.extend(declaredFields, prototypeProps.declaredFields)
  Object.keys(prototypeProps).forEach(function(name) {
    if (object.hasOwn(declaredFields, name)) {
      delete declaredFields[name]
    }
  })

  prototypeProps.baseFields = declaredFields
  prototypeProps.declaredFields = declaredFields
}

var Form = BaseForm.extend({
  __meta__: DeclarativeFieldsMeta
, constructor: function Form() {
    BaseForm.apply(this, arguments)
  }
})

module.exports = {
  NON_FIELD_ERRORS: NON_FIELD_ERRORS
, BoundField: BoundField
, BaseForm: BaseForm
, DeclarativeFieldsMeta: DeclarativeFieldsMeta
, Form: Form
}

},{"./fields":2,"./util":6,"./widgets":7,"Concur":8,"isomorph/copy":10,"isomorph/format":11,"isomorph/is":12,"isomorph/object":13,"validators":18}],4:[function(require,module,exports){
'use strict';

var Concur = require('Concur')
var object = require('isomorph/object')
var validators = require('validators')

var util = require('./util')
var widgets = require('./widgets')
var fields = require('./fields')
var forms = require('./forms')

var ErrorList = util.ErrorList
var ValidationError = validators.ValidationError
var IntegerField = fields.IntegerField
var BooleanField = fields.BooleanField
var HiddenInput = widgets.HiddenInput

// Special field names
var TOTAL_FORM_COUNT = 'TOTAL_FORMS'
var INITIAL_FORM_COUNT = 'INITIAL_FORMS'
var MIN_NUM_FORM_COUNT = 'MIN_NUM_FORMS'
var MAX_NUM_FORM_COUNT = 'MAX_NUM_FORMS'
var ORDERING_FIELD_NAME = 'ORDER'
var DELETION_FIELD_NAME = 'DELETE'

// Default minimum number of forms in a formset
var DEFAULT_MIN_NUM = 0

// Default maximum number of forms in a formset, to prevent memory exhaustion
var DEFAULT_MAX_NUM = 1000

/**
 * ManagementForm is used to keep track of how many form instances are displayed
 * on the page. If adding new forms via JavaScript, you should increment the
 * count field of this form as well.
 * @constructor
 */
var ManagementForm = (function() {
  var fields = {}
  fields[TOTAL_FORM_COUNT] = IntegerField({widget: HiddenInput})
  fields[INITIAL_FORM_COUNT] = IntegerField({widget: HiddenInput})
  // MIN_NUM_FORM_COUNT and MAX_NUM_FORM_COUNT are output with the rest of
  // the management form, but only for the convenience of client-side
  // code. The POST value of them returned from the client is not checked.
  fields[MIN_NUM_FORM_COUNT] = IntegerField({required: false, widget: HiddenInput})
  fields[MAX_NUM_FORM_COUNT] = IntegerField({required: false, widget: HiddenInput})
  return forms.Form.extend(fields)
})()

/**
 * A collection of instances of the same Form.
 * @constructor
 * @param {Object=} kwargs
 */
var BaseFormSet = Concur.extend({
  constructor: function BaseFormSet(kwargs) {
    kwargs = object.extend({
      data: null, files: null, autoId: 'id_{name}', prefix: null,
      initial: null, errorConstructor: ErrorList, managementFormCssClass: null
    }, kwargs)
    this.isBound = kwargs.data !== null || kwargs.files !== null
    this.prefix = kwargs.prefix || this.getDefaultPrefix()
    this.autoId = kwargs.autoId
    this.data = kwargs.data || {}
    this.files = kwargs.files || {}
    this.initial = kwargs.initial
    this.errorConstructor = kwargs.errorConstructor
    this.managementFormCssClass = kwargs.managementFormCssClass
    this._forms = null
    this._errors = null
    this._nonFormErrors = null
  }
})

/**
 * Returns the ManagementForm instance for this FormSet.
 */
BaseFormSet.prototype.managementForm = function() {
  var form
  if (this.isBound) {
    form = new ManagementForm({data: this.data, autoId: this.autoId,
                               prefix: this.prefix})
    if (!form.isValid()) {
      throw ValidationError('ManagementForm data is missing or has been tampered with',
                            {code: 'missing_management_form'})
    }
  }
  else {
    var initial = {}
    initial[TOTAL_FORM_COUNT] = this.totalFormCount()
    initial[INITIAL_FORM_COUNT] = this.initialFormCount()
    initial[MIN_NUM_FORM_COUNT] = this.minNum
    initial[MAX_NUM_FORM_COUNT] = this.maxNum
    form = new ManagementForm({autoId: this.autoId,
                               prefix: this.prefix,
                               initial: initial})
  }
  if (this.managementFormCssClass !== null) {
    form.hiddenFieldRowCssClass = this.managementFormCssClass
  }
  return form
}

/**
 * Determines the number of form instances this formset contains, based on
 * either submitted management data or initial configuration, as appropriate.
 */
BaseFormSet.prototype.totalFormCount = function() {
  if (this.isBound) {
    // Return absoluteMax if it is lower than the actual total form count in
    // the data; this is DoS protection to prevent clients  from forcing the
    // server to instantiate arbitrary numbers of forms.
    return Math.min(this.managementForm().cleanedData[TOTAL_FORM_COUNT], this.absoluteMax)
  }
  else {
    var initialForms = this.initialFormCount()
    var totalForms = this.initialFormCount() + this.extra
    // Allow all existing related objects/inlines to be displayed, but don't
    // allow extra beyond max_num.
    if (this.maxNum !== null &&
        initialForms > this.maxNum &&
        this.maxNum >= 0) {
      totalForms = initialForms
    }
    if (this.maxNum !== null &&
        totalForms > this.maxNum &&
        this.maxNum >= 0) {
      totalForms = this.maxNum
    }
    return totalForms
  }
}

/**
 * Determines the number of initial form instances this formset contains, based
 * on either submitted management data or initial configuration, as appropriate.
 */
BaseFormSet.prototype.initialFormCount = function() {
  if (this.isBound) {
    return this.managementForm().cleanedData[INITIAL_FORM_COUNT]
  }
  else {
    // Use the length of the inital data if it's there, 0 otherwise.
    var initialForms = (this.initial !== null && this.initial.length > 0
                        ? this.initial.length
                        : 0)
    return initialForms
  }
}

/**
 * Instantiates forms when first accessed.
 */
BaseFormSet.prototype.forms = function() {
  if (this._forms === null) {
    this._forms = []
    var totalFormCount = this.totalFormCount()
    for (var i = 0; i < totalFormCount; i++) {
      this._forms.push(this._constructForm(i))
    }
  }
  return this._forms
}

/**
 * Instantiates and returns the ith form instance in the formset.
 */
BaseFormSet.prototype._constructForm = function(i) {
  var defaults = {
    autoId: this.autoId
  , prefix: this.addPrefix(i)
  , errorConstructor: this.errorConstructor
  }
  if (this.isBound) {
    defaults.data = this.data
    defaults.files = this.files
  }
  if (this.initial !== null && this.initial.length > 0) {
    if (typeof this.initial[i] != 'undefined') {
      defaults.initial = this.initial[i]
    }
  }
  // Allow extra forms to be empty
  if (i >= this.initialFormCount()) {
    defaults.emptyPermitted = true
  }

  var form = new this.form(defaults)
  this.addFields(form, i)
  return form
}

/**
 * Returns a list of all the initial forms in this formset.
 */
BaseFormSet.prototype.initialForms = function() {
  return this.forms().slice(0, this.initialFormCount())
}

/**
 * Returns a list of all the extra forms in this formset.
 */
BaseFormSet.prototype.extraForms = function() {
  return this.forms().slice(this.initialFormCount())
}

BaseFormSet.prototype.emptyForm = function() {
  var kwargs = {
    autoId: this.autoId,
    prefix: this.addPrefix('__prefix__'),
    emptyPermitted: true
  }
  var form = new this.form(kwargs)
  this.addFields(form, null)
  return form
}

/**
 * Returns a list of form.cleanedData objects for every form in this.forms().
 */
BaseFormSet.prototype.cleanedData = function() {
  if (!this.isValid()) {
    throw new Error(this.constructor.name +
                    " object has no attribute 'cleanedData'")
  }
  return this.forms().map(function(form) { return form.cleanedData })
}

/**
 * Returns a list of forms that have been marked for deletion.
 */
BaseFormSet.prototype.deletedForms = function() {
  if (!this.isValid() || !this.canDelete) { return [] }

  var forms = this.forms()

  // Construct _deletedFormIndexes, which is just a list of form indexes
  // that have had their deletion widget set to true.
  if (typeof this._deletedFormIndexes == 'undefined') {
    this._deletedFormIndexes = []
    for (var i = 0, l = forms.length; i < l; i++) {
      var form = forms[i]
      // If this is an extra form and hasn't changed, ignore it
      if (i >= this.initialFormCount() && !form.hasChanged()) {
        continue
      }
      if (this._shouldDeleteForm(form)) {
        this._deletedFormIndexes.push(i)
      }
    }
  }

  return this._deletedFormIndexes.map(function(i) { return forms[i] })
}

/**
 * Returns a list of forms in the order specified by the incoming data.
 * Throws an Error if ordering is not allowed.
 */
BaseFormSet.prototype.orderedForms = function() {
  if (!this.isValid() || !this.canOrder) {
    throw new Error(this.constructor.name +
                    " object has no attribute 'orderedForms'")
  }

  var forms = this.forms()

  // Construct _ordering, which is a list of [form index, orderFieldValue]
  // pairs. After constructing this list, we'll sort it by orderFieldValue
  // so we have a way to get to the form indexes in the order specified by
  // the form data.
  if (typeof this._ordering == 'undefined') {
    this._ordering = []
    for (var i = 0, l = forms.length; i < l; i++) {
      var form = forms[i]
      // If this is an extra form and hasn't changed, ignore it
      if (i >= this.initialFormCount() && !form.hasChanged()) {
        continue
      }
      // Don't add data marked for deletion
      if (this.canDelete && this._shouldDeleteForm(form)) {
        continue
      }
      this._ordering.push([i, form.cleanedData[ORDERING_FIELD_NAME]])
    }

    // Null should be sorted below anything else. Allowing null as a
    // comparison value makes it so we can leave ordering fields blank.
    this._ordering.sort(function(x, y) {
      if (x[1] === null && y[1] === null) {
        // Sort by form index if both order field values are null
        return x[0] - y[0]
      }
      if (x[1] === null) {
        return 1
      }
      if (y[1] === null) {
        return -1
      }
      return x[1] - y[1]
    })
  }

  return this._ordering.map(function(ordering) { return forms[ordering[0]]})
}

BaseFormSet.prototype.getDefaultPrefix = function() {
  return 'form'
}

/**
 * Returns an ErrorList of errors that aren't associated with a particular
 * form -- i.e., from formset.clean(). Returns an empty ErrorList if there are
 * none.
 */
BaseFormSet.prototype.nonFormErrors = function() {
  if (this._nonFormErrors === null) {
    this.fullClean()
  }
  return this._nonFormErrors
}

/**
 * Returns a list of form.errors for every form in this.forms.
 */
BaseFormSet.prototype.errors = function() {
  if (this._errors === null) {
    this.fullClean()
  }
  return this._errors
}

/**
 * Returns the number of errors across all forms in the formset.
 */
BaseFormSet.prototype.totalErrorCount = function() {
  return (this.nonFormErrors().length() +
          this.errors().reduce(function(sum, formErrors) {
            return sum + formErrors.length()
          }, 0))
}

/**
 * Returns whether or not the form was marked for deletion.
 */
BaseFormSet.prototype._shouldDeleteForm = function(form) {
  return object.get(form.cleanedData, DELETION_FIELD_NAME, false)
}

/**
 * Returns true if every form in this.forms() is valid.
 */
BaseFormSet.prototype.isValid = function() {
  if (!this.isBound) { return false }

  // We loop over every form.errors here rather than short circuiting on the
  // first failure to make sure validation gets triggered for every form.
  var formsValid = true
  // Triggers a full clean
  this.errors()
  var forms = this.forms()
  for (var i = 0, l = forms.length; i < l; i++) {
    var form = forms[i]
    if (this.canDelete && this._shouldDeleteForm(form)) {
      // This form is going to be deleted so any of its errors should
      // not cause the entire formset to be invalid.
      continue
    }
    if (!form.isValid()) {
      formsValid = false
    }
  }

  return (formsValid && !this.nonFormErrors().isPopulated())
}

/**
 * Cleans all of this.data and populates this._errors and this._nonFormErrors.
 */
BaseFormSet.prototype.fullClean = function() {
  this._errors = []
  this._nonFormErrors = new this.errorConstructor()

  if (!this.isBound) {
    return // Stop further processing
  }

  var forms = this.forms()
  for (var i = 0, l = forms.length; i < l; i++) {
    var form = forms[i]
    this._errors.push(form.errors())
  }

  try {
    var totalFormCount = this.totalFormCount()
    var deletedFormCount = this.deletedForms().length
    if ((this.validateMax && totalFormCount - deletedFormCount > this.maxNum) ||
         this.managementForm().cleanedData[TOTAL_FORM_COUNT] > this.absoluteMax) {
      throw ValidationError('Please submit ' + this.maxNum + ' or fewer forms.',
                            {code: 'tooManyForms'})
    }
    if (this.validateMin && totalFormCount - deletedFormCount < this.minNum) {
      throw ValidationError('Please submit ' + this.minNum + ' or more forms.',
                            {code: 'tooFewForms'})
    }
    // Give this.clean() a chance to do cross-form validation.
    this.clean()
  }
  catch (e) {
    if (!(e instanceof ValidationError)) { throw e }
    this._nonFormErrors = new this.errorConstructor(e.messages())
  }
}

/**
 * Hook for doing any extra formset-wide cleaning after Form.clean() has been
 * called on every form. Any ValidationError raised by this method will not be
 * associated with a particular form; it will be accesible via
 * formset.nonFormErrors()
 */
BaseFormSet.prototype.clean = function() {}

/**
 * Returns true if any form differs from initial.
 */
BaseFormSet.prototype.hasChanged = function() {
  var forms = this.forms()
  for (var i = 0, l = forms.length; i < l; i++) {
    if (forms[i].hasChanged()) {
      return true
    }
  }
  return false
}

/**
 * A hook for adding extra fields on to each form instance.
 * @param {Form} form the form fields are to be added to.
 * @param {Number} index the index of the given form in the formset.
 */
BaseFormSet.prototype.addFields = function(form, index) {
  if (this.canOrder) {
    // Only pre-fill the ordering field for initial forms
    if (index != null && index < this.initialFormCount()) {
      form.fields[ORDERING_FIELD_NAME] =
          IntegerField({label: 'Order', initial: index + 1,
                        required: false})
    }
    else {
      form.fields[ORDERING_FIELD_NAME] =
          IntegerField({label: 'Order', required: false})
    }
  }
  if (this.canDelete) {
    form.fields[DELETION_FIELD_NAME] =
        BooleanField({label: 'Delete', required: false})
  }
}

/**
 * Returns the formset prefix with the form index appended.
 * @param {Number} index the index of a form in the formset.
 */
BaseFormSet.prototype.addPrefix = function(index) {
  return this.prefix + '-' + index
}

/**
 * Returns true if the formset needs to be multipart-encoded, i.e. it has a
 * FileInput. Otherwise, false.
 */
BaseFormSet.prototype.isMultipart = function() {
  return (this.forms().length > 0 && this.forms()[0].isMultipart())
}

BaseFormSet.prototype.render = function() {
  return this.asTable()
}

/**
 * Returns this formset rendered as HTML <tr>s - excluding the <table>.
 */
BaseFormSet.prototype.asTable = function() {
  // XXX: there is no semantic division between forms here, there probably
  // should be. It might make sense to render each form as a table row with
  // each field as a td.
  var rows = this.managementForm().asTable()
  this.forms().forEach(function(form) { rows = rows.concat(form.asTable()) })
  return rows
}

BaseFormSet.prototype.asDiv = function() {
  var rows = this.managementForm().asDiv()
  this.forms().forEach(function(form) { rows = rows.concat(form.asDiv()) })
  return rows
}

BaseFormSet.prototype.asUl = function() {
  var rows = this.managementForm().asUl()
  this.forms().forEach(function(form) { rows = rows.concat(form.asUl()) })
  return rows
}

/**
 * Creates a FormSet constructor for the given Form constructor.
 * @param {Form} form
 * @param {Object=} kwargs
 */
function formsetFactory(form, kwargs) {
  kwargs = object.extend({
    formset: BaseFormSet, extra: 1, canOrder: false, canDelete: false,
    maxNum: DEFAULT_MAX_NUM, validateMax: false,
    minNum: DEFAULT_MIN_NUM, validateMin: false
  }, kwargs)

  // Remove special properties from kwargs, as it will subsequently be used to
  // add properties to the new formset's prototype.
  var formset = object.pop(kwargs, 'formset')
  var extra = object.pop(kwargs, 'extra')
  var canOrder = object.pop(kwargs, 'canOrder')
  var canDelete = object.pop(kwargs, 'canDelete')
  var maxNum = object.pop(kwargs, 'maxNum')
  var validateMax = object.pop(kwargs, 'validateMax')
  var minNum = object.pop(kwargs, 'minNum')
  var validateMin = object.pop(kwargs, 'validateMin')

  // Hard limit on forms instantiated, to prevent memory-exhaustion attacks
  // limit is simply maxNum + DEFAULT_MAX_NUM (which is 2 * DEFAULT_MAX_NUM
  // if maxNum is not provided in the first place)
  var absoluteMax = maxNum + DEFAULT_MAX_NUM
  extra += minNum

  kwargs.constructor = function(kwargs) {
    this.form = form
    this.extra = extra
    this.canOrder = canOrder
    this.canDelete = canDelete
    this.maxNum = maxNum
    this.validateMax = validateMax
    this.minNum = minNum
    this.validateMin = validateMin
    this.absoluteMax = absoluteMax
    formset.call(this, kwargs)
  }

  var formsetConstructor = formset.extend(kwargs)

  return formsetConstructor
}

/**
 * Returns true if every formset in formsets is valid.
 */
function allValid(formsets) {
  var valid = true
  for (var i = 0, l = formsets.length; i < l; i++) {
    if (!formsets[i].isValid()) {
        valid = false
    }
  }
  return valid
}

module.exports = {
  DEFAULT_MAX_NUM: DEFAULT_MAX_NUM
, BaseFormSet: BaseFormSet
, formsetFactory: formsetFactory
, allValid: allValid
}

},{"./fields":2,"./forms":3,"./util":6,"./widgets":7,"Concur":8,"isomorph/object":13,"validators":18}],5:[function(require,module,exports){
'use strict';

var object = require('isomorph/object')
var validators = require('validators')

var env = require('./env')
var util = require('./util')
var widgets = require('./widgets')
var fields = require('./fields')
var forms = require('./forms')
var formsets = require('./formsets')

object.extend(
  module.exports
, { env: env
  , ValidationError: validators.ValidationError
  , ErrorObject: util.ErrorObject
  , ErrorList: util.ErrorList
  , formData: util.formData
  , util: {
      formatToArray: util.formatToArray
    , prettyName: util.prettyName
    }
  , validators: validators
  }
, widgets
, fields
, forms
, formsets
)

},{"./env":1,"./fields":2,"./forms":3,"./formsets":4,"./util":6,"./widgets":7,"isomorph/object":13,"validators":18}],6:[function(require,module,exports){
'use strict';

var Concur = require('Concur')
var is = require('isomorph/is')
var object = require('isomorph/object')
var validators = require('validators')

var ValidationError = validators.ValidationError

var DEFAULT_DATE_INPUT_FORMATS = [
  '%Y-%m-%d'              // '2006-10-25'
, '%m/%d/%Y', '%m/%d/%y'  // '10/25/2006', '10/25/06'
, '%b %d %Y', '%b %d, %Y' // 'Oct 25 2006', 'Oct 25, 2006'
, '%d %b %Y', '%d %b, %Y' // '25 Oct 2006', '25 Oct, 2006'
, '%B %d %Y', '%B %d, %Y' // 'October 25 2006', 'October 25, 2006'
, '%d %B %Y', '%d %B, %Y' // '25 October 2006', '25 October, 2006'
]

var DEFAULT_TIME_INPUT_FORMATS = [
  '%H:%M:%S' // '14:30:59'
, '%H:%M'    // '14:30'
]

var DEFAULT_DATETIME_INPUT_FORMATS = [
  '%Y-%m-%d %H:%M:%S' // '2006-10-25 14:30:59'
, '%Y-%m-%d %H:%M'    // '2006-10-25 14:30'
, '%Y-%m-%d'          // '2006-10-25'
, '%m/%d/%Y %H:%M:%S' // '10/25/2006 14:30:59'
, '%m/%d/%Y %H:%M'    // '10/25/2006 14:30'
, '%m/%d/%Y'          // '10/25/2006'
, '%m/%d/%y %H:%M:%S' // '10/25/06 14:30:59'
, '%m/%d/%y %H:%M'    // '10/25/06 14:30'
, '%m/%d/%y'          // '10/25/06'
]

/**
 * Allows an Array, an object with an __iter__ method or a function which
 * returns either be used when ultimately expecting an Array.
 */
function iterate(o) {
  if (is.Array(o)) {
    return o
  }
  if (is.Function(o)) {
    o = o()
  }
  if (o != null && is.Function(o.__iter__)) {
    o = o.__iter__()
  }
  return o || []
}

/**
 * Replaces String {placeholders} with properties of a given object, but
 * interpolates into and returns an Array instead of a String.
 * By default, any resulting empty strings are stripped out of the Array. To
 * disable this, pass an options object with a 'strip' property which is false.
 */
function formatToArray(str, obj, options) {
  var parts = str.split(/\{(\w+)\}/g)
  for (var i = 1, l = parts.length; i < l; i += 2) {
    parts[i] = (object.hasOwn(obj, parts[i])
                ? obj[parts[i]]
                : '{' + parts[i] + '}')
  }
  if (!options || (options && options.strip !== false)) {
    parts = parts.filter(function(p) { return p !== ''})
  }
  return parts
}

/**
 * Converts 'firstName' and 'first_name' to 'First name', and
 * 'SHOUTING_LIKE_THIS' to 'SHOUTING LIKE THIS'.
 */
var prettyName = (function() {
  var capsRE = /([A-Z]+)/g
  var splitRE = /[ _]+/
  var allCapsRE = /^[A-Z][A-Z0-9]+$/

  return function(name) {
    // Prefix sequences of caps with spaces and split on all space
    // characters.
    var parts = name.replace(capsRE, ' $1').split(splitRE)

    // If we had an initial cap...
    if (parts[0] === '') {
      parts.splice(0, 1)
    }

    // Give the first word an initial cap and all subsequent words an
    // initial lowercase if not all caps.
    for (var i = 0, l = parts.length; i < l; i++) {
      if (i === 0) {
        parts[0] = parts[0].charAt(0).toUpperCase() +
                   parts[0].substr(1)
      }
      else if (!allCapsRE.test(parts[i])) {
        parts[i] = parts[i].charAt(0).toLowerCase() +
                   parts[i].substr(1)
      }
    }

    return parts.join(' ')
  }
})()

/**
 * Creates an object representing the data held in a form's elements.
 * @param {HTMLFormElement|string} form a form DOM element or a String
 *   specifying a form's id or name attribute. If a String is given, id is tried
 *   before name when attempting to find the form in the DOM. An error will be
 *   thrown if the form could not be found.
 * @return an object representing the data present in the form.
 */
function formData(form) {
  var data = {}
  if (is.String(form)) {
    form = document.getElementById(form) || document.forms[form]
  }
  if (!form) {
    throw new Error("formData couldn't find a form with '" + form + "'")
  }

  for (var i = 0, l = form.elements.length; i < l; i++) {
    var element = form.elements[i]
    var type = element.type
    var value = null

    // Retrieve the element's value (or values)
    if (type == 'hidden' || type == 'password' || type == 'text' ||
        type == 'email' || type == 'url' || type == 'number' || type == 'file' ||
        type == 'textarea' || ((type == 'checkbox' ||
                                type == 'radio') && element.checked)) {
      value = element.value
    }
    else if (type == 'select-one') {
      if (element.options.length) {
        value = element.options[element.selectedIndex].value
      }
    }
    else if (type == 'select-multiple') {
      value = []
      for (var j = 0, m = element.options.length; j < m; j++) {
        if (element.options[j].selected) {
          value.push(element.options[j].value)
        }
      }
      if (value.length === 0) {
        value = null
      }
    }

    // Add any value obtained to the data object
    if (value !== null) {
      if (object.hasOwn(data, element.name)) {
        if (is.Array(data[element.name])) {
          data[element.name] = data[element.name].concat(value)
        }
        else {
          data[element.name] = [data[element.name], value]
        }
      }
      else {
        data[element.name] = value
      }
    }
  }

  return data
}

/**
 * Coerces to string and strips leading and trailing spaces.
 */
var strip = function() {
  var stripRE =/(^\s+|\s+$)/g
  return function strip(s) {
    return (''+s).replace(stripRE, '')
  }
}()

/**
 * A collection of field errors that knows how to display itself in various
 * formats. This object's .error properties are the field names and
 * corresponding values are the errors.
 * @constructor
 */
var ErrorObject = Concur.extend({
  constructor: function ErrorObject(errors) {
    if (!(this instanceof ErrorObject)) { return new ErrorObject(errors) }
    this.errors = errors || {}
  }
})

ErrorObject.prototype.set = function(field, error) {
  this.errors[field] = error
}

ErrorObject.prototype.get = function(field) {
  return this.errors[field]
}

ErrorObject.prototype.hasField = function(field) {
  return object.hasOwn(this.errors, field)
}

ErrorObject.prototype.length = function() {
  return Object.keys(this.errors).length
}

/**
 * Determines if any errors are present.
 */
ErrorObject.prototype.isPopulated = function() {
  return (this.length() > 0)
}

/**
 * Default display is as a list.
 */
ErrorObject.prototype.render = function() {
  return this.asUl()
}

/**
 * Displays error details as a list.
 */
ErrorObject.prototype.asUl = function() {
  var items = Object.keys(this.errors).map(function(field) {
    return React.DOM.li(null, field, this.errors[field].asUl())
  }.bind(this))
  if (items.length === 0) { return '' }
  return React.DOM.ul({className: 'errorlist'}, items)
}

/**
 * Displays error details as text.
 */
ErrorObject.prototype.asText = ErrorObject.prototype.toString = function() {
  return Object.keys(this.errors).map(function(field) {
    var mesages = this.errors[field].messages()
    return ['* ' + field].concat(mesages.map(function(message) {
      return ('  * ' + message)
    })).join('\n')
  }.bind(this)).join('\n')
}

ErrorObject.prototype.asData = function() {
  var data = {}
  Object.keys(this.errors).map(function(field) {
    data[field] = this.errors[field].asData()
  }.bind(this))
  return data
}

ErrorObject.prototype.toJSON = function() {
  var jsonObj = {}
  Object.keys(this.errors).map(function(field) {
    jsonObj[field] = this.errors[field].toJSON()
  }.bind(this))
  return jsonObj
}

/**
 * A list of errors which knows how to display itself in various formats.
 * @param {Array=} list a list of errors.
 * @constructor
 */
var ErrorList = Concur.extend({
  constructor: function ErrorList(list) {
    if (!(this instanceof ErrorList)) { return new ErrorList(list) }
    this.data = list || []
  }
})

/**
 * Adds more errors.
 * @param {Array} errorList a list of errors
 */
ErrorList.prototype.extend = function(errorList) {
  this.data.push.apply(this.data, errorList)
}

ErrorList.prototype.length = function() {
  return this.data.length
}

/**
 * Determines if any errors are present.
 */
ErrorList.prototype.isPopulated = function() {
  return (this.length() > 0)
}

/**
 * Returns the list of messages held in this ErrorList.
 */
ErrorList.prototype.messages = function() {
  var messages = []
  for (var i = 0, l = this.data.length; i < l; i++) {
    var error = this.data[i]
    if (error instanceof ValidationError) {
      error = error.messages()[0]
    }
    messages.push(error)
  }
  return messages
}

/**
 *  Default display is as a list.
 */
ErrorList.prototype.render = function() {
  return this.asUl()
}

/**
 * Displays errors as a list.
 */
ErrorList.prototype.asUl = function() {
  if (!this.isPopulated()) {
    return ''
  }
  return React.DOM.ul({className: 'errorlist'}
  , this.messages().map(function(error) {
      return React.DOM.li(null, error)
    })
  )
}

/**
 * Displays errors as text.
 */
ErrorList.prototype.asText = ErrorList.prototype.toString =function() {
  return this.messages().map(function(error) {
    return '* ' + error
  }).join('\n')
}

ErrorList.prototype.asData = function() {
  return this.data
}

ErrorList.prototype.toJSON = function() {
  return ValidationError(this.data).errorList.map(function(error) {
    return {
      message: error.messages()[0]
    , code: error.code || ''
    }
  })
}

module.exports = {
  DEFAULT_DATE_INPUT_FORMATS: DEFAULT_DATE_INPUT_FORMATS
, DEFAULT_TIME_INPUT_FORMATS: DEFAULT_TIME_INPUT_FORMATS
, DEFAULT_DATETIME_INPUT_FORMATS: DEFAULT_DATETIME_INPUT_FORMATS
, ErrorObject: ErrorObject
, ErrorList: ErrorList
, formData: formData
, iterate: iterate
, formatToArray: formatToArray
, prettyName: prettyName
, strip: strip
}

},{"Concur":8,"isomorph/is":12,"isomorph/object":13,"validators":18}],7:[function(require,module,exports){
'use strict';

var Concur = require('Concur')
var is = require('isomorph/is')
var format = require('isomorph/format').formatObj
var object = require('isomorph/object')
var time = require('isomorph/time')

var env = require('./env')
var util = require('./util')

/**
 * Some widgets are made of multiple HTML elements -- namely, RadioSelect.
 * This represents the "inner" HTML element of a widget.
 */
var SubWidget = Concur.extend({
  constructor: function SubWidget(parentWidget, name, value, kwargs) {
    if (!(this instanceof SubWidget)) {
      return new SubWidget(parentWidget, name, value, kwargs)
    }
    this.parentWidget = parentWidget
    this.name = name
    this.value = value
    kwargs = object.extend({attrs: null, choices: []}, kwargs)
    this.attrs = kwargs.attrs
    this.choices = kwargs.choices
  }
})

SubWidget.prototype.render = function() {
  var kwargs = {attrs: this.attrs}
  if (this.choices.length) {
    kwargs.choices = this.choices
  }
  return this.parentWidget.render(this.name, this.value, kwargs)
}

/**
 * An HTML form widget.
 * @constructor
 * @param {Object=} kwargs
 */
var Widget = Concur.extend({
  constructor: function Widget(kwargs) {
    kwargs = object.extend({attrs: null}, kwargs)
    this.attrs = object.extend({}, kwargs.attrs)
  }
  /** Determines whether this corresponds to an <input type="hidden">. */
, isHidden: false
  /** Determines whether this widget needs a multipart-encoded form. */
, needsMultipartForm: false
  /** Determines whether this widget is for a required field.. */
, isRequired: false
})

/**
 * Yields all "subwidgets" of this widget. Used only by RadioSelect to
 * allow access to individual <input type="radio"> buttons.
 *
 * Arguments are the same as for render().
 */
Widget.prototype.subWidgets = function(name, value, kwargs) {
  return [SubWidget(this, name, value, kwargs)]
}

/**
 * Returns this Widget rendered as HTML.
 *
 * The value given is not guaranteed to be valid input, so subclass
 * implementations should program defensively.
 *
 * @abstract
 */
Widget.prototype.render = function(name, value, kwargs) {
  throw new Error('Constructors extending must implement a render() method.')
}

/**
 * Helper function for building an HTML attributes object.
 */
Widget.prototype.buildAttrs = function(extraAttrs, kwargs) {
  var attrs = object.extend({}, this.attrs, kwargs, extraAttrs)
  attrs.ref = attrs.id
  return attrs
}

/**
 * Retrieves a value for this widget from the given data.
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {String} name the field name to be used to retrieve data.
 * @return a value for this widget, or null if no value was provided.
 */
Widget.prototype.valueFromData = function(data, files, name) {
  return object.get(data, name, null)
}

/**
 * Determines the HTML id attribute of this Widget for use by a
 * <label>, given the id of the field.
 *
 * This hook is necessary because some widgets have multiple HTML elements and,
 * thus, multiple ids. In that case, this method should return an ID value that
 * corresponds to the first id in the widget's tags.
 *
 * @param {String} id a field id.
 * @return the id which should be used by a <label>> for this Widget.
 */
Widget.prototype.idForLabel = function(id) {
  return id
}

/**
 * An HTML <input> widget.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var Input = Widget.extend({
  constructor: function Input(kwargs) {
    if (!(this instanceof Widget)) { return new Input(kwargs) }
    Widget.call(this, kwargs)
  }
  /** The type attribute of this input - subclasses must define it. */
, inputType: null
})

Input.prototype._formatValue = function(value) {
  return value
}

Input.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  if (value === null) {
    value = ''
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: this.inputType,
                                                  name: name})
  if (value !== '') {
    // Only add the value attribute if value is non-empty
    finalAttrs.defaultValue = ''+this._formatValue(value)
  }
  return React.DOM.input(finalAttrs)
}

/**
 * An HTML <input type="text"> widget.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var TextInput = Input.extend({
  constructor: function TextInput(kwargs) {
    if (!(this instanceof Widget)) { return new TextInput(kwargs) }
    kwargs = object.extend({attrs: null}, kwargs)
    if (kwargs.attrs != null) {
      this.inputType = object.pop(kwargs.attrs, 'type', this.inputType)
    }
    Input.call(this, kwargs)
  }
, inputType: 'text'
})

/**
 * An HTML <input type="number"> widget.
 * @constructor
 * @extends {TextInput}
 * @param {Object=} kwargs
 */
var NumberInput = TextInput.extend({
  constructor: function NumberInput(kwargs) {
    if (!(this instanceof Widget)) { return new NumberInput(kwargs) }
    TextInput.call(this, kwargs)
  }
, inputType: 'number'
})

/**
 * An HTML <input type="email"> widget.
 * @constructor
 * @extends {TextInput}
 * @param {Object=} kwargs
 */
var EmailInput = TextInput.extend({
  constructor: function EmailInput(kwargs) {
    if (!(this instanceof Widget)) { return new EmailInput(kwargs) }
    TextInput.call(this, kwargs)
  }
, inputType: 'email'
})

/**
 * An HTML <input type="url"> widget.
 * @constructor
 * @extends {TextInput}
 * @param {Object=} kwargs
 */
var URLInput = TextInput.extend({
  constructor: function URLInput(kwargs) {
    if (!(this instanceof Widget)) { return new URLInput(kwargs) }
    TextInput.call(this, kwargs)
  }
, inputType: 'url'
})

/**
 * An HTML <input type="password"> widget.
 * @constructor
 * @extends {TextInput}
 * @param {Object=} kwargs
 */
var PasswordInput = TextInput.extend({
  constructor: function PasswordInput(kwargs) {
    if (!(this instanceof Widget)) { return new PasswordInput(kwargs) }
    kwargs = object.extend({renderValue: false}, kwargs)
    TextInput.call(this, kwargs)
    this.renderValue = kwargs.renderValue
  }
, inputType: 'password'
})

PasswordInput.prototype.render = function(name, value, kwargs) {
  if (!this.renderValue) {
    value = ''
  }
  return TextInput.prototype.render.call(this, name, value, kwargs)
}

/**
 * An HTML <input type="hidden"> widget.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var HiddenInput = Input.extend({
  constructor: function HiddenInput(kwargs) {
    if (!(this instanceof Widget)) { return new HiddenInput(kwargs) }
    Input.call(this, kwargs)
  }
, inputType: 'hidden'
, isHidden: true
})

/**
 * A widget that handles <input type="hidden"> for fields that have a list of
 * values.
 * @constructor
 * @extends {HiddenInput}
 * @param {Object=} kwargs
 */
var MultipleHiddenInput = HiddenInput.extend({
  constructor: function MultipleHiddenInput(kwargs) {
    if (!(this instanceof Widget)) { return new MultipleHiddenInput(kwargs) }
    HiddenInput.call(this, kwargs)
  }
})

MultipleHiddenInput.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  if (value === null) {
    value = []
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: this.inputType,
                                                  name: name})
  var id = object.get(finalAttrs, 'id', null)
  var inputs = []
  for (var i = 0, l = value.length; i < l; i++) {
    var inputAttrs = object.extend({}, finalAttrs, {value: value[i]})
    if (id) {
      // An ID attribute was given. Add a numeric index as a suffix
      // so that the inputs don't all have the same ID attribute.
      inputAttrs.id = format('{id}_{i}', {id: id, i: i})
    }
    inputs.push(React.DOM.input(inputAttrs))
  }
  return React.DOM.div(null, inputs)
}

MultipleHiddenInput.prototype.valueFromData = function(data, files, name) {
  if (typeof data[name] != 'undefined') {
    return [].concat(data[name])
  }
  return null
}

/**
 * An HTML <input type="file"> widget.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var FileInput = Input.extend({
  constructor: function FileInput(kwargs) {
    if (!(this instanceof Widget)) { return new FileInput(kwargs) }
    Input.call(this, kwargs)
  }
, inputType: 'file'
, needsMultipartForm: true
})

FileInput.prototype.render = function(name, value, kwargs) {
  return Input.prototype.render.call(this, name, null, kwargs)
}

/**
 * File widgets take data from file wrappers on the server. On the client, they
 * take it from data so the presence of a .value can be validated when required.
 */
FileInput.prototype.valueFromData = function(data, files, name) {
  return object.get(env.browser ? data : files, name, null)
}

var FILE_INPUT_CONTRADICTION = {}

/**
 * @constructor
 * @extends {FileInput}
 * @param {Object=} kwargs
 */
var ClearableFileInput = FileInput.extend({
  constructor: function ClearableFileInput(kwargs) {
    if (!(this instanceof Widget)) { return new ClearableFileInput(kwargs) }
    FileInput.call(this, kwargs)
  }
, initialText: 'Currently'
, inputText: 'Change'
, clearCheckboxLabel: 'Clear'
, templateWithInitial: function(params) {
    return util.formatToArray(
      '{initialText}: {initial} {clearTemplate}{br}{inputText}: {input}'
    , object.extend(params, {br: React.DOM.br(null)})
    )
  }
, templateWithClear: function(params) {
    return util.formatToArray(
      '{checkbox} {label}'
    , object.extend(params, {
        label: React.DOM.label({htmlFor: params.checkboxId}, params.label)
      })
    )
  }
, urlMarkupTemplate: function(href, name) {
    return React.DOM.a({href: href}, name)
  }
})

/**
 * Given the name of the file input, return the name of the clear checkbox
 * input.
 */
ClearableFileInput.prototype.clearCheckboxName = function(name) {
  return name + '-clear'
}

/**
 * Given the name of the clear checkbox input, return the HTML id for it.
 */
ClearableFileInput.prototype.clearCheckboxId = function(name) {
  return name + '_id'
}

ClearableFileInput.prototype.render = function(name, value, kwargs) {
  var input = FileInput.prototype.render.call(this, name, value, kwargs)
  if (value && typeof value.url != 'undefined') {
    var clearTemplate
    if (!this.isRequired) {
      var clearCheckboxName = this.clearCheckboxName(name)
      var clearCheckboxId = this.clearCheckboxId(clearCheckboxName)
      clearTemplate = this.templateWithClear({
        checkbox: CheckboxInput().render(clearCheckboxName, false, {attrs: {'id': clearCheckboxId}})
      , checkboxId: clearCheckboxId
      , label: this.clearCheckboxLabel
      })
    }
    var contents = this.templateWithInitial({
      initialText: this.initialText
    , initial: this.urlMarkupTemplate(value.url, ''+value)
    , clearTemplate: clearTemplate
    , inputText: this.inputText
    , input: input
    })
    return React.DOM.div.apply(React.DOM, [null].concat(contents))
  }
  else {
    return input
  }
}

ClearableFileInput.prototype.valueFromData = function(data, files, name) {
  var upload = FileInput.prototype.valueFromData(data, files, name)
  if (!this.isRequired &&
      CheckboxInput.prototype.valueFromData.call(this, data, files,
                                                 this.clearCheckboxName(name))) {
    if (upload) {
      // If the user contradicts themselves (uploads a new file AND
      // checks the "clear" checkbox), we return a unique marker
      // object that FileField will turn into a ValidationError.
      return FILE_INPUT_CONTRADICTION
    }
    // false signals to clear any existing value, as opposed to just null
    return false
  }
  return upload
}

/**
 * An HTML <textarea> widget.
 * @param {Object} [kwargs] configuration options
 * @config {Object} [attrs] HTML attributes for the rendered widget. Default
 *   rows and cols attributes will be used if not provided.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var Textarea = Widget.extend({
  constructor: function Textarea(kwargs) {
    if (!(this instanceof Widget)) { return new Textarea(kwargs) }
    // Ensure we have something in attrs
    kwargs = object.extend({attrs: null}, kwargs)
    // Provide default 'cols' and 'rows' attributes
    kwargs.attrs = object.extend({rows: '10', cols: '40'}, kwargs.attrs)
    Widget.call(this, kwargs)
  }
})

Textarea.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  if (value === null) {
    value = ''
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name, defaultValue: value})
  return React.DOM.textarea(finalAttrs)
}

/**
 * A <input type="text"> which, if given a Date object to display, formats it as
 * an appropriate date/time String.
 * @constructor
 * @extends {TextInput}
 * @param {Object=} kwargs
 */
var DateTimeBaseInput = TextInput.extend({
  constructor: function DateTimeBaseInput(kwargs) {
    kwargs = object.extend({format: null}, kwargs)
    TextInput.call(this, kwargs)
    this.format = (kwargs.format !== null ? kwargs.format : this.defaultFormat)
  }
})

DateTimeBaseInput.prototype._formatValue = function(value) {
  if (is.Date(value)) {
    return time.strftime(value, this.format)
  }
  return value
}

/**
 * @constructor
 * @extends {DateTimeBaseInput}
 * @param {Object=} kwargs
 */
var DateInput = DateTimeBaseInput.extend({
  constructor: function DateInput(kwargs) {
    if (!(this instanceof DateInput)) { return new DateInput(kwargs) }
    DateTimeBaseInput.call(this, kwargs)
  }
, defaultFormat: util.DEFAULT_DATE_INPUT_FORMATS[0]
})

/**
 * @constructor
 * @extends {DateTimeBaseInput}
 * @param {Object=} kwargs
 */
var DateTimeInput = DateTimeBaseInput.extend({
  constructor: function DateTimeInput(kwargs) {
    if (!(this instanceof DateTimeInput)) { return new DateTimeInput(kwargs) }
    DateTimeBaseInput.call(this, kwargs)
  }
, defaultFormat: util.DEFAULT_DATETIME_INPUT_FORMATS[0]
})

/**
 * @constructor
 * @extends {DateTimeBaseInput}
 * @param {Object=} kwargs
 */
var TimeInput = DateTimeBaseInput.extend({
  constructor: function TimeInput(kwargs) {
    if (!(this instanceof TimeInput)) { return new TimeInput(kwargs) }
    DateTimeBaseInput.call(this, kwargs)
  }
, defaultFormat: util.DEFAULT_TIME_INPUT_FORMATS[0]
})

var defaultCheckTest = function(value) {
  return (value !== false &&
          value !== null &&
          value !== '')
}

/**
 * An HTML <input type="checkbox"> widget.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var CheckboxInput = Widget.extend({
  constructor: function CheckboxInput(kwargs) {
    if (!(this instanceof Widget)) { return new CheckboxInput(kwargs) }
    kwargs = object.extend({checkTest: defaultCheckTest}, kwargs)
    Widget.call(this, kwargs)
    this.checkTest = kwargs.checkTest
  }
})

CheckboxInput.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  var checked = this.checkTest(value)
  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: 'checkbox',
                                                  name: name})
  if (value !== '' && value !== true && value !== false && value !== null &&
      value !== undefined) {
    // Only add the value attribute if value is non-empty
    finalAttrs.value = value
  }
  if (checked) {
    finalAttrs.defaultChecked = 'checked'
  }
  return React.DOM.input(finalAttrs)
}

CheckboxInput.prototype.valueFromData = function(data, files, name) {
  if (typeof data[name] == 'undefined') {
    //  A missing value means False because HTML form submission does not
    // send results for unselected checkboxes.
    return false
  }
  var value = data[name]
  var values = {'true': true, 'false': false}
  // Translate true and false strings to boolean values
  if (is.String(value)) {
    value = object.get(values, value.toLowerCase(), value)
  }
  return !!value
}

/**
 * An HTML <select> widget.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var Select = Widget.extend({
  constructor: function Select(kwargs) {
    if (!(this instanceof Widget)) { return new Select(kwargs) }
    kwargs = object.extend({choices: []}, kwargs)
    Widget.call(this, kwargs)
    this.choices = kwargs.choices || []
  }
, allowMultipleSelected: false
})

/**
 * Renders the widget.
 * @param {String} name the field name.
 * @param selectedValue the value of an option which should be marked as
 *   selected, or null if no value is selected -- will be normalised to a String
 *   for comparison with choice values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 * @param {Array} [choices] choices to be used when rendering the widget, in
 *   addition to those already held by the widget itself.
 * @return a <select> element.
 */
Select.prototype.render = function(name, selectedValue, kwargs) {
  kwargs = object.extend({attrs: null, choices: []}, kwargs)
  if (selectedValue === null) {
    selectedValue = ''
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name})
  var options = this.renderOptions(kwargs.choices, [selectedValue])
  return React.DOM.select(finalAttrs, options)
}

Select.prototype.renderOptions = function(choices, selectedValues) {
  // Normalise to strings
  var selectedValuesLookup = {}
  // We don't duck type passing of a String, as index access to characters isn't
  // part of the spec.
  var selectedValueString = (is.String(selectedValues))
  var i, l
  for (i = 0, l = selectedValues.length; i < l; i++) {
    selectedValuesLookup[''+(selectedValueString ?
                             selectedValues.charAt(i) :
                             selectedValues[i])] = true
  }

  var options = []
  var finalChoices = util.iterate(this.choices).concat(choices || [])
  for (i = 0, l = finalChoices.length; i < l; i++) {
    if (is.Array(finalChoices[i][1])) {
      var optgroupOptions = []
      var optgroupChoices = finalChoices[i][1]
      for (var j = 0, k = optgroupChoices.length; j < k; j++) {
        optgroupOptions.push(this.renderOption(selectedValuesLookup,
                                               optgroupChoices[j][0],
                                               optgroupChoices[j][1]))
      }
      options.push(React.DOM.optgroup({label: finalChoices[i][0]}, optgroupOptions))
    }
    else {
      options.push(this.renderOption(selectedValuesLookup,
                                     finalChoices[i][0],
                                     finalChoices[i][1]))
    }
  }
  return options
}

Select.prototype.renderOption = function(selectedValuesLookup, optValue,
                                         optLabel) {
  optValue = ''+optValue
  var attrs = {value: optValue}
  if (typeof selectedValuesLookup[optValue] != 'undefined') {
    attrs['selected'] = 'selected'
    if (!this.allowMultipleSelected) {
      // Only allow for a single selection with this value
      delete selectedValuesLookup[optValue]
    }
  }
  return React.DOM.option(attrs, optLabel)
}

/**
 * A <select> widget intended to be used with NullBooleanField.
 * @constructor
 * @extends {Select}
 * @param {Object=} kwargs
 */
var NullBooleanSelect = Select.extend({
  constructor: function NullBooleanSelect(kwargs) {
    if (!(this instanceof Widget)) { return new NullBooleanSelect(kwargs) }
    kwargs = kwargs || {}
    // Set or overrride choices
    kwargs.choices = [['1', 'Unknown'], ['2', 'Yes'], ['3', 'No']]
    Select.call(this, kwargs)
  }
})

NullBooleanSelect.prototype.render = function(name, value, kwargs) {
  if (value === true || value == '2') {
    value = '2'
  }
  else if (value === false || value == '3') {
    value = '3'
  }
  else {
    value = '1'
  }
  return Select.prototype.render.call(this, name, value, kwargs)
}

NullBooleanSelect.prototype.valueFromData = function(data, files, name) {
  var value = null
  if (typeof data[name] != 'undefined') {
    var dataValue = data[name]
    if (dataValue === true || dataValue == 'True' || dataValue == 'true' ||
        dataValue == '2') {
      value = true
    }
    else if (dataValue === false || dataValue == 'False' ||
             dataValue == 'false' || dataValue == '3') {
      value = false
    }
  }
  return value
}

/**
 * An HTML <select> widget which allows multiple selections.
 * @constructor
 * @extends {Select}
 * @param {Object=} kwargs
 */
var SelectMultiple = Select.extend({
  constructor: function SelectMultiple(kwargs) {
    if (!(this instanceof Widget)) { return new SelectMultiple(kwargs) }
    Select.call(this, kwargs)
  }
, allowMultipleSelected: true
})

/**
 * Renders the widget.
 * @param {String} name the field name.
 * @param {Array} selectedValues the values of options which should be marked as
 *   selected, or null if no values are selected - these will be normalised to
 *   Strings for comparison with choice values.
 * @param {Object} [kwargs] additional rendering options.
 * @config {Object} [attrs] additional HTML attributes for the rendered widget.
 * @config {Array} [choices] choices to be used when rendering the widget, in
 *   addition to those already held by the widget itself.
 * @return a <select> element which allows multiple selections.
 */
SelectMultiple.prototype.render = function(name, selectedValues, kwargs) {
  kwargs = object.extend({attrs: null, choices: []}, kwargs)
  if (selectedValues === null) {
    selectedValues = []
  }
  if (!is.Array(selectedValues)) {
    // TODO Output warning in development
    selectedValues = [selectedValues]
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name,
                                                  multiple: 'multiple',
                                                  defaultValue: selectedValues})
  var options = this.renderOptions(kwargs.choices, selectedValues)
  return React.DOM.select(finalAttrs, options)
}

/**
 * Retrieves values for this widget from the given data.
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {String} name the field name to be used to retrieve data.
 * @return {Array} values for this widget, or null if no values were provided.
 */
SelectMultiple.prototype.valueFromData = function(data, files, name) {
  if (typeof data[name] != 'undefined') {
    return [].concat(data[name])
  }
  return null
}

/**
 * An object used by ChoiceFieldRenderer that represents a single
 * <input>.
 */
var ChoiceInput = SubWidget.extend({
  constructor: function ChoiceInput(name, value, attrs, choice, index) {
    this.name = name
    this.value = value
    this.attrs = attrs
    this.choiceValue = ''+choice[0]
    this.choiceLabel = ''+choice[1]
    this.index = index
    if (typeof this.attrs.id != 'undefined') {
      this.attrs.id += '_' + this.index
    }
  }
, inputType: null // Subclasses must define this
})

/**
 * Renders a <label> enclosing the widget and its label text.
 */
ChoiceInput.prototype.render = function() {
  var labelAttrs = {}
  if (this.idForLabel()) {
    labelAttrs.htmlFor = this.idForLabel()
  }
  return React.DOM.label(labelAttrs, this.tag(), ' ', this.choiceLabel)
}

ChoiceInput.prototype.isChecked = function() {
  return this.value === this.choiceValue
}

/**
 * Renders the <input> portion of the widget.
 */
ChoiceInput.prototype.tag = function() {
  var finalAttrs = object.extend({}, this.attrs, {
    type: this.inputType, name: this.name, value: this.choiceValue
  })
  if (this.isChecked()) {
    finalAttrs.defaultChecked = 'checked'
  }
  return React.DOM.input(finalAttrs)
}

ChoiceInput.prototype.idForLabel = function() {
  return object.get(this.attrs, 'id', '')
}

var RadioChoiceInput = ChoiceInput.extend({
  constructor: function RadioChoiceInput(name, value, attrs, choice, index) {
    if (!(this instanceof RadioChoiceInput)) {
      return new RadioChoiceInput(name, value, attrs, choice, index)
    }
    ChoiceInput.call(this, name, value, attrs, choice, index)
    this.value = ''+this.value
  }
, inputType: 'radio'
})

var CheckboxChoiceInput = ChoiceInput.extend({
  constructor: function CheckboxChoiceInput(name, value, attrs, choice, index) {
    if (!(this instanceof CheckboxChoiceInput)) {
      return new CheckboxChoiceInput(name, value, attrs, choice, index)
    }
    if (!is.Array(value)) {
      // TODO Output warning in development
      value = [value]
    }
    ChoiceInput.call(this, name, value, attrs, choice, index)
    for (var i = 0, l = this.value.length; i < l; i++) {
      this.value[i] = ''+this.value[i]
    }
  }
, inputType: 'checkbox'
})

CheckboxChoiceInput.prototype.isChecked = function() {
  return this.value.indexOf(this.choiceValue) !== -1
}

/**
 * An object used by choice Selects to enable customisation of choice widgets.
 * @constructor
 * @param {string} name
 * @param {string} value
 * @param {Object} attrs
 * @param {Array} choices
 */
var ChoiceFieldRenderer = Concur.extend({
  constructor: function ChoiceFieldRenderer(name, value, attrs, choices) {
    if (!(this instanceof ChoiceFieldRenderer)) {
      return new ChoiceFieldRenderer(name, value, attrs, choices)
    }
    this.name = name
    this.value = value
    this.attrs = attrs
    this.choices = choices
  }
, choiceInputConstructor: null
})

ChoiceFieldRenderer.prototype.__iter__ = function() {
  return this.choiceInputs()
}

ChoiceFieldRenderer.prototype.choiceInputs = function() {
  var inputs = []
  for (var i = 0, l = this.choices.length; i < l; i++) {
    inputs.push(this.choiceInputConstructor(this.name, this.value,
                                            object.extend({}, this.attrs),
                                            this.choices[i], i))
  }
  return inputs
}

ChoiceFieldRenderer.prototype.choiceInput = function(i) {
  if (i >= this.choices.length) {
    throw new Error('Index out of bounds: ' + i)
  }
  return this.choiceInputConstructor(this.name, this.value,
                                     object.extend({}, this.attrs),
                                     this.choices[i], i)
}

/**
 * Outputs a <ul> for this set of choice fields.
 * If an id was given to the field, it is applied to the <ul> (each item in the
 * list will get an id of `$id_$i`).
 */
ChoiceFieldRenderer.prototype.render = function() {
  var id = object.get(this.attrs, 'id', null)
  var items = []
  for (var i = 0, l = this.choices.length; i < l; i++) {
    var choice = this.choices[i]
    var choiceValue = choice[0]
    var choiceLabel = choice[1]
    if (is.Array(choiceLabel)) {
      var attrsPlus = object.extend({}, this.attrs)
      if (id) {
        attrsPlus.id +='_' + i
      }
      var subRenderer = ChoiceFieldRenderer(this.name, this.value,
                                            attrsPlus, choiceLabel)
      subRenderer.choiceInputConstructor = this.choiceInputConstructor
      items.push(React.DOM.li(null, choiceValue, subRenderer.render()))
    }
    else {
      var w = this.choiceInputConstructor(this.name, this.value,
                                          object.extend({}, this.attrs),
                                          choice, i)
      items.push(React.DOM.li(null, w.render()))
    }
  }
  var listAttrs = {}
  if (id) {
    listAttrs.id = id
  }
  return React.DOM.ul(listAttrs, items)
}

var RadioFieldRenderer = ChoiceFieldRenderer.extend({
  constructor: function RadioFieldRenderer(name, value, attrs, choices) {
    if (!(this instanceof RadioFieldRenderer)) {
      return new RadioFieldRenderer(name, value, attrs, choices)
    }
    ChoiceFieldRenderer.apply(this, arguments)
  }
, choiceInputConstructor: RadioChoiceInput
})

var CheckboxFieldRenderer = ChoiceFieldRenderer.extend({
  constructor: function CheckboxFieldRenderer(name, value, attrs, choices) {
    if (!(this instanceof CheckboxFieldRenderer)) {
      return new CheckboxFieldRenderer(name, value, attrs, choices)
    }
    ChoiceFieldRenderer.apply(this, arguments)
  }
, choiceInputConstructor: CheckboxChoiceInput
})

var RendererMixin = Concur.extend({
  constructor: function RendererMixin(kwargs) {
    kwargs = object.extend({renderer: null}, kwargs)
    // Override the default renderer if we were passed one
    if (kwargs.renderer !== null) {
      this.renderer = kwargs.renderer
    }
  }
, _emptyValue: null
})

RendererMixin.prototype.subWidgets = function(name, value, kwargs) {
  return util.iterate(this.getRenderer(name, value, kwargs))
}

/**
 * @return an instance of the renderer to be used to render this widget.
 */
RendererMixin.prototype.getRenderer = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null, choices: []}, kwargs)
  if (value === null) {
    value = this._emptyValue
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs)
  var choices = util.iterate(this.choices).concat(kwargs.choices || [])
  return new this.renderer(name, value, finalAttrs, choices)
}

RendererMixin.prototype.render = function(name, value, kwargs) {
  return this.getRenderer(name, value, kwargs).render()
}

/**
 * Widgets using this RendererMixin are made of a collection of subwidgets, each
 * with their own <label>, and distinct ID.
 * The IDs are made distinct by y "_X" suffix, where X is the zero-based index
 * of the choice field. Thus, the label for the main widget should reference the
 * first subwidget, hence the "_0" suffix.
 */
RendererMixin.prototype.idForLabel = function(id) {
  if (id) {
    id += '_0'
  }
  return id
}

/**
 * Renders a single select as a list of <input type="radio"> elements.
 * @constructor
 * @extends {Select}
 * @param {Object=} kwargs
 */
var RadioSelect = Select.extend({
  __mixin__: RendererMixin
, constructor: function(kwargs) {
    if (!(this instanceof RadioSelect)) { return new RadioSelect(kwargs) }
    RendererMixin.call(this, kwargs)
    Select.call(this, kwargs)
  }
, renderer: RadioFieldRenderer
, _emptyValue: ''
})

/**
 * Multiple selections represented as a list of <input type="checkbox"> widgets.
 * @constructor
 * @extends {SelectMultiple}
 * @param {Object=} kwargs
 */
var CheckboxSelectMultiple = SelectMultiple.extend({
  __mixin__: RendererMixin
, constructor: function(kwargs) {
    if (!(this instanceof CheckboxSelectMultiple)) { return new CheckboxSelectMultiple(kwargs) }
    RendererMixin.call(this, kwargs)
    SelectMultiple.call(this, kwargs)
  }
, renderer: CheckboxFieldRenderer
, _emptyValue: []
})

/**
 * A widget that is composed of multiple widgets.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var MultiWidget = Widget.extend({
  constructor: function MultiWidget(widgets, kwargs) {
    if (!(this instanceof Widget)) { return new MultiWidget(widgets, kwargs) }
    this.widgets = []
    var needsMultipartForm = false
    for (var i = 0, l = widgets.length; i < l; i++) {
      var widget = widgets[i] instanceof Widget ? widgets[i] : new widgets[i]()
      if (widget.needsMultipartForm) {
        needsMultipartForm = true
      }
      this.widgets.push(widget)
    }
    this.needsMultipartForm = needsMultipartForm
    Widget.call(this, kwargs)
  }
})

/**
 * This method is different than other widgets', because it has to figure out
 * how to split a single value for display in multiple widgets.
 *
 * If the given value is NOT a list, it will first be "decompressed" into a list
 * before it is rendered by calling the  MultiWidget#decompress function.
 *
 * Each value in the list is rendered  with the corresponding widget -- the
 * first value is rendered in the first widget, the second value is rendered in
 * the second widget, and so on.
 *
 * @param {String} name the field name.
 * @param value a list of values, or a normal value (e.g., a String that has
 *   been "compressed" from a list of values).
 * @param {Object} [kwargs] rendering options
 * @config {Object} [attrs] additional HTML attributes for the rendered widget.
 * @return a rendered collection of widgets.
 */
MultiWidget.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  if (!(is.Array(value))) {
    value = this.decompress(value)
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs)
  var id = (typeof finalAttrs.id != 'undefined' ? finalAttrs.id : null)
  var renderedWidgets = []
  for (var i = 0, l = this.widgets.length; i < l; i++) {
    var widget = this.widgets[i]
    var widgetValue = null
    if (typeof value[i] != 'undefined') {
      widgetValue = value[i]
    }
    if (id) {
      finalAttrs.id = id + '_' + i
    }
    renderedWidgets.push(
        widget.render(name + '_' + i, widgetValue, {attrs: finalAttrs}))
  }
  return this.formatOutput(renderedWidgets)
}

MultiWidget.prototype.idForLabel = function(id) {
  if (id) {
    id += '_0'
  }
  return id
}

MultiWidget.prototype.valueFromData = function(data, files, name) {
  var values = []
  for (var i = 0, l = this.widgets.length; i < l; i++) {
    values[i] = this.widgets[i].valueFromData(data, files, name + '_' + i)
  }
  return values
}

/**
 * Creates an element containing a given list of rendered widgets.
 *
 * This hook allows you to format the HTML design of the widgets, if needed.
 *
 * @param {Array} renderedWidgets a list of rendered widgets.
 * @return a <div> containing the rendered widgets.
 */
MultiWidget.prototype.formatOutput = function(renderedWidgets) {
  return React.DOM.div(null, renderedWidgets)
}

/**
 * Creates a list of decompressed values for the given compressed value.
 * @abstract
 * @param value a compressed value, which can be assumed to be valid, but not
 *   necessarily non-empty.
 * @return a list of decompressed values for the given compressed value.
 */
MultiWidget.prototype.decompress = function(value) {
  throw new Error('MultiWidget subclasses must implement a decompress() method.')
}

/**
 * Splits Date input into two <input type="text"> elements.
 * @constructor
 * @extends {MultiWidget}
 * @param {Object=} kwargs
 */
var SplitDateTimeWidget = MultiWidget.extend({
  constructor: function SplitDateTimeWidget(kwargs) {
    if (!(this instanceof Widget)) { return new SplitDateTimeWidget(kwargs) }
    kwargs = object.extend({dateFormat: null, timeFormat: null}, kwargs)
    var widgets = [
      DateInput({attrs: kwargs.attrs, format: kwargs.dateFormat})
    , TimeInput({attrs: kwargs.attrs, format: kwargs.timeFormat})
    ]
    MultiWidget.call(this, widgets, kwargs.attrs)
  }
})

SplitDateTimeWidget.prototype.decompress = function(value) {
  if (value) {
    return [
      new Date(value.getFullYear(), value.getMonth(), value.getDate())
    , new Date(1900, 0, 1, value.getHours(), value.getMinutes(), value.getSeconds())
    ]
  }
  return [null, null]
}

/**
 * Splits Date input into two <input type="hidden"> elements.
 * @constructor
 * @extends {SplitDateTimeWidget}
 * @param {Object=} kwargs
 */
var SplitHiddenDateTimeWidget = SplitDateTimeWidget.extend({
  constructor: function SplitHiddenDateTimeWidget(kwargs) {
    if (!(this instanceof Widget)) { return new SplitHiddenDateTimeWidget(kwargs) }
    SplitDateTimeWidget.call(this, kwargs)
    for (var i = 0, l = this.widgets.length; i < l; i++) {
      this.widgets[i].inputType = 'hidden'
      this.widgets[i].isHidden = true
    }
  }
, isHidden: true
})

module.exports = {
  SubWidget: SubWidget
, Widget: Widget
, Input: Input
, TextInput: TextInput
, NumberInput: NumberInput
, EmailInput: EmailInput
, URLInput: URLInput
, PasswordInput: PasswordInput
, HiddenInput: HiddenInput
, MultipleHiddenInput: MultipleHiddenInput
, FileInput: FileInput
, FILE_INPUT_CONTRADICTION: FILE_INPUT_CONTRADICTION
, ClearableFileInput: ClearableFileInput
, Textarea: Textarea
, DateInput: DateInput
, DateTimeInput: DateTimeInput
, TimeInput: TimeInput
, CheckboxInput: CheckboxInput
, Select: Select
, NullBooleanSelect: NullBooleanSelect
, SelectMultiple: SelectMultiple
, ChoiceInput: ChoiceInput
, RadioChoiceInput: RadioChoiceInput
, CheckboxChoiceInput: CheckboxChoiceInput
, ChoiceFieldRenderer: ChoiceFieldRenderer
, RendererMixin: RendererMixin
, RadioFieldRenderer: RadioFieldRenderer
, CheckboxFieldRenderer: CheckboxFieldRenderer
, RadioSelect: RadioSelect
, CheckboxSelectMultiple: CheckboxSelectMultiple
, MultiWidget: MultiWidget
, SplitDateTimeWidget: SplitDateTimeWidget
, SplitHiddenDateTimeWidget: SplitHiddenDateTimeWidget
}

},{"./env":1,"./util":6,"Concur":8,"isomorph/format":11,"isomorph/is":12,"isomorph/object":13,"isomorph/time":14}],8:[function(require,module,exports){
'use strict';

var is = require('isomorph/is')
var object = require('isomorph/object')

/**
 * Mixes in properties from one object to another. If the source object is a
 * Function, its prototype is mixed in instead.
 */
function mixin(dest, src) {
  if (is.Function(src)) {
    object.extend(dest, src.prototype)
  }
  else {
    object.extend(dest, src)
  }
}

/**
 * Applies mixins specified as a __mixin__ property on the given properties
 * object, returning an object containing the mixed in properties.
 */
function applyMixins(properties) {
  var mixins = properties.__mixin__
  if (!is.Array(mixins)) {
    mixins = [mixins]
  }
  var mixedProperties = {}
  for (var i = 0, l = mixins.length; i < l; i++) {
    mixin(mixedProperties, mixins[i])
  }
  delete properties.__mixin__
  return object.extend(mixedProperties, properties)
}

/**
 * Inherits another constructor's prototype and sets its prototype and
 * constructor properties in one fell swoop.
 *
 * If a child constructor is not provided via prototypeProps.constructor,
 * a new constructor will be created.
 */
function inheritFrom(parentConstructor, prototypeProps, constructorProps) {
  // Get or create a child constructor
  var childConstructor
  if (prototypeProps && object.hasOwn(prototypeProps, 'constructor')) {
    childConstructor = prototypeProps.constructor
  }
  else {
    childConstructor = function() {
      parentConstructor.apply(this, arguments)
    }
  }

  // Base constructors should only have the properties they're defined with
  if (parentConstructor !== Concur) {
    // Inherit the parent's prototype
    object.inherits(childConstructor, parentConstructor)
    childConstructor.__super__ = parentConstructor.prototype
  }

  // Add prototype properties, if given
  if (prototypeProps) {
    object.extend(childConstructor.prototype, prototypeProps)
  }

  // Add constructor properties, if given
  if (constructorProps) {
    object.extend(childConstructor, constructorProps)
  }

  return childConstructor
}

/**
 * Namespace and dummy constructor for initial extension.
 */
var Concur = module.exports = function() {}

/**
 * Details of a coonstructor's inheritance chain - Concur just facilitates sugar
 * so we don't include it in the initial chain. Arguably, Object.prototype could
 * go here, but it's just not that interesting.
 */
Concur.__mro__ = []

/**
 * Creates or uses a child constructor to inherit from the the call
 * context, which is expected to be a constructor.
 */
Concur.extend = function(prototypeProps, constructorProps) {
  // If the constructor being inherited from has a __meta__ function somewhere
  // in its prototype chain, call it to customise prototype and constructor
  // properties before they're used to set up the new constructor's prototype.
  if (typeof this.prototype.__meta__ != 'undefined') {
    // Property objects must always exist so properties can be added to
    // and removed from them.
    prototypeProps = prototypeProps || {}
    constructorProps = constructorProps || {}
    this.prototype.__meta__(prototypeProps, constructorProps)
  }

  // If any mixins are specified, mix them into the property objects
  if (prototypeProps && object.hasOwn(prototypeProps, '__mixin__')) {
    prototypeProps = applyMixins(prototypeProps)
  }
  if (constructorProps && object.hasOwn(constructorProps, '__mixin__')) {
    constructorProps = applyMixins(constructorProps)
  }

  // Set up the new child constructor and its prototype
  var childConstructor = inheritFrom(this,
                                     prototypeProps,
                                     constructorProps)

  // Pass on the extend function for extension in turn
  childConstructor.extend = this.extend

  // Expose the inheritance chain for programmatic access
  childConstructor.__mro__ = [childConstructor].concat(this.__mro__)

  return childConstructor
}

},{"isomorph/is":12,"isomorph/object":13}],9:[function(require,module,exports){
/*! http://mths.be/punycode v1.2.4 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.4',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

},{}],10:[function(require,module,exports){
'use strict';

var is = require('./is')

/* This file is part of OWL JavaScript Utilities.

OWL JavaScript Utilities is free software: you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public License
as published by the Free Software Foundation, either version 3 of
the License, or (at your option) any later version.

OWL JavaScript Utilities is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public
License along with OWL JavaScript Utilities.  If not, see
<http://www.gnu.org/licenses/>.
*/

// Re-usable constructor function used by clone()
function Clone() {}

// Clone objects, skip other types
function clone(target) {
  if (typeof target == 'object') {
    Clone.prototype = target
    return new Clone()
  }
  else {
    return target
  }
}

// Shallow Copy
function copy(target) {
  if (typeof target != 'object') {
    // Non-objects have value semantics, so target is already a copy
    return target
  }
  else {
    var value = target.valueOf()
    if (target != value) {
      // the object is a standard object wrapper for a native type, say String.
      // we can make a copy by instantiating a new object around the value.
      return new target.constructor(value)
    }
    else {
      var c, property
      // We have a normal object. If possible, we'll clone the original's
      // prototype (not the original) to get an empty object with the same
      // prototype chain as the original. If just copy the instance properties.
      // Otherwise, we have to copy the whole thing, property-by-property.
      if (target instanceof target.constructor && target.constructor !== Object) {
        c = clone(target.constructor.prototype)

        // Give the copy all the instance properties of target. It has the same
        // prototype as target, so inherited properties are already there.
        for (property in target) {
          if (target.hasOwnProperty(property)) {
            c[property] = target[property]
          }
        }
      }
      else {
        c = {}
        for (property in target) {
          c[property] = target[property]
        }
      }

      return c
    }
  }
}

// Deep Copy
var deepCopiers = []

function DeepCopier(config) {
  for (var key in config) {
    this[key] = config[key]
  }
}

DeepCopier.prototype = {
  constructor: DeepCopier

  // Determines if this DeepCopier can handle the given object.
, canCopy: function(source) { return false }

  // Starts the deep copying process by creating the copy object. You can
  // initialize any properties you want, but you can't call recursively into the
  // DeepCopyAlgorithm.
, create: function(source) {}

  // Completes the deep copy of the source object by populating any properties
  // that need to be recursively deep copied. You can do this by using the
  // provided deepCopyAlgorithm instance's deepCopy() method. This will handle
  // cyclic references for objects already deepCopied, including the source
  // object itself. The "result" passed in is the object returned from create().
, populate: function(deepCopyAlgorithm, source, result) {}
}

function DeepCopyAlgorithm() {
  // copiedObjects keeps track of objects already copied by this deepCopy
  // operation, so we can correctly handle cyclic references.
  this.copiedObjects = []
  var thisPass = this
  this.recursiveDeepCopy = function(source) {
    return thisPass.deepCopy(source)
  }
  this.depth = 0
}
DeepCopyAlgorithm.prototype = {
  constructor: DeepCopyAlgorithm

, maxDepth: 256

  // Add an object to the cache.  No attempt is made to filter duplicates; we
  // always check getCachedResult() before calling it.
, cacheResult: function(source, result) {
    this.copiedObjects.push([source, result])
  }

  // Returns the cached copy of a given object, or undefined if it's an object
  // we haven't seen before.
, getCachedResult: function(source) {
    var copiedObjects = this.copiedObjects
    var length = copiedObjects.length
    for ( var i=0; i<length; i++ ) {
      if ( copiedObjects[i][0] === source ) {
        return copiedObjects[i][1]
      }
    }
    return undefined
  }

  // deepCopy handles the simple cases itself: non-objects and object's we've
  // seen before. For complex cases, it first identifies an appropriate
  // DeepCopier, then calls applyDeepCopier() to delegate the details of copying
  // the object to that DeepCopier.
, deepCopy: function(source) {
    // null is a special case: it's the only value of type 'object' without
    // properties.
    if (source === null) { return null }

    // All non-objects use value semantics and don't need explict copying
    if (typeof source != 'object') { return source }

    var cachedResult = this.getCachedResult(source)

    // We've already seen this object during this deep copy operation so can
    // immediately return the result. This preserves the cyclic reference
    // structure and protects us from infinite recursion.
    if (cachedResult) { return cachedResult }

    // Objects may need special handling depending on their class. There is a
    // class of handlers call "DeepCopiers" that know how to copy certain
    // objects. There is also a final, generic deep copier that can handle any
    // object.
    for (var i=0; i<deepCopiers.length; i++) {
      var deepCopier = deepCopiers[i]
      if (deepCopier.canCopy(source)) {
        return this.applyDeepCopier(deepCopier, source)
      }
    }
    // The generic copier can handle anything, so we should never reach this
    // line.
    throw new Error('no DeepCopier is able to copy ' + source)
  }

  // Once we've identified which DeepCopier to use, we need to call it in a
  // very particular order: create, cache, populate.This is the key to detecting
  // cycles. We also keep track of recursion depth when calling the potentially
  // recursive populate(): this is a fail-fast to prevent an infinite loop from
  // consuming all available memory and crashing or slowing down the browser.
, applyDeepCopier: function(deepCopier, source) {
    // Start by creating a stub object that represents the copy.
    var result = deepCopier.create(source)

    // We now know the deep copy of source should always be result, so if we
    // encounter source again during this deep copy we can immediately use
    // result instead of descending into it recursively.
    this.cacheResult(source, result)

    // Only DeepCopier.populate() can recursively deep copy.  o, to keep track
    // of recursion depth, we increment this shared counter before calling it,
    // and decrement it afterwards.
    this.depth++
    if (this.depth > this.maxDepth) {
      throw new Error("Exceeded max recursion depth in deep copy.")
    }

    // It's now safe to let the deepCopier recursively deep copy its properties
    deepCopier.populate(this.recursiveDeepCopy, source, result)

    this.depth--

    return result
  }
}

// Entry point for deep copy.
//   source is the object to be deep copied.
//   maxDepth is an optional recursion limit. Defaults to 256.
function deepCopy(source, maxDepth) {
  var deepCopyAlgorithm = new DeepCopyAlgorithm()
  if (maxDepth) {
    deepCopyAlgorithm.maxDepth = maxDepth
  }
  return deepCopyAlgorithm.deepCopy(source)
}

// Publicly expose the DeepCopier class
deepCopy.DeepCopier = DeepCopier

// Publicly expose the list of deepCopiers
deepCopy.deepCopiers = deepCopiers

// Make deepCopy() extensible by allowing others to register their own custom
// DeepCopiers.
deepCopy.register = function(deepCopier) {
  if (!(deepCopier instanceof DeepCopier)) {
    deepCopier = new DeepCopier(deepCopier)
  }
  deepCopiers.unshift(deepCopier)
}

// Generic Object copier
// The ultimate fallback DeepCopier, which tries to handle the generic case.
// This should work for base Objects and many user-defined classes.
deepCopy.register({
  canCopy: function(source) { return true }

, create: function(source) {
    if (source instanceof source.constructor) {
      return clone(source.constructor.prototype)
    }
    else {
      return {}
    }
  }

, populate: function(deepCopy, source, result) {
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        result[key] = deepCopy(source[key])
      }
    }
    return result
  }
})

// Array copier
deepCopy.register({
  canCopy: function(source) {
    return is.Array(source)
  }

, create: function(source) {
    return new source.constructor()
  }

, populate: function(deepCopy, source, result) {
    for (var i = 0; i < source.length; i++) {
      result.push(deepCopy(source[i]))
    }
    return result
  }
})

// Date copier
deepCopy.register({
  canCopy: function(source) {
    return is.Date(source)
  }

, create: function(source) {
    return new Date(source)
  }
})

// RegExp copier
deepCopy.register({
  canCopy: function(source) {
    return is.RegExp(source)
  }

, create: function(source) {
    return source
  }
})

module.exports = {
  DeepCopyAlgorithm: DeepCopyAlgorithm
, copy: copy
, clone: clone
, deepCopy: deepCopy
}

},{"./is":12}],11:[function(require,module,exports){
'use strict';

var slice = Array.prototype.slice
  , formatRegExp = /%[%s]/g
  , formatObjRegExp = /({{?)(\w+)}/g

/**
 * Replaces %s placeholders in a string with positional arguments.
 */
function format(s) {
  return formatArr(s, slice.call(arguments, 1))
}

/**
 * Replaces %s placeholders in a string with array contents.
 */
function formatArr(s, a) {
  var i = 0
  return s.replace(formatRegExp, function(m) { return m == '%%' ? '%' : a[i++] })
}

/**
 * Replaces {propertyName} placeholders in a string with object properties.
 */
function formatObj(s, o) {
  return s.replace(formatObjRegExp, function(m, b, p) { return b.length == 2 ? m.slice(1) : o[p] })
}

var units = 'kMGTPEZY'
  , stripDecimals = /\.00$|0$/

/**
 * Formats bytes as a file size with the appropriately scaled units.
 */
function fileSize(bytes, threshold) {
  threshold = Math.min(threshold || 768, 1024)
  var i = -1
    , unit = 'bytes'
    , size = bytes
  while (size > threshold && i < units.length) {
    size = size / 1024
    i++
  }
  if (i > -1) {
    unit = units.charAt(i) + 'B'
  }
  return size.toFixed(2).replace(stripDecimals, '') + ' ' + unit
}

module.exports = {
  format: format
, formatArr: formatArr
, formatObj: formatObj
, fileSize: fileSize
}

},{}],12:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString

// Type checks

function isArray(o) {
  return toString.call(o) == '[object Array]'
}

function isBoolean(o) {
  return toString.call(o) == '[object Boolean]'
}

function isDate(o) {
  return toString.call(o) == '[object Date]'
}

function isError(o) {
  return toString.call(o) == '[object Error]'
}

function isFunction(o) {
  return toString.call(o) == '[object Function]'
}

function isNumber(o) {
  return toString.call(o) == '[object Number]'
}

function isObject(o) {
  return toString.call(o) == '[object Object]'
}

function isRegExp(o) {
  return toString.call(o) == '[object RegExp]'
}

function isString(o) {
  return toString.call(o) == '[object String]'
}

// Content checks

function isEmpty(o) {
  /* jshint ignore:start */
  for (var prop in o) {
    return false
  }
  /* jshint ignore:end */
  return true
}

module.exports = {
  Array: isArray
, Boolean: isBoolean
, Date: isDate
, Empty: isEmpty
, Error: isError
, Function: isFunction
, NaN: isNaN
, Number: isNumber
, Object: isObject
, RegExp: isRegExp
, String: isString
}

},{}],13:[function(require,module,exports){
'use strict';

/**
 * Wraps Object.prototype.hasOwnProperty() so it can be called with an object
 * and property name.
 */
var hasOwn = (function() {
  var hasOwnProperty = Object.prototype.hasOwnProperty
  return function(obj, prop) { return hasOwnProperty.call(obj, prop) }
})()

/**
 * Copies own properties from any given objects to a destination object.
 */
function extend(dest) {
  for (var i = 1, l = arguments.length, src; i < l; i++) {
    src = arguments[i]
    if (src) {
      for (var prop in src) {
        if (hasOwn(src, prop)) {
          dest[prop] = src[prop]
        }
      }
    }
  }
  return dest
}

/**
 * Makes a constructor inherit another constructor's prototype without
 * having to actually use the constructor.
 */
function inherits(childConstructor, parentConstructor) {
  var F = function() {}
  F.prototype = parentConstructor.prototype
  childConstructor.prototype = new F()
  childConstructor.prototype.constructor = childConstructor
  return childConstructor
}

/**
 * Creates an Array of [property, value] pairs from an Object.
 */
function items(obj) {
  var items_ = []
  for (var prop in obj) {
    if (hasOwn(obj, prop)) {
      items_.push([prop, obj[prop]])
    }
  }
  return items_
}

/**
 * Creates an Object from an Array of [property, value] pairs.
 */
function fromItems(items) {
  var obj = {}
  for (var i = 0, l = items.length, item; i < l; i++) {
    item = items[i]
    obj[item[0]] = item[1]
  }
  return obj
}

/**
 * Creates a lookup Object from an Array, coercing each item to a String.
 */
function lookup(arr) {
  var obj = {}
  for (var i = 0, l = arr.length; i < l; i++) {
    obj[''+arr[i]] = true
  }
  return obj
}

/**
 * If the given object has the given property, returns its value, otherwise
 * returns the given default value.
 */
function get(obj, prop, defaultValue) {
  return (hasOwn(obj, prop) ? obj[prop] : defaultValue)
}

/**
 * Deletes and returns an own property from an object, optionally returning a
 * default value if the object didn't have theproperty.
 * @throws if given an object which is null (or undefined), or if the property
 *   doesn't exist and there was no defaultValue given.
 */
function pop(obj, prop, defaultValue) {
  if (obj == null) {
    throw new Error('popProp was given ' + obj)
  }
  if (hasOwn(obj, prop)) {
    var value = obj[prop]
    delete obj[prop]
    return value
  }
  else if (arguments.length == 2) {
    throw new Error("popProp was given an object which didn't have an own '" +
                    prop + "' property, without a default value to return")
  }
  return defaultValue
}

/**
 * If the prop is in the object, return its value. If not, set the prop to
 * defaultValue and return defaultValue.
 */
function setDefault(obj, prop, defaultValue) {
  if (obj == null) {
    throw new Error('setDefault was given ' + obj)
  }
  defaultValue = defaultValue || null
  if (hasOwn(obj, prop)) {
    return obj[prop]
  }
  else {
    obj[prop] = defaultValue
    return defaultValue
  }
}

module.exports = {
  hasOwn: hasOwn
, extend: extend
, inherits: inherits
, items: items
, fromItems: fromItems
, lookup: lookup
, get: get
, pop: pop
, setDefault: setDefault
}

},{}],14:[function(require,module,exports){
'use strict';

var is = require('./is')

/**
 * Pads a number with a leading zero if necessary.
 */
function pad(number) {
  return (number < 10 ? '0' + number : number)
}

/**
 * Returns the index of item in list, or -1 if it's not in list.
 */
function indexOf(item, list) {
  for (var i = 0, l = list.length; i < l; i++) {
    if (item === list[i]) {
      return i
    }
  }
  return -1
}

/**
 * Maps directive codes to regular expression patterns which will capture the
 * data the directive corresponds to, or in the case of locale-dependent
 * directives, a function which takes a locale and generates a regular
 * expression pattern.
 */
var parserDirectives = {
  // Locale's abbreviated month name
  'b': function(l) { return '(' + l.b.join('|') + ')' }
  // Locale's full month name
, 'B': function(l) { return '(' + l.B.join('|') + ')' }
  // Locale's equivalent of either AM or PM.
, 'p': function(l) { return '(' + l.AM + '|' + l.PM + ')' }
, 'd': '(\\d\\d?)' // Day of the month as a decimal number [01,31]
, 'H': '(\\d\\d?)' // Hour (24-hour clock) as a decimal number [00,23]
, 'I': '(\\d\\d?)' // Hour (12-hour clock) as a decimal number [01,12]
, 'm': '(\\d\\d?)' // Month as a decimal number [01,12]
, 'M': '(\\d\\d?)' // Minute as a decimal number [00,59]
, 'S': '(\\d\\d?)' // Second as a decimal number [00,59]
, 'y': '(\\d\\d?)' // Year without century as a decimal number [00,99]
, 'Y': '(\\d{4})'  // Year with century as a decimal number
, '%': '%'         // A literal '%' character
}

/**
 * Maps directive codes to functions which take the date to be formatted and
 * locale details (if required), returning an appropriate formatted value.
 */
var formatterDirectives = {
  'a': function(d, l) { return l.a[d.getDay()] }
, 'A': function(d, l) { return l.A[d.getDay()] }
, 'b': function(d, l) { return l.b[d.getMonth()] }
, 'B': function(d, l) { return l.B[d.getMonth()] }
, 'd': function(d) { return pad(d.getDate(), 2) }
, 'H': function(d) { return pad(d.getHours(), 2) }
, 'M': function(d) { return pad(d.getMinutes(), 2) }
, 'm': function(d) { return pad(d.getMonth() + 1, 2) }
, 'S': function(d) { return pad(d.getSeconds(), 2) }
, 'w': function(d) { return d.getDay() }
, 'Y': function(d) { return d.getFullYear() }
, '%': function(d) { return '%' }
}

/** Test for hanging percentage symbols. */
var strftimeFormatCheck = /[^%]%$/

/**
 * A partial implementation of strptime which parses time details from a string,
 * based on a format string.
 * @param {String} format
 * @param {Object} locale
 */
function TimeParser(format, locale) {
  this.format = format
  this.locale = locale
  var cachedPattern = TimeParser._cache[locale.name + '|' + format]
  if (cachedPattern !== undefined) {
    this.re = cachedPattern[0]
    this.matchOrder = cachedPattern[1]
  }
  else {
    this.compilePattern()
  }
}

/**
 * Caches RegExps and match orders generated per locale/format string combo.
 */
TimeParser._cache = {}

TimeParser.prototype.compilePattern = function() {
  // Normalise whitespace before further processing
  var format = this.format.split(/(?:\s|\t|\n)+/).join(' ')
    , pattern = []
    , matchOrder = []
    , c
    , directive

  for (var i = 0, l = format.length; i < l; i++) {
    c = format.charAt(i)
    if (c != '%') {
      if (c === ' ') {
        pattern.push(' +')
      }
      else {
        pattern.push(c)
      }
      continue
    }

    if (i == l - 1) {
      throw new Error('strptime format ends with raw %')
    }

    c = format.charAt(++i)
    directive = parserDirectives[c]
    if (directive === undefined) {
      throw new Error('strptime format contains an unknown directive: %' + c)
    }
    else if (is.Function(directive)) {
      pattern.push(directive(this.locale))
    }
    else {
      pattern.push(directive)
    }

    if (c != '%') {
       matchOrder.push(c)
    }
  }

  this.re = new RegExp('^' + pattern.join('') + '$')
  this.matchOrder = matchOrder
  TimeParser._cache[this.locale.name + '|' + this.format] = [this.re, matchOrder]
}

/**
 * Attempts to extract date and time details from the given input.
 * @param {string} input
 * @return {Array.<number>}
 */
TimeParser.prototype.parse = function(input) {
  var matches = this.re.exec(input)
  if (matches === null) {
    throw new Error('Time data did not match format: data=' + input +
                    ', format=' + this.format)
  }

    // Default values for when more accurate values cannot be inferred
  var time = [1900, 1, 1, 0, 0, 0]
    // Matched time data, keyed by directive code
    , data = {}

  for (var i = 1, l = matches.length; i < l; i++) {
    data[this.matchOrder[i - 1]] = matches[i]
  }

  // Extract year
  if (data.hasOwnProperty('Y')) {
    time[0] = parseInt(data.Y, 10)
  }
  else if (data.hasOwnProperty('y')) {
    var year = parseInt(data.y, 10)
    if (year < 68) {
        year = 2000 + year
    }
    else if (year < 100) {
        year = 1900 + year
    }
    time[0] = year
  }

  // Extract month
  if (data.hasOwnProperty('m')) {
    var month = parseInt(data.m, 10)
    if (month < 1 || month > 12) {
      throw new Error('Month is out of range: ' + month)
    }
    time[1] = month
  }
  else if (data.hasOwnProperty('B')) {
    time[1] = indexOf(data.B, this.locale.B) + 1
  }
  else if (data.hasOwnProperty('b')) {
    time[1] = indexOf(data.b, this.locale.b) + 1
  }

  // Extract day of month
  if (data.hasOwnProperty('d')) {
    var day = parseInt(data.d, 10)
    if (day < 1 || day > 31) {
      throw new Error('Day is out of range: ' + day)
    }
    time[2] = day
  }

  // Extract hour
  var hour
  if (data.hasOwnProperty('H')) {
    hour = parseInt(data.H, 10)
    if (hour > 23) {
      throw new Error('Hour is out of range: ' + hour)
    }
    time[3] = hour
  }
  else if (data.hasOwnProperty('I')) {
    hour = parseInt(data.I, 10)
    if (hour < 1 || hour > 12) {
      throw new Error('Hour is out of range: ' + hour)
    }

    // If we don't get any more information, we'll assume this time is
    // a.m. - 12 a.m. is midnight.
    if (hour == 12) {
        hour = 0
    }

    time[3] = hour

    if (data.hasOwnProperty('p')) {
      if (data.p == this.locale.PM) {
        // We've already handled the midnight special case, so it's
        // safe to bump the time by 12 hours without further checks.
        time[3] = time[3] + 12
      }
    }
  }

  // Extract minute
  if (data.hasOwnProperty('M')) {
    var minute = parseInt(data.M, 10)
    if (minute > 59) {
        throw new Error('Minute is out of range: ' + minute)
    }
    time[4] = minute
  }

  // Extract seconds
  if (data.hasOwnProperty('S')) {
    var second = parseInt(data.S, 10)
    if (second > 59) {
      throw new Error('Second is out of range: ' + second)
    }
    time[5] = second
  }

  // Validate day of month
  day = time[2], month = time[1], year = time[0]
  if (((month == 4 || month == 6 || month == 9 || month == 11) &&
      day > 30) ||
      (month == 2 && day > ((year % 4 === 0 && year % 100 !== 0 ||
                             year % 400 === 0) ? 29 : 28))) {
    throw new Error('Day is out of range: ' + day)
  }

  return time
}

var time  = {
  /** Default locale name. */
  defaultLocale: 'en'

  /** Locale details. */
, locales: {
    en: {
      name: 'en'
    , a: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    , A: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
          'Friday', 'Saturday']
    , AM: 'AM'
    , b: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
          'Oct', 'Nov', 'Dec']
    , B: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December']
    , PM: 'PM'
    }
  }
}

/**
 * Retrieves the locale with the given code.
 * @param {string} code
 * @return {Object}
 */
var getLocale = time.getLocale = function(code) {
  if (code) {
    if (time.locales.hasOwnProperty(code)) {
      return time.locales[code]
    }
    else if (code.length > 2) {
      // If we appear to have more than a language code, try the
      // language code on its own.
      var languageCode = code.substring(0, 2)
      if (time.locales.hasOwnProperty(languageCode)) {
        return time.locales[languageCode]
      }
    }
  }
  return time.locales[time.defaultLocale]
}

/**
 * Parses time details from a string, based on a format string.
 * @param {string} input
 * @param {string} format
 * @param {string=} locale
 * @return {Array.<number>}
 */
var strptime = time.strptime = function(input, format, locale) {
  return new TimeParser(format, getLocale(locale)).parse(input)
}

/**
 * Convenience wrapper around time.strptime which returns a JavaScript Date.
 * @param {string} input
 * @param {string} format
 * @param {string=} locale
 * @return {date}
 */
time.strpdate = function(input, format, locale) {
  var t = strptime(input, format, locale)
  return new Date(t[0], t[1] - 1, t[2], t[3], t[4], t[5])
}

/**
 * A partial implementation of <code>strftime</code>, which formats a date
 * according to a format string. An Error will be thrown if an invalid
 * format string is given.
 * @param {date} date
 * @param {string} format
 * @param {string=} locale
 * @return {string}
 */
time.strftime = function(date, format, locale) {
  if (strftimeFormatCheck.test(format)) {
    throw new Error('strftime format ends with raw %')
  }
  locale = getLocale(locale)
  return format.replace(/(%.)/g, function(s, f) {
    var code = f.charAt(1)
    if (typeof formatterDirectives[code] == 'undefined') {
      throw new Error('strftime format contains an unknown directive: ' + f)
    }
    return formatterDirectives[code](date, locale)
  })
}

module.exports = time

},{"./is":12}],15:[function(require,module,exports){
'use strict';

// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
function parseUri (str) {
  var o = parseUri.options
    , m = o.parser[o.strictMode ? "strict" : "loose"].exec(str)
    , uri = {}
    , i = 14

  while (i--) { uri[o.key[i]] = m[i] || "" }

  uri[o.q.name] = {};
  uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
    if ($1) { uri[o.q.name][$1] = $2 }
  })

  return uri
}

parseUri.options = {
  strictMode: false
, key: ['source','protocol','authority','userInfo','user','password','host','port','relative','path','directory','file','query','anchor']
, q: {
    name: 'queryKey'
  , parser: /(?:^|&)([^&=]*)=?([^&]*)/g
  }
, parser: {
    strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/
  , loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
  }
}

// makeURI 1.2.2 - create a URI from an object specification; compatible with
// parseURI (http://blog.stevenlevithan.com/archives/parseuri)
// (c) Niall Smart <niallsmart.com>
// MIT License
function makeUri(u) {
  var uri = ''
  if (u.protocol) {
    uri += u.protocol + '://'
  }
  if (u.user) {
    uri += u.user
  }
  if (u.password) {
    uri += ':' + u.password
  }
  if (u.user || u.password) {
    uri += '@'
  }
  if (u.host) {
    uri += u.host
  }
  if (u.port) {
    uri += ':' + u.port
  }
  if (u.path) {
    uri += u.path
  }
  var qk = u.queryKey
  var qs = []
  for (var k in qk) {
    if (!qk.hasOwnProperty(k)) {
      continue
    }
    var v = encodeURIComponent(qk[k])
    k = encodeURIComponent(k)
    if (v) {
      qs.push(k + '=' + v)
    }
    else {
      qs.push(k)
    }
  }
  if (qs.length > 0) {
    uri += '?' + qs.join('&')
  }
  if (u.anchor) {
    uri += '#' + u.anchor
  }
  return uri
}

module.exports = {
  parseUri: parseUri
, makeUri: makeUri
}

},{}],16:[function(require,module,exports){
'use strict';

var Concur = require('Concur')
var format = require('isomorph/format').formatObj
var is = require('isomorph/is')
var object = require('isomorph/object')

var NON_FIELD_ERRORS = '__all__'

/**
 * A validation error, containing a list of messages. Single messages (e.g.
 * those produced by validators) may have an associated error code and
 * parameters to allow customisation by fields.
 *
 * The message argument can be a single error, a list of errors, or an object
 * that maps field names to lists of errors. What we define as an "error" can
 * be either a simple string or an instance of ValidationError with its message
 * attribute set, and what we define as list or object can be an actual list or
 * object or an instance of ValidationError with its errorList or errorObj
 * property set.
 */
var ValidationError = Concur.extend({
  constructor: function ValidationError(message, kwargs) {
    if (!(this instanceof ValidationError)) { return new ValidationError(message, kwargs) }
    kwargs = object.extend({code: null, params: null}, kwargs)

    var code = kwargs.code
    var params = kwargs.params

    if (message instanceof ValidationError) {
      if (object.hasOwn(message, 'errorObj')) {
        message = message.errorObj
      }
      else if (object.hasOwn(message, 'message')) {
        message = message.errorList
      }
      else {
        code = message.code
        params = message.params
        message = message.message
      }
    }

    if (is.Object(message)) {
      this.errorObj = {}
      Object.keys(message).forEach(function(field) {
        var messages = message[field]
        if (!(messages instanceof ValidationError)) {
          messages = ValidationError(messages)
        }
        this.errorObj[field] = messages.errorList
      }.bind(this))
    }
    else if (is.Array(message)) {
      this.errorList = []
      message.forEach(function(message) {
        // Normalize strings to instances of ValidationError
        if (!(message instanceof ValidationError)) {
          message = ValidationError(message)
        }
        this.errorList.push.apply(this.errorList, message.errorList)
      }.bind(this))
    }
    else {
      this.message = message
      this.code = code
      this.params = params
      this.errorList = [this]
    }
  }
})

/**
 * Returns validation messages as an object with field names as properties.
 * Throws an error if this validation error was not created with a field error
 * object.
 */
ValidationError.prototype.messageObj = function() {
  if (!object.hasOwn(this, 'errorObj')) {
    throw new Error('ValidationError has no errorObj')
  }
  return this.__iter__()
}

/**
 * Returns validation messages as a list.
 */
ValidationError.prototype.messages = function() {
  if (object.hasOwn(this, 'errorObj')) {
    var messages = []
    Object.keys(this.errorObj).forEach(function(field) {
      var errors = this.errorObj[field]
      messages.push.apply(messages, ValidationError(errors).__iter__())
    }.bind(this))
    return messages
  }
  else {
    return this.__iter__()
  }
}

/**
 * Generates an object of field error messags or a list of error messages
 * depending on how this ValidationError has been constructed.
 */
ValidationError.prototype.__iter__ = function() {
  if (object.hasOwn(this, 'errorObj')) {
    var messageObj = {}
    Object.keys(this.errorObj).forEach(function(field) {
      var errors = this.errorObj[field]
      messageObj[field] = ValidationError(errors).__iter__()
    }.bind(this))
    return messageObj
  }
  else {
    return this.errorList.map(function(error) {
      var message = error.message
      if (error.params) {
        message = format(message, error.params)
      }
      return message
    })
  }
}

/**
 * Passes this error's messages on to the given error object, adding to a
 * particular field's error messages if already present.
 */
ValidationError.prototype.updateErrorObj = function(errorObj) {
  if (object.hasOwn(this, 'errorObj')) {
    if (errorObj) {
      Object.keys(this.errorObj).forEach(function(field) {
        if (!object.hasOwn(errorObj, field)) {
          errorObj[field] = []
        }
        var errors = errorObj[field]
        errors.push.apply(errors, this.errorObj[field])
      }.bind(this))
    }
    else {
      errorObj = this.errorObj
    }
  }
  else {
    if (!object.hasOwn(errorObj, NON_FIELD_ERRORS)) {
      errorObj[NON_FIELD_ERRORS] = []
    }
    var nonFieldErrors = errorObj[NON_FIELD_ERRORS]
    nonFieldErrors.push.apply(nonFieldErrors, this.errorList)
  }
  return errorObj
}

ValidationError.prototype.toString = function() {
  return ('ValidationError(' + JSON.stringify(this.__iter__()) + ')')
}

module.exports = {
  ValidationError: ValidationError
}

},{"Concur":8,"isomorph/format":11,"isomorph/is":12,"isomorph/object":13}],17:[function(require,module,exports){
'use strict';

var object = require('isomorph/object')

var errors = require('./errors')

var ValidationError = errors.ValidationError

var hexRE = /^[0-9a-f]+$/

/**
 * Cleans a IPv6 address string.
 *
 * Validity is checked by calling isValidIPv6Address() - if an invalid address
 * is passed, a ValidationError is thrown.
 *
 * Replaces the longest continious zero-sequence with '::' and removes leading
 * zeroes and makes sure all hextets are lowercase.
 */
function cleanIPv6Address(ipStr, kwargs) {
  kwargs = object.extend({
    unpackIPv4: false, errorMessage: 'This is not a valid IPv6 address.'
  }, kwargs)

  var bestDoublecolonStart = -1
  var bestDoublecolonLen = 0
  var doublecolonStart = -1
  var doublecolonLen = 0

  if (!isValidIPv6Address(ipStr)) {
    throw ValidationError(kwargs.errorMessage, {code: 'invalid'})
  }

  // This algorithm can only handle fully exploded IP strings
  ipStr = _explodeShorthandIPstring(ipStr)
  ipStr = _sanitiseIPv4Mapping(ipStr)

  // If needed, unpack the IPv4 and return straight away
  if (kwargs.unpackIPv4) {
    var ipv4Unpacked = _unpackIPv4(ipStr)
    if (ipv4Unpacked) {
      return ipv4Unpacked
    }
  }

  var hextets = ipStr.split(':')

  for (var i = 0, l = hextets.length; i < l; i++) {
    // Remove leading zeroes
    hextets[i] = hextets[i].replace(/^0+/, '')
    if (hextets[i] === '') {
      hextets[i] = '0'
    }

    // Determine best hextet to compress
    if (hextets[i] == '0') {
      doublecolonLen += 1
      if (doublecolonStart == -1) {
        // Start a sequence of zeros
        doublecolonStart = i
      }
      if (doublecolonLen > bestDoublecolonLen) {
        // This is the longest sequence so far
        bestDoublecolonLen = doublecolonLen
        bestDoublecolonStart = doublecolonStart
      }
    }
    else {
      doublecolonLen = 0
      doublecolonStart = -1
    }
  }

  // Compress the most suitable hextet
  if (bestDoublecolonLen > 1) {
    var bestDoublecolonEnd = bestDoublecolonStart + bestDoublecolonLen
    // For zeros at the end of the address
    if (bestDoublecolonEnd == hextets.length) {
      hextets.push('')
    }
    hextets.splice(bestDoublecolonStart, bestDoublecolonLen, '')
    // For zeros at the beginning of the address
    if (bestDoublecolonStart === 0) {
      hextets.unshift('')
    }
  }

  return hextets.join(':').toLowerCase()
}

/**
 * Sanitises IPv4 mapping in a expanded IPv6 address.
 *
 * This converts ::ffff:0a0a:0a0a to ::ffff:10.10.10.10.
 * If there is nothing to sanitise, returns an unchanged string.
 */
function _sanitiseIPv4Mapping(ipStr) {
  if (ipStr.toLowerCase().indexOf('0000:0000:0000:0000:0000:ffff:') !== 0) {
    // Not an ipv4 mapping
    return ipStr
  }

  var hextets = ipStr.split(':')

  if (hextets[hextets.length - 1].indexOf('.') != -1) {
    // Already sanitized
    return ipStr
  }

  var ipv4Address = [
    parseInt(hextets[6].substring(0, 2), 16)
  , parseInt(hextets[6].substring(2, 4), 16)
  , parseInt(hextets[7].substring(0, 2), 16)
  , parseInt(hextets[7].substring(2, 4), 16)
  ].join('.')

  return hextets.slice(0, 6).join(':') +  ':' + ipv4Address
}

/**
 * Unpacks an IPv4 address that was mapped in a compressed IPv6 address.
 *
 * This converts 0000:0000:0000:0000:0000:ffff:10.10.10.10 to 10.10.10.10.
 * If there is nothing to sanitize, returns null.
 */
function _unpackIPv4(ipStr) {
  if (ipStr.toLowerCase().indexOf('0000:0000:0000:0000:0000:ffff:') !== 0) {
    return null
  }

  var hextets = ipStr.split(':')
  return hextets.pop()
}

/**
 * Determines if we have a valid IPv6 address.
 */
function isValidIPv6Address(ipStr) {
  var validateIPv4Address = require('./validators').validateIPv4Address

  // We need to have at least one ':'
  if (ipStr.indexOf(':') == -1) {
    return false
  }

  // We can only have one '::' shortener
  if (String_count(ipStr, '::') > 1) {
    return false
  }

  // '::' should be encompassed by start, digits or end
  if (ipStr.indexOf(':::') != -1) {
    return false
  }

  // A single colon can neither start nor end an address
  if ((ipStr.charAt(0) == ':' && ipStr.charAt(1) != ':') ||
      (ipStr.charAt(ipStr.length - 1) == ':' &&
       ipStr.charAt(ipStr.length - 2) != ':')) {
    return false
  }

  // We can never have more than 7 ':' (1::2:3:4:5:6:7:8 is invalid)
  if (String_count(ipStr, ':') > 7) {
    return false
  }

  // If we have no concatenation, we need to have 8 fields with 7 ':'
  if (ipStr.indexOf('::') == -1 && String_count(ipStr, ':') != 7) {
    // We might have an IPv4 mapped address
    if (String_count(ipStr, '.') != 3) {
      return false
    }
  }

  ipStr = _explodeShorthandIPstring(ipStr)

  // Now that we have that all squared away, let's check that each of the
  // hextets are between 0x0 and 0xFFFF.
  var hextets = ipStr.split(':')
  for (var i = 0, l = hextets.length, hextet; i < l; i++) {
    hextet = hextets[i]
    if (String_count(hextet, '.') == 3) {
      // If we have an IPv4 mapped address, the IPv4 portion has to
      // be at the end of the IPv6 portion.
      if (ipStr.split(':').pop() != hextet) {
        return false
      }
      try {
        validateIPv4Address(hextet)
      }
      catch (e) {
        if (!(e instanceof ValidationError)) {
          throw e
        }
        return false
      }
    }
    else {
      if (!hexRE.test(hextet)) {
        return false
      }
      var intValue = parseInt(hextet, 16)
      if (isNaN(intValue) || intValue < 0x0 || intValue > 0xFFFF) {
        return false
      }
    }
  }

  return true
}

/**
 * Expands a shortened IPv6 address.
 */
function _explodeShorthandIPstring(ipStr) {
  if (!_isShortHand(ipStr)) {
    // We've already got a longhand ipStr
    return ipStr
  }

  var newIp = []
  var hextets = ipStr.split('::')

  // If there is a ::, we need to expand it with zeroes to get to 8 hextets -
  // unless there is a dot in the last hextet, meaning we're doing v4-mapping
  var fillTo = (ipStr.split(':').pop().indexOf('.') != -1) ? 7 : 8

  if (hextets.length > 1) {
    var sep = hextets[0].split(':').length + hextets[1].split(':').length
    newIp = hextets[0].split(':')
    for (var i = 0, l = fillTo - sep; i < l; i++) {
      newIp.push('0000')
    }
    newIp = newIp.concat(hextets[1].split(':'))
  }
  else {
    newIp = ipStr.split(':')
  }

  // Now need to make sure every hextet is 4 lower case characters.
  // If a hextet is < 4 characters, we've got missing leading 0's.
  var retIp = []
  for (i = 0, l = newIp.length; i < l; i++) {
    retIp.push(zeroPadding(newIp[i], 4) + newIp[i].toLowerCase())
  }
  return retIp.join(':')
}

/**
 * Determines if the address is shortened.
 */
function _isShortHand(ipStr) {
  if (String_count(ipStr, '::') == 1) {
    return true
  }
  var parts = ipStr.split(':')
  for (var i = 0, l = parts.length; i < l; i++) {
    if (parts[i].length < 4) {
      return true
    }
  }
  return false
}

// Utilities

function zeroPadding(str, length) {
  if (str.length >= length) {
    return ''
  }
  return new Array(length - str.length + 1).join('0')
}

function String_count(str, subStr) {
  return str.split(subStr).length - 1
}

module.exports = {
  cleanIPv6Address: cleanIPv6Address
, isValidIPv6Address: isValidIPv6Address
}

},{"./errors":16,"./validators":18,"isomorph/object":13}],18:[function(require,module,exports){
'use strict';

var Concur = require('Concur')
var is = require('isomorph/is')
var object = require('isomorph/object')
var punycode = require('punycode')
var url = require('isomorph/url')

var errors = require('./errors')
var ipv6 = require('./ipv6')

var ValidationError = errors.ValidationError
var isValidIPv6Address = ipv6.isValidIPv6Address

var EMPTY_VALUES = [null, undefined, '']

function String_rsplit(str, sep, maxsplit) {
  var split = str.split(sep)
  return maxsplit ? [split.slice(0, -maxsplit).join(sep)].concat(split.slice(-maxsplit)) : split
}

/**
 * Validates that input matches a regular expression.
 */
var RegexValidator = Concur.extend({
  constructor: function(kwargs) {
    if (!(this instanceof RegexValidator)) { return new RegexValidator(kwargs) }
    kwargs = object.extend({
      regex: null, message: null, code: null, inverseMatch: null
    }, kwargs)
    if (kwargs.regex) {
      this.regex = kwargs.regex
    }
    if (kwargs.message) {
      this.message = kwargs.message
    }
    if (kwargs.code) {
      this.code = kwargs.code
    }
    if (kwargs.inverseMatch) {
      this.inverseMatch = kwargs.inverseMatch
    }
    // Compile the regex if it was not passed pre-compiled
    if (is.String(this.regex)) {
      this.regex = new RegExp(this.regex)
    }
    return this.__call__.bind(this)
  }
, regex: ''
, message: 'Enter a valid value.'
, code: 'invalid'
, inverseMatch: false
, __call__: function(value) {
    if (this.inverseMatch === this.regex.test(''+value)) {
      throw ValidationError(this.message, {code: this.code})
    }
  }
})

/**
 * Validates that input looks like a valid URL.
 */
var URLValidator = RegexValidator.extend({
  regex: new RegExp(
    '^(?:[a-z0-9\\.\\-]*)://'                         // schema is validated separately
  + '(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\\.)+(?:[A-Z]{2,6}\\.?|[A-Z0-9-]{2,}\\.?)|' // Domain...
  + 'localhost|'                                      // localhost...
  + '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|'      // ...or IPv4
  + '\\[?[A-F0-9]*:[A-F0-9:]+\\]?)'                   // ...or IPv6
  + '(?::\\d+)?'                                      // Optional port
  + '(?:/?|[/?]\\S+)$'
  , 'i'
  )
, message: 'Enter a valid URL.'
, schemes: ['http', 'https', 'ftp', 'ftps']

, constructor:function(kwargs) {
    if (!(this instanceof URLValidator)) { return new URLValidator(kwargs) }
    kwargs = object.extend({schemes: null}, kwargs)
    RegexValidator.call(this, kwargs)
    if (kwargs.schemes !== null) {
      this.schemes = kwargs.schemes
    }
    return this.__call__.bind(this)
  }

, __call__: function(value) {
    value = ''+value
    // Check if the scheme is valid first
    var scheme = value.split('://')[0].toLowerCase()
    if (this.schemes.indexOf(scheme) === -1) {
      throw ValidationError(this.message, {code: this.code})
    }

    // Check the full URL
    try {
      RegexValidator.prototype.__call__.call(this, value)
    }
    catch (e) {
      if (!(e instanceof ValidationError)) { throw e }

      // Trivial case failed - try for possible IDN domain
      var urlFields = url.parseUri(value)
      try {
        urlFields.host = punycode.toASCII(urlFields.host)
      }
      catch (unicodeError) {
        throw e
      }
      value = url.makeUri(urlFields)
      RegexValidator.prototype.__call__.call(this, value)
    }
  }
})

/** Validates that input looks like a valid e-mail address. */
var EmailValidator = Concur.extend({
  message: 'Enter a valid email address.'
, code: 'invalid'
, userRegex: new RegExp(
    "(^[-!#$%&'*+/=?^_`{}|~0-9A-Z]+(\\.[-!#$%&'*+/=?^_`{}|~0-9A-Z]+)*$"                                 // Dot-atom
  + '|^"([\\001-\\010\\013\\014\\016-\\037!#-\\[\\]-\\177]|\\\\[\\001-\\011\\013\\014\\016-\\177])*"$)' // Quoted-string
  , 'i')
, domainRegex: new RegExp(
    '^(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\\.)+(?:[A-Z]{2,6}|[A-Z0-9-]{2,})$'          // Domain
  + '|^\\[(25[0-5]|2[0-4]\\d|[0-1]?\\d?\\d)(\\.(25[0-5]|2[0-4]\\d|[0-1]?\\d?\\d)){3}\\]$' // Literal form, ipv4 address (SMTP 4.1.3)
  , 'i')
, domainWhitelist: ['localhost']

, constructor: function(kwargs) {
    if (!(this instanceof EmailValidator)) { return new EmailValidator(kwargs) }
    kwargs = object.extend({message: null, code: null, whitelist: null}, kwargs)
    if (kwargs.message !== null) {
      this.message = kwargs.message
    }
    if (kwargs.code !== null) {
      this.code = kwargs.code
    }
    if (kwargs.whitelist !== null) {
      this.domainWhitelist = kwargs.whitelist
    }
    return this.__call__.bind(this)
  }

, __call__ : function(value) {
    value = ''+value

    if (!value || value.indexOf('@') == -1) {
      throw ValidationError(this.message, {code: this.code})
    }

    var parts = String_rsplit(value, '@', 1)
    var userPart = parts[0]
    var domainPart = parts[1]

    if (!this.userRegex.test(userPart)) {
      throw ValidationError(this.message, {code: this.code})
    }

    if (this.domainWhitelist.indexOf(domainPart) == -1 &&
        !this.domainRegex.test(domainPart)) {
      // Try for possible IDN domain-part
      try {
        domainPart = punycode.toASCII(domainPart)
        if (this.domainRegex.test(domainPart)) {
          return
        }
      }
      catch (unicodeError) {
        // Pass through to throw the ValidationError
      }
      throw ValidationError(this.message, {code: this.code})
    }
  }
})

var validateEmail = EmailValidator()

var SLUG_RE = /^[-a-zA-Z0-9_]+$/
/** Validates that input is a valid slug. */
var validateSlug = RegexValidator({
  regex: SLUG_RE
, message: 'Enter a valid "slug" consisting of letters, numbers, underscores or hyphens.'
, code: 'invalid'
})

var IPV4_RE = /^(25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3}$/
/** Validates that input is a valid IPv4 address. */
var validateIPv4Address = RegexValidator({
  regex: IPV4_RE
, message: 'Enter a valid IPv4 address.'
, code: 'invalid'
})

/** Validates that input is a valid IPv6 address. */
function validateIPv6Address(value) {
  if (!isValidIPv6Address(value)) {
    throw ValidationError('Enter a valid IPv6 address.', {code: 'invalid'})
  }
}

/** Validates that input is a valid IPv4 or IPv6 address. */
function validateIPv46Address(value) {
  try {
    validateIPv4Address(value)
  }
  catch (e) {
    if (!(e instanceof ValidationError)) { throw e }
    try {
      validateIPv6Address(value)
    }
    catch (e) {
      if (!(e instanceof ValidationError)) { throw e }
      throw ValidationError('Enter a valid IPv4 or IPv6 address.',
                            {code: 'invalid'})
    }
  }
}

var ipAddressValidatorLookup = {
  both: {validators: [validateIPv46Address], message: 'Enter a valid IPv4 or IPv6 address.'}
, ipv4: {validators: [validateIPv4Address], message: 'Enter a valid IPv4 address.'}
, ipv6: {validators: [validateIPv6Address], message: 'Enter a valid IPv6 address.'}
}

/**
 * Depending on the given parameters returns the appropriate validators for
 * a GenericIPAddressField.
 */
function ipAddressValidators(protocol, unpackIPv4) {
  if (protocol != 'both' && unpackIPv4) {
    throw new Error('You can only use unpackIPv4 if protocol is set to "both"')
  }
  protocol = protocol.toLowerCase()
  if (typeof ipAddressValidatorLookup[protocol] == 'undefined') {
    throw new Error('The protocol "' + protocol +'" is unknown')
  }
  return ipAddressValidatorLookup[protocol]
}

var COMMA_SEPARATED_INT_LIST_RE = /^[\d,]+$/
/** Validates that input is a comma-separated list of integers. */
var validateCommaSeparatedIntegerList = RegexValidator({
  regex: COMMA_SEPARATED_INT_LIST_RE
, message: 'Enter only digits separated by commas.'
, code: 'invalid'
})

/**
 * Base for validators which compare input against a given value.
 */
var BaseValidator = Concur.extend({
  constructor: function(limitValue) {
    if (!(this instanceof BaseValidator)) { return new BaseValidator(limitValue) }
    this.limitValue = limitValue
    return this.__call__.bind(this)
  }
, compare: function(a, b) { return a !== b }
, clean: function(x) { return x }
, message: 'Ensure this value is {limitValue} (it is {showValue}).'
, code: 'limitValue'
, __call__: function(value) {
    var cleaned = this.clean(value)
    var params = {limitValue: this.limitValue, showValue: cleaned}
    if (this.compare(cleaned, this.limitValue)) {
      throw ValidationError(this.message, {code: this.code, params: params})
    }
  }
})

/**
 * Validates that input is less than or equal to a given value.
 */
var MaxValueValidator = BaseValidator.extend({
  constructor: function(limitValue) {
    if (!(this instanceof MaxValueValidator)) { return new MaxValueValidator(limitValue) }
    return BaseValidator.call(this, limitValue)
  }
, compare: function(a, b) { return a > b }
, message: 'Ensure this value is less than or equal to {limitValue}.'
, code: 'maxValue'
})

/**
 * Validates that input is greater than or equal to a given value.
 */
var MinValueValidator = BaseValidator.extend({
  constructor: function(limitValue) {
    if (!(this instanceof MinValueValidator)) { return new MinValueValidator(limitValue) }
    return BaseValidator.call(this, limitValue)
  }
, compare: function(a, b) { return a < b }
, message: 'Ensure this value is greater than or equal to {limitValue}.'
, code: 'minValue'
})

/**
 * Validates that input is at least a given length.
 */
var MinLengthValidator = BaseValidator.extend({
  constructor: function(limitValue) {
    if (!(this instanceof MinLengthValidator)) { return new MinLengthValidator(limitValue) }
    return BaseValidator.call(this, limitValue)
  }
, compare: function(a, b) { return a < b }
, clean: function(x) { return x.length }
, message: 'Ensure this value has at least {limitValue} characters (it has {showValue}).'
, code: 'minLength'
})

/**
 * Validates that input is at most a given length.
 */
var MaxLengthValidator = BaseValidator.extend({
  constructor: function(limitValue) {
    if (!(this instanceof MaxLengthValidator)) { return new MaxLengthValidator(limitValue) }
    return BaseValidator.call(this, limitValue)
  }
, compare: function(a, b) { return a > b }
, clean: function(x) { return x.length }
, message: 'Ensure this value has at most {limitValue} characters (it has {showValue}).'
, code: 'maxLength'
})

module.exports = {
  EMPTY_VALUES: EMPTY_VALUES
, RegexValidator: RegexValidator
, URLValidator: URLValidator
, EmailValidator: EmailValidator
, validateEmail: validateEmail
, validateSlug: validateSlug
, validateIPv4Address: validateIPv4Address
, validateIPv6Address: validateIPv6Address
, validateIPv46Address: validateIPv46Address
, ipAddressValidators: ipAddressValidators
, validateCommaSeparatedIntegerList: validateCommaSeparatedIntegerList
, BaseValidator: BaseValidator
, MaxValueValidator: MaxValueValidator
, MinValueValidator: MinValueValidator
, MaxLengthValidator: MaxLengthValidator
, MinLengthValidator: MinLengthValidator
, ValidationError: ValidationError
, ipv6: ipv6
}

},{"./errors":16,"./ipv6":17,"Concur":8,"isomorph/is":12,"isomorph/object":13,"isomorph/url":15,"punycode":9}]},{},[5])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOlxccmVwb3NcXG5ld2Zvcm1zXFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL2xpYi9lbnYuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9saWIvZmllbGRzLmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbGliL2Zvcm1zLmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbGliL2Zvcm1zZXRzLmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbGliL25ld2Zvcm1zLmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbGliL3V0aWwuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9saWIvd2lkZ2V0cy5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9Db25jdXIvbGliL2NvbmN1ci5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wdW55Y29kZS9wdW55Y29kZS5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9pc29tb3JwaC9jb3B5LmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbm9kZV9tb2R1bGVzL2lzb21vcnBoL2Zvcm1hdC5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9pc29tb3JwaC9pcy5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9pc29tb3JwaC9vYmplY3QuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9ub2RlX21vZHVsZXMvaXNvbW9ycGgvdGltZS5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9pc29tb3JwaC91cmwuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9ub2RlX21vZHVsZXMvdmFsaWRhdG9ycy9saWIvZXJyb3JzLmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbm9kZV9tb2R1bGVzL3ZhbGlkYXRvcnMvbGliL2lwdjYuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9ub2RlX21vZHVsZXMvdmFsaWRhdG9ycy9saWIvdmFsaWRhdG9ycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeGtEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcDNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDempCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9WQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnJvd3NlcjogdHlwZW9mIHByb2Nlc3MgPT0gJ3VuZGVmaW5lZCdcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb25jdXIgPSByZXF1aXJlKCdDb25jdXInKVxudmFyIGlzID0gcmVxdWlyZSgnaXNvbW9ycGgvaXMnKVxudmFyIG9iamVjdCA9IHJlcXVpcmUoJ2lzb21vcnBoL29iamVjdCcpXG52YXIgdGltZSA9IHJlcXVpcmUoJ2lzb21vcnBoL3RpbWUnKVxudmFyIHVybCA9IHJlcXVpcmUoJ2lzb21vcnBoL3VybCcpXG52YXIgdmFsaWRhdG9ycyA9IHJlcXVpcmUoJ3ZhbGlkYXRvcnMnKVxuXG52YXIgZW52ID0gcmVxdWlyZSgnLi9lbnYnKVxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxudmFyIHdpZGdldHMgPSByZXF1aXJlKCcuL3dpZGdldHMnKVxuXG52YXIgVmFsaWRhdGlvbkVycm9yID0gdmFsaWRhdG9ycy5WYWxpZGF0aW9uRXJyb3JcbnZhciBXaWRnZXQgPSB3aWRnZXRzLldpZGdldFxudmFyIGNsZWFuSVB2NkFkZHJlc3MgPSB2YWxpZGF0b3JzLmlwdjYuY2xlYW5JUHY2QWRkcmVzc1xuXG4vKipcbiAqIEFuIG9iamVjdCB0aGF0IGlzIHJlc3BvbnNpYmxlIGZvciBkb2luZyB2YWxpZGF0aW9uIGFuZCBub3JtYWxpc2F0aW9uLCBvclxuICogXCJjbGVhbmluZ1wiLCBmb3IgZXhhbXBsZTogYW4gRW1haWxGaWVsZCBtYWtlcyBzdXJlIGl0cyBkYXRhIGlzIGEgdmFsaWRcbiAqIGUtbWFpbCBhZGRyZXNzIGFuZCBtYWtlcyBzdXJlIHRoYXQgYWNjZXB0YWJsZSBcImJsYW5rXCIgdmFsdWVzIGFsbCBoYXZlIHRoZVxuICogc2FtZSByZXByZXNlbnRhdGlvbi5cbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEZpZWxkID0gQ29uY3VyLmV4dGVuZCh7XG4gIHdpZGdldDogd2lkZ2V0cy5UZXh0SW5wdXQgICAgICAgICAvLyBEZWZhdWx0IHdpZGdldCB0byB1c2Ugd2hlbiByZW5kZXJpbmcgdGhpcyB0eXBlIG9mIEZpZWxkXG4sIGhpZGRlbldpZGdldDogd2lkZ2V0cy5IaWRkZW5JbnB1dCAvLyBEZWZhdWx0IHdpZGdldCB0byB1c2Ugd2hlbiByZW5kZXJpbmcgdGhpcyBhcyBcImhpZGRlblwiXG4sIGRlZmF1bHRWYWxpZGF0b3JzOiBbXSAgICAgICAgICAgICAvLyBEZWZhdWx0IGxpc3Qgb2YgdmFsaWRhdG9yc1xuICAvLyBBZGQgYW4gJ2ludmFsaWQnIGVudHJ5IHRvIGRlZmF1bHRFcnJvck1lc3NhZ2VzIGlmIHlvdSB3YW50IGEgc3BlY2lmaWNcbiAgLy8gZmllbGQgZXJyb3IgbWVzc2FnZSBub3QgcmFpc2VkIGJ5IHRoZSBmaWVsZCB2YWxpZGF0b3JzLlxuLCBkZWZhdWx0RXJyb3JNZXNzYWdlczoge1xuICAgIHJlcXVpcmVkOiAnVGhpcyBmaWVsZCBpcyByZXF1aXJlZC4nXG4gIH1cbiwgZW1wdHlWYWx1ZXM6IHZhbGlkYXRvcnMuRU1QVFlfVkFMVUVTLnNsaWNlKClcbiwgZW1wdHlWYWx1ZUFycmF5OiB0cnVlIC8vIFNob3VsZCBpc0VtcHR5VmFsdWUgY2hlY2sgZm9yIGVtcHR5IEFycmF5cz9cblxuLCBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gRmllbGQoa3dhcmdzKSB7XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7XG4gICAgICByZXF1aXJlZDogdHJ1ZSwgd2lkZ2V0OiBudWxsLCBsYWJlbDogbnVsbCwgaW5pdGlhbDogbnVsbCxcbiAgICAgIGhlbHBUZXh0OiBudWxsLCBlcnJvck1lc3NhZ2VzOiBudWxsLCBzaG93SGlkZGVuSW5pdGlhbDogZmFsc2UsXG4gICAgICB2YWxpZGF0b3JzOiBbXSwgY3NzQ2xhc3M6IG51bGxcbiAgICB9LCBrd2FyZ3MpXG4gICAgdGhpcy5yZXF1aXJlZCA9IGt3YXJncy5yZXF1aXJlZFxuICAgIHRoaXMubGFiZWwgPSBrd2FyZ3MubGFiZWxcbiAgICB0aGlzLmluaXRpYWwgPSBrd2FyZ3MuaW5pdGlhbFxuICAgIHRoaXMuc2hvd0hpZGRlbkluaXRpYWwgPSBrd2FyZ3Muc2hvd0hpZGRlbkluaXRpYWxcbiAgICB0aGlzLmhlbHBUZXh0ID0ga3dhcmdzLmhlbHBUZXh0IHx8ICcnXG4gICAgdGhpcy5jc3NDbGFzcyA9IGt3YXJncy5jc3NDbGFzc1xuXG4gICAgdmFyIHdpZGdldCA9IGt3YXJncy53aWRnZXQgfHwgdGhpcy53aWRnZXRcbiAgICBpZiAoISh3aWRnZXQgaW5zdGFuY2VvZiBXaWRnZXQpKSB7XG4gICAgICAvLyBXZSBtdXN0IGhhdmUgYSBXaWRnZXQgY29uc3RydWN0b3IsIHNvIGNvbnN0cnVjdCB3aXRoIGl0XG4gICAgICB3aWRnZXQgPSBuZXcgd2lkZ2V0KClcbiAgICB9XG4gICAgLy8gTGV0IHRoZSB3aWRnZXQga25vdyB3aGV0aGVyIGl0IHNob3VsZCBkaXNwbGF5IGFzIHJlcXVpcmVkXG4gICAgd2lkZ2V0LmlzUmVxdWlyZWQgPSB0aGlzLnJlcXVpcmVkXG4gICAgLy8gSG9vayBpbnRvIHRoaXMud2lkZ2V0QXR0cnMoKSBmb3IgYW55IEZpZWxkLXNwZWNpZmljIEhUTUwgYXR0cmlidXRlc1xuICAgIG9iamVjdC5leHRlbmQod2lkZ2V0LmF0dHJzLCB0aGlzLndpZGdldEF0dHJzKHdpZGdldCkpXG4gICAgdGhpcy53aWRnZXQgPSB3aWRnZXRcblxuICAgIC8vIEluY3JlbWVudCB0aGUgY3JlYXRpb24gY291bnRlciBhbmQgc2F2ZSBvdXIgbG9jYWwgY29weVxuICAgIHRoaXMuY3JlYXRpb25Db3VudGVyID0gRmllbGQuY3JlYXRpb25Db3VudGVyKytcblxuICAgIC8vIENvcHkgZXJyb3IgbWVzc2FnZXMgZm9yIHRoaXMgaW5zdGFuY2UgaW50byBhIG5ldyBvYmplY3QgYW5kIG92ZXJyaWRlXG4gICAgLy8gd2l0aCBhbnkgcHJvdmlkZWQgZXJyb3IgbWVzc2FnZXMuXG4gICAgdmFyIG1lc3NhZ2VzID0gW3t9XVxuICAgIGZvciAodmFyIGkgPSB0aGlzLmNvbnN0cnVjdG9yLl9fbXJvX18ubGVuZ3RoIC0gMTsgaSA+PTA7IGktLSkge1xuICAgICAgbWVzc2FnZXMucHVzaChvYmplY3QuZ2V0KHRoaXMuY29uc3RydWN0b3IuX19tcm9fX1tpXS5wcm90b3R5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2RlZmF1bHRFcnJvck1lc3NhZ2VzJywgbnVsbCkpXG4gICAgfVxuICAgIG1lc3NhZ2VzLnB1c2goa3dhcmdzLmVycm9yTWVzc2FnZXMpXG4gICAgdGhpcy5lcnJvck1lc3NhZ2VzID0gb2JqZWN0LmV4dGVuZC5hcHBseShvYmplY3QsIG1lc3NhZ2VzKVxuXG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy5kZWZhdWx0VmFsaWRhdG9ycy5jb25jYXQoa3dhcmdzLnZhbGlkYXRvcnMpXG4gIH1cbn0pXG5cbi8qKlxuICogVHJhY2tzIGVhY2ggdGltZSBhIEZpZWxkIGluc3RhbmNlIGlzIGNyZWF0ZWQ7IHVzZWQgdG8gcmV0YWluIG9yZGVyLlxuICovXG5GaWVsZC5jcmVhdGlvbkNvdW50ZXIgPSAwXG5cbkZpZWxkLnByb3RvdHlwZS5wcmVwYXJlVmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdmFsdWVcbn1cblxuRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIENoZWNrcyBmb3IgdGhlIGdpdmVuIHZhbHVlIGJlaW5nID09PSBvbmUgb2YgdGhlIGNvbmZpZ3VyZWQgZW1wdHkgdmFsdWVzLCBwbHVzXG4gKiBhbnkgYWRkaXRpb25hbCBjaGVja3MgcmVxdWlyZWQgZHVlIHRvIEphdmFTY3JpcHQncyBsYWNrIG9mIGEgZ2VuZXJpYyBvYmplY3RcbiAqIGVxdWFsaXR5IGNoZWNraW5nIG1lY2hhbmlzbS5cbiAqL1xuRmllbGQucHJvdG90eXBlLmlzRW1wdHlWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh0aGlzLmVtcHR5VmFsdWVzLmluZGV4T2YodmFsdWUpICE9IC0xKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICBpZiAodGhpcy5lbXB0eVZhbHVlQXJyYXkgPT09IHRydWUgJiYgaXMuQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbkZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh0aGlzLnJlcXVpcmVkICYmIHRoaXMuaXNFbXB0eVZhbHVlKHZhbHVlKSkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMucmVxdWlyZWQsIHtjb2RlOiAncmVxdWlyZWQnfSlcbiAgfVxufVxuXG5GaWVsZC5wcm90b3R5cGUucnVuVmFsaWRhdG9ycyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh0aGlzLmlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm5cbiAgfVxuICB2YXIgZXJyb3JzID0gW11cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLnZhbGlkYXRvcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIHZhbGlkYXRvciA9IHRoaXMudmFsaWRhdG9yc1tpXVxuICAgIHRyeSB7XG4gICAgICB2YWxpZGF0b3IodmFsdWUpXG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBpZiAoIShlIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSkgeyB0aHJvdyBlIH1cbiAgICAgIGlmIChvYmplY3QuaGFzT3duKGUsICdjb2RlJykgJiZcbiAgICAgICAgICBvYmplY3QuaGFzT3duKHRoaXMuZXJyb3JNZXNzYWdlcywgZS5jb2RlKSkge1xuICAgICAgICBlLm1lc3NhZ2UgPSB0aGlzLmVycm9yTWVzc2FnZXNbZS5jb2RlXVxuICAgICAgfVxuICAgICAgZXJyb3JzLnB1c2guYXBwbHkoZXJyb3JzLCBlLmVycm9yTGlzdClcbiAgICB9XG4gIH1cbiAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKGVycm9ycylcbiAgfVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGUgZ2l2ZW4gdmFsdWUgYW5kIHJldHVybnMgaXRzIFwiY2xlYW5lZFwiIHZhbHVlIGFzIGFuIGFwcHJvcHJpYXRlXG4gKiBKYXZhU2NyaXB0IG9iamVjdC5cbiAqIFRocm93cyBhIFZhbGlkYXRpb25FcnJvciBmb3IgYW55IGVycm9ycy5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSB0aGUgdmFsdWUgdG8gYmUgdmFsaWRhdGVkLlxuICovXG5GaWVsZC5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IHRoaXMudG9KYXZhU2NyaXB0KHZhbHVlKVxuICB0aGlzLnZhbGlkYXRlKHZhbHVlKVxuICB0aGlzLnJ1blZhbGlkYXRvcnModmFsdWUpXG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIFJldHVybiB0aGUgdmFsdWUgdGhhdCBzaG91bGQgYmUgc2hvd24gZm9yIHRoaXMgZmllbGQgb24gcmVuZGVyIG9mIGEgYm91bmRcbiAqIGZvcm0sIGdpdmVuIHRoZSBzdWJtaXR0ZWQgUE9TVCBkYXRhIGZvciB0aGUgZmllbGQgYW5kIHRoZSBpbml0aWFsIGRhdGEsIGlmXG4gKiBhbnkuXG4gKlxuICogRm9yIG1vc3QgZmllbGRzLCB0aGlzIHdpbGwgc2ltcGx5IGJlIGRhdGE7IEZpbGVGaWVsZHMgbmVlZCB0byBoYW5kbGUgaXQgYSBiaXRcbiAqIGRpZmZlcmVudGx5LlxuICovXG5GaWVsZC5wcm90b3R5cGUuYm91bmREYXRhID0gZnVuY3Rpb24oZGF0YSwgaW5pdGlhbCkge1xuICByZXR1cm4gZGF0YVxufVxuXG4vKipcbiAqIFNwZWNpZmllcyBIVE1MIGF0dHJpYnV0ZXMgd2hpY2ggc2hvdWxkIGJlIGFkZGVkIHRvIGEgZ2l2ZW4gd2lkZ2V0IGZvciB0aGlzXG4gKiBmaWVsZC5cbiAqXG4gKiBAcGFyYW0ge1dpZGdldH0gd2lkZ2V0IGEgd2lkZ2V0LlxuICogQHJldHVybiBhbiBvYmplY3Qgc3BlY2lmeWluZyBIVE1MIGF0dHJpYnV0ZXMgdGhhdCBzaG91bGQgYmUgYWRkZWQgdG8gdGhlXG4gKiAgICAgICAgIGdpdmVuIHdpZGdldCwgYmFzZWQgb24gdGhpcyBmaWVsZC5cbiAqL1xuRmllbGQucHJvdG90eXBlLndpZGdldEF0dHJzID0gZnVuY3Rpb24od2lkZ2V0KSB7XG4gIHJldHVybiB7fVxufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBkYXRhIGRpZmZlcnMgZnJvbSBpbml0aWFsLlxuICovXG5GaWVsZC5wcm90b3R5cGUuX2hhc0NoYW5nZWQgPSBmdW5jdGlvbihpbml0aWFsLCBkYXRhKSB7XG4gIC8vIEZvciBwdXJwb3NlcyBvZiBzZWVpbmcgd2hldGhlciBzb21ldGhpbmcgaGFzIGNoYW5nZWQsIG51bGwgaXMgdGhlIHNhbWVcbiAgLy8gYXMgYW4gZW1wdHkgc3RyaW5nLCBpZiB0aGUgZGF0YSBvciBpbml0YWwgdmFsdWUgd2UgZ2V0IGlzIG51bGwsIHJlcGxhY2VcbiAgLy8gaXQgd2l0aCAnJy5cbiAgdmFyIGluaXRpYWxWYWx1ZSA9IChpbml0aWFsID09PSBudWxsID8gJycgOiBpbml0aWFsKVxuICB0cnkge1xuICAgIGRhdGEgPSB0aGlzLnRvSmF2YVNjcmlwdChkYXRhKVxuICAgIGlmICh0eXBlb2YgdGhpcy5fY29lcmNlID09ICdmdW5jdGlvbicpIHtcbiAgICAgIGRhdGEgPSB0aGlzLl9jb2VyY2UoZGF0YSlcbiAgICB9XG4gIH1cbiAgY2F0Y2ggKGUpIHtcbiAgICBpZiAoIShlIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSkgeyB0aHJvdyBlIH1cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHZhciBkYXRhVmFsdWUgPSAoZGF0YSA9PT0gbnVsbCA/ICcnIDogZGF0YSlcbiAgcmV0dXJuICgnJytpbml0aWFsVmFsdWUgIT0gJycrZGF0YVZhbHVlKSAvLyBUT0RPIGlzIGZvcmNpbmcgdG8gc3RyaW5nIG5lY2Vzc2FyeT9cbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSB2YWxpZCBTdHJpbmcuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBDaGFyRmllbGQgPSBGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gQ2hhckZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBDaGFyRmllbGQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7bWF4TGVuZ3RoOiBudWxsLCBtaW5MZW5ndGg6IG51bGx9LCBrd2FyZ3MpXG4gICAgdGhpcy5tYXhMZW5ndGggPSBrd2FyZ3MubWF4TGVuZ3RoXG4gICAgdGhpcy5taW5MZW5ndGggPSBrd2FyZ3MubWluTGVuZ3RoXG4gICAgRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgaWYgKHRoaXMubWluTGVuZ3RoICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnZhbGlkYXRvcnMucHVzaCh2YWxpZGF0b3JzLk1pbkxlbmd0aFZhbGlkYXRvcih0aGlzLm1pbkxlbmd0aCkpXG4gICAgfVxuICAgIGlmICh0aGlzLm1heExlbmd0aCAhPT0gbnVsbCkge1xuICAgICAgdGhpcy52YWxpZGF0b3JzLnB1c2godmFsaWRhdG9ycy5NYXhMZW5ndGhWYWxpZGF0b3IodGhpcy5tYXhMZW5ndGgpKVxuICAgIH1cbiAgfVxufSlcblxuQ2hhckZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAodGhpcy5pc0VtcHR5VmFsdWUodmFsdWUpKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cbiAgcmV0dXJuICcnK3ZhbHVlXG59XG5cbi8qKlxuICogSWYgdGhpcyBmaWVsZCBpcyBjb25maWd1cmVkIHRvIGVuZm9yY2UgYSBtYXhpbXVtIGxlbmd0aCwgYWRkcyBhIHN1aXRhYmxlXG4gKiBtYXhMZW5ndGggYXR0cmlidXRlIHRvIHRleHQgaW5wdXQgZmllbGRzLlxuICpcbiAqIEBwYXJhbSB7V2lkZ2V0fSB3aWRnZXQgdGhlIHdpZGdldCBiZWluZyB1c2VkIHRvIHJlbmRlciB0aGlzIGZpZWxkJ3MgdmFsdWUuXG4gKlxuICogQHJldHVybiBhZGRpdGlvbmFsIGF0dHJpYnV0ZXMgd2hpY2ggc2hvdWxkIGJlIGFkZGVkIHRvIHRoZSBnaXZlbiB3aWRnZXQuXG4gKi9cbkNoYXJGaWVsZC5wcm90b3R5cGUud2lkZ2V0QXR0cnMgPSBmdW5jdGlvbih3aWRnZXQpIHtcbiAgdmFyIGF0dHJzID0ge31cbiAgaWYgKHRoaXMubWF4TGVuZ3RoICE9PSBudWxsICYmICh3aWRnZXQgaW5zdGFuY2VvZiB3aWRnZXRzLlRleHRJbnB1dCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZGdldCBpbnN0YW5jZW9mIHdpZGdldHMuUGFzc3dvcmRJbnB1dCkpIHtcbiAgICBhdHRycy5tYXhMZW5ndGggPSAnJyt0aGlzLm1heExlbmd0aFxuICB9XG4gIHJldHVybiBhdHRyc1xufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBpcyBhIHZhbGlkIGludGVnZXIuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBJbnRlZ2VyRmllbGQgPSBGaWVsZC5leHRlbmQoe1xuICB3aWRnZXQ6IHdpZGdldHMuTnVtYmVySW5wdXRcbiwgZGVmYXVsdEVycm9yTWVzc2FnZXM6IHtcbiAgICBpbnZhbGlkOiAnRW50ZXIgYSB3aG9sZSBudW1iZXIuJ1xuICB9XG5cbiwgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEludGVnZXJGaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgSW50ZWdlckZpZWxkKGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe21heFZhbHVlOiBudWxsLCBtaW5WYWx1ZTogbnVsbH0sIGt3YXJncylcbiAgICB0aGlzLm1heFZhbHVlID0ga3dhcmdzLm1heFZhbHVlXG4gICAgdGhpcy5taW5WYWx1ZSA9IGt3YXJncy5taW5WYWx1ZVxuICAgIEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuXG4gICAgaWYgKHRoaXMubWluVmFsdWUgIT09IG51bGwpIHtcbiAgICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKHZhbGlkYXRvcnMuTWluVmFsdWVWYWxpZGF0b3IodGhpcy5taW5WYWx1ZSkpXG4gICAgfVxuICAgIGlmICh0aGlzLm1heFZhbHVlICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnZhbGlkYXRvcnMucHVzaCh2YWxpZGF0b3JzLk1heFZhbHVlVmFsaWRhdG9yKHRoaXMubWF4VmFsdWUpKVxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBOdW1iZXIoKSBjYW4gYmUgY2FsbGVkIG9uIHRoZSBpbnB1dCB3aXRoIGEgcmVzdWx0IHRoYXQgaXNuJ3RcbiAqIE5hTiBhbmQgZG9lc24ndCBjb250YWluIGFueSBkZWNpbWFsIHBvaW50cy5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHZhbHVlIHRvIGJlIHZhbCBpZGF0ZWQuXG4gKiBAcmV0dXJuIHRoZSByZXN1bHQgb2YgTnVtYmVyKCksIG9yIG51bGwgZm9yIGVtcHR5IHZhbHVlcy5cbiAqL1xuSW50ZWdlckZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IEZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQuY2FsbCh0aGlzLCB2YWx1ZSlcbiAgaWYgKHRoaXMuaXNFbXB0eVZhbHVlKHZhbHVlKSkge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgdmFsdWUgPSBOdW1iZXIodmFsdWUpXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUudG9TdHJpbmcoKS5pbmRleE9mKCcuJykgIT0gLTEpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWQsIHtjb2RlOiAnaW52YWxpZCd9KVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG5JbnRlZ2VyRmllbGQucHJvdG90eXBlLndpZGdldEF0dHJzID0gZnVuY3Rpb24od2lkZ2V0KSB7XG4gIHZhciBhdHRycyA9IEZpZWxkLnByb3RvdHlwZS53aWRnZXRBdHRycy5jYWxsKHRoaXMsIHdpZGdldClcbiAgaWYgKHdpZGdldCBpbnN0YW5jZW9mIHdpZGdldHMuTnVtYmVySW5wdXQpIHtcbiAgICBpZiAodGhpcy5taW5WYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgYXR0cnMubWluID0gdGhpcy5taW5WYWx1ZVxuICAgIH1cbiAgICBpZiAodGhpcy5tYXhWYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgYXR0cnMubWF4ID0gdGhpcy5tYXhWYWx1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gYXR0cnNcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSB2YWxpZCBmbG9hdC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ludGVnZXJGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBGbG9hdEZpZWxkID0gSW50ZWdlckZpZWxkLmV4dGVuZCh7XG4gIGRlZmF1bHRFcnJvck1lc3NhZ2VzOiB7XG4gICAgaW52YWxpZDogJ0VudGVyIGEgbnVtYmVyLidcbiAgfVxuXG4sIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBGbG9hdEZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBGbG9hdEZpZWxkKGt3YXJncykgfVxuICAgIEludGVnZXJGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuLyoqIEZsb2F0IHZhbGlkYXRpb24gcmVndWxhciBleHByZXNzaW9uLCBhcyBwYXJzZUZsb2F0KCkgaXMgdG9vIGZvcmdpdmluZy4gKi9cbkZsb2F0RmllbGQuRkxPQVRfUkVHRVhQID0gL15bLStdPyg/OlxcZCsoPzpcXC5cXGQqKT98KD86XFxkKyk/XFwuXFxkKykkL1xuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IHRoZSBpbnB1dCBsb29rcyBsaWtlIHZhbGlkIGlucHV0IGZvciBwYXJzZUZsb2F0KCkgYW5kIHRoZVxuICogcmVzdWx0IG9mIGNhbGxpbmcgaXQgaXNuJ3QgTmFOLlxuICogQHBhcmFtIHZhbHVlIHRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKiBAcmV0dXJuIGEgTnVtYmVyIG9idGFpbmVkIGZyb20gcGFyc2VGbG9hdCgpLCBvciBudWxsIGZvciBlbXB0eSB2YWx1ZXMuXG4gKi9cbkZsb2F0RmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhbHVlID0gRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdC5jYWxsKHRoaXMsIHZhbHVlKVxuICBpZiAodGhpcy5pc0VtcHR5VmFsdWUodmFsdWUpKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuICB2YWx1ZSA9IHV0aWwuc3RyaXAodmFsdWUpXG4gIGlmICghRmxvYXRGaWVsZC5GTE9BVF9SRUdFWFAudGVzdCh2YWx1ZSkpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWQsIHtjb2RlOiAnaW52YWxpZCd9KVxuICB9XG4gIHZhbHVlID0gcGFyc2VGbG9hdCh2YWx1ZSlcbiAgaWYgKGlzTmFOKHZhbHVlKSkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZCwge2NvZGU6ICdpbnZhbGlkJ30pXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiBkYXRhIGhhcyBjaGFuZ2VkIGZyb20gaW5pdGlhbC4gSW4gSmF2YVNjcmlwdCwgdHJhaWxpbmcgemVyb2VzXG4gKiBpbiBmbG9hdHMgYXJlIGRyb3BwZWQgd2hlbiBhIGZsb2F0IGlzIGNvZXJjZWQgdG8gYSBTdHJpbmcsIHNvIGUuZy4sIGFuXG4gKiBpbml0aWFsIHZhbHVlIG9mIDEuMCB3b3VsZCBub3QgbWF0Y2ggYSBkYXRhIHZhbHVlIG9mICcxLjAnIGlmIHdlIHdlcmUgdG8gdXNlXG4gKiB0aGUgV2lkZ2V0IG9iamVjdCdzIF9oYXNDaGFuZ2VkLCB3aGljaCBjaGVja3MgY29lcmNlZCBTdHJpbmcgdmFsdWVzLlxuICogQHR5cGUgQm9vbGVhblxuICovXG5GbG9hdEZpZWxkLnByb3RvdHlwZS5faGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKGluaXRpYWwsIGRhdGEpIHtcbiAgLy8gRm9yIHB1cnBvc2VzIG9mIHNlZWluZyB3aGV0aGVyIHNvbWV0aGluZyBoYXMgY2hhbmdlZCwgbnVsbCBpcyB0aGUgc2FtZVxuICAvLyBhcyBhbiBlbXB0eSBzdHJpbmcsIGlmIHRoZSBkYXRhIG9yIGluaXRhbCB2YWx1ZSB3ZSBnZXQgaXMgbnVsbCwgcmVwbGFjZVxuICAvLyBpdCB3aXRoICcnLlxuICB2YXIgZGF0YVZhbHVlID0gKGRhdGEgPT09IG51bGwgPyAnJyA6IGRhdGEpXG4gIHZhciBpbml0aWFsVmFsdWUgPSAoaW5pdGlhbCA9PT0gbnVsbCA/ICcnIDogaW5pdGlhbClcbiAgaWYgKGluaXRpYWxWYWx1ZSA9PT0gZGF0YVZhbHVlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgZWxzZSBpZiAoaW5pdGlhbFZhbHVlID09PSAnJyB8fCBkYXRhVmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gKHBhcnNlRmxvYXQoJycraW5pdGlhbFZhbHVlKSAhPSBwYXJzZUZsb2F0KCcnK2RhdGFWYWx1ZSkpXG59XG5cbkZsb2F0RmllbGQucHJvdG90eXBlLndpZGdldEF0dHJzID0gZnVuY3Rpb24od2lkZ2V0KSB7XG4gIHZhciBhdHRycyA9IEludGVnZXJGaWVsZC5wcm90b3R5cGUud2lkZ2V0QXR0cnMuY2FsbCh0aGlzLCB3aWRnZXQpXG4gIGlmICh3aWRnZXQgaW5zdGFuY2VvZiB3aWRnZXRzLk51bWJlcklucHV0ICYmXG4gICAgICAhb2JqZWN0Lmhhc093bih3aWRnZXQuYXR0cnMsICdzdGVwJykpIHtcbiAgICBvYmplY3Quc2V0RGVmYXVsdChhdHRycywgJ3N0ZXAnLCAnYW55JylcbiAgfVxuICByZXR1cm4gYXR0cnNcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSBkZWNpbWFsIG51bWJlci5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIERlY2ltYWxGaWVsZCA9IEludGVnZXJGaWVsZC5leHRlbmQoe1xuICBkZWZhdWx0RXJyb3JNZXNzYWdlczoge1xuICAgIGludmFsaWQ6ICdFbnRlciBhIG51bWJlci4nXG4gICwgbWF4RGlnaXRzOiAnRW5zdXJlIHRoYXQgdGhlcmUgYXJlIG5vIG1vcmUgdGhhbiB7bWF4RGlnaXRzfSBkaWdpdHMgaW4gdG90YWwuJ1xuICAsIG1heERlY2ltYWxQbGFjZXM6ICdFbnN1cmUgdGhhdCB0aGVyZSBhcmUgbm8gbW9yZSB0aGFuIHttYXhEZWNpbWFsUGxhY2VzfSBkZWNpbWFsIHBsYWNlcy4nXG4gICwgbWF4V2hvbGVEaWdpdHM6ICdFbnN1cmUgdGhhdCB0aGVyZSBhcmUgbm8gbW9yZSB0aGFuIHttYXhXaG9sZURpZ2l0c30gZGlnaXRzIGJlZm9yZSB0aGUgZGVjaW1hbCBwb2ludC4nXG4gIH1cblxuLCBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gRGVjaW1hbEZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBEZWNpbWFsRmllbGQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7bWF4RGlnaXRzOiBudWxsLCBkZWNpbWFsUGxhY2VzOiBudWxsfSwga3dhcmdzKVxuICAgIHRoaXMubWF4RGlnaXRzID0ga3dhcmdzLm1heERpZ2l0c1xuICAgIHRoaXMuZGVjaW1hbFBsYWNlcyA9IGt3YXJncy5kZWNpbWFsUGxhY2VzXG4gICAgSW50ZWdlckZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuXG4vKiogRGVjaW1hbCB2YWxpZGF0aW9uIHJlZ3VsYXIgZXhwcmVzc2lvbiwgaW4gbGlldSBvZiBhIERlY2ltYWwgdHlwZS4gKi9cbkRlY2ltYWxGaWVsZC5ERUNJTUFMX1JFR0VYUCA9IC9eWy0rXT8oPzpcXGQrKD86XFwuXFxkKik/fCg/OlxcZCspP1xcLlxcZCspJC9cblxuLyoqXG4gKiBEZWNpbWFsRmllbGQgb3ZlcnJpZGVzIHRoZSBjbGVhbigpIG1ldGhvZCBhcyBpdCBwZXJmb3JtcyBpdHMgb3duIHZhbGlkYXRpb25cbiAqIGFnYWluc3QgYSBkaWZmZXJlbnQgdmFsdWUgdGhhbiB0aGF0IGdpdmVuIHRvIGFueSBkZWZpbmVkIHZhbGlkYXRvcnMsIGR1ZSB0b1xuICogSmF2YVNjcmlwdCBsYWNraW5nIGEgYnVpbHQtaW4gRGVjaW1hbCB0eXBlLiBEZWNpbWFsIGZvcm1hdCBhbmQgY29tcG9uZW50IHNpemVcbiAqIGNoZWNrcyB3aWxsIGJlIHBlcmZvcm1lZCBhZ2FpbnN0IGEgbm9ybWFsaXNlZCBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlXG4gKiBpbnB1dCwgd2hlcmVhcyBWYWxpZGF0b3JzIHdpbGwgYmUgcGFzc2VkIGEgZmxvYXQgdmVyc2lvbiBvZiB0aGUgdmFsdWUgZm9yXG4gKiBtaW4vbWF4IGNoZWNraW5nLlxuICogQHBhcmFtIHtzdHJpbmd8TnVtYmVyfSB2YWx1ZVxuICogQHJldHVybiB7c3RyaW5nfSBhIG5vcm1hbGlzZWQgdmVyc2lvbiBvZiB0aGUgaW5wdXQuXG4gKi9cbkRlY2ltYWxGaWVsZC5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAvLyBUYWtlIGNhcmUgb2YgZW1wdHksIHJlcXVpcmVkIHZhbGlkYXRpb25cbiAgRmllbGQucHJvdG90eXBlLnZhbGlkYXRlLmNhbGwodGhpcywgdmFsdWUpXG4gIGlmICh0aGlzLmlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgLy8gQ29lcmNlIHRvIHN0cmluZyBhbmQgdmFsaWRhdGUgdGhhdCBpdCBsb29rcyBEZWNpbWFsLWxpa2VcbiAgdmFsdWUgPSB1dGlsLnN0cmlwKCcnK3ZhbHVlKVxuICBpZiAoIURlY2ltYWxGaWVsZC5ERUNJTUFMX1JFR0VYUC50ZXN0KHZhbHVlKSkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZCwge2NvZGU6ICdpbnZhbGlkJ30pXG4gIH1cblxuICAvLyBJbiBsaWV1IG9mIGEgRGVjaW1hbCB0eXBlLCBEZWNpbWFsRmllbGQgdmFsaWRhdGVzIGFnYWluc3QgYSBzdHJpbmdcbiAgLy8gcmVwcmVzZW50YXRpb24gb2YgYSBEZWNpbWFsLCBpbiB3aGljaDpcbiAgLy8gKiBBbnkgbGVhZGluZyBzaWduIGhhcyBiZWVuIHN0cmlwcGVkXG4gIHZhciBuZWdhdGl2ZSA9IGZhbHNlXG4gIGlmICh2YWx1ZS5jaGFyQXQoMCkgPT0gJysnIHx8IHZhbHVlLmNoYXJBdCgwKSA9PSAnLScpIHtcbiAgICBuZWdhdGl2ZSA9ICh2YWx1ZS5jaGFyQXQoMCkgPT0gJy0nKVxuICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyKDEpXG4gIH1cbiAgLy8gKiBMZWFkaW5nIHplcm9zIGhhdmUgYmVlbiBzdHJpcHBlZCBmcm9tIGRpZ2l0cyBiZWZvcmUgdGhlIGRlY2ltYWwgcG9pbnQsXG4gIC8vICAgYnV0IHRyYWlsaW5nIGRpZ2l0cyBhcmUgcmV0YWluZWQgYWZ0ZXIgdGhlIGRlY2ltYWwgcG9pbnQuXG4gIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvXjArLywgJycpXG4gIC8vICogSWYgdGhlIGlucHV0IGVuZGVkIHdpdGggYSAnLicsIGl0IGlzIHN0cmlwcGVkXG4gIGlmICh2YWx1ZS5pbmRleE9mKCcuJykgPT0gdmFsdWUubGVuZ3RoIC0gMSkge1xuICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyaW5nKDAsIHZhbHVlLmxlbmd0aCAtIDEpXG4gIH1cblxuICAvLyBQZXJmb3JtIG93biB2YWxpZGF0aW9uXG4gIHZhciBwaWVjZXMgPSB2YWx1ZS5zcGxpdCgnLicpXG4gIHZhciB3aG9sZURpZ2l0cyA9IHBpZWNlc1swXS5sZW5ndGhcbiAgdmFyIGRlY2ltYWxzID0gKHBpZWNlcy5sZW5ndGggPT0gMiA/IHBpZWNlc1sxXS5sZW5ndGggOiAwKVxuICB2YXIgZGlnaXRzID0gd2hvbGVEaWdpdHMgKyBkZWNpbWFsc1xuICBpZiAodGhpcy5tYXhEaWdpdHMgIT09IG51bGwgJiYgZGlnaXRzID4gdGhpcy5tYXhEaWdpdHMpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLm1heERpZ2l0cywge1xuICAgICAgY29kZTogJ21heERpZ2l0cydcbiAgICAsIHBhcmFtczoge21heERpZ2l0czogdGhpcy5tYXhEaWdpdHN9XG4gICAgfSlcbiAgfVxuICBpZiAodGhpcy5kZWNpbWFsUGxhY2VzICE9PSBudWxsICYmIGRlY2ltYWxzID4gdGhpcy5kZWNpbWFsUGxhY2VzKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5tYXhEZWNpbWFsUGxhY2VzLCB7XG4gICAgICBjb2RlOiAnbWF4RGVjaW1hbFBsYWNlcydcbiAgICAsIHBhcmFtczoge21heERlY2ltYWxQbGFjZXM6IHRoaXMuZGVjaW1hbFBsYWNlc31cbiAgICB9KVxuICB9XG4gIGlmICh0aGlzLm1heERpZ2l0cyAhPT0gbnVsbCAmJlxuICAgICAgdGhpcy5kZWNpbWFsUGxhY2VzICE9PSBudWxsICYmXG4gICAgICB3aG9sZURpZ2l0cyA+ICh0aGlzLm1heERpZ2l0cyAtIHRoaXMuZGVjaW1hbFBsYWNlcykpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLm1heFdob2xlRGlnaXRzLCB7XG4gICAgICBjb2RlOiAnbWF4V2hvbGVEaWdpdHMnXG4gICAgLCBwYXJhbXM6IHttYXhXaG9sZURpZ2l0czogKHRoaXMubWF4RGlnaXRzIC0gdGhpcy5kZWNpbWFsUGxhY2VzKX1cbiAgICB9KVxuICB9XG5cbiAgLy8gKiBWYWx1ZXMgd2hpY2ggZGlkIG5vdCBoYXZlIGEgbGVhZGluZyB6ZXJvIGdhaW4gYSBzaW5nbGUgbGVhZGluZyB6ZXJvXG4gIGlmICh2YWx1ZS5jaGFyQXQoMCkgPT0gJy4nKSB7XG4gICAgdmFsdWUgPSAnMCcgKyB2YWx1ZVxuICB9XG4gIC8vIFJlc3RvcmUgc2lnbiBpZiBuZWNlc3NhcnlcbiAgaWYgKG5lZ2F0aXZlKSB7XG4gICAgdmFsdWUgPSAnLScgKyB2YWx1ZVxuICB9XG5cbiAgLy8gVmFsaWRhdGUgYWdhaW5zdCBhIGZsb2F0IHZhbHVlIC0gYmVzdCB3ZSBjYW4gZG8gaW4gdGhlIG1lYW50aW1lXG4gIHRoaXMucnVuVmFsaWRhdG9ycyhwYXJzZUZsb2F0KHZhbHVlKSlcblxuICAvLyBSZXR1cm4gdGhlIG5vcm1hbGl0ZWQgU3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gIHJldHVybiB2YWx1ZVxufVxuXG5EZWNpbWFsRmllbGQucHJvdG90eXBlLndpZGdldEF0dHJzID0gZnVuY3Rpb24od2lkZ2V0KSB7XG4gIHZhciBhdHRycyA9IEludGVnZXJGaWVsZC5wcm90b3R5cGUud2lkZ2V0QXR0cnMuY2FsbCh0aGlzLCB3aWRnZXQpXG4gIGlmICh3aWRnZXQgaW5zdGFuY2VvZiB3aWRnZXRzLk51bWJlcklucHV0ICYmXG4gICAgICAhb2JqZWN0Lmhhc093bih3aWRnZXQuYXR0cnMsICdzdGVwJykpIHtcbiAgICB2YXIgc3RlcCA9ICdhbnknXG4gICAgaWYgKHRoaXMuZGVjaW1hbFBsYWNlcyAhPT0gbnVsbCkge1xuICAgICAgLy8gVXNlIGV4cG9uZW50aWFsIG5vdGF0aW9uIGZvciBzbWFsbCB2YWx1ZXMgc2luY2UgdGhleSBtaWdodFxuICAgICAgLy8gYmUgcGFyc2VkIGFzIDAgb3RoZXJ3aXNlLlxuICAgICAgaWYgKHRoaXMuZGVjaW1hbFBsYWNlcyA9PT0gMCkge1xuICAgICAgICBzdGVwID0gJzEnXG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLmRlY2ltYWxQbGFjZXMgPCA3KSB7XG4gICAgICAgIHN0ZXAgPSAnMC4nICsgJzAwMDAwMScuc2xpY2UoLXRoaXMuZGVjaW1hbFBsYWNlcylcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBzdGVwID0gJzFlLScgKyB0aGlzLmRlY2ltYWxQbGFjZXNcbiAgICAgIH1cbiAgICB9XG4gICAgb2JqZWN0LnNldERlZmF1bHQoYXR0cnMsICdzdGVwJywgc3RlcClcbiAgfVxuICByZXR1cm4gYXR0cnNcbn1cblxuLyoqXG4gKiBCYXNlIGZpZWxkIGZvciBmaWVsZHMgd2hpY2ggdmFsaWRhdGUgdGhhdCB0aGVpciBpbnB1dCBpcyBhIGRhdGUgb3IgdGltZS5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEJhc2VUZW1wb3JhbEZpZWxkID0gRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEJhc2VUZW1wb3JhbEZpZWxkKGt3YXJncykge1xuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2lucHV0Rm9ybWF0czogbnVsbH0sIGt3YXJncylcbiAgICBGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgICBpZiAoa3dhcmdzLmlucHV0Rm9ybWF0cyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5pbnB1dEZvcm1hdHMgPSBrd2FyZ3MuaW5wdXRGb3JtYXRzXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBpcyBhIHZhbGlkIGRhdGUgb3IgdGltZS5cbiAqIEBwYXJhbSB7U3RyaW5nfERhdGV9XG4gKiBAcmV0dXJuIHtEYXRlfVxuICovXG5CYXNlVGVtcG9yYWxGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKCFpcy5EYXRlKHZhbHVlKSkge1xuICAgIHZhbHVlID0gdXRpbC5zdHJpcCh2YWx1ZSlcbiAgfVxuICBpZiAoaXMuU3RyaW5nKHZhbHVlKSkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5pbnB1dEZvcm1hdHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gdGhpcy5zdHJwZGF0ZSh2YWx1ZSwgdGhpcy5pbnB1dEZvcm1hdHNbaV0pXG4gICAgICB9XG4gICAgICBjYXRjaCAoZSkge1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgIH1cbiAgfVxuICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWQsIHtjb2RlOiAnaW52YWxpZCd9KVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBEYXRlIGZyb20gdGhlIGdpdmVuIGlucHV0IGlmIGl0J3MgdmFsaWQgYmFzZWQgb24gYSBmb3JtYXQuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBmb3JtYXRcbiAqIEByZXR1cm4ge0RhdGV9XG4gKi9cbkJhc2VUZW1wb3JhbEZpZWxkLnByb3RvdHlwZS5zdHJwZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlLCBmb3JtYXQpIHtcbiAgcmV0dXJuIHRpbWUuc3RycGRhdGUodmFsdWUsIGZvcm1hdClcbn1cblxuQmFzZVRlbXBvcmFsRmllbGQucHJvdG90eXBlLl9oYXNDaGFuZ2VkID0gZnVuY3Rpb24oaW5pdGlhbCwgZGF0YSkge1xuICB0cnkge1xuICAgIGRhdGEgPSB0aGlzLnRvSmF2YVNjcmlwdChkYXRhKVxuICB9XG4gIGNhdGNoIChlKSB7XG4gICAgaWYgKCEoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHsgdGhyb3cgZSB9XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICBpbml0aWFsID0gdGhpcy50b0phdmFTY3JpcHQoaW5pdGlhbClcbiAgaWYgKCEhaW5pdGlhbCAmJiAhIWRhdGEpIHtcbiAgICByZXR1cm4gaW5pdGlhbC5nZXRUaW1lKCkgIT09IGRhdGEuZ2V0VGltZSgpXG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIGluaXRpYWwgIT09IGRhdGFcbiAgfVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBpcyBhIGRhdGUuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtCYXNlVGVtcG9yYWxGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBEYXRlRmllbGQgPSBCYXNlVGVtcG9yYWxGaWVsZC5leHRlbmQoe1xuICB3aWRnZXQ6IHdpZGdldHMuRGF0ZUlucHV0XG4sIGlucHV0Rm9ybWF0czogdXRpbC5ERUZBVUxUX0RBVEVfSU5QVVRfRk9STUFUU1xuLCBkZWZhdWx0RXJyb3JNZXNzYWdlczoge1xuICAgIGludmFsaWQ6ICdFbnRlciBhIHZhbGlkIGRhdGUuJ1xuICB9XG5cbiwgY29uc3RydWN0b3I6IGZ1bmN0aW9uIERhdGVGaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgRGF0ZUZpZWxkKGt3YXJncykgfVxuICAgIEJhc2VUZW1wb3JhbEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IHRoZSBpbnB1dCBjYW4gYmUgY29udmVydGVkIHRvIGEgZGF0ZS5cbiAqIEBwYXJhbSB7U3RyaW5nfERhdGV9IHZhbHVlIHRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKiBAcmV0dXJuIHs/RGF0ZX0gYSB3aXRoIGl0cyB5ZWFyLCBtb250aCBhbmQgZGF5IGF0dHJpYnV0ZXMgc2V0LCBvciBudWxsIGZvclxuICogICAgIGVtcHR5IHZhbHVlcyB3aGVuIHRoZXkgYXJlIGFsbG93ZWQuXG4gKi9cbkRhdGVGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKHRoaXMuaXNFbXB0eVZhbHVlKHZhbHVlKSkge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgIHJldHVybiBuZXcgRGF0ZSh2YWx1ZS5nZXRGdWxsWWVhcigpLCB2YWx1ZS5nZXRNb250aCgpLCB2YWx1ZS5nZXREYXRlKCkpXG4gIH1cbiAgcmV0dXJuIEJhc2VUZW1wb3JhbEZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQuY2FsbCh0aGlzLCB2YWx1ZSlcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSB0aW1lLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7QmFzZVRlbXBvcmFsRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgVGltZUZpZWxkID0gQmFzZVRlbXBvcmFsRmllbGQuZXh0ZW5kKHtcbiAgd2lkZ2V0OiB3aWRnZXRzLlRpbWVJbnB1dFxuLCBpbnB1dEZvcm1hdHM6IHV0aWwuREVGQVVMVF9USU1FX0lOUFVUX0ZPUk1BVFNcbiwgZGVmYXVsdEVycm9yTWVzc2FnZXM6IHtcbiAgICBpbnZhbGlkOiAnRW50ZXIgYSB2YWxpZCB0aW1lLidcbiAgfVxuXG4sIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBUaW1lRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IFRpbWVGaWVsZChrd2FyZ3MpIH1cbiAgICBCYXNlVGVtcG9yYWxGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCB0aGUgaW5wdXQgY2FuIGJlIGNvbnZlcnRlZCB0byBhIHRpbWUuXG4gKiBAcGFyYW0ge1N0cmluZ3xEYXRlfSB2YWx1ZSB0aGUgdmFsdWUgdG8gYmUgdmFsaWRhdGVkLlxuICogQHJldHVybiB7P0RhdGV9IGEgRGF0ZSB3aXRoIGl0cyBob3VyLCBtaW51dGUgYW5kIHNlY29uZCBhdHRyaWJ1dGVzIHNldCwgb3JcbiAqICAgICBudWxsIGZvciBlbXB0eSB2YWx1ZXMgd2hlbiB0aGV5IGFyZSBhbGxvd2VkLlxuICovXG5UaW1lRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh0aGlzLmlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoMTkwMCwgMCwgMSwgdmFsdWUuZ2V0SG91cnMoKSwgdmFsdWUuZ2V0TWludXRlcygpLCB2YWx1ZS5nZXRTZWNvbmRzKCkpXG4gIH1cbiAgcmV0dXJuIEJhc2VUZW1wb3JhbEZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQuY2FsbCh0aGlzLCB2YWx1ZSlcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgRGF0ZSByZXByZXNlbnRpbmcgYSB0aW1lIGZyb20gdGhlIGdpdmVuIGlucHV0IGlmIGl0J3MgdmFsaWQgYmFzZWRcbiAqIG9uIHRoZSBmb3JtYXQuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBmb3JtYXRcbiAqIEByZXR1cm4ge0RhdGV9XG4gKi9cblRpbWVGaWVsZC5wcm90b3R5cGUuc3RycGRhdGUgPSBmdW5jdGlvbih2YWx1ZSwgZm9ybWF0KSB7XG4gIHZhciB0ID0gdGltZS5zdHJwdGltZSh2YWx1ZSwgZm9ybWF0KVxuICByZXR1cm4gbmV3IERhdGUoMTkwMCwgMCwgMSwgdFszXSwgdFs0XSwgdFs1XSlcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSBkYXRlL3RpbWUuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtCYXNlVGVtcG9yYWxGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBEYXRlVGltZUZpZWxkID0gQmFzZVRlbXBvcmFsRmllbGQuZXh0ZW5kKHtcbiAgd2lkZ2V0OiB3aWRnZXRzLkRhdGVUaW1lSW5wdXRcbiwgaW5wdXRGb3JtYXRzOiB1dGlsLkRFRkFVTFRfREFURVRJTUVfSU5QVVRfRk9STUFUU1xuLCBkZWZhdWx0RXJyb3JNZXNzYWdlczoge1xuICAgIGludmFsaWQ6ICdFbnRlciBhIHZhbGlkIGRhdGUvdGltZS4nXG4gIH1cblxuLCBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gRGF0ZVRpbWVGaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgRGF0ZVRpbWVGaWVsZChrd2FyZ3MpIH1cbiAgICBCYXNlVGVtcG9yYWxGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuLyoqXG4gKiBAcGFyYW0ge1N0cmluZ3xEYXRlfEFycmF5LjxEYXRlPn1cbiAqIEByZXR1cm4gez9EYXRlfVxuICovXG5EYXRlVGltZUZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAodGhpcy5pc0VtcHR5VmFsdWUodmFsdWUpKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cbiAgaWYgKGlzLkFycmF5KHZhbHVlKSkge1xuICAgIC8vIElucHV0IGNvbWVzIGZyb20gYSBTcGxpdERhdGVUaW1lV2lkZ2V0LCBmb3IgZXhhbXBsZSwgc28gaXQncyB0d29cbiAgICAvLyBjb21wb25lbnRzOiBkYXRlIGFuZCB0aW1lLlxuICAgIGlmICh2YWx1ZS5sZW5ndGggIT0gMikge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5pbnZhbGlkLCB7Y29kZTogJ2ludmFsaWQnfSlcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNFbXB0eVZhbHVlKHZhbHVlWzBdKSAmJiB0aGlzLmlzRW1wdHlWYWx1ZSh2YWx1ZVsxXSkpIHtcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuICAgIHZhbHVlID0gdmFsdWUuam9pbignICcpXG4gIH1cbiAgcmV0dXJuIEJhc2VUZW1wb3JhbEZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQuY2FsbCh0aGlzLCB2YWx1ZSlcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgbWF0Y2hlcyBhIGdpdmVuIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0NoYXJGaWVsZH1cbiAqIEBwYXJhbSB7e3JlZ2V4cHxzdHJpbmd9fSByZWdleFxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFJlZ2V4RmllbGQgPSBDaGFyRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFJlZ2V4RmllbGQocmVnZXgsIGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBSZWdleEZpZWxkKHJlZ2V4LCBrd2FyZ3MpIH1cbiAgICBDaGFyRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgaWYgKGlzLlN0cmluZyhyZWdleCkpIHtcbiAgICAgIHJlZ2V4ID0gbmV3IFJlZ0V4cChyZWdleClcbiAgICB9XG4gICAgdGhpcy5yZWdleCA9IHJlZ2V4XG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2godmFsaWRhdG9ycy5SZWdleFZhbGlkYXRvcih7cmVnZXg6IHRoaXMucmVnZXh9KSlcbiAgfVxufSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgYXBwZWFycyB0byBiZSBhIHZhbGlkIGUtbWFpbCBhZGRyZXNzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7Q2hhckZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEVtYWlsRmllbGQgPSBDaGFyRmllbGQuZXh0ZW5kKHtcbiAgd2lkZ2V0OiB3aWRnZXRzLkVtYWlsSW5wdXRcbiwgZGVmYXVsdFZhbGlkYXRvcnM6IFt2YWxpZGF0b3JzLnZhbGlkYXRlRW1haWxdXG5cbiwgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEVtYWlsRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IEVtYWlsRmllbGQoa3dhcmdzKSB9XG4gICAgQ2hhckZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuXG5FbWFpbEZpZWxkLnByb3RvdHlwZS5jbGVhbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhbHVlID0gdXRpbC5zdHJpcCh0aGlzLnRvSmF2YVNjcmlwdCh2YWx1ZSkpXG4gIHJldHVybiBDaGFyRmllbGQucHJvdG90eXBlLmNsZWFuLmNhbGwodGhpcywgdmFsdWUpXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGlzIGEgdmFsaWQgdXBsb2FkZWQgZmlsZS5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEZpbGVGaWVsZCA9IEZpZWxkLmV4dGVuZCh7XG4gIHdpZGdldDogd2lkZ2V0cy5DbGVhcmFibGVGaWxlSW5wdXRcbiwgZGVmYXVsdEVycm9yTWVzc2FnZXM6IHtcbiAgICBpbnZhbGlkOiAnTm8gZmlsZSB3YXMgc3VibWl0dGVkLiBDaGVjayB0aGUgZW5jb2RpbmcgdHlwZSBvbiB0aGUgZm9ybS4nXG4gICwgbWlzc2luZzogJ05vIGZpbGUgd2FzIHN1Ym1pdHRlZC4nXG4gICwgZW1wdHk6ICdUaGUgc3VibWl0dGVkIGZpbGUgaXMgZW1wdHkuJ1xuICAsIG1heExlbmd0aDogJ0Vuc3VyZSB0aGlzIGZpbGVuYW1lIGhhcyBhdCBtb3N0IHttYXh9IGNoYXJhY3RlcnMgKGl0IGhhcyB7bGVuZ3RofSkuJ1xuICAsIGNvbnRyYWRpY3RvbjogJ1BsZWFzZSBlaXRoZXIgc3VibWl0IGEgZmlsZSBvciBjaGVjayB0aGUgY2xlYXIgY2hlY2tib3gsIG5vdCBib3RoLidcbiAgfVxuXG4sIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBGaWxlRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IEZpbGVGaWVsZChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHttYXhMZW5ndGg6IG51bGwsIGFsbG93RW1wdHlGaWxlOiBmYWxzZX0sIGt3YXJncylcbiAgICB0aGlzLm1heExlbmd0aCA9IGt3YXJncy5tYXhMZW5ndGhcbiAgICB0aGlzLmFsbG93RW1wdHlGaWxlID0ga3dhcmdzLmFsbG93RW1wdHlGaWxlXG4gICAgZGVsZXRlIGt3YXJncy5tYXhMZW5ndGhcbiAgICBGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuRmlsZUZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbihkYXRhLCBpbml0aWFsKSB7XG4gIGlmICh0aGlzLmlzRW1wdHlWYWx1ZShkYXRhKSkge1xuICAgIHJldHVybiBudWxsXG4gIH1cblxuICBpZiAoZW52LmJyb3dzZXIpIHtcbiAgICByZXR1cm4gZGF0YVxuICB9XG5cbiAgLy8gVXBsb2FkZWRGaWxlIG9iamVjdHMgc2hvdWxkIGhhdmUgbmFtZSBhbmQgc2l6ZSBhdHRyaWJ1dGVzXG4gIGlmICh0eXBlb2YgZGF0YS5uYW1lID09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiBkYXRhLnNpemUgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWQsIHtjb2RlOiAnaW52YWxpZCd9KVxuICB9XG5cbiAgdmFyIGZpbGVOYW1lID0gZGF0YS5uYW1lXG4gIHZhciBmaWxlU2l6ZSA9IGRhdGEuc2l6ZVxuXG4gIGlmICh0aGlzLm1heExlbmd0aCAhPT0gbnVsbCAmJiBmaWxlTmFtZS5sZW5ndGggPiB0aGlzLm1heExlbmd0aCkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMubWF4TGVuZ3RoLCB7XG4gICAgICBjb2RlOiAnbWF4TGVuZ3RoJ1xuICAgICwgcGFyYW1zOiB7bWF4OiB0aGlzLm1heExlbmd0aCwgbGVuZ3RoOiBmaWxlTmFtZS5sZW5ndGh9XG4gICAgfSlcbiAgfVxuICBpZiAoIWZpbGVOYW1lKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5pbnZhbGlkLCB7Y29kZTogJ2ludmFsaWQnfSlcbiAgfVxuICBpZiAoIXRoaXMuYWxsb3dFbXB0eUZpbGUgJiYgIWZpbGVTaXplKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5lbXB0eSwge2NvZGU6ICdlbXB0eSd9KVxuICB9XG4gIHJldHVybiBkYXRhXG59XG5cbkZpbGVGaWVsZC5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbihkYXRhLCBpbml0aWFsKSB7XG4gIC8vIElmIHRoZSB3aWRnZXQgZ290IGNvbnRyYWRpY3RvcnkgaW5wdXRzLCB3ZSByYWlzZSBhIHZhbGlkYXRpb24gZXJyb3JcbiAgaWYgKGRhdGEgPT09IHdpZGdldHMuRklMRV9JTlBVVF9DT05UUkFESUNUSU9OKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5jb250cmFkaWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7Y29kZTogJ2NvbnRyYWRpY3Rpb24nfSlcbiAgfVxuICAvLyBmYWxzZSBtZWFucyB0aGUgZmllbGQgdmFsdWUgc2hvdWxkIGJlIGNsZWFyZWQ7IGZ1cnRoZXIgdmFsaWRhdGlvbiBpc1xuICAvLyBub3QgbmVlZGVkLlxuICBpZiAoZGF0YSA9PT0gZmFsc2UpIHtcbiAgICBpZiAoIXRoaXMucmVxdWlyZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICAvLyBJZiB0aGUgZmllbGQgaXMgcmVxdWlyZWQsIGNsZWFyaW5nIGlzIG5vdCBwb3NzaWJsZSAodGhlIHdpZGdldFxuICAgIC8vIHNob3VsZG4ndCByZXR1cm4gZmFsc2UgZGF0YSBpbiB0aGF0IGNhc2UgYW55d2F5KS4gZmFsc2UgaXMgbm90XG4gICAgLy8gaW4gRU1QVFlfVkFMVUVTOyBpZiBhIGZhbHNlIHZhbHVlIG1ha2VzIGl0IHRoaXMgZmFyIGl0IHNob3VsZCBiZVxuICAgIC8vIHZhbGlkYXRlZCBmcm9tIGhlcmUgb24gb3V0IGFzIG51bGwgKHNvIGl0IHdpbGwgYmUgY2F1Z2h0IGJ5IHRoZVxuICAgIC8vIHJlcXVpcmVkIGNoZWNrKS5cbiAgICBkYXRhID0gbnVsbFxuICB9XG4gIGlmICghZGF0YSAmJiBpbml0aWFsKSB7XG4gICAgcmV0dXJuIGluaXRpYWxcbiAgfVxuICByZXR1cm4gRmllbGQucHJvdG90eXBlLmNsZWFuLmNhbGwodGhpcywgZGF0YSlcbn1cblxuRmlsZUZpZWxkLnByb3RvdHlwZS5ib3VuZERhdGEgPSBmdW5jdGlvbihkYXRhLCBpbml0aWFsKSB7XG4gIGlmIChkYXRhID09PSBudWxsIHx8IGRhdGEgPT09IHdpZGdldHMuRklMRV9JTlBVVF9DT05UUkFESUNUSU9OKSB7XG4gICAgcmV0dXJuIGluaXRpYWxcbiAgfVxuICByZXR1cm4gZGF0YVxufVxuXG5GaWxlRmllbGQucHJvdG90eXBlLl9oYXNDaGFuZ2VkID0gZnVuY3Rpb24oaW5pdGlhbCwgZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIHJldHVybiB0cnVlXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGlzIGEgdmFsaWQgdXBsb2FkZWQgaW1hZ2UuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBJbWFnZUZpZWxkID0gRmlsZUZpZWxkLmV4dGVuZCh7XG4gIGRlZmF1bHRFcnJvck1lc3NhZ2VzOiB7XG4gICAgaW52YWxpZEltYWdlOiAnVXBsb2FkIGEgdmFsaWQgaW1hZ2UuIFRoZSBmaWxlIHlvdSB1cGxvYWRlZCB3YXMgZWl0aGVyIG5vdCBhbiBpbWFnZSBvciBhIGNvcnJ1cHRlZCBpbWFnZS4nXG4gIH1cblxuLCBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gSW1hZ2VGaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgSW1hZ2VGaWVsZChrd2FyZ3MpIH1cbiAgICBGaWxlRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5cbi8qKlxuICogQ2hlY2tzIHRoYXQgdGhlIGZpbGUtdXBsb2FkIGZpZWxkIGRhdGEgY29udGFpbnMgYSB2YWxpZCBpbWFnZS5cbiAqL1xuSW1hZ2VGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24oZGF0YSwgaW5pdGlhbCkge1xuICB2YXIgZiA9IEZpbGVGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0LmNhbGwodGhpcywgZGF0YSwgaW5pdGlhbClcbiAgaWYgKGYgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgLy8gVE9ETyBQbHVnIGluIGltYWdlIHByb2Nlc3NpbmcgY29kZSB3aGVuIHJ1bm5pbmcgb24gdGhlIHNlcnZlclxuXG4gIHJldHVybiBmXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGFwcGVhcnMgdG8gYmUgYSB2YWxpZCBVUkwuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtDaGFyRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgVVJMRmllbGQgPSBDaGFyRmllbGQuZXh0ZW5kKHtcbiAgd2lkZ2V0OiB3aWRnZXRzLlVSTElucHV0XG4sIGRlZmF1bHRFcnJvck1lc3NhZ2VzOiB7XG4gICAgaW52YWxpZDogJ0VudGVyIGEgdmFsaWQgVVJMLidcbiAgfVxuLCBkZWZhdWx0VmFsaWRhdG9yczogW3ZhbGlkYXRvcnMuVVJMVmFsaWRhdG9yKCldXG5cbiwgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFVSTEZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBVUkxGaWVsZChrd2FyZ3MpIH1cbiAgICBDaGFyRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5cblVSTEZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAodmFsdWUpIHtcbiAgICB2YXIgdXJsRmllbGRzID0gdXJsLnBhcnNlVXJpKHZhbHVlKVxuICAgIGlmICghdXJsRmllbGRzLnByb3RvY29sKSB7XG4gICAgICAvLyBJZiBubyBVUkwgcHJvdG9jb2wgZ2l2ZW4sIGFzc3VtZSBodHRwOi8vXG4gICAgICB1cmxGaWVsZHMucHJvdG9jb2wgPSAnaHR0cCdcbiAgICB9XG4gICAgaWYgKCF1cmxGaWVsZHMucGF0aCkge1xuICAgICAgLy8gVGhlIHBhdGggcG9ydGlvbiBtYXkgbmVlZCB0byBiZSBhZGRlZCBiZWZvcmUgcXVlcnkgcGFyYW1zXG4gICAgICB1cmxGaWVsZHMucGF0aCA9ICcvJ1xuICAgIH1cbiAgICB2YWx1ZSA9IHVybC5tYWtlVXJpKHVybEZpZWxkcylcbiAgfVxuICByZXR1cm4gQ2hhckZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQuY2FsbCh0aGlzLCB2YWx1ZSlcbn1cblxuVVJMRmllbGQucHJvdG90eXBlLmNsZWFuID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFsdWUgPSB1dGlsLnN0cmlwKHRoaXMudG9KYXZhU2NyaXB0KHZhbHVlKSlcbiAgcmV0dXJuIENoYXJGaWVsZC5wcm90b3R5cGUuY2xlYW4uY2FsbCh0aGlzLCB2YWx1ZSlcbn1cblxuLyoqXG4gKiBOb3JtYWxpc2VzIGl0cyBpbnB1dCB0byBhIEJvb2xlYW5wcmltaXRpdmUuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBCb29sZWFuRmllbGQgPSBGaWVsZC5leHRlbmQoe1xuICB3aWRnZXQ6IHdpZGdldHMuQ2hlY2tib3hJbnB1dFxuXG4sIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBCb29sZWFuRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IEJvb2xlYW5GaWVsZChrd2FyZ3MpIH1cbiAgICBGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuQm9vbGVhbkZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAvLyBFeHBsaWNpdGx5IGNoZWNrIGZvciBhICdmYWxzZScgc3RyaW5nLCB3aGljaCBpcyB3aGF0IGEgaGlkZGVuIGZpZWxkIHdpbGxcbiAgLy8gc3VibWl0IGZvciBmYWxzZS4gQWxzbyBjaGVjayBmb3IgJzAnLCBzaW5jZSB0aGlzIGlzIHdoYXQgUmFkaW9TZWxlY3Qgd2lsbFxuICAvLyBwcm92aWRlLiBCZWNhdXNlIEJvb2xlYW4oJ2FueXRoaW5nJykgPT0gdHJ1ZSwgd2UgZG9uJ3QgbmVlZCB0byBoYW5kbGUgdGhhdFxuICAvLyBleHBsaWNpdGx5LlxuICBpZiAoaXMuU3RyaW5nKHZhbHVlKSAmJiAodmFsdWUudG9Mb3dlckNhc2UoKSA9PSAnZmFsc2UnIHx8IHZhbHVlID09ICcwJykpIHtcbiAgICB2YWx1ZSA9IGZhbHNlXG4gIH1cbiAgZWxzZSB7XG4gICAgdmFsdWUgPSBCb29sZWFuKHZhbHVlKVxuICB9XG4gIHZhbHVlID0gRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdC5jYWxsKHRoaXMsIHZhbHVlKVxuICBpZiAoIXZhbHVlICYmIHRoaXMucmVxdWlyZWQpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLnJlcXVpcmVkLCB7Y29kZTogJ3JlcXVpcmVkJ30pXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbkJvb2xlYW5GaWVsZC5wcm90b3R5cGUuX2hhc0NoYW5nZWQgPSBmdW5jdGlvbihpbml0aWFsLCBkYXRhKSB7XG4gIC8vIFNvbWV0aW1lcyBkYXRhIG9yIGluaXRpYWwgY291bGQgYmUgbnVsbCBvciAnJyB3aGljaCBzaG91bGQgYmUgdGhlIHNhbWVcbiAgLy8gdGhpbmcgYXMgZmFsc2UuXG4gIGlmIChpbml0aWFsID09PSAnZmFsc2UnKSB7XG4gICAgLy8gc2hvd0hpZGRlbkluaXRpYWwgbWF5IGhhdmUgdHJhbnNmb3JtZWQgZmFsc2UgdG8gJ2ZhbHNlJ1xuICAgIGluaXRpYWwgPSBmYWxzZVxuICB9XG4gIHJldHVybiAoQm9vbGVhbihpbml0aWFsKSAhPSBCb29sZWFuKGRhdGEpKVxufVxuXG4vKipcbiAqIEEgZmllbGQgd2hvc2UgdmFsaWQgdmFsdWVzIGFyZSBudWxsLCB0cnVlIGFuZCBmYWxzZS5cbiAqIEludmFsaWQgdmFsdWVzIGFyZSBjbGVhbmVkIHRvIG51bGwuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtCb29sZWFuRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgTnVsbEJvb2xlYW5GaWVsZCA9IEJvb2xlYW5GaWVsZC5leHRlbmQoe1xuICB3aWRnZXQ6IHdpZGdldHMuTnVsbEJvb2xlYW5TZWxlY3RcblxuLCBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gTnVsbEJvb2xlYW5GaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgTnVsbEJvb2xlYW5GaWVsZChrd2FyZ3MpIH1cbiAgICBCb29sZWFuRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5cbk51bGxCb29sZWFuRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIC8vIEV4cGxpY2l0bHkgY2hlY2tzIGZvciB0aGUgc3RyaW5nICdUcnVlJyBhbmQgJ0ZhbHNlJywgd2hpY2ggaXMgd2hhdCBhXG4gIC8vIGhpZGRlbiBmaWVsZCB3aWxsIHN1Ym1pdCBmb3IgdHJ1ZSBhbmQgZmFsc2UsIGFuZCBmb3IgJzEnIGFuZCAnMCcsIHdoaWNoXG4gIC8vIGlzIHdoYXQgYSBSYWRpb0ZpZWxkIHdpbGwgc3VibWl0LiBVbmxpa2UgdGhlIEJvb2xlYW5maWVsZCB3ZSBhbHNvIG5lZWRcbiAgLy8gdG8gY2hlY2sgZm9yIHRydWUsIGJlY2F1c2Ugd2UgYXJlIG5vdCB1c2luZyBCb29sZWFuKCkgZnVuY3Rpb24uXG4gIGlmICh2YWx1ZSA9PT0gdHJ1ZSB8fCB2YWx1ZSA9PSAnVHJ1ZScgfHwgdmFsdWUgPT0gJ3RydWUnIHx8IHZhbHVlID09ICcxJykge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgZWxzZSBpZiAodmFsdWUgPT09IGZhbHNlIHx8IHZhbHVlID09ICdGYWxzZScgfHwgdmFsdWUgPT0gJ2ZhbHNlJyB8fCB2YWx1ZSA9PSAnMCcpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG5OdWxsQm9vbGVhbkZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7fVxuXG5OdWxsQm9vbGVhbkZpZWxkLnByb3RvdHlwZS5faGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKGluaXRpYWwsIGRhdGEpIHtcbiAgLy8gbnVsbCAodW5rbm93bikgYW5kIGZhbHNlIChObykgYXJlIG5vdCB0aGUgc2FtZVxuICBpZiAoaW5pdGlhbCAhPT0gbnVsbCkge1xuICAgICAgaW5pdGlhbCA9IEJvb2xlYW4oaW5pdGlhbClcbiAgfVxuICBpZiAoZGF0YSAhPT0gbnVsbCkge1xuICAgICAgZGF0YSA9IEJvb2xlYW4oZGF0YSlcbiAgfVxuICByZXR1cm4gaW5pdGlhbCAhPSBkYXRhXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGlzIG9uZSBvZiBhIHZhbGlkIGxpc3Qgb2YgY2hvaWNlcy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIENob2ljZUZpZWxkID0gRmllbGQuZXh0ZW5kKHtcbiAgd2lkZ2V0OiB3aWRnZXRzLlNlbGVjdFxuLCBkZWZhdWx0RXJyb3JNZXNzYWdlczoge1xuICAgIGludmFsaWRDaG9pY2U6ICdTZWxlY3QgYSB2YWxpZCBjaG9pY2UuIHt2YWx1ZX0gaXMgbm90IG9uZSBvZiB0aGUgYXZhaWxhYmxlIGNob2ljZXMuJ1xuICB9XG5cbiwgY29uc3RydWN0b3I6IGZ1bmN0aW9uIENob2ljZUZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBDaG9pY2VGaWVsZChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtjaG9pY2VzOiBbXX0sIGt3YXJncylcbiAgICBGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgICB0aGlzLnNldENob2ljZXMoa3dhcmdzLmNob2ljZXMpXG4gIH1cbn0pXG5cbkNob2ljZUZpZWxkLnByb3RvdHlwZS5jaG9pY2VzID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9jaG9pY2VzIH1cbkNob2ljZUZpZWxkLnByb3RvdHlwZS5zZXRDaG9pY2VzID0gZnVuY3Rpb24oY2hvaWNlcykge1xuICAvLyBTZXR0aW5nIGNob2ljZXMgYWxzbyBzZXRzIHRoZSBjaG9pY2VzIG9uIHRoZSB3aWRnZXRcbiAgdGhpcy5fY2hvaWNlcyA9IHRoaXMud2lkZ2V0LmNob2ljZXMgPSBjaG9pY2VzXG59XG5cbkNob2ljZUZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAodGhpcy5pc0VtcHR5VmFsdWUodmFsdWUpKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cbiAgcmV0dXJuICcnK3ZhbHVlXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgdGhlIGdpdmVuIHZhbHVlIGlzIGluIHRoaXMgZmllbGQncyBjaG9pY2VzLlxuICovXG5DaG9pY2VGaWVsZC5wcm90b3R5cGUudmFsaWRhdGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBGaWVsZC5wcm90b3R5cGUudmFsaWRhdGUuY2FsbCh0aGlzLCB2YWx1ZSlcbiAgaWYgKHZhbHVlICYmICF0aGlzLnZhbGlkVmFsdWUodmFsdWUpKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5pbnZhbGlkQ2hvaWNlLCB7XG4gICAgICBjb2RlOiAnaW52YWxpZENob2ljZSdcbiAgICAsIHBhcmFtczoge3ZhbHVlOiB2YWx1ZX1cbiAgICB9KVxuICB9XG59XG5cbi8qKlxuICogQ2hlY2tzIHRvIHNlZSBpZiB0aGUgcHJvdmlkZWQgdmFsdWUgaXMgYSB2YWxpZCBjaG9pY2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIHRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKi9cbkNob2ljZUZpZWxkLnByb3RvdHlwZS52YWxpZFZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIGNob2ljZXMgPSB0aGlzLmNob2ljZXMoKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGNob2ljZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKGlzLkFycmF5KGNob2ljZXNbaV1bMV0pKSB7XG4gICAgICAvLyBUaGlzIGlzIGFuIG9wdGdyb3VwLCBzbyBsb29rIGluc2lkZSB0aGUgZ3JvdXAgZm9yIG9wdGlvbnNcbiAgICAgIHZhciBvcHRncm91cENob2ljZXMgPSBjaG9pY2VzW2ldWzFdXG4gICAgICBmb3IgKHZhciBqID0gMCwgayA9IG9wdGdyb3VwQ2hvaWNlcy5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgaWYgKHZhbHVlID09PSAnJytvcHRncm91cENob2ljZXNbal1bMF0pIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHZhbHVlID09PSAnJytjaG9pY2VzW2ldWzBdKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBBIENob2ljZUZpZWxkIHdoaWNoIHJldHVybnMgYSB2YWx1ZSBjb2VyY2VkIGJ5IHNvbWUgcHJvdmlkZWQgZnVuY3Rpb24uXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtDaG9pY2VGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBUeXBlZENob2ljZUZpZWxkID0gQ2hvaWNlRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFR5cGVkQ2hvaWNlRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IFR5cGVkQ2hvaWNlRmllbGQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7XG4gICAgICBjb2VyY2U6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gdmFsIH0sIGVtcHR5VmFsdWU6ICcnXG4gICAgfSwga3dhcmdzKVxuICAgIHRoaXMuY29lcmNlID0gb2JqZWN0LnBvcChrd2FyZ3MsICdjb2VyY2UnKVxuICAgIHRoaXMuZW1wdHlWYWx1ZSA9IG9iamVjdC5wb3Aoa3dhcmdzLCAnZW1wdHlWYWx1ZScpXG4gICAgQ2hvaWNlRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5cbi8qKlxuICogVmFsaWRhdGUgdGhhdCB0aGUgdmFsdWUgY2FuIGJlIGNvZXJjZWQgdG8gdGhlIHJpZ2h0IHR5cGUgKGlmIG5vdCBlbXB0eSkuXG4gKi9cblR5cGVkQ2hvaWNlRmllbGQucHJvdG90eXBlLl9jb2VyY2UgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IHRoaXMuZW1wdHlWYWx1ZSB8fCB0aGlzLmlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdGhpcy5lbXB0eVZhbHVlXG4gIH1cbiAgdHJ5IHtcbiAgICB2YWx1ZSA9IHRoaXMuY29lcmNlKHZhbHVlKVxuICB9XG4gIGNhdGNoIChlKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5pbnZhbGlkQ2hvaWNlLCB7XG4gICAgICBjb2RlOiAnaW52YWxpZENob2ljZSdcbiAgICAsIHBhcmFtczoge3ZhbHVlOiB2YWx1ZX1cbiAgICB9KVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG5UeXBlZENob2ljZUZpZWxkLnByb3RvdHlwZS5jbGVhbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhbHVlID0gQ2hvaWNlRmllbGQucHJvdG90eXBlLmNsZWFuLmNhbGwodGhpcywgdmFsdWUpXG4gIHJldHVybiB0aGlzLl9jb2VyY2UodmFsdWUpXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGlzIG9uZSBvciBtb3JlIG9mIGEgdmFsaWQgbGlzdCBvZiBjaG9pY2VzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7Q2hvaWNlRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgTXVsdGlwbGVDaG9pY2VGaWVsZCA9IENob2ljZUZpZWxkLmV4dGVuZCh7XG4gIGhpZGRlbldpZGdldDogd2lkZ2V0cy5NdWx0aXBsZUhpZGRlbklucHV0XG4sIHdpZGdldDogd2lkZ2V0cy5TZWxlY3RNdWx0aXBsZVxuLCBkZWZhdWx0RXJyb3JNZXNzYWdlczoge1xuICAgIGludmFsaWRDaG9pY2U6ICdTZWxlY3QgYSB2YWxpZCBjaG9pY2UuIHt2YWx1ZX0gaXMgbm90IG9uZSBvZiB0aGUgYXZhaWxhYmxlIGNob2ljZXMuJ1xuICAsIGludmFsaWRMaXN0OiAnRW50ZXIgYSBsaXN0IG9mIHZhbHVlcy4nXG4gIH1cblxuLCBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gTXVsdGlwbGVDaG9pY2VGaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgTXVsdGlwbGVDaG9pY2VGaWVsZChrd2FyZ3MpIH1cbiAgICBDaG9pY2VGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuTXVsdGlwbGVDaG9pY2VGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKCF2YWx1ZSkge1xuICAgIHJldHVybiBbXVxuICB9XG4gIGVsc2UgaWYgKCEoaXMuQXJyYXkodmFsdWUpKSkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZExpc3QsIHtjb2RlOiAnaW52YWxpZExpc3QnfSlcbiAgfVxuICB2YXIgc3RyaW5nVmFsdWVzID0gW11cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBzdHJpbmdWYWx1ZXMucHVzaCgnJyt2YWx1ZVtpXSlcbiAgfVxuICByZXR1cm4gc3RyaW5nVmFsdWVzXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgdGhlIGlucHV0IGlzIGEgbGlzdCBhbmQgdGhhdCBlYWNoIGl0ZW0gaXMgaW4gdGhpcyBmaWVsZCdzXG4gKiBjaG9pY2VzLlxuICovXG5NdWx0aXBsZUNob2ljZUZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh0aGlzLnJlcXVpcmVkICYmICF2YWx1ZS5sZW5ndGgpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLnJlcXVpcmVkLCB7Y29kZTogJ3JlcXVpcmVkJ30pXG4gIH1cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoIXRoaXMudmFsaWRWYWx1ZSh2YWx1ZVtpXSkpIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZENob2ljZSwge1xuICAgICAgICBjb2RlOiAnaW52YWxpZENob2ljZSdcbiAgICAgICwgcGFyYW1zOiB7dmFsdWU6IHZhbHVlW2ldfVxuICAgICAgfSlcbiAgICB9XG4gIH1cbn1cblxuTXVsdGlwbGVDaG9pY2VGaWVsZC5wcm90b3R5cGUuX2hhc0NoYW5nZWQgPSBmdW5jdGlvbihpbml0aWFsLCBkYXRhKSB7XG4gIGlmIChpbml0aWFsID09PSBudWxsKSB7XG4gICAgaW5pdGlhbCA9IFtdXG4gIH1cbiAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICBkYXRhID0gW11cbiAgfVxuICBpZiAoaW5pdGlhbC5sZW5ndGggIT0gZGF0YS5sZW5ndGgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHZhciBkYXRhTG9va3VwID0gb2JqZWN0Lmxvb2t1cChkYXRhKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGluaXRpYWwubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHR5cGVvZiBkYXRhTG9va3VwWycnK2luaXRpYWxbaV1dID09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBBTXVsdGlwbGVDaG9pY2VGaWVsZCB3aGljaCByZXR1cm5zIHZhbHVlcyBjb2VyY2VkIGJ5IHNvbWUgcHJvdmlkZWQgZnVuY3Rpb24uXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtNdWx0aXBsZUNob2ljZUZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFR5cGVkTXVsdGlwbGVDaG9pY2VGaWVsZCA9IE11bHRpcGxlQ2hvaWNlRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFR5cGVkTXVsdGlwbGVDaG9pY2VGaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgVHlwZWRNdWx0aXBsZUNob2ljZUZpZWxkKGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgICAgY29lcmNlOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIHZhbCB9LCBlbXB0eVZhbHVlOiBbXVxuICAgIH0sIGt3YXJncylcbiAgICB0aGlzLmNvZXJjZSA9IG9iamVjdC5wb3Aoa3dhcmdzLCAnY29lcmNlJylcbiAgICB0aGlzLmVtcHR5VmFsdWUgPSBvYmplY3QucG9wKGt3YXJncywgJ2VtcHR5VmFsdWUnKVxuICAgIE11bHRpcGxlQ2hvaWNlRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5cblR5cGVkTXVsdGlwbGVDaG9pY2VGaWVsZC5wcm90b3R5cGUuX2NvZXJjZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PT0gdGhpcy5lbXB0eVZhbHVlIHx8IHRoaXMuaXNFbXB0eVZhbHVlKHZhbHVlKSB8fFxuICAgICAgKGlzLkFycmF5KHZhbHVlKSAmJiAhdmFsdWUubGVuZ3RoKSkge1xuICAgIHJldHVybiB0aGlzLmVtcHR5VmFsdWVcbiAgfVxuICB2YXIgbmV3VmFsdWUgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHRyeSB7XG4gICAgICBuZXdWYWx1ZS5wdXNoKHRoaXMuY29lcmNlKHZhbHVlW2ldKSlcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZENob2ljZSwge1xuICAgICAgICBjb2RlOiAnaW52YWxpZENob2ljZSdcbiAgICAgICwgcGFyYW1zOiB7dmFsdWU6IHZhbHVlW2ldfVxuICAgICAgfSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5ld1ZhbHVlXG59XG5cblR5cGVkTXVsdGlwbGVDaG9pY2VGaWVsZC5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IE11bHRpcGxlQ2hvaWNlRmllbGQucHJvdG90eXBlLmNsZWFuLmNhbGwodGhpcywgdmFsdWUpXG4gIHJldHVybiB0aGlzLl9jb2VyY2UodmFsdWUpXG59XG5cblR5cGVkTXVsdGlwbGVDaG9pY2VGaWVsZC5wcm90b3R5cGUudmFsaWRhdGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAodmFsdWUgIT09IHRoaXMuZW1wdHlWYWx1ZSB8fCAoaXMuQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCkpIHtcbiAgICBNdWx0aXBsZUNob2ljZUZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZS5jYWxsKHRoaXMsIHZhbHVlKVxuICB9XG4gIGVsc2UgaWYgKHRoaXMucmVxdWlyZWQpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLnJlcXVpcmVkLCB7Y29kZTogJ3JlcXVpcmVkJ30pXG4gIH1cbn1cblxuLyoqXG4gKiBBbGxvd3MgY2hvb3NpbmcgZnJvbSBmaWxlcyBpbnNpZGUgYSBjZXJ0YWluIGRpcmVjdG9yeS5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0Nob2ljZUZpZWxkfVxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBGaWxlUGF0aEZpZWxkID0gQ2hvaWNlRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEZpbGVQYXRoRmllbGQocGF0aCwga3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IEZpbGVQYXRoRmllbGQocGF0aCwga3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7XG4gICAgICBtYXRjaDogbnVsbCwgcmVjdXJzaXZlOiBmYWxzZSwgcmVxdWlyZWQ6IHRydWUsIHdpZGdldDogbnVsbCxcbiAgICAgIGxhYmVsOiBudWxsLCBpbml0aWFsOiBudWxsLCBoZWxwVGV4dDogbnVsbFxuICAgIH0sIGt3YXJncylcblxuICAgIHRoaXMucGF0aCA9IHBhdGhcbiAgICB0aGlzLm1hdGNoID0ga3dhcmdzLm1hdGNoXG4gICAgdGhpcy5yZWN1cnNpdmUgPSBrd2FyZ3MucmVjdXJzaXZlXG4gICAgZGVsZXRlIGt3YXJncy5tYXRjaFxuICAgIGRlbGV0ZSBrd2FyZ3MucmVjdXJzaXZlXG5cbiAgICBrd2FyZ3MuY2hvaWNlcyA9IFtdXG4gICAgQ2hvaWNlRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG5cbiAgICBpZiAodGhpcy5yZXF1aXJlZCkge1xuICAgICAgdGhpcy5zZXRDaG9pY2VzKFtdKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuc2V0Q2hvaWNlcyhbWycnLCAnLS0tLS0tLS0tJ11dKVxuICAgIH1cbiAgICBpZiAodGhpcy5tYXRjaCAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5tYXRjaFJFID0gbmV3IFJlZ0V4cCh0aGlzLm1hdGNoKVxuICAgIH1cblxuICAgIC8vIFRPRE8gUGx1ZyBpbiBmaWxlIHBhdGhzIHdoZW4gcnVubmluZyBvbiB0aGUgc2VydmVyXG5cbiAgICB0aGlzLndpZGdldC5jaG9pY2VzID0gdGhpcy5jaG9pY2VzKClcbiAgfVxufSlcblxuLyoqXG4gKiBBIEZpZWxkIHdob3NlIGNsZWFuKCkgbWV0aG9kIGNhbGxzIG11bHRpcGxlIEZpZWxkIGNsZWFuKCkgbWV0aG9kcy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIENvbWJvRmllbGQgPSBGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gQ29tYm9GaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgQ29tYm9GaWVsZChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtmaWVsZHM6IFtdfSwga3dhcmdzKVxuICAgIEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICAgIC8vIFNldCByZXF1aXJlZCB0byBGYWxzZSBvbiB0aGUgaW5kaXZpZHVhbCBmaWVsZHMsIGJlY2F1c2UgdGhlIHJlcXVpcmVkXG4gICAgLy8gdmFsaWRhdGlvbiB3aWxsIGJlIGhhbmRsZWQgYnkgQ29tYm9GaWVsZCwgbm90IGJ5IHRob3NlIGluZGl2aWR1YWwgZmllbGRzLlxuICAgIGZvciAodmFyIGkgPSAwLCBsID0ga3dhcmdzLmZpZWxkcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGt3YXJncy5maWVsZHNbaV0ucmVxdWlyZWQgPSBmYWxzZVxuICAgIH1cbiAgICB0aGlzLmZpZWxkcyA9IGt3YXJncy5maWVsZHNcbiAgfVxufSlcblxuQ29tYm9GaWVsZC5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICBGaWVsZC5wcm90b3R5cGUuY2xlYW4uY2FsbCh0aGlzLCB2YWx1ZSlcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmZpZWxkcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YWx1ZSA9IHRoaXMuZmllbGRzW2ldLmNsZWFuKHZhbHVlKVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIEEgRmllbGQgdGhhdCBhZ2dyZWdhdGVzIHRoZSBsb2dpYyBvZiBtdWx0aXBsZSBGaWVsZHMuXG4gKlxuICogSXRzIGNsZWFuKCkgbWV0aG9kIHRha2VzIGEgXCJkZWNvbXByZXNzZWRcIiBsaXN0IG9mIHZhbHVlcywgd2hpY2ggYXJlIHRoZW5cbiAqIGNsZWFuZWQgaW50byBhIHNpbmdsZSB2YWx1ZSBhY2NvcmRpbmcgdG8gdGhpcy5maWVsZHMuIEVhY2ggdmFsdWUgaW4gdGhpc1xuICogbGlzdCBpcyBjbGVhbmVkIGJ5IHRoZSBjb3JyZXNwb25kaW5nIGZpZWxkIC0tIHRoZSBmaXJzdCB2YWx1ZSBpcyBjbGVhbmVkIGJ5XG4gKiB0aGUgZmlyc3QgZmllbGQsIHRoZSBzZWNvbmQgdmFsdWUgaXMgY2xlYW5lZCBieSB0aGUgc2Vjb25kIGZpZWxkLCBldGMuIE9uY2VcbiAqIGFsbCBmaWVsZHMgYXJlIGNsZWFuZWQsIHRoZSBsaXN0IG9mIGNsZWFuIHZhbHVlcyBpcyBcImNvbXByZXNzZWRcIiBpbnRvIGFcbiAqIHNpbmdsZSB2YWx1ZS5cbiAqXG4gKiBTdWJjbGFzc2VzIHNob3VsZCBub3QgaGF2ZSB0byBpbXBsZW1lbnQgY2xlYW4oKS4gSW5zdGVhZCwgdGhleSBtdXN0XG4gKiBpbXBsZW1lbnQgY29tcHJlc3MoKSwgd2hpY2ggdGFrZXMgYSBsaXN0IG9mIHZhbGlkIHZhbHVlcyBhbmQgcmV0dXJucyBhXG4gKiBcImNvbXByZXNzZWRcIiB2ZXJzaW9uIG9mIHRob3NlIHZhbHVlcyAtLSBhIHNpbmdsZSB2YWx1ZS5cbiAqXG4gKiBZb3UnbGwgcHJvYmFibHkgd2FudCB0byB1c2UgdGhpcyB3aXRoIE11bHRpV2lkZ2V0LlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIE11bHRpVmFsdWVGaWVsZCA9IEZpZWxkLmV4dGVuZCh7XG4gIGRlZmF1bHRFcnJvck1lc3NhZ2VzOiB7XG4gICAgaW52YWxpZDogJ0VudGVyIGEgbGlzdCBvZiB2YWx1ZXMuJ1xuICAsIGluY29tcGxldGU6ICdFbnRlciBhIGNvbXBsZXRlIHZhbHVlLidcbiAgfVxuXG4sIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBNdWx0aVZhbHVlRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IE11bHRpVmFsdWVGaWVsZChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtmaWVsZHM6IFtdfSwga3dhcmdzKVxuICAgIHRoaXMucmVxdWlyZUFsbEZpZWxkcyA9IG9iamVjdC5wb3Aoa3dhcmdzLCAncmVxdWlyZUFsbEZpZWxkcycsIHRydWUpXG4gICAgRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGt3YXJncy5maWVsZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIgZiA9IGt3YXJncy5maWVsZHNbaV1cbiAgICAgIG9iamVjdC5zZXREZWZhdWx0KGYuZXJyb3JNZXNzYWdlcywgJ2luY29tcGxldGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lcnJvck1lc3NhZ2VzLmluY29tcGxldGUpXG4gICAgICBpZiAodGhpcy5yZXF1aXJlQWxsRmllbGRzKSB7XG4gICAgICAgIC8vIFNldCByZXF1aXJlZCB0byBmYWxzZSBvbiB0aGUgaW5kaXZpZHVhbCBmaWVsZHMsIGJlY2F1c2UgdGhlIHJlcXVpcmVkXG4gICAgICAgIC8vIHZhbGlkYXRpb24gd2lsbCBiZSBoYW5kbGVkIGJ5IE11bHRpVmFsdWVGaWVsZCwgbm90IGJ5IHRob3NlXG4gICAgICAgIC8vIGluZGl2aWR1YWwgZmllbGRzLlxuICAgICAgICBmLnJlcXVpcmVkID0gZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5maWVsZHMgPSBrd2FyZ3MuZmllbGRzXG4gIH1cbn0pXG5cbk11bHRpVmFsdWVGaWVsZC5wcm90b3R5cGUudmFsaWRhdGUgPSBmdW5jdGlvbigpIHt9XG5cbi8qKlxuICogVmFsaWRhdGVzIGV2ZXJ5IHZhbHVlIGluIHRoZSBnaXZlbiBsaXN0LiBBIHZhbHVlIGlzIHZhbGlkYXRlZCBhZ2FpbnN0IHRoZVxuICogY29ycmVzcG9uZGluZyBGaWVsZCBpbiB0aGlzLmZpZWxkcy5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgaWYgdGhpcyBNdWx0aVZhbHVlRmllbGQgd2FzIGluc3RhbnRpYXRlZCB3aXRoXG4gKiB7ZmllbGRzOiBbZm9ybXMuRGF0ZUZpZWxkKCksIGZvcm1zLlRpbWVGaWVsZCgpXX0sIGNsZWFuKCkgd291bGQgY2FsbFxuICogRGF0ZUZpZWxkLmNsZWFuKHZhbHVlWzBdKSBhbmQgVGltZUZpZWxkLmNsZWFuKHZhbHVlWzFdKS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2YWx1ZSB0aGUgaW5wdXQgdG8gYmUgdmFsaWRhdGVkLlxuICpcbiAqIEByZXR1cm4gdGhlIHJlc3VsdCBvZiBjYWxsaW5nIGNvbXByZXNzKCkgb24gdGhlIGNsZWFuZWQgaW5wdXQuXG4gKi9cbk11bHRpVmFsdWVGaWVsZC5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YXIgY2xlYW5EYXRhID0gW11cbiAgdmFyIGVycm9ycyA9IFtdXG5cbiAgaWYgKCF2YWx1ZSB8fCBpcy5BcnJheSh2YWx1ZSkpIHtcbiAgICB2YXIgYWxsVmFsdWVzRW1wdHkgPSB0cnVlXG4gICAgaWYgKGlzLkFycmF5KHZhbHVlKSkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYgKHZhbHVlW2ldKSB7XG4gICAgICAgICAgYWxsVmFsdWVzRW1wdHkgPSBmYWxzZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXZhbHVlIHx8IGFsbFZhbHVlc0VtcHR5KSB7XG4gICAgICBpZiAodGhpcy5yZXF1aXJlZCkge1xuICAgICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLnJlcXVpcmVkLCB7Y29kZTogJ3JlcXVpcmVkJ30pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29tcHJlc3MoW10pXG4gICAgICB9XG4gICAgfVxuICB9XG4gIGVsc2Uge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZCwge2NvZGU6ICdpbnZhbGlkJ30pXG4gIH1cblxuICBmb3IgKGkgPSAwLCBsID0gdGhpcy5maWVsZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIGZpZWxkID0gdGhpcy5maWVsZHNbaV1cbiAgICB2YXIgZmllbGRWYWx1ZSA9IHZhbHVlW2ldXG4gICAgaWYgKGZpZWxkVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZmllbGRWYWx1ZSA9IG51bGxcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNFbXB0eVZhbHVlKGZpZWxkVmFsdWUpKSB7XG4gICAgICBpZiAodGhpcy5yZXF1aXJlQWxsRmllbGRzKSB7XG4gICAgICAgIC8vIFRocm93IGEgJ3JlcXVpcmVkJyBlcnJvciBpZiB0aGUgTXVsdGlWYWx1ZUZpZWxkIGlzIHJlcXVpcmVkIGFuZCBhbnlcbiAgICAgICAgLy8gZmllbGQgaXMgZW1wdHkuXG4gICAgICAgIGlmICh0aGlzLnJlcXVpcmVkKSB7XG4gICAgICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5yZXF1aXJlZCwge2NvZGU6ICdyZXF1aXJlZCd9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChmaWVsZC5yZXF1aXJlZCkge1xuICAgICAgICAvLyBPdGhlcndpc2UsIGFkZCBhbiAnaW5jb21wbGV0ZScgZXJyb3IgdG8gdGhlIGxpc3Qgb2YgY29sbGVjdGVkIGVycm9yc1xuICAgICAgICAvLyBhbmQgc2tpcCBmaWVsZCBjbGVhbmluZywgaWYgYSByZXF1aXJlZCBmaWVsZCBpcyBlbXB0eS5cbiAgICAgICAgaWYgKGVycm9ycy5pbmRleE9mKGZpZWxkLmVycm9yTWVzc2FnZXMuaW5jb21wbGV0ZSkgPT0gLTEpIHtcbiAgICAgICAgICBlcnJvcnMucHVzaChmaWVsZC5lcnJvck1lc3NhZ2VzLmluY29tcGxldGUpXG4gICAgICAgIH1cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY2xlYW5EYXRhLnB1c2goZmllbGQuY2xlYW4oZmllbGRWYWx1ZSkpXG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBpZiAoIShlIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSkgeyB0aHJvdyBlIH1cbiAgICAgIC8vIENvbGxlY3QgYWxsIHZhbGlkYXRpb24gZXJyb3JzIGluIGEgc2luZ2xlIGxpc3QsIHdoaWNoIHdlJ2xsIHRocm93IGF0XG4gICAgICAvLyB0aGUgZW5kIG9mIGNsZWFuKCksIHJhdGhlciB0aGFuIHRocm93aW5nIGEgc2luZ2xlIGV4Y2VwdGlvbiBmb3IgdGhlXG4gICAgICAvLyBmaXJzdCBlcnJvciB3ZSBlbmNvdW50ZXIuIFNraXAgZHVwbGljYXRlcy5cbiAgICAgIGVycm9ycyA9IGVycm9ycy5jb25jYXQoZS5tZXNzYWdlcygpLmZpbHRlcihmdW5jdGlvbihtKSB7XG4gICAgICAgIHJldHVybiBlcnJvcnMuaW5kZXhPZihtKSA9PSAtMVxuICAgICAgfSkpXG4gICAgfVxuICB9XG5cbiAgaWYgKGVycm9ycy5sZW5ndGggIT09IDApIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IoZXJyb3JzKVxuICB9XG5cbiAgdmFyIG91dCA9IHRoaXMuY29tcHJlc3MoY2xlYW5EYXRhKVxuICB0aGlzLnZhbGlkYXRlKG91dClcbiAgdGhpcy5ydW5WYWxpZGF0b3JzKG91dClcbiAgcmV0dXJuIG91dFxufVxuXG4vKipcbiAqIFJldHVybnMgYSBzaW5nbGUgdmFsdWUgZm9yIHRoZSBnaXZlbiBsaXN0IG9mIHZhbHVlcy4gVGhlIHZhbHVlcyBjYW4gYmVcbiAqIGFzc3VtZWQgdG8gYmUgdmFsaWQuXG4gKlxuICogRm9yIGV4YW1wbGUsIGlmIHRoaXMgTXVsdGlWYWx1ZUZpZWxkIHdhcyBpbnN0YW50aWF0ZWQgd2l0aFxuICoge2ZpZWxkczogW2Zvcm1zLkRhdGVGaWVsZCgpLCBmb3Jtcy5UaW1lRmllbGQoKV19LCB0aGlzIG1pZ2h0IHJldHVybiBhIERhdGVcbiAqIG9iamVjdCBjcmVhdGVkIGJ5IGNvbWJpbmluZyB0aGUgZGF0ZSBhbmQgdGltZSBpbiBkYXRhTGlzdC5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBkYXRhTGlzdFxuICovXG5NdWx0aVZhbHVlRmllbGQucHJvdG90eXBlLmNvbXByZXNzID0gZnVuY3Rpb24oZGF0YUxpc3QpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdTdWJjbGFzc2VzIG11c3QgaW1wbGVtZW50IHRoaXMgbWV0aG9kLicpXG59XG5cbk11bHRpVmFsdWVGaWVsZC5wcm90b3R5cGUuX2hhc0NoYW5nZWQgPSBmdW5jdGlvbihpbml0aWFsLCBkYXRhKSB7XG4gIGlmIChpbml0aWFsID09PSBudWxsKSB7XG4gICAgaW5pdGlhbCA9IFtdXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgaW5pdGlhbC5wdXNoKCcnKVxuICAgIH1cbiAgfVxuICBlbHNlIGlmICghKGlzLkFycmF5KGluaXRpYWwpKSkge1xuICAgIGluaXRpYWwgPSB0aGlzLndpZGdldC5kZWNvbXByZXNzKGluaXRpYWwpXG4gIH1cblxuICBmb3IgKGkgPSAwLCBsID0gdGhpcy5maWVsZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHRoaXMuZmllbGRzW2ldLl9oYXNDaGFuZ2VkKGluaXRpYWxbaV0sIGRhdGFbaV0pKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBBIE11bHRpVmFsdWVGaWVsZCBjb25zaXN0aW5nIG9mIGEgRGF0ZUZpZWxkIGFuZCBhIFRpbWVGaWVsZC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge011bHRpVmFsdWVGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBTcGxpdERhdGVUaW1lRmllbGQgPSBNdWx0aVZhbHVlRmllbGQuZXh0ZW5kKHtcbiAgaGlkZGVuV2lkZ2V0OiB3aWRnZXRzLlNwbGl0SGlkZGVuRGF0ZVRpbWVXaWRnZXRcbiwgd2lkZ2V0OiB3aWRnZXRzLlNwbGl0RGF0ZVRpbWVXaWRnZXRcbiwgZGVmYXVsdEVycm9yTWVzc2FnZXM6IHtcbiAgICBpbnZhbGlkRGF0ZTogJ0VudGVyIGEgdmFsaWQgZGF0ZS4nXG4gICwgaW52YWxpZFRpbWU6ICdFbnRlciBhIHZhbGlkIHRpbWUuJ1xuICB9XG5cbiwgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFNwbGl0RGF0ZVRpbWVGaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgU3BsaXREYXRlVGltZUZpZWxkKGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgICAgaW5wdXREYXRlRm9ybWF0czogbnVsbCwgaW5wdXRUaW1lRm9ybWF0czogbnVsbFxuICAgIH0sIGt3YXJncylcbiAgICB2YXIgZXJyb3JzID0gb2JqZWN0LmV4dGVuZCh7fSwgdGhpcy5kZWZhdWx0RXJyb3JNZXNzYWdlcylcbiAgICBpZiAodHlwZW9mIGt3YXJncy5lcnJvck1lc3NhZ2VzICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICBvYmplY3QuZXh0ZW5kKGVycm9ycywga3dhcmdzLmVycm9yTWVzc2FnZXMpXG4gICAgfVxuICAgIGt3YXJncy5maWVsZHMgPSBbXG4gICAgICBEYXRlRmllbGQoe2lucHV0Rm9ybWF0czoga3dhcmdzLmlucHV0RGF0ZUZvcm1hdHMsXG4gICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZXM6IHtpbnZhbGlkOiBlcnJvcnMuaW52YWxpZERhdGV9fSlcbiAgICAsIFRpbWVGaWVsZCh7aW5wdXRGb3JtYXRzOiBrd2FyZ3MuaW5wdXRUaW1lRm9ybWF0cyxcbiAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlczoge2ludmFsaWQ6IGVycm9ycy5pbnZhbGlkVGltZX19KVxuICAgIF1cbiAgICBNdWx0aVZhbHVlRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQsIGlmIGdpdmVuLCBpdHMgaW5wdXQgZG9lcyBub3QgY29udGFpbiBlbXB0eSB2YWx1ZXMuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gW2RhdGFMaXN0XSBhIHR3by1pdGVtIGxpc3QgY29uc2lzdGluZyBvZiB0d28gRGF0ZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICBvYmplY3RzLCB0aGUgZmlyc3Qgb2Ygd2hpY2ggcmVwcmVzZW50cyBhIGRhdGUsIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmQgYSB0aW1lLlxuICpcbiAqIEByZXR1cm4gYSBEYXRlIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIGdpdmVuIGRhdGUgYW5kIHRpbWUsIG9yXG4gKiAgICAgICAgIG51bGwgZm9yIGVtcHR5IHZhbHVlcy5cbiAqL1xuU3BsaXREYXRlVGltZUZpZWxkLnByb3RvdHlwZS5jb21wcmVzcyA9IGZ1bmN0aW9uKGRhdGFMaXN0KSB7XG4gIGlmIChpcy5BcnJheShkYXRhTGlzdCkgJiYgZGF0YUxpc3QubGVuZ3RoID4gMCkge1xuICAgIHZhciBkID0gZGF0YUxpc3RbMF1cbiAgICB2YXIgdCA9IGRhdGFMaXN0WzFdXG4gICAgLy8gUmFpc2UgYSB2YWxpZGF0aW9uIGVycm9yIGlmIGRhdGUgb3IgdGltZSBpcyBlbXB0eSAocG9zc2libGUgaWZcbiAgICAvLyBTcGxpdERhdGVUaW1lRmllbGQgaGFzIHJlcXVpcmVkID09IGZhbHNlKS5cbiAgICBpZiAodGhpcy5pc0VtcHR5VmFsdWUoZCkpIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZERhdGUsIHtjb2RlOiAnaW52YWxpZERhdGUnfSlcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNFbXB0eVZhbHVlKHQpKSB7XG4gICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWRUaW1lLCB7Y29kZTogJ2ludmFsaWRUaW1lJ30pXG4gICAgfVxuICAgIHJldHVybiBuZXcgRGF0ZShkLmdldEZ1bGxZZWFyKCksIGQuZ2V0TW9udGgoKSwgZC5nZXREYXRlKCksXG4gICAgICAgICAgICAgICAgICAgIHQuZ2V0SG91cnMoKSwgdC5nZXRNaW51dGVzKCksIHQuZ2V0U2Vjb25kcygpKVxuICB9XG4gIHJldHVybiBudWxsXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGlzIGEgdmFsaWQgSVB2NCBhZGRyZXNzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7Q2hhckZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqIEBkZXByZWNhdGVkXG4gKi9cbnZhciBJUEFkZHJlc3NGaWVsZCA9IENoYXJGaWVsZC5leHRlbmQoe1xuICBkZWZhdWx0VmFsaWRhdG9yczogW3ZhbGlkYXRvcnMudmFsaWRhdGVJUHY0QWRkcmVzc11cblxuLCBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gSVBBZGRyZXNzRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IElQQWRkcmVzc0ZpZWxkKGt3YXJncykgfVxuICAgIENoYXJGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxudmFyIEdlbmVyaWNJUEFkZHJlc3NGaWVsZCA9IENoYXJGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gR2VuZXJpY0lQQWRkcmVzc0ZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBHZW5lcmljSVBBZGRyZXNzRmllbGQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7cHJvdG9jb2w6ICdib3RoJywgdW5wYWNrSVB2NDogZmFsc2V9LCBrd2FyZ3MpXG4gICAgdGhpcy51bnBhY2tJUHY0ID0ga3dhcmdzLnVucGFja0lQdjRcbiAgICB0aGlzLmRlZmF1bHRWYWxpZGF0b3JzID1cbiAgICAgIHZhbGlkYXRvcnMuaXBBZGRyZXNzVmFsaWRhdG9ycyhrd2FyZ3MucHJvdG9jb2wsIGt3YXJncy51bnBhY2tJUHY0KS52YWxpZGF0b3JzXG4gICAgQ2hhckZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuXG5HZW5lcmljSVBBZGRyZXNzRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICghdmFsdWUpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuICBpZiAodmFsdWUgJiYgdmFsdWUuaW5kZXhPZignOicpICE9IC0xKSB7XG4gICAgcmV0dXJuIGNsZWFuSVB2NkFkZHJlc3ModmFsdWUsIHt1bnBhY2tJUHY0OiB0aGlzLnVucGFja0lQdjR9KVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBpcyBhIHZhbGlkIHNsdWcuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtDaGFyRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgU2x1Z0ZpZWxkID0gQ2hhckZpZWxkLmV4dGVuZCh7XG4gIGRlZmF1bHRWYWxpZGF0b3JzOiBbdmFsaWRhdG9ycy52YWxpZGF0ZVNsdWddXG4sIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBTbHVnRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IFNsdWdGaWVsZChrd2FyZ3MpIH1cbiAgICBDaGFyRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5cblNsdWdGaWVsZC5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IHV0aWwuc3RyaXAodGhpcy50b0phdmFTY3JpcHQodmFsdWUpKVxuICByZXR1cm4gQ2hhckZpZWxkLnByb3RvdHlwZS5jbGVhbi5jYWxsKHRoaXMsIHZhbHVlKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgRmllbGQ6IEZpZWxkXG4sIENoYXJGaWVsZDogQ2hhckZpZWxkXG4sIEludGVnZXJGaWVsZDogSW50ZWdlckZpZWxkXG4sIEZsb2F0RmllbGQ6IEZsb2F0RmllbGRcbiwgRGVjaW1hbEZpZWxkOiBEZWNpbWFsRmllbGRcbiwgQmFzZVRlbXBvcmFsRmllbGQ6IEJhc2VUZW1wb3JhbEZpZWxkXG4sIERhdGVGaWVsZDogRGF0ZUZpZWxkXG4sIFRpbWVGaWVsZDogVGltZUZpZWxkXG4sIERhdGVUaW1lRmllbGQ6IERhdGVUaW1lRmllbGRcbiwgUmVnZXhGaWVsZDogUmVnZXhGaWVsZFxuLCBFbWFpbEZpZWxkOiBFbWFpbEZpZWxkXG4sIEZpbGVGaWVsZDogRmlsZUZpZWxkXG4sIEltYWdlRmllbGQ6IEltYWdlRmllbGRcbiwgVVJMRmllbGQ6IFVSTEZpZWxkXG4sIEJvb2xlYW5GaWVsZDogQm9vbGVhbkZpZWxkXG4sIE51bGxCb29sZWFuRmllbGQ6IE51bGxCb29sZWFuRmllbGRcbiwgQ2hvaWNlRmllbGQ6IENob2ljZUZpZWxkXG4sIFR5cGVkQ2hvaWNlRmllbGQ6IFR5cGVkQ2hvaWNlRmllbGRcbiwgTXVsdGlwbGVDaG9pY2VGaWVsZDogTXVsdGlwbGVDaG9pY2VGaWVsZFxuLCBUeXBlZE11bHRpcGxlQ2hvaWNlRmllbGQ6IFR5cGVkTXVsdGlwbGVDaG9pY2VGaWVsZFxuLCBGaWxlUGF0aEZpZWxkOiBGaWxlUGF0aEZpZWxkXG4sIENvbWJvRmllbGQ6IENvbWJvRmllbGRcbiwgTXVsdGlWYWx1ZUZpZWxkOiBNdWx0aVZhbHVlRmllbGRcbiwgU3BsaXREYXRlVGltZUZpZWxkOiBTcGxpdERhdGVUaW1lRmllbGRcbiwgSVBBZGRyZXNzRmllbGQ6IElQQWRkcmVzc0ZpZWxkXG4sIEdlbmVyaWNJUEFkZHJlc3NGaWVsZDogR2VuZXJpY0lQQWRkcmVzc0ZpZWxkXG4sIFNsdWdGaWVsZDogU2x1Z0ZpZWxkXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb25jdXIgPSByZXF1aXJlKCdDb25jdXInKVxudmFyIGlzID0gcmVxdWlyZSgnaXNvbW9ycGgvaXMnKVxudmFyIGZvcm1hdCA9IHJlcXVpcmUoJ2lzb21vcnBoL2Zvcm1hdCcpLmZvcm1hdE9ialxudmFyIG9iamVjdCA9IHJlcXVpcmUoJ2lzb21vcnBoL29iamVjdCcpXG52YXIgY29weSA9IHJlcXVpcmUoJ2lzb21vcnBoL2NvcHknKVxudmFyIHZhbGlkYXRvcnMgPSByZXF1aXJlKCd2YWxpZGF0b3JzJylcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxudmFyIGZpZWxkcyA9IHJlcXVpcmUoJy4vZmllbGRzJylcbnZhciB3aWRnZXRzID0gcmVxdWlyZSgnLi93aWRnZXRzJylcblxudmFyIEVycm9yTGlzdCA9IHV0aWwuRXJyb3JMaXN0XG52YXIgRXJyb3JPYmplY3QgPSB1dGlsLkVycm9yT2JqZWN0XG52YXIgVmFsaWRhdGlvbkVycm9yID0gdmFsaWRhdG9ycy5WYWxpZGF0aW9uRXJyb3JcbnZhciBGaWVsZCA9IGZpZWxkcy5GaWVsZFxudmFyIEZpbGVGaWVsZCA9IGZpZWxkcy5GaWxlRmllbGRcbnZhciBUZXh0YXJlYSA9IHdpZGdldHMuVGV4dGFyZWFcbnZhciBUZXh0SW5wdXQgPSB3aWRnZXRzLlRleHRJbnB1dFxuXG4vKiogUHJvcGVydHkgdW5kZXIgd2hpY2ggbm9uLWZpZWxkLXNwZWNpZmljIGVycm9ycyBhcmUgc3RvcmVkLiAqL1xudmFyIE5PTl9GSUVMRF9FUlJPUlMgPSAnX19hbGxfXydcblxuLyoqXG4gKiBBIGZpZWxkIGFuZCBpdHMgYXNzb2NpYXRlZCBkYXRhLlxuICogQHBhcmFtIHtGb3JtfSBmb3JtIGEgZm9ybS5cbiAqIEBwYXJhbSB7RmllbGR9IGZpZWxkIG9uZSBvZiB0aGUgZm9ybSdzIGZpZWxkcy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIHRoZSBuYW1lIHVuZGVyIHdoaWNoIHRoZSBmaWVsZCBpcyBoZWxkIGluIHRoZSBmb3JtLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBCb3VuZEZpZWxkID0gQ29uY3VyLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBCb3VuZEZpZWxkKGZvcm0sIGZpZWxkLCBuYW1lKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJvdW5kRmllbGQpKSB7IHJldHVybiBuZXcgQm91bmRGaWVsZChmb3JtLCBmaWVsZCwgbmFtZSkgfVxuICAgIHRoaXMuZm9ybSA9IGZvcm1cbiAgICB0aGlzLmZpZWxkID0gZmllbGRcbiAgICB0aGlzLm5hbWUgPSBuYW1lXG4gICAgdGhpcy5odG1sTmFtZSA9IGZvcm0uYWRkUHJlZml4KG5hbWUpXG4gICAgdGhpcy5odG1sSW5pdGlhbE5hbWUgPSBmb3JtLmFkZEluaXRpYWxQcmVmaXgobmFtZSlcbiAgICB0aGlzLmh0bWxJbml0aWFsSWQgPSBmb3JtLmFkZEluaXRpYWxQcmVmaXgodGhpcy5hdXRvSWQoKSlcbiAgICB0aGlzLmxhYmVsID0gdGhpcy5maWVsZC5sYWJlbCAhPT0gbnVsbCA/IHRoaXMuZmllbGQubGFiZWwgOiB1dGlsLnByZXR0eU5hbWUobmFtZSlcbiAgICB0aGlzLmhlbHBUZXh0ID0gZmllbGQuaGVscFRleHQgfHwgJydcbiAgfVxufSlcblxuQm91bmRGaWVsZC5wcm90b3R5cGUuZXJyb3JzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmZvcm0uZXJyb3JzKHRoaXMubmFtZSkgfHwgbmV3IHRoaXMuZm9ybS5lcnJvckNvbnN0cnVjdG9yKClcbn1cblxuQm91bmRGaWVsZC5wcm90b3R5cGUuaXNIaWRkZW4gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZmllbGQud2lkZ2V0LmlzSGlkZGVuXG59XG5cbi8qKlxuICogQ2FsY3VsYXRlcyBhbmQgcmV0dXJucyB0aGUgaWQgYXR0cmlidXRlIGZvciB0aGlzIEJvdW5kRmllbGQgaWYgdGhlIGFzc29jaWF0ZWRcbiAqIGZvcm0gaGFzIGFuIGF1dG9JZC4gUmV0dXJucyBhbiBlbXB0eSBzdHJpbmcgb3RoZXJ3aXNlLlxuICovXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS5hdXRvSWQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGF1dG9JZCA9IHRoaXMuZm9ybS5hdXRvSWRcbiAgaWYgKGF1dG9JZCkge1xuICAgIGF1dG9JZCA9ICcnK2F1dG9JZFxuICAgIGlmIChhdXRvSWQuaW5kZXhPZigne25hbWV9JykgIT0gLTEpIHtcbiAgICAgIHJldHVybiBmb3JtYXQoYXV0b0lkLCB7bmFtZTogdGhpcy5odG1sTmFtZX0pXG4gICAgfVxuICAgIHJldHVybiB0aGlzLmh0bWxOYW1lXG4gIH1cbiAgcmV0dXJuICcnXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZGF0YSBmb3IgdGhpcyBCb3VuZEZJZWxkLCBvciBudWxsIGlmIGl0IHdhc24ndCBnaXZlbi5cbiAqL1xuQm91bmRGaWVsZC5wcm90b3R5cGUuZGF0YSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5maWVsZC53aWRnZXQudmFsdWVGcm9tRGF0YSh0aGlzLmZvcm0uZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JtLmZpbGVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmh0bWxOYW1lKVxufVxuXG4vKipcbiAqIFdyYXBwZXIgYXJvdW5kIHRoZSBmaWVsZCB3aWRnZXQncyBpZEZvckxhYmVsIG1ldGhvZC4gVXNlZnVsLCBmb3IgZXhhbXBsZSwgZm9yXG4gKiBmb2N1c2luZyBvbiB0aGlzIGZpZWxkIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBpdCBoYXMgYSBzaW5nbGUgd2lkZ2V0IG9yIGFcbiAqIE11dGlXaWRnZXQuXG4gKi9cbkJvdW5kRmllbGQucHJvdG90eXBlLmlkRm9yTGFiZWwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHdpZGdldCA9IHRoaXMuZmllbGQud2lkZ2V0XG4gIHZhciBpZCA9IG9iamVjdC5nZXQod2lkZ2V0LmF0dHJzLCAnaWQnLCB0aGlzLmF1dG9JZCgpKVxuICByZXR1cm4gd2lkZ2V0LmlkRm9yTGFiZWwoaWQpXG59XG5cbkJvdW5kRmllbGQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKGt3YXJncykge1xuICBpZiAodGhpcy5maWVsZC5zaG93SGlkZGVuSW5pdGlhbCkge1xuICAgIHJldHVybiBSZWFjdC5ET00uZGl2KG51bGwsIHRoaXMuYXNXaWRnZXQoa3dhcmdzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFzSGlkZGVuKHtvbmx5SW5pdGlhbDogdHJ1ZX0pKVxuICB9XG4gIHJldHVybiB0aGlzLmFzV2lkZ2V0KGt3YXJncylcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbGlzdCBvZiBTdWJXaWRnZXRzIHRoYXQgY29tcHJpc2UgYWxsIHdpZGdldHMgaW4gdGhpcyBCb3VuZEZpZWxkLlxuICogVGhpcyByZWFsbHkgaXMgb25seSB1c2VmdWwgZm9yIFJhZGlvU2VsZWN0IHdpZGdldHMsIHNvIHRoYXQgeW91IGNhbiBpdGVyYXRlXG4gKiBvdmVyIGluZGl2aWR1YWwgcmFkaW8gYnV0dG9ucyB3aGVuIHJlbmRlcmluZy5cbiAqL1xuQm91bmRGaWVsZC5wcm90b3R5cGUuc3ViV2lkZ2V0cyA9IEJvdW5kRmllbGQucHJvdG90eXBlLl9faXRlcl9fID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmZpZWxkLndpZGdldC5zdWJXaWRnZXRzKHRoaXMuaHRtbE5hbWUsIHRoaXMudmFsdWUoKSlcbn1cblxuLyoqXG4gKiBSZW5kZXJzIGEgd2lkZ2V0IGZvciB0aGUgZmllbGQuXG4gKiBAcGFyYW0ge09iamVjdH0gW2t3YXJnc10gY29uZmlndXJhdGlvbiBvcHRpb25zXG4gKiBAY29uZmlnIHtXaWRnZXR9IFt3aWRnZXRdIGFuIG92ZXJyaWRlIGZvciB0aGUgd2lkZ2V0IHVzZWQgdG8gcmVuZGVyIHRoZSBmaWVsZFxuICogICAtIGlmIG5vdCBwcm92aWRlZCwgdGhlIGZpZWxkJ3MgY29uZmlndXJlZCB3aWRnZXQgd2lsbCBiZSB1c2VkXG4gKiBAY29uZmlnIHtPYmplY3R9IFthdHRyc10gYWRkaXRpb25hbCBhdHRyaWJ1dGVzIHRvIGJlIGFkZGVkIHRvIHRoZSBmaWVsZCdzIHdpZGdldC5cbiAqL1xuQm91bmRGaWVsZC5wcm90b3R5cGUuYXNXaWRnZXQgPSBmdW5jdGlvbihrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7XG4gICAgd2lkZ2V0OiBudWxsLCBhdHRyczogbnVsbCwgb25seUluaXRpYWw6IGZhbHNlXG4gIH0sIGt3YXJncylcbiAgdmFyIHdpZGdldCA9IChrd2FyZ3Mud2lkZ2V0ICE9PSBudWxsID8ga3dhcmdzLndpZGdldCA6IHRoaXMuZmllbGQud2lkZ2V0KVxuICB2YXIgYXR0cnMgPSAoa3dhcmdzLmF0dHJzICE9PSBudWxsID8ga3dhcmdzLmF0dHJzIDoge30pXG4gIHZhciBhdXRvSWQgPSB0aGlzLmF1dG9JZCgpXG4gIHZhciBuYW1lID0gIWt3YXJncy5vbmx5SW5pdGlhbCA/IHRoaXMuaHRtbE5hbWUgOiB0aGlzLmh0bWxJbml0aWFsTmFtZVxuICBpZiAoYXV0b0lkICYmXG4gICAgICB0eXBlb2YgYXR0cnMuaWQgPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiB3aWRnZXQuYXR0cnMuaWQgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBhdHRycy5pZCA9ICgha3dhcmdzLm9ubHlJbml0aWFsID8gYXV0b0lkIDogdGhpcy5odG1sSW5pdGlhbElkKVxuICB9XG5cbiAgcmV0dXJuIHdpZGdldC5yZW5kZXIobmFtZSwgdGhpcy52YWx1ZSgpLCB7YXR0cnM6IGF0dHJzfSlcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSBmaWVsZCBhcyBhIHRleHQgaW5wdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gW2t3YXJnc10gd2lkZ2V0IG9wdGlvbnMuXG4gKi9cbkJvdW5kRmllbGQucHJvdG90eXBlLmFzVGV4dCA9IGZ1bmN0aW9uKGt3YXJncykge1xuICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHt9LCBrd2FyZ3MsIHt3aWRnZXQ6IFRleHRJbnB1dCgpfSlcbiAgcmV0dXJuIHRoaXMuYXNXaWRnZXQoa3dhcmdzKVxufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIGZpZWxkIGFzIGEgdGV4dGFyZWEuXG4gKiBAcGFyYW0ge09iamVjdH0gW2t3YXJnc10gd2lkZ2V0IG9wdGlvbnMuXG4gKi9cbkJvdW5kRmllbGQucHJvdG90eXBlLmFzVGV4dGFyZWEgPSBmdW5jdGlvbihrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7fSwga3dhcmdzLCB7d2lkZ2V0OiBUZXh0YXJlYSgpfSlcbiAgcmV0dXJuIHRoaXMuYXNXaWRnZXQoa3dhcmdzKVxufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIGZpZWxkIGFzIGEgaGlkZGVuIGZpZWxkLlxuICogQHBhcmFtIHtPYmplY3R9IFtrd2FyZ3NdIHdpZGdldCBvcHRpb25zLlxuICovXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS5hc0hpZGRlbiA9IGZ1bmN0aW9uKGt3YXJncykge1xuICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHt9LCBrd2FyZ3MsIHt3aWRnZXQ6IG5ldyB0aGlzLmZpZWxkLmhpZGRlbldpZGdldCgpfSlcbiAgcmV0dXJuIHRoaXMuYXNXaWRnZXQoa3dhcmdzKVxufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHZhbHVlIGZvciB0aGlzIEJvdW5kRmllbGQsIHVzaW5nIHRoZSBpbml0aWFsIHZhbHVlIGlmIHRoZSBmb3JtXG4gKiBpcyBub3QgYm91bmQgb3IgdGhlIGRhdGEgb3RoZXJ3aXNlLlxuICovXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS52YWx1ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZGF0YVxuICBpZiAoIXRoaXMuZm9ybS5pc0JvdW5kKSB7XG4gICAgZGF0YSA9IG9iamVjdC5nZXQodGhpcy5mb3JtLmluaXRpYWwsIHRoaXMubmFtZSwgdGhpcy5maWVsZC5pbml0aWFsKVxuICAgIGlmIChpcy5GdW5jdGlvbihkYXRhKSkge1xuICAgICAgZGF0YSA9IGRhdGEoKVxuICAgIH1cbiAgfVxuICBlbHNlIHtcbiAgICBkYXRhID0gdGhpcy5maWVsZC5ib3VuZERhdGEodGhpcy5kYXRhKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5nZXQodGhpcy5mb3JtLmluaXRpYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmllbGQuaW5pdGlhbCkpXG4gIH1cbiAgcmV0dXJuIHRoaXMuZmllbGQucHJlcGFyZVZhbHVlKGRhdGEpXG59XG5cbkJvdW5kRmllbGQucHJvdG90eXBlLl9hZGRMYWJlbFN1ZmZpeCA9IGZ1bmN0aW9uKGxhYmVsLCBsYWJlbFN1ZmZpeCkge1xuICAvLyBPbmx5IGFkZCB0aGUgc3VmZml4IGlmIHRoZSBsYWJlbCBkb2VzIG5vdCBlbmQgaW4gcHVuY3R1YXRpb25cbiAgaWYgKGxhYmVsU3VmZml4ICYmICc6Py4hJy5pbmRleE9mKGxhYmVsLmNoYXJBdChsYWJlbC5sZW5ndGggLSAxKSkgPT0gLTEpIHtcbiAgICByZXR1cm4gbGFiZWwgKyBsYWJlbFN1ZmZpeFxuICB9XG4gIHJldHVybiBsYWJlbFxufVxuXG4vKipcbiAqIFdyYXBzIHRoZSBnaXZlbiBjb250ZW50cyBpbiBhIDxsYWJlbD4gaWYgdGhlIGZpZWxkIGhhcyBhbiBpZCBhdHRyaWJ1dGUuIElmXG4gKiBjb250ZW50cyBhcmVuJ3QgZ2l2ZW4sIHVzZXMgdGhlIGZpZWxkJ3MgbGFiZWwuXG4gKlxuICogSWYgYXR0cnMgYXJlIGdpdmVuLCB0aGV5J3JlIHVzZWQgYXMgSFRNTCBhdHRyaWJ1dGVzIG9uIHRoZSA8bGFiZWw+IHRhZy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW2t3YXJnc10gY29uZmlndXJhdGlvbiBvcHRpb25zLlxuICogQGNvbmZpZyB7U3RyaW5nfSBbY29udGVudHNdIGNvbnRlbnRzIGZvciB0aGUgbGFiZWwgLSBpZiBub3QgcHJvdmlkZWQsIGxhYmVsXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudHMgd2lsbCBiZSBnZW5lcmF0ZWQgZnJvbSB0aGUgZmllbGQgaXRzZWxmLlxuICogQGNvbmZpZyB7T2JqZWN0fSBbYXR0cnNdIGFkZGl0aW9uYWwgYXR0cmlidXRlcyB0byBiZSBhZGRlZCB0byB0aGUgbGFiZWwuXG4gKiBAY29uZmlnIHtTdHJpbmd9IFtsYWJlbFN1ZmZpeF0gYWxsb3dzIG92ZXJyaWRpbmcgdGhlIGZvcm0ncyBsYWJlbFN1ZmZpeC5cbiAqL1xuQm91bmRGaWVsZC5wcm90b3R5cGUubGFiZWxUYWcgPSBmdW5jdGlvbihrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7XG4gICAgY29udGVudHM6IHRoaXMubGFiZWwsIGF0dHJzOiBudWxsLCBsYWJlbFN1ZmZpeDogdGhpcy5mb3JtLmxhYmVsU3VmZml4XG4gIH0sIGt3YXJncylcbiAgdmFyIGNvbnRlbnRzID0gdGhpcy5fYWRkTGFiZWxTdWZmaXgoa3dhcmdzLmNvbnRlbnRzLCBrd2FyZ3MubGFiZWxTdWZmaXgpXG4gIHZhciB3aWRnZXQgPSB0aGlzLmZpZWxkLndpZGdldFxuICB2YXIgaWQgPSBvYmplY3QuZ2V0KHdpZGdldC5hdHRycywgJ2lkJywgdGhpcy5hdXRvSWQoKSlcbiAgaWYgKGlkKSB7XG4gICAgdmFyIGF0dHJzID0gb2JqZWN0LmV4dGVuZChrd2FyZ3MuYXR0cnMgfHwge30sIHtodG1sRm9yOiB3aWRnZXQuaWRGb3JMYWJlbChpZCl9KVxuICAgIGNvbnRlbnRzID0gUmVhY3QuRE9NLmxhYmVsKGF0dHJzLCBjb250ZW50cylcbiAgfVxuICByZXR1cm4gY29udGVudHNcbn1cblxuLyoqXG4gKiBQdXRzIHRvZ2V0aGVyIGFkZGl0aW9uYWwgQ1NTIGNsYXNzZXMgZm9yIHRoaXMgZmllbGQgYmFzZWQgb24gdGhlIGZpZWxkLCB0aGVcbiAqIGZvcm0gYW5kIHdoZXRoZXIgb3Igbm90IHRoZSBmaWVsZCBoYXMgZXJyb3JzLlxuICogQHBhcmFtIHtzdHJpbmc9fSBleHRyYSBDU1MgY2xhc3NlcyBmb3IgdGhlIGZpZWxkLlxuICogQHJldHVybiB7c3RyaW5nfSBzcGFjZS1zZXBhcmF0ZWQgQ1NTIGNsYXNzZXMgZm9yIHRoaXMgZmllbGQuXG4gKi9cbkJvdW5kRmllbGQucHJvdG90eXBlLmNzc0NsYXNzZXMgPSBmdW5jdGlvbihleHRyYUNzc0NsYXNzZXMpIHtcbiAgdmFyIGNzc0NsYXNzZXMgPSBleHRyYUNzc0NsYXNzZXMgPyBbZXh0cmFDc3NDbGFzc2VzXSA6IFtdXG4gIGlmICh0aGlzLmZpZWxkLmNzc0NsYXNzICE9PSBudWxsKSB7XG4gICAgY3NzQ2xhc3Nlcy5wdXNoKHRoaXMuZmllbGQuY3NzQ2xhc3MpXG4gIH1cbiAgaWYgKHR5cGVvZiB0aGlzLmZvcm0ucm93Q3NzQ2xhc3MgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjc3NDbGFzc2VzLnB1c2godGhpcy5mb3JtLnJvd0Nzc0NsYXNzKVxuICB9XG4gIGlmICh0aGlzLmVycm9ycygpLmlzUG9wdWxhdGVkKCkgJiZcbiAgICAgIHR5cGVvZiB0aGlzLmZvcm0uZXJyb3JDc3NDbGFzcyAhPSAndW5kZWZpbmVkJykge1xuICAgIGNzc0NsYXNzZXMucHVzaCh0aGlzLmZvcm0uZXJyb3JDc3NDbGFzcylcbiAgfVxuICBpZiAodGhpcy5maWVsZC5yZXF1aXJlZCAmJlxuICAgICB0eXBlb2YgdGhpcy5mb3JtLnJlcXVpcmVkQ3NzQ2xhc3MgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjc3NDbGFzc2VzLnB1c2godGhpcy5mb3JtLnJlcXVpcmVkQ3NzQ2xhc3MpXG4gIH1cbiAgcmV0dXJuIGNzc0NsYXNzZXMuam9pbignICcpXG59XG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIEZpZWxkcyB0aGF0IGtub3dzIGhvdyB0byB2YWxpZGF0ZSBhbmQgZGlzcGxheSBpdHNlbGYuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7T2JqZWN0fVxuICovXG52YXIgQmFzZUZvcm0gPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEJhc2VGb3JtKGt3YXJncykge1xuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgICAgZGF0YTogbnVsbCwgZmlsZXM6IG51bGwsIGF1dG9JZDogJ2lkX3tuYW1lfScsIHByZWZpeDogbnVsbCxcbiAgICAgIGluaXRpYWw6IG51bGwsIGVycm9yQ29uc3RydWN0b3I6IEVycm9yTGlzdCwgbGFiZWxTdWZmaXg6ICc6JyxcbiAgICAgIGVtcHR5UGVybWl0dGVkOiBmYWxzZVxuICAgIH0sIGt3YXJncylcbiAgICB0aGlzLmlzQm91bmQgPSBrd2FyZ3MuZGF0YSAhPT0gbnVsbCB8fCBrd2FyZ3MuZmlsZXMgIT09IG51bGxcbiAgICB0aGlzLmRhdGEgPSBrd2FyZ3MuZGF0YSB8fCB7fVxuICAgIHRoaXMuZmlsZXMgPSBrd2FyZ3MuZmlsZXMgfHwge31cbiAgICB0aGlzLmF1dG9JZCA9IGt3YXJncy5hdXRvSWRcbiAgICB0aGlzLnByZWZpeCA9IGt3YXJncy5wcmVmaXhcbiAgICB0aGlzLmluaXRpYWwgPSBrd2FyZ3MuaW5pdGlhbCB8fCB7fVxuICAgIHRoaXMuZXJyb3JDb25zdHJ1Y3RvciA9IGt3YXJncy5lcnJvckNvbnN0cnVjdG9yXG4gICAgdGhpcy5sYWJlbFN1ZmZpeCA9IGt3YXJncy5sYWJlbFN1ZmZpeFxuICAgIHRoaXMuZW1wdHlQZXJtaXR0ZWQgPSBrd2FyZ3MuZW1wdHlQZXJtaXR0ZWRcbiAgICB0aGlzLl9lcnJvcnMgPSBudWxsOyAvLyBTdG9yZXMgZXJyb3JzIGFmdGVyIGNsZWFuKCkgaGFzIGJlZW4gY2FsbGVkXG4gICAgdGhpcy5fY2hhbmdlZERhdGEgPSBudWxsXG5cbiAgICAvLyBUaGUgYmFzZUZpZWxkcyBhdHRyaWJ1dGUgaXMgdGhlICpwcm90b3R5cGUtd2lkZSogZGVmaW5pdGlvbiBvZiBmaWVsZHMuXG4gICAgLy8gQmVjYXVzZSBhIHBhcnRpY3VsYXIgKmluc3RhbmNlKiBtaWdodCB3YW50IHRvIGFsdGVyIHRoaXMuZmllbGRzLCB3ZVxuICAgIC8vIGNyZWF0ZSB0aGlzLmZpZWxkcyBoZXJlIGJ5IGRlZXAgY29weWluZyBiYXNlRmllbGRzLiBJbnN0YW5jZXMgc2hvdWxkXG4gICAgLy8gYWx3YXlzIG1vZGlmeSB0aGlzLmZpZWxkczsgdGhleSBzaG91bGQgbm90IG1vZGlmeSBiYXNlRmllbGRzLlxuICAgIHRoaXMuZmllbGRzID0gY29weS5kZWVwQ29weSh0aGlzLmJhc2VGaWVsZHMpXG4gIH1cbn0pXG5cbi8qKlxuICogR2V0dGVyIGZvciBlcnJvcnMsIHdoaWNoIGZpcnN0IGNsZWFucyB0aGUgZm9ybSBpZiB0aGVyZSBhcmUgbm8gZXJyb3JzXG4gKiBkZWZpbmVkIHlldC5cbiAqIEBwYXJhbSB7c3RyaW5nPX0gbmFtZSBpZiBnaXZlbiwgZXJyb3JzIGZvciB0aGlzIGZpZWxkIG5hbWUgd2lsbCBiZSByZXR1cm5lZFxuICogICBpbnN0ZWFkIG9mIHRoZSBmdWxsIGVycm9yIG9iamVjdC5cbiAqIEByZXR1cm4gZXJyb3JzIGZvciB0aGUgZGF0YSBwcm92aWRlZCBmb3IgdGhlIGZvcm0uXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5lcnJvcnMgPSBmdW5jdGlvbihuYW1lKSB7XG4gIGlmICh0aGlzLl9lcnJvcnMgPT09IG51bGwpIHtcbiAgICB0aGlzLmZ1bGxDbGVhbigpXG4gIH1cbiAgaWYgKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5fZXJyb3JzLmdldChuYW1lKVxuICB9XG4gIHJldHVybiB0aGlzLl9lcnJvcnNcbn1cblxuQmFzZUZvcm0ucHJvdG90eXBlLmNoYW5nZWREYXRhID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9jaGFuZ2VkRGF0YSA9PT0gbnVsbCkge1xuICAgIHRoaXMuX2NoYW5nZWREYXRhID0gW11cbiAgICB2YXIgaW5pdGlhbFZhbHVlXG4gICAgLy8gWFhYOiBGb3Igbm93IHdlJ3JlIGFza2luZyB0aGUgaW5kaXZpZHVhbCBmaWVsZHMgd2hldGhlciBvciBub3RcbiAgICAvLyB0aGUgZGF0YSBoYXMgY2hhbmdlZC4gSXQgd291bGQgcHJvYmFibHkgYmUgbW9yZSBlZmZpY2llbnQgdG8gaGFzaFxuICAgIC8vIHRoZSBpbml0aWFsIGRhdGEsIHN0b3JlIGl0IGluIGEgaGlkZGVuIGZpZWxkLCBhbmQgY29tcGFyZSBhIGhhc2hcbiAgICAvLyBvZiB0aGUgc3VibWl0dGVkIGRhdGEsIGJ1dCB3ZSdkIG5lZWQgYSB3YXkgdG8gZWFzaWx5IGdldCB0aGVcbiAgICAvLyBzdHJpbmcgdmFsdWUgZm9yIGEgZ2l2ZW4gZmllbGQuIFJpZ2h0IG5vdywgdGhhdCBsb2dpYyBpcyBlbWJlZGRlZFxuICAgIC8vIGluIHRoZSByZW5kZXIgbWV0aG9kIG9mIGVhY2ggZmllbGQncyB3aWRnZXQuXG4gICAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLmZpZWxkcykge1xuICAgICAgaWYgKCFvYmplY3QuaGFzT3duKHRoaXMuZmllbGRzLCBuYW1lKSkgeyBjb250aW51ZSB9XG5cbiAgICAgIHZhciBmaWVsZCA9IHRoaXMuZmllbGRzW25hbWVdXG4gICAgICB2YXIgcHJlZml4ZWROYW1lID0gdGhpcy5hZGRQcmVmaXgobmFtZSlcbiAgICAgIHZhciBkYXRhVmFsdWUgPSBmaWVsZC53aWRnZXQudmFsdWVGcm9tRGF0YSh0aGlzLmRhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5maWxlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVmaXhlZE5hbWUpXG4gICAgICBpZiAoIWZpZWxkLnNob3dIaWRkZW5Jbml0aWFsKSB7XG4gICAgICAgIGluaXRpYWxWYWx1ZSA9IG9iamVjdC5nZXQodGhpcy5pbml0aWFsLCBuYW1lLCBmaWVsZC5pbml0aWFsKVxuICAgICAgICBpZiAoaXMuRnVuY3Rpb24oaW5pdGlhbFZhbHVlKSkge1xuICAgICAgICAgIGluaXRpYWxWYWx1ZSA9IGluaXRpYWxWYWx1ZSgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgaW5pdGlhbFByZWZpeGVkTmFtZSA9IHRoaXMuYWRkSW5pdGlhbFByZWZpeChuYW1lKVxuICAgICAgICB2YXIgaGlkZGVuV2lkZ2V0ID0gbmV3IGZpZWxkLmhpZGRlbldpZGdldCgpXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaW5pdGlhbFZhbHVlID0gaGlkZGVuV2lkZ2V0LnZhbHVlRnJvbURhdGEoXG4gICAgICAgICAgICAgICAgICB0aGlzLmRhdGEsIHRoaXMuZmlsZXMsIGluaXRpYWxQcmVmaXhlZE5hbWUpXG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoIShlIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSkgeyB0aHJvdyBlIH1cbiAgICAgICAgICAvLyBBbHdheXMgYXNzdW1lIGRhdGEgaGFzIGNoYW5nZWQgaWYgdmFsaWRhdGlvbiBmYWlsc1xuICAgICAgICAgIHRoaXMuX2NoYW5nZWREYXRhLnB1c2gobmFtZSlcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChmaWVsZC5faGFzQ2hhbmdlZChpbml0aWFsVmFsdWUsIGRhdGFWYWx1ZSkpIHtcbiAgICAgICAgdGhpcy5fY2hhbmdlZERhdGEucHVzaChuYW1lKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcy5fY2hhbmdlZERhdGFcbn1cblxuQmFzZUZvcm0ucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5hc1RhYmxlKClcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgQm91bmRGaWVsZCBmb3IgZWFjaCBmaWVsZCBpbiB0aGUgZm9ybSwgaW4gdGhlIG9yZGVyIGluIHdoaWNoIHRoZVxuICogZmllbGRzIHdlcmUgY3JlYXRlZC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFt0ZXN0XSBpZiBwcm92aWRlZCwgdGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB3aXRoXG4gKiAgIGZpZWxkIGFuZCBuYW1lIGFyZ3VtZW50cyAtIEJvdW5kRmllbGRzIHdpbGwgb25seSBiZSBnZW5lcmF0ZWQgZm9yIGZpZWxkc1xuICogICBmb3Igd2hpY2ggdHJ1ZSBpcyByZXR1cm5lZC5cbiAqIEByZXR1cm4gYSBsaXN0IG9mIEJvdW5kRmllbGQgb2JqZWN0cyAtIG9uZSBmb3IgZWFjaCBmaWVsZCBpbiB0aGUgZm9ybSwgaW4gdGhlXG4gKiAgIG9yZGVyIGluIHdoaWNoIHRoZSBmaWVsZHMgd2VyZSBjcmVhdGVkLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuYm91bmRGaWVsZHMgPSBmdW5jdGlvbih0ZXN0KSB7XG4gIHRlc3QgPSB0ZXN0IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZSB9XG5cbiAgdmFyIGZpZWxkcyA9IFtdXG4gIGZvciAodmFyIG5hbWUgaW4gdGhpcy5maWVsZHMpIHtcbiAgICBpZiAob2JqZWN0Lmhhc093bih0aGlzLmZpZWxkcywgbmFtZSkgJiZcbiAgICAgICAgdGVzdCh0aGlzLmZpZWxkc1tuYW1lXSwgbmFtZSkgPT09IHRydWUpIHtcbiAgICAgIGZpZWxkcy5wdXNoKEJvdW5kRmllbGQodGhpcywgdGhpcy5maWVsZHNbbmFtZV0sIG5hbWUpKVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmllbGRzXG59XG5cbi8qKlxuICoge25hbWUgLT4gQm91bmRGaWVsZH0gdmVyc2lvbiBvZiBib3VuZEZpZWxkc1xuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuYm91bmRGaWVsZHNPYmogPSBmdW5jdGlvbih0ZXN0KSB7XG4gIHRlc3QgPSB0ZXN0IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZSB9XG5cbiAgdmFyIGZpZWxkcyA9IHt9XG4gIGZvciAodmFyIG5hbWUgaW4gdGhpcy5maWVsZHMpIHtcbiAgICBpZiAob2JqZWN0Lmhhc093bih0aGlzLmZpZWxkcywgbmFtZSkgJiZcbiAgICAgICAgdGVzdCh0aGlzLmZpZWxkc1tuYW1lXSwgbmFtZSkgPT09IHRydWUpIHtcbiAgICAgIGZpZWxkc1tuYW1lXSA9IEJvdW5kRmllbGQodGhpcywgdGhpcy5maWVsZHNbbmFtZV0sIG5hbWUpXG4gICAgfVxuICB9XG4gIHJldHVybiBmaWVsZHNcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgQm91bmRGaWVsZCBmb3IgdGhlIGZpZWxkIHdpdGggdGhlIGdpdmVuIG5hbWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgYSBmaWVsZCBuYW1lLlxuICogQHJldHVybiBhIEJvdW5kRmllbGQgZm9yIHRoZSBmaWVsZCB3aXRoIHRoZSBnaXZlbiBuYW1lLCBpZiBvbmUgZXhpc3RzLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuYm91bmRGaWVsZCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgaWYgKCFvYmplY3QuaGFzT3duKHRoaXMuZmllbGRzLCBuYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkZvcm0gZG9lcyBub3QgaGF2ZSBhICdcIiArIG5hbWUgKyBcIicgZmllbGQuXCIpXG4gIH1cbiAgcmV0dXJuIEJvdW5kRmllbGQodGhpcywgdGhpcy5maWVsZHNbbmFtZV0sIG5hbWUpXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIG5vdCB0aGUgZm9ybSBoYXMgZXJyb3JzLlxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmlzVmFsaWQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLmlzQm91bmQpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICByZXR1cm4gIXRoaXMuZXJyb3JzKCkuaXNQb3B1bGF0ZWQoKVxufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGZpZWxkIG5hbWUgd2l0aCBhIHByZWZpeCBhcHBlbmRlZCwgaWYgdGhpcyBGb3JtIGhhcyBhIHByZWZpeCBzZXQuXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGROYW1lIGEgZmllbGQgbmFtZS5cbiAqIEByZXR1cm4gYSBmaWVsZCBuYW1lIHdpdGggYSBwcmVmaXggYXBwZW5kZWQsIGlmIHRoaXMgRm9ybSBoYXMgYSBwcmVmaXggc2V0LFxuICogICAgICAgICBvdGhlcndpc2UgPGNvZGU+ZmllbGROYW1lPC9jb2RlPiBpcyByZXR1cm5lZCBhcy1pcy5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmFkZFByZWZpeCA9IGZ1bmN0aW9uKGZpZWxkTmFtZSkge1xuICBpZiAodGhpcy5wcmVmaXggIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBmb3JtYXQoJ3twcmVmaXh9LXtmaWVsZE5hbWV9JyxcbiAgICAgICAgICAgICAgICAgICAge3ByZWZpeDogdGhpcy5wcmVmaXgsIGZpZWxkTmFtZTogZmllbGROYW1lfSlcbiAgfVxuICByZXR1cm4gZmllbGROYW1lXG59XG5cbi8qKlxuICogQWRkcyBhbiBpbml0aWFsIHByZWZpeCBmb3IgY2hlY2tpbmcgZHluYW1pYyBpbml0aWFsIHZhbHVlcy5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmFkZEluaXRpYWxQcmVmaXggPSBmdW5jdGlvbihmaWVsZE5hbWUpIHtcbiAgcmV0dXJuIGZvcm1hdCgnaW5pdGlhbC17ZmllbGROYW1lfScsXG4gICAgICAgICAgICAgICAge2ZpZWxkTmFtZTogdGhpcy5hZGRQcmVmaXgoZmllbGROYW1lKX0pXG59XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIGZvciBvdXRwdXR0aW5nIEhUTUwuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBub3JtYWxSb3cgYSBmdW5jdGlvbiB3aGljaCBwcm9kdWNlcyBhIG5vcm1hbCByb3cuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBlcnJvclJvdyBhIGZ1bmN0aW9uIHdoaWNoIHByb2R1Y2VzIGFuIGVycm9yIHJvdy5cbiAqIEByZXR1cm4gYSBsaXN0IG9mIFJlYWN0LkRPTSBjb21wb25lbnRzIHJlcHJlc2VudGluZyByb3dzLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuX2h0bWxPdXRwdXQgPSBmdW5jdGlvbihub3JtYWxSb3csIGVycm9yUm93KSB7XG4gIHZhciBiZlxuICB2YXIgYmZFcnJvcnNcbiAgdmFyIHRvcEVycm9ycyA9IHRoaXMubm9uRmllbGRFcnJvcnMoKSAvLyBFcnJvcnMgdGhhdCBzaG91bGQgYmUgZGlzcGxheWVkIGFib3ZlIGFsbCBmaWVsZHNcblxuICB2YXIgaGlkZGVuRmllbGRzID0gW11cbiAgdmFyIGhpZGRlbkJvdW5kRmllbGRzID0gdGhpcy5oaWRkZW5GaWVsZHMoKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGhpZGRlbkJvdW5kRmllbGRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGJmID0gaGlkZGVuQm91bmRGaWVsZHNbaV1cbiAgICBiZkVycm9ycyA9IGJmLmVycm9ycygpXG4gICAgaWYgKGJmRXJyb3JzLmlzUG9wdWxhdGVkKSB7XG4gICAgICB0b3BFcnJvcnMuZXh0ZW5kKGJmRXJyb3JzLm1lc3NhZ2VzKCkubWFwKGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIHJldHVybiAnKEhpZGRlbiBmaWVsZCAnICsgYmYubmFtZSArICcpICcgKyBlcnJvclxuICAgICAgfSkpXG4gICAgfVxuICAgIGhpZGRlbkZpZWxkcy5wdXNoKGJmLnJlbmRlcigpKVxuICB9XG5cbiAgdmFyIHJvd3MgPSBbXVxuICB2YXIgZXJyb3JzXG4gIHZhciBsYWJlbFxuICB2YXIgaGVscFRleHRcbiAgdmFyIGV4dHJhQ29udGVudFxuICB2YXIgdmlzaWJsZUJvdW5kRmllbGRzID0gdGhpcy52aXNpYmxlRmllbGRzKClcbiAgZm9yIChpID0gMCwgbCA9IHZpc2libGVCb3VuZEZpZWxkcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBiZiA9IHZpc2libGVCb3VuZEZpZWxkc1tpXVxuICAgIGJmRXJyb3JzID0gYmYuZXJyb3JzKClcblxuICAgIC8vIFZhcmlhYmxlcyB3aGljaCBjYW4gYmUgb3B0aW9uYWwgaW4gZWFjaCByb3dcbiAgICBlcnJvcnMgPSAoYmZFcnJvcnMuaXNQb3B1bGF0ZWQoKSA/IGJmRXJyb3JzLnJlbmRlcigpIDogbnVsbClcbiAgICBsYWJlbCA9IChiZi5sYWJlbCA/IGJmLmxhYmVsVGFnKCkgOiBudWxsKVxuICAgIGhlbHBUZXh0ID0gYmYuaGVscFRleHRcbiAgICBpZiAoaGVscFRleHQpIHtcbiAgICAgIGhlbHBUZXh0ID0gKChpcy5PYmplY3QoaGVscFRleHQpICYmIG9iamVjdC5oYXNPd24oaGVscFRleHQsICdfX2h0bWwnKSlcbiAgICAgICAgICAgICAgICAgID8gUmVhY3QuRE9NLnNwYW4oe2NsYXNzTmFtZTogJ2hlbHBUZXh0JywgZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUw6IGhlbHBUZXh0fSlcbiAgICAgICAgICAgICAgICAgIDogUmVhY3QuRE9NLnNwYW4oe2NsYXNzTmFtZTogJ2hlbHBUZXh0J30sIGhlbHBUZXh0KSlcbiAgICB9XG4gICAgLy8gSWYgdGhpcyBpcyB0aGUgbGFzdCByb3csIGl0IHNob3VsZCBpbmNsdWRlIGFueSBoaWRkZW4gZmllbGRzXG4gICAgZXh0cmFDb250ZW50ID0gKGkgPT0gbCAtIDEgJiYgaGlkZGVuRmllbGRzLmxlbmd0aCA+IDAgPyBoaWRkZW5GaWVsZHMgOiBudWxsKVxuXG4gICAgcm93cy5wdXNoKG5vcm1hbFJvdyhiZi5odG1sTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJmLmNzc0NsYXNzZXMoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmYucmVuZGVyKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWxwVGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9ycyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhQ29udGVudCkpXG4gIH1cblxuICBpZiAodG9wRXJyb3JzLmlzUG9wdWxhdGVkKCkpIHtcbiAgICAvLyBBZGQgaGlkZGVuIGZpZWxkcyB0byB0aGUgdG9wIGVycm9yIHJvdyBpZiBpdCdzIGJlaW5nIGRpc3BsYXllZCBhbmRcbiAgICAvLyB0aGVyZSBhcmUgbm8gb3RoZXIgcm93cy5cbiAgICBleHRyYUNvbnRlbnQgPSAoaGlkZGVuRmllbGRzLmxlbmd0aCA+IDAgJiYgcm93cy5sZW5ndGggPT09IDAgPyBoaWRkZW5GaWVsZHMgOiBudWxsKVxuICAgIHJvd3MudW5zaGlmdChlcnJvclJvdyh0aGlzLmFkZFByZWZpeChOT05fRklFTERfRVJST1JTKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdG9wRXJyb3JzLnJlbmRlcigpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYUNvbnRlbnQpKVxuICB9XG5cbiAgLy8gUHV0IGhpZGRlbiBmaWVsZHMgaW4gdGhlaXIgb3duIGVycm9yIHJvdyBpZiB0aGVyZSB3ZXJlIG5vIHJvd3MgdG9cbiAgLy8gZGlzcGxheS5cbiAgaWYgKGhpZGRlbkZpZWxkcy5sZW5ndGggPiAwICYmIHJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgcm93cy5wdXNoKGVycm9yUm93KHRoaXMuYWRkUHJlZml4KCdfX2hpZGRlbkZpZWxkc19fJyksXG4gICAgICAgICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgIGhpZGRlbkZpZWxkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oaWRkZW5GaWVsZFJvd0Nzc0NsYXNzKSlcbiAgfVxuXG4gIHJldHVybiByb3dzXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGZvcm0gcmVuZGVyZWQgYXMgSFRNTCA8dHI+cyAtIGV4Y2x1ZGluZyB0aGUgPHRhYmxlPi5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmFzVGFibGUgPSAoZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIG5vcm1hbFJvdyhrZXksIGNzc0NsYXNzZXMsIGxhYmVsLCBmaWVsZCwgaGVscFRleHQsIGVycm9ycywgZXh0cmFDb250ZW50KSB7XG4gICAgdmFyIGNvbnRlbnRzID0gW251bGxdXG4gICAgaWYgKGVycm9ycykgeyBjb250ZW50cy5wdXNoKGVycm9ycykgfVxuICAgIGNvbnRlbnRzLnB1c2goZmllbGQpXG4gICAgaWYgKGhlbHBUZXh0KSB7XG4gICAgICBjb250ZW50cy5wdXNoKFJlYWN0LkRPTS5icihudWxsKSlcbiAgICAgIGNvbnRlbnRzLnB1c2goaGVscFRleHQpXG4gICAgfVxuICAgIGlmIChleHRyYUNvbnRlbnQpIHsgY29udGVudHMucHVzaC5hcHBseShjb250ZW50cywgZXh0cmFDb250ZW50KSB9XG4gICAgdmFyIHJvd0F0dHJzID0ge2tleToga2V5fVxuICAgIGlmIChjc3NDbGFzc2VzKSB7IHJvd0F0dHJzLmNsYXNzTmFtZSA9IGNzc0NsYXNzZXMgfVxuICAgIHJldHVybiBSZWFjdC5ET00udHIocm93QXR0cnNcbiAgICAsIFJlYWN0LkRPTS50aChudWxsLCBsYWJlbClcbiAgICAsIFJlYWN0LkRPTS50ZC5hcHBseShudWxsLCBjb250ZW50cylcbiAgICApXG4gIH1cblxuICBmdW5jdGlvbiBlcnJvclJvdyhrZXksIGVycm9ycywgZXh0cmFDb250ZW50LCBjc3NDbGFzc2VzKSB7XG4gICAgdmFyIGNvbnRlbnRzID0gW3tjb2xTcGFuOiAyfV1cbiAgICBpZiAoZXJyb3JzKSB7IGNvbnRlbnRzLnB1c2goZXJyb3JzKSB9XG4gICAgaWYgKGV4dHJhQ29udGVudCkgeyBjb250ZW50cy5wdXNoLmFwcGx5KGNvbnRlbnRzLCBleHRyYUNvbnRlbnQpIH1cbiAgICB2YXIgcm93QXR0cnMgPSB7a2V5OiBrZXl9XG4gICAgaWYgKGNzc0NsYXNzZXMpIHsgcm93QXR0cnMuY2xhc3NOYW1lID0gY3NzQ2xhc3NlcyB9XG4gICAgcmV0dXJuIFJlYWN0LkRPTS50cihyb3dBdHRyc1xuICAgICwgUmVhY3QuRE9NLnRkLmFwcGx5KG51bGwsIGNvbnRlbnRzKVxuICAgIClcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2h0bWxPdXRwdXQobm9ybWFsUm93LCBlcnJvclJvdykgfVxufSkoKVxuXG5mdW5jdGlvbiBfbm9ybWFsUm93KHJlYWN0RWwsIGtleSwgY3NzQ2xhc3NlcywgbGFiZWwsIGZpZWxkLCBoZWxwVGV4dCwgZXJyb3JzLCBleHRyYUNvbnRlbnQpIHtcbiAgdmFyIHJvd0F0dHJzID0ge2tleToga2V5fVxuICBpZiAoY3NzQ2xhc3NlcykgeyByb3dBdHRycy5jbGFzc05hbWUgPSBjc3NDbGFzc2VzIH1cbiAgdmFyIGNvbnRlbnRzID0gW3Jvd0F0dHJzXVxuICBpZiAoZXJyb3JzKSB7IGNvbnRlbnRzLnB1c2goZXJyb3JzKSB9XG4gIGlmIChsYWJlbCkgeyBjb250ZW50cy5wdXNoKGxhYmVsKSB9XG4gIGNvbnRlbnRzLnB1c2goJyAnKVxuICBjb250ZW50cy5wdXNoKGZpZWxkKVxuICBpZiAoaGVscFRleHQpIHtcbiAgICBjb250ZW50cy5wdXNoKCcgJylcbiAgICBjb250ZW50cy5wdXNoKGhlbHBUZXh0KVxuICB9XG4gIGlmIChleHRyYUNvbnRlbnQpIHsgY29udGVudHMucHVzaC5hcHBseShjb250ZW50cywgZXh0cmFDb250ZW50KSB9XG4gIHJldHVybiByZWFjdEVsLmFwcGx5KG51bGwsIGNvbnRlbnRzKVxufVxuXG5mdW5jdGlvbiBfZXJyb3JSb3cocmVhY3RFbCwga2V5LCBlcnJvcnMsIGV4dHJhQ29udGVudCwgY3NzQ2xhc3Nlcykge1xuICB2YXIgcm93QXR0cnMgPSB7a2V5OiBrZXl9XG4gIGlmIChjc3NDbGFzc2VzKSB7IHJvd0F0dHJzLmNsYXNzTmFtZSA9IGNzc0NsYXNzZXMgfVxuICB2YXIgY29udGVudHMgPSBbcm93QXR0cnNdXG4gIGlmIChlcnJvcnMpIHsgY29udGVudHMucHVzaChlcnJvcnMpIH1cbiAgaWYgKGV4dHJhQ29udGVudCkgeyBjb250ZW50cy5wdXNoLmFwcGx5KGNvbnRlbnRzLCBleHRyYUNvbnRlbnQpIH1cbiAgcmV0dXJuIHJlYWN0RWwuYXBwbHkobnVsbCwgY29udGVudHMpXG59XG5cbmZ1bmN0aW9uIF9zaW5nbGVFbGVtZW50Um93KHJlYWN0RWwpIHtcbiAgdmFyIG5vcm1hbFJvdyA9IF9ub3JtYWxSb3cuYmluZChudWxsLCByZWFjdEVsKVxuICB2YXIgZXJyb3JSb3cgPSBfZXJyb3JSb3cuYmluZChudWxsLCByZWFjdEVsKVxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2h0bWxPdXRwdXQobm9ybWFsUm93LCBlcnJvclJvdylcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgdGhpcyBmb3JtIHJlbmRlcmVkIGFzIEhUTUwgPGxpPnMgLSBleGNsdWRpbmcgdGhlIDx1bD4uXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5hc1VsID0gX3NpbmdsZUVsZW1lbnRSb3coUmVhY3QuRE9NLmxpKVxuXG4vKipcbiAqIFJldHVybnMgdGhpcyBmb3JtIHJlbmRlcmVkIGFzIEhUTUwgPGRpdj5zLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuYXNEaXYgPSBfc2luZ2xlRWxlbWVudFJvdyhSZWFjdC5ET00uZGl2KVxuXG4vKipcbiAqIFJldHVybnMgZXJyb3JzIHRoYXQgYXJlbid0IGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY3VsYXIgZmllbGQuXG4gKiBAcmV0dXJuIGVycm9ycyB0aGF0IGFyZW4ndCBhc3NvY2lhdGVkIHdpdGggYSBwYXJ0aWN1bGFyIGZpZWxkIC0gaS5lLiwgZXJyb3JzXG4gKiAgIGdlbmVyYXRlZCBieSBjbGVhbigpLiBXaWxsIGJlIGVtcHR5IGlmIHRoZXJlIGFyZSBub25lLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUubm9uRmllbGRFcnJvcnMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICh0aGlzLmVycm9ycyhOT05fRklFTERfRVJST1JTKSB8fCBuZXcgdGhpcy5lcnJvckNvbnN0cnVjdG9yKCkpXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcmF3IHZhbHVlIGZvciBhIHBhcnRpY3VsYXIgZmllbGQgbmFtZS4gVGhpcyBpcyBqdXN0IGEgY29udmVuaWVudFxuICogd3JhcHBlciBhcm91bmQgd2lkZ2V0LnZhbHVlRnJvbURhdGEuXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5fcmF3VmFsdWUgPSBmdW5jdGlvbihmaWVsZG5hbWUpIHtcbiAgdmFyIGZpZWxkID0gdGhpcy5maWVsZHNbZmllbGRuYW1lXVxuICB2YXIgcHJlZml4ID0gdGhpcy5hZGRQcmVmaXgoZmllbGRuYW1lKVxuICByZXR1cm4gZmllbGQud2lkZ2V0LnZhbHVlRnJvbURhdGEodGhpcy5kYXRhLCB0aGlzLmZpbGVzLCBwcmVmaXgpXG59XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgY29udGVudCBvZiB0aGlzLl9lcnJvcnMuXG4gKlxuICogVGhlIGZpZWxkIGFyZ3VtZW50IGlzIHRoZSBuYW1lIG9mIHRoZSBmaWVsZCB0byB3aGljaCB0aGUgZXJyb3JzIHNob3VsZCBiZVxuICogYWRkZWQuIElmIGl0cyB2YWx1ZSBpcyBudWxsIHRoZSBlcnJvcnMgd2lsbCBiZSB0cmVhdGVkIGFzIE5PTl9GSUVMRF9FUlJPUlMuXG4gKlxuICogVGhlIGVycm9yIGFyZ3VtZW50IGNhbiBiZSBhIHNpbmdsZSBlcnJvciwgYSBsaXN0IG9mIGVycm9ycywgb3IgYW4gb2JqZWN0IHRoYXRcbiAqIG1hcHMgZmllbGQgbmFtZXMgdG8gbGlzdHMgb2YgZXJyb3JzLiBXaGF0IHdlIGRlZmluZSBhcyBhbiBcImVycm9yXCIgY2FuIGJlXG4gKiBlaXRoZXIgYSBzaW1wbGUgc3RyaW5nIG9yIGFuIGluc3RhbmNlIG9mIFZhbGlkYXRpb25FcnJvciB3aXRoIGl0cyBtZXNzYWdlXG4gKiBhdHRyaWJ1dGUgc2V0IGFuZCB3aGF0IHdlIGRlZmluZSBhcyBsaXN0IG9yIG9iamVjdCBjYW4gYmUgYW4gYWN0dWFsIGxpc3Qgb3JcbiAqIG9iamVjdCBvciBhbiBpbnN0YW5jZSBvZiBWYWxpZGF0aW9uRXJyb3Igd2l0aCBpdHMgZXJyb3JMaXN0IG9yIGVycm9yT2JqXG4gKiBwcm9wZXJ0eSBzZXQuXG4gKlxuICogSWYgZXJyb3IgaXMgYW4gb2JqZWN0LCB0aGUgZmllbGQgYXJndW1lbnQgKm11c3QqIGJlIG51bGwgYW5kIGVycm9ycyB3aWxsIGJlXG4gKiBhZGRlZCB0byB0aGUgZmllbGRzIHRoYXQgY29ycmVzcG9uZCB0byB0aGUgcHJvcGVydGllcyBvZiB0aGUgb2JqZWN0LlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuYWRkRXJyb3IgPSBmdW5jdGlvbihmaWVsZCwgZXJyb3IpIHtcbiAgaWYgKCEoZXJyb3IgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7XG4gICAgLy8gTm9ybWFsaXNlIHRvIFZhbGlkYXRpb25FcnJvciBhbmQgbGV0IGl0cyBjb25zdHJ1Y3RvciBkbyB0aGUgaGFyZCB3b3JrIG9mXG4gICAgLy8gbWFraW5nIHNlbnNlIG9mIHRoZSBpbnB1dC5cbiAgICBlcnJvciA9IFZhbGlkYXRpb25FcnJvcihlcnJvcilcbiAgfVxuXG4gIGlmIChvYmplY3QuaGFzT3duKGVycm9yLCAnZXJyb3JPYmonKSkge1xuICAgIGlmIChmaWVsZCAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIGFyZ3VtZW50ICdmaWVsZCcgbXVzdCBiZSBudWxsIHdoZW4gdGhlICdlcnJvcicgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICdhcmd1bWVudCBjb250YWlucyBlcnJvcnMgZm9yIG11bHRpcGxlIGZpZWxkcy4nKVxuICAgIH1cbiAgICBlcnJvciA9IGVycm9yLmVycm9yT2JqXG4gIH1cbiAgZWxzZSB7XG4gICAgdmFyIGVycm9yTGlzdCA9IGVycm9yLmVycm9yTGlzdFxuICAgIGVycm9yID0ge31cbiAgICBlcnJvcltmaWVsZCB8fCBOT05fRklFTERfRVJST1JTXSA9IGVycm9yTGlzdFxuICB9XG5cbiAgdmFyIGZpZWxkcyA9IE9iamVjdC5rZXlzKGVycm9yKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGZpZWxkcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBmaWVsZCA9IGZpZWxkc1tpXVxuICAgIGVycm9yTGlzdCA9IGVycm9yW2ZpZWxkXVxuICAgIGlmICghdGhpcy5fZXJyb3JzLmhhc0ZpZWxkKGZpZWxkKSkge1xuICAgICAgaWYgKGZpZWxkICE9PSBOT05fRklFTERfRVJST1JTICYmICFvYmplY3QuaGFzT3duKHRoaXMuZmllbGRzLCBmaWVsZCkpIHtcbiAgICAgICAgdmFyIGZvcm1OYW1lID0gKHRoaXMuY29uc3RydWN0b3IubmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBcIidcIiArIHRoaXMuY29uc3RydWN0b3IubmFtZSArIFwiJ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICA6ICdGb3JtJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGZvcm1OYW1lICsgXCIgaGFzIG5vIGZpZWxkIG5hbWVkICdcIiArIGZpZWxkICsgXCInXCIpXG4gICAgICB9XG4gICAgICB0aGlzLl9lcnJvcnMuc2V0KGZpZWxkLCBuZXcgdGhpcy5lcnJvckNvbnN0cnVjdG9yKCkpXG4gICAgfVxuICAgIHRoaXMuX2Vycm9ycy5nZXQoZmllbGQpLmV4dGVuZChlcnJvckxpc3QpXG4gICAgaWYgKG9iamVjdC5oYXNPd24odGhpcy5jbGVhbmVkRGF0YSwgZmllbGQpKSB7XG4gICAgICBkZWxldGUgdGhpcy5jbGVhbmVkRGF0YVtmaWVsZF1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDbGVhbnMgYWxsIG9mIGRhdGEgYW5kIHBvcHVsYXRlcyBfZXJyb3JzIGFuZCBjbGVhbmVkRGF0YS5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmZ1bGxDbGVhbiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9lcnJvcnMgPSBFcnJvck9iamVjdCgpXG4gIGlmICghdGhpcy5pc0JvdW5kKSB7XG4gICAgcmV0dXJuOyAvLyBTdG9wIGZ1cnRoZXIgcHJvY2Vzc2luZ1xuICB9XG5cbiAgdGhpcy5jbGVhbmVkRGF0YSA9IHt9XG5cbiAgLy8gSWYgdGhlIGZvcm0gaXMgcGVybWl0dGVkIHRvIGJlIGVtcHR5LCBhbmQgbm9uZSBvZiB0aGUgZm9ybSBkYXRhIGhhc1xuICAvLyBjaGFuZ2VkIGZyb20gdGhlIGluaXRpYWwgZGF0YSwgc2hvcnQgY2lyY3VpdCBhbnkgdmFsaWRhdGlvbi5cbiAgaWYgKHRoaXMuZW1wdHlQZXJtaXR0ZWQgJiYgIXRoaXMuaGFzQ2hhbmdlZCgpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB0aGlzLl9jbGVhbkZpZWxkcygpXG4gIHRoaXMuX2NsZWFuRm9ybSgpXG4gIHRoaXMuX3Bvc3RDbGVhbigpXG59XG5cbkJhc2VGb3JtLnByb3RvdHlwZS5fY2xlYW5GaWVsZHMgPSBmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLmZpZWxkcykge1xuICAgIGlmICghb2JqZWN0Lmhhc093bih0aGlzLmZpZWxkcywgbmFtZSkpIHsgY29udGludWUgfVxuXG4gICAgdmFyIGZpZWxkID0gdGhpcy5maWVsZHNbbmFtZV1cbiAgICAvLyB2YWx1ZUZyb21EYXRhKCkgZ2V0cyB0aGUgZGF0YSBmcm9tIHRoZSBkYXRhIG9iamVjdHMuXG4gICAgLy8gRWFjaCB3aWRnZXQgdHlwZSBrbm93cyBob3cgdG8gcmV0cmlldmUgaXRzIG93biBkYXRhLCBiZWNhdXNlIHNvbWUgd2lkZ2V0c1xuICAgIC8vIHNwbGl0IGRhdGEgb3ZlciBzZXZlcmFsIEhUTUwgZmllbGRzLlxuICAgIHZhciB2YWx1ZSA9IGZpZWxkLndpZGdldC52YWx1ZUZyb21EYXRhKHRoaXMuZGF0YSwgdGhpcy5maWxlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZFByZWZpeChuYW1lKSlcbiAgICB0cnkge1xuICAgICAgaWYgKGZpZWxkIGluc3RhbmNlb2YgRmlsZUZpZWxkKSB7XG4gICAgICAgIHZhciBpbml0aWFsID0gb2JqZWN0LmdldCh0aGlzLmluaXRpYWwsIG5hbWUsIGZpZWxkLmluaXRpYWwpXG4gICAgICAgIHZhbHVlID0gZmllbGQuY2xlYW4odmFsdWUsIGluaXRpYWwpXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBmaWVsZC5jbGVhbih2YWx1ZSlcbiAgICAgIH1cbiAgICAgIHRoaXMuY2xlYW5lZERhdGFbbmFtZV0gPSB2YWx1ZVxuXG4gICAgICAvLyBUcnkgY2xlYW5OYW1lXG4gICAgICB2YXIgY3VzdG9tQ2xlYW4gPSAnY2xlYW4nICsgbmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5hbWUuc3Vic3RyKDEpXG4gICAgICBpZiAodHlwZW9mIHRoaXNbY3VzdG9tQ2xlYW5dICE9ICd1bmRlZmluZWQnICYmXG4gICAgICAgICAgaXMuRnVuY3Rpb24odGhpc1tjdXN0b21DbGVhbl0pKSB7XG4gICAgICAgIHZhbHVlID0gdGhpc1tjdXN0b21DbGVhbl0oKVxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgdGhpcy5jbGVhbmVkRGF0YVtuYW1lXSA9IHZhbHVlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAvLyBPdGhlcndpc2UsIHRyeSBjbGVhbl9uYW1lXG4gICAgICAgIGN1c3RvbUNsZWFuID0gJ2NsZWFuXycgKyBuYW1lXG4gICAgICAgIGlmICh0eXBlb2YgdGhpc1tjdXN0b21DbGVhbl0gIT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgICAgIGlzLkZ1bmN0aW9uKHRoaXNbY3VzdG9tQ2xlYW5dKSkge1xuICAgICAgICAgIHZhbHVlID0gdGhpc1tjdXN0b21DbGVhbl0oKVxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYW5lZERhdGFbbmFtZV0gPSB2YWx1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHtcbiAgICAgICAgdGhyb3cgZVxuICAgICAgfVxuICAgICAgdGhpcy5hZGRFcnJvcihuYW1lLCBlKVxuICAgIH1cbiAgfVxufVxuXG5CYXNlRm9ybS5wcm90b3R5cGUuX2NsZWFuRm9ybSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY2xlYW5lZERhdGFcbiAgdHJ5IHtcbiAgICBjbGVhbmVkRGF0YSA9IHRoaXMuY2xlYW4oKVxuICB9XG4gIGNhdGNoIChlKSB7XG4gICAgaWYgKCEoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHtcbiAgICAgIHRocm93IGVcbiAgICB9XG4gICAgdGhpcy5hZGRFcnJvcihudWxsLCBlKVxuICB9XG4gIGlmIChjbGVhbmVkRGF0YSkge1xuICAgIHRoaXMuY2xlYW5lZERhdGEgPSBjbGVhbmVkRGF0YVxuICB9XG59XG5cbi8qKlxuICogQW4gaW50ZXJuYWwgaG9vayBmb3IgcGVyZm9ybWluZyBhZGRpdGlvbmFsIGNsZWFuaW5nIGFmdGVyIGZvcm0gY2xlYW5pbmcgaXNcbiAqIGNvbXBsZXRlLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuX3Bvc3RDbGVhbiA9IGZ1bmN0aW9uKCkge31cblxuLyoqXG4gKiBIb29rIGZvciBkb2luZyBhbnkgZXh0cmEgZm9ybS13aWRlIGNsZWFuaW5nIGFmdGVyIGVhY2ggRmllbGQncyBjbGVhbigpIGhhc1xuICogYmVlbiBjYWxsZWQuIEFueSBWYWxpZGF0aW9uRXJyb3IgcmFpc2VkIGJ5IHRoaXMgbWV0aG9kIHdpbGwgbm90IGJlIGFzc29jaWF0ZWRcbiAqIHdpdGggYSBwYXJ0aWN1bGFyIGZpZWxkOyBpdCB3aWxsIGhhdmUgYSBzcGVjaWFsLWNhc2UgYXNzb2NpYXRpb24gd2l0aCB0aGVcbiAqIGZpZWxkIG5hbWVkICdfX2FsbF9fJy5cbiAqIEByZXR1cm4gdmFsaWRhdGVkLCBjbGVhbmVkIGRhdGEuXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5jbGVhbiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5jbGVhbmVkRGF0YVxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgZGF0YSBkaWZmZXJzIGZyb20gaW5pdGlhbC5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmhhc0NoYW5nZWQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICh0aGlzLmNoYW5nZWREYXRhKCkubGVuZ3RoID4gMClcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIHRoZSBmb3JtIG5lZWRzIHRvIGJlIG11bHRpcGFydC1lbmNvZGVkIGluIG90aGVyIHdvcmRzLCBpZiBpdFxuICogaGFzIGEgRmlsZUlucHV0LlxuICogQHJldHVybiB0cnVlIGlmIHRoZSBmb3JtIG5lZWRzIHRvIGJlIG11bHRpcGFydC1lbmNvZGVkLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuaXNNdWx0aXBhcnQgPSBmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLmZpZWxkcykge1xuICAgIGlmIChvYmplY3QuaGFzT3duKHRoaXMuZmllbGRzLCBuYW1lKSAmJlxuICAgICAgICB0aGlzLmZpZWxkc1tuYW1lXS53aWRnZXQubmVlZHNNdWx0aXBhcnRGb3JtKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbGlzdCBvZiBhbGwgdGhlIEJvdW5kRmllbGQgb2JqZWN0cyB0aGF0IGNvcnJlc3BvbmQgdG8gaGlkZGVuXG4gKiBmaWVsZHMuIFVzZWZ1bCBmb3IgbWFudWFsIGZvcm0gbGF5b3V0LlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuaGlkZGVuRmllbGRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmJvdW5kRmllbGRzKGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgcmV0dXJuIGZpZWxkLndpZGdldC5pc0hpZGRlblxuICB9KVxufVxuXG4vKipcbiAqIFJldHVybnMgYSBsaXN0IG9mIEJvdW5kRmllbGQgb2JqZWN0cyB0aGF0IGRvIG5vdCBjb3JyZXNwb25kIHRvIGhpZGRlbiBmaWVsZHMuXG4gKiBUaGUgb3Bwb3NpdGUgb2YgdGhlIGhpZGRlbkZpZWxkcygpIG1ldGhvZC5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLnZpc2libGVGaWVsZHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuYm91bmRGaWVsZHMoZnVuY3Rpb24oZmllbGQpIHtcbiAgICByZXR1cm4gIWZpZWxkLndpZGdldC5pc0hpZGRlblxuICB9KVxufVxuXG5mdW5jdGlvbiBEZWNsYXJhdGl2ZUZpZWxkc01ldGEocHJvdG90eXBlUHJvcHMsIGNvbnN0cnVjdG9yUHJvcHMpIHtcbiAgLy8gUG9wIEZpZWxkcyBpbnN0YW5jZXMgZnJvbSBwcm90b3R5cGVQcm9wcyB0byBidWlsZCB1cCB0aGUgbmV3IGZvcm0ncyBvd25cbiAgLy8gZGVjbGFyZWRGaWVsZHMuXG4gIHZhciBmaWVsZHMgPSBbXVxuICBPYmplY3Qua2V5cyhwcm90b3R5cGVQcm9wcykuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgaWYgKHByb3RvdHlwZVByb3BzW25hbWVdIGluc3RhbmNlb2YgRmllbGQpIHtcbiAgICAgIGZpZWxkcy5wdXNoKFtuYW1lLCBwcm90b3R5cGVQcm9wc1tuYW1lXV0pXG4gICAgICBkZWxldGUgcHJvdG90eXBlUHJvcHNbbmFtZV1cbiAgICB9XG4gIH0pXG4gIGZpZWxkcy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYVsxXS5jcmVhdGlvbkNvdW50ZXIgLSBiWzFdLmNyZWF0aW9uQ291bnRlclxuICB9KVxuICBwcm90b3R5cGVQcm9wcy5kZWNsYXJlZEZpZWxkcyA9IG9iamVjdC5mcm9tSXRlbXMoZmllbGRzKVxuXG4gIC8vIEJ1aWxkIHVwIGZpbmFsIGRlY2xhcmVkRmllbGRzIGZyb20gdGhlIGZvcm0gYmVpbmcgZXh0ZW5kZWQsIGZvcm1zIGJlaW5nXG4gIC8vIG1peGVkIGluIGFuZCB0aGUgbmV3IGZvcm0ncyBvd24gZGVjbGFyZWRGaWVsZHMsIGluIHRoYXQgb3JkZXIgb2ZcbiAgLy8gcHJlY2VkZW5jZS5cbiAgdmFyIGRlY2xhcmVkRmllbGRzID0ge31cblxuICAvLyBJZiB3ZSdyZSBleHRlbmRpbmcgYW5vdGhlciBmb3JtLCB3ZSBkb24ndCBuZWVkIHRvIGNoZWNrIGZvciBzaGFkb3dlZFxuICAvLyBmaWVsZHMsIGFzIGl0J3MgYXQgdGhlIGJvdHRvbSBvZiB0aGUgcGlsZSBmb3IgaW5oZXJpdGluZyBkZWNsYXJlZEZpZWxkcy5cbiAgaWYgKG9iamVjdC5oYXNPd24odGhpcywgJ2RlY2xhcmVkRmllbGRzJykpIHtcbiAgICBvYmplY3QuZXh0ZW5kKGRlY2xhcmVkRmllbGRzLCB0aGlzLmRlY2xhcmVkRmllbGRzKVxuICB9XG5cbiAgLy8gSWYgYW55IG1peGlucyB3aGljaCBsb29rIGxpa2UgRm9ybSBjb25zdHJ1Y3RvcnMgd2VyZSBnaXZlbiwgaW5oZXJpdCB0aGVpclxuICAvLyBkZWNsYXJlZEZpZWxkcyBhbmQgY2hlY2sgZm9yIHNoYWRvd2VkIGZpZWxkcy5cbiAgaWYgKG9iamVjdC5oYXNPd24ocHJvdG90eXBlUHJvcHMsICdfX21peGluX18nKSkge1xuICAgIHZhciBtaXhpbnMgPSBwcm90b3R5cGVQcm9wcy5fX21peGluX19cbiAgICBpZiAoIWlzLkFycmF5KG1peGlucykpIHsgbWl4aW5zID0gW21peGluc10gfVxuICAgIC8vIE5vdGUgdGhhdCB3ZSBsb29wIG92ZXIgbWl4ZWQgaW4gZm9ybXMgaW4gKnJldmVyc2UqIHRvIHByZXNlcnZlIHRoZVxuICAgIC8vIGNvcnJlY3Qgb3JkZXIgb2YgZmllbGRzLlxuICAgIGZvciAodmFyIGkgPSBtaXhpbnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBtaXhpbiA9IG1peGluc1tpXVxuICAgICAgaWYgKGlzLkZ1bmN0aW9uKG1peGluKSAmJiBvYmplY3QuaGFzT3duKG1peGluLnByb3RvdHlwZSwgJ2RlY2xhcmVkRmllbGRzJykpIHtcbiAgICAgICAgLy8gRXh0ZW5kIG1peGVkLWluIGRlY2xhcmVkRmllbGRzIG92ZXIgdGhlIHRvcCBvZiB3aGF0J3MgYWxyZWFkeSB0aGVyZSxcbiAgICAgICAgLy8gdGhlbiBkZWxldGUgYW55IGZpZWxkcyB3aGljaCBoYXZlIGJlZW4gc2hhZG93ZWQgYnkgYSBub24tRmllbGRcbiAgICAgICAgLy8gcHJvcGVydHkgaW4gaXRzIHByb3RvdHlwZS5cbiAgICAgICAgb2JqZWN0LmV4dGVuZChkZWNsYXJlZEZpZWxkcywgbWl4aW4ucHJvdG90eXBlLmRlY2xhcmVkRmllbGRzKVxuICAgICAgICBPYmplY3Qua2V5cyhtaXhpbi5wcm90b3R5cGUpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgIGlmIChvYmplY3QuaGFzT3duKGRlY2xhcmVkRmllbGRzLCBuYW1lKSkge1xuICAgICAgICAgICAgZGVsZXRlIGRlY2xhcmVkRmllbGRzW25hbWVdXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAvLyBUbyBhdm9pZCBvdmVyd3JpdGluZyB0aGUgbmV3IGZvcm0ncyBiYXNlRmllbGRzIG9yIGRlY2xhcmVkRmllbGRzIHdoZW5cbiAgICAgICAgLy8gdGhlIHJlc3Qgb2YgdGhlIG1peGluJ3MgcHJvdG90eXBlIGlzIG1peGVkLWluIGJ5IENvbmN1ciwgcmVwbGFjZSB0aGVcbiAgICAgICAgLy8gbWl4aW4gd2l0aCBhbiBvYmplY3QgY29udGFpbmluZyBvbmx5IGl0cyBvdGhlciBwcm90b3R5cGUgcHJvcGVydGllcy5cbiAgICAgICAgdmFyIG1peGluUHJvdG90eXBlID0gb2JqZWN0LmV4dGVuZCh7fSwgbWl4aW4ucHJvdG90eXBlKVxuICAgICAgICBkZWxldGUgbWl4aW5Qcm90b3R5cGUuYmFzZUZpZWxkc1xuICAgICAgICBkZWxldGUgbWl4aW5Qcm90b3R5cGUuZGVjbGFyZWRGaWVsZHNcbiAgICAgICAgbWl4aW5zW2ldID0gbWl4aW5Qcm90b3R5cGVcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gV2UgbWF5IGhhdmUgd3JhcHBlZCBhIHNpbmdsZSBtaXhpbiBpbiBhbiBBcnJheSAtIGFzc2lnbiBpdCBiYWNrIHRvIHRoZVxuICAgIC8vIG5ldyBmb3JtJ3MgcHJvdG90eXBlIGZvciBwcm9jZXNzaW5nIGJ5IENvbmN1ci5cbiAgICBwcm90b3R5cGVQcm9wcy5fX21peGluX18gPSBtaXhpbnNcbiAgfVxuXG4gIC8vIEZpbmFsbHkgLSBleHRlbmQgdGhlIG5ldyBmb3JtJ3Mgb3duIGRlY2xhcmVkRmllbGRzIG92ZXIgdGhlIHRvcCBvZlxuICAvLyBkZWNhbHJlZEZpZWxkcyBiZWluZyBpbmhlcml0ZWQsIHRoZW4gZGVsZXRlIGFueSBmaWVsZHMgd2hpY2ggaGF2ZSBiZWVuXG4gIC8vIHNoYWRvd2VkIGJ5IGEgbm9uLUZpZWxkIHByb3BlcnR5IGluIGl0cyBwcm90b3R5cGUuXG4gIG9iamVjdC5leHRlbmQoZGVjbGFyZWRGaWVsZHMsIHByb3RvdHlwZVByb3BzLmRlY2xhcmVkRmllbGRzKVxuICBPYmplY3Qua2V5cyhwcm90b3R5cGVQcm9wcykuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgaWYgKG9iamVjdC5oYXNPd24oZGVjbGFyZWRGaWVsZHMsIG5hbWUpKSB7XG4gICAgICBkZWxldGUgZGVjbGFyZWRGaWVsZHNbbmFtZV1cbiAgICB9XG4gIH0pXG5cbiAgcHJvdG90eXBlUHJvcHMuYmFzZUZpZWxkcyA9IGRlY2xhcmVkRmllbGRzXG4gIHByb3RvdHlwZVByb3BzLmRlY2xhcmVkRmllbGRzID0gZGVjbGFyZWRGaWVsZHNcbn1cblxudmFyIEZvcm0gPSBCYXNlRm9ybS5leHRlbmQoe1xuICBfX21ldGFfXzogRGVjbGFyYXRpdmVGaWVsZHNNZXRhXG4sIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBGb3JtKCkge1xuICAgIEJhc2VGb3JtLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgfVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIE5PTl9GSUVMRF9FUlJPUlM6IE5PTl9GSUVMRF9FUlJPUlNcbiwgQm91bmRGaWVsZDogQm91bmRGaWVsZFxuLCBCYXNlRm9ybTogQmFzZUZvcm1cbiwgRGVjbGFyYXRpdmVGaWVsZHNNZXRhOiBEZWNsYXJhdGl2ZUZpZWxkc01ldGFcbiwgRm9ybTogRm9ybVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29uY3VyID0gcmVxdWlyZSgnQ29uY3VyJylcbnZhciBvYmplY3QgPSByZXF1aXJlKCdpc29tb3JwaC9vYmplY3QnKVxudmFyIHZhbGlkYXRvcnMgPSByZXF1aXJlKCd2YWxpZGF0b3JzJylcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxudmFyIHdpZGdldHMgPSByZXF1aXJlKCcuL3dpZGdldHMnKVxudmFyIGZpZWxkcyA9IHJlcXVpcmUoJy4vZmllbGRzJylcbnZhciBmb3JtcyA9IHJlcXVpcmUoJy4vZm9ybXMnKVxuXG52YXIgRXJyb3JMaXN0ID0gdXRpbC5FcnJvckxpc3RcbnZhciBWYWxpZGF0aW9uRXJyb3IgPSB2YWxpZGF0b3JzLlZhbGlkYXRpb25FcnJvclxudmFyIEludGVnZXJGaWVsZCA9IGZpZWxkcy5JbnRlZ2VyRmllbGRcbnZhciBCb29sZWFuRmllbGQgPSBmaWVsZHMuQm9vbGVhbkZpZWxkXG52YXIgSGlkZGVuSW5wdXQgPSB3aWRnZXRzLkhpZGRlbklucHV0XG5cbi8vIFNwZWNpYWwgZmllbGQgbmFtZXNcbnZhciBUT1RBTF9GT1JNX0NPVU5UID0gJ1RPVEFMX0ZPUk1TJ1xudmFyIElOSVRJQUxfRk9STV9DT1VOVCA9ICdJTklUSUFMX0ZPUk1TJ1xudmFyIE1JTl9OVU1fRk9STV9DT1VOVCA9ICdNSU5fTlVNX0ZPUk1TJ1xudmFyIE1BWF9OVU1fRk9STV9DT1VOVCA9ICdNQVhfTlVNX0ZPUk1TJ1xudmFyIE9SREVSSU5HX0ZJRUxEX05BTUUgPSAnT1JERVInXG52YXIgREVMRVRJT05fRklFTERfTkFNRSA9ICdERUxFVEUnXG5cbi8vIERlZmF1bHQgbWluaW11bSBudW1iZXIgb2YgZm9ybXMgaW4gYSBmb3Jtc2V0XG52YXIgREVGQVVMVF9NSU5fTlVNID0gMFxuXG4vLyBEZWZhdWx0IG1heGltdW0gbnVtYmVyIG9mIGZvcm1zIGluIGEgZm9ybXNldCwgdG8gcHJldmVudCBtZW1vcnkgZXhoYXVzdGlvblxudmFyIERFRkFVTFRfTUFYX05VTSA9IDEwMDBcblxuLyoqXG4gKiBNYW5hZ2VtZW50Rm9ybSBpcyB1c2VkIHRvIGtlZXAgdHJhY2sgb2YgaG93IG1hbnkgZm9ybSBpbnN0YW5jZXMgYXJlIGRpc3BsYXllZFxuICogb24gdGhlIHBhZ2UuIElmIGFkZGluZyBuZXcgZm9ybXMgdmlhIEphdmFTY3JpcHQsIHlvdSBzaG91bGQgaW5jcmVtZW50IHRoZVxuICogY291bnQgZmllbGQgb2YgdGhpcyBmb3JtIGFzIHdlbGwuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIE1hbmFnZW1lbnRGb3JtID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgZmllbGRzID0ge31cbiAgZmllbGRzW1RPVEFMX0ZPUk1fQ09VTlRdID0gSW50ZWdlckZpZWxkKHt3aWRnZXQ6IEhpZGRlbklucHV0fSlcbiAgZmllbGRzW0lOSVRJQUxfRk9STV9DT1VOVF0gPSBJbnRlZ2VyRmllbGQoe3dpZGdldDogSGlkZGVuSW5wdXR9KVxuICAvLyBNSU5fTlVNX0ZPUk1fQ09VTlQgYW5kIE1BWF9OVU1fRk9STV9DT1VOVCBhcmUgb3V0cHV0IHdpdGggdGhlIHJlc3Qgb2ZcbiAgLy8gdGhlIG1hbmFnZW1lbnQgZm9ybSwgYnV0IG9ubHkgZm9yIHRoZSBjb252ZW5pZW5jZSBvZiBjbGllbnQtc2lkZVxuICAvLyBjb2RlLiBUaGUgUE9TVCB2YWx1ZSBvZiB0aGVtIHJldHVybmVkIGZyb20gdGhlIGNsaWVudCBpcyBub3QgY2hlY2tlZC5cbiAgZmllbGRzW01JTl9OVU1fRk9STV9DT1VOVF0gPSBJbnRlZ2VyRmllbGQoe3JlcXVpcmVkOiBmYWxzZSwgd2lkZ2V0OiBIaWRkZW5JbnB1dH0pXG4gIGZpZWxkc1tNQVhfTlVNX0ZPUk1fQ09VTlRdID0gSW50ZWdlckZpZWxkKHtyZXF1aXJlZDogZmFsc2UsIHdpZGdldDogSGlkZGVuSW5wdXR9KVxuICByZXR1cm4gZm9ybXMuRm9ybS5leHRlbmQoZmllbGRzKVxufSkoKVxuXG4vKipcbiAqIEEgY29sbGVjdGlvbiBvZiBpbnN0YW5jZXMgb2YgdGhlIHNhbWUgRm9ybS5cbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEJhc2VGb3JtU2V0ID0gQ29uY3VyLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBCYXNlRm9ybVNldChrd2FyZ3MpIHtcbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtcbiAgICAgIGRhdGE6IG51bGwsIGZpbGVzOiBudWxsLCBhdXRvSWQ6ICdpZF97bmFtZX0nLCBwcmVmaXg6IG51bGwsXG4gICAgICBpbml0aWFsOiBudWxsLCBlcnJvckNvbnN0cnVjdG9yOiBFcnJvckxpc3QsIG1hbmFnZW1lbnRGb3JtQ3NzQ2xhc3M6IG51bGxcbiAgICB9LCBrd2FyZ3MpXG4gICAgdGhpcy5pc0JvdW5kID0ga3dhcmdzLmRhdGEgIT09IG51bGwgfHwga3dhcmdzLmZpbGVzICE9PSBudWxsXG4gICAgdGhpcy5wcmVmaXggPSBrd2FyZ3MucHJlZml4IHx8IHRoaXMuZ2V0RGVmYXVsdFByZWZpeCgpXG4gICAgdGhpcy5hdXRvSWQgPSBrd2FyZ3MuYXV0b0lkXG4gICAgdGhpcy5kYXRhID0ga3dhcmdzLmRhdGEgfHwge31cbiAgICB0aGlzLmZpbGVzID0ga3dhcmdzLmZpbGVzIHx8IHt9XG4gICAgdGhpcy5pbml0aWFsID0ga3dhcmdzLmluaXRpYWxcbiAgICB0aGlzLmVycm9yQ29uc3RydWN0b3IgPSBrd2FyZ3MuZXJyb3JDb25zdHJ1Y3RvclxuICAgIHRoaXMubWFuYWdlbWVudEZvcm1Dc3NDbGFzcyA9IGt3YXJncy5tYW5hZ2VtZW50Rm9ybUNzc0NsYXNzXG4gICAgdGhpcy5fZm9ybXMgPSBudWxsXG4gICAgdGhpcy5fZXJyb3JzID0gbnVsbFxuICAgIHRoaXMuX25vbkZvcm1FcnJvcnMgPSBudWxsXG4gIH1cbn0pXG5cbi8qKlxuICogUmV0dXJucyB0aGUgTWFuYWdlbWVudEZvcm0gaW5zdGFuY2UgZm9yIHRoaXMgRm9ybVNldC5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLm1hbmFnZW1lbnRGb3JtID0gZnVuY3Rpb24oKSB7XG4gIHZhciBmb3JtXG4gIGlmICh0aGlzLmlzQm91bmQpIHtcbiAgICBmb3JtID0gbmV3IE1hbmFnZW1lbnRGb3JtKHtkYXRhOiB0aGlzLmRhdGEsIGF1dG9JZDogdGhpcy5hdXRvSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlZml4OiB0aGlzLnByZWZpeH0pXG4gICAgaWYgKCFmb3JtLmlzVmFsaWQoKSkge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKCdNYW5hZ2VtZW50Rm9ybSBkYXRhIGlzIG1pc3Npbmcgb3IgaGFzIGJlZW4gdGFtcGVyZWQgd2l0aCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge2NvZGU6ICdtaXNzaW5nX21hbmFnZW1lbnRfZm9ybSd9KVxuICAgIH1cbiAgfVxuICBlbHNlIHtcbiAgICB2YXIgaW5pdGlhbCA9IHt9XG4gICAgaW5pdGlhbFtUT1RBTF9GT1JNX0NPVU5UXSA9IHRoaXMudG90YWxGb3JtQ291bnQoKVxuICAgIGluaXRpYWxbSU5JVElBTF9GT1JNX0NPVU5UXSA9IHRoaXMuaW5pdGlhbEZvcm1Db3VudCgpXG4gICAgaW5pdGlhbFtNSU5fTlVNX0ZPUk1fQ09VTlRdID0gdGhpcy5taW5OdW1cbiAgICBpbml0aWFsW01BWF9OVU1fRk9STV9DT1VOVF0gPSB0aGlzLm1heE51bVxuICAgIGZvcm0gPSBuZXcgTWFuYWdlbWVudEZvcm0oe2F1dG9JZDogdGhpcy5hdXRvSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlZml4OiB0aGlzLnByZWZpeCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0aWFsOiBpbml0aWFsfSlcbiAgfVxuICBpZiAodGhpcy5tYW5hZ2VtZW50Rm9ybUNzc0NsYXNzICE9PSBudWxsKSB7XG4gICAgZm9ybS5oaWRkZW5GaWVsZFJvd0Nzc0NsYXNzID0gdGhpcy5tYW5hZ2VtZW50Rm9ybUNzc0NsYXNzXG4gIH1cbiAgcmV0dXJuIGZvcm1cbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBudW1iZXIgb2YgZm9ybSBpbnN0YW5jZXMgdGhpcyBmb3Jtc2V0IGNvbnRhaW5zLCBiYXNlZCBvblxuICogZWl0aGVyIHN1Ym1pdHRlZCBtYW5hZ2VtZW50IGRhdGEgb3IgaW5pdGlhbCBjb25maWd1cmF0aW9uLCBhcyBhcHByb3ByaWF0ZS5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLnRvdGFsRm9ybUNvdW50ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmlzQm91bmQpIHtcbiAgICAvLyBSZXR1cm4gYWJzb2x1dGVNYXggaWYgaXQgaXMgbG93ZXIgdGhhbiB0aGUgYWN0dWFsIHRvdGFsIGZvcm0gY291bnQgaW5cbiAgICAvLyB0aGUgZGF0YTsgdGhpcyBpcyBEb1MgcHJvdGVjdGlvbiB0byBwcmV2ZW50IGNsaWVudHMgIGZyb20gZm9yY2luZyB0aGVcbiAgICAvLyBzZXJ2ZXIgdG8gaW5zdGFudGlhdGUgYXJiaXRyYXJ5IG51bWJlcnMgb2YgZm9ybXMuXG4gICAgcmV0dXJuIE1hdGgubWluKHRoaXMubWFuYWdlbWVudEZvcm0oKS5jbGVhbmVkRGF0YVtUT1RBTF9GT1JNX0NPVU5UXSwgdGhpcy5hYnNvbHV0ZU1heClcbiAgfVxuICBlbHNlIHtcbiAgICB2YXIgaW5pdGlhbEZvcm1zID0gdGhpcy5pbml0aWFsRm9ybUNvdW50KClcbiAgICB2YXIgdG90YWxGb3JtcyA9IHRoaXMuaW5pdGlhbEZvcm1Db3VudCgpICsgdGhpcy5leHRyYVxuICAgIC8vIEFsbG93IGFsbCBleGlzdGluZyByZWxhdGVkIG9iamVjdHMvaW5saW5lcyB0byBiZSBkaXNwbGF5ZWQsIGJ1dCBkb24ndFxuICAgIC8vIGFsbG93IGV4dHJhIGJleW9uZCBtYXhfbnVtLlxuICAgIGlmICh0aGlzLm1heE51bSAhPT0gbnVsbCAmJlxuICAgICAgICBpbml0aWFsRm9ybXMgPiB0aGlzLm1heE51bSAmJlxuICAgICAgICB0aGlzLm1heE51bSA+PSAwKSB7XG4gICAgICB0b3RhbEZvcm1zID0gaW5pdGlhbEZvcm1zXG4gICAgfVxuICAgIGlmICh0aGlzLm1heE51bSAhPT0gbnVsbCAmJlxuICAgICAgICB0b3RhbEZvcm1zID4gdGhpcy5tYXhOdW0gJiZcbiAgICAgICAgdGhpcy5tYXhOdW0gPj0gMCkge1xuICAgICAgdG90YWxGb3JtcyA9IHRoaXMubWF4TnVtXG4gICAgfVxuICAgIHJldHVybiB0b3RhbEZvcm1zXG4gIH1cbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBudW1iZXIgb2YgaW5pdGlhbCBmb3JtIGluc3RhbmNlcyB0aGlzIGZvcm1zZXQgY29udGFpbnMsIGJhc2VkXG4gKiBvbiBlaXRoZXIgc3VibWl0dGVkIG1hbmFnZW1lbnQgZGF0YSBvciBpbml0aWFsIGNvbmZpZ3VyYXRpb24sIGFzIGFwcHJvcHJpYXRlLlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuaW5pdGlhbEZvcm1Db3VudCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5pc0JvdW5kKSB7XG4gICAgcmV0dXJuIHRoaXMubWFuYWdlbWVudEZvcm0oKS5jbGVhbmVkRGF0YVtJTklUSUFMX0ZPUk1fQ09VTlRdXG4gIH1cbiAgZWxzZSB7XG4gICAgLy8gVXNlIHRoZSBsZW5ndGggb2YgdGhlIGluaXRhbCBkYXRhIGlmIGl0J3MgdGhlcmUsIDAgb3RoZXJ3aXNlLlxuICAgIHZhciBpbml0aWFsRm9ybXMgPSAodGhpcy5pbml0aWFsICE9PSBudWxsICYmIHRoaXMuaW5pdGlhbC5sZW5ndGggPiAwXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHRoaXMuaW5pdGlhbC5sZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgICAgIDogMClcbiAgICByZXR1cm4gaW5pdGlhbEZvcm1zXG4gIH1cbn1cblxuLyoqXG4gKiBJbnN0YW50aWF0ZXMgZm9ybXMgd2hlbiBmaXJzdCBhY2Nlc3NlZC5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmZvcm1zID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9mb3JtcyA9PT0gbnVsbCkge1xuICAgIHRoaXMuX2Zvcm1zID0gW11cbiAgICB2YXIgdG90YWxGb3JtQ291bnQgPSB0aGlzLnRvdGFsRm9ybUNvdW50KClcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRvdGFsRm9ybUNvdW50OyBpKyspIHtcbiAgICAgIHRoaXMuX2Zvcm1zLnB1c2godGhpcy5fY29uc3RydWN0Rm9ybShpKSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXMuX2Zvcm1zXG59XG5cbi8qKlxuICogSW5zdGFudGlhdGVzIGFuZCByZXR1cm5zIHRoZSBpdGggZm9ybSBpbnN0YW5jZSBpbiB0aGUgZm9ybXNldC5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLl9jb25zdHJ1Y3RGb3JtID0gZnVuY3Rpb24oaSkge1xuICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgYXV0b0lkOiB0aGlzLmF1dG9JZFxuICAsIHByZWZpeDogdGhpcy5hZGRQcmVmaXgoaSlcbiAgLCBlcnJvckNvbnN0cnVjdG9yOiB0aGlzLmVycm9yQ29uc3RydWN0b3JcbiAgfVxuICBpZiAodGhpcy5pc0JvdW5kKSB7XG4gICAgZGVmYXVsdHMuZGF0YSA9IHRoaXMuZGF0YVxuICAgIGRlZmF1bHRzLmZpbGVzID0gdGhpcy5maWxlc1xuICB9XG4gIGlmICh0aGlzLmluaXRpYWwgIT09IG51bGwgJiYgdGhpcy5pbml0aWFsLmxlbmd0aCA+IDApIHtcbiAgICBpZiAodHlwZW9mIHRoaXMuaW5pdGlhbFtpXSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgZGVmYXVsdHMuaW5pdGlhbCA9IHRoaXMuaW5pdGlhbFtpXVxuICAgIH1cbiAgfVxuICAvLyBBbGxvdyBleHRyYSBmb3JtcyB0byBiZSBlbXB0eVxuICBpZiAoaSA+PSB0aGlzLmluaXRpYWxGb3JtQ291bnQoKSkge1xuICAgIGRlZmF1bHRzLmVtcHR5UGVybWl0dGVkID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGZvcm0gPSBuZXcgdGhpcy5mb3JtKGRlZmF1bHRzKVxuICB0aGlzLmFkZEZpZWxkcyhmb3JtLCBpKVxuICByZXR1cm4gZm9ybVxufVxuXG4vKipcbiAqIFJldHVybnMgYSBsaXN0IG9mIGFsbCB0aGUgaW5pdGlhbCBmb3JtcyBpbiB0aGlzIGZvcm1zZXQuXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5pbml0aWFsRm9ybXMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZm9ybXMoKS5zbGljZSgwLCB0aGlzLmluaXRpYWxGb3JtQ291bnQoKSlcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbGlzdCBvZiBhbGwgdGhlIGV4dHJhIGZvcm1zIGluIHRoaXMgZm9ybXNldC5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmV4dHJhRm9ybXMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZm9ybXMoKS5zbGljZSh0aGlzLmluaXRpYWxGb3JtQ291bnQoKSlcbn1cblxuQmFzZUZvcm1TZXQucHJvdG90eXBlLmVtcHR5Rm9ybSA9IGZ1bmN0aW9uKCkge1xuICB2YXIga3dhcmdzID0ge1xuICAgIGF1dG9JZDogdGhpcy5hdXRvSWQsXG4gICAgcHJlZml4OiB0aGlzLmFkZFByZWZpeCgnX19wcmVmaXhfXycpLFxuICAgIGVtcHR5UGVybWl0dGVkOiB0cnVlXG4gIH1cbiAgdmFyIGZvcm0gPSBuZXcgdGhpcy5mb3JtKGt3YXJncylcbiAgdGhpcy5hZGRGaWVsZHMoZm9ybSwgbnVsbClcbiAgcmV0dXJuIGZvcm1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbGlzdCBvZiBmb3JtLmNsZWFuZWREYXRhIG9iamVjdHMgZm9yIGV2ZXJ5IGZvcm0gaW4gdGhpcy5mb3JtcygpLlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuY2xlYW5lZERhdGEgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLmlzVmFsaWQoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcih0aGlzLmNvbnN0cnVjdG9yLm5hbWUgK1xuICAgICAgICAgICAgICAgICAgICBcIiBvYmplY3QgaGFzIG5vIGF0dHJpYnV0ZSAnY2xlYW5lZERhdGEnXCIpXG4gIH1cbiAgcmV0dXJuIHRoaXMuZm9ybXMoKS5tYXAoZnVuY3Rpb24oZm9ybSkgeyByZXR1cm4gZm9ybS5jbGVhbmVkRGF0YSB9KVxufVxuXG4vKipcbiAqIFJldHVybnMgYSBsaXN0IG9mIGZvcm1zIHRoYXQgaGF2ZSBiZWVuIG1hcmtlZCBmb3IgZGVsZXRpb24uXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5kZWxldGVkRm9ybXMgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLmlzVmFsaWQoKSB8fCAhdGhpcy5jYW5EZWxldGUpIHsgcmV0dXJuIFtdIH1cblxuICB2YXIgZm9ybXMgPSB0aGlzLmZvcm1zKClcblxuICAvLyBDb25zdHJ1Y3QgX2RlbGV0ZWRGb3JtSW5kZXhlcywgd2hpY2ggaXMganVzdCBhIGxpc3Qgb2YgZm9ybSBpbmRleGVzXG4gIC8vIHRoYXQgaGF2ZSBoYWQgdGhlaXIgZGVsZXRpb24gd2lkZ2V0IHNldCB0byB0cnVlLlxuICBpZiAodHlwZW9mIHRoaXMuX2RlbGV0ZWRGb3JtSW5kZXhlcyA9PSAndW5kZWZpbmVkJykge1xuICAgIHRoaXMuX2RlbGV0ZWRGb3JtSW5kZXhlcyA9IFtdXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBmb3Jtcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBmb3JtID0gZm9ybXNbaV1cbiAgICAgIC8vIElmIHRoaXMgaXMgYW4gZXh0cmEgZm9ybSBhbmQgaGFzbid0IGNoYW5nZWQsIGlnbm9yZSBpdFxuICAgICAgaWYgKGkgPj0gdGhpcy5pbml0aWFsRm9ybUNvdW50KCkgJiYgIWZvcm0uaGFzQ2hhbmdlZCgpKSB7XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBpZiAodGhpcy5fc2hvdWxkRGVsZXRlRm9ybShmb3JtKSkge1xuICAgICAgICB0aGlzLl9kZWxldGVkRm9ybUluZGV4ZXMucHVzaChpKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzLl9kZWxldGVkRm9ybUluZGV4ZXMubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIGZvcm1zW2ldIH0pXG59XG5cbi8qKlxuICogUmV0dXJucyBhIGxpc3Qgb2YgZm9ybXMgaW4gdGhlIG9yZGVyIHNwZWNpZmllZCBieSB0aGUgaW5jb21pbmcgZGF0YS5cbiAqIFRocm93cyBhbiBFcnJvciBpZiBvcmRlcmluZyBpcyBub3QgYWxsb3dlZC5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLm9yZGVyZWRGb3JtcyA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXRoaXMuaXNWYWxpZCgpIHx8ICF0aGlzLmNhbk9yZGVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHRoaXMuY29uc3RydWN0b3IubmFtZSArXG4gICAgICAgICAgICAgICAgICAgIFwiIG9iamVjdCBoYXMgbm8gYXR0cmlidXRlICdvcmRlcmVkRm9ybXMnXCIpXG4gIH1cblxuICB2YXIgZm9ybXMgPSB0aGlzLmZvcm1zKClcblxuICAvLyBDb25zdHJ1Y3QgX29yZGVyaW5nLCB3aGljaCBpcyBhIGxpc3Qgb2YgW2Zvcm0gaW5kZXgsIG9yZGVyRmllbGRWYWx1ZV1cbiAgLy8gcGFpcnMuIEFmdGVyIGNvbnN0cnVjdGluZyB0aGlzIGxpc3QsIHdlJ2xsIHNvcnQgaXQgYnkgb3JkZXJGaWVsZFZhbHVlXG4gIC8vIHNvIHdlIGhhdmUgYSB3YXkgdG8gZ2V0IHRvIHRoZSBmb3JtIGluZGV4ZXMgaW4gdGhlIG9yZGVyIHNwZWNpZmllZCBieVxuICAvLyB0aGUgZm9ybSBkYXRhLlxuICBpZiAodHlwZW9mIHRoaXMuX29yZGVyaW5nID09ICd1bmRlZmluZWQnKSB7XG4gICAgdGhpcy5fb3JkZXJpbmcgPSBbXVxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gZm9ybXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIgZm9ybSA9IGZvcm1zW2ldXG4gICAgICAvLyBJZiB0aGlzIGlzIGFuIGV4dHJhIGZvcm0gYW5kIGhhc24ndCBjaGFuZ2VkLCBpZ25vcmUgaXRcbiAgICAgIGlmIChpID49IHRoaXMuaW5pdGlhbEZvcm1Db3VudCgpICYmICFmb3JtLmhhc0NoYW5nZWQoKSkge1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgLy8gRG9uJ3QgYWRkIGRhdGEgbWFya2VkIGZvciBkZWxldGlvblxuICAgICAgaWYgKHRoaXMuY2FuRGVsZXRlICYmIHRoaXMuX3Nob3VsZERlbGV0ZUZvcm0oZm9ybSkpIHtcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIHRoaXMuX29yZGVyaW5nLnB1c2goW2ksIGZvcm0uY2xlYW5lZERhdGFbT1JERVJJTkdfRklFTERfTkFNRV1dKVxuICAgIH1cblxuICAgIC8vIE51bGwgc2hvdWxkIGJlIHNvcnRlZCBiZWxvdyBhbnl0aGluZyBlbHNlLiBBbGxvd2luZyBudWxsIGFzIGFcbiAgICAvLyBjb21wYXJpc29uIHZhbHVlIG1ha2VzIGl0IHNvIHdlIGNhbiBsZWF2ZSBvcmRlcmluZyBmaWVsZHMgYmxhbmsuXG4gICAgdGhpcy5fb3JkZXJpbmcuc29ydChmdW5jdGlvbih4LCB5KSB7XG4gICAgICBpZiAoeFsxXSA9PT0gbnVsbCAmJiB5WzFdID09PSBudWxsKSB7XG4gICAgICAgIC8vIFNvcnQgYnkgZm9ybSBpbmRleCBpZiBib3RoIG9yZGVyIGZpZWxkIHZhbHVlcyBhcmUgbnVsbFxuICAgICAgICByZXR1cm4geFswXSAtIHlbMF1cbiAgICAgIH1cbiAgICAgIGlmICh4WzFdID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiAxXG4gICAgICB9XG4gICAgICBpZiAoeVsxXSA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gLTFcbiAgICAgIH1cbiAgICAgIHJldHVybiB4WzFdIC0geVsxXVxuICAgIH0pXG4gIH1cblxuICByZXR1cm4gdGhpcy5fb3JkZXJpbmcubWFwKGZ1bmN0aW9uKG9yZGVyaW5nKSB7IHJldHVybiBmb3Jtc1tvcmRlcmluZ1swXV19KVxufVxuXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuZ2V0RGVmYXVsdFByZWZpeCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ2Zvcm0nXG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBFcnJvckxpc3Qgb2YgZXJyb3JzIHRoYXQgYXJlbid0IGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY3VsYXJcbiAqIGZvcm0gLS0gaS5lLiwgZnJvbSBmb3Jtc2V0LmNsZWFuKCkuIFJldHVybnMgYW4gZW1wdHkgRXJyb3JMaXN0IGlmIHRoZXJlIGFyZVxuICogbm9uZS5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLm5vbkZvcm1FcnJvcnMgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX25vbkZvcm1FcnJvcnMgPT09IG51bGwpIHtcbiAgICB0aGlzLmZ1bGxDbGVhbigpXG4gIH1cbiAgcmV0dXJuIHRoaXMuX25vbkZvcm1FcnJvcnNcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbGlzdCBvZiBmb3JtLmVycm9ycyBmb3IgZXZlcnkgZm9ybSBpbiB0aGlzLmZvcm1zLlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuZXJyb3JzID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9lcnJvcnMgPT09IG51bGwpIHtcbiAgICB0aGlzLmZ1bGxDbGVhbigpXG4gIH1cbiAgcmV0dXJuIHRoaXMuX2Vycm9yc1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIG51bWJlciBvZiBlcnJvcnMgYWNyb3NzIGFsbCBmb3JtcyBpbiB0aGUgZm9ybXNldC5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLnRvdGFsRXJyb3JDb3VudCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gKHRoaXMubm9uRm9ybUVycm9ycygpLmxlbmd0aCgpICtcbiAgICAgICAgICB0aGlzLmVycm9ycygpLnJlZHVjZShmdW5jdGlvbihzdW0sIGZvcm1FcnJvcnMpIHtcbiAgICAgICAgICAgIHJldHVybiBzdW0gKyBmb3JtRXJyb3JzLmxlbmd0aCgpXG4gICAgICAgICAgfSwgMCkpXG59XG5cbi8qKlxuICogUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgZm9ybSB3YXMgbWFya2VkIGZvciBkZWxldGlvbi5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLl9zaG91bGREZWxldGVGb3JtID0gZnVuY3Rpb24oZm9ybSkge1xuICByZXR1cm4gb2JqZWN0LmdldChmb3JtLmNsZWFuZWREYXRhLCBERUxFVElPTl9GSUVMRF9OQU1FLCBmYWxzZSlcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgZXZlcnkgZm9ybSBpbiB0aGlzLmZvcm1zKCkgaXMgdmFsaWQuXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5pc1ZhbGlkID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5pc0JvdW5kKSB7IHJldHVybiBmYWxzZSB9XG5cbiAgLy8gV2UgbG9vcCBvdmVyIGV2ZXJ5IGZvcm0uZXJyb3JzIGhlcmUgcmF0aGVyIHRoYW4gc2hvcnQgY2lyY3VpdGluZyBvbiB0aGVcbiAgLy8gZmlyc3QgZmFpbHVyZSB0byBtYWtlIHN1cmUgdmFsaWRhdGlvbiBnZXRzIHRyaWdnZXJlZCBmb3IgZXZlcnkgZm9ybS5cbiAgdmFyIGZvcm1zVmFsaWQgPSB0cnVlXG4gIC8vIFRyaWdnZXJzIGEgZnVsbCBjbGVhblxuICB0aGlzLmVycm9ycygpXG4gIHZhciBmb3JtcyA9IHRoaXMuZm9ybXMoKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGZvcm1zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBmb3JtID0gZm9ybXNbaV1cbiAgICBpZiAodGhpcy5jYW5EZWxldGUgJiYgdGhpcy5fc2hvdWxkRGVsZXRlRm9ybShmb3JtKSkge1xuICAgICAgLy8gVGhpcyBmb3JtIGlzIGdvaW5nIHRvIGJlIGRlbGV0ZWQgc28gYW55IG9mIGl0cyBlcnJvcnMgc2hvdWxkXG4gICAgICAvLyBub3QgY2F1c2UgdGhlIGVudGlyZSBmb3Jtc2V0IHRvIGJlIGludmFsaWQuXG4gICAgICBjb250aW51ZVxuICAgIH1cbiAgICBpZiAoIWZvcm0uaXNWYWxpZCgpKSB7XG4gICAgICBmb3Jtc1ZhbGlkID0gZmFsc2VcbiAgICB9XG4gIH1cblxuICByZXR1cm4gKGZvcm1zVmFsaWQgJiYgIXRoaXMubm9uRm9ybUVycm9ycygpLmlzUG9wdWxhdGVkKCkpXG59XG5cbi8qKlxuICogQ2xlYW5zIGFsbCBvZiB0aGlzLmRhdGEgYW5kIHBvcHVsYXRlcyB0aGlzLl9lcnJvcnMgYW5kIHRoaXMuX25vbkZvcm1FcnJvcnMuXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5mdWxsQ2xlYW4gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fZXJyb3JzID0gW11cbiAgdGhpcy5fbm9uRm9ybUVycm9ycyA9IG5ldyB0aGlzLmVycm9yQ29uc3RydWN0b3IoKVxuXG4gIGlmICghdGhpcy5pc0JvdW5kKSB7XG4gICAgcmV0dXJuIC8vIFN0b3AgZnVydGhlciBwcm9jZXNzaW5nXG4gIH1cblxuICB2YXIgZm9ybXMgPSB0aGlzLmZvcm1zKClcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBmb3Jtcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgZm9ybSA9IGZvcm1zW2ldXG4gICAgdGhpcy5fZXJyb3JzLnB1c2goZm9ybS5lcnJvcnMoKSlcbiAgfVxuXG4gIHRyeSB7XG4gICAgdmFyIHRvdGFsRm9ybUNvdW50ID0gdGhpcy50b3RhbEZvcm1Db3VudCgpXG4gICAgdmFyIGRlbGV0ZWRGb3JtQ291bnQgPSB0aGlzLmRlbGV0ZWRGb3JtcygpLmxlbmd0aFxuICAgIGlmICgodGhpcy52YWxpZGF0ZU1heCAmJiB0b3RhbEZvcm1Db3VudCAtIGRlbGV0ZWRGb3JtQ291bnQgPiB0aGlzLm1heE51bSkgfHxcbiAgICAgICAgIHRoaXMubWFuYWdlbWVudEZvcm0oKS5jbGVhbmVkRGF0YVtUT1RBTF9GT1JNX0NPVU5UXSA+IHRoaXMuYWJzb2x1dGVNYXgpIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcignUGxlYXNlIHN1Ym1pdCAnICsgdGhpcy5tYXhOdW0gKyAnIG9yIGZld2VyIGZvcm1zLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge2NvZGU6ICd0b29NYW55Rm9ybXMnfSlcbiAgICB9XG4gICAgaWYgKHRoaXMudmFsaWRhdGVNaW4gJiYgdG90YWxGb3JtQ291bnQgLSBkZWxldGVkRm9ybUNvdW50IDwgdGhpcy5taW5OdW0pIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcignUGxlYXNlIHN1Ym1pdCAnICsgdGhpcy5taW5OdW0gKyAnIG9yIG1vcmUgZm9ybXMuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Y29kZTogJ3Rvb0Zld0Zvcm1zJ30pXG4gICAgfVxuICAgIC8vIEdpdmUgdGhpcy5jbGVhbigpIGEgY2hhbmNlIHRvIGRvIGNyb3NzLWZvcm0gdmFsaWRhdGlvbi5cbiAgICB0aGlzLmNsZWFuKClcbiAgfVxuICBjYXRjaCAoZSkge1xuICAgIGlmICghKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7IHRocm93IGUgfVxuICAgIHRoaXMuX25vbkZvcm1FcnJvcnMgPSBuZXcgdGhpcy5lcnJvckNvbnN0cnVjdG9yKGUubWVzc2FnZXMoKSlcbiAgfVxufVxuXG4vKipcbiAqIEhvb2sgZm9yIGRvaW5nIGFueSBleHRyYSBmb3Jtc2V0LXdpZGUgY2xlYW5pbmcgYWZ0ZXIgRm9ybS5jbGVhbigpIGhhcyBiZWVuXG4gKiBjYWxsZWQgb24gZXZlcnkgZm9ybS4gQW55IFZhbGlkYXRpb25FcnJvciByYWlzZWQgYnkgdGhpcyBtZXRob2Qgd2lsbCBub3QgYmVcbiAqIGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY3VsYXIgZm9ybTsgaXQgd2lsbCBiZSBhY2Nlc2libGUgdmlhXG4gKiBmb3Jtc2V0Lm5vbkZvcm1FcnJvcnMoKVxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbigpIHt9XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIGFueSBmb3JtIGRpZmZlcnMgZnJvbSBpbml0aWFsLlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuaGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZm9ybXMgPSB0aGlzLmZvcm1zKClcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBmb3Jtcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoZm9ybXNbaV0uaGFzQ2hhbmdlZCgpKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBBIGhvb2sgZm9yIGFkZGluZyBleHRyYSBmaWVsZHMgb24gdG8gZWFjaCBmb3JtIGluc3RhbmNlLlxuICogQHBhcmFtIHtGb3JtfSBmb3JtIHRoZSBmb3JtIGZpZWxkcyBhcmUgdG8gYmUgYWRkZWQgdG8uXG4gKiBAcGFyYW0ge051bWJlcn0gaW5kZXggdGhlIGluZGV4IG9mIHRoZSBnaXZlbiBmb3JtIGluIHRoZSBmb3Jtc2V0LlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuYWRkRmllbGRzID0gZnVuY3Rpb24oZm9ybSwgaW5kZXgpIHtcbiAgaWYgKHRoaXMuY2FuT3JkZXIpIHtcbiAgICAvLyBPbmx5IHByZS1maWxsIHRoZSBvcmRlcmluZyBmaWVsZCBmb3IgaW5pdGlhbCBmb3Jtc1xuICAgIGlmIChpbmRleCAhPSBudWxsICYmIGluZGV4IDwgdGhpcy5pbml0aWFsRm9ybUNvdW50KCkpIHtcbiAgICAgIGZvcm0uZmllbGRzW09SREVSSU5HX0ZJRUxEX05BTUVdID1cbiAgICAgICAgICBJbnRlZ2VyRmllbGQoe2xhYmVsOiAnT3JkZXInLCBpbml0aWFsOiBpbmRleCArIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogZmFsc2V9KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGZvcm0uZmllbGRzW09SREVSSU5HX0ZJRUxEX05BTUVdID1cbiAgICAgICAgICBJbnRlZ2VyRmllbGQoe2xhYmVsOiAnT3JkZXInLCByZXF1aXJlZDogZmFsc2V9KVxuICAgIH1cbiAgfVxuICBpZiAodGhpcy5jYW5EZWxldGUpIHtcbiAgICBmb3JtLmZpZWxkc1tERUxFVElPTl9GSUVMRF9OQU1FXSA9XG4gICAgICAgIEJvb2xlYW5GaWVsZCh7bGFiZWw6ICdEZWxldGUnLCByZXF1aXJlZDogZmFsc2V9KVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZm9ybXNldCBwcmVmaXggd2l0aCB0aGUgZm9ybSBpbmRleCBhcHBlbmRlZC5cbiAqIEBwYXJhbSB7TnVtYmVyfSBpbmRleCB0aGUgaW5kZXggb2YgYSBmb3JtIGluIHRoZSBmb3Jtc2V0LlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuYWRkUHJlZml4ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgcmV0dXJuIHRoaXMucHJlZml4ICsgJy0nICsgaW5kZXhcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGZvcm1zZXQgbmVlZHMgdG8gYmUgbXVsdGlwYXJ0LWVuY29kZWQsIGkuZS4gaXQgaGFzIGFcbiAqIEZpbGVJbnB1dC4gT3RoZXJ3aXNlLCBmYWxzZS5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmlzTXVsdGlwYXJ0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAodGhpcy5mb3JtcygpLmxlbmd0aCA+IDAgJiYgdGhpcy5mb3JtcygpWzBdLmlzTXVsdGlwYXJ0KCkpXG59XG5cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuYXNUYWJsZSgpXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGZvcm1zZXQgcmVuZGVyZWQgYXMgSFRNTCA8dHI+cyAtIGV4Y2x1ZGluZyB0aGUgPHRhYmxlPi5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmFzVGFibGUgPSBmdW5jdGlvbigpIHtcbiAgLy8gWFhYOiB0aGVyZSBpcyBubyBzZW1hbnRpYyBkaXZpc2lvbiBiZXR3ZWVuIGZvcm1zIGhlcmUsIHRoZXJlIHByb2JhYmx5XG4gIC8vIHNob3VsZCBiZS4gSXQgbWlnaHQgbWFrZSBzZW5zZSB0byByZW5kZXIgZWFjaCBmb3JtIGFzIGEgdGFibGUgcm93IHdpdGhcbiAgLy8gZWFjaCBmaWVsZCBhcyBhIHRkLlxuICB2YXIgcm93cyA9IHRoaXMubWFuYWdlbWVudEZvcm0oKS5hc1RhYmxlKClcbiAgdGhpcy5mb3JtcygpLmZvckVhY2goZnVuY3Rpb24oZm9ybSkgeyByb3dzID0gcm93cy5jb25jYXQoZm9ybS5hc1RhYmxlKCkpIH0pXG4gIHJldHVybiByb3dzXG59XG5cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5hc0RpdiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcm93cyA9IHRoaXMubWFuYWdlbWVudEZvcm0oKS5hc0RpdigpXG4gIHRoaXMuZm9ybXMoKS5mb3JFYWNoKGZ1bmN0aW9uKGZvcm0pIHsgcm93cyA9IHJvd3MuY29uY2F0KGZvcm0uYXNEaXYoKSkgfSlcbiAgcmV0dXJuIHJvd3Ncbn1cblxuQmFzZUZvcm1TZXQucHJvdG90eXBlLmFzVWwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJvd3MgPSB0aGlzLm1hbmFnZW1lbnRGb3JtKCkuYXNVbCgpXG4gIHRoaXMuZm9ybXMoKS5mb3JFYWNoKGZ1bmN0aW9uKGZvcm0pIHsgcm93cyA9IHJvd3MuY29uY2F0KGZvcm0uYXNVbCgpKSB9KVxuICByZXR1cm4gcm93c1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBGb3JtU2V0IGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gRm9ybSBjb25zdHJ1Y3Rvci5cbiAqIEBwYXJhbSB7Rm9ybX0gZm9ybVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xuZnVuY3Rpb24gZm9ybXNldEZhY3RvcnkoZm9ybSwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgIGZvcm1zZXQ6IEJhc2VGb3JtU2V0LCBleHRyYTogMSwgY2FuT3JkZXI6IGZhbHNlLCBjYW5EZWxldGU6IGZhbHNlLFxuICAgIG1heE51bTogREVGQVVMVF9NQVhfTlVNLCB2YWxpZGF0ZU1heDogZmFsc2UsXG4gICAgbWluTnVtOiBERUZBVUxUX01JTl9OVU0sIHZhbGlkYXRlTWluOiBmYWxzZVxuICB9LCBrd2FyZ3MpXG5cbiAgLy8gUmVtb3ZlIHNwZWNpYWwgcHJvcGVydGllcyBmcm9tIGt3YXJncywgYXMgaXQgd2lsbCBzdWJzZXF1ZW50bHkgYmUgdXNlZCB0b1xuICAvLyBhZGQgcHJvcGVydGllcyB0byB0aGUgbmV3IGZvcm1zZXQncyBwcm90b3R5cGUuXG4gIHZhciBmb3Jtc2V0ID0gb2JqZWN0LnBvcChrd2FyZ3MsICdmb3Jtc2V0JylcbiAgdmFyIGV4dHJhID0gb2JqZWN0LnBvcChrd2FyZ3MsICdleHRyYScpXG4gIHZhciBjYW5PcmRlciA9IG9iamVjdC5wb3Aoa3dhcmdzLCAnY2FuT3JkZXInKVxuICB2YXIgY2FuRGVsZXRlID0gb2JqZWN0LnBvcChrd2FyZ3MsICdjYW5EZWxldGUnKVxuICB2YXIgbWF4TnVtID0gb2JqZWN0LnBvcChrd2FyZ3MsICdtYXhOdW0nKVxuICB2YXIgdmFsaWRhdGVNYXggPSBvYmplY3QucG9wKGt3YXJncywgJ3ZhbGlkYXRlTWF4JylcbiAgdmFyIG1pbk51bSA9IG9iamVjdC5wb3Aoa3dhcmdzLCAnbWluTnVtJylcbiAgdmFyIHZhbGlkYXRlTWluID0gb2JqZWN0LnBvcChrd2FyZ3MsICd2YWxpZGF0ZU1pbicpXG5cbiAgLy8gSGFyZCBsaW1pdCBvbiBmb3JtcyBpbnN0YW50aWF0ZWQsIHRvIHByZXZlbnQgbWVtb3J5LWV4aGF1c3Rpb24gYXR0YWNrc1xuICAvLyBsaW1pdCBpcyBzaW1wbHkgbWF4TnVtICsgREVGQVVMVF9NQVhfTlVNICh3aGljaCBpcyAyICogREVGQVVMVF9NQVhfTlVNXG4gIC8vIGlmIG1heE51bSBpcyBub3QgcHJvdmlkZWQgaW4gdGhlIGZpcnN0IHBsYWNlKVxuICB2YXIgYWJzb2x1dGVNYXggPSBtYXhOdW0gKyBERUZBVUxUX01BWF9OVU1cbiAgZXh0cmEgKz0gbWluTnVtXG5cbiAga3dhcmdzLmNvbnN0cnVjdG9yID0gZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgdGhpcy5mb3JtID0gZm9ybVxuICAgIHRoaXMuZXh0cmEgPSBleHRyYVxuICAgIHRoaXMuY2FuT3JkZXIgPSBjYW5PcmRlclxuICAgIHRoaXMuY2FuRGVsZXRlID0gY2FuRGVsZXRlXG4gICAgdGhpcy5tYXhOdW0gPSBtYXhOdW1cbiAgICB0aGlzLnZhbGlkYXRlTWF4ID0gdmFsaWRhdGVNYXhcbiAgICB0aGlzLm1pbk51bSA9IG1pbk51bVxuICAgIHRoaXMudmFsaWRhdGVNaW4gPSB2YWxpZGF0ZU1pblxuICAgIHRoaXMuYWJzb2x1dGVNYXggPSBhYnNvbHV0ZU1heFxuICAgIGZvcm1zZXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cblxuICB2YXIgZm9ybXNldENvbnN0cnVjdG9yID0gZm9ybXNldC5leHRlbmQoa3dhcmdzKVxuXG4gIHJldHVybiBmb3Jtc2V0Q29uc3RydWN0b3Jcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgZXZlcnkgZm9ybXNldCBpbiBmb3Jtc2V0cyBpcyB2YWxpZC5cbiAqL1xuZnVuY3Rpb24gYWxsVmFsaWQoZm9ybXNldHMpIHtcbiAgdmFyIHZhbGlkID0gdHJ1ZVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGZvcm1zZXRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmICghZm9ybXNldHNbaV0uaXNWYWxpZCgpKSB7XG4gICAgICAgIHZhbGlkID0gZmFsc2VcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbGlkXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBERUZBVUxUX01BWF9OVU06IERFRkFVTFRfTUFYX05VTVxuLCBCYXNlRm9ybVNldDogQmFzZUZvcm1TZXRcbiwgZm9ybXNldEZhY3Rvcnk6IGZvcm1zZXRGYWN0b3J5XG4sIGFsbFZhbGlkOiBhbGxWYWxpZFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgb2JqZWN0ID0gcmVxdWlyZSgnaXNvbW9ycGgvb2JqZWN0JylcbnZhciB2YWxpZGF0b3JzID0gcmVxdWlyZSgndmFsaWRhdG9ycycpXG5cbnZhciBlbnYgPSByZXF1aXJlKCcuL2VudicpXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpXG52YXIgd2lkZ2V0cyA9IHJlcXVpcmUoJy4vd2lkZ2V0cycpXG52YXIgZmllbGRzID0gcmVxdWlyZSgnLi9maWVsZHMnKVxudmFyIGZvcm1zID0gcmVxdWlyZSgnLi9mb3JtcycpXG52YXIgZm9ybXNldHMgPSByZXF1aXJlKCcuL2Zvcm1zZXRzJylcblxub2JqZWN0LmV4dGVuZChcbiAgbW9kdWxlLmV4cG9ydHNcbiwgeyBlbnY6IGVudlxuICAsIFZhbGlkYXRpb25FcnJvcjogdmFsaWRhdG9ycy5WYWxpZGF0aW9uRXJyb3JcbiAgLCBFcnJvck9iamVjdDogdXRpbC5FcnJvck9iamVjdFxuICAsIEVycm9yTGlzdDogdXRpbC5FcnJvckxpc3RcbiAgLCBmb3JtRGF0YTogdXRpbC5mb3JtRGF0YVxuICAsIHV0aWw6IHtcbiAgICAgIGZvcm1hdFRvQXJyYXk6IHV0aWwuZm9ybWF0VG9BcnJheVxuICAgICwgcHJldHR5TmFtZTogdXRpbC5wcmV0dHlOYW1lXG4gICAgfVxuICAsIHZhbGlkYXRvcnM6IHZhbGlkYXRvcnNcbiAgfVxuLCB3aWRnZXRzXG4sIGZpZWxkc1xuLCBmb3Jtc1xuLCBmb3Jtc2V0c1xuKVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29uY3VyID0gcmVxdWlyZSgnQ29uY3VyJylcbnZhciBpcyA9IHJlcXVpcmUoJ2lzb21vcnBoL2lzJylcbnZhciBvYmplY3QgPSByZXF1aXJlKCdpc29tb3JwaC9vYmplY3QnKVxudmFyIHZhbGlkYXRvcnMgPSByZXF1aXJlKCd2YWxpZGF0b3JzJylcblxudmFyIFZhbGlkYXRpb25FcnJvciA9IHZhbGlkYXRvcnMuVmFsaWRhdGlvbkVycm9yXG5cbnZhciBERUZBVUxUX0RBVEVfSU5QVVRfRk9STUFUUyA9IFtcbiAgJyVZLSVtLSVkJyAgICAgICAgICAgICAgLy8gJzIwMDYtMTAtMjUnXG4sICclbS8lZC8lWScsICclbS8lZC8leScgIC8vICcxMC8yNS8yMDA2JywgJzEwLzI1LzA2J1xuLCAnJWIgJWQgJVknLCAnJWIgJWQsICVZJyAvLyAnT2N0IDI1IDIwMDYnLCAnT2N0IDI1LCAyMDA2J1xuLCAnJWQgJWIgJVknLCAnJWQgJWIsICVZJyAvLyAnMjUgT2N0IDIwMDYnLCAnMjUgT2N0LCAyMDA2J1xuLCAnJUIgJWQgJVknLCAnJUIgJWQsICVZJyAvLyAnT2N0b2JlciAyNSAyMDA2JywgJ09jdG9iZXIgMjUsIDIwMDYnXG4sICclZCAlQiAlWScsICclZCAlQiwgJVknIC8vICcyNSBPY3RvYmVyIDIwMDYnLCAnMjUgT2N0b2JlciwgMjAwNidcbl1cblxudmFyIERFRkFVTFRfVElNRV9JTlBVVF9GT1JNQVRTID0gW1xuICAnJUg6JU06JVMnIC8vICcxNDozMDo1OSdcbiwgJyVIOiVNJyAgICAvLyAnMTQ6MzAnXG5dXG5cbnZhciBERUZBVUxUX0RBVEVUSU1FX0lOUFVUX0ZPUk1BVFMgPSBbXG4gICclWS0lbS0lZCAlSDolTTolUycgLy8gJzIwMDYtMTAtMjUgMTQ6MzA6NTknXG4sICclWS0lbS0lZCAlSDolTScgICAgLy8gJzIwMDYtMTAtMjUgMTQ6MzAnXG4sICclWS0lbS0lZCcgICAgICAgICAgLy8gJzIwMDYtMTAtMjUnXG4sICclbS8lZC8lWSAlSDolTTolUycgLy8gJzEwLzI1LzIwMDYgMTQ6MzA6NTknXG4sICclbS8lZC8lWSAlSDolTScgICAgLy8gJzEwLzI1LzIwMDYgMTQ6MzAnXG4sICclbS8lZC8lWScgICAgICAgICAgLy8gJzEwLzI1LzIwMDYnXG4sICclbS8lZC8leSAlSDolTTolUycgLy8gJzEwLzI1LzA2IDE0OjMwOjU5J1xuLCAnJW0vJWQvJXkgJUg6JU0nICAgIC8vICcxMC8yNS8wNiAxNDozMCdcbiwgJyVtLyVkLyV5JyAgICAgICAgICAvLyAnMTAvMjUvMDYnXG5dXG5cbi8qKlxuICogQWxsb3dzIGFuIEFycmF5LCBhbiBvYmplY3Qgd2l0aCBhbiBfX2l0ZXJfXyBtZXRob2Qgb3IgYSBmdW5jdGlvbiB3aGljaFxuICogcmV0dXJucyBlaXRoZXIgYmUgdXNlZCB3aGVuIHVsdGltYXRlbHkgZXhwZWN0aW5nIGFuIEFycmF5LlxuICovXG5mdW5jdGlvbiBpdGVyYXRlKG8pIHtcbiAgaWYgKGlzLkFycmF5KG8pKSB7XG4gICAgcmV0dXJuIG9cbiAgfVxuICBpZiAoaXMuRnVuY3Rpb24obykpIHtcbiAgICBvID0gbygpXG4gIH1cbiAgaWYgKG8gIT0gbnVsbCAmJiBpcy5GdW5jdGlvbihvLl9faXRlcl9fKSkge1xuICAgIG8gPSBvLl9faXRlcl9fKClcbiAgfVxuICByZXR1cm4gbyB8fCBbXVxufVxuXG4vKipcbiAqIFJlcGxhY2VzIFN0cmluZyB7cGxhY2Vob2xkZXJzfSB3aXRoIHByb3BlcnRpZXMgb2YgYSBnaXZlbiBvYmplY3QsIGJ1dFxuICogaW50ZXJwb2xhdGVzIGludG8gYW5kIHJldHVybnMgYW4gQXJyYXkgaW5zdGVhZCBvZiBhIFN0cmluZy5cbiAqIEJ5IGRlZmF1bHQsIGFueSByZXN1bHRpbmcgZW1wdHkgc3RyaW5ncyBhcmUgc3RyaXBwZWQgb3V0IG9mIHRoZSBBcnJheS4gVG9cbiAqIGRpc2FibGUgdGhpcywgcGFzcyBhbiBvcHRpb25zIG9iamVjdCB3aXRoIGEgJ3N0cmlwJyBwcm9wZXJ0eSB3aGljaCBpcyBmYWxzZS5cbiAqL1xuZnVuY3Rpb24gZm9ybWF0VG9BcnJheShzdHIsIG9iaiwgb3B0aW9ucykge1xuICB2YXIgcGFydHMgPSBzdHIuc3BsaXQoL1xceyhcXHcrKVxcfS9nKVxuICBmb3IgKHZhciBpID0gMSwgbCA9IHBhcnRzLmxlbmd0aDsgaSA8IGw7IGkgKz0gMikge1xuICAgIHBhcnRzW2ldID0gKG9iamVjdC5oYXNPd24ob2JqLCBwYXJ0c1tpXSlcbiAgICAgICAgICAgICAgICA/IG9ialtwYXJ0c1tpXV1cbiAgICAgICAgICAgICAgICA6ICd7JyArIHBhcnRzW2ldICsgJ30nKVxuICB9XG4gIGlmICghb3B0aW9ucyB8fCAob3B0aW9ucyAmJiBvcHRpb25zLnN0cmlwICE9PSBmYWxzZSkpIHtcbiAgICBwYXJ0cyA9IHBhcnRzLmZpbHRlcihmdW5jdGlvbihwKSB7IHJldHVybiBwICE9PSAnJ30pXG4gIH1cbiAgcmV0dXJuIHBhcnRzXG59XG5cbi8qKlxuICogQ29udmVydHMgJ2ZpcnN0TmFtZScgYW5kICdmaXJzdF9uYW1lJyB0byAnRmlyc3QgbmFtZScsIGFuZFxuICogJ1NIT1VUSU5HX0xJS0VfVEhJUycgdG8gJ1NIT1VUSU5HIExJS0UgVEhJUycuXG4gKi9cbnZhciBwcmV0dHlOYW1lID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgY2Fwc1JFID0gLyhbQS1aXSspL2dcbiAgdmFyIHNwbGl0UkUgPSAvWyBfXSsvXG4gIHZhciBhbGxDYXBzUkUgPSAvXltBLVpdW0EtWjAtOV0rJC9cblxuICByZXR1cm4gZnVuY3Rpb24obmFtZSkge1xuICAgIC8vIFByZWZpeCBzZXF1ZW5jZXMgb2YgY2FwcyB3aXRoIHNwYWNlcyBhbmQgc3BsaXQgb24gYWxsIHNwYWNlXG4gICAgLy8gY2hhcmFjdGVycy5cbiAgICB2YXIgcGFydHMgPSBuYW1lLnJlcGxhY2UoY2Fwc1JFLCAnICQxJykuc3BsaXQoc3BsaXRSRSlcblxuICAgIC8vIElmIHdlIGhhZCBhbiBpbml0aWFsIGNhcC4uLlxuICAgIGlmIChwYXJ0c1swXSA9PT0gJycpIHtcbiAgICAgIHBhcnRzLnNwbGljZSgwLCAxKVxuICAgIH1cblxuICAgIC8vIEdpdmUgdGhlIGZpcnN0IHdvcmQgYW4gaW5pdGlhbCBjYXAgYW5kIGFsbCBzdWJzZXF1ZW50IHdvcmRzIGFuXG4gICAgLy8gaW5pdGlhbCBsb3dlcmNhc2UgaWYgbm90IGFsbCBjYXBzLlxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICBwYXJ0c1swXSA9IHBhcnRzWzBdLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICtcbiAgICAgICAgICAgICAgICAgICBwYXJ0c1swXS5zdWJzdHIoMSlcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKCFhbGxDYXBzUkUudGVzdChwYXJ0c1tpXSkpIHtcbiAgICAgICAgcGFydHNbaV0gPSBwYXJ0c1tpXS5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArXG4gICAgICAgICAgICAgICAgICAgcGFydHNbaV0uc3Vic3RyKDEpXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnRzLmpvaW4oJyAnKVxuICB9XG59KSgpXG5cbi8qKlxuICogQ3JlYXRlcyBhbiBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBkYXRhIGhlbGQgaW4gYSBmb3JtJ3MgZWxlbWVudHMuXG4gKiBAcGFyYW0ge0hUTUxGb3JtRWxlbWVudHxzdHJpbmd9IGZvcm0gYSBmb3JtIERPTSBlbGVtZW50IG9yIGEgU3RyaW5nXG4gKiAgIHNwZWNpZnlpbmcgYSBmb3JtJ3MgaWQgb3IgbmFtZSBhdHRyaWJ1dGUuIElmIGEgU3RyaW5nIGlzIGdpdmVuLCBpZCBpcyB0cmllZFxuICogICBiZWZvcmUgbmFtZSB3aGVuIGF0dGVtcHRpbmcgdG8gZmluZCB0aGUgZm9ybSBpbiB0aGUgRE9NLiBBbiBlcnJvciB3aWxsIGJlXG4gKiAgIHRocm93biBpZiB0aGUgZm9ybSBjb3VsZCBub3QgYmUgZm91bmQuXG4gKiBAcmV0dXJuIGFuIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIGRhdGEgcHJlc2VudCBpbiB0aGUgZm9ybS5cbiAqL1xuZnVuY3Rpb24gZm9ybURhdGEoZm9ybSkge1xuICB2YXIgZGF0YSA9IHt9XG4gIGlmIChpcy5TdHJpbmcoZm9ybSkpIHtcbiAgICBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZm9ybSkgfHwgZG9jdW1lbnQuZm9ybXNbZm9ybV1cbiAgfVxuICBpZiAoIWZvcm0pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJmb3JtRGF0YSBjb3VsZG4ndCBmaW5kIGEgZm9ybSB3aXRoICdcIiArIGZvcm0gKyBcIidcIilcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gZm9ybS5lbGVtZW50cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgZWxlbWVudCA9IGZvcm0uZWxlbWVudHNbaV1cbiAgICB2YXIgdHlwZSA9IGVsZW1lbnQudHlwZVxuICAgIHZhciB2YWx1ZSA9IG51bGxcblxuICAgIC8vIFJldHJpZXZlIHRoZSBlbGVtZW50J3MgdmFsdWUgKG9yIHZhbHVlcylcbiAgICBpZiAodHlwZSA9PSAnaGlkZGVuJyB8fCB0eXBlID09ICdwYXNzd29yZCcgfHwgdHlwZSA9PSAndGV4dCcgfHxcbiAgICAgICAgdHlwZSA9PSAnZW1haWwnIHx8IHR5cGUgPT0gJ3VybCcgfHwgdHlwZSA9PSAnbnVtYmVyJyB8fCB0eXBlID09ICdmaWxlJyB8fFxuICAgICAgICB0eXBlID09ICd0ZXh0YXJlYScgfHwgKCh0eXBlID09ICdjaGVja2JveCcgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9PSAncmFkaW8nKSAmJiBlbGVtZW50LmNoZWNrZWQpKSB7XG4gICAgICB2YWx1ZSA9IGVsZW1lbnQudmFsdWVcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSA9PSAnc2VsZWN0LW9uZScpIHtcbiAgICAgIGlmIChlbGVtZW50Lm9wdGlvbnMubGVuZ3RoKSB7XG4gICAgICAgIHZhbHVlID0gZWxlbWVudC5vcHRpb25zW2VsZW1lbnQuc2VsZWN0ZWRJbmRleF0udmFsdWVcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSA9PSAnc2VsZWN0LW11bHRpcGxlJykge1xuICAgICAgdmFsdWUgPSBbXVxuICAgICAgZm9yICh2YXIgaiA9IDAsIG0gPSBlbGVtZW50Lm9wdGlvbnMubGVuZ3RoOyBqIDwgbTsgaisrKSB7XG4gICAgICAgIGlmIChlbGVtZW50Lm9wdGlvbnNbal0uc2VsZWN0ZWQpIHtcbiAgICAgICAgICB2YWx1ZS5wdXNoKGVsZW1lbnQub3B0aW9uc1tqXS52YWx1ZSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YWx1ZSA9IG51bGxcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZGQgYW55IHZhbHVlIG9idGFpbmVkIHRvIHRoZSBkYXRhIG9iamVjdFxuICAgIGlmICh2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgaWYgKG9iamVjdC5oYXNPd24oZGF0YSwgZWxlbWVudC5uYW1lKSkge1xuICAgICAgICBpZiAoaXMuQXJyYXkoZGF0YVtlbGVtZW50Lm5hbWVdKSkge1xuICAgICAgICAgIGRhdGFbZWxlbWVudC5uYW1lXSA9IGRhdGFbZWxlbWVudC5uYW1lXS5jb25jYXQodmFsdWUpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGF0YVtlbGVtZW50Lm5hbWVdID0gW2RhdGFbZWxlbWVudC5uYW1lXSwgdmFsdWVdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkYXRhW2VsZW1lbnQubmFtZV0gPSB2YWx1ZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkYXRhXG59XG5cbi8qKlxuICogQ29lcmNlcyB0byBzdHJpbmcgYW5kIHN0cmlwcyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzcGFjZXMuXG4gKi9cbnZhciBzdHJpcCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc3RyaXBSRSA9LyheXFxzK3xcXHMrJCkvZ1xuICByZXR1cm4gZnVuY3Rpb24gc3RyaXAocykge1xuICAgIHJldHVybiAoJycrcykucmVwbGFjZShzdHJpcFJFLCAnJylcbiAgfVxufSgpXG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIGZpZWxkIGVycm9ycyB0aGF0IGtub3dzIGhvdyB0byBkaXNwbGF5IGl0c2VsZiBpbiB2YXJpb3VzXG4gKiBmb3JtYXRzLiBUaGlzIG9iamVjdCdzIC5lcnJvciBwcm9wZXJ0aWVzIGFyZSB0aGUgZmllbGQgbmFtZXMgYW5kXG4gKiBjb3JyZXNwb25kaW5nIHZhbHVlcyBhcmUgdGhlIGVycm9ycy5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgRXJyb3JPYmplY3QgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEVycm9yT2JqZWN0KGVycm9ycykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBFcnJvck9iamVjdCkpIHsgcmV0dXJuIG5ldyBFcnJvck9iamVjdChlcnJvcnMpIH1cbiAgICB0aGlzLmVycm9ycyA9IGVycm9ycyB8fCB7fVxuICB9XG59KVxuXG5FcnJvck9iamVjdC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oZmllbGQsIGVycm9yKSB7XG4gIHRoaXMuZXJyb3JzW2ZpZWxkXSA9IGVycm9yXG59XG5cbkVycm9yT2JqZWN0LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihmaWVsZCkge1xuICByZXR1cm4gdGhpcy5lcnJvcnNbZmllbGRdXG59XG5cbkVycm9yT2JqZWN0LnByb3RvdHlwZS5oYXNGaWVsZCA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gIHJldHVybiBvYmplY3QuaGFzT3duKHRoaXMuZXJyb3JzLCBmaWVsZClcbn1cblxuRXJyb3JPYmplY3QucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5lcnJvcnMpLmxlbmd0aFxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgYW55IGVycm9ycyBhcmUgcHJlc2VudC5cbiAqL1xuRXJyb3JPYmplY3QucHJvdG90eXBlLmlzUG9wdWxhdGVkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAodGhpcy5sZW5ndGgoKSA+IDApXG59XG5cbi8qKlxuICogRGVmYXVsdCBkaXNwbGF5IGlzIGFzIGEgbGlzdC5cbiAqL1xuRXJyb3JPYmplY3QucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5hc1VsKClcbn1cblxuLyoqXG4gKiBEaXNwbGF5cyBlcnJvciBkZXRhaWxzIGFzIGEgbGlzdC5cbiAqL1xuRXJyb3JPYmplY3QucHJvdG90eXBlLmFzVWwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGl0ZW1zID0gT2JqZWN0LmtleXModGhpcy5lcnJvcnMpLm1hcChmdW5jdGlvbihmaWVsZCkge1xuICAgIHJldHVybiBSZWFjdC5ET00ubGkobnVsbCwgZmllbGQsIHRoaXMuZXJyb3JzW2ZpZWxkXS5hc1VsKCkpXG4gIH0uYmluZCh0aGlzKSlcbiAgaWYgKGl0ZW1zLmxlbmd0aCA9PT0gMCkgeyByZXR1cm4gJycgfVxuICByZXR1cm4gUmVhY3QuRE9NLnVsKHtjbGFzc05hbWU6ICdlcnJvcmxpc3QnfSwgaXRlbXMpXG59XG5cbi8qKlxuICogRGlzcGxheXMgZXJyb3IgZGV0YWlscyBhcyB0ZXh0LlxuICovXG5FcnJvck9iamVjdC5wcm90b3R5cGUuYXNUZXh0ID0gRXJyb3JPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLmVycm9ycykubWFwKGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgdmFyIG1lc2FnZXMgPSB0aGlzLmVycm9yc1tmaWVsZF0ubWVzc2FnZXMoKVxuICAgIHJldHVybiBbJyogJyArIGZpZWxkXS5jb25jYXQobWVzYWdlcy5tYXAoZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgcmV0dXJuICgnICAqICcgKyBtZXNzYWdlKVxuICAgIH0pKS5qb2luKCdcXG4nKVxuICB9LmJpbmQodGhpcykpLmpvaW4oJ1xcbicpXG59XG5cbkVycm9yT2JqZWN0LnByb3RvdHlwZS5hc0RhdGEgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGRhdGEgPSB7fVxuICBPYmplY3Qua2V5cyh0aGlzLmVycm9ycykubWFwKGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgZGF0YVtmaWVsZF0gPSB0aGlzLmVycm9yc1tmaWVsZF0uYXNEYXRhKClcbiAgfS5iaW5kKHRoaXMpKVxuICByZXR1cm4gZGF0YVxufVxuXG5FcnJvck9iamVjdC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gIHZhciBqc29uT2JqID0ge31cbiAgT2JqZWN0LmtleXModGhpcy5lcnJvcnMpLm1hcChmdW5jdGlvbihmaWVsZCkge1xuICAgIGpzb25PYmpbZmllbGRdID0gdGhpcy5lcnJvcnNbZmllbGRdLnRvSlNPTigpXG4gIH0uYmluZCh0aGlzKSlcbiAgcmV0dXJuIGpzb25PYmpcbn1cblxuLyoqXG4gKiBBIGxpc3Qgb2YgZXJyb3JzIHdoaWNoIGtub3dzIGhvdyB0byBkaXNwbGF5IGl0c2VsZiBpbiB2YXJpb3VzIGZvcm1hdHMuXG4gKiBAcGFyYW0ge0FycmF5PX0gbGlzdCBhIGxpc3Qgb2YgZXJyb3JzLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBFcnJvckxpc3QgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEVycm9yTGlzdChsaXN0KSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEVycm9yTGlzdCkpIHsgcmV0dXJuIG5ldyBFcnJvckxpc3QobGlzdCkgfVxuICAgIHRoaXMuZGF0YSA9IGxpc3QgfHwgW11cbiAgfVxufSlcblxuLyoqXG4gKiBBZGRzIG1vcmUgZXJyb3JzLlxuICogQHBhcmFtIHtBcnJheX0gZXJyb3JMaXN0IGEgbGlzdCBvZiBlcnJvcnNcbiAqL1xuRXJyb3JMaXN0LnByb3RvdHlwZS5leHRlbmQgPSBmdW5jdGlvbihlcnJvckxpc3QpIHtcbiAgdGhpcy5kYXRhLnB1c2guYXBwbHkodGhpcy5kYXRhLCBlcnJvckxpc3QpXG59XG5cbkVycm9yTGlzdC5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmRhdGEubGVuZ3RoXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiBhbnkgZXJyb3JzIGFyZSBwcmVzZW50LlxuICovXG5FcnJvckxpc3QucHJvdG90eXBlLmlzUG9wdWxhdGVkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAodGhpcy5sZW5ndGgoKSA+IDApXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgbGlzdCBvZiBtZXNzYWdlcyBoZWxkIGluIHRoaXMgRXJyb3JMaXN0LlxuICovXG5FcnJvckxpc3QucHJvdG90eXBlLm1lc3NhZ2VzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBtZXNzYWdlcyA9IFtdXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBlcnJvciA9IHRoaXMuZGF0YVtpXVxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikge1xuICAgICAgZXJyb3IgPSBlcnJvci5tZXNzYWdlcygpWzBdXG4gICAgfVxuICAgIG1lc3NhZ2VzLnB1c2goZXJyb3IpXG4gIH1cbiAgcmV0dXJuIG1lc3NhZ2VzXG59XG5cbi8qKlxuICogIERlZmF1bHQgZGlzcGxheSBpcyBhcyBhIGxpc3QuXG4gKi9cbkVycm9yTGlzdC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmFzVWwoKVxufVxuXG4vKipcbiAqIERpc3BsYXlzIGVycm9ycyBhcyBhIGxpc3QuXG4gKi9cbkVycm9yTGlzdC5wcm90b3R5cGUuYXNVbCA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXRoaXMuaXNQb3B1bGF0ZWQoKSkge1xuICAgIHJldHVybiAnJ1xuICB9XG4gIHJldHVybiBSZWFjdC5ET00udWwoe2NsYXNzTmFtZTogJ2Vycm9ybGlzdCd9XG4gICwgdGhpcy5tZXNzYWdlcygpLm1hcChmdW5jdGlvbihlcnJvcikge1xuICAgICAgcmV0dXJuIFJlYWN0LkRPTS5saShudWxsLCBlcnJvcilcbiAgICB9KVxuICApXG59XG5cbi8qKlxuICogRGlzcGxheXMgZXJyb3JzIGFzIHRleHQuXG4gKi9cbkVycm9yTGlzdC5wcm90b3R5cGUuYXNUZXh0ID0gRXJyb3JMaXN0LnByb3RvdHlwZS50b1N0cmluZyA9ZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLm1lc3NhZ2VzKCkubWFwKGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgcmV0dXJuICcqICcgKyBlcnJvclxuICB9KS5qb2luKCdcXG4nKVxufVxuXG5FcnJvckxpc3QucHJvdG90eXBlLmFzRGF0YSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5kYXRhXG59XG5cbkVycm9yTGlzdC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBWYWxpZGF0aW9uRXJyb3IodGhpcy5kYXRhKS5lcnJvckxpc3QubWFwKGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2VzKClbMF1cbiAgICAsIGNvZGU6IGVycm9yLmNvZGUgfHwgJydcbiAgICB9XG4gIH0pXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBERUZBVUxUX0RBVEVfSU5QVVRfRk9STUFUUzogREVGQVVMVF9EQVRFX0lOUFVUX0ZPUk1BVFNcbiwgREVGQVVMVF9USU1FX0lOUFVUX0ZPUk1BVFM6IERFRkFVTFRfVElNRV9JTlBVVF9GT1JNQVRTXG4sIERFRkFVTFRfREFURVRJTUVfSU5QVVRfRk9STUFUUzogREVGQVVMVF9EQVRFVElNRV9JTlBVVF9GT1JNQVRTXG4sIEVycm9yT2JqZWN0OiBFcnJvck9iamVjdFxuLCBFcnJvckxpc3Q6IEVycm9yTGlzdFxuLCBmb3JtRGF0YTogZm9ybURhdGFcbiwgaXRlcmF0ZTogaXRlcmF0ZVxuLCBmb3JtYXRUb0FycmF5OiBmb3JtYXRUb0FycmF5XG4sIHByZXR0eU5hbWU6IHByZXR0eU5hbWVcbiwgc3RyaXA6IHN0cmlwXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb25jdXIgPSByZXF1aXJlKCdDb25jdXInKVxudmFyIGlzID0gcmVxdWlyZSgnaXNvbW9ycGgvaXMnKVxudmFyIGZvcm1hdCA9IHJlcXVpcmUoJ2lzb21vcnBoL2Zvcm1hdCcpLmZvcm1hdE9ialxudmFyIG9iamVjdCA9IHJlcXVpcmUoJ2lzb21vcnBoL29iamVjdCcpXG52YXIgdGltZSA9IHJlcXVpcmUoJ2lzb21vcnBoL3RpbWUnKVxuXG52YXIgZW52ID0gcmVxdWlyZSgnLi9lbnYnKVxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuXG4vKipcbiAqIFNvbWUgd2lkZ2V0cyBhcmUgbWFkZSBvZiBtdWx0aXBsZSBIVE1MIGVsZW1lbnRzIC0tIG5hbWVseSwgUmFkaW9TZWxlY3QuXG4gKiBUaGlzIHJlcHJlc2VudHMgdGhlIFwiaW5uZXJcIiBIVE1MIGVsZW1lbnQgb2YgYSB3aWRnZXQuXG4gKi9cbnZhciBTdWJXaWRnZXQgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFN1YldpZGdldChwYXJlbnRXaWRnZXQsIG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU3ViV2lkZ2V0KSkge1xuICAgICAgcmV0dXJuIG5ldyBTdWJXaWRnZXQocGFyZW50V2lkZ2V0LCBuYW1lLCB2YWx1ZSwga3dhcmdzKVxuICAgIH1cbiAgICB0aGlzLnBhcmVudFdpZGdldCA9IHBhcmVudFdpZGdldFxuICAgIHRoaXMubmFtZSA9IG5hbWVcbiAgICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbCwgY2hvaWNlczogW119LCBrd2FyZ3MpXG4gICAgdGhpcy5hdHRycyA9IGt3YXJncy5hdHRyc1xuICAgIHRoaXMuY2hvaWNlcyA9IGt3YXJncy5jaG9pY2VzXG4gIH1cbn0pXG5cblN1YldpZGdldC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBrd2FyZ3MgPSB7YXR0cnM6IHRoaXMuYXR0cnN9XG4gIGlmICh0aGlzLmNob2ljZXMubGVuZ3RoKSB7XG4gICAga3dhcmdzLmNob2ljZXMgPSB0aGlzLmNob2ljZXNcbiAgfVxuICByZXR1cm4gdGhpcy5wYXJlbnRXaWRnZXQucmVuZGVyKHRoaXMubmFtZSwgdGhpcy52YWx1ZSwga3dhcmdzKVxufVxuXG4vKipcbiAqIEFuIEhUTUwgZm9ybSB3aWRnZXQuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBXaWRnZXQgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFdpZGdldChrd2FyZ3MpIHtcbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbH0sIGt3YXJncylcbiAgICB0aGlzLmF0dHJzID0gb2JqZWN0LmV4dGVuZCh7fSwga3dhcmdzLmF0dHJzKVxuICB9XG4gIC8qKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhpcyBjb3JyZXNwb25kcyB0byBhbiA8aW5wdXQgdHlwZT1cImhpZGRlblwiPi4gKi9cbiwgaXNIaWRkZW46IGZhbHNlXG4gIC8qKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhpcyB3aWRnZXQgbmVlZHMgYSBtdWx0aXBhcnQtZW5jb2RlZCBmb3JtLiAqL1xuLCBuZWVkc011bHRpcGFydEZvcm06IGZhbHNlXG4gIC8qKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhpcyB3aWRnZXQgaXMgZm9yIGEgcmVxdWlyZWQgZmllbGQuLiAqL1xuLCBpc1JlcXVpcmVkOiBmYWxzZVxufSlcblxuLyoqXG4gKiBZaWVsZHMgYWxsIFwic3Vid2lkZ2V0c1wiIG9mIHRoaXMgd2lkZ2V0LiBVc2VkIG9ubHkgYnkgUmFkaW9TZWxlY3QgdG9cbiAqIGFsbG93IGFjY2VzcyB0byBpbmRpdmlkdWFsIDxpbnB1dCB0eXBlPVwicmFkaW9cIj4gYnV0dG9ucy5cbiAqXG4gKiBBcmd1bWVudHMgYXJlIHRoZSBzYW1lIGFzIGZvciByZW5kZXIoKS5cbiAqL1xuV2lkZ2V0LnByb3RvdHlwZS5zdWJXaWRnZXRzID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICByZXR1cm4gW1N1YldpZGdldCh0aGlzLCBuYW1lLCB2YWx1ZSwga3dhcmdzKV1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgV2lkZ2V0IHJlbmRlcmVkIGFzIEhUTUwuXG4gKlxuICogVGhlIHZhbHVlIGdpdmVuIGlzIG5vdCBndWFyYW50ZWVkIHRvIGJlIHZhbGlkIGlucHV0LCBzbyBzdWJjbGFzc1xuICogaW1wbGVtZW50YXRpb25zIHNob3VsZCBwcm9ncmFtIGRlZmVuc2l2ZWx5LlxuICpcbiAqIEBhYnN0cmFjdFxuICovXG5XaWRnZXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdDb25zdHJ1Y3RvcnMgZXh0ZW5kaW5nIG11c3QgaW1wbGVtZW50IGEgcmVuZGVyKCkgbWV0aG9kLicpXG59XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIGZvciBidWlsZGluZyBhbiBIVE1MIGF0dHJpYnV0ZXMgb2JqZWN0LlxuICovXG5XaWRnZXQucHJvdG90eXBlLmJ1aWxkQXR0cnMgPSBmdW5jdGlvbihleHRyYUF0dHJzLCBrd2FyZ3MpIHtcbiAgdmFyIGF0dHJzID0gb2JqZWN0LmV4dGVuZCh7fSwgdGhpcy5hdHRycywga3dhcmdzLCBleHRyYUF0dHJzKVxuICBhdHRycy5yZWYgPSBhdHRycy5pZFxuICByZXR1cm4gYXR0cnNcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgYSB2YWx1ZSBmb3IgdGhpcyB3aWRnZXQgZnJvbSB0aGUgZ2l2ZW4gZGF0YS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIGZvcm0gZGF0YS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlcyBmaWxlIGRhdGEuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSB0aGUgZmllbGQgbmFtZSB0byBiZSB1c2VkIHRvIHJldHJpZXZlIGRhdGEuXG4gKiBAcmV0dXJuIGEgdmFsdWUgZm9yIHRoaXMgd2lkZ2V0LCBvciBudWxsIGlmIG5vIHZhbHVlIHdhcyBwcm92aWRlZC5cbiAqL1xuV2lkZ2V0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhID0gZnVuY3Rpb24oZGF0YSwgZmlsZXMsIG5hbWUpIHtcbiAgcmV0dXJuIG9iamVjdC5nZXQoZGF0YSwgbmFtZSwgbnVsbClcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBIVE1MIGlkIGF0dHJpYnV0ZSBvZiB0aGlzIFdpZGdldCBmb3IgdXNlIGJ5IGFcbiAqIDxsYWJlbD4sIGdpdmVuIHRoZSBpZCBvZiB0aGUgZmllbGQuXG4gKlxuICogVGhpcyBob29rIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIHNvbWUgd2lkZ2V0cyBoYXZlIG11bHRpcGxlIEhUTUwgZWxlbWVudHMgYW5kLFxuICogdGh1cywgbXVsdGlwbGUgaWRzLiBJbiB0aGF0IGNhc2UsIHRoaXMgbWV0aG9kIHNob3VsZCByZXR1cm4gYW4gSUQgdmFsdWUgdGhhdFxuICogY29ycmVzcG9uZHMgdG8gdGhlIGZpcnN0IGlkIGluIHRoZSB3aWRnZXQncyB0YWdzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBpZCBhIGZpZWxkIGlkLlxuICogQHJldHVybiB0aGUgaWQgd2hpY2ggc2hvdWxkIGJlIHVzZWQgYnkgYSA8bGFiZWw+PiBmb3IgdGhpcyBXaWRnZXQuXG4gKi9cbldpZGdldC5wcm90b3R5cGUuaWRGb3JMYWJlbCA9IGZ1bmN0aW9uKGlkKSB7XG4gIHJldHVybiBpZFxufVxuXG4vKipcbiAqIEFuIEhUTUwgPGlucHV0PiB3aWRnZXQuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtXaWRnZXR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgSW5wdXQgPSBXaWRnZXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIElucHV0KGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXaWRnZXQpKSB7IHJldHVybiBuZXcgSW5wdXQoa3dhcmdzKSB9XG4gICAgV2lkZ2V0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4gIC8qKiBUaGUgdHlwZSBhdHRyaWJ1dGUgb2YgdGhpcyBpbnB1dCAtIHN1YmNsYXNzZXMgbXVzdCBkZWZpbmUgaXQuICovXG4sIGlucHV0VHlwZTogbnVsbFxufSlcblxuSW5wdXQucHJvdG90eXBlLl9mb3JtYXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZVxufVxuXG5JbnB1dC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbH0sIGt3YXJncylcbiAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgdmFsdWUgPSAnJ1xuICB9XG4gIHZhciBmaW5hbEF0dHJzID0gdGhpcy5idWlsZEF0dHJzKGt3YXJncy5hdHRycywge3R5cGU6IHRoaXMuaW5wdXRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lfSlcbiAgaWYgKHZhbHVlICE9PSAnJykge1xuICAgIC8vIE9ubHkgYWRkIHRoZSB2YWx1ZSBhdHRyaWJ1dGUgaWYgdmFsdWUgaXMgbm9uLWVtcHR5XG4gICAgZmluYWxBdHRycy5kZWZhdWx0VmFsdWUgPSAnJyt0aGlzLl9mb3JtYXRWYWx1ZSh2YWx1ZSlcbiAgfVxuICByZXR1cm4gUmVhY3QuRE9NLmlucHV0KGZpbmFsQXR0cnMpXG59XG5cbi8qKlxuICogQW4gSFRNTCA8aW5wdXQgdHlwZT1cInRleHRcIj4gd2lkZ2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7SW5wdXR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgVGV4dElucHV0ID0gSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFRleHRJbnB1dChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IFRleHRJbnB1dChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbH0sIGt3YXJncylcbiAgICBpZiAoa3dhcmdzLmF0dHJzICE9IG51bGwpIHtcbiAgICAgIHRoaXMuaW5wdXRUeXBlID0gb2JqZWN0LnBvcChrd2FyZ3MuYXR0cnMsICd0eXBlJywgdGhpcy5pbnB1dFR5cGUpXG4gICAgfVxuICAgIElucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIGlucHV0VHlwZTogJ3RleHQnXG59KVxuXG4vKipcbiAqIEFuIEhUTUwgPGlucHV0IHR5cGU9XCJudW1iZXJcIj4gd2lkZ2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7VGV4dElucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIE51bWJlcklucHV0ID0gVGV4dElucHV0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBOdW1iZXJJbnB1dChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IE51bWJlcklucHV0KGt3YXJncykgfVxuICAgIFRleHRJbnB1dC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuLCBpbnB1dFR5cGU6ICdudW1iZXInXG59KVxuXG4vKipcbiAqIEFuIEhUTUwgPGlucHV0IHR5cGU9XCJlbWFpbFwiPiB3aWRnZXQuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtUZXh0SW5wdXR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgRW1haWxJbnB1dCA9IFRleHRJbnB1dC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gRW1haWxJbnB1dChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IEVtYWlsSW5wdXQoa3dhcmdzKSB9XG4gICAgVGV4dElucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIGlucHV0VHlwZTogJ2VtYWlsJ1xufSlcblxuLyoqXG4gKiBBbiBIVE1MIDxpbnB1dCB0eXBlPVwidXJsXCI+IHdpZGdldC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1RleHRJbnB1dH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBVUkxJbnB1dCA9IFRleHRJbnB1dC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gVVJMSW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBVUkxJbnB1dChrd2FyZ3MpIH1cbiAgICBUZXh0SW5wdXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgaW5wdXRUeXBlOiAndXJsJ1xufSlcblxuLyoqXG4gKiBBbiBIVE1MIDxpbnB1dCB0eXBlPVwicGFzc3dvcmRcIj4gd2lkZ2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7VGV4dElucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFBhc3N3b3JkSW5wdXQgPSBUZXh0SW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFBhc3N3b3JkSW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBQYXNzd29yZElucHV0KGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe3JlbmRlclZhbHVlOiBmYWxzZX0sIGt3YXJncylcbiAgICBUZXh0SW5wdXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgdGhpcy5yZW5kZXJWYWx1ZSA9IGt3YXJncy5yZW5kZXJWYWx1ZVxuICB9XG4sIGlucHV0VHlwZTogJ3Bhc3N3b3JkJ1xufSlcblxuUGFzc3dvcmRJbnB1dC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICBpZiAoIXRoaXMucmVuZGVyVmFsdWUpIHtcbiAgICB2YWx1ZSA9ICcnXG4gIH1cbiAgcmV0dXJuIFRleHRJbnB1dC5wcm90b3R5cGUucmVuZGVyLmNhbGwodGhpcywgbmFtZSwgdmFsdWUsIGt3YXJncylcbn1cblxuLyoqXG4gKiBBbiBIVE1MIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCI+IHdpZGdldC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0lucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEhpZGRlbklucHV0ID0gSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEhpZGRlbklucHV0KGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXaWRnZXQpKSB7IHJldHVybiBuZXcgSGlkZGVuSW5wdXQoa3dhcmdzKSB9XG4gICAgSW5wdXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgaW5wdXRUeXBlOiAnaGlkZGVuJ1xuLCBpc0hpZGRlbjogdHJ1ZVxufSlcblxuLyoqXG4gKiBBIHdpZGdldCB0aGF0IGhhbmRsZXMgPGlucHV0IHR5cGU9XCJoaWRkZW5cIj4gZm9yIGZpZWxkcyB0aGF0IGhhdmUgYSBsaXN0IG9mXG4gKiB2YWx1ZXMuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtIaWRkZW5JbnB1dH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBNdWx0aXBsZUhpZGRlbklucHV0ID0gSGlkZGVuSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIE11bHRpcGxlSGlkZGVuSW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBNdWx0aXBsZUhpZGRlbklucHV0KGt3YXJncykgfVxuICAgIEhpZGRlbklucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuXG5NdWx0aXBsZUhpZGRlbklucHV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiBudWxsfSwga3dhcmdzKVxuICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICB2YWx1ZSA9IFtdXG4gIH1cbiAgdmFyIGZpbmFsQXR0cnMgPSB0aGlzLmJ1aWxkQXR0cnMoa3dhcmdzLmF0dHJzLCB7dHlwZTogdGhpcy5pbnB1dFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWV9KVxuICB2YXIgaWQgPSBvYmplY3QuZ2V0KGZpbmFsQXR0cnMsICdpZCcsIG51bGwpXG4gIHZhciBpbnB1dHMgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBpbnB1dEF0dHJzID0gb2JqZWN0LmV4dGVuZCh7fSwgZmluYWxBdHRycywge3ZhbHVlOiB2YWx1ZVtpXX0pXG4gICAgaWYgKGlkKSB7XG4gICAgICAvLyBBbiBJRCBhdHRyaWJ1dGUgd2FzIGdpdmVuLiBBZGQgYSBudW1lcmljIGluZGV4IGFzIGEgc3VmZml4XG4gICAgICAvLyBzbyB0aGF0IHRoZSBpbnB1dHMgZG9uJ3QgYWxsIGhhdmUgdGhlIHNhbWUgSUQgYXR0cmlidXRlLlxuICAgICAgaW5wdXRBdHRycy5pZCA9IGZvcm1hdCgne2lkfV97aX0nLCB7aWQ6IGlkLCBpOiBpfSlcbiAgICB9XG4gICAgaW5wdXRzLnB1c2goUmVhY3QuRE9NLmlucHV0KGlucHV0QXR0cnMpKVxuICB9XG4gIHJldHVybiBSZWFjdC5ET00uZGl2KG51bGwsIGlucHV0cylcbn1cblxuTXVsdGlwbGVIaWRkZW5JbnB1dC5wcm90b3R5cGUudmFsdWVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGEsIGZpbGVzLCBuYW1lKSB7XG4gIGlmICh0eXBlb2YgZGF0YVtuYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBbXS5jb25jYXQoZGF0YVtuYW1lXSlcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG4vKipcbiAqIEFuIEhUTUwgPGlucHV0IHR5cGU9XCJmaWxlXCI+IHdpZGdldC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0lucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEZpbGVJbnB1dCA9IElucHV0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBGaWxlSW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBGaWxlSW5wdXQoa3dhcmdzKSB9XG4gICAgSW5wdXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgaW5wdXRUeXBlOiAnZmlsZSdcbiwgbmVlZHNNdWx0aXBhcnRGb3JtOiB0cnVlXG59KVxuXG5GaWxlSW5wdXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAgcmV0dXJuIElucHV0LnByb3RvdHlwZS5yZW5kZXIuY2FsbCh0aGlzLCBuYW1lLCBudWxsLCBrd2FyZ3MpXG59XG5cbi8qKlxuICogRmlsZSB3aWRnZXRzIHRha2UgZGF0YSBmcm9tIGZpbGUgd3JhcHBlcnMgb24gdGhlIHNlcnZlci4gT24gdGhlIGNsaWVudCwgdGhleVxuICogdGFrZSBpdCBmcm9tIGRhdGEgc28gdGhlIHByZXNlbmNlIG9mIGEgLnZhbHVlIGNhbiBiZSB2YWxpZGF0ZWQgd2hlbiByZXF1aXJlZC5cbiAqL1xuRmlsZUlucHV0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhID0gZnVuY3Rpb24oZGF0YSwgZmlsZXMsIG5hbWUpIHtcbiAgcmV0dXJuIG9iamVjdC5nZXQoZW52LmJyb3dzZXIgPyBkYXRhIDogZmlsZXMsIG5hbWUsIG51bGwpXG59XG5cbnZhciBGSUxFX0lOUFVUX0NPTlRSQURJQ1RJT04gPSB7fVxuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpbGVJbnB1dH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBDbGVhcmFibGVGaWxlSW5wdXQgPSBGaWxlSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIENsZWFyYWJsZUZpbGVJbnB1dChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IENsZWFyYWJsZUZpbGVJbnB1dChrd2FyZ3MpIH1cbiAgICBGaWxlSW5wdXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgaW5pdGlhbFRleHQ6ICdDdXJyZW50bHknXG4sIGlucHV0VGV4dDogJ0NoYW5nZSdcbiwgY2xlYXJDaGVja2JveExhYmVsOiAnQ2xlYXInXG4sIHRlbXBsYXRlV2l0aEluaXRpYWw6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIHJldHVybiB1dGlsLmZvcm1hdFRvQXJyYXkoXG4gICAgICAne2luaXRpYWxUZXh0fToge2luaXRpYWx9IHtjbGVhclRlbXBsYXRlfXticn17aW5wdXRUZXh0fToge2lucHV0fSdcbiAgICAsIG9iamVjdC5leHRlbmQocGFyYW1zLCB7YnI6IFJlYWN0LkRPTS5icihudWxsKX0pXG4gICAgKVxuICB9XG4sIHRlbXBsYXRlV2l0aENsZWFyOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICByZXR1cm4gdXRpbC5mb3JtYXRUb0FycmF5KFxuICAgICAgJ3tjaGVja2JveH0ge2xhYmVsfSdcbiAgICAsIG9iamVjdC5leHRlbmQocGFyYW1zLCB7XG4gICAgICAgIGxhYmVsOiBSZWFjdC5ET00ubGFiZWwoe2h0bWxGb3I6IHBhcmFtcy5jaGVja2JveElkfSwgcGFyYW1zLmxhYmVsKVxuICAgICAgfSlcbiAgICApXG4gIH1cbiwgdXJsTWFya3VwVGVtcGxhdGU6IGZ1bmN0aW9uKGhyZWYsIG5hbWUpIHtcbiAgICByZXR1cm4gUmVhY3QuRE9NLmEoe2hyZWY6IGhyZWZ9LCBuYW1lKVxuICB9XG59KVxuXG4vKipcbiAqIEdpdmVuIHRoZSBuYW1lIG9mIHRoZSBmaWxlIGlucHV0LCByZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGNsZWFyIGNoZWNrYm94XG4gKiBpbnB1dC5cbiAqL1xuQ2xlYXJhYmxlRmlsZUlucHV0LnByb3RvdHlwZS5jbGVhckNoZWNrYm94TmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuIG5hbWUgKyAnLWNsZWFyJ1xufVxuXG4vKipcbiAqIEdpdmVuIHRoZSBuYW1lIG9mIHRoZSBjbGVhciBjaGVja2JveCBpbnB1dCwgcmV0dXJuIHRoZSBIVE1MIGlkIGZvciBpdC5cbiAqL1xuQ2xlYXJhYmxlRmlsZUlucHV0LnByb3RvdHlwZS5jbGVhckNoZWNrYm94SWQgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHJldHVybiBuYW1lICsgJ19pZCdcbn1cblxuQ2xlYXJhYmxlRmlsZUlucHV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIHZhciBpbnB1dCA9IEZpbGVJbnB1dC5wcm90b3R5cGUucmVuZGVyLmNhbGwodGhpcywgbmFtZSwgdmFsdWUsIGt3YXJncylcbiAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZS51cmwgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB2YXIgY2xlYXJUZW1wbGF0ZVxuICAgIGlmICghdGhpcy5pc1JlcXVpcmVkKSB7XG4gICAgICB2YXIgY2xlYXJDaGVja2JveE5hbWUgPSB0aGlzLmNsZWFyQ2hlY2tib3hOYW1lKG5hbWUpXG4gICAgICB2YXIgY2xlYXJDaGVja2JveElkID0gdGhpcy5jbGVhckNoZWNrYm94SWQoY2xlYXJDaGVja2JveE5hbWUpXG4gICAgICBjbGVhclRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZVdpdGhDbGVhcih7XG4gICAgICAgIGNoZWNrYm94OiBDaGVja2JveElucHV0KCkucmVuZGVyKGNsZWFyQ2hlY2tib3hOYW1lLCBmYWxzZSwge2F0dHJzOiB7J2lkJzogY2xlYXJDaGVja2JveElkfX0pXG4gICAgICAsIGNoZWNrYm94SWQ6IGNsZWFyQ2hlY2tib3hJZFxuICAgICAgLCBsYWJlbDogdGhpcy5jbGVhckNoZWNrYm94TGFiZWxcbiAgICAgIH0pXG4gICAgfVxuICAgIHZhciBjb250ZW50cyA9IHRoaXMudGVtcGxhdGVXaXRoSW5pdGlhbCh7XG4gICAgICBpbml0aWFsVGV4dDogdGhpcy5pbml0aWFsVGV4dFxuICAgICwgaW5pdGlhbDogdGhpcy51cmxNYXJrdXBUZW1wbGF0ZSh2YWx1ZS51cmwsICcnK3ZhbHVlKVxuICAgICwgY2xlYXJUZW1wbGF0ZTogY2xlYXJUZW1wbGF0ZVxuICAgICwgaW5wdXRUZXh0OiB0aGlzLmlucHV0VGV4dFxuICAgICwgaW5wdXQ6IGlucHV0XG4gICAgfSlcbiAgICByZXR1cm4gUmVhY3QuRE9NLmRpdi5hcHBseShSZWFjdC5ET00sIFtudWxsXS5jb25jYXQoY29udGVudHMpKVxuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiBpbnB1dFxuICB9XG59XG5cbkNsZWFyYWJsZUZpbGVJbnB1dC5wcm90b3R5cGUudmFsdWVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGEsIGZpbGVzLCBuYW1lKSB7XG4gIHZhciB1cGxvYWQgPSBGaWxlSW5wdXQucHJvdG90eXBlLnZhbHVlRnJvbURhdGEoZGF0YSwgZmlsZXMsIG5hbWUpXG4gIGlmICghdGhpcy5pc1JlcXVpcmVkICYmXG4gICAgICBDaGVja2JveElucHV0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhLmNhbGwodGhpcywgZGF0YSwgZmlsZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGVhckNoZWNrYm94TmFtZShuYW1lKSkpIHtcbiAgICBpZiAodXBsb2FkKSB7XG4gICAgICAvLyBJZiB0aGUgdXNlciBjb250cmFkaWN0cyB0aGVtc2VsdmVzICh1cGxvYWRzIGEgbmV3IGZpbGUgQU5EXG4gICAgICAvLyBjaGVja3MgdGhlIFwiY2xlYXJcIiBjaGVja2JveCksIHdlIHJldHVybiBhIHVuaXF1ZSBtYXJrZXJcbiAgICAgIC8vIG9iamVjdCB0aGF0IEZpbGVGaWVsZCB3aWxsIHR1cm4gaW50byBhIFZhbGlkYXRpb25FcnJvci5cbiAgICAgIHJldHVybiBGSUxFX0lOUFVUX0NPTlRSQURJQ1RJT05cbiAgICB9XG4gICAgLy8gZmFsc2Ugc2lnbmFscyB0byBjbGVhciBhbnkgZXhpc3RpbmcgdmFsdWUsIGFzIG9wcG9zZWQgdG8ganVzdCBudWxsXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgcmV0dXJuIHVwbG9hZFxufVxuXG4vKipcbiAqIEFuIEhUTUwgPHRleHRhcmVhPiB3aWRnZXQuXG4gKiBAcGFyYW0ge09iamVjdH0gW2t3YXJnc10gY29uZmlndXJhdGlvbiBvcHRpb25zXG4gKiBAY29uZmlnIHtPYmplY3R9IFthdHRyc10gSFRNTCBhdHRyaWJ1dGVzIGZvciB0aGUgcmVuZGVyZWQgd2lkZ2V0LiBEZWZhdWx0XG4gKiAgIHJvd3MgYW5kIGNvbHMgYXR0cmlidXRlcyB3aWxsIGJlIHVzZWQgaWYgbm90IHByb3ZpZGVkLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7V2lkZ2V0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFRleHRhcmVhID0gV2lkZ2V0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBUZXh0YXJlYShrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IFRleHRhcmVhKGt3YXJncykgfVxuICAgIC8vIEVuc3VyZSB3ZSBoYXZlIHNvbWV0aGluZyBpbiBhdHRyc1xuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiBudWxsfSwga3dhcmdzKVxuICAgIC8vIFByb3ZpZGUgZGVmYXVsdCAnY29scycgYW5kICdyb3dzJyBhdHRyaWJ1dGVzXG4gICAga3dhcmdzLmF0dHJzID0gb2JqZWN0LmV4dGVuZCh7cm93czogJzEwJywgY29sczogJzQwJ30sIGt3YXJncy5hdHRycylcbiAgICBXaWRnZXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5cblRleHRhcmVhLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiBudWxsfSwga3dhcmdzKVxuICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICB2YWx1ZSA9ICcnXG4gIH1cbiAgdmFyIGZpbmFsQXR0cnMgPSB0aGlzLmJ1aWxkQXR0cnMoa3dhcmdzLmF0dHJzLCB7bmFtZTogbmFtZSwgZGVmYXVsdFZhbHVlOiB2YWx1ZX0pXG4gIHJldHVybiBSZWFjdC5ET00udGV4dGFyZWEoZmluYWxBdHRycylcbn1cblxuLyoqXG4gKiBBIDxpbnB1dCB0eXBlPVwidGV4dFwiPiB3aGljaCwgaWYgZ2l2ZW4gYSBEYXRlIG9iamVjdCB0byBkaXNwbGF5LCBmb3JtYXRzIGl0IGFzXG4gKiBhbiBhcHByb3ByaWF0ZSBkYXRlL3RpbWUgU3RyaW5nLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7VGV4dElucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIERhdGVUaW1lQmFzZUlucHV0ID0gVGV4dElucHV0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBEYXRlVGltZUJhc2VJbnB1dChrd2FyZ3MpIHtcbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtmb3JtYXQ6IG51bGx9LCBrd2FyZ3MpXG4gICAgVGV4dElucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICAgIHRoaXMuZm9ybWF0ID0gKGt3YXJncy5mb3JtYXQgIT09IG51bGwgPyBrd2FyZ3MuZm9ybWF0IDogdGhpcy5kZWZhdWx0Rm9ybWF0KVxuICB9XG59KVxuXG5EYXRlVGltZUJhc2VJbnB1dC5wcm90b3R5cGUuX2Zvcm1hdFZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKGlzLkRhdGUodmFsdWUpKSB7XG4gICAgcmV0dXJuIHRpbWUuc3RyZnRpbWUodmFsdWUsIHRoaXMuZm9ybWF0KVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0RhdGVUaW1lQmFzZUlucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIERhdGVJbnB1dCA9IERhdGVUaW1lQmFzZUlucHV0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBEYXRlSW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIERhdGVJbnB1dCkpIHsgcmV0dXJuIG5ldyBEYXRlSW5wdXQoa3dhcmdzKSB9XG4gICAgRGF0ZVRpbWVCYXNlSW5wdXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgZGVmYXVsdEZvcm1hdDogdXRpbC5ERUZBVUxUX0RBVEVfSU5QVVRfRk9STUFUU1swXVxufSlcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtEYXRlVGltZUJhc2VJbnB1dH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBEYXRlVGltZUlucHV0ID0gRGF0ZVRpbWVCYXNlSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIERhdGVUaW1lSW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIERhdGVUaW1lSW5wdXQpKSB7IHJldHVybiBuZXcgRGF0ZVRpbWVJbnB1dChrd2FyZ3MpIH1cbiAgICBEYXRlVGltZUJhc2VJbnB1dC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuLCBkZWZhdWx0Rm9ybWF0OiB1dGlsLkRFRkFVTFRfREFURVRJTUVfSU5QVVRfRk9STUFUU1swXVxufSlcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtEYXRlVGltZUJhc2VJbnB1dH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBUaW1lSW5wdXQgPSBEYXRlVGltZUJhc2VJbnB1dC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gVGltZUlucHV0KGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBUaW1lSW5wdXQpKSB7IHJldHVybiBuZXcgVGltZUlucHV0KGt3YXJncykgfVxuICAgIERhdGVUaW1lQmFzZUlucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIGRlZmF1bHRGb3JtYXQ6IHV0aWwuREVGQVVMVF9USU1FX0lOUFVUX0ZPUk1BVFNbMF1cbn0pXG5cbnZhciBkZWZhdWx0Q2hlY2tUZXN0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSAhPT0gZmFsc2UgJiZcbiAgICAgICAgICB2YWx1ZSAhPT0gbnVsbCAmJlxuICAgICAgICAgIHZhbHVlICE9PSAnJylcbn1cblxuLyoqXG4gKiBBbiBIVE1MIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIj4gd2lkZ2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7V2lkZ2V0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIENoZWNrYm94SW5wdXQgPSBXaWRnZXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIENoZWNrYm94SW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBDaGVja2JveElucHV0KGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2NoZWNrVGVzdDogZGVmYXVsdENoZWNrVGVzdH0sIGt3YXJncylcbiAgICBXaWRnZXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgdGhpcy5jaGVja1Rlc3QgPSBrd2FyZ3MuY2hlY2tUZXN0XG4gIH1cbn0pXG5cbkNoZWNrYm94SW5wdXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7YXR0cnM6IG51bGx9LCBrd2FyZ3MpXG4gIHZhciBjaGVja2VkID0gdGhpcy5jaGVja1Rlc3QodmFsdWUpXG4gIHZhciBmaW5hbEF0dHJzID0gdGhpcy5idWlsZEF0dHJzKGt3YXJncy5hdHRycywge3R5cGU6ICdjaGVja2JveCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWV9KVxuICBpZiAodmFsdWUgIT09ICcnICYmIHZhbHVlICE9PSB0cnVlICYmIHZhbHVlICE9PSBmYWxzZSAmJiB2YWx1ZSAhPT0gbnVsbCAmJlxuICAgICAgdmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9ubHkgYWRkIHRoZSB2YWx1ZSBhdHRyaWJ1dGUgaWYgdmFsdWUgaXMgbm9uLWVtcHR5XG4gICAgZmluYWxBdHRycy52YWx1ZSA9IHZhbHVlXG4gIH1cbiAgaWYgKGNoZWNrZWQpIHtcbiAgICBmaW5hbEF0dHJzLmRlZmF1bHRDaGVja2VkID0gJ2NoZWNrZWQnXG4gIH1cbiAgcmV0dXJuIFJlYWN0LkRPTS5pbnB1dChmaW5hbEF0dHJzKVxufVxuXG5DaGVja2JveElucHV0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhID0gZnVuY3Rpb24oZGF0YSwgZmlsZXMsIG5hbWUpIHtcbiAgaWYgKHR5cGVvZiBkYXRhW25hbWVdID09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gIEEgbWlzc2luZyB2YWx1ZSBtZWFucyBGYWxzZSBiZWNhdXNlIEhUTUwgZm9ybSBzdWJtaXNzaW9uIGRvZXMgbm90XG4gICAgLy8gc2VuZCByZXN1bHRzIGZvciB1bnNlbGVjdGVkIGNoZWNrYm94ZXMuXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgdmFyIHZhbHVlID0gZGF0YVtuYW1lXVxuICB2YXIgdmFsdWVzID0geyd0cnVlJzogdHJ1ZSwgJ2ZhbHNlJzogZmFsc2V9XG4gIC8vIFRyYW5zbGF0ZSB0cnVlIGFuZCBmYWxzZSBzdHJpbmdzIHRvIGJvb2xlYW4gdmFsdWVzXG4gIGlmIChpcy5TdHJpbmcodmFsdWUpKSB7XG4gICAgdmFsdWUgPSBvYmplY3QuZ2V0KHZhbHVlcywgdmFsdWUudG9Mb3dlckNhc2UoKSwgdmFsdWUpXG4gIH1cbiAgcmV0dXJuICEhdmFsdWVcbn1cblxuLyoqXG4gKiBBbiBIVE1MIDxzZWxlY3Q+IHdpZGdldC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1dpZGdldH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBTZWxlY3QgPSBXaWRnZXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFNlbGVjdChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IFNlbGVjdChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtjaG9pY2VzOiBbXX0sIGt3YXJncylcbiAgICBXaWRnZXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgdGhpcy5jaG9pY2VzID0ga3dhcmdzLmNob2ljZXMgfHwgW11cbiAgfVxuLCBhbGxvd011bHRpcGxlU2VsZWN0ZWQ6IGZhbHNlXG59KVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIHdpZGdldC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIHRoZSBmaWVsZCBuYW1lLlxuICogQHBhcmFtIHNlbGVjdGVkVmFsdWUgdGhlIHZhbHVlIG9mIGFuIG9wdGlvbiB3aGljaCBzaG91bGQgYmUgbWFya2VkIGFzXG4gKiAgIHNlbGVjdGVkLCBvciBudWxsIGlmIG5vIHZhbHVlIGlzIHNlbGVjdGVkIC0tIHdpbGwgYmUgbm9ybWFsaXNlZCB0byBhIFN0cmluZ1xuICogICBmb3IgY29tcGFyaXNvbiB3aXRoIGNob2ljZSB2YWx1ZXMuXG4gKiBAcGFyYW0ge09iamVjdH0gW2F0dHJzXSBhZGRpdGlvbmFsIEhUTUwgYXR0cmlidXRlcyBmb3IgdGhlIHJlbmRlcmVkIHdpZGdldC5cbiAqIEBwYXJhbSB7QXJyYXl9IFtjaG9pY2VzXSBjaG9pY2VzIHRvIGJlIHVzZWQgd2hlbiByZW5kZXJpbmcgdGhlIHdpZGdldCwgaW5cbiAqICAgYWRkaXRpb24gdG8gdGhvc2UgYWxyZWFkeSBoZWxkIGJ5IHRoZSB3aWRnZXQgaXRzZWxmLlxuICogQHJldHVybiBhIDxzZWxlY3Q+IGVsZW1lbnQuXG4gKi9cblNlbGVjdC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgc2VsZWN0ZWRWYWx1ZSwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiBudWxsLCBjaG9pY2VzOiBbXX0sIGt3YXJncylcbiAgaWYgKHNlbGVjdGVkVmFsdWUgPT09IG51bGwpIHtcbiAgICBzZWxlY3RlZFZhbHVlID0gJydcbiAgfVxuICB2YXIgZmluYWxBdHRycyA9IHRoaXMuYnVpbGRBdHRycyhrd2FyZ3MuYXR0cnMsIHtuYW1lOiBuYW1lfSlcbiAgdmFyIG9wdGlvbnMgPSB0aGlzLnJlbmRlck9wdGlvbnMoa3dhcmdzLmNob2ljZXMsIFtzZWxlY3RlZFZhbHVlXSlcbiAgcmV0dXJuIFJlYWN0LkRPTS5zZWxlY3QoZmluYWxBdHRycywgb3B0aW9ucylcbn1cblxuU2VsZWN0LnByb3RvdHlwZS5yZW5kZXJPcHRpb25zID0gZnVuY3Rpb24oY2hvaWNlcywgc2VsZWN0ZWRWYWx1ZXMpIHtcbiAgLy8gTm9ybWFsaXNlIHRvIHN0cmluZ3NcbiAgdmFyIHNlbGVjdGVkVmFsdWVzTG9va3VwID0ge31cbiAgLy8gV2UgZG9uJ3QgZHVjayB0eXBlIHBhc3Npbmcgb2YgYSBTdHJpbmcsIGFzIGluZGV4IGFjY2VzcyB0byBjaGFyYWN0ZXJzIGlzbid0XG4gIC8vIHBhcnQgb2YgdGhlIHNwZWMuXG4gIHZhciBzZWxlY3RlZFZhbHVlU3RyaW5nID0gKGlzLlN0cmluZyhzZWxlY3RlZFZhbHVlcykpXG4gIHZhciBpLCBsXG4gIGZvciAoaSA9IDAsIGwgPSBzZWxlY3RlZFZhbHVlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBzZWxlY3RlZFZhbHVlc0xvb2t1cFsnJysoc2VsZWN0ZWRWYWx1ZVN0cmluZyA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkVmFsdWVzLmNoYXJBdChpKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkVmFsdWVzW2ldKV0gPSB0cnVlXG4gIH1cblxuICB2YXIgb3B0aW9ucyA9IFtdXG4gIHZhciBmaW5hbENob2ljZXMgPSB1dGlsLml0ZXJhdGUodGhpcy5jaG9pY2VzKS5jb25jYXQoY2hvaWNlcyB8fCBbXSlcbiAgZm9yIChpID0gMCwgbCA9IGZpbmFsQ2hvaWNlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoaXMuQXJyYXkoZmluYWxDaG9pY2VzW2ldWzFdKSkge1xuICAgICAgdmFyIG9wdGdyb3VwT3B0aW9ucyA9IFtdXG4gICAgICB2YXIgb3B0Z3JvdXBDaG9pY2VzID0gZmluYWxDaG9pY2VzW2ldWzFdXG4gICAgICBmb3IgKHZhciBqID0gMCwgayA9IG9wdGdyb3VwQ2hvaWNlcy5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgb3B0Z3JvdXBPcHRpb25zLnB1c2godGhpcy5yZW5kZXJPcHRpb24oc2VsZWN0ZWRWYWx1ZXNMb29rdXAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGdyb3VwQ2hvaWNlc1tqXVswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0Z3JvdXBDaG9pY2VzW2pdWzFdKSlcbiAgICAgIH1cbiAgICAgIG9wdGlvbnMucHVzaChSZWFjdC5ET00ub3B0Z3JvdXAoe2xhYmVsOiBmaW5hbENob2ljZXNbaV1bMF19LCBvcHRncm91cE9wdGlvbnMpKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIG9wdGlvbnMucHVzaCh0aGlzLnJlbmRlck9wdGlvbihzZWxlY3RlZFZhbHVlc0xvb2t1cCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbENob2ljZXNbaV1bMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxDaG9pY2VzW2ldWzFdKSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9wdGlvbnNcbn1cblxuU2VsZWN0LnByb3RvdHlwZS5yZW5kZXJPcHRpb24gPSBmdW5jdGlvbihzZWxlY3RlZFZhbHVlc0xvb2t1cCwgb3B0VmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdExhYmVsKSB7XG4gIG9wdFZhbHVlID0gJycrb3B0VmFsdWVcbiAgdmFyIGF0dHJzID0ge3ZhbHVlOiBvcHRWYWx1ZX1cbiAgaWYgKHR5cGVvZiBzZWxlY3RlZFZhbHVlc0xvb2t1cFtvcHRWYWx1ZV0gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBhdHRyc1snc2VsZWN0ZWQnXSA9ICdzZWxlY3RlZCdcbiAgICBpZiAoIXRoaXMuYWxsb3dNdWx0aXBsZVNlbGVjdGVkKSB7XG4gICAgICAvLyBPbmx5IGFsbG93IGZvciBhIHNpbmdsZSBzZWxlY3Rpb24gd2l0aCB0aGlzIHZhbHVlXG4gICAgICBkZWxldGUgc2VsZWN0ZWRWYWx1ZXNMb29rdXBbb3B0VmFsdWVdXG4gICAgfVxuICB9XG4gIHJldHVybiBSZWFjdC5ET00ub3B0aW9uKGF0dHJzLCBvcHRMYWJlbClcbn1cblxuLyoqXG4gKiBBIDxzZWxlY3Q+IHdpZGdldCBpbnRlbmRlZCB0byBiZSB1c2VkIHdpdGggTnVsbEJvb2xlYW5GaWVsZC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1NlbGVjdH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBOdWxsQm9vbGVhblNlbGVjdCA9IFNlbGVjdC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gTnVsbEJvb2xlYW5TZWxlY3Qoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBOdWxsQm9vbGVhblNlbGVjdChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBrd2FyZ3MgfHwge31cbiAgICAvLyBTZXQgb3Igb3ZlcnJyaWRlIGNob2ljZXNcbiAgICBrd2FyZ3MuY2hvaWNlcyA9IFtbJzEnLCAnVW5rbm93biddLCBbJzInLCAnWWVzJ10sIFsnMycsICdObyddXVxuICAgIFNlbGVjdC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuTnVsbEJvb2xlYW5TZWxlY3QucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAgaWYgKHZhbHVlID09PSB0cnVlIHx8IHZhbHVlID09ICcyJykge1xuICAgIHZhbHVlID0gJzInXG4gIH1cbiAgZWxzZSBpZiAodmFsdWUgPT09IGZhbHNlIHx8IHZhbHVlID09ICczJykge1xuICAgIHZhbHVlID0gJzMnXG4gIH1cbiAgZWxzZSB7XG4gICAgdmFsdWUgPSAnMSdcbiAgfVxuICByZXR1cm4gU2VsZWN0LnByb3RvdHlwZS5yZW5kZXIuY2FsbCh0aGlzLCBuYW1lLCB2YWx1ZSwga3dhcmdzKVxufVxuXG5OdWxsQm9vbGVhblNlbGVjdC5wcm90b3R5cGUudmFsdWVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGEsIGZpbGVzLCBuYW1lKSB7XG4gIHZhciB2YWx1ZSA9IG51bGxcbiAgaWYgKHR5cGVvZiBkYXRhW25hbWVdICE9ICd1bmRlZmluZWQnKSB7XG4gICAgdmFyIGRhdGFWYWx1ZSA9IGRhdGFbbmFtZV1cbiAgICBpZiAoZGF0YVZhbHVlID09PSB0cnVlIHx8IGRhdGFWYWx1ZSA9PSAnVHJ1ZScgfHwgZGF0YVZhbHVlID09ICd0cnVlJyB8fFxuICAgICAgICBkYXRhVmFsdWUgPT0gJzInKSB7XG4gICAgICB2YWx1ZSA9IHRydWVcbiAgICB9XG4gICAgZWxzZSBpZiAoZGF0YVZhbHVlID09PSBmYWxzZSB8fCBkYXRhVmFsdWUgPT0gJ0ZhbHNlJyB8fFxuICAgICAgICAgICAgIGRhdGFWYWx1ZSA9PSAnZmFsc2UnIHx8IGRhdGFWYWx1ZSA9PSAnMycpIHtcbiAgICAgIHZhbHVlID0gZmFsc2VcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbi8qKlxuICogQW4gSFRNTCA8c2VsZWN0PiB3aWRnZXQgd2hpY2ggYWxsb3dzIG11bHRpcGxlIHNlbGVjdGlvbnMuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtTZWxlY3R9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgU2VsZWN0TXVsdGlwbGUgPSBTZWxlY3QuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFNlbGVjdE11bHRpcGxlKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXaWRnZXQpKSB7IHJldHVybiBuZXcgU2VsZWN0TXVsdGlwbGUoa3dhcmdzKSB9XG4gICAgU2VsZWN0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIGFsbG93TXVsdGlwbGVTZWxlY3RlZDogdHJ1ZVxufSlcblxuLyoqXG4gKiBSZW5kZXJzIHRoZSB3aWRnZXQuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSB0aGUgZmllbGQgbmFtZS5cbiAqIEBwYXJhbSB7QXJyYXl9IHNlbGVjdGVkVmFsdWVzIHRoZSB2YWx1ZXMgb2Ygb3B0aW9ucyB3aGljaCBzaG91bGQgYmUgbWFya2VkIGFzXG4gKiAgIHNlbGVjdGVkLCBvciBudWxsIGlmIG5vIHZhbHVlcyBhcmUgc2VsZWN0ZWQgLSB0aGVzZSB3aWxsIGJlIG5vcm1hbGlzZWQgdG9cbiAqICAgU3RyaW5ncyBmb3IgY29tcGFyaXNvbiB3aXRoIGNob2ljZSB2YWx1ZXMuXG4gKiBAcGFyYW0ge09iamVjdH0gW2t3YXJnc10gYWRkaXRpb25hbCByZW5kZXJpbmcgb3B0aW9ucy5cbiAqIEBjb25maWcge09iamVjdH0gW2F0dHJzXSBhZGRpdGlvbmFsIEhUTUwgYXR0cmlidXRlcyBmb3IgdGhlIHJlbmRlcmVkIHdpZGdldC5cbiAqIEBjb25maWcge0FycmF5fSBbY2hvaWNlc10gY2hvaWNlcyB0byBiZSB1c2VkIHdoZW4gcmVuZGVyaW5nIHRoZSB3aWRnZXQsIGluXG4gKiAgIGFkZGl0aW9uIHRvIHRob3NlIGFscmVhZHkgaGVsZCBieSB0aGUgd2lkZ2V0IGl0c2VsZi5cbiAqIEByZXR1cm4gYSA8c2VsZWN0PiBlbGVtZW50IHdoaWNoIGFsbG93cyBtdWx0aXBsZSBzZWxlY3Rpb25zLlxuICovXG5TZWxlY3RNdWx0aXBsZS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgc2VsZWN0ZWRWYWx1ZXMsIGt3YXJncykge1xuICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbCwgY2hvaWNlczogW119LCBrd2FyZ3MpXG4gIGlmIChzZWxlY3RlZFZhbHVlcyA9PT0gbnVsbCkge1xuICAgIHNlbGVjdGVkVmFsdWVzID0gW11cbiAgfVxuICBpZiAoIWlzLkFycmF5KHNlbGVjdGVkVmFsdWVzKSkge1xuICAgIC8vIFRPRE8gT3V0cHV0IHdhcm5pbmcgaW4gZGV2ZWxvcG1lbnRcbiAgICBzZWxlY3RlZFZhbHVlcyA9IFtzZWxlY3RlZFZhbHVlc11cbiAgfVxuICB2YXIgZmluYWxBdHRycyA9IHRoaXMuYnVpbGRBdHRycyhrd2FyZ3MuYXR0cnMsIHtuYW1lOiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdWx0aXBsZTogJ211bHRpcGxlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBzZWxlY3RlZFZhbHVlc30pXG4gIHZhciBvcHRpb25zID0gdGhpcy5yZW5kZXJPcHRpb25zKGt3YXJncy5jaG9pY2VzLCBzZWxlY3RlZFZhbHVlcylcbiAgcmV0dXJuIFJlYWN0LkRPTS5zZWxlY3QoZmluYWxBdHRycywgb3B0aW9ucylcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgdmFsdWVzIGZvciB0aGlzIHdpZGdldCBmcm9tIHRoZSBnaXZlbiBkYXRhLlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgZm9ybSBkYXRhLlxuICogQHBhcmFtIHtPYmplY3R9IGZpbGVzIGZpbGUgZGF0YS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIHRoZSBmaWVsZCBuYW1lIHRvIGJlIHVzZWQgdG8gcmV0cmlldmUgZGF0YS5cbiAqIEByZXR1cm4ge0FycmF5fSB2YWx1ZXMgZm9yIHRoaXMgd2lkZ2V0LCBvciBudWxsIGlmIG5vIHZhbHVlcyB3ZXJlIHByb3ZpZGVkLlxuICovXG5TZWxlY3RNdWx0aXBsZS5wcm90b3R5cGUudmFsdWVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGEsIGZpbGVzLCBuYW1lKSB7XG4gIGlmICh0eXBlb2YgZGF0YVtuYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBbXS5jb25jYXQoZGF0YVtuYW1lXSlcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG4vKipcbiAqIEFuIG9iamVjdCB1c2VkIGJ5IENob2ljZUZpZWxkUmVuZGVyZXIgdGhhdCByZXByZXNlbnRzIGEgc2luZ2xlXG4gKiA8aW5wdXQ+LlxuICovXG52YXIgQ2hvaWNlSW5wdXQgPSBTdWJXaWRnZXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIENob2ljZUlucHV0KG5hbWUsIHZhbHVlLCBhdHRycywgY2hvaWNlLCBpbmRleCkge1xuICAgIHRoaXMubmFtZSA9IG5hbWVcbiAgICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgICB0aGlzLmF0dHJzID0gYXR0cnNcbiAgICB0aGlzLmNob2ljZVZhbHVlID0gJycrY2hvaWNlWzBdXG4gICAgdGhpcy5jaG9pY2VMYWJlbCA9ICcnK2Nob2ljZVsxXVxuICAgIHRoaXMuaW5kZXggPSBpbmRleFxuICAgIGlmICh0eXBlb2YgdGhpcy5hdHRycy5pZCAhPSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5hdHRycy5pZCArPSAnXycgKyB0aGlzLmluZGV4XG4gICAgfVxuICB9XG4sIGlucHV0VHlwZTogbnVsbCAvLyBTdWJjbGFzc2VzIG11c3QgZGVmaW5lIHRoaXNcbn0pXG5cbi8qKlxuICogUmVuZGVycyBhIDxsYWJlbD4gZW5jbG9zaW5nIHRoZSB3aWRnZXQgYW5kIGl0cyBsYWJlbCB0ZXh0LlxuICovXG5DaG9pY2VJbnB1dC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBsYWJlbEF0dHJzID0ge31cbiAgaWYgKHRoaXMuaWRGb3JMYWJlbCgpKSB7XG4gICAgbGFiZWxBdHRycy5odG1sRm9yID0gdGhpcy5pZEZvckxhYmVsKClcbiAgfVxuICByZXR1cm4gUmVhY3QuRE9NLmxhYmVsKGxhYmVsQXR0cnMsIHRoaXMudGFnKCksICcgJywgdGhpcy5jaG9pY2VMYWJlbClcbn1cblxuQ2hvaWNlSW5wdXQucHJvdG90eXBlLmlzQ2hlY2tlZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy52YWx1ZSA9PT0gdGhpcy5jaG9pY2VWYWx1ZVxufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIDxpbnB1dD4gcG9ydGlvbiBvZiB0aGUgd2lkZ2V0LlxuICovXG5DaG9pY2VJbnB1dC5wcm90b3R5cGUudGFnID0gZnVuY3Rpb24oKSB7XG4gIHZhciBmaW5hbEF0dHJzID0gb2JqZWN0LmV4dGVuZCh7fSwgdGhpcy5hdHRycywge1xuICAgIHR5cGU6IHRoaXMuaW5wdXRUeXBlLCBuYW1lOiB0aGlzLm5hbWUsIHZhbHVlOiB0aGlzLmNob2ljZVZhbHVlXG4gIH0pXG4gIGlmICh0aGlzLmlzQ2hlY2tlZCgpKSB7XG4gICAgZmluYWxBdHRycy5kZWZhdWx0Q2hlY2tlZCA9ICdjaGVja2VkJ1xuICB9XG4gIHJldHVybiBSZWFjdC5ET00uaW5wdXQoZmluYWxBdHRycylcbn1cblxuQ2hvaWNlSW5wdXQucHJvdG90eXBlLmlkRm9yTGFiZWwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG9iamVjdC5nZXQodGhpcy5hdHRycywgJ2lkJywgJycpXG59XG5cbnZhciBSYWRpb0Nob2ljZUlucHV0ID0gQ2hvaWNlSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFJhZGlvQ2hvaWNlSW5wdXQobmFtZSwgdmFsdWUsIGF0dHJzLCBjaG9pY2UsIGluZGV4KSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJhZGlvQ2hvaWNlSW5wdXQpKSB7XG4gICAgICByZXR1cm4gbmV3IFJhZGlvQ2hvaWNlSW5wdXQobmFtZSwgdmFsdWUsIGF0dHJzLCBjaG9pY2UsIGluZGV4KVxuICAgIH1cbiAgICBDaG9pY2VJbnB1dC5jYWxsKHRoaXMsIG5hbWUsIHZhbHVlLCBhdHRycywgY2hvaWNlLCBpbmRleClcbiAgICB0aGlzLnZhbHVlID0gJycrdGhpcy52YWx1ZVxuICB9XG4sIGlucHV0VHlwZTogJ3JhZGlvJ1xufSlcblxudmFyIENoZWNrYm94Q2hvaWNlSW5wdXQgPSBDaG9pY2VJbnB1dC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gQ2hlY2tib3hDaG9pY2VJbnB1dChuYW1lLCB2YWx1ZSwgYXR0cnMsIGNob2ljZSwgaW5kZXgpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQ2hlY2tib3hDaG9pY2VJbnB1dCkpIHtcbiAgICAgIHJldHVybiBuZXcgQ2hlY2tib3hDaG9pY2VJbnB1dChuYW1lLCB2YWx1ZSwgYXR0cnMsIGNob2ljZSwgaW5kZXgpXG4gICAgfVxuICAgIGlmICghaXMuQXJyYXkodmFsdWUpKSB7XG4gICAgICAvLyBUT0RPIE91dHB1dCB3YXJuaW5nIGluIGRldmVsb3BtZW50XG4gICAgICB2YWx1ZSA9IFt2YWx1ZV1cbiAgICB9XG4gICAgQ2hvaWNlSW5wdXQuY2FsbCh0aGlzLCBuYW1lLCB2YWx1ZSwgYXR0cnMsIGNob2ljZSwgaW5kZXgpXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLnZhbHVlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdGhpcy52YWx1ZVtpXSA9ICcnK3RoaXMudmFsdWVbaV1cbiAgICB9XG4gIH1cbiwgaW5wdXRUeXBlOiAnY2hlY2tib3gnXG59KVxuXG5DaGVja2JveENob2ljZUlucHV0LnByb3RvdHlwZS5pc0NoZWNrZWQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudmFsdWUuaW5kZXhPZih0aGlzLmNob2ljZVZhbHVlKSAhPT0gLTFcbn1cblxuLyoqXG4gKiBBbiBvYmplY3QgdXNlZCBieSBjaG9pY2UgU2VsZWN0cyB0byBlbmFibGUgY3VzdG9taXNhdGlvbiBvZiBjaG9pY2Ugd2lkZ2V0cy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IGF0dHJzXG4gKiBAcGFyYW0ge0FycmF5fSBjaG9pY2VzXG4gKi9cbnZhciBDaG9pY2VGaWVsZFJlbmRlcmVyID0gQ29uY3VyLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBDaG9pY2VGaWVsZFJlbmRlcmVyKG5hbWUsIHZhbHVlLCBhdHRycywgY2hvaWNlcykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBDaG9pY2VGaWVsZFJlbmRlcmVyKSkge1xuICAgICAgcmV0dXJuIG5ldyBDaG9pY2VGaWVsZFJlbmRlcmVyKG5hbWUsIHZhbHVlLCBhdHRycywgY2hvaWNlcylcbiAgICB9XG4gICAgdGhpcy5uYW1lID0gbmFtZVxuICAgIHRoaXMudmFsdWUgPSB2YWx1ZVxuICAgIHRoaXMuYXR0cnMgPSBhdHRyc1xuICAgIHRoaXMuY2hvaWNlcyA9IGNob2ljZXNcbiAgfVxuLCBjaG9pY2VJbnB1dENvbnN0cnVjdG9yOiBudWxsXG59KVxuXG5DaG9pY2VGaWVsZFJlbmRlcmVyLnByb3RvdHlwZS5fX2l0ZXJfXyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5jaG9pY2VJbnB1dHMoKVxufVxuXG5DaG9pY2VGaWVsZFJlbmRlcmVyLnByb3RvdHlwZS5jaG9pY2VJbnB1dHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGlucHV0cyA9IFtdXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5jaG9pY2VzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlucHV0cy5wdXNoKHRoaXMuY2hvaWNlSW5wdXRDb25zdHJ1Y3Rvcih0aGlzLm5hbWUsIHRoaXMudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5leHRlbmQoe30sIHRoaXMuYXR0cnMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNob2ljZXNbaV0sIGkpKVxuICB9XG4gIHJldHVybiBpbnB1dHNcbn1cblxuQ2hvaWNlRmllbGRSZW5kZXJlci5wcm90b3R5cGUuY2hvaWNlSW5wdXQgPSBmdW5jdGlvbihpKSB7XG4gIGlmIChpID49IHRoaXMuY2hvaWNlcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0luZGV4IG91dCBvZiBib3VuZHM6ICcgKyBpKVxuICB9XG4gIHJldHVybiB0aGlzLmNob2ljZUlucHV0Q29uc3RydWN0b3IodGhpcy5uYW1lLCB0aGlzLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5leHRlbmQoe30sIHRoaXMuYXR0cnMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2hvaWNlc1tpXSwgaSlcbn1cblxuLyoqXG4gKiBPdXRwdXRzIGEgPHVsPiBmb3IgdGhpcyBzZXQgb2YgY2hvaWNlIGZpZWxkcy5cbiAqIElmIGFuIGlkIHdhcyBnaXZlbiB0byB0aGUgZmllbGQsIGl0IGlzIGFwcGxpZWQgdG8gdGhlIDx1bD4gKGVhY2ggaXRlbSBpbiB0aGVcbiAqIGxpc3Qgd2lsbCBnZXQgYW4gaWQgb2YgYCRpZF8kaWApLlxuICovXG5DaG9pY2VGaWVsZFJlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGlkID0gb2JqZWN0LmdldCh0aGlzLmF0dHJzLCAnaWQnLCBudWxsKVxuICB2YXIgaXRlbXMgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuY2hvaWNlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgY2hvaWNlID0gdGhpcy5jaG9pY2VzW2ldXG4gICAgdmFyIGNob2ljZVZhbHVlID0gY2hvaWNlWzBdXG4gICAgdmFyIGNob2ljZUxhYmVsID0gY2hvaWNlWzFdXG4gICAgaWYgKGlzLkFycmF5KGNob2ljZUxhYmVsKSkge1xuICAgICAgdmFyIGF0dHJzUGx1cyA9IG9iamVjdC5leHRlbmQoe30sIHRoaXMuYXR0cnMpXG4gICAgICBpZiAoaWQpIHtcbiAgICAgICAgYXR0cnNQbHVzLmlkICs9J18nICsgaVxuICAgICAgfVxuICAgICAgdmFyIHN1YlJlbmRlcmVyID0gQ2hvaWNlRmllbGRSZW5kZXJlcih0aGlzLm5hbWUsIHRoaXMudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzUGx1cywgY2hvaWNlTGFiZWwpXG4gICAgICBzdWJSZW5kZXJlci5jaG9pY2VJbnB1dENvbnN0cnVjdG9yID0gdGhpcy5jaG9pY2VJbnB1dENvbnN0cnVjdG9yXG4gICAgICBpdGVtcy5wdXNoKFJlYWN0LkRPTS5saShudWxsLCBjaG9pY2VWYWx1ZSwgc3ViUmVuZGVyZXIucmVuZGVyKCkpKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZhciB3ID0gdGhpcy5jaG9pY2VJbnB1dENvbnN0cnVjdG9yKHRoaXMubmFtZSwgdGhpcy52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5leHRlbmQoe30sIHRoaXMuYXR0cnMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hvaWNlLCBpKVxuICAgICAgaXRlbXMucHVzaChSZWFjdC5ET00ubGkobnVsbCwgdy5yZW5kZXIoKSkpXG4gICAgfVxuICB9XG4gIHZhciBsaXN0QXR0cnMgPSB7fVxuICBpZiAoaWQpIHtcbiAgICBsaXN0QXR0cnMuaWQgPSBpZFxuICB9XG4gIHJldHVybiBSZWFjdC5ET00udWwobGlzdEF0dHJzLCBpdGVtcylcbn1cblxudmFyIFJhZGlvRmllbGRSZW5kZXJlciA9IENob2ljZUZpZWxkUmVuZGVyZXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFJhZGlvRmllbGRSZW5kZXJlcihuYW1lLCB2YWx1ZSwgYXR0cnMsIGNob2ljZXMpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmFkaW9GaWVsZFJlbmRlcmVyKSkge1xuICAgICAgcmV0dXJuIG5ldyBSYWRpb0ZpZWxkUmVuZGVyZXIobmFtZSwgdmFsdWUsIGF0dHJzLCBjaG9pY2VzKVxuICAgIH1cbiAgICBDaG9pY2VGaWVsZFJlbmRlcmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgfVxuLCBjaG9pY2VJbnB1dENvbnN0cnVjdG9yOiBSYWRpb0Nob2ljZUlucHV0XG59KVxuXG52YXIgQ2hlY2tib3hGaWVsZFJlbmRlcmVyID0gQ2hvaWNlRmllbGRSZW5kZXJlci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gQ2hlY2tib3hGaWVsZFJlbmRlcmVyKG5hbWUsIHZhbHVlLCBhdHRycywgY2hvaWNlcykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBDaGVja2JveEZpZWxkUmVuZGVyZXIpKSB7XG4gICAgICByZXR1cm4gbmV3IENoZWNrYm94RmllbGRSZW5kZXJlcihuYW1lLCB2YWx1ZSwgYXR0cnMsIGNob2ljZXMpXG4gICAgfVxuICAgIENob2ljZUZpZWxkUmVuZGVyZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICB9XG4sIGNob2ljZUlucHV0Q29uc3RydWN0b3I6IENoZWNrYm94Q2hvaWNlSW5wdXRcbn0pXG5cbnZhciBSZW5kZXJlck1peGluID0gQ29uY3VyLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBSZW5kZXJlck1peGluKGt3YXJncykge1xuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe3JlbmRlcmVyOiBudWxsfSwga3dhcmdzKVxuICAgIC8vIE92ZXJyaWRlIHRoZSBkZWZhdWx0IHJlbmRlcmVyIGlmIHdlIHdlcmUgcGFzc2VkIG9uZVxuICAgIGlmIChrd2FyZ3MucmVuZGVyZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMucmVuZGVyZXIgPSBrd2FyZ3MucmVuZGVyZXJcbiAgICB9XG4gIH1cbiwgX2VtcHR5VmFsdWU6IG51bGxcbn0pXG5cblJlbmRlcmVyTWl4aW4ucHJvdG90eXBlLnN1YldpZGdldHMgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIHJldHVybiB1dGlsLml0ZXJhdGUodGhpcy5nZXRSZW5kZXJlcihuYW1lLCB2YWx1ZSwga3dhcmdzKSlcbn1cblxuLyoqXG4gKiBAcmV0dXJuIGFuIGluc3RhbmNlIG9mIHRoZSByZW5kZXJlciB0byBiZSB1c2VkIHRvIHJlbmRlciB0aGlzIHdpZGdldC5cbiAqL1xuUmVuZGVyZXJNaXhpbi5wcm90b3R5cGUuZ2V0UmVuZGVyZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiBudWxsLCBjaG9pY2VzOiBbXX0sIGt3YXJncylcbiAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgdmFsdWUgPSB0aGlzLl9lbXB0eVZhbHVlXG4gIH1cbiAgdmFyIGZpbmFsQXR0cnMgPSB0aGlzLmJ1aWxkQXR0cnMoa3dhcmdzLmF0dHJzKVxuICB2YXIgY2hvaWNlcyA9IHV0aWwuaXRlcmF0ZSh0aGlzLmNob2ljZXMpLmNvbmNhdChrd2FyZ3MuY2hvaWNlcyB8fCBbXSlcbiAgcmV0dXJuIG5ldyB0aGlzLnJlbmRlcmVyKG5hbWUsIHZhbHVlLCBmaW5hbEF0dHJzLCBjaG9pY2VzKVxufVxuXG5SZW5kZXJlck1peGluLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIHJldHVybiB0aGlzLmdldFJlbmRlcmVyKG5hbWUsIHZhbHVlLCBrd2FyZ3MpLnJlbmRlcigpXG59XG5cbi8qKlxuICogV2lkZ2V0cyB1c2luZyB0aGlzIFJlbmRlcmVyTWl4aW4gYXJlIG1hZGUgb2YgYSBjb2xsZWN0aW9uIG9mIHN1YndpZGdldHMsIGVhY2hcbiAqIHdpdGggdGhlaXIgb3duIDxsYWJlbD4sIGFuZCBkaXN0aW5jdCBJRC5cbiAqIFRoZSBJRHMgYXJlIG1hZGUgZGlzdGluY3QgYnkgeSBcIl9YXCIgc3VmZml4LCB3aGVyZSBYIGlzIHRoZSB6ZXJvLWJhc2VkIGluZGV4XG4gKiBvZiB0aGUgY2hvaWNlIGZpZWxkLiBUaHVzLCB0aGUgbGFiZWwgZm9yIHRoZSBtYWluIHdpZGdldCBzaG91bGQgcmVmZXJlbmNlIHRoZVxuICogZmlyc3Qgc3Vid2lkZ2V0LCBoZW5jZSB0aGUgXCJfMFwiIHN1ZmZpeC5cbiAqL1xuUmVuZGVyZXJNaXhpbi5wcm90b3R5cGUuaWRGb3JMYWJlbCA9IGZ1bmN0aW9uKGlkKSB7XG4gIGlmIChpZCkge1xuICAgIGlkICs9ICdfMCdcbiAgfVxuICByZXR1cm4gaWRcbn1cblxuLyoqXG4gKiBSZW5kZXJzIGEgc2luZ2xlIHNlbGVjdCBhcyBhIGxpc3Qgb2YgPGlucHV0IHR5cGU9XCJyYWRpb1wiPiBlbGVtZW50cy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1NlbGVjdH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBSYWRpb1NlbGVjdCA9IFNlbGVjdC5leHRlbmQoe1xuICBfX21peGluX186IFJlbmRlcmVyTWl4aW5cbiwgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBSYWRpb1NlbGVjdCkpIHsgcmV0dXJuIG5ldyBSYWRpb1NlbGVjdChrd2FyZ3MpIH1cbiAgICBSZW5kZXJlck1peGluLmNhbGwodGhpcywga3dhcmdzKVxuICAgIFNlbGVjdC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuLCByZW5kZXJlcjogUmFkaW9GaWVsZFJlbmRlcmVyXG4sIF9lbXB0eVZhbHVlOiAnJ1xufSlcblxuLyoqXG4gKiBNdWx0aXBsZSBzZWxlY3Rpb25zIHJlcHJlc2VudGVkIGFzIGEgbGlzdCBvZiA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCI+IHdpZGdldHMuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtTZWxlY3RNdWx0aXBsZX1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBDaGVja2JveFNlbGVjdE11bHRpcGxlID0gU2VsZWN0TXVsdGlwbGUuZXh0ZW5kKHtcbiAgX19taXhpbl9fOiBSZW5kZXJlck1peGluXG4sIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQ2hlY2tib3hTZWxlY3RNdWx0aXBsZSkpIHsgcmV0dXJuIG5ldyBDaGVja2JveFNlbGVjdE11bHRpcGxlKGt3YXJncykgfVxuICAgIFJlbmRlcmVyTWl4aW4uY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgU2VsZWN0TXVsdGlwbGUuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgcmVuZGVyZXI6IENoZWNrYm94RmllbGRSZW5kZXJlclxuLCBfZW1wdHlWYWx1ZTogW11cbn0pXG5cbi8qKlxuICogQSB3aWRnZXQgdGhhdCBpcyBjb21wb3NlZCBvZiBtdWx0aXBsZSB3aWRnZXRzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7V2lkZ2V0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIE11bHRpV2lkZ2V0ID0gV2lkZ2V0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBNdWx0aVdpZGdldCh3aWRnZXRzLCBrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IE11bHRpV2lkZ2V0KHdpZGdldHMsIGt3YXJncykgfVxuICAgIHRoaXMud2lkZ2V0cyA9IFtdXG4gICAgdmFyIG5lZWRzTXVsdGlwYXJ0Rm9ybSA9IGZhbHNlXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB3aWRnZXRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIHdpZGdldCA9IHdpZGdldHNbaV0gaW5zdGFuY2VvZiBXaWRnZXQgPyB3aWRnZXRzW2ldIDogbmV3IHdpZGdldHNbaV0oKVxuICAgICAgaWYgKHdpZGdldC5uZWVkc011bHRpcGFydEZvcm0pIHtcbiAgICAgICAgbmVlZHNNdWx0aXBhcnRGb3JtID0gdHJ1ZVxuICAgICAgfVxuICAgICAgdGhpcy53aWRnZXRzLnB1c2god2lkZ2V0KVxuICAgIH1cbiAgICB0aGlzLm5lZWRzTXVsdGlwYXJ0Rm9ybSA9IG5lZWRzTXVsdGlwYXJ0Rm9ybVxuICAgIFdpZGdldC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuLyoqXG4gKiBUaGlzIG1ldGhvZCBpcyBkaWZmZXJlbnQgdGhhbiBvdGhlciB3aWRnZXRzJywgYmVjYXVzZSBpdCBoYXMgdG8gZmlndXJlIG91dFxuICogaG93IHRvIHNwbGl0IGEgc2luZ2xlIHZhbHVlIGZvciBkaXNwbGF5IGluIG11bHRpcGxlIHdpZGdldHMuXG4gKlxuICogSWYgdGhlIGdpdmVuIHZhbHVlIGlzIE5PVCBhIGxpc3QsIGl0IHdpbGwgZmlyc3QgYmUgXCJkZWNvbXByZXNzZWRcIiBpbnRvIGEgbGlzdFxuICogYmVmb3JlIGl0IGlzIHJlbmRlcmVkIGJ5IGNhbGxpbmcgdGhlICBNdWx0aVdpZGdldCNkZWNvbXByZXNzIGZ1bmN0aW9uLlxuICpcbiAqIEVhY2ggdmFsdWUgaW4gdGhlIGxpc3QgaXMgcmVuZGVyZWQgIHdpdGggdGhlIGNvcnJlc3BvbmRpbmcgd2lkZ2V0IC0tIHRoZVxuICogZmlyc3QgdmFsdWUgaXMgcmVuZGVyZWQgaW4gdGhlIGZpcnN0IHdpZGdldCwgdGhlIHNlY29uZCB2YWx1ZSBpcyByZW5kZXJlZCBpblxuICogdGhlIHNlY29uZCB3aWRnZXQsIGFuZCBzbyBvbi5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSB0aGUgZmllbGQgbmFtZS5cbiAqIEBwYXJhbSB2YWx1ZSBhIGxpc3Qgb2YgdmFsdWVzLCBvciBhIG5vcm1hbCB2YWx1ZSAoZS5nLiwgYSBTdHJpbmcgdGhhdCBoYXNcbiAqICAgYmVlbiBcImNvbXByZXNzZWRcIiBmcm9tIGEgbGlzdCBvZiB2YWx1ZXMpLlxuICogQHBhcmFtIHtPYmplY3R9IFtrd2FyZ3NdIHJlbmRlcmluZyBvcHRpb25zXG4gKiBAY29uZmlnIHtPYmplY3R9IFthdHRyc10gYWRkaXRpb25hbCBIVE1MIGF0dHJpYnV0ZXMgZm9yIHRoZSByZW5kZXJlZCB3aWRnZXQuXG4gKiBAcmV0dXJuIGEgcmVuZGVyZWQgY29sbGVjdGlvbiBvZiB3aWRnZXRzLlxuICovXG5NdWx0aVdpZGdldC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbH0sIGt3YXJncylcbiAgaWYgKCEoaXMuQXJyYXkodmFsdWUpKSkge1xuICAgIHZhbHVlID0gdGhpcy5kZWNvbXByZXNzKHZhbHVlKVxuICB9XG4gIHZhciBmaW5hbEF0dHJzID0gdGhpcy5idWlsZEF0dHJzKGt3YXJncy5hdHRycylcbiAgdmFyIGlkID0gKHR5cGVvZiBmaW5hbEF0dHJzLmlkICE9ICd1bmRlZmluZWQnID8gZmluYWxBdHRycy5pZCA6IG51bGwpXG4gIHZhciByZW5kZXJlZFdpZGdldHMgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMud2lkZ2V0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgd2lkZ2V0ID0gdGhpcy53aWRnZXRzW2ldXG4gICAgdmFyIHdpZGdldFZhbHVlID0gbnVsbFxuICAgIGlmICh0eXBlb2YgdmFsdWVbaV0gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHdpZGdldFZhbHVlID0gdmFsdWVbaV1cbiAgICB9XG4gICAgaWYgKGlkKSB7XG4gICAgICBmaW5hbEF0dHJzLmlkID0gaWQgKyAnXycgKyBpXG4gICAgfVxuICAgIHJlbmRlcmVkV2lkZ2V0cy5wdXNoKFxuICAgICAgICB3aWRnZXQucmVuZGVyKG5hbWUgKyAnXycgKyBpLCB3aWRnZXRWYWx1ZSwge2F0dHJzOiBmaW5hbEF0dHJzfSkpXG4gIH1cbiAgcmV0dXJuIHRoaXMuZm9ybWF0T3V0cHV0KHJlbmRlcmVkV2lkZ2V0cylcbn1cblxuTXVsdGlXaWRnZXQucHJvdG90eXBlLmlkRm9yTGFiZWwgPSBmdW5jdGlvbihpZCkge1xuICBpZiAoaWQpIHtcbiAgICBpZCArPSAnXzAnXG4gIH1cbiAgcmV0dXJuIGlkXG59XG5cbk11bHRpV2lkZ2V0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhID0gZnVuY3Rpb24oZGF0YSwgZmlsZXMsIG5hbWUpIHtcbiAgdmFyIHZhbHVlcyA9IFtdXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy53aWRnZXRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhbHVlc1tpXSA9IHRoaXMud2lkZ2V0c1tpXS52YWx1ZUZyb21EYXRhKGRhdGEsIGZpbGVzLCBuYW1lICsgJ18nICsgaSlcbiAgfVxuICByZXR1cm4gdmFsdWVzXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBlbGVtZW50IGNvbnRhaW5pbmcgYSBnaXZlbiBsaXN0IG9mIHJlbmRlcmVkIHdpZGdldHMuXG4gKlxuICogVGhpcyBob29rIGFsbG93cyB5b3UgdG8gZm9ybWF0IHRoZSBIVE1MIGRlc2lnbiBvZiB0aGUgd2lkZ2V0cywgaWYgbmVlZGVkLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHJlbmRlcmVkV2lkZ2V0cyBhIGxpc3Qgb2YgcmVuZGVyZWQgd2lkZ2V0cy5cbiAqIEByZXR1cm4gYSA8ZGl2PiBjb250YWluaW5nIHRoZSByZW5kZXJlZCB3aWRnZXRzLlxuICovXG5NdWx0aVdpZGdldC5wcm90b3R5cGUuZm9ybWF0T3V0cHV0ID0gZnVuY3Rpb24ocmVuZGVyZWRXaWRnZXRzKSB7XG4gIHJldHVybiBSZWFjdC5ET00uZGl2KG51bGwsIHJlbmRlcmVkV2lkZ2V0cylcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbGlzdCBvZiBkZWNvbXByZXNzZWQgdmFsdWVzIGZvciB0aGUgZ2l2ZW4gY29tcHJlc3NlZCB2YWx1ZS5cbiAqIEBhYnN0cmFjdFxuICogQHBhcmFtIHZhbHVlIGEgY29tcHJlc3NlZCB2YWx1ZSwgd2hpY2ggY2FuIGJlIGFzc3VtZWQgdG8gYmUgdmFsaWQsIGJ1dCBub3RcbiAqICAgbmVjZXNzYXJpbHkgbm9uLWVtcHR5LlxuICogQHJldHVybiBhIGxpc3Qgb2YgZGVjb21wcmVzc2VkIHZhbHVlcyBmb3IgdGhlIGdpdmVuIGNvbXByZXNzZWQgdmFsdWUuXG4gKi9cbk11bHRpV2lkZ2V0LnByb3RvdHlwZS5kZWNvbXByZXNzID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdNdWx0aVdpZGdldCBzdWJjbGFzc2VzIG11c3QgaW1wbGVtZW50IGEgZGVjb21wcmVzcygpIG1ldGhvZC4nKVxufVxuXG4vKipcbiAqIFNwbGl0cyBEYXRlIGlucHV0IGludG8gdHdvIDxpbnB1dCB0eXBlPVwidGV4dFwiPiBlbGVtZW50cy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge011bHRpV2lkZ2V0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFNwbGl0RGF0ZVRpbWVXaWRnZXQgPSBNdWx0aVdpZGdldC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gU3BsaXREYXRlVGltZVdpZGdldChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IFNwbGl0RGF0ZVRpbWVXaWRnZXQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7ZGF0ZUZvcm1hdDogbnVsbCwgdGltZUZvcm1hdDogbnVsbH0sIGt3YXJncylcbiAgICB2YXIgd2lkZ2V0cyA9IFtcbiAgICAgIERhdGVJbnB1dCh7YXR0cnM6IGt3YXJncy5hdHRycywgZm9ybWF0OiBrd2FyZ3MuZGF0ZUZvcm1hdH0pXG4gICAgLCBUaW1lSW5wdXQoe2F0dHJzOiBrd2FyZ3MuYXR0cnMsIGZvcm1hdDoga3dhcmdzLnRpbWVGb3JtYXR9KVxuICAgIF1cbiAgICBNdWx0aVdpZGdldC5jYWxsKHRoaXMsIHdpZGdldHMsIGt3YXJncy5hdHRycylcbiAgfVxufSlcblxuU3BsaXREYXRlVGltZVdpZGdldC5wcm90b3R5cGUuZGVjb21wcmVzcyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSkge1xuICAgIHJldHVybiBbXG4gICAgICBuZXcgRGF0ZSh2YWx1ZS5nZXRGdWxsWWVhcigpLCB2YWx1ZS5nZXRNb250aCgpLCB2YWx1ZS5nZXREYXRlKCkpXG4gICAgLCBuZXcgRGF0ZSgxOTAwLCAwLCAxLCB2YWx1ZS5nZXRIb3VycygpLCB2YWx1ZS5nZXRNaW51dGVzKCksIHZhbHVlLmdldFNlY29uZHMoKSlcbiAgICBdXG4gIH1cbiAgcmV0dXJuIFtudWxsLCBudWxsXVxufVxuXG4vKipcbiAqIFNwbGl0cyBEYXRlIGlucHV0IGludG8gdHdvIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCI+IGVsZW1lbnRzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7U3BsaXREYXRlVGltZVdpZGdldH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBTcGxpdEhpZGRlbkRhdGVUaW1lV2lkZ2V0ID0gU3BsaXREYXRlVGltZVdpZGdldC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gU3BsaXRIaWRkZW5EYXRlVGltZVdpZGdldChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IFNwbGl0SGlkZGVuRGF0ZVRpbWVXaWRnZXQoa3dhcmdzKSB9XG4gICAgU3BsaXREYXRlVGltZVdpZGdldC5jYWxsKHRoaXMsIGt3YXJncylcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMud2lkZ2V0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRoaXMud2lkZ2V0c1tpXS5pbnB1dFR5cGUgPSAnaGlkZGVuJ1xuICAgICAgdGhpcy53aWRnZXRzW2ldLmlzSGlkZGVuID0gdHJ1ZVxuICAgIH1cbiAgfVxuLCBpc0hpZGRlbjogdHJ1ZVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFN1YldpZGdldDogU3ViV2lkZ2V0XG4sIFdpZGdldDogV2lkZ2V0XG4sIElucHV0OiBJbnB1dFxuLCBUZXh0SW5wdXQ6IFRleHRJbnB1dFxuLCBOdW1iZXJJbnB1dDogTnVtYmVySW5wdXRcbiwgRW1haWxJbnB1dDogRW1haWxJbnB1dFxuLCBVUkxJbnB1dDogVVJMSW5wdXRcbiwgUGFzc3dvcmRJbnB1dDogUGFzc3dvcmRJbnB1dFxuLCBIaWRkZW5JbnB1dDogSGlkZGVuSW5wdXRcbiwgTXVsdGlwbGVIaWRkZW5JbnB1dDogTXVsdGlwbGVIaWRkZW5JbnB1dFxuLCBGaWxlSW5wdXQ6IEZpbGVJbnB1dFxuLCBGSUxFX0lOUFVUX0NPTlRSQURJQ1RJT046IEZJTEVfSU5QVVRfQ09OVFJBRElDVElPTlxuLCBDbGVhcmFibGVGaWxlSW5wdXQ6IENsZWFyYWJsZUZpbGVJbnB1dFxuLCBUZXh0YXJlYTogVGV4dGFyZWFcbiwgRGF0ZUlucHV0OiBEYXRlSW5wdXRcbiwgRGF0ZVRpbWVJbnB1dDogRGF0ZVRpbWVJbnB1dFxuLCBUaW1lSW5wdXQ6IFRpbWVJbnB1dFxuLCBDaGVja2JveElucHV0OiBDaGVja2JveElucHV0XG4sIFNlbGVjdDogU2VsZWN0XG4sIE51bGxCb29sZWFuU2VsZWN0OiBOdWxsQm9vbGVhblNlbGVjdFxuLCBTZWxlY3RNdWx0aXBsZTogU2VsZWN0TXVsdGlwbGVcbiwgQ2hvaWNlSW5wdXQ6IENob2ljZUlucHV0XG4sIFJhZGlvQ2hvaWNlSW5wdXQ6IFJhZGlvQ2hvaWNlSW5wdXRcbiwgQ2hlY2tib3hDaG9pY2VJbnB1dDogQ2hlY2tib3hDaG9pY2VJbnB1dFxuLCBDaG9pY2VGaWVsZFJlbmRlcmVyOiBDaG9pY2VGaWVsZFJlbmRlcmVyXG4sIFJlbmRlcmVyTWl4aW46IFJlbmRlcmVyTWl4aW5cbiwgUmFkaW9GaWVsZFJlbmRlcmVyOiBSYWRpb0ZpZWxkUmVuZGVyZXJcbiwgQ2hlY2tib3hGaWVsZFJlbmRlcmVyOiBDaGVja2JveEZpZWxkUmVuZGVyZXJcbiwgUmFkaW9TZWxlY3Q6IFJhZGlvU2VsZWN0XG4sIENoZWNrYm94U2VsZWN0TXVsdGlwbGU6IENoZWNrYm94U2VsZWN0TXVsdGlwbGVcbiwgTXVsdGlXaWRnZXQ6IE11bHRpV2lkZ2V0XG4sIFNwbGl0RGF0ZVRpbWVXaWRnZXQ6IFNwbGl0RGF0ZVRpbWVXaWRnZXRcbiwgU3BsaXRIaWRkZW5EYXRlVGltZVdpZGdldDogU3BsaXRIaWRkZW5EYXRlVGltZVdpZGdldFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaXMgPSByZXF1aXJlKCdpc29tb3JwaC9pcycpXG52YXIgb2JqZWN0ID0gcmVxdWlyZSgnaXNvbW9ycGgvb2JqZWN0JylcblxuLyoqXG4gKiBNaXhlcyBpbiBwcm9wZXJ0aWVzIGZyb20gb25lIG9iamVjdCB0byBhbm90aGVyLiBJZiB0aGUgc291cmNlIG9iamVjdCBpcyBhXG4gKiBGdW5jdGlvbiwgaXRzIHByb3RvdHlwZSBpcyBtaXhlZCBpbiBpbnN0ZWFkLlxuICovXG5mdW5jdGlvbiBtaXhpbihkZXN0LCBzcmMpIHtcbiAgaWYgKGlzLkZ1bmN0aW9uKHNyYykpIHtcbiAgICBvYmplY3QuZXh0ZW5kKGRlc3QsIHNyYy5wcm90b3R5cGUpXG4gIH1cbiAgZWxzZSB7XG4gICAgb2JqZWN0LmV4dGVuZChkZXN0LCBzcmMpXG4gIH1cbn1cblxuLyoqXG4gKiBBcHBsaWVzIG1peGlucyBzcGVjaWZpZWQgYXMgYSBfX21peGluX18gcHJvcGVydHkgb24gdGhlIGdpdmVuIHByb3BlcnRpZXNcbiAqIG9iamVjdCwgcmV0dXJuaW5nIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBtaXhlZCBpbiBwcm9wZXJ0aWVzLlxuICovXG5mdW5jdGlvbiBhcHBseU1peGlucyhwcm9wZXJ0aWVzKSB7XG4gIHZhciBtaXhpbnMgPSBwcm9wZXJ0aWVzLl9fbWl4aW5fX1xuICBpZiAoIWlzLkFycmF5KG1peGlucykpIHtcbiAgICBtaXhpbnMgPSBbbWl4aW5zXVxuICB9XG4gIHZhciBtaXhlZFByb3BlcnRpZXMgPSB7fVxuICBmb3IgKHZhciBpID0gMCwgbCA9IG1peGlucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBtaXhpbihtaXhlZFByb3BlcnRpZXMsIG1peGluc1tpXSlcbiAgfVxuICBkZWxldGUgcHJvcGVydGllcy5fX21peGluX19cbiAgcmV0dXJuIG9iamVjdC5leHRlbmQobWl4ZWRQcm9wZXJ0aWVzLCBwcm9wZXJ0aWVzKVxufVxuXG4vKipcbiAqIEluaGVyaXRzIGFub3RoZXIgY29uc3RydWN0b3IncyBwcm90b3R5cGUgYW5kIHNldHMgaXRzIHByb3RvdHlwZSBhbmRcbiAqIGNvbnN0cnVjdG9yIHByb3BlcnRpZXMgaW4gb25lIGZlbGwgc3dvb3AuXG4gKlxuICogSWYgYSBjaGlsZCBjb25zdHJ1Y3RvciBpcyBub3QgcHJvdmlkZWQgdmlhIHByb3RvdHlwZVByb3BzLmNvbnN0cnVjdG9yLFxuICogYSBuZXcgY29uc3RydWN0b3Igd2lsbCBiZSBjcmVhdGVkLlxuICovXG5mdW5jdGlvbiBpbmhlcml0RnJvbShwYXJlbnRDb25zdHJ1Y3RvciwgcHJvdG90eXBlUHJvcHMsIGNvbnN0cnVjdG9yUHJvcHMpIHtcbiAgLy8gR2V0IG9yIGNyZWF0ZSBhIGNoaWxkIGNvbnN0cnVjdG9yXG4gIHZhciBjaGlsZENvbnN0cnVjdG9yXG4gIGlmIChwcm90b3R5cGVQcm9wcyAmJiBvYmplY3QuaGFzT3duKHByb3RvdHlwZVByb3BzLCAnY29uc3RydWN0b3InKSkge1xuICAgIGNoaWxkQ29uc3RydWN0b3IgPSBwcm90b3R5cGVQcm9wcy5jb25zdHJ1Y3RvclxuICB9XG4gIGVsc2Uge1xuICAgIGNoaWxkQ29uc3RydWN0b3IgPSBmdW5jdGlvbigpIHtcbiAgICAgIHBhcmVudENvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICB9XG4gIH1cblxuICAvLyBCYXNlIGNvbnN0cnVjdG9ycyBzaG91bGQgb25seSBoYXZlIHRoZSBwcm9wZXJ0aWVzIHRoZXkncmUgZGVmaW5lZCB3aXRoXG4gIGlmIChwYXJlbnRDb25zdHJ1Y3RvciAhPT0gQ29uY3VyKSB7XG4gICAgLy8gSW5oZXJpdCB0aGUgcGFyZW50J3MgcHJvdG90eXBlXG4gICAgb2JqZWN0LmluaGVyaXRzKGNoaWxkQ29uc3RydWN0b3IsIHBhcmVudENvbnN0cnVjdG9yKVxuICAgIGNoaWxkQ29uc3RydWN0b3IuX19zdXBlcl9fID0gcGFyZW50Q29uc3RydWN0b3IucHJvdG90eXBlXG4gIH1cblxuICAvLyBBZGQgcHJvdG90eXBlIHByb3BlcnRpZXMsIGlmIGdpdmVuXG4gIGlmIChwcm90b3R5cGVQcm9wcykge1xuICAgIG9iamVjdC5leHRlbmQoY2hpbGRDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvdHlwZVByb3BzKVxuICB9XG5cbiAgLy8gQWRkIGNvbnN0cnVjdG9yIHByb3BlcnRpZXMsIGlmIGdpdmVuXG4gIGlmIChjb25zdHJ1Y3RvclByb3BzKSB7XG4gICAgb2JqZWN0LmV4dGVuZChjaGlsZENvbnN0cnVjdG9yLCBjb25zdHJ1Y3RvclByb3BzKVxuICB9XG5cbiAgcmV0dXJuIGNoaWxkQ29uc3RydWN0b3Jcbn1cblxuLyoqXG4gKiBOYW1lc3BhY2UgYW5kIGR1bW15IGNvbnN0cnVjdG9yIGZvciBpbml0aWFsIGV4dGVuc2lvbi5cbiAqL1xudmFyIENvbmN1ciA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7fVxuXG4vKipcbiAqIERldGFpbHMgb2YgYSBjb29uc3RydWN0b3IncyBpbmhlcml0YW5jZSBjaGFpbiAtIENvbmN1ciBqdXN0IGZhY2lsaXRhdGVzIHN1Z2FyXG4gKiBzbyB3ZSBkb24ndCBpbmNsdWRlIGl0IGluIHRoZSBpbml0aWFsIGNoYWluLiBBcmd1YWJseSwgT2JqZWN0LnByb3RvdHlwZSBjb3VsZFxuICogZ28gaGVyZSwgYnV0IGl0J3MganVzdCBub3QgdGhhdCBpbnRlcmVzdGluZy5cbiAqL1xuQ29uY3VyLl9fbXJvX18gPSBbXVxuXG4vKipcbiAqIENyZWF0ZXMgb3IgdXNlcyBhIGNoaWxkIGNvbnN0cnVjdG9yIHRvIGluaGVyaXQgZnJvbSB0aGUgdGhlIGNhbGxcbiAqIGNvbnRleHQsIHdoaWNoIGlzIGV4cGVjdGVkIHRvIGJlIGEgY29uc3RydWN0b3IuXG4gKi9cbkNvbmN1ci5leHRlbmQgPSBmdW5jdGlvbihwcm90b3R5cGVQcm9wcywgY29uc3RydWN0b3JQcm9wcykge1xuICAvLyBJZiB0aGUgY29uc3RydWN0b3IgYmVpbmcgaW5oZXJpdGVkIGZyb20gaGFzIGEgX19tZXRhX18gZnVuY3Rpb24gc29tZXdoZXJlXG4gIC8vIGluIGl0cyBwcm90b3R5cGUgY2hhaW4sIGNhbGwgaXQgdG8gY3VzdG9taXNlIHByb3RvdHlwZSBhbmQgY29uc3RydWN0b3JcbiAgLy8gcHJvcGVydGllcyBiZWZvcmUgdGhleSdyZSB1c2VkIHRvIHNldCB1cCB0aGUgbmV3IGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlLlxuICBpZiAodHlwZW9mIHRoaXMucHJvdG90eXBlLl9fbWV0YV9fICE9ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gUHJvcGVydHkgb2JqZWN0cyBtdXN0IGFsd2F5cyBleGlzdCBzbyBwcm9wZXJ0aWVzIGNhbiBiZSBhZGRlZCB0b1xuICAgIC8vIGFuZCByZW1vdmVkIGZyb20gdGhlbS5cbiAgICBwcm90b3R5cGVQcm9wcyA9IHByb3RvdHlwZVByb3BzIHx8IHt9XG4gICAgY29uc3RydWN0b3JQcm9wcyA9IGNvbnN0cnVjdG9yUHJvcHMgfHwge31cbiAgICB0aGlzLnByb3RvdHlwZS5fX21ldGFfXyhwcm90b3R5cGVQcm9wcywgY29uc3RydWN0b3JQcm9wcylcbiAgfVxuXG4gIC8vIElmIGFueSBtaXhpbnMgYXJlIHNwZWNpZmllZCwgbWl4IHRoZW0gaW50byB0aGUgcHJvcGVydHkgb2JqZWN0c1xuICBpZiAocHJvdG90eXBlUHJvcHMgJiYgb2JqZWN0Lmhhc093bihwcm90b3R5cGVQcm9wcywgJ19fbWl4aW5fXycpKSB7XG4gICAgcHJvdG90eXBlUHJvcHMgPSBhcHBseU1peGlucyhwcm90b3R5cGVQcm9wcylcbiAgfVxuICBpZiAoY29uc3RydWN0b3JQcm9wcyAmJiBvYmplY3QuaGFzT3duKGNvbnN0cnVjdG9yUHJvcHMsICdfX21peGluX18nKSkge1xuICAgIGNvbnN0cnVjdG9yUHJvcHMgPSBhcHBseU1peGlucyhjb25zdHJ1Y3RvclByb3BzKVxuICB9XG5cbiAgLy8gU2V0IHVwIHRoZSBuZXcgY2hpbGQgY29uc3RydWN0b3IgYW5kIGl0cyBwcm90b3R5cGVcbiAgdmFyIGNoaWxkQ29uc3RydWN0b3IgPSBpbmhlcml0RnJvbSh0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvdHlwZVByb3BzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yUHJvcHMpXG5cbiAgLy8gUGFzcyBvbiB0aGUgZXh0ZW5kIGZ1bmN0aW9uIGZvciBleHRlbnNpb24gaW4gdHVyblxuICBjaGlsZENvbnN0cnVjdG9yLmV4dGVuZCA9IHRoaXMuZXh0ZW5kXG5cbiAgLy8gRXhwb3NlIHRoZSBpbmhlcml0YW5jZSBjaGFpbiBmb3IgcHJvZ3JhbW1hdGljIGFjY2Vzc1xuICBjaGlsZENvbnN0cnVjdG9yLl9fbXJvX18gPSBbY2hpbGRDb25zdHJ1Y3Rvcl0uY29uY2F0KHRoaXMuX19tcm9fXylcblxuICByZXR1cm4gY2hpbGRDb25zdHJ1Y3RvclxufVxuIiwiLyohIGh0dHA6Ly9tdGhzLmJlL3B1bnljb2RlIHYxLjIuNCBieSBAbWF0aGlhcyAqL1xuOyhmdW5jdGlvbihyb290KSB7XG5cblx0LyoqIERldGVjdCBmcmVlIHZhcmlhYmxlcyAqL1xuXHR2YXIgZnJlZUV4cG9ydHMgPSB0eXBlb2YgZXhwb3J0cyA9PSAnb2JqZWN0JyAmJiBleHBvcnRzO1xuXHR2YXIgZnJlZU1vZHVsZSA9IHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlICYmXG5cdFx0bW9kdWxlLmV4cG9ydHMgPT0gZnJlZUV4cG9ydHMgJiYgbW9kdWxlO1xuXHR2YXIgZnJlZUdsb2JhbCA9IHR5cGVvZiBnbG9iYWwgPT0gJ29iamVjdCcgJiYgZ2xvYmFsO1xuXHRpZiAoZnJlZUdsb2JhbC5nbG9iYWwgPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbC53aW5kb3cgPT09IGZyZWVHbG9iYWwpIHtcblx0XHRyb290ID0gZnJlZUdsb2JhbDtcblx0fVxuXG5cdC8qKlxuXHQgKiBUaGUgYHB1bnljb2RlYCBvYmplY3QuXG5cdCAqIEBuYW1lIHB1bnljb2RlXG5cdCAqIEB0eXBlIE9iamVjdFxuXHQgKi9cblx0dmFyIHB1bnljb2RlLFxuXG5cdC8qKiBIaWdoZXN0IHBvc2l0aXZlIHNpZ25lZCAzMi1iaXQgZmxvYXQgdmFsdWUgKi9cblx0bWF4SW50ID0gMjE0NzQ4MzY0NywgLy8gYWthLiAweDdGRkZGRkZGIG9yIDJeMzEtMVxuXG5cdC8qKiBCb290c3RyaW5nIHBhcmFtZXRlcnMgKi9cblx0YmFzZSA9IDM2LFxuXHR0TWluID0gMSxcblx0dE1heCA9IDI2LFxuXHRza2V3ID0gMzgsXG5cdGRhbXAgPSA3MDAsXG5cdGluaXRpYWxCaWFzID0gNzIsXG5cdGluaXRpYWxOID0gMTI4LCAvLyAweDgwXG5cdGRlbGltaXRlciA9ICctJywgLy8gJ1xceDJEJ1xuXG5cdC8qKiBSZWd1bGFyIGV4cHJlc3Npb25zICovXG5cdHJlZ2V4UHVueWNvZGUgPSAvXnhuLS0vLFxuXHRyZWdleE5vbkFTQ0lJID0gL1teIC1+XS8sIC8vIHVucHJpbnRhYmxlIEFTQ0lJIGNoYXJzICsgbm9uLUFTQ0lJIGNoYXJzXG5cdHJlZ2V4U2VwYXJhdG9ycyA9IC9cXHgyRXxcXHUzMDAyfFxcdUZGMEV8XFx1RkY2MS9nLCAvLyBSRkMgMzQ5MCBzZXBhcmF0b3JzXG5cblx0LyoqIEVycm9yIG1lc3NhZ2VzICovXG5cdGVycm9ycyA9IHtcblx0XHQnb3ZlcmZsb3cnOiAnT3ZlcmZsb3c6IGlucHV0IG5lZWRzIHdpZGVyIGludGVnZXJzIHRvIHByb2Nlc3MnLFxuXHRcdCdub3QtYmFzaWMnOiAnSWxsZWdhbCBpbnB1dCA+PSAweDgwIChub3QgYSBiYXNpYyBjb2RlIHBvaW50KScsXG5cdFx0J2ludmFsaWQtaW5wdXQnOiAnSW52YWxpZCBpbnB1dCdcblx0fSxcblxuXHQvKiogQ29udmVuaWVuY2Ugc2hvcnRjdXRzICovXG5cdGJhc2VNaW51c1RNaW4gPSBiYXNlIC0gdE1pbixcblx0Zmxvb3IgPSBNYXRoLmZsb29yLFxuXHRzdHJpbmdGcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlLFxuXG5cdC8qKiBUZW1wb3JhcnkgdmFyaWFibGUgKi9cblx0a2V5O1xuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKlxuXHQgKiBBIGdlbmVyaWMgZXJyb3IgdXRpbGl0eSBmdW5jdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgVGhlIGVycm9yIHR5cGUuXG5cdCAqIEByZXR1cm5zIHtFcnJvcn0gVGhyb3dzIGEgYFJhbmdlRXJyb3JgIHdpdGggdGhlIGFwcGxpY2FibGUgZXJyb3IgbWVzc2FnZS5cblx0ICovXG5cdGZ1bmN0aW9uIGVycm9yKHR5cGUpIHtcblx0XHR0aHJvdyBSYW5nZUVycm9yKGVycm9yc1t0eXBlXSk7XG5cdH1cblxuXHQvKipcblx0ICogQSBnZW5lcmljIGBBcnJheSNtYXBgIHV0aWxpdHkgZnVuY3Rpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpdGVyYXRlIG92ZXIuXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGZvciBldmVyeSBhcnJheVxuXHQgKiBpdGVtLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IGFycmF5IG9mIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXAoYXJyYXksIGZuKSB7XG5cdFx0dmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblx0XHR3aGlsZSAobGVuZ3RoLS0pIHtcblx0XHRcdGFycmF5W2xlbmd0aF0gPSBmbihhcnJheVtsZW5ndGhdKTtcblx0XHR9XG5cdFx0cmV0dXJuIGFycmF5O1xuXHR9XG5cblx0LyoqXG5cdCAqIEEgc2ltcGxlIGBBcnJheSNtYXBgLWxpa2Ugd3JhcHBlciB0byB3b3JrIHdpdGggZG9tYWluIG5hbWUgc3RyaW5ncy5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgZG9tYWluIG5hbWUuXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGZvciBldmVyeVxuXHQgKiBjaGFyYWN0ZXIuXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgc3RyaW5nIG9mIGNoYXJhY3RlcnMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrXG5cdCAqIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZnVuY3Rpb24gbWFwRG9tYWluKHN0cmluZywgZm4pIHtcblx0XHRyZXR1cm4gbWFwKHN0cmluZy5zcGxpdChyZWdleFNlcGFyYXRvcnMpLCBmbikuam9pbignLicpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgbnVtZXJpYyBjb2RlIHBvaW50cyBvZiBlYWNoIFVuaWNvZGVcblx0ICogY2hhcmFjdGVyIGluIHRoZSBzdHJpbmcuIFdoaWxlIEphdmFTY3JpcHQgdXNlcyBVQ1MtMiBpbnRlcm5hbGx5LFxuXHQgKiB0aGlzIGZ1bmN0aW9uIHdpbGwgY29udmVydCBhIHBhaXIgb2Ygc3Vycm9nYXRlIGhhbHZlcyAoZWFjaCBvZiB3aGljaFxuXHQgKiBVQ1MtMiBleHBvc2VzIGFzIHNlcGFyYXRlIGNoYXJhY3RlcnMpIGludG8gYSBzaW5nbGUgY29kZSBwb2ludCxcblx0ICogbWF0Y2hpbmcgVVRGLTE2LlxuXHQgKiBAc2VlIGBwdW55Y29kZS51Y3MyLmVuY29kZWBcblx0ICogQHNlZSA8aHR0cDovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcblx0ICogQG5hbWUgZGVjb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgVGhlIFVuaWNvZGUgaW5wdXQgc3RyaW5nIChVQ1MtMikuXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gVGhlIG5ldyBhcnJheSBvZiBjb2RlIHBvaW50cy5cblx0ICovXG5cdGZ1bmN0aW9uIHVjczJkZWNvZGUoc3RyaW5nKSB7XG5cdFx0dmFyIG91dHB1dCA9IFtdLFxuXHRcdCAgICBjb3VudGVyID0gMCxcblx0XHQgICAgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aCxcblx0XHQgICAgdmFsdWUsXG5cdFx0ICAgIGV4dHJhO1xuXHRcdHdoaWxlIChjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0XHR2YWx1ZSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRpZiAodmFsdWUgPj0gMHhEODAwICYmIHZhbHVlIDw9IDB4REJGRiAmJiBjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0XHRcdC8vIGhpZ2ggc3Vycm9nYXRlLCBhbmQgdGhlcmUgaXMgYSBuZXh0IGNoYXJhY3RlclxuXHRcdFx0XHRleHRyYSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRcdGlmICgoZXh0cmEgJiAweEZDMDApID09IDB4REMwMCkgeyAvLyBsb3cgc3Vycm9nYXRlXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goKCh2YWx1ZSAmIDB4M0ZGKSA8PCAxMCkgKyAoZXh0cmEgJiAweDNGRikgKyAweDEwMDAwKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyB1bm1hdGNoZWQgc3Vycm9nYXRlOyBvbmx5IGFwcGVuZCB0aGlzIGNvZGUgdW5pdCwgaW4gY2FzZSB0aGUgbmV4dFxuXHRcdFx0XHRcdC8vIGNvZGUgdW5pdCBpcyB0aGUgaGlnaCBzdXJyb2dhdGUgb2YgYSBzdXJyb2dhdGUgcGFpclxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHRcdFx0XHRjb3VudGVyLS07XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgc3RyaW5nIGJhc2VkIG9uIGFuIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZGVjb2RlYFxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuXHQgKiBAbmFtZSBlbmNvZGVcblx0ICogQHBhcmFtIHtBcnJheX0gY29kZVBvaW50cyBUaGUgYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIG5ldyBVbmljb2RlIHN0cmluZyAoVUNTLTIpLlxuXHQgKi9cblx0ZnVuY3Rpb24gdWNzMmVuY29kZShhcnJheSkge1xuXHRcdHJldHVybiBtYXAoYXJyYXksIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHR2YXIgb3V0cHV0ID0gJyc7XG5cdFx0XHRpZiAodmFsdWUgPiAweEZGRkYpIHtcblx0XHRcdFx0dmFsdWUgLT0gMHgxMDAwMDtcblx0XHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMCk7XG5cdFx0XHRcdHZhbHVlID0gMHhEQzAwIHwgdmFsdWUgJiAweDNGRjtcblx0XHRcdH1cblx0XHRcdG91dHB1dCArPSBzdHJpbmdGcm9tQ2hhckNvZGUodmFsdWUpO1xuXHRcdFx0cmV0dXJuIG91dHB1dDtcblx0XHR9KS5qb2luKCcnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIGJhc2ljIGNvZGUgcG9pbnQgaW50byBhIGRpZ2l0L2ludGVnZXIuXG5cdCAqIEBzZWUgYGRpZ2l0VG9CYXNpYygpYFxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0gY29kZVBvaW50IFRoZSBiYXNpYyBudW1lcmljIGNvZGUgcG9pbnQgdmFsdWUuXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludCAoZm9yIHVzZSBpblxuXHQgKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGluIHRoZSByYW5nZSBgMGAgdG8gYGJhc2UgLSAxYCwgb3IgYGJhc2VgIGlmXG5cdCAqIHRoZSBjb2RlIHBvaW50IGRvZXMgbm90IHJlcHJlc2VudCBhIHZhbHVlLlxuXHQgKi9cblx0ZnVuY3Rpb24gYmFzaWNUb0RpZ2l0KGNvZGVQb2ludCkge1xuXHRcdGlmIChjb2RlUG9pbnQgLSA0OCA8IDEwKSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gMjI7XG5cdFx0fVxuXHRcdGlmIChjb2RlUG9pbnQgLSA2NSA8IDI2KSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gNjU7XG5cdFx0fVxuXHRcdGlmIChjb2RlUG9pbnQgLSA5NyA8IDI2KSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gOTc7XG5cdFx0fVxuXHRcdHJldHVybiBiYXNlO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgZGlnaXQvaW50ZWdlciBpbnRvIGEgYmFzaWMgY29kZSBwb2ludC5cblx0ICogQHNlZSBgYmFzaWNUb0RpZ2l0KClgXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBkaWdpdCBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQuXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBiYXNpYyBjb2RlIHBvaW50IHdob3NlIHZhbHVlICh3aGVuIHVzZWQgZm9yXG5cdCAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaXMgYGRpZ2l0YCwgd2hpY2ggbmVlZHMgdG8gYmUgaW4gdGhlIHJhbmdlXG5cdCAqIGAwYCB0byBgYmFzZSAtIDFgLiBJZiBgZmxhZ2AgaXMgbm9uLXplcm8sIHRoZSB1cHBlcmNhc2UgZm9ybSBpc1xuXHQgKiB1c2VkOyBlbHNlLCB0aGUgbG93ZXJjYXNlIGZvcm0gaXMgdXNlZC4gVGhlIGJlaGF2aW9yIGlzIHVuZGVmaW5lZFxuXHQgKiBpZiBgZmxhZ2AgaXMgbm9uLXplcm8gYW5kIGBkaWdpdGAgaGFzIG5vIHVwcGVyY2FzZSBmb3JtLlxuXHQgKi9cblx0ZnVuY3Rpb24gZGlnaXRUb0Jhc2ljKGRpZ2l0LCBmbGFnKSB7XG5cdFx0Ly8gIDAuLjI1IG1hcCB0byBBU0NJSSBhLi56IG9yIEEuLlpcblx0XHQvLyAyNi4uMzUgbWFwIHRvIEFTQ0lJIDAuLjlcblx0XHRyZXR1cm4gZGlnaXQgKyAyMiArIDc1ICogKGRpZ2l0IDwgMjYpIC0gKChmbGFnICE9IDApIDw8IDUpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEJpYXMgYWRhcHRhdGlvbiBmdW5jdGlvbiBhcyBwZXIgc2VjdGlvbiAzLjQgb2YgUkZDIDM0OTIuXG5cdCAqIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM0OTIjc2VjdGlvbi0zLjRcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGZ1bmN0aW9uIGFkYXB0KGRlbHRhLCBudW1Qb2ludHMsIGZpcnN0VGltZSkge1xuXHRcdHZhciBrID0gMDtcblx0XHRkZWx0YSA9IGZpcnN0VGltZSA/IGZsb29yKGRlbHRhIC8gZGFtcCkgOiBkZWx0YSA+PiAxO1xuXHRcdGRlbHRhICs9IGZsb29yKGRlbHRhIC8gbnVtUG9pbnRzKTtcblx0XHRmb3IgKC8qIG5vIGluaXRpYWxpemF0aW9uICovOyBkZWx0YSA+IGJhc2VNaW51c1RNaW4gKiB0TWF4ID4+IDE7IGsgKz0gYmFzZSkge1xuXHRcdFx0ZGVsdGEgPSBmbG9vcihkZWx0YSAvIGJhc2VNaW51c1RNaW4pO1xuXHRcdH1cblx0XHRyZXR1cm4gZmxvb3IoayArIChiYXNlTWludXNUTWluICsgMSkgKiBkZWx0YSAvIChkZWx0YSArIHNrZXcpKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMgdG8gYSBzdHJpbmcgb2YgVW5pY29kZVxuXHQgKiBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBkZWNvZGUoaW5wdXQpIHtcblx0XHQvLyBEb24ndCB1c2UgVUNTLTJcblx0XHR2YXIgb3V0cHV0ID0gW10sXG5cdFx0ICAgIGlucHV0TGVuZ3RoID0gaW5wdXQubGVuZ3RoLFxuXHRcdCAgICBvdXQsXG5cdFx0ICAgIGkgPSAwLFxuXHRcdCAgICBuID0gaW5pdGlhbE4sXG5cdFx0ICAgIGJpYXMgPSBpbml0aWFsQmlhcyxcblx0XHQgICAgYmFzaWMsXG5cdFx0ICAgIGosXG5cdFx0ICAgIGluZGV4LFxuXHRcdCAgICBvbGRpLFxuXHRcdCAgICB3LFxuXHRcdCAgICBrLFxuXHRcdCAgICBkaWdpdCxcblx0XHQgICAgdCxcblx0XHQgICAgLyoqIENhY2hlZCBjYWxjdWxhdGlvbiByZXN1bHRzICovXG5cdFx0ICAgIGJhc2VNaW51c1Q7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzOiBsZXQgYGJhc2ljYCBiZSB0aGUgbnVtYmVyIG9mIGlucHV0IGNvZGVcblx0XHQvLyBwb2ludHMgYmVmb3JlIHRoZSBsYXN0IGRlbGltaXRlciwgb3IgYDBgIGlmIHRoZXJlIGlzIG5vbmUsIHRoZW4gY29weVxuXHRcdC8vIHRoZSBmaXJzdCBiYXNpYyBjb2RlIHBvaW50cyB0byB0aGUgb3V0cHV0LlxuXG5cdFx0YmFzaWMgPSBpbnB1dC5sYXN0SW5kZXhPZihkZWxpbWl0ZXIpO1xuXHRcdGlmIChiYXNpYyA8IDApIHtcblx0XHRcdGJhc2ljID0gMDtcblx0XHR9XG5cblx0XHRmb3IgKGogPSAwOyBqIDwgYmFzaWM7ICsraikge1xuXHRcdFx0Ly8gaWYgaXQncyBub3QgYSBiYXNpYyBjb2RlIHBvaW50XG5cdFx0XHRpZiAoaW5wdXQuY2hhckNvZGVBdChqKSA+PSAweDgwKSB7XG5cdFx0XHRcdGVycm9yKCdub3QtYmFzaWMnKTtcblx0XHRcdH1cblx0XHRcdG91dHB1dC5wdXNoKGlucHV0LmNoYXJDb2RlQXQoaikpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZGVjb2RpbmcgbG9vcDogc3RhcnQganVzdCBhZnRlciB0aGUgbGFzdCBkZWxpbWl0ZXIgaWYgYW55IGJhc2ljIGNvZGVcblx0XHQvLyBwb2ludHMgd2VyZSBjb3BpZWQ7IHN0YXJ0IGF0IHRoZSBiZWdpbm5pbmcgb3RoZXJ3aXNlLlxuXG5cdFx0Zm9yIChpbmRleCA9IGJhc2ljID4gMCA/IGJhc2ljICsgMSA6IDA7IGluZGV4IDwgaW5wdXRMZW5ndGg7IC8qIG5vIGZpbmFsIGV4cHJlc3Npb24gKi8pIHtcblxuXHRcdFx0Ly8gYGluZGV4YCBpcyB0aGUgaW5kZXggb2YgdGhlIG5leHQgY2hhcmFjdGVyIHRvIGJlIGNvbnN1bWVkLlxuXHRcdFx0Ly8gRGVjb2RlIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXIgaW50byBgZGVsdGFgLFxuXHRcdFx0Ly8gd2hpY2ggZ2V0cyBhZGRlZCB0byBgaWAuIFRoZSBvdmVyZmxvdyBjaGVja2luZyBpcyBlYXNpZXJcblx0XHRcdC8vIGlmIHdlIGluY3JlYXNlIGBpYCBhcyB3ZSBnbywgdGhlbiBzdWJ0cmFjdCBvZmYgaXRzIHN0YXJ0aW5nXG5cdFx0XHQvLyB2YWx1ZSBhdCB0aGUgZW5kIHRvIG9idGFpbiBgZGVsdGFgLlxuXHRcdFx0Zm9yIChvbGRpID0gaSwgdyA9IDEsIGsgPSBiYXNlOyAvKiBubyBjb25kaXRpb24gKi87IGsgKz0gYmFzZSkge1xuXG5cdFx0XHRcdGlmIChpbmRleCA+PSBpbnB1dExlbmd0aCkge1xuXHRcdFx0XHRcdGVycm9yKCdpbnZhbGlkLWlucHV0Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkaWdpdCA9IGJhc2ljVG9EaWdpdChpbnB1dC5jaGFyQ29kZUF0KGluZGV4KyspKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPj0gYmFzZSB8fCBkaWdpdCA+IGZsb29yKChtYXhJbnQgLSBpKSAvIHcpKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpICs9IGRpZ2l0ICogdztcblx0XHRcdFx0dCA9IGsgPD0gYmlhcyA/IHRNaW4gOiAoayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcyk7XG5cblx0XHRcdFx0aWYgKGRpZ2l0IDwgdCkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YmFzZU1pbnVzVCA9IGJhc2UgLSB0O1xuXHRcdFx0XHRpZiAodyA+IGZsb29yKG1heEludCAvIGJhc2VNaW51c1QpKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR3ICo9IGJhc2VNaW51c1Q7XG5cblx0XHRcdH1cblxuXHRcdFx0b3V0ID0gb3V0cHV0Lmxlbmd0aCArIDE7XG5cdFx0XHRiaWFzID0gYWRhcHQoaSAtIG9sZGksIG91dCwgb2xkaSA9PSAwKTtcblxuXHRcdFx0Ly8gYGlgIHdhcyBzdXBwb3NlZCB0byB3cmFwIGFyb3VuZCBmcm9tIGBvdXRgIHRvIGAwYCxcblx0XHRcdC8vIGluY3JlbWVudGluZyBgbmAgZWFjaCB0aW1lLCBzbyB3ZSdsbCBmaXggdGhhdCBub3c6XG5cdFx0XHRpZiAoZmxvb3IoaSAvIG91dCkgPiBtYXhJbnQgLSBuKSB7XG5cdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRuICs9IGZsb29yKGkgLyBvdXQpO1xuXHRcdFx0aSAlPSBvdXQ7XG5cblx0XHRcdC8vIEluc2VydCBgbmAgYXQgcG9zaXRpb24gYGlgIG9mIHRoZSBvdXRwdXRcblx0XHRcdG91dHB1dC5zcGxpY2UoaSsrLCAwLCBuKTtcblxuXHRcdH1cblxuXHRcdHJldHVybiB1Y3MyZW5jb2RlKG91dHB1dCk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzIHRvIGEgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHlcblx0ICogc3ltYm9scy5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuXHQgKi9cblx0ZnVuY3Rpb24gZW5jb2RlKGlucHV0KSB7XG5cdFx0dmFyIG4sXG5cdFx0ICAgIGRlbHRhLFxuXHRcdCAgICBoYW5kbGVkQ1BDb3VudCxcblx0XHQgICAgYmFzaWNMZW5ndGgsXG5cdFx0ICAgIGJpYXMsXG5cdFx0ICAgIGosXG5cdFx0ICAgIG0sXG5cdFx0ICAgIHEsXG5cdFx0ICAgIGssXG5cdFx0ICAgIHQsXG5cdFx0ICAgIGN1cnJlbnRWYWx1ZSxcblx0XHQgICAgb3V0cHV0ID0gW10sXG5cdFx0ICAgIC8qKiBgaW5wdXRMZW5ndGhgIHdpbGwgaG9sZCB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIGluIGBpbnB1dGAuICovXG5cdFx0ICAgIGlucHV0TGVuZ3RoLFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgaGFuZGxlZENQQ291bnRQbHVzT25lLFxuXHRcdCAgICBiYXNlTWludXNULFxuXHRcdCAgICBxTWludXNUO1xuXG5cdFx0Ly8gQ29udmVydCB0aGUgaW5wdXQgaW4gVUNTLTIgdG8gVW5pY29kZVxuXHRcdGlucHV0ID0gdWNzMmRlY29kZShpbnB1dCk7XG5cblx0XHQvLyBDYWNoZSB0aGUgbGVuZ3RoXG5cdFx0aW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGg7XG5cblx0XHQvLyBJbml0aWFsaXplIHRoZSBzdGF0ZVxuXHRcdG4gPSBpbml0aWFsTjtcblx0XHRkZWx0YSA9IDA7XG5cdFx0YmlhcyA9IGluaXRpYWxCaWFzO1xuXG5cdFx0Ly8gSGFuZGxlIHRoZSBiYXNpYyBjb2RlIHBvaW50c1xuXHRcdGZvciAoaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblx0XHRcdGlmIChjdXJyZW50VmFsdWUgPCAweDgwKSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShjdXJyZW50VmFsdWUpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRoYW5kbGVkQ1BDb3VudCA9IGJhc2ljTGVuZ3RoID0gb3V0cHV0Lmxlbmd0aDtcblxuXHRcdC8vIGBoYW5kbGVkQ1BDb3VudGAgaXMgdGhlIG51bWJlciBvZiBjb2RlIHBvaW50cyB0aGF0IGhhdmUgYmVlbiBoYW5kbGVkO1xuXHRcdC8vIGBiYXNpY0xlbmd0aGAgaXMgdGhlIG51bWJlciBvZiBiYXNpYyBjb2RlIHBvaW50cy5cblxuXHRcdC8vIEZpbmlzaCB0aGUgYmFzaWMgc3RyaW5nIC0gaWYgaXQgaXMgbm90IGVtcHR5IC0gd2l0aCBhIGRlbGltaXRlclxuXHRcdGlmIChiYXNpY0xlbmd0aCkge1xuXHRcdFx0b3V0cHV0LnB1c2goZGVsaW1pdGVyKTtcblx0XHR9XG5cblx0XHQvLyBNYWluIGVuY29kaW5nIGxvb3A6XG5cdFx0d2hpbGUgKGhhbmRsZWRDUENvdW50IDwgaW5wdXRMZW5ndGgpIHtcblxuXHRcdFx0Ly8gQWxsIG5vbi1iYXNpYyBjb2RlIHBvaW50cyA8IG4gaGF2ZSBiZWVuIGhhbmRsZWQgYWxyZWFkeS4gRmluZCB0aGUgbmV4dFxuXHRcdFx0Ly8gbGFyZ2VyIG9uZTpcblx0XHRcdGZvciAobSA9IG1heEludCwgaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlID49IG4gJiYgY3VycmVudFZhbHVlIDwgbSkge1xuXHRcdFx0XHRcdG0gPSBjdXJyZW50VmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gSW5jcmVhc2UgYGRlbHRhYCBlbm91Z2ggdG8gYWR2YW5jZSB0aGUgZGVjb2RlcidzIDxuLGk+IHN0YXRlIHRvIDxtLDA+LFxuXHRcdFx0Ly8gYnV0IGd1YXJkIGFnYWluc3Qgb3ZlcmZsb3dcblx0XHRcdGhhbmRsZWRDUENvdW50UGx1c09uZSA9IGhhbmRsZWRDUENvdW50ICsgMTtcblx0XHRcdGlmIChtIC0gbiA+IGZsb29yKChtYXhJbnQgLSBkZWx0YSkgLyBoYW5kbGVkQ1BDb3VudFBsdXNPbmUpKSB7XG5cdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRkZWx0YSArPSAobSAtIG4pICogaGFuZGxlZENQQ291bnRQbHVzT25lO1xuXHRcdFx0biA9IG07XG5cblx0XHRcdGZvciAoaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPCBuICYmICsrZGVsdGEgPiBtYXhJbnQpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPT0gbikge1xuXHRcdFx0XHRcdC8vIFJlcHJlc2VudCBkZWx0YSBhcyBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyXG5cdFx0XHRcdFx0Zm9yIChxID0gZGVsdGEsIGsgPSBiYXNlOyAvKiBubyBjb25kaXRpb24gKi87IGsgKz0gYmFzZSkge1xuXHRcdFx0XHRcdFx0dCA9IGsgPD0gYmlhcyA/IHRNaW4gOiAoayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcyk7XG5cdFx0XHRcdFx0XHRpZiAocSA8IHQpIHtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRxTWludXNUID0gcSAtIHQ7XG5cdFx0XHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdFx0XHRvdXRwdXQucHVzaChcblx0XHRcdFx0XHRcdFx0c3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyh0ICsgcU1pbnVzVCAlIGJhc2VNaW51c1QsIDApKVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdHEgPSBmbG9vcihxTWludXNUIC8gYmFzZU1pbnVzVCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyhxLCAwKSkpO1xuXHRcdFx0XHRcdGJpYXMgPSBhZGFwdChkZWx0YSwgaGFuZGxlZENQQ291bnRQbHVzT25lLCBoYW5kbGVkQ1BDb3VudCA9PSBiYXNpY0xlbmd0aCk7XG5cdFx0XHRcdFx0ZGVsdGEgPSAwO1xuXHRcdFx0XHRcdCsraGFuZGxlZENQQ291bnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0KytkZWx0YTtcblx0XHRcdCsrbjtcblxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0LmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIHRvIFVuaWNvZGUuIE9ubHkgdGhlXG5cdCAqIFB1bnljb2RlZCBwYXJ0cyBvZiB0aGUgZG9tYWluIG5hbWUgd2lsbCBiZSBjb252ZXJ0ZWQsIGkuZS4gaXQgZG9lc24ndFxuXHQgKiBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgb24gYSBzdHJpbmcgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGNvbnZlcnRlZCB0b1xuXHQgKiBVbmljb2RlLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgUHVueWNvZGUgZG9tYWluIG5hbWUgdG8gY29udmVydCB0byBVbmljb2RlLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgVW5pY29kZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZ2l2ZW4gUHVueWNvZGVcblx0ICogc3RyaW5nLlxuXHQgKi9cblx0ZnVuY3Rpb24gdG9Vbmljb2RlKGRvbWFpbikge1xuXHRcdHJldHVybiBtYXBEb21haW4oZG9tYWluLCBmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiByZWdleFB1bnljb2RlLnRlc3Qoc3RyaW5nKVxuXHRcdFx0XHQ/IGRlY29kZShzdHJpbmcuc2xpY2UoNCkudG9Mb3dlckNhc2UoKSlcblx0XHRcdFx0OiBzdHJpbmc7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBVbmljb2RlIHN0cmluZyByZXByZXNlbnRpbmcgYSBkb21haW4gbmFtZSB0byBQdW55Y29kZS4gT25seSB0aGVcblx0ICogbm9uLUFTQ0lJIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLiBpdCBkb2Vzbid0XG5cdCAqIG1hdHRlciBpZiB5b3UgY2FsbCBpdCB3aXRoIGEgZG9tYWluIHRoYXQncyBhbHJlYWR5IGluIEFTQ0lJLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgZG9tYWluIG5hbWUgdG8gY29udmVydCwgYXMgYSBVbmljb2RlIHN0cmluZy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIFB1bnljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBkb21haW4gbmFtZS5cblx0ICovXG5cdGZ1bmN0aW9uIHRvQVNDSUkoZG9tYWluKSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihkb21haW4sIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4Tm9uQVNDSUkudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gJ3huLS0nICsgZW5jb2RlKHN0cmluZylcblx0XHRcdFx0OiBzdHJpbmc7XG5cdFx0fSk7XG5cdH1cblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHQvKiogRGVmaW5lIHRoZSBwdWJsaWMgQVBJICovXG5cdHB1bnljb2RlID0ge1xuXHRcdC8qKlxuXHRcdCAqIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgY3VycmVudCBQdW55Y29kZS5qcyB2ZXJzaW9uIG51bWJlci5cblx0XHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0XHQgKiBAdHlwZSBTdHJpbmdcblx0XHQgKi9cblx0XHQndmVyc2lvbic6ICcxLjIuNCcsXG5cdFx0LyoqXG5cdFx0ICogQW4gb2JqZWN0IG9mIG1ldGhvZHMgdG8gY29udmVydCBmcm9tIEphdmFTY3JpcHQncyBpbnRlcm5hbCBjaGFyYWN0ZXJcblx0XHQgKiByZXByZXNlbnRhdGlvbiAoVUNTLTIpIHRvIFVuaWNvZGUgY29kZSBwb2ludHMsIGFuZCBiYWNrLlxuXHRcdCAqIEBzZWUgPGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG5cdFx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdFx0ICogQHR5cGUgT2JqZWN0XG5cdFx0ICovXG5cdFx0J3VjczInOiB7XG5cdFx0XHQnZGVjb2RlJzogdWNzMmRlY29kZSxcblx0XHRcdCdlbmNvZGUnOiB1Y3MyZW5jb2RlXG5cdFx0fSxcblx0XHQnZGVjb2RlJzogZGVjb2RlLFxuXHRcdCdlbmNvZGUnOiBlbmNvZGUsXG5cdFx0J3RvQVNDSUknOiB0b0FTQ0lJLFxuXHRcdCd0b1VuaWNvZGUnOiB0b1VuaWNvZGVcblx0fTtcblxuXHQvKiogRXhwb3NlIGBwdW55Y29kZWAgKi9cblx0Ly8gU29tZSBBTUQgYnVpbGQgb3B0aW1pemVycywgbGlrZSByLmpzLCBjaGVjayBmb3Igc3BlY2lmaWMgY29uZGl0aW9uIHBhdHRlcm5zXG5cdC8vIGxpa2UgdGhlIGZvbGxvd2luZzpcblx0aWYgKFxuXHRcdHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJlxuXHRcdHR5cGVvZiBkZWZpbmUuYW1kID09ICdvYmplY3QnICYmXG5cdFx0ZGVmaW5lLmFtZFxuXHQpIHtcblx0XHRkZWZpbmUoJ3B1bnljb2RlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcHVueWNvZGU7XG5cdFx0fSk7XG5cdH0gZWxzZSBpZiAoZnJlZUV4cG9ydHMgJiYgIWZyZWVFeHBvcnRzLm5vZGVUeXBlKSB7XG5cdFx0aWYgKGZyZWVNb2R1bGUpIHsgLy8gaW4gTm9kZS5qcyBvciBSaW5nb0pTIHYwLjguMCtcblx0XHRcdGZyZWVNb2R1bGUuZXhwb3J0cyA9IHB1bnljb2RlO1xuXHRcdH0gZWxzZSB7IC8vIGluIE5hcndoYWwgb3IgUmluZ29KUyB2MC43LjAtXG5cdFx0XHRmb3IgKGtleSBpbiBwdW55Y29kZSkge1xuXHRcdFx0XHRwdW55Y29kZS5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIChmcmVlRXhwb3J0c1trZXldID0gcHVueWNvZGVba2V5XSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2UgeyAvLyBpbiBSaGlubyBvciBhIHdlYiBicm93c2VyXG5cdFx0cm9vdC5wdW55Y29kZSA9IHB1bnljb2RlO1xuXHR9XG5cbn0odGhpcykpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaXMgPSByZXF1aXJlKCcuL2lzJylcblxuLyogVGhpcyBmaWxlIGlzIHBhcnQgb2YgT1dMIEphdmFTY3JpcHQgVXRpbGl0aWVzLlxuXG5PV0wgSmF2YVNjcmlwdCBVdGlsaXRpZXMgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yXG5tb2RpZnkgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbmFzIHB1Ymxpc2hlZCBieSB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mXG50aGUgTGljZW5zZSwgb3IgKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cblxuT1dMIEphdmFTY3JpcHQgVXRpbGl0aWVzIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG5idXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG5cbllvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWNcbkxpY2Vuc2UgYWxvbmcgd2l0aCBPV0wgSmF2YVNjcmlwdCBVdGlsaXRpZXMuICBJZiBub3QsIHNlZVxuPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuKi9cblxuLy8gUmUtdXNhYmxlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHVzZWQgYnkgY2xvbmUoKVxuZnVuY3Rpb24gQ2xvbmUoKSB7fVxuXG4vLyBDbG9uZSBvYmplY3RzLCBza2lwIG90aGVyIHR5cGVzXG5mdW5jdGlvbiBjbG9uZSh0YXJnZXQpIHtcbiAgaWYgKHR5cGVvZiB0YXJnZXQgPT0gJ29iamVjdCcpIHtcbiAgICBDbG9uZS5wcm90b3R5cGUgPSB0YXJnZXRcbiAgICByZXR1cm4gbmV3IENsb25lKClcbiAgfVxuICBlbHNlIHtcbiAgICByZXR1cm4gdGFyZ2V0XG4gIH1cbn1cblxuLy8gU2hhbGxvdyBDb3B5XG5mdW5jdGlvbiBjb3B5KHRhcmdldCkge1xuICBpZiAodHlwZW9mIHRhcmdldCAhPSAnb2JqZWN0Jykge1xuICAgIC8vIE5vbi1vYmplY3RzIGhhdmUgdmFsdWUgc2VtYW50aWNzLCBzbyB0YXJnZXQgaXMgYWxyZWFkeSBhIGNvcHlcbiAgICByZXR1cm4gdGFyZ2V0XG4gIH1cbiAgZWxzZSB7XG4gICAgdmFyIHZhbHVlID0gdGFyZ2V0LnZhbHVlT2YoKVxuICAgIGlmICh0YXJnZXQgIT0gdmFsdWUpIHtcbiAgICAgIC8vIHRoZSBvYmplY3QgaXMgYSBzdGFuZGFyZCBvYmplY3Qgd3JhcHBlciBmb3IgYSBuYXRpdmUgdHlwZSwgc2F5IFN0cmluZy5cbiAgICAgIC8vIHdlIGNhbiBtYWtlIGEgY29weSBieSBpbnN0YW50aWF0aW5nIGEgbmV3IG9iamVjdCBhcm91bmQgdGhlIHZhbHVlLlxuICAgICAgcmV0dXJuIG5ldyB0YXJnZXQuY29uc3RydWN0b3IodmFsdWUpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFyIGMsIHByb3BlcnR5XG4gICAgICAvLyBXZSBoYXZlIGEgbm9ybWFsIG9iamVjdC4gSWYgcG9zc2libGUsIHdlJ2xsIGNsb25lIHRoZSBvcmlnaW5hbCdzXG4gICAgICAvLyBwcm90b3R5cGUgKG5vdCB0aGUgb3JpZ2luYWwpIHRvIGdldCBhbiBlbXB0eSBvYmplY3Qgd2l0aCB0aGUgc2FtZVxuICAgICAgLy8gcHJvdG90eXBlIGNoYWluIGFzIHRoZSBvcmlnaW5hbC4gSWYganVzdCBjb3B5IHRoZSBpbnN0YW5jZSBwcm9wZXJ0aWVzLlxuICAgICAgLy8gT3RoZXJ3aXNlLCB3ZSBoYXZlIHRvIGNvcHkgdGhlIHdob2xlIHRoaW5nLCBwcm9wZXJ0eS1ieS1wcm9wZXJ0eS5cbiAgICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiB0YXJnZXQuY29uc3RydWN0b3IgJiYgdGFyZ2V0LmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcbiAgICAgICAgYyA9IGNsb25lKHRhcmdldC5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpXG5cbiAgICAgICAgLy8gR2l2ZSB0aGUgY29weSBhbGwgdGhlIGluc3RhbmNlIHByb3BlcnRpZXMgb2YgdGFyZ2V0LiBJdCBoYXMgdGhlIHNhbWVcbiAgICAgICAgLy8gcHJvdG90eXBlIGFzIHRhcmdldCwgc28gaW5oZXJpdGVkIHByb3BlcnRpZXMgYXJlIGFscmVhZHkgdGhlcmUuXG4gICAgICAgIGZvciAocHJvcGVydHkgaW4gdGFyZ2V0KSB7XG4gICAgICAgICAgaWYgKHRhcmdldC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgIGNbcHJvcGVydHldID0gdGFyZ2V0W3Byb3BlcnR5XVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGMgPSB7fVxuICAgICAgICBmb3IgKHByb3BlcnR5IGluIHRhcmdldCkge1xuICAgICAgICAgIGNbcHJvcGVydHldID0gdGFyZ2V0W3Byb3BlcnR5XVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjXG4gICAgfVxuICB9XG59XG5cbi8vIERlZXAgQ29weVxudmFyIGRlZXBDb3BpZXJzID0gW11cblxuZnVuY3Rpb24gRGVlcENvcGllcihjb25maWcpIHtcbiAgZm9yICh2YXIga2V5IGluIGNvbmZpZykge1xuICAgIHRoaXNba2V5XSA9IGNvbmZpZ1trZXldXG4gIH1cbn1cblxuRGVlcENvcGllci5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBEZWVwQ29waWVyXG5cbiAgLy8gRGV0ZXJtaW5lcyBpZiB0aGlzIERlZXBDb3BpZXIgY2FuIGhhbmRsZSB0aGUgZ2l2ZW4gb2JqZWN0LlxuLCBjYW5Db3B5OiBmdW5jdGlvbihzb3VyY2UpIHsgcmV0dXJuIGZhbHNlIH1cblxuICAvLyBTdGFydHMgdGhlIGRlZXAgY29weWluZyBwcm9jZXNzIGJ5IGNyZWF0aW5nIHRoZSBjb3B5IG9iamVjdC4gWW91IGNhblxuICAvLyBpbml0aWFsaXplIGFueSBwcm9wZXJ0aWVzIHlvdSB3YW50LCBidXQgeW91IGNhbid0IGNhbGwgcmVjdXJzaXZlbHkgaW50byB0aGVcbiAgLy8gRGVlcENvcHlBbGdvcml0aG0uXG4sIGNyZWF0ZTogZnVuY3Rpb24oc291cmNlKSB7fVxuXG4gIC8vIENvbXBsZXRlcyB0aGUgZGVlcCBjb3B5IG9mIHRoZSBzb3VyY2Ugb2JqZWN0IGJ5IHBvcHVsYXRpbmcgYW55IHByb3BlcnRpZXNcbiAgLy8gdGhhdCBuZWVkIHRvIGJlIHJlY3Vyc2l2ZWx5IGRlZXAgY29waWVkLiBZb3UgY2FuIGRvIHRoaXMgYnkgdXNpbmcgdGhlXG4gIC8vIHByb3ZpZGVkIGRlZXBDb3B5QWxnb3JpdGhtIGluc3RhbmNlJ3MgZGVlcENvcHkoKSBtZXRob2QuIFRoaXMgd2lsbCBoYW5kbGVcbiAgLy8gY3ljbGljIHJlZmVyZW5jZXMgZm9yIG9iamVjdHMgYWxyZWFkeSBkZWVwQ29waWVkLCBpbmNsdWRpbmcgdGhlIHNvdXJjZVxuICAvLyBvYmplY3QgaXRzZWxmLiBUaGUgXCJyZXN1bHRcIiBwYXNzZWQgaW4gaXMgdGhlIG9iamVjdCByZXR1cm5lZCBmcm9tIGNyZWF0ZSgpLlxuLCBwb3B1bGF0ZTogZnVuY3Rpb24oZGVlcENvcHlBbGdvcml0aG0sIHNvdXJjZSwgcmVzdWx0KSB7fVxufVxuXG5mdW5jdGlvbiBEZWVwQ29weUFsZ29yaXRobSgpIHtcbiAgLy8gY29waWVkT2JqZWN0cyBrZWVwcyB0cmFjayBvZiBvYmplY3RzIGFscmVhZHkgY29waWVkIGJ5IHRoaXMgZGVlcENvcHlcbiAgLy8gb3BlcmF0aW9uLCBzbyB3ZSBjYW4gY29ycmVjdGx5IGhhbmRsZSBjeWNsaWMgcmVmZXJlbmNlcy5cbiAgdGhpcy5jb3BpZWRPYmplY3RzID0gW11cbiAgdmFyIHRoaXNQYXNzID0gdGhpc1xuICB0aGlzLnJlY3Vyc2l2ZURlZXBDb3B5ID0gZnVuY3Rpb24oc291cmNlKSB7XG4gICAgcmV0dXJuIHRoaXNQYXNzLmRlZXBDb3B5KHNvdXJjZSlcbiAgfVxuICB0aGlzLmRlcHRoID0gMFxufVxuRGVlcENvcHlBbGdvcml0aG0ucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogRGVlcENvcHlBbGdvcml0aG1cblxuLCBtYXhEZXB0aDogMjU2XG5cbiAgLy8gQWRkIGFuIG9iamVjdCB0byB0aGUgY2FjaGUuICBObyBhdHRlbXB0IGlzIG1hZGUgdG8gZmlsdGVyIGR1cGxpY2F0ZXM7IHdlXG4gIC8vIGFsd2F5cyBjaGVjayBnZXRDYWNoZWRSZXN1bHQoKSBiZWZvcmUgY2FsbGluZyBpdC5cbiwgY2FjaGVSZXN1bHQ6IGZ1bmN0aW9uKHNvdXJjZSwgcmVzdWx0KSB7XG4gICAgdGhpcy5jb3BpZWRPYmplY3RzLnB1c2goW3NvdXJjZSwgcmVzdWx0XSlcbiAgfVxuXG4gIC8vIFJldHVybnMgdGhlIGNhY2hlZCBjb3B5IG9mIGEgZ2l2ZW4gb2JqZWN0LCBvciB1bmRlZmluZWQgaWYgaXQncyBhbiBvYmplY3RcbiAgLy8gd2UgaGF2ZW4ndCBzZWVuIGJlZm9yZS5cbiwgZ2V0Q2FjaGVkUmVzdWx0OiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICB2YXIgY29waWVkT2JqZWN0cyA9IHRoaXMuY29waWVkT2JqZWN0c1xuICAgIHZhciBsZW5ndGggPSBjb3BpZWRPYmplY3RzLmxlbmd0aFxuICAgIGZvciAoIHZhciBpPTA7IGk8bGVuZ3RoOyBpKysgKSB7XG4gICAgICBpZiAoIGNvcGllZE9iamVjdHNbaV1bMF0gPT09IHNvdXJjZSApIHtcbiAgICAgICAgcmV0dXJuIGNvcGllZE9iamVjdHNbaV1bMV1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgLy8gZGVlcENvcHkgaGFuZGxlcyB0aGUgc2ltcGxlIGNhc2VzIGl0c2VsZjogbm9uLW9iamVjdHMgYW5kIG9iamVjdCdzIHdlJ3ZlXG4gIC8vIHNlZW4gYmVmb3JlLiBGb3IgY29tcGxleCBjYXNlcywgaXQgZmlyc3QgaWRlbnRpZmllcyBhbiBhcHByb3ByaWF0ZVxuICAvLyBEZWVwQ29waWVyLCB0aGVuIGNhbGxzIGFwcGx5RGVlcENvcGllcigpIHRvIGRlbGVnYXRlIHRoZSBkZXRhaWxzIG9mIGNvcHlpbmdcbiAgLy8gdGhlIG9iamVjdCB0byB0aGF0IERlZXBDb3BpZXIuXG4sIGRlZXBDb3B5OiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAvLyBudWxsIGlzIGEgc3BlY2lhbCBjYXNlOiBpdCdzIHRoZSBvbmx5IHZhbHVlIG9mIHR5cGUgJ29iamVjdCcgd2l0aG91dFxuICAgIC8vIHByb3BlcnRpZXMuXG4gICAgaWYgKHNvdXJjZSA9PT0gbnVsbCkgeyByZXR1cm4gbnVsbCB9XG5cbiAgICAvLyBBbGwgbm9uLW9iamVjdHMgdXNlIHZhbHVlIHNlbWFudGljcyBhbmQgZG9uJ3QgbmVlZCBleHBsaWN0IGNvcHlpbmdcbiAgICBpZiAodHlwZW9mIHNvdXJjZSAhPSAnb2JqZWN0JykgeyByZXR1cm4gc291cmNlIH1cblxuICAgIHZhciBjYWNoZWRSZXN1bHQgPSB0aGlzLmdldENhY2hlZFJlc3VsdChzb3VyY2UpXG5cbiAgICAvLyBXZSd2ZSBhbHJlYWR5IHNlZW4gdGhpcyBvYmplY3QgZHVyaW5nIHRoaXMgZGVlcCBjb3B5IG9wZXJhdGlvbiBzbyBjYW5cbiAgICAvLyBpbW1lZGlhdGVseSByZXR1cm4gdGhlIHJlc3VsdC4gVGhpcyBwcmVzZXJ2ZXMgdGhlIGN5Y2xpYyByZWZlcmVuY2VcbiAgICAvLyBzdHJ1Y3R1cmUgYW5kIHByb3RlY3RzIHVzIGZyb20gaW5maW5pdGUgcmVjdXJzaW9uLlxuICAgIGlmIChjYWNoZWRSZXN1bHQpIHsgcmV0dXJuIGNhY2hlZFJlc3VsdCB9XG5cbiAgICAvLyBPYmplY3RzIG1heSBuZWVkIHNwZWNpYWwgaGFuZGxpbmcgZGVwZW5kaW5nIG9uIHRoZWlyIGNsYXNzLiBUaGVyZSBpcyBhXG4gICAgLy8gY2xhc3Mgb2YgaGFuZGxlcnMgY2FsbCBcIkRlZXBDb3BpZXJzXCIgdGhhdCBrbm93IGhvdyB0byBjb3B5IGNlcnRhaW5cbiAgICAvLyBvYmplY3RzLiBUaGVyZSBpcyBhbHNvIGEgZmluYWwsIGdlbmVyaWMgZGVlcCBjb3BpZXIgdGhhdCBjYW4gaGFuZGxlIGFueVxuICAgIC8vIG9iamVjdC5cbiAgICBmb3IgKHZhciBpPTA7IGk8ZGVlcENvcGllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBkZWVwQ29waWVyID0gZGVlcENvcGllcnNbaV1cbiAgICAgIGlmIChkZWVwQ29waWVyLmNhbkNvcHkoc291cmNlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5hcHBseURlZXBDb3BpZXIoZGVlcENvcGllciwgc291cmNlKVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBUaGUgZ2VuZXJpYyBjb3BpZXIgY2FuIGhhbmRsZSBhbnl0aGluZywgc28gd2Ugc2hvdWxkIG5ldmVyIHJlYWNoIHRoaXNcbiAgICAvLyBsaW5lLlxuICAgIHRocm93IG5ldyBFcnJvcignbm8gRGVlcENvcGllciBpcyBhYmxlIHRvIGNvcHkgJyArIHNvdXJjZSlcbiAgfVxuXG4gIC8vIE9uY2Ugd2UndmUgaWRlbnRpZmllZCB3aGljaCBEZWVwQ29waWVyIHRvIHVzZSwgd2UgbmVlZCB0byBjYWxsIGl0IGluIGFcbiAgLy8gdmVyeSBwYXJ0aWN1bGFyIG9yZGVyOiBjcmVhdGUsIGNhY2hlLCBwb3B1bGF0ZS5UaGlzIGlzIHRoZSBrZXkgdG8gZGV0ZWN0aW5nXG4gIC8vIGN5Y2xlcy4gV2UgYWxzbyBrZWVwIHRyYWNrIG9mIHJlY3Vyc2lvbiBkZXB0aCB3aGVuIGNhbGxpbmcgdGhlIHBvdGVudGlhbGx5XG4gIC8vIHJlY3Vyc2l2ZSBwb3B1bGF0ZSgpOiB0aGlzIGlzIGEgZmFpbC1mYXN0IHRvIHByZXZlbnQgYW4gaW5maW5pdGUgbG9vcCBmcm9tXG4gIC8vIGNvbnN1bWluZyBhbGwgYXZhaWxhYmxlIG1lbW9yeSBhbmQgY3Jhc2hpbmcgb3Igc2xvd2luZyBkb3duIHRoZSBicm93c2VyLlxuLCBhcHBseURlZXBDb3BpZXI6IGZ1bmN0aW9uKGRlZXBDb3BpZXIsIHNvdXJjZSkge1xuICAgIC8vIFN0YXJ0IGJ5IGNyZWF0aW5nIGEgc3R1YiBvYmplY3QgdGhhdCByZXByZXNlbnRzIHRoZSBjb3B5LlxuICAgIHZhciByZXN1bHQgPSBkZWVwQ29waWVyLmNyZWF0ZShzb3VyY2UpXG5cbiAgICAvLyBXZSBub3cga25vdyB0aGUgZGVlcCBjb3B5IG9mIHNvdXJjZSBzaG91bGQgYWx3YXlzIGJlIHJlc3VsdCwgc28gaWYgd2VcbiAgICAvLyBlbmNvdW50ZXIgc291cmNlIGFnYWluIGR1cmluZyB0aGlzIGRlZXAgY29weSB3ZSBjYW4gaW1tZWRpYXRlbHkgdXNlXG4gICAgLy8gcmVzdWx0IGluc3RlYWQgb2YgZGVzY2VuZGluZyBpbnRvIGl0IHJlY3Vyc2l2ZWx5LlxuICAgIHRoaXMuY2FjaGVSZXN1bHQoc291cmNlLCByZXN1bHQpXG5cbiAgICAvLyBPbmx5IERlZXBDb3BpZXIucG9wdWxhdGUoKSBjYW4gcmVjdXJzaXZlbHkgZGVlcCBjb3B5LiAgbywgdG8ga2VlcCB0cmFja1xuICAgIC8vIG9mIHJlY3Vyc2lvbiBkZXB0aCwgd2UgaW5jcmVtZW50IHRoaXMgc2hhcmVkIGNvdW50ZXIgYmVmb3JlIGNhbGxpbmcgaXQsXG4gICAgLy8gYW5kIGRlY3JlbWVudCBpdCBhZnRlcndhcmRzLlxuICAgIHRoaXMuZGVwdGgrK1xuICAgIGlmICh0aGlzLmRlcHRoID4gdGhpcy5tYXhEZXB0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhjZWVkZWQgbWF4IHJlY3Vyc2lvbiBkZXB0aCBpbiBkZWVwIGNvcHkuXCIpXG4gICAgfVxuXG4gICAgLy8gSXQncyBub3cgc2FmZSB0byBsZXQgdGhlIGRlZXBDb3BpZXIgcmVjdXJzaXZlbHkgZGVlcCBjb3B5IGl0cyBwcm9wZXJ0aWVzXG4gICAgZGVlcENvcGllci5wb3B1bGF0ZSh0aGlzLnJlY3Vyc2l2ZURlZXBDb3B5LCBzb3VyY2UsIHJlc3VsdClcblxuICAgIHRoaXMuZGVwdGgtLVxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG59XG5cbi8vIEVudHJ5IHBvaW50IGZvciBkZWVwIGNvcHkuXG4vLyAgIHNvdXJjZSBpcyB0aGUgb2JqZWN0IHRvIGJlIGRlZXAgY29waWVkLlxuLy8gICBtYXhEZXB0aCBpcyBhbiBvcHRpb25hbCByZWN1cnNpb24gbGltaXQuIERlZmF1bHRzIHRvIDI1Ni5cbmZ1bmN0aW9uIGRlZXBDb3B5KHNvdXJjZSwgbWF4RGVwdGgpIHtcbiAgdmFyIGRlZXBDb3B5QWxnb3JpdGhtID0gbmV3IERlZXBDb3B5QWxnb3JpdGhtKClcbiAgaWYgKG1heERlcHRoKSB7XG4gICAgZGVlcENvcHlBbGdvcml0aG0ubWF4RGVwdGggPSBtYXhEZXB0aFxuICB9XG4gIHJldHVybiBkZWVwQ29weUFsZ29yaXRobS5kZWVwQ29weShzb3VyY2UpXG59XG5cbi8vIFB1YmxpY2x5IGV4cG9zZSB0aGUgRGVlcENvcGllciBjbGFzc1xuZGVlcENvcHkuRGVlcENvcGllciA9IERlZXBDb3BpZXJcblxuLy8gUHVibGljbHkgZXhwb3NlIHRoZSBsaXN0IG9mIGRlZXBDb3BpZXJzXG5kZWVwQ29weS5kZWVwQ29waWVycyA9IGRlZXBDb3BpZXJzXG5cbi8vIE1ha2UgZGVlcENvcHkoKSBleHRlbnNpYmxlIGJ5IGFsbG93aW5nIG90aGVycyB0byByZWdpc3RlciB0aGVpciBvd24gY3VzdG9tXG4vLyBEZWVwQ29waWVycy5cbmRlZXBDb3B5LnJlZ2lzdGVyID0gZnVuY3Rpb24oZGVlcENvcGllcikge1xuICBpZiAoIShkZWVwQ29waWVyIGluc3RhbmNlb2YgRGVlcENvcGllcikpIHtcbiAgICBkZWVwQ29waWVyID0gbmV3IERlZXBDb3BpZXIoZGVlcENvcGllcilcbiAgfVxuICBkZWVwQ29waWVycy51bnNoaWZ0KGRlZXBDb3BpZXIpXG59XG5cbi8vIEdlbmVyaWMgT2JqZWN0IGNvcGllclxuLy8gVGhlIHVsdGltYXRlIGZhbGxiYWNrIERlZXBDb3BpZXIsIHdoaWNoIHRyaWVzIHRvIGhhbmRsZSB0aGUgZ2VuZXJpYyBjYXNlLlxuLy8gVGhpcyBzaG91bGQgd29yayBmb3IgYmFzZSBPYmplY3RzIGFuZCBtYW55IHVzZXItZGVmaW5lZCBjbGFzc2VzLlxuZGVlcENvcHkucmVnaXN0ZXIoe1xuICBjYW5Db3B5OiBmdW5jdGlvbihzb3VyY2UpIHsgcmV0dXJuIHRydWUgfVxuXG4sIGNyZWF0ZTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIHNvdXJjZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgcmV0dXJuIGNsb25lKHNvdXJjZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIHt9XG4gICAgfVxuICB9XG5cbiwgcG9wdWxhdGU6IGZ1bmN0aW9uKGRlZXBDb3B5LCBzb3VyY2UsIHJlc3VsdCkge1xuICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICByZXN1bHRba2V5XSA9IGRlZXBDb3B5KHNvdXJjZVtrZXldKVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cbn0pXG5cbi8vIEFycmF5IGNvcGllclxuZGVlcENvcHkucmVnaXN0ZXIoe1xuICBjYW5Db3B5OiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICByZXR1cm4gaXMuQXJyYXkoc291cmNlKVxuICB9XG5cbiwgY3JlYXRlOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICByZXR1cm4gbmV3IHNvdXJjZS5jb25zdHJ1Y3RvcigpXG4gIH1cblxuLCBwb3B1bGF0ZTogZnVuY3Rpb24oZGVlcENvcHksIHNvdXJjZSwgcmVzdWx0KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzb3VyY2UubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdC5wdXNoKGRlZXBDb3B5KHNvdXJjZVtpXSkpXG4gICAgfVxuICAgIHJldHVybiByZXN1bHRcbiAgfVxufSlcblxuLy8gRGF0ZSBjb3BpZXJcbmRlZXBDb3B5LnJlZ2lzdGVyKHtcbiAgY2FuQ29weTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgcmV0dXJuIGlzLkRhdGUoc291cmNlKVxuICB9XG5cbiwgY3JlYXRlOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoc291cmNlKVxuICB9XG59KVxuXG4vLyBSZWdFeHAgY29waWVyXG5kZWVwQ29weS5yZWdpc3Rlcih7XG4gIGNhbkNvcHk6IGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgIHJldHVybiBpcy5SZWdFeHAoc291cmNlKVxuICB9XG5cbiwgY3JlYXRlOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICByZXR1cm4gc291cmNlXG4gIH1cbn0pXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBEZWVwQ29weUFsZ29yaXRobTogRGVlcENvcHlBbGdvcml0aG1cbiwgY29weTogY29weVxuLCBjbG9uZTogY2xvbmVcbiwgZGVlcENvcHk6IGRlZXBDb3B5XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZVxuICAsIGZvcm1hdFJlZ0V4cCA9IC8lWyVzXS9nXG4gICwgZm9ybWF0T2JqUmVnRXhwID0gLyh7ez8pKFxcdyspfS9nXG5cbi8qKlxuICogUmVwbGFjZXMgJXMgcGxhY2Vob2xkZXJzIGluIGEgc3RyaW5nIHdpdGggcG9zaXRpb25hbCBhcmd1bWVudHMuXG4gKi9cbmZ1bmN0aW9uIGZvcm1hdChzKSB7XG4gIHJldHVybiBmb3JtYXRBcnIocywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKVxufVxuXG4vKipcbiAqIFJlcGxhY2VzICVzIHBsYWNlaG9sZGVycyBpbiBhIHN0cmluZyB3aXRoIGFycmF5IGNvbnRlbnRzLlxuICovXG5mdW5jdGlvbiBmb3JtYXRBcnIocywgYSkge1xuICB2YXIgaSA9IDBcbiAgcmV0dXJuIHMucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKG0pIHsgcmV0dXJuIG0gPT0gJyUlJyA/ICclJyA6IGFbaSsrXSB9KVxufVxuXG4vKipcbiAqIFJlcGxhY2VzIHtwcm9wZXJ0eU5hbWV9IHBsYWNlaG9sZGVycyBpbiBhIHN0cmluZyB3aXRoIG9iamVjdCBwcm9wZXJ0aWVzLlxuICovXG5mdW5jdGlvbiBmb3JtYXRPYmoocywgbykge1xuICByZXR1cm4gcy5yZXBsYWNlKGZvcm1hdE9ialJlZ0V4cCwgZnVuY3Rpb24obSwgYiwgcCkgeyByZXR1cm4gYi5sZW5ndGggPT0gMiA/IG0uc2xpY2UoMSkgOiBvW3BdIH0pXG59XG5cbnZhciB1bml0cyA9ICdrTUdUUEVaWSdcbiAgLCBzdHJpcERlY2ltYWxzID0gL1xcLjAwJHwwJC9cblxuLyoqXG4gKiBGb3JtYXRzIGJ5dGVzIGFzIGEgZmlsZSBzaXplIHdpdGggdGhlIGFwcHJvcHJpYXRlbHkgc2NhbGVkIHVuaXRzLlxuICovXG5mdW5jdGlvbiBmaWxlU2l6ZShieXRlcywgdGhyZXNob2xkKSB7XG4gIHRocmVzaG9sZCA9IE1hdGgubWluKHRocmVzaG9sZCB8fCA3NjgsIDEwMjQpXG4gIHZhciBpID0gLTFcbiAgICAsIHVuaXQgPSAnYnl0ZXMnXG4gICAgLCBzaXplID0gYnl0ZXNcbiAgd2hpbGUgKHNpemUgPiB0aHJlc2hvbGQgJiYgaSA8IHVuaXRzLmxlbmd0aCkge1xuICAgIHNpemUgPSBzaXplIC8gMTAyNFxuICAgIGkrK1xuICB9XG4gIGlmIChpID4gLTEpIHtcbiAgICB1bml0ID0gdW5pdHMuY2hhckF0KGkpICsgJ0InXG4gIH1cbiAgcmV0dXJuIHNpemUudG9GaXhlZCgyKS5yZXBsYWNlKHN0cmlwRGVjaW1hbHMsICcnKSArICcgJyArIHVuaXRcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGZvcm1hdDogZm9ybWF0XG4sIGZvcm1hdEFycjogZm9ybWF0QXJyXG4sIGZvcm1hdE9iajogZm9ybWF0T2JqXG4sIGZpbGVTaXplOiBmaWxlU2l6ZVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG5cbi8vIFR5cGUgY2hlY2tzXG5cbmZ1bmN0aW9uIGlzQXJyYXkobykge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvKSA9PSAnW29iamVjdCBBcnJheV0nXG59XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihvKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKG8pID09ICdbb2JqZWN0IEJvb2xlYW5dJ1xufVxuXG5mdW5jdGlvbiBpc0RhdGUobykge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvKSA9PSAnW29iamVjdCBEYXRlXSdcbn1cblxuZnVuY3Rpb24gaXNFcnJvcihvKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKG8pID09ICdbb2JqZWN0IEVycm9yXSdcbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbihvKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKG8pID09ICdbb2JqZWN0IEZ1bmN0aW9uXSdcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIobykge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvKSA9PSAnW29iamVjdCBOdW1iZXJdJ1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChvKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKG8pID09ICdbb2JqZWN0IE9iamVjdF0nXG59XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKG8pIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwobykgPT0gJ1tvYmplY3QgUmVnRXhwXSdcbn1cblxuZnVuY3Rpb24gaXNTdHJpbmcobykge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvKSA9PSAnW29iamVjdCBTdHJpbmddJ1xufVxuXG4vLyBDb250ZW50IGNoZWNrc1xuXG5mdW5jdGlvbiBpc0VtcHR5KG8pIHtcbiAgLyoganNoaW50IGlnbm9yZTpzdGFydCAqL1xuICBmb3IgKHZhciBwcm9wIGluIG8pIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICAvKiBqc2hpbnQgaWdub3JlOmVuZCAqL1xuICByZXR1cm4gdHJ1ZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgQXJyYXk6IGlzQXJyYXlcbiwgQm9vbGVhbjogaXNCb29sZWFuXG4sIERhdGU6IGlzRGF0ZVxuLCBFbXB0eTogaXNFbXB0eVxuLCBFcnJvcjogaXNFcnJvclxuLCBGdW5jdGlvbjogaXNGdW5jdGlvblxuLCBOYU46IGlzTmFOXG4sIE51bWJlcjogaXNOdW1iZXJcbiwgT2JqZWN0OiBpc09iamVjdFxuLCBSZWdFeHA6IGlzUmVnRXhwXG4sIFN0cmluZzogaXNTdHJpbmdcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBXcmFwcyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KCkgc28gaXQgY2FuIGJlIGNhbGxlZCB3aXRoIGFuIG9iamVjdFxuICogYW5kIHByb3BlcnR5IG5hbWUuXG4gKi9cbnZhciBoYXNPd24gPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHlcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgcHJvcCkgeyByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApIH1cbn0pKClcblxuLyoqXG4gKiBDb3BpZXMgb3duIHByb3BlcnRpZXMgZnJvbSBhbnkgZ2l2ZW4gb2JqZWN0cyB0byBhIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gZXh0ZW5kKGRlc3QpIHtcbiAgZm9yICh2YXIgaSA9IDEsIGwgPSBhcmd1bWVudHMubGVuZ3RoLCBzcmM7IGkgPCBsOyBpKyspIHtcbiAgICBzcmMgPSBhcmd1bWVudHNbaV1cbiAgICBpZiAoc3JjKSB7XG4gICAgICBmb3IgKHZhciBwcm9wIGluIHNyYykge1xuICAgICAgICBpZiAoaGFzT3duKHNyYywgcHJvcCkpIHtcbiAgICAgICAgICBkZXN0W3Byb3BdID0gc3JjW3Byb3BdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlc3Rcbn1cblxuLyoqXG4gKiBNYWtlcyBhIGNvbnN0cnVjdG9yIGluaGVyaXQgYW5vdGhlciBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZSB3aXRob3V0XG4gKiBoYXZpbmcgdG8gYWN0dWFsbHkgdXNlIHRoZSBjb25zdHJ1Y3Rvci5cbiAqL1xuZnVuY3Rpb24gaW5oZXJpdHMoY2hpbGRDb25zdHJ1Y3RvciwgcGFyZW50Q29uc3RydWN0b3IpIHtcbiAgdmFyIEYgPSBmdW5jdGlvbigpIHt9XG4gIEYucHJvdG90eXBlID0gcGFyZW50Q29uc3RydWN0b3IucHJvdG90eXBlXG4gIGNoaWxkQ29uc3RydWN0b3IucHJvdG90eXBlID0gbmV3IEYoKVxuICBjaGlsZENvbnN0cnVjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGNoaWxkQ29uc3RydWN0b3JcbiAgcmV0dXJuIGNoaWxkQ29uc3RydWN0b3Jcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIEFycmF5IG9mIFtwcm9wZXJ0eSwgdmFsdWVdIHBhaXJzIGZyb20gYW4gT2JqZWN0LlxuICovXG5mdW5jdGlvbiBpdGVtcyhvYmopIHtcbiAgdmFyIGl0ZW1zXyA9IFtdXG4gIGZvciAodmFyIHByb3AgaW4gb2JqKSB7XG4gICAgaWYgKGhhc093bihvYmosIHByb3ApKSB7XG4gICAgICBpdGVtc18ucHVzaChbcHJvcCwgb2JqW3Byb3BdXSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGl0ZW1zX1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0IGZyb20gYW4gQXJyYXkgb2YgW3Byb3BlcnR5LCB2YWx1ZV0gcGFpcnMuXG4gKi9cbmZ1bmN0aW9uIGZyb21JdGVtcyhpdGVtcykge1xuICB2YXIgb2JqID0ge31cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBpdGVtcy5sZW5ndGgsIGl0ZW07IGkgPCBsOyBpKyspIHtcbiAgICBpdGVtID0gaXRlbXNbaV1cbiAgICBvYmpbaXRlbVswXV0gPSBpdGVtWzFdXG4gIH1cbiAgcmV0dXJuIG9ialxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBsb29rdXAgT2JqZWN0IGZyb20gYW4gQXJyYXksIGNvZXJjaW5nIGVhY2ggaXRlbSB0byBhIFN0cmluZy5cbiAqL1xuZnVuY3Rpb24gbG9va3VwKGFycikge1xuICB2YXIgb2JqID0ge31cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcnIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgb2JqWycnK2FycltpXV0gPSB0cnVlXG4gIH1cbiAgcmV0dXJuIG9ialxufVxuXG4vKipcbiAqIElmIHRoZSBnaXZlbiBvYmplY3QgaGFzIHRoZSBnaXZlbiBwcm9wZXJ0eSwgcmV0dXJucyBpdHMgdmFsdWUsIG90aGVyd2lzZVxuICogcmV0dXJucyB0aGUgZ2l2ZW4gZGVmYXVsdCB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gZ2V0KG9iaiwgcHJvcCwgZGVmYXVsdFZhbHVlKSB7XG4gIHJldHVybiAoaGFzT3duKG9iaiwgcHJvcCkgPyBvYmpbcHJvcF0gOiBkZWZhdWx0VmFsdWUpXG59XG5cbi8qKlxuICogRGVsZXRlcyBhbmQgcmV0dXJucyBhbiBvd24gcHJvcGVydHkgZnJvbSBhbiBvYmplY3QsIG9wdGlvbmFsbHkgcmV0dXJuaW5nIGFcbiAqIGRlZmF1bHQgdmFsdWUgaWYgdGhlIG9iamVjdCBkaWRuJ3QgaGF2ZSB0aGVwcm9wZXJ0eS5cbiAqIEB0aHJvd3MgaWYgZ2l2ZW4gYW4gb2JqZWN0IHdoaWNoIGlzIG51bGwgKG9yIHVuZGVmaW5lZCksIG9yIGlmIHRoZSBwcm9wZXJ0eVxuICogICBkb2Vzbid0IGV4aXN0IGFuZCB0aGVyZSB3YXMgbm8gZGVmYXVsdFZhbHVlIGdpdmVuLlxuICovXG5mdW5jdGlvbiBwb3Aob2JqLCBwcm9wLCBkZWZhdWx0VmFsdWUpIHtcbiAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwb3BQcm9wIHdhcyBnaXZlbiAnICsgb2JqKVxuICB9XG4gIGlmIChoYXNPd24ob2JqLCBwcm9wKSkge1xuICAgIHZhciB2YWx1ZSA9IG9ialtwcm9wXVxuICAgIGRlbGV0ZSBvYmpbcHJvcF1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuICBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJwb3BQcm9wIHdhcyBnaXZlbiBhbiBvYmplY3Qgd2hpY2ggZGlkbid0IGhhdmUgYW4gb3duICdcIiArXG4gICAgICAgICAgICAgICAgICAgIHByb3AgKyBcIicgcHJvcGVydHksIHdpdGhvdXQgYSBkZWZhdWx0IHZhbHVlIHRvIHJldHVyblwiKVxuICB9XG4gIHJldHVybiBkZWZhdWx0VmFsdWVcbn1cblxuLyoqXG4gKiBJZiB0aGUgcHJvcCBpcyBpbiB0aGUgb2JqZWN0LCByZXR1cm4gaXRzIHZhbHVlLiBJZiBub3QsIHNldCB0aGUgcHJvcCB0b1xuICogZGVmYXVsdFZhbHVlIGFuZCByZXR1cm4gZGVmYXVsdFZhbHVlLlxuICovXG5mdW5jdGlvbiBzZXREZWZhdWx0KG9iaiwgcHJvcCwgZGVmYXVsdFZhbHVlKSB7XG4gIGlmIChvYmogPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0RGVmYXVsdCB3YXMgZ2l2ZW4gJyArIG9iailcbiAgfVxuICBkZWZhdWx0VmFsdWUgPSBkZWZhdWx0VmFsdWUgfHwgbnVsbFxuICBpZiAoaGFzT3duKG9iaiwgcHJvcCkpIHtcbiAgICByZXR1cm4gb2JqW3Byb3BdXG4gIH1cbiAgZWxzZSB7XG4gICAgb2JqW3Byb3BdID0gZGVmYXVsdFZhbHVlXG4gICAgcmV0dXJuIGRlZmF1bHRWYWx1ZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBoYXNPd246IGhhc093blxuLCBleHRlbmQ6IGV4dGVuZFxuLCBpbmhlcml0czogaW5oZXJpdHNcbiwgaXRlbXM6IGl0ZW1zXG4sIGZyb21JdGVtczogZnJvbUl0ZW1zXG4sIGxvb2t1cDogbG9va3VwXG4sIGdldDogZ2V0XG4sIHBvcDogcG9wXG4sIHNldERlZmF1bHQ6IHNldERlZmF1bHRcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGlzID0gcmVxdWlyZSgnLi9pcycpXG5cbi8qKlxuICogUGFkcyBhIG51bWJlciB3aXRoIGEgbGVhZGluZyB6ZXJvIGlmIG5lY2Vzc2FyeS5cbiAqL1xuZnVuY3Rpb24gcGFkKG51bWJlcikge1xuICByZXR1cm4gKG51bWJlciA8IDEwID8gJzAnICsgbnVtYmVyIDogbnVtYmVyKVxufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGluZGV4IG9mIGl0ZW0gaW4gbGlzdCwgb3IgLTEgaWYgaXQncyBub3QgaW4gbGlzdC5cbiAqL1xuZnVuY3Rpb24gaW5kZXhPZihpdGVtLCBsaXN0KSB7XG4gIGZvciAodmFyIGkgPSAwLCBsID0gbGlzdC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoaXRlbSA9PT0gbGlzdFtpXSkge1xuICAgICAgcmV0dXJuIGlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIC0xXG59XG5cbi8qKlxuICogTWFwcyBkaXJlY3RpdmUgY29kZXMgdG8gcmVndWxhciBleHByZXNzaW9uIHBhdHRlcm5zIHdoaWNoIHdpbGwgY2FwdHVyZSB0aGVcbiAqIGRhdGEgdGhlIGRpcmVjdGl2ZSBjb3JyZXNwb25kcyB0bywgb3IgaW4gdGhlIGNhc2Ugb2YgbG9jYWxlLWRlcGVuZGVudFxuICogZGlyZWN0aXZlcywgYSBmdW5jdGlvbiB3aGljaCB0YWtlcyBhIGxvY2FsZSBhbmQgZ2VuZXJhdGVzIGEgcmVndWxhclxuICogZXhwcmVzc2lvbiBwYXR0ZXJuLlxuICovXG52YXIgcGFyc2VyRGlyZWN0aXZlcyA9IHtcbiAgLy8gTG9jYWxlJ3MgYWJicmV2aWF0ZWQgbW9udGggbmFtZVxuICAnYic6IGZ1bmN0aW9uKGwpIHsgcmV0dXJuICcoJyArIGwuYi5qb2luKCd8JykgKyAnKScgfVxuICAvLyBMb2NhbGUncyBmdWxsIG1vbnRoIG5hbWVcbiwgJ0InOiBmdW5jdGlvbihsKSB7IHJldHVybiAnKCcgKyBsLkIuam9pbignfCcpICsgJyknIH1cbiAgLy8gTG9jYWxlJ3MgZXF1aXZhbGVudCBvZiBlaXRoZXIgQU0gb3IgUE0uXG4sICdwJzogZnVuY3Rpb24obCkgeyByZXR1cm4gJygnICsgbC5BTSArICd8JyArIGwuUE0gKyAnKScgfVxuLCAnZCc6ICcoXFxcXGRcXFxcZD8pJyAvLyBEYXkgb2YgdGhlIG1vbnRoIGFzIGEgZGVjaW1hbCBudW1iZXIgWzAxLDMxXVxuLCAnSCc6ICcoXFxcXGRcXFxcZD8pJyAvLyBIb3VyICgyNC1ob3VyIGNsb2NrKSBhcyBhIGRlY2ltYWwgbnVtYmVyIFswMCwyM11cbiwgJ0knOiAnKFxcXFxkXFxcXGQ/KScgLy8gSG91ciAoMTItaG91ciBjbG9jaykgYXMgYSBkZWNpbWFsIG51bWJlciBbMDEsMTJdXG4sICdtJzogJyhcXFxcZFxcXFxkPyknIC8vIE1vbnRoIGFzIGEgZGVjaW1hbCBudW1iZXIgWzAxLDEyXVxuLCAnTSc6ICcoXFxcXGRcXFxcZD8pJyAvLyBNaW51dGUgYXMgYSBkZWNpbWFsIG51bWJlciBbMDAsNTldXG4sICdTJzogJyhcXFxcZFxcXFxkPyknIC8vIFNlY29uZCBhcyBhIGRlY2ltYWwgbnVtYmVyIFswMCw1OV1cbiwgJ3knOiAnKFxcXFxkXFxcXGQ/KScgLy8gWWVhciB3aXRob3V0IGNlbnR1cnkgYXMgYSBkZWNpbWFsIG51bWJlciBbMDAsOTldXG4sICdZJzogJyhcXFxcZHs0fSknICAvLyBZZWFyIHdpdGggY2VudHVyeSBhcyBhIGRlY2ltYWwgbnVtYmVyXG4sICclJzogJyUnICAgICAgICAgLy8gQSBsaXRlcmFsICclJyBjaGFyYWN0ZXJcbn1cblxuLyoqXG4gKiBNYXBzIGRpcmVjdGl2ZSBjb2RlcyB0byBmdW5jdGlvbnMgd2hpY2ggdGFrZSB0aGUgZGF0ZSB0byBiZSBmb3JtYXR0ZWQgYW5kXG4gKiBsb2NhbGUgZGV0YWlscyAoaWYgcmVxdWlyZWQpLCByZXR1cm5pbmcgYW4gYXBwcm9wcmlhdGUgZm9ybWF0dGVkIHZhbHVlLlxuICovXG52YXIgZm9ybWF0dGVyRGlyZWN0aXZlcyA9IHtcbiAgJ2EnOiBmdW5jdGlvbihkLCBsKSB7IHJldHVybiBsLmFbZC5nZXREYXkoKV0gfVxuLCAnQSc6IGZ1bmN0aW9uKGQsIGwpIHsgcmV0dXJuIGwuQVtkLmdldERheSgpXSB9XG4sICdiJzogZnVuY3Rpb24oZCwgbCkgeyByZXR1cm4gbC5iW2QuZ2V0TW9udGgoKV0gfVxuLCAnQic6IGZ1bmN0aW9uKGQsIGwpIHsgcmV0dXJuIGwuQltkLmdldE1vbnRoKCldIH1cbiwgJ2QnOiBmdW5jdGlvbihkKSB7IHJldHVybiBwYWQoZC5nZXREYXRlKCksIDIpIH1cbiwgJ0gnOiBmdW5jdGlvbihkKSB7IHJldHVybiBwYWQoZC5nZXRIb3VycygpLCAyKSB9XG4sICdNJzogZnVuY3Rpb24oZCkgeyByZXR1cm4gcGFkKGQuZ2V0TWludXRlcygpLCAyKSB9XG4sICdtJzogZnVuY3Rpb24oZCkgeyByZXR1cm4gcGFkKGQuZ2V0TW9udGgoKSArIDEsIDIpIH1cbiwgJ1MnOiBmdW5jdGlvbihkKSB7IHJldHVybiBwYWQoZC5nZXRTZWNvbmRzKCksIDIpIH1cbiwgJ3cnOiBmdW5jdGlvbihkKSB7IHJldHVybiBkLmdldERheSgpIH1cbiwgJ1knOiBmdW5jdGlvbihkKSB7IHJldHVybiBkLmdldEZ1bGxZZWFyKCkgfVxuLCAnJSc6IGZ1bmN0aW9uKGQpIHsgcmV0dXJuICclJyB9XG59XG5cbi8qKiBUZXN0IGZvciBoYW5naW5nIHBlcmNlbnRhZ2Ugc3ltYm9scy4gKi9cbnZhciBzdHJmdGltZUZvcm1hdENoZWNrID0gL1teJV0lJC9cblxuLyoqXG4gKiBBIHBhcnRpYWwgaW1wbGVtZW50YXRpb24gb2Ygc3RycHRpbWUgd2hpY2ggcGFyc2VzIHRpbWUgZGV0YWlscyBmcm9tIGEgc3RyaW5nLFxuICogYmFzZWQgb24gYSBmb3JtYXQgc3RyaW5nLlxuICogQHBhcmFtIHtTdHJpbmd9IGZvcm1hdFxuICogQHBhcmFtIHtPYmplY3R9IGxvY2FsZVxuICovXG5mdW5jdGlvbiBUaW1lUGFyc2VyKGZvcm1hdCwgbG9jYWxlKSB7XG4gIHRoaXMuZm9ybWF0ID0gZm9ybWF0XG4gIHRoaXMubG9jYWxlID0gbG9jYWxlXG4gIHZhciBjYWNoZWRQYXR0ZXJuID0gVGltZVBhcnNlci5fY2FjaGVbbG9jYWxlLm5hbWUgKyAnfCcgKyBmb3JtYXRdXG4gIGlmIChjYWNoZWRQYXR0ZXJuICE9PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLnJlID0gY2FjaGVkUGF0dGVyblswXVxuICAgIHRoaXMubWF0Y2hPcmRlciA9IGNhY2hlZFBhdHRlcm5bMV1cbiAgfVxuICBlbHNlIHtcbiAgICB0aGlzLmNvbXBpbGVQYXR0ZXJuKClcbiAgfVxufVxuXG4vKipcbiAqIENhY2hlcyBSZWdFeHBzIGFuZCBtYXRjaCBvcmRlcnMgZ2VuZXJhdGVkIHBlciBsb2NhbGUvZm9ybWF0IHN0cmluZyBjb21iby5cbiAqL1xuVGltZVBhcnNlci5fY2FjaGUgPSB7fVxuXG5UaW1lUGFyc2VyLnByb3RvdHlwZS5jb21waWxlUGF0dGVybiA9IGZ1bmN0aW9uKCkge1xuICAvLyBOb3JtYWxpc2Ugd2hpdGVzcGFjZSBiZWZvcmUgZnVydGhlciBwcm9jZXNzaW5nXG4gIHZhciBmb3JtYXQgPSB0aGlzLmZvcm1hdC5zcGxpdCgvKD86XFxzfFxcdHxcXG4pKy8pLmpvaW4oJyAnKVxuICAgICwgcGF0dGVybiA9IFtdXG4gICAgLCBtYXRjaE9yZGVyID0gW11cbiAgICAsIGNcbiAgICAsIGRpcmVjdGl2ZVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gZm9ybWF0Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGMgPSBmb3JtYXQuY2hhckF0KGkpXG4gICAgaWYgKGMgIT0gJyUnKSB7XG4gICAgICBpZiAoYyA9PT0gJyAnKSB7XG4gICAgICAgIHBhdHRlcm4ucHVzaCgnICsnKVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHBhdHRlcm4ucHVzaChjKVxuICAgICAgfVxuICAgICAgY29udGludWVcbiAgICB9XG5cbiAgICBpZiAoaSA9PSBsIC0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdHJwdGltZSBmb3JtYXQgZW5kcyB3aXRoIHJhdyAlJylcbiAgICB9XG5cbiAgICBjID0gZm9ybWF0LmNoYXJBdCgrK2kpXG4gICAgZGlyZWN0aXZlID0gcGFyc2VyRGlyZWN0aXZlc1tjXVxuICAgIGlmIChkaXJlY3RpdmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdHJwdGltZSBmb3JtYXQgY29udGFpbnMgYW4gdW5rbm93biBkaXJlY3RpdmU6ICUnICsgYylcbiAgICB9XG4gICAgZWxzZSBpZiAoaXMuRnVuY3Rpb24oZGlyZWN0aXZlKSkge1xuICAgICAgcGF0dGVybi5wdXNoKGRpcmVjdGl2ZSh0aGlzLmxvY2FsZSkpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcGF0dGVybi5wdXNoKGRpcmVjdGl2ZSlcbiAgICB9XG5cbiAgICBpZiAoYyAhPSAnJScpIHtcbiAgICAgICBtYXRjaE9yZGVyLnB1c2goYylcbiAgICB9XG4gIH1cblxuICB0aGlzLnJlID0gbmV3IFJlZ0V4cCgnXicgKyBwYXR0ZXJuLmpvaW4oJycpICsgJyQnKVxuICB0aGlzLm1hdGNoT3JkZXIgPSBtYXRjaE9yZGVyXG4gIFRpbWVQYXJzZXIuX2NhY2hlW3RoaXMubG9jYWxlLm5hbWUgKyAnfCcgKyB0aGlzLmZvcm1hdF0gPSBbdGhpcy5yZSwgbWF0Y2hPcmRlcl1cbn1cblxuLyoqXG4gKiBBdHRlbXB0cyB0byBleHRyYWN0IGRhdGUgYW5kIHRpbWUgZGV0YWlscyBmcm9tIHRoZSBnaXZlbiBpbnB1dC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBpbnB1dFxuICogQHJldHVybiB7QXJyYXkuPG51bWJlcj59XG4gKi9cblRpbWVQYXJzZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIG1hdGNoZXMgPSB0aGlzLnJlLmV4ZWMoaW5wdXQpXG4gIGlmIChtYXRjaGVzID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUaW1lIGRhdGEgZGlkIG5vdCBtYXRjaCBmb3JtYXQ6IGRhdGE9JyArIGlucHV0ICtcbiAgICAgICAgICAgICAgICAgICAgJywgZm9ybWF0PScgKyB0aGlzLmZvcm1hdClcbiAgfVxuXG4gICAgLy8gRGVmYXVsdCB2YWx1ZXMgZm9yIHdoZW4gbW9yZSBhY2N1cmF0ZSB2YWx1ZXMgY2Fubm90IGJlIGluZmVycmVkXG4gIHZhciB0aW1lID0gWzE5MDAsIDEsIDEsIDAsIDAsIDBdXG4gICAgLy8gTWF0Y2hlZCB0aW1lIGRhdGEsIGtleWVkIGJ5IGRpcmVjdGl2ZSBjb2RlXG4gICAgLCBkYXRhID0ge31cblxuICBmb3IgKHZhciBpID0gMSwgbCA9IG1hdGNoZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgZGF0YVt0aGlzLm1hdGNoT3JkZXJbaSAtIDFdXSA9IG1hdGNoZXNbaV1cbiAgfVxuXG4gIC8vIEV4dHJhY3QgeWVhclxuICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnWScpKSB7XG4gICAgdGltZVswXSA9IHBhcnNlSW50KGRhdGEuWSwgMTApXG4gIH1cbiAgZWxzZSBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgneScpKSB7XG4gICAgdmFyIHllYXIgPSBwYXJzZUludChkYXRhLnksIDEwKVxuICAgIGlmICh5ZWFyIDwgNjgpIHtcbiAgICAgICAgeWVhciA9IDIwMDAgKyB5ZWFyXG4gICAgfVxuICAgIGVsc2UgaWYgKHllYXIgPCAxMDApIHtcbiAgICAgICAgeWVhciA9IDE5MDAgKyB5ZWFyXG4gICAgfVxuICAgIHRpbWVbMF0gPSB5ZWFyXG4gIH1cblxuICAvLyBFeHRyYWN0IG1vbnRoXG4gIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtJykpIHtcbiAgICB2YXIgbW9udGggPSBwYXJzZUludChkYXRhLm0sIDEwKVxuICAgIGlmIChtb250aCA8IDEgfHwgbW9udGggPiAxMikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb250aCBpcyBvdXQgb2YgcmFuZ2U6ICcgKyBtb250aClcbiAgICB9XG4gICAgdGltZVsxXSA9IG1vbnRoXG4gIH1cbiAgZWxzZSBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnQicpKSB7XG4gICAgdGltZVsxXSA9IGluZGV4T2YoZGF0YS5CLCB0aGlzLmxvY2FsZS5CKSArIDFcbiAgfVxuICBlbHNlIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdiJykpIHtcbiAgICB0aW1lWzFdID0gaW5kZXhPZihkYXRhLmIsIHRoaXMubG9jYWxlLmIpICsgMVxuICB9XG5cbiAgLy8gRXh0cmFjdCBkYXkgb2YgbW9udGhcbiAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2QnKSkge1xuICAgIHZhciBkYXkgPSBwYXJzZUludChkYXRhLmQsIDEwKVxuICAgIGlmIChkYXkgPCAxIHx8IGRheSA+IDMxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RheSBpcyBvdXQgb2YgcmFuZ2U6ICcgKyBkYXkpXG4gICAgfVxuICAgIHRpbWVbMl0gPSBkYXlcbiAgfVxuXG4gIC8vIEV4dHJhY3QgaG91clxuICB2YXIgaG91clxuICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnSCcpKSB7XG4gICAgaG91ciA9IHBhcnNlSW50KGRhdGEuSCwgMTApXG4gICAgaWYgKGhvdXIgPiAyMykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdIb3VyIGlzIG91dCBvZiByYW5nZTogJyArIGhvdXIpXG4gICAgfVxuICAgIHRpbWVbM10gPSBob3VyXG4gIH1cbiAgZWxzZSBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnSScpKSB7XG4gICAgaG91ciA9IHBhcnNlSW50KGRhdGEuSSwgMTApXG4gICAgaWYgKGhvdXIgPCAxIHx8IGhvdXIgPiAxMikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdIb3VyIGlzIG91dCBvZiByYW5nZTogJyArIGhvdXIpXG4gICAgfVxuXG4gICAgLy8gSWYgd2UgZG9uJ3QgZ2V0IGFueSBtb3JlIGluZm9ybWF0aW9uLCB3ZSdsbCBhc3N1bWUgdGhpcyB0aW1lIGlzXG4gICAgLy8gYS5tLiAtIDEyIGEubS4gaXMgbWlkbmlnaHQuXG4gICAgaWYgKGhvdXIgPT0gMTIpIHtcbiAgICAgICAgaG91ciA9IDBcbiAgICB9XG5cbiAgICB0aW1lWzNdID0gaG91clxuXG4gICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3AnKSkge1xuICAgICAgaWYgKGRhdGEucCA9PSB0aGlzLmxvY2FsZS5QTSkge1xuICAgICAgICAvLyBXZSd2ZSBhbHJlYWR5IGhhbmRsZWQgdGhlIG1pZG5pZ2h0IHNwZWNpYWwgY2FzZSwgc28gaXQnc1xuICAgICAgICAvLyBzYWZlIHRvIGJ1bXAgdGhlIHRpbWUgYnkgMTIgaG91cnMgd2l0aG91dCBmdXJ0aGVyIGNoZWNrcy5cbiAgICAgICAgdGltZVszXSA9IHRpbWVbM10gKyAxMlxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEV4dHJhY3QgbWludXRlXG4gIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdNJykpIHtcbiAgICB2YXIgbWludXRlID0gcGFyc2VJbnQoZGF0YS5NLCAxMClcbiAgICBpZiAobWludXRlID4gNTkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaW51dGUgaXMgb3V0IG9mIHJhbmdlOiAnICsgbWludXRlKVxuICAgIH1cbiAgICB0aW1lWzRdID0gbWludXRlXG4gIH1cblxuICAvLyBFeHRyYWN0IHNlY29uZHNcbiAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ1MnKSkge1xuICAgIHZhciBzZWNvbmQgPSBwYXJzZUludChkYXRhLlMsIDEwKVxuICAgIGlmIChzZWNvbmQgPiA1OSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZWNvbmQgaXMgb3V0IG9mIHJhbmdlOiAnICsgc2Vjb25kKVxuICAgIH1cbiAgICB0aW1lWzVdID0gc2Vjb25kXG4gIH1cblxuICAvLyBWYWxpZGF0ZSBkYXkgb2YgbW9udGhcbiAgZGF5ID0gdGltZVsyXSwgbW9udGggPSB0aW1lWzFdLCB5ZWFyID0gdGltZVswXVxuICBpZiAoKChtb250aCA9PSA0IHx8IG1vbnRoID09IDYgfHwgbW9udGggPT0gOSB8fCBtb250aCA9PSAxMSkgJiZcbiAgICAgIGRheSA+IDMwKSB8fFxuICAgICAgKG1vbnRoID09IDIgJiYgZGF5ID4gKCh5ZWFyICUgNCA9PT0gMCAmJiB5ZWFyICUgMTAwICE9PSAwIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHllYXIgJSA0MDAgPT09IDApID8gMjkgOiAyOCkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdEYXkgaXMgb3V0IG9mIHJhbmdlOiAnICsgZGF5KVxuICB9XG5cbiAgcmV0dXJuIHRpbWVcbn1cblxudmFyIHRpbWUgID0ge1xuICAvKiogRGVmYXVsdCBsb2NhbGUgbmFtZS4gKi9cbiAgZGVmYXVsdExvY2FsZTogJ2VuJ1xuXG4gIC8qKiBMb2NhbGUgZGV0YWlscy4gKi9cbiwgbG9jYWxlczoge1xuICAgIGVuOiB7XG4gICAgICBuYW1lOiAnZW4nXG4gICAgLCBhOiBbJ1N1bicsICdNb24nLCAnVHVlJywgJ1dlZCcsICdUaHUnLCAnRnJpJywgJ1NhdCddXG4gICAgLCBBOiBbJ1N1bmRheScsICdNb25kYXknLCAnVHVlc2RheScsICdXZWRuZXNkYXknLCAnVGh1cnNkYXknLFxuICAgICAgICAgICdGcmlkYXknLCAnU2F0dXJkYXknXVxuICAgICwgQU06ICdBTSdcbiAgICAsIGI6IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddXG4gICAgLCBCOiBbJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLCAnSnVseScsXG4gICAgICAgICAgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddXG4gICAgLCBQTTogJ1BNJ1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgbG9jYWxlIHdpdGggdGhlIGdpdmVuIGNvZGUuXG4gKiBAcGFyYW0ge3N0cmluZ30gY29kZVxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG52YXIgZ2V0TG9jYWxlID0gdGltZS5nZXRMb2NhbGUgPSBmdW5jdGlvbihjb2RlKSB7XG4gIGlmIChjb2RlKSB7XG4gICAgaWYgKHRpbWUubG9jYWxlcy5oYXNPd25Qcm9wZXJ0eShjb2RlKSkge1xuICAgICAgcmV0dXJuIHRpbWUubG9jYWxlc1tjb2RlXVxuICAgIH1cbiAgICBlbHNlIGlmIChjb2RlLmxlbmd0aCA+IDIpIHtcbiAgICAgIC8vIElmIHdlIGFwcGVhciB0byBoYXZlIG1vcmUgdGhhbiBhIGxhbmd1YWdlIGNvZGUsIHRyeSB0aGVcbiAgICAgIC8vIGxhbmd1YWdlIGNvZGUgb24gaXRzIG93bi5cbiAgICAgIHZhciBsYW5ndWFnZUNvZGUgPSBjb2RlLnN1YnN0cmluZygwLCAyKVxuICAgICAgaWYgKHRpbWUubG9jYWxlcy5oYXNPd25Qcm9wZXJ0eShsYW5ndWFnZUNvZGUpKSB7XG4gICAgICAgIHJldHVybiB0aW1lLmxvY2FsZXNbbGFuZ3VhZ2VDb2RlXVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdGltZS5sb2NhbGVzW3RpbWUuZGVmYXVsdExvY2FsZV1cbn1cblxuLyoqXG4gKiBQYXJzZXMgdGltZSBkZXRhaWxzIGZyb20gYSBzdHJpbmcsIGJhc2VkIG9uIGEgZm9ybWF0IHN0cmluZy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBpbnB1dFxuICogQHBhcmFtIHtzdHJpbmd9IGZvcm1hdFxuICogQHBhcmFtIHtzdHJpbmc9fSBsb2NhbGVcbiAqIEByZXR1cm4ge0FycmF5LjxudW1iZXI+fVxuICovXG52YXIgc3RycHRpbWUgPSB0aW1lLnN0cnB0aW1lID0gZnVuY3Rpb24oaW5wdXQsIGZvcm1hdCwgbG9jYWxlKSB7XG4gIHJldHVybiBuZXcgVGltZVBhcnNlcihmb3JtYXQsIGdldExvY2FsZShsb2NhbGUpKS5wYXJzZShpbnB1dClcbn1cblxuLyoqXG4gKiBDb252ZW5pZW5jZSB3cmFwcGVyIGFyb3VuZCB0aW1lLnN0cnB0aW1lIHdoaWNoIHJldHVybnMgYSBKYXZhU2NyaXB0IERhdGUuXG4gKiBAcGFyYW0ge3N0cmluZ30gaW5wdXRcbiAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtYXRcbiAqIEBwYXJhbSB7c3RyaW5nPX0gbG9jYWxlXG4gKiBAcmV0dXJuIHtkYXRlfVxuICovXG50aW1lLnN0cnBkYXRlID0gZnVuY3Rpb24oaW5wdXQsIGZvcm1hdCwgbG9jYWxlKSB7XG4gIHZhciB0ID0gc3RycHRpbWUoaW5wdXQsIGZvcm1hdCwgbG9jYWxlKVxuICByZXR1cm4gbmV3IERhdGUodFswXSwgdFsxXSAtIDEsIHRbMl0sIHRbM10sIHRbNF0sIHRbNV0pXG59XG5cbi8qKlxuICogQSBwYXJ0aWFsIGltcGxlbWVudGF0aW9uIG9mIDxjb2RlPnN0cmZ0aW1lPC9jb2RlPiwgd2hpY2ggZm9ybWF0cyBhIGRhdGVcbiAqIGFjY29yZGluZyB0byBhIGZvcm1hdCBzdHJpbmcuIEFuIEVycm9yIHdpbGwgYmUgdGhyb3duIGlmIGFuIGludmFsaWRcbiAqIGZvcm1hdCBzdHJpbmcgaXMgZ2l2ZW4uXG4gKiBAcGFyYW0ge2RhdGV9IGRhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtYXRcbiAqIEBwYXJhbSB7c3RyaW5nPX0gbG9jYWxlXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKi9cbnRpbWUuc3RyZnRpbWUgPSBmdW5jdGlvbihkYXRlLCBmb3JtYXQsIGxvY2FsZSkge1xuICBpZiAoc3RyZnRpbWVGb3JtYXRDaGVjay50ZXN0KGZvcm1hdCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0cmZ0aW1lIGZvcm1hdCBlbmRzIHdpdGggcmF3ICUnKVxuICB9XG4gIGxvY2FsZSA9IGdldExvY2FsZShsb2NhbGUpXG4gIHJldHVybiBmb3JtYXQucmVwbGFjZSgvKCUuKS9nLCBmdW5jdGlvbihzLCBmKSB7XG4gICAgdmFyIGNvZGUgPSBmLmNoYXJBdCgxKVxuICAgIGlmICh0eXBlb2YgZm9ybWF0dGVyRGlyZWN0aXZlc1tjb2RlXSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdHJmdGltZSBmb3JtYXQgY29udGFpbnMgYW4gdW5rbm93biBkaXJlY3RpdmU6ICcgKyBmKVxuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0dGVyRGlyZWN0aXZlc1tjb2RlXShkYXRlLCBsb2NhbGUpXG4gIH0pXG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGltZVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBwYXJzZVVyaSAxLjIuMlxuLy8gKGMpIFN0ZXZlbiBMZXZpdGhhbiA8c3RldmVubGV2aXRoYW4uY29tPlxuLy8gTUlUIExpY2Vuc2VcbmZ1bmN0aW9uIHBhcnNlVXJpIChzdHIpIHtcbiAgdmFyIG8gPSBwYXJzZVVyaS5vcHRpb25zXG4gICAgLCBtID0gby5wYXJzZXJbby5zdHJpY3RNb2RlID8gXCJzdHJpY3RcIiA6IFwibG9vc2VcIl0uZXhlYyhzdHIpXG4gICAgLCB1cmkgPSB7fVxuICAgICwgaSA9IDE0XG5cbiAgd2hpbGUgKGktLSkgeyB1cmlbby5rZXlbaV1dID0gbVtpXSB8fCBcIlwiIH1cblxuICB1cmlbby5xLm5hbWVdID0ge307XG4gIHVyaVtvLmtleVsxMl1dLnJlcGxhY2Uoby5xLnBhcnNlciwgZnVuY3Rpb24gKCQwLCAkMSwgJDIpIHtcbiAgICBpZiAoJDEpIHsgdXJpW28ucS5uYW1lXVskMV0gPSAkMiB9XG4gIH0pXG5cbiAgcmV0dXJuIHVyaVxufVxuXG5wYXJzZVVyaS5vcHRpb25zID0ge1xuICBzdHJpY3RNb2RlOiBmYWxzZVxuLCBrZXk6IFsnc291cmNlJywncHJvdG9jb2wnLCdhdXRob3JpdHknLCd1c2VySW5mbycsJ3VzZXInLCdwYXNzd29yZCcsJ2hvc3QnLCdwb3J0JywncmVsYXRpdmUnLCdwYXRoJywnZGlyZWN0b3J5JywnZmlsZScsJ3F1ZXJ5JywnYW5jaG9yJ11cbiwgcToge1xuICAgIG5hbWU6ICdxdWVyeUtleSdcbiAgLCBwYXJzZXI6IC8oPzpefCYpKFteJj1dKik9PyhbXiZdKikvZ1xuICB9XG4sIHBhcnNlcjoge1xuICAgIHN0cmljdDogL14oPzooW146XFwvPyNdKyk6KT8oPzpcXC9cXC8oKD86KChbXjpAXSopKD86OihbXjpAXSopKT8pP0ApPyhbXjpcXC8/I10qKSg/OjooXFxkKikpPykpPygoKCg/OltePyNcXC9dKlxcLykqKShbXj8jXSopKSg/OlxcPyhbXiNdKikpPyg/OiMoLiopKT8pL1xuICAsIGxvb3NlOiAvXig/Oig/IVteOkBdKzpbXjpAXFwvXSpAKShbXjpcXC8/Iy5dKyk6KT8oPzpcXC9cXC8pPygoPzooKFteOkBdKikoPzo6KFteOkBdKikpPyk/QCk/KFteOlxcLz8jXSopKD86OihcXGQqKSk/KSgoKFxcLyg/OltePyNdKD8hW14/I1xcL10qXFwuW14/I1xcLy5dKyg/Ols/I118JCkpKSpcXC8/KT8oW14/I1xcL10qKSkoPzpcXD8oW14jXSopKT8oPzojKC4qKSk/KS9cbiAgfVxufVxuXG4vLyBtYWtlVVJJIDEuMi4yIC0gY3JlYXRlIGEgVVJJIGZyb20gYW4gb2JqZWN0IHNwZWNpZmljYXRpb247IGNvbXBhdGlibGUgd2l0aFxuLy8gcGFyc2VVUkkgKGh0dHA6Ly9ibG9nLnN0ZXZlbmxldml0aGFuLmNvbS9hcmNoaXZlcy9wYXJzZXVyaSlcbi8vIChjKSBOaWFsbCBTbWFydCA8bmlhbGxzbWFydC5jb20+XG4vLyBNSVQgTGljZW5zZVxuZnVuY3Rpb24gbWFrZVVyaSh1KSB7XG4gIHZhciB1cmkgPSAnJ1xuICBpZiAodS5wcm90b2NvbCkge1xuICAgIHVyaSArPSB1LnByb3RvY29sICsgJzovLydcbiAgfVxuICBpZiAodS51c2VyKSB7XG4gICAgdXJpICs9IHUudXNlclxuICB9XG4gIGlmICh1LnBhc3N3b3JkKSB7XG4gICAgdXJpICs9ICc6JyArIHUucGFzc3dvcmRcbiAgfVxuICBpZiAodS51c2VyIHx8IHUucGFzc3dvcmQpIHtcbiAgICB1cmkgKz0gJ0AnXG4gIH1cbiAgaWYgKHUuaG9zdCkge1xuICAgIHVyaSArPSB1Lmhvc3RcbiAgfVxuICBpZiAodS5wb3J0KSB7XG4gICAgdXJpICs9ICc6JyArIHUucG9ydFxuICB9XG4gIGlmICh1LnBhdGgpIHtcbiAgICB1cmkgKz0gdS5wYXRoXG4gIH1cbiAgdmFyIHFrID0gdS5xdWVyeUtleVxuICB2YXIgcXMgPSBbXVxuICBmb3IgKHZhciBrIGluIHFrKSB7XG4gICAgaWYgKCFxay5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgY29udGludWVcbiAgICB9XG4gICAgdmFyIHYgPSBlbmNvZGVVUklDb21wb25lbnQocWtba10pXG4gICAgayA9IGVuY29kZVVSSUNvbXBvbmVudChrKVxuICAgIGlmICh2KSB7XG4gICAgICBxcy5wdXNoKGsgKyAnPScgKyB2KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHFzLnB1c2goaylcbiAgICB9XG4gIH1cbiAgaWYgKHFzLmxlbmd0aCA+IDApIHtcbiAgICB1cmkgKz0gJz8nICsgcXMuam9pbignJicpXG4gIH1cbiAgaWYgKHUuYW5jaG9yKSB7XG4gICAgdXJpICs9ICcjJyArIHUuYW5jaG9yXG4gIH1cbiAgcmV0dXJuIHVyaVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcGFyc2VVcmk6IHBhcnNlVXJpXG4sIG1ha2VVcmk6IG1ha2VVcmlcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbmN1ciA9IHJlcXVpcmUoJ0NvbmN1cicpXG52YXIgZm9ybWF0ID0gcmVxdWlyZSgnaXNvbW9ycGgvZm9ybWF0JykuZm9ybWF0T2JqXG52YXIgaXMgPSByZXF1aXJlKCdpc29tb3JwaC9pcycpXG52YXIgb2JqZWN0ID0gcmVxdWlyZSgnaXNvbW9ycGgvb2JqZWN0JylcblxudmFyIE5PTl9GSUVMRF9FUlJPUlMgPSAnX19hbGxfXydcblxuLyoqXG4gKiBBIHZhbGlkYXRpb24gZXJyb3IsIGNvbnRhaW5pbmcgYSBsaXN0IG9mIG1lc3NhZ2VzLiBTaW5nbGUgbWVzc2FnZXMgKGUuZy5cbiAqIHRob3NlIHByb2R1Y2VkIGJ5IHZhbGlkYXRvcnMpIG1heSBoYXZlIGFuIGFzc29jaWF0ZWQgZXJyb3IgY29kZSBhbmRcbiAqIHBhcmFtZXRlcnMgdG8gYWxsb3cgY3VzdG9taXNhdGlvbiBieSBmaWVsZHMuXG4gKlxuICogVGhlIG1lc3NhZ2UgYXJndW1lbnQgY2FuIGJlIGEgc2luZ2xlIGVycm9yLCBhIGxpc3Qgb2YgZXJyb3JzLCBvciBhbiBvYmplY3RcbiAqIHRoYXQgbWFwcyBmaWVsZCBuYW1lcyB0byBsaXN0cyBvZiBlcnJvcnMuIFdoYXQgd2UgZGVmaW5lIGFzIGFuIFwiZXJyb3JcIiBjYW5cbiAqIGJlIGVpdGhlciBhIHNpbXBsZSBzdHJpbmcgb3IgYW4gaW5zdGFuY2Ugb2YgVmFsaWRhdGlvbkVycm9yIHdpdGggaXRzIG1lc3NhZ2VcbiAqIGF0dHJpYnV0ZSBzZXQsIGFuZCB3aGF0IHdlIGRlZmluZSBhcyBsaXN0IG9yIG9iamVjdCBjYW4gYmUgYW4gYWN0dWFsIGxpc3Qgb3JcbiAqIG9iamVjdCBvciBhbiBpbnN0YW5jZSBvZiBWYWxpZGF0aW9uRXJyb3Igd2l0aCBpdHMgZXJyb3JMaXN0IG9yIGVycm9yT2JqXG4gKiBwcm9wZXJ0eSBzZXQuXG4gKi9cbnZhciBWYWxpZGF0aW9uRXJyb3IgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvcihtZXNzYWdlLCBrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSkgeyByZXR1cm4gbmV3IFZhbGlkYXRpb25FcnJvcihtZXNzYWdlLCBrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtjb2RlOiBudWxsLCBwYXJhbXM6IG51bGx9LCBrd2FyZ3MpXG5cbiAgICB2YXIgY29kZSA9IGt3YXJncy5jb2RlXG4gICAgdmFyIHBhcmFtcyA9IGt3YXJncy5wYXJhbXNcblxuICAgIGlmIChtZXNzYWdlIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSB7XG4gICAgICBpZiAob2JqZWN0Lmhhc093bihtZXNzYWdlLCAnZXJyb3JPYmonKSkge1xuICAgICAgICBtZXNzYWdlID0gbWVzc2FnZS5lcnJvck9ialxuICAgICAgfVxuICAgICAgZWxzZSBpZiAob2JqZWN0Lmhhc093bihtZXNzYWdlLCAnbWVzc2FnZScpKSB7XG4gICAgICAgIG1lc3NhZ2UgPSBtZXNzYWdlLmVycm9yTGlzdFxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGNvZGUgPSBtZXNzYWdlLmNvZGVcbiAgICAgICAgcGFyYW1zID0gbWVzc2FnZS5wYXJhbXNcbiAgICAgICAgbWVzc2FnZSA9IG1lc3NhZ2UubWVzc2FnZVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpcy5PYmplY3QobWVzc2FnZSkpIHtcbiAgICAgIHRoaXMuZXJyb3JPYmogPSB7fVxuICAgICAgT2JqZWN0LmtleXMobWVzc2FnZSkuZm9yRWFjaChmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICB2YXIgbWVzc2FnZXMgPSBtZXNzYWdlW2ZpZWxkXVxuICAgICAgICBpZiAoIShtZXNzYWdlcyBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHtcbiAgICAgICAgICBtZXNzYWdlcyA9IFZhbGlkYXRpb25FcnJvcihtZXNzYWdlcylcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmVycm9yT2JqW2ZpZWxkXSA9IG1lc3NhZ2VzLmVycm9yTGlzdFxuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH1cbiAgICBlbHNlIGlmIChpcy5BcnJheShtZXNzYWdlKSkge1xuICAgICAgdGhpcy5lcnJvckxpc3QgPSBbXVxuICAgICAgbWVzc2FnZS5mb3JFYWNoKGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgLy8gTm9ybWFsaXplIHN0cmluZ3MgdG8gaW5zdGFuY2VzIG9mIFZhbGlkYXRpb25FcnJvclxuICAgICAgICBpZiAoIShtZXNzYWdlIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSkge1xuICAgICAgICAgIG1lc3NhZ2UgPSBWYWxpZGF0aW9uRXJyb3IobWVzc2FnZSlcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmVycm9yTGlzdC5wdXNoLmFwcGx5KHRoaXMuZXJyb3JMaXN0LCBtZXNzYWdlLmVycm9yTGlzdClcbiAgICAgIH0uYmluZCh0aGlzKSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlXG4gICAgICB0aGlzLmNvZGUgPSBjb2RlXG4gICAgICB0aGlzLnBhcmFtcyA9IHBhcmFtc1xuICAgICAgdGhpcy5lcnJvckxpc3QgPSBbdGhpc11cbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogUmV0dXJucyB2YWxpZGF0aW9uIG1lc3NhZ2VzIGFzIGFuIG9iamVjdCB3aXRoIGZpZWxkIG5hbWVzIGFzIHByb3BlcnRpZXMuXG4gKiBUaHJvd3MgYW4gZXJyb3IgaWYgdGhpcyB2YWxpZGF0aW9uIGVycm9yIHdhcyBub3QgY3JlYXRlZCB3aXRoIGEgZmllbGQgZXJyb3JcbiAqIG9iamVjdC5cbiAqL1xuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZS5tZXNzYWdlT2JqID0gZnVuY3Rpb24oKSB7XG4gIGlmICghb2JqZWN0Lmhhc093bih0aGlzLCAnZXJyb3JPYmonKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignVmFsaWRhdGlvbkVycm9yIGhhcyBubyBlcnJvck9iaicpXG4gIH1cbiAgcmV0dXJuIHRoaXMuX19pdGVyX18oKVxufVxuXG4vKipcbiAqIFJldHVybnMgdmFsaWRhdGlvbiBtZXNzYWdlcyBhcyBhIGxpc3QuXG4gKi9cblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUubWVzc2FnZXMgPSBmdW5jdGlvbigpIHtcbiAgaWYgKG9iamVjdC5oYXNPd24odGhpcywgJ2Vycm9yT2JqJykpIHtcbiAgICB2YXIgbWVzc2FnZXMgPSBbXVxuICAgIE9iamVjdC5rZXlzKHRoaXMuZXJyb3JPYmopLmZvckVhY2goZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgIHZhciBlcnJvcnMgPSB0aGlzLmVycm9yT2JqW2ZpZWxkXVxuICAgICAgbWVzc2FnZXMucHVzaC5hcHBseShtZXNzYWdlcywgVmFsaWRhdGlvbkVycm9yKGVycm9ycykuX19pdGVyX18oKSlcbiAgICB9LmJpbmQodGhpcykpXG4gICAgcmV0dXJuIG1lc3NhZ2VzXG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuX19pdGVyX18oKVxuICB9XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIGFuIG9iamVjdCBvZiBmaWVsZCBlcnJvciBtZXNzYWdzIG9yIGEgbGlzdCBvZiBlcnJvciBtZXNzYWdlc1xuICogZGVwZW5kaW5nIG9uIGhvdyB0aGlzIFZhbGlkYXRpb25FcnJvciBoYXMgYmVlbiBjb25zdHJ1Y3RlZC5cbiAqL1xuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZS5fX2l0ZXJfXyA9IGZ1bmN0aW9uKCkge1xuICBpZiAob2JqZWN0Lmhhc093bih0aGlzLCAnZXJyb3JPYmonKSkge1xuICAgIHZhciBtZXNzYWdlT2JqID0ge31cbiAgICBPYmplY3Qua2V5cyh0aGlzLmVycm9yT2JqKS5mb3JFYWNoKGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICB2YXIgZXJyb3JzID0gdGhpcy5lcnJvck9ialtmaWVsZF1cbiAgICAgIG1lc3NhZ2VPYmpbZmllbGRdID0gVmFsaWRhdGlvbkVycm9yKGVycm9ycykuX19pdGVyX18oKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgICByZXR1cm4gbWVzc2FnZU9ialxuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiB0aGlzLmVycm9yTGlzdC5tYXAoZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgIHZhciBtZXNzYWdlID0gZXJyb3IubWVzc2FnZVxuICAgICAgaWYgKGVycm9yLnBhcmFtcykge1xuICAgICAgICBtZXNzYWdlID0gZm9ybWF0KG1lc3NhZ2UsIGVycm9yLnBhcmFtcylcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZXNzYWdlXG4gICAgfSlcbiAgfVxufVxuXG4vKipcbiAqIFBhc3NlcyB0aGlzIGVycm9yJ3MgbWVzc2FnZXMgb24gdG8gdGhlIGdpdmVuIGVycm9yIG9iamVjdCwgYWRkaW5nIHRvIGFcbiAqIHBhcnRpY3VsYXIgZmllbGQncyBlcnJvciBtZXNzYWdlcyBpZiBhbHJlYWR5IHByZXNlbnQuXG4gKi9cblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUudXBkYXRlRXJyb3JPYmogPSBmdW5jdGlvbihlcnJvck9iaikge1xuICBpZiAob2JqZWN0Lmhhc093bih0aGlzLCAnZXJyb3JPYmonKSkge1xuICAgIGlmIChlcnJvck9iaikge1xuICAgICAgT2JqZWN0LmtleXModGhpcy5lcnJvck9iaikuZm9yRWFjaChmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICBpZiAoIW9iamVjdC5oYXNPd24oZXJyb3JPYmosIGZpZWxkKSkge1xuICAgICAgICAgIGVycm9yT2JqW2ZpZWxkXSA9IFtdXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVycm9ycyA9IGVycm9yT2JqW2ZpZWxkXVxuICAgICAgICBlcnJvcnMucHVzaC5hcHBseShlcnJvcnMsIHRoaXMuZXJyb3JPYmpbZmllbGRdKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGVycm9yT2JqID0gdGhpcy5lcnJvck9ialxuICAgIH1cbiAgfVxuICBlbHNlIHtcbiAgICBpZiAoIW9iamVjdC5oYXNPd24oZXJyb3JPYmosIE5PTl9GSUVMRF9FUlJPUlMpKSB7XG4gICAgICBlcnJvck9ialtOT05fRklFTERfRVJST1JTXSA9IFtdXG4gICAgfVxuICAgIHZhciBub25GaWVsZEVycm9ycyA9IGVycm9yT2JqW05PTl9GSUVMRF9FUlJPUlNdXG4gICAgbm9uRmllbGRFcnJvcnMucHVzaC5hcHBseShub25GaWVsZEVycm9ycywgdGhpcy5lcnJvckxpc3QpXG4gIH1cbiAgcmV0dXJuIGVycm9yT2JqXG59XG5cblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICgnVmFsaWRhdGlvbkVycm9yKCcgKyBKU09OLnN0cmluZ2lmeSh0aGlzLl9faXRlcl9fKCkpICsgJyknKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgVmFsaWRhdGlvbkVycm9yOiBWYWxpZGF0aW9uRXJyb3Jcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG9iamVjdCA9IHJlcXVpcmUoJ2lzb21vcnBoL29iamVjdCcpXG5cbnZhciBlcnJvcnMgPSByZXF1aXJlKCcuL2Vycm9ycycpXG5cbnZhciBWYWxpZGF0aW9uRXJyb3IgPSBlcnJvcnMuVmFsaWRhdGlvbkVycm9yXG5cbnZhciBoZXhSRSA9IC9eWzAtOWEtZl0rJC9cblxuLyoqXG4gKiBDbGVhbnMgYSBJUHY2IGFkZHJlc3Mgc3RyaW5nLlxuICpcbiAqIFZhbGlkaXR5IGlzIGNoZWNrZWQgYnkgY2FsbGluZyBpc1ZhbGlkSVB2NkFkZHJlc3MoKSAtIGlmIGFuIGludmFsaWQgYWRkcmVzc1xuICogaXMgcGFzc2VkLCBhIFZhbGlkYXRpb25FcnJvciBpcyB0aHJvd24uXG4gKlxuICogUmVwbGFjZXMgdGhlIGxvbmdlc3QgY29udGluaW91cyB6ZXJvLXNlcXVlbmNlIHdpdGggJzo6JyBhbmQgcmVtb3ZlcyBsZWFkaW5nXG4gKiB6ZXJvZXMgYW5kIG1ha2VzIHN1cmUgYWxsIGhleHRldHMgYXJlIGxvd2VyY2FzZS5cbiAqL1xuZnVuY3Rpb24gY2xlYW5JUHY2QWRkcmVzcyhpcFN0ciwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgIHVucGFja0lQdjQ6IGZhbHNlLCBlcnJvck1lc3NhZ2U6ICdUaGlzIGlzIG5vdCBhIHZhbGlkIElQdjYgYWRkcmVzcy4nXG4gIH0sIGt3YXJncylcblxuICB2YXIgYmVzdERvdWJsZWNvbG9uU3RhcnQgPSAtMVxuICB2YXIgYmVzdERvdWJsZWNvbG9uTGVuID0gMFxuICB2YXIgZG91YmxlY29sb25TdGFydCA9IC0xXG4gIHZhciBkb3VibGVjb2xvbkxlbiA9IDBcblxuICBpZiAoIWlzVmFsaWRJUHY2QWRkcmVzcyhpcFN0cikpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3Ioa3dhcmdzLmVycm9yTWVzc2FnZSwge2NvZGU6ICdpbnZhbGlkJ30pXG4gIH1cblxuICAvLyBUaGlzIGFsZ29yaXRobSBjYW4gb25seSBoYW5kbGUgZnVsbHkgZXhwbG9kZWQgSVAgc3RyaW5nc1xuICBpcFN0ciA9IF9leHBsb2RlU2hvcnRoYW5kSVBzdHJpbmcoaXBTdHIpXG4gIGlwU3RyID0gX3Nhbml0aXNlSVB2NE1hcHBpbmcoaXBTdHIpXG5cbiAgLy8gSWYgbmVlZGVkLCB1bnBhY2sgdGhlIElQdjQgYW5kIHJldHVybiBzdHJhaWdodCBhd2F5XG4gIGlmIChrd2FyZ3MudW5wYWNrSVB2NCkge1xuICAgIHZhciBpcHY0VW5wYWNrZWQgPSBfdW5wYWNrSVB2NChpcFN0cilcbiAgICBpZiAoaXB2NFVucGFja2VkKSB7XG4gICAgICByZXR1cm4gaXB2NFVucGFja2VkXG4gICAgfVxuICB9XG5cbiAgdmFyIGhleHRldHMgPSBpcFN0ci5zcGxpdCgnOicpXG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBoZXh0ZXRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIC8vIFJlbW92ZSBsZWFkaW5nIHplcm9lc1xuICAgIGhleHRldHNbaV0gPSBoZXh0ZXRzW2ldLnJlcGxhY2UoL14wKy8sICcnKVxuICAgIGlmIChoZXh0ZXRzW2ldID09PSAnJykge1xuICAgICAgaGV4dGV0c1tpXSA9ICcwJ1xuICAgIH1cblxuICAgIC8vIERldGVybWluZSBiZXN0IGhleHRldCB0byBjb21wcmVzc1xuICAgIGlmIChoZXh0ZXRzW2ldID09ICcwJykge1xuICAgICAgZG91YmxlY29sb25MZW4gKz0gMVxuICAgICAgaWYgKGRvdWJsZWNvbG9uU3RhcnQgPT0gLTEpIHtcbiAgICAgICAgLy8gU3RhcnQgYSBzZXF1ZW5jZSBvZiB6ZXJvc1xuICAgICAgICBkb3VibGVjb2xvblN0YXJ0ID0gaVxuICAgICAgfVxuICAgICAgaWYgKGRvdWJsZWNvbG9uTGVuID4gYmVzdERvdWJsZWNvbG9uTGVuKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgdGhlIGxvbmdlc3Qgc2VxdWVuY2Ugc28gZmFyXG4gICAgICAgIGJlc3REb3VibGVjb2xvbkxlbiA9IGRvdWJsZWNvbG9uTGVuXG4gICAgICAgIGJlc3REb3VibGVjb2xvblN0YXJ0ID0gZG91YmxlY29sb25TdGFydFxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGRvdWJsZWNvbG9uTGVuID0gMFxuICAgICAgZG91YmxlY29sb25TdGFydCA9IC0xXG4gICAgfVxuICB9XG5cbiAgLy8gQ29tcHJlc3MgdGhlIG1vc3Qgc3VpdGFibGUgaGV4dGV0XG4gIGlmIChiZXN0RG91YmxlY29sb25MZW4gPiAxKSB7XG4gICAgdmFyIGJlc3REb3VibGVjb2xvbkVuZCA9IGJlc3REb3VibGVjb2xvblN0YXJ0ICsgYmVzdERvdWJsZWNvbG9uTGVuXG4gICAgLy8gRm9yIHplcm9zIGF0IHRoZSBlbmQgb2YgdGhlIGFkZHJlc3NcbiAgICBpZiAoYmVzdERvdWJsZWNvbG9uRW5kID09IGhleHRldHMubGVuZ3RoKSB7XG4gICAgICBoZXh0ZXRzLnB1c2goJycpXG4gICAgfVxuICAgIGhleHRldHMuc3BsaWNlKGJlc3REb3VibGVjb2xvblN0YXJ0LCBiZXN0RG91YmxlY29sb25MZW4sICcnKVxuICAgIC8vIEZvciB6ZXJvcyBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBhZGRyZXNzXG4gICAgaWYgKGJlc3REb3VibGVjb2xvblN0YXJ0ID09PSAwKSB7XG4gICAgICBoZXh0ZXRzLnVuc2hpZnQoJycpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhleHRldHMuam9pbignOicpLnRvTG93ZXJDYXNlKClcbn1cblxuLyoqXG4gKiBTYW5pdGlzZXMgSVB2NCBtYXBwaW5nIGluIGEgZXhwYW5kZWQgSVB2NiBhZGRyZXNzLlxuICpcbiAqIFRoaXMgY29udmVydHMgOjpmZmZmOjBhMGE6MGEwYSB0byA6OmZmZmY6MTAuMTAuMTAuMTAuXG4gKiBJZiB0aGVyZSBpcyBub3RoaW5nIHRvIHNhbml0aXNlLCByZXR1cm5zIGFuIHVuY2hhbmdlZCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIF9zYW5pdGlzZUlQdjRNYXBwaW5nKGlwU3RyKSB7XG4gIGlmIChpcFN0ci50b0xvd2VyQ2FzZSgpLmluZGV4T2YoJzAwMDA6MDAwMDowMDAwOjAwMDA6MDAwMDpmZmZmOicpICE9PSAwKSB7XG4gICAgLy8gTm90IGFuIGlwdjQgbWFwcGluZ1xuICAgIHJldHVybiBpcFN0clxuICB9XG5cbiAgdmFyIGhleHRldHMgPSBpcFN0ci5zcGxpdCgnOicpXG5cbiAgaWYgKGhleHRldHNbaGV4dGV0cy5sZW5ndGggLSAxXS5pbmRleE9mKCcuJykgIT0gLTEpIHtcbiAgICAvLyBBbHJlYWR5IHNhbml0aXplZFxuICAgIHJldHVybiBpcFN0clxuICB9XG5cbiAgdmFyIGlwdjRBZGRyZXNzID0gW1xuICAgIHBhcnNlSW50KGhleHRldHNbNl0uc3Vic3RyaW5nKDAsIDIpLCAxNilcbiAgLCBwYXJzZUludChoZXh0ZXRzWzZdLnN1YnN0cmluZygyLCA0KSwgMTYpXG4gICwgcGFyc2VJbnQoaGV4dGV0c1s3XS5zdWJzdHJpbmcoMCwgMiksIDE2KVxuICAsIHBhcnNlSW50KGhleHRldHNbN10uc3Vic3RyaW5nKDIsIDQpLCAxNilcbiAgXS5qb2luKCcuJylcblxuICByZXR1cm4gaGV4dGV0cy5zbGljZSgwLCA2KS5qb2luKCc6JykgKyAgJzonICsgaXB2NEFkZHJlc3Ncbn1cblxuLyoqXG4gKiBVbnBhY2tzIGFuIElQdjQgYWRkcmVzcyB0aGF0IHdhcyBtYXBwZWQgaW4gYSBjb21wcmVzc2VkIElQdjYgYWRkcmVzcy5cbiAqXG4gKiBUaGlzIGNvbnZlcnRzIDAwMDA6MDAwMDowMDAwOjAwMDA6MDAwMDpmZmZmOjEwLjEwLjEwLjEwIHRvIDEwLjEwLjEwLjEwLlxuICogSWYgdGhlcmUgaXMgbm90aGluZyB0byBzYW5pdGl6ZSwgcmV0dXJucyBudWxsLlxuICovXG5mdW5jdGlvbiBfdW5wYWNrSVB2NChpcFN0cikge1xuICBpZiAoaXBTdHIudG9Mb3dlckNhc2UoKS5pbmRleE9mKCcwMDAwOjAwMDA6MDAwMDowMDAwOjAwMDA6ZmZmZjonKSAhPT0gMCkge1xuICAgIHJldHVybiBudWxsXG4gIH1cblxuICB2YXIgaGV4dGV0cyA9IGlwU3RyLnNwbGl0KCc6JylcbiAgcmV0dXJuIGhleHRldHMucG9wKClcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIHdlIGhhdmUgYSB2YWxpZCBJUHY2IGFkZHJlc3MuXG4gKi9cbmZ1bmN0aW9uIGlzVmFsaWRJUHY2QWRkcmVzcyhpcFN0cikge1xuICB2YXIgdmFsaWRhdGVJUHY0QWRkcmVzcyA9IHJlcXVpcmUoJy4vdmFsaWRhdG9ycycpLnZhbGlkYXRlSVB2NEFkZHJlc3NcblxuICAvLyBXZSBuZWVkIHRvIGhhdmUgYXQgbGVhc3Qgb25lICc6J1xuICBpZiAoaXBTdHIuaW5kZXhPZignOicpID09IC0xKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBXZSBjYW4gb25seSBoYXZlIG9uZSAnOjonIHNob3J0ZW5lclxuICBpZiAoU3RyaW5nX2NvdW50KGlwU3RyLCAnOjonKSA+IDEpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vICc6Oicgc2hvdWxkIGJlIGVuY29tcGFzc2VkIGJ5IHN0YXJ0LCBkaWdpdHMgb3IgZW5kXG4gIGlmIChpcFN0ci5pbmRleE9mKCc6OjonKSAhPSAtMSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gQSBzaW5nbGUgY29sb24gY2FuIG5laXRoZXIgc3RhcnQgbm9yIGVuZCBhbiBhZGRyZXNzXG4gIGlmICgoaXBTdHIuY2hhckF0KDApID09ICc6JyAmJiBpcFN0ci5jaGFyQXQoMSkgIT0gJzonKSB8fFxuICAgICAgKGlwU3RyLmNoYXJBdChpcFN0ci5sZW5ndGggLSAxKSA9PSAnOicgJiZcbiAgICAgICBpcFN0ci5jaGFyQXQoaXBTdHIubGVuZ3RoIC0gMikgIT0gJzonKSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gV2UgY2FuIG5ldmVyIGhhdmUgbW9yZSB0aGFuIDcgJzonICgxOjoyOjM6NDo1OjY6Nzo4IGlzIGludmFsaWQpXG4gIGlmIChTdHJpbmdfY291bnQoaXBTdHIsICc6JykgPiA3KSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBJZiB3ZSBoYXZlIG5vIGNvbmNhdGVuYXRpb24sIHdlIG5lZWQgdG8gaGF2ZSA4IGZpZWxkcyB3aXRoIDcgJzonXG4gIGlmIChpcFN0ci5pbmRleE9mKCc6OicpID09IC0xICYmIFN0cmluZ19jb3VudChpcFN0ciwgJzonKSAhPSA3KSB7XG4gICAgLy8gV2UgbWlnaHQgaGF2ZSBhbiBJUHY0IG1hcHBlZCBhZGRyZXNzXG4gICAgaWYgKFN0cmluZ19jb3VudChpcFN0ciwgJy4nKSAhPSAzKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cblxuICBpcFN0ciA9IF9leHBsb2RlU2hvcnRoYW5kSVBzdHJpbmcoaXBTdHIpXG5cbiAgLy8gTm93IHRoYXQgd2UgaGF2ZSB0aGF0IGFsbCBzcXVhcmVkIGF3YXksIGxldCdzIGNoZWNrIHRoYXQgZWFjaCBvZiB0aGVcbiAgLy8gaGV4dGV0cyBhcmUgYmV0d2VlbiAweDAgYW5kIDB4RkZGRi5cbiAgdmFyIGhleHRldHMgPSBpcFN0ci5zcGxpdCgnOicpXG4gIGZvciAodmFyIGkgPSAwLCBsID0gaGV4dGV0cy5sZW5ndGgsIGhleHRldDsgaSA8IGw7IGkrKykge1xuICAgIGhleHRldCA9IGhleHRldHNbaV1cbiAgICBpZiAoU3RyaW5nX2NvdW50KGhleHRldCwgJy4nKSA9PSAzKSB7XG4gICAgICAvLyBJZiB3ZSBoYXZlIGFuIElQdjQgbWFwcGVkIGFkZHJlc3MsIHRoZSBJUHY0IHBvcnRpb24gaGFzIHRvXG4gICAgICAvLyBiZSBhdCB0aGUgZW5kIG9mIHRoZSBJUHY2IHBvcnRpb24uXG4gICAgICBpZiAoaXBTdHIuc3BsaXQoJzonKS5wb3AoKSAhPSBoZXh0ZXQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICB2YWxpZGF0ZUlQdjRBZGRyZXNzKGhleHRldClcbiAgICAgIH1cbiAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7XG4gICAgICAgICAgdGhyb3cgZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmICghaGV4UkUudGVzdChoZXh0ZXQpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgICAgdmFyIGludFZhbHVlID0gcGFyc2VJbnQoaGV4dGV0LCAxNilcbiAgICAgIGlmIChpc05hTihpbnRWYWx1ZSkgfHwgaW50VmFsdWUgPCAweDAgfHwgaW50VmFsdWUgPiAweEZGRkYpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWVcbn1cblxuLyoqXG4gKiBFeHBhbmRzIGEgc2hvcnRlbmVkIElQdjYgYWRkcmVzcy5cbiAqL1xuZnVuY3Rpb24gX2V4cGxvZGVTaG9ydGhhbmRJUHN0cmluZyhpcFN0cikge1xuICBpZiAoIV9pc1Nob3J0SGFuZChpcFN0cikpIHtcbiAgICAvLyBXZSd2ZSBhbHJlYWR5IGdvdCBhIGxvbmdoYW5kIGlwU3RyXG4gICAgcmV0dXJuIGlwU3RyXG4gIH1cblxuICB2YXIgbmV3SXAgPSBbXVxuICB2YXIgaGV4dGV0cyA9IGlwU3RyLnNwbGl0KCc6OicpXG5cbiAgLy8gSWYgdGhlcmUgaXMgYSA6Oiwgd2UgbmVlZCB0byBleHBhbmQgaXQgd2l0aCB6ZXJvZXMgdG8gZ2V0IHRvIDggaGV4dGV0cyAtXG4gIC8vIHVubGVzcyB0aGVyZSBpcyBhIGRvdCBpbiB0aGUgbGFzdCBoZXh0ZXQsIG1lYW5pbmcgd2UncmUgZG9pbmcgdjQtbWFwcGluZ1xuICB2YXIgZmlsbFRvID0gKGlwU3RyLnNwbGl0KCc6JykucG9wKCkuaW5kZXhPZignLicpICE9IC0xKSA/IDcgOiA4XG5cbiAgaWYgKGhleHRldHMubGVuZ3RoID4gMSkge1xuICAgIHZhciBzZXAgPSBoZXh0ZXRzWzBdLnNwbGl0KCc6JykubGVuZ3RoICsgaGV4dGV0c1sxXS5zcGxpdCgnOicpLmxlbmd0aFxuICAgIG5ld0lwID0gaGV4dGV0c1swXS5zcGxpdCgnOicpXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBmaWxsVG8gLSBzZXA7IGkgPCBsOyBpKyspIHtcbiAgICAgIG5ld0lwLnB1c2goJzAwMDAnKVxuICAgIH1cbiAgICBuZXdJcCA9IG5ld0lwLmNvbmNhdChoZXh0ZXRzWzFdLnNwbGl0KCc6JykpXG4gIH1cbiAgZWxzZSB7XG4gICAgbmV3SXAgPSBpcFN0ci5zcGxpdCgnOicpXG4gIH1cblxuICAvLyBOb3cgbmVlZCB0byBtYWtlIHN1cmUgZXZlcnkgaGV4dGV0IGlzIDQgbG93ZXIgY2FzZSBjaGFyYWN0ZXJzLlxuICAvLyBJZiBhIGhleHRldCBpcyA8IDQgY2hhcmFjdGVycywgd2UndmUgZ290IG1pc3NpbmcgbGVhZGluZyAwJ3MuXG4gIHZhciByZXRJcCA9IFtdXG4gIGZvciAoaSA9IDAsIGwgPSBuZXdJcC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICByZXRJcC5wdXNoKHplcm9QYWRkaW5nKG5ld0lwW2ldLCA0KSArIG5ld0lwW2ldLnRvTG93ZXJDYXNlKCkpXG4gIH1cbiAgcmV0dXJuIHJldElwLmpvaW4oJzonKVxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhlIGFkZHJlc3MgaXMgc2hvcnRlbmVkLlxuICovXG5mdW5jdGlvbiBfaXNTaG9ydEhhbmQoaXBTdHIpIHtcbiAgaWYgKFN0cmluZ19jb3VudChpcFN0ciwgJzo6JykgPT0gMSkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgdmFyIHBhcnRzID0gaXBTdHIuc3BsaXQoJzonKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHBhcnRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChwYXJ0c1tpXS5sZW5ndGggPCA0KSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLy8gVXRpbGl0aWVzXG5cbmZ1bmN0aW9uIHplcm9QYWRkaW5nKHN0ciwgbGVuZ3RoKSB7XG4gIGlmIChzdHIubGVuZ3RoID49IGxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG4gIHJldHVybiBuZXcgQXJyYXkobGVuZ3RoIC0gc3RyLmxlbmd0aCArIDEpLmpvaW4oJzAnKVxufVxuXG5mdW5jdGlvbiBTdHJpbmdfY291bnQoc3RyLCBzdWJTdHIpIHtcbiAgcmV0dXJuIHN0ci5zcGxpdChzdWJTdHIpLmxlbmd0aCAtIDFcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNsZWFuSVB2NkFkZHJlc3M6IGNsZWFuSVB2NkFkZHJlc3NcbiwgaXNWYWxpZElQdjZBZGRyZXNzOiBpc1ZhbGlkSVB2NkFkZHJlc3Ncbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbmN1ciA9IHJlcXVpcmUoJ0NvbmN1cicpXG52YXIgaXMgPSByZXF1aXJlKCdpc29tb3JwaC9pcycpXG52YXIgb2JqZWN0ID0gcmVxdWlyZSgnaXNvbW9ycGgvb2JqZWN0JylcbnZhciBwdW55Y29kZSA9IHJlcXVpcmUoJ3B1bnljb2RlJylcbnZhciB1cmwgPSByZXF1aXJlKCdpc29tb3JwaC91cmwnKVxuXG52YXIgZXJyb3JzID0gcmVxdWlyZSgnLi9lcnJvcnMnKVxudmFyIGlwdjYgPSByZXF1aXJlKCcuL2lwdjYnKVxuXG52YXIgVmFsaWRhdGlvbkVycm9yID0gZXJyb3JzLlZhbGlkYXRpb25FcnJvclxudmFyIGlzVmFsaWRJUHY2QWRkcmVzcyA9IGlwdjYuaXNWYWxpZElQdjZBZGRyZXNzXG5cbnZhciBFTVBUWV9WQUxVRVMgPSBbbnVsbCwgdW5kZWZpbmVkLCAnJ11cblxuZnVuY3Rpb24gU3RyaW5nX3JzcGxpdChzdHIsIHNlcCwgbWF4c3BsaXQpIHtcbiAgdmFyIHNwbGl0ID0gc3RyLnNwbGl0KHNlcClcbiAgcmV0dXJuIG1heHNwbGl0ID8gW3NwbGl0LnNsaWNlKDAsIC1tYXhzcGxpdCkuam9pbihzZXApXS5jb25jYXQoc3BsaXQuc2xpY2UoLW1heHNwbGl0KSkgOiBzcGxpdFxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGlucHV0IG1hdGNoZXMgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKi9cbnZhciBSZWdleFZhbGlkYXRvciA9IENvbmN1ci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJlZ2V4VmFsaWRhdG9yKSkgeyByZXR1cm4gbmV3IFJlZ2V4VmFsaWRhdG9yKGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgICAgcmVnZXg6IG51bGwsIG1lc3NhZ2U6IG51bGwsIGNvZGU6IG51bGwsIGludmVyc2VNYXRjaDogbnVsbFxuICAgIH0sIGt3YXJncylcbiAgICBpZiAoa3dhcmdzLnJlZ2V4KSB7XG4gICAgICB0aGlzLnJlZ2V4ID0ga3dhcmdzLnJlZ2V4XG4gICAgfVxuICAgIGlmIChrd2FyZ3MubWVzc2FnZSkge1xuICAgICAgdGhpcy5tZXNzYWdlID0ga3dhcmdzLm1lc3NhZ2VcbiAgICB9XG4gICAgaWYgKGt3YXJncy5jb2RlKSB7XG4gICAgICB0aGlzLmNvZGUgPSBrd2FyZ3MuY29kZVxuICAgIH1cbiAgICBpZiAoa3dhcmdzLmludmVyc2VNYXRjaCkge1xuICAgICAgdGhpcy5pbnZlcnNlTWF0Y2ggPSBrd2FyZ3MuaW52ZXJzZU1hdGNoXG4gICAgfVxuICAgIC8vIENvbXBpbGUgdGhlIHJlZ2V4IGlmIGl0IHdhcyBub3QgcGFzc2VkIHByZS1jb21waWxlZFxuICAgIGlmIChpcy5TdHJpbmcodGhpcy5yZWdleCkpIHtcbiAgICAgIHRoaXMucmVnZXggPSBuZXcgUmVnRXhwKHRoaXMucmVnZXgpXG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9fY2FsbF9fLmJpbmQodGhpcylcbiAgfVxuLCByZWdleDogJydcbiwgbWVzc2FnZTogJ0VudGVyIGEgdmFsaWQgdmFsdWUuJ1xuLCBjb2RlOiAnaW52YWxpZCdcbiwgaW52ZXJzZU1hdGNoOiBmYWxzZVxuLCBfX2NhbGxfXzogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodGhpcy5pbnZlcnNlTWF0Y2ggPT09IHRoaXMucmVnZXgudGVzdCgnJyt2YWx1ZSkpIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLm1lc3NhZ2UsIHtjb2RlOiB0aGlzLmNvZGV9KVxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBsb29rcyBsaWtlIGEgdmFsaWQgVVJMLlxuICovXG52YXIgVVJMVmFsaWRhdG9yID0gUmVnZXhWYWxpZGF0b3IuZXh0ZW5kKHtcbiAgcmVnZXg6IG5ldyBSZWdFeHAoXG4gICAgJ14oPzpbYS16MC05XFxcXC5cXFxcLV0qKTovLycgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2NoZW1hIGlzIHZhbGlkYXRlZCBzZXBhcmF0ZWx5XG4gICsgJyg/Oig/OltBLVowLTldKD86W0EtWjAtOS1dezAsNjF9W0EtWjAtOV0pP1xcXFwuKSsoPzpbQS1aXXsyLDZ9XFxcXC4/fFtBLVowLTktXXsyLH1cXFxcLj8pfCcgLy8gRG9tYWluLi4uXG4gICsgJ2xvY2FsaG9zdHwnICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsb2NhbGhvc3QuLi5cbiAgKyAnXFxcXGR7MSwzfVxcXFwuXFxcXGR7MSwzfVxcXFwuXFxcXGR7MSwzfVxcXFwuXFxcXGR7MSwzfXwnICAgICAgLy8gLi4ub3IgSVB2NFxuICArICdcXFxcWz9bQS1GMC05XSo6W0EtRjAtOTpdK1xcXFxdPyknICAgICAgICAgICAgICAgICAgIC8vIC4uLm9yIElQdjZcbiAgKyAnKD86OlxcXFxkKyk/JyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT3B0aW9uYWwgcG9ydFxuICArICcoPzovP3xbLz9dXFxcXFMrKSQnXG4gICwgJ2knXG4gIClcbiwgbWVzc2FnZTogJ0VudGVyIGEgdmFsaWQgVVJMLidcbiwgc2NoZW1lczogWydodHRwJywgJ2h0dHBzJywgJ2Z0cCcsICdmdHBzJ11cblxuLCBjb25zdHJ1Y3RvcjpmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgVVJMVmFsaWRhdG9yKSkgeyByZXR1cm4gbmV3IFVSTFZhbGlkYXRvcihrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtzY2hlbWVzOiBudWxsfSwga3dhcmdzKVxuICAgIFJlZ2V4VmFsaWRhdG9yLmNhbGwodGhpcywga3dhcmdzKVxuICAgIGlmIChrd2FyZ3Muc2NoZW1lcyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5zY2hlbWVzID0ga3dhcmdzLnNjaGVtZXNcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX19jYWxsX18uYmluZCh0aGlzKVxuICB9XG5cbiwgX19jYWxsX186IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFsdWUgPSAnJyt2YWx1ZVxuICAgIC8vIENoZWNrIGlmIHRoZSBzY2hlbWUgaXMgdmFsaWQgZmlyc3RcbiAgICB2YXIgc2NoZW1lID0gdmFsdWUuc3BsaXQoJzovLycpWzBdLnRvTG93ZXJDYXNlKClcbiAgICBpZiAodGhpcy5zY2hlbWVzLmluZGV4T2Yoc2NoZW1lKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLm1lc3NhZ2UsIHtjb2RlOiB0aGlzLmNvZGV9KVxuICAgIH1cblxuICAgIC8vIENoZWNrIHRoZSBmdWxsIFVSTFxuICAgIHRyeSB7XG4gICAgICBSZWdleFZhbGlkYXRvci5wcm90b3R5cGUuX19jYWxsX18uY2FsbCh0aGlzLCB2YWx1ZSlcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7IHRocm93IGUgfVxuXG4gICAgICAvLyBUcml2aWFsIGNhc2UgZmFpbGVkIC0gdHJ5IGZvciBwb3NzaWJsZSBJRE4gZG9tYWluXG4gICAgICB2YXIgdXJsRmllbGRzID0gdXJsLnBhcnNlVXJpKHZhbHVlKVxuICAgICAgdHJ5IHtcbiAgICAgICAgdXJsRmllbGRzLmhvc3QgPSBwdW55Y29kZS50b0FTQ0lJKHVybEZpZWxkcy5ob3N0KVxuICAgICAgfVxuICAgICAgY2F0Y2ggKHVuaWNvZGVFcnJvcikge1xuICAgICAgICB0aHJvdyBlXG4gICAgICB9XG4gICAgICB2YWx1ZSA9IHVybC5tYWtlVXJpKHVybEZpZWxkcylcbiAgICAgIFJlZ2V4VmFsaWRhdG9yLnByb3RvdHlwZS5fX2NhbGxfXy5jYWxsKHRoaXMsIHZhbHVlKVxuICAgIH1cbiAgfVxufSlcblxuLyoqIFZhbGlkYXRlcyB0aGF0IGlucHV0IGxvb2tzIGxpa2UgYSB2YWxpZCBlLW1haWwgYWRkcmVzcy4gKi9cbnZhciBFbWFpbFZhbGlkYXRvciA9IENvbmN1ci5leHRlbmQoe1xuICBtZXNzYWdlOiAnRW50ZXIgYSB2YWxpZCBlbWFpbCBhZGRyZXNzLidcbiwgY29kZTogJ2ludmFsaWQnXG4sIHVzZXJSZWdleDogbmV3IFJlZ0V4cChcbiAgICBcIiheWy0hIyQlJicqKy89P15fYHt9fH4wLTlBLVpdKyhcXFxcLlstISMkJSYnKisvPT9eX2B7fXx+MC05QS1aXSspKiRcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvdC1hdG9tXG4gICsgJ3xeXCIoW1xcXFwwMDEtXFxcXDAxMFxcXFwwMTNcXFxcMDE0XFxcXDAxNi1cXFxcMDM3ISMtXFxcXFtcXFxcXS1cXFxcMTc3XXxcXFxcXFxcXFtcXFxcMDAxLVxcXFwwMTFcXFxcMDEzXFxcXDAxNFxcXFwwMTYtXFxcXDE3N10pKlwiJCknIC8vIFF1b3RlZC1zdHJpbmdcbiAgLCAnaScpXG4sIGRvbWFpblJlZ2V4OiBuZXcgUmVnRXhwKFxuICAgICdeKD86W0EtWjAtOV0oPzpbQS1aMC05LV17MCw2MX1bQS1aMC05XSk/XFxcXC4pKyg/OltBLVpdezIsNn18W0EtWjAtOS1dezIsfSkkJyAgICAgICAgICAvLyBEb21haW5cbiAgKyAnfF5cXFxcWygyNVswLTVdfDJbMC00XVxcXFxkfFswLTFdP1xcXFxkP1xcXFxkKShcXFxcLigyNVswLTVdfDJbMC00XVxcXFxkfFswLTFdP1xcXFxkP1xcXFxkKSl7M31cXFxcXSQnIC8vIExpdGVyYWwgZm9ybSwgaXB2NCBhZGRyZXNzIChTTVRQIDQuMS4zKVxuICAsICdpJylcbiwgZG9tYWluV2hpdGVsaXN0OiBbJ2xvY2FsaG9zdCddXG5cbiwgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBFbWFpbFZhbGlkYXRvcikpIHsgcmV0dXJuIG5ldyBFbWFpbFZhbGlkYXRvcihrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHttZXNzYWdlOiBudWxsLCBjb2RlOiBudWxsLCB3aGl0ZWxpc3Q6IG51bGx9LCBrd2FyZ3MpXG4gICAgaWYgKGt3YXJncy5tZXNzYWdlICE9PSBudWxsKSB7XG4gICAgICB0aGlzLm1lc3NhZ2UgPSBrd2FyZ3MubWVzc2FnZVxuICAgIH1cbiAgICBpZiAoa3dhcmdzLmNvZGUgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY29kZSA9IGt3YXJncy5jb2RlXG4gICAgfVxuICAgIGlmIChrd2FyZ3Mud2hpdGVsaXN0ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmRvbWFpbldoaXRlbGlzdCA9IGt3YXJncy53aGl0ZWxpc3RcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX19jYWxsX18uYmluZCh0aGlzKVxuICB9XG5cbiwgX19jYWxsX18gOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhbHVlID0gJycrdmFsdWVcblxuICAgIGlmICghdmFsdWUgfHwgdmFsdWUuaW5kZXhPZignQCcpID09IC0xKSB7XG4gICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5tZXNzYWdlLCB7Y29kZTogdGhpcy5jb2RlfSlcbiAgICB9XG5cbiAgICB2YXIgcGFydHMgPSBTdHJpbmdfcnNwbGl0KHZhbHVlLCAnQCcsIDEpXG4gICAgdmFyIHVzZXJQYXJ0ID0gcGFydHNbMF1cbiAgICB2YXIgZG9tYWluUGFydCA9IHBhcnRzWzFdXG5cbiAgICBpZiAoIXRoaXMudXNlclJlZ2V4LnRlc3QodXNlclBhcnQpKSB7XG4gICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5tZXNzYWdlLCB7Y29kZTogdGhpcy5jb2RlfSlcbiAgICB9XG5cbiAgICBpZiAodGhpcy5kb21haW5XaGl0ZWxpc3QuaW5kZXhPZihkb21haW5QYXJ0KSA9PSAtMSAmJlxuICAgICAgICAhdGhpcy5kb21haW5SZWdleC50ZXN0KGRvbWFpblBhcnQpKSB7XG4gICAgICAvLyBUcnkgZm9yIHBvc3NpYmxlIElETiBkb21haW4tcGFydFxuICAgICAgdHJ5IHtcbiAgICAgICAgZG9tYWluUGFydCA9IHB1bnljb2RlLnRvQVNDSUkoZG9tYWluUGFydClcbiAgICAgICAgaWYgKHRoaXMuZG9tYWluUmVnZXgudGVzdChkb21haW5QYXJ0KSkge1xuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjYXRjaCAodW5pY29kZUVycm9yKSB7XG4gICAgICAgIC8vIFBhc3MgdGhyb3VnaCB0byB0aHJvdyB0aGUgVmFsaWRhdGlvbkVycm9yXG4gICAgICB9XG4gICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5tZXNzYWdlLCB7Y29kZTogdGhpcy5jb2RlfSlcbiAgICB9XG4gIH1cbn0pXG5cbnZhciB2YWxpZGF0ZUVtYWlsID0gRW1haWxWYWxpZGF0b3IoKVxuXG52YXIgU0xVR19SRSA9IC9eWy1hLXpBLVowLTlfXSskL1xuLyoqIFZhbGlkYXRlcyB0aGF0IGlucHV0IGlzIGEgdmFsaWQgc2x1Zy4gKi9cbnZhciB2YWxpZGF0ZVNsdWcgPSBSZWdleFZhbGlkYXRvcih7XG4gIHJlZ2V4OiBTTFVHX1JFXG4sIG1lc3NhZ2U6ICdFbnRlciBhIHZhbGlkIFwic2x1Z1wiIGNvbnNpc3Rpbmcgb2YgbGV0dGVycywgbnVtYmVycywgdW5kZXJzY29yZXMgb3IgaHlwaGVucy4nXG4sIGNvZGU6ICdpbnZhbGlkJ1xufSlcblxudmFyIElQVjRfUkUgPSAvXigyNVswLTVdfDJbMC00XVxcZHxbMC0xXT9cXGQ/XFxkKShcXC4oMjVbMC01XXwyWzAtNF1cXGR8WzAtMV0/XFxkP1xcZCkpezN9JC9cbi8qKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBpcyBhIHZhbGlkIElQdjQgYWRkcmVzcy4gKi9cbnZhciB2YWxpZGF0ZUlQdjRBZGRyZXNzID0gUmVnZXhWYWxpZGF0b3Ioe1xuICByZWdleDogSVBWNF9SRVxuLCBtZXNzYWdlOiAnRW50ZXIgYSB2YWxpZCBJUHY0IGFkZHJlc3MuJ1xuLCBjb2RlOiAnaW52YWxpZCdcbn0pXG5cbi8qKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBpcyBhIHZhbGlkIElQdjYgYWRkcmVzcy4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlSVB2NkFkZHJlc3ModmFsdWUpIHtcbiAgaWYgKCFpc1ZhbGlkSVB2NkFkZHJlc3ModmFsdWUpKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKCdFbnRlciBhIHZhbGlkIElQdjYgYWRkcmVzcy4nLCB7Y29kZTogJ2ludmFsaWQnfSlcbiAgfVxufVxuXG4vKiogVmFsaWRhdGVzIHRoYXQgaW5wdXQgaXMgYSB2YWxpZCBJUHY0IG9yIElQdjYgYWRkcmVzcy4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlSVB2NDZBZGRyZXNzKHZhbHVlKSB7XG4gIHRyeSB7XG4gICAgdmFsaWRhdGVJUHY0QWRkcmVzcyh2YWx1ZSlcbiAgfVxuICBjYXRjaCAoZSkge1xuICAgIGlmICghKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7IHRocm93IGUgfVxuICAgIHRyeSB7XG4gICAgICB2YWxpZGF0ZUlQdjZBZGRyZXNzKHZhbHVlKVxuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHsgdGhyb3cgZSB9XG4gICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IoJ0VudGVyIGEgdmFsaWQgSVB2NCBvciBJUHY2IGFkZHJlc3MuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Y29kZTogJ2ludmFsaWQnfSlcbiAgICB9XG4gIH1cbn1cblxudmFyIGlwQWRkcmVzc1ZhbGlkYXRvckxvb2t1cCA9IHtcbiAgYm90aDoge3ZhbGlkYXRvcnM6IFt2YWxpZGF0ZUlQdjQ2QWRkcmVzc10sIG1lc3NhZ2U6ICdFbnRlciBhIHZhbGlkIElQdjQgb3IgSVB2NiBhZGRyZXNzLid9XG4sIGlwdjQ6IHt2YWxpZGF0b3JzOiBbdmFsaWRhdGVJUHY0QWRkcmVzc10sIG1lc3NhZ2U6ICdFbnRlciBhIHZhbGlkIElQdjQgYWRkcmVzcy4nfVxuLCBpcHY2OiB7dmFsaWRhdG9yczogW3ZhbGlkYXRlSVB2NkFkZHJlc3NdLCBtZXNzYWdlOiAnRW50ZXIgYSB2YWxpZCBJUHY2IGFkZHJlc3MuJ31cbn1cblxuLyoqXG4gKiBEZXBlbmRpbmcgb24gdGhlIGdpdmVuIHBhcmFtZXRlcnMgcmV0dXJucyB0aGUgYXBwcm9wcmlhdGUgdmFsaWRhdG9ycyBmb3JcbiAqIGEgR2VuZXJpY0lQQWRkcmVzc0ZpZWxkLlxuICovXG5mdW5jdGlvbiBpcEFkZHJlc3NWYWxpZGF0b3JzKHByb3RvY29sLCB1bnBhY2tJUHY0KSB7XG4gIGlmIChwcm90b2NvbCAhPSAnYm90aCcgJiYgdW5wYWNrSVB2NCkge1xuICAgIHRocm93IG5ldyBFcnJvcignWW91IGNhbiBvbmx5IHVzZSB1bnBhY2tJUHY0IGlmIHByb3RvY29sIGlzIHNldCB0byBcImJvdGhcIicpXG4gIH1cbiAgcHJvdG9jb2wgPSBwcm90b2NvbC50b0xvd2VyQ2FzZSgpXG4gIGlmICh0eXBlb2YgaXBBZGRyZXNzVmFsaWRhdG9yTG9va3VwW3Byb3RvY29sXSA9PSAndW5kZWZpbmVkJykge1xuICAgIHRocm93IG5ldyBFcnJvcignVGhlIHByb3RvY29sIFwiJyArIHByb3RvY29sICsnXCIgaXMgdW5rbm93bicpXG4gIH1cbiAgcmV0dXJuIGlwQWRkcmVzc1ZhbGlkYXRvckxvb2t1cFtwcm90b2NvbF1cbn1cblxudmFyIENPTU1BX1NFUEFSQVRFRF9JTlRfTElTVF9SRSA9IC9eW1xcZCxdKyQvXG4vKiogVmFsaWRhdGVzIHRoYXQgaW5wdXQgaXMgYSBjb21tYS1zZXBhcmF0ZWQgbGlzdCBvZiBpbnRlZ2Vycy4gKi9cbnZhciB2YWxpZGF0ZUNvbW1hU2VwYXJhdGVkSW50ZWdlckxpc3QgPSBSZWdleFZhbGlkYXRvcih7XG4gIHJlZ2V4OiBDT01NQV9TRVBBUkFURURfSU5UX0xJU1RfUkVcbiwgbWVzc2FnZTogJ0VudGVyIG9ubHkgZGlnaXRzIHNlcGFyYXRlZCBieSBjb21tYXMuJ1xuLCBjb2RlOiAnaW52YWxpZCdcbn0pXG5cbi8qKlxuICogQmFzZSBmb3IgdmFsaWRhdG9ycyB3aGljaCBjb21wYXJlIGlucHV0IGFnYWluc3QgYSBnaXZlbiB2YWx1ZS5cbiAqL1xudmFyIEJhc2VWYWxpZGF0b3IgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGxpbWl0VmFsdWUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQmFzZVZhbGlkYXRvcikpIHsgcmV0dXJuIG5ldyBCYXNlVmFsaWRhdG9yKGxpbWl0VmFsdWUpIH1cbiAgICB0aGlzLmxpbWl0VmFsdWUgPSBsaW1pdFZhbHVlXG4gICAgcmV0dXJuIHRoaXMuX19jYWxsX18uYmluZCh0aGlzKVxuICB9XG4sIGNvbXBhcmU6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgIT09IGIgfVxuLCBjbGVhbjogZnVuY3Rpb24oeCkgeyByZXR1cm4geCB9XG4sIG1lc3NhZ2U6ICdFbnN1cmUgdGhpcyB2YWx1ZSBpcyB7bGltaXRWYWx1ZX0gKGl0IGlzIHtzaG93VmFsdWV9KS4nXG4sIGNvZGU6ICdsaW1pdFZhbHVlJ1xuLCBfX2NhbGxfXzogZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgY2xlYW5lZCA9IHRoaXMuY2xlYW4odmFsdWUpXG4gICAgdmFyIHBhcmFtcyA9IHtsaW1pdFZhbHVlOiB0aGlzLmxpbWl0VmFsdWUsIHNob3dWYWx1ZTogY2xlYW5lZH1cbiAgICBpZiAodGhpcy5jb21wYXJlKGNsZWFuZWQsIHRoaXMubGltaXRWYWx1ZSkpIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLm1lc3NhZ2UsIHtjb2RlOiB0aGlzLmNvZGUsIHBhcmFtczogcGFyYW1zfSlcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaW5wdXQgaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvIGEgZ2l2ZW4gdmFsdWUuXG4gKi9cbnZhciBNYXhWYWx1ZVZhbGlkYXRvciA9IEJhc2VWYWxpZGF0b3IuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGxpbWl0VmFsdWUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTWF4VmFsdWVWYWxpZGF0b3IpKSB7IHJldHVybiBuZXcgTWF4VmFsdWVWYWxpZGF0b3IobGltaXRWYWx1ZSkgfVxuICAgIHJldHVybiBCYXNlVmFsaWRhdG9yLmNhbGwodGhpcywgbGltaXRWYWx1ZSlcbiAgfVxuLCBjb21wYXJlOiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhID4gYiB9XG4sIG1lc3NhZ2U6ICdFbnN1cmUgdGhpcyB2YWx1ZSBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8ge2xpbWl0VmFsdWV9LidcbiwgY29kZTogJ21heFZhbHVlJ1xufSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gYSBnaXZlbiB2YWx1ZS5cbiAqL1xudmFyIE1pblZhbHVlVmFsaWRhdG9yID0gQmFzZVZhbGlkYXRvci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24obGltaXRWYWx1ZSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNaW5WYWx1ZVZhbGlkYXRvcikpIHsgcmV0dXJuIG5ldyBNaW5WYWx1ZVZhbGlkYXRvcihsaW1pdFZhbHVlKSB9XG4gICAgcmV0dXJuIEJhc2VWYWxpZGF0b3IuY2FsbCh0aGlzLCBsaW1pdFZhbHVlKVxuICB9XG4sIGNvbXBhcmU6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPCBiIH1cbiwgbWVzc2FnZTogJ0Vuc3VyZSB0aGlzIHZhbHVlIGlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byB7bGltaXRWYWx1ZX0uJ1xuLCBjb2RlOiAnbWluVmFsdWUnXG59KVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGlucHV0IGlzIGF0IGxlYXN0IGEgZ2l2ZW4gbGVuZ3RoLlxuICovXG52YXIgTWluTGVuZ3RoVmFsaWRhdG9yID0gQmFzZVZhbGlkYXRvci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24obGltaXRWYWx1ZSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNaW5MZW5ndGhWYWxpZGF0b3IpKSB7IHJldHVybiBuZXcgTWluTGVuZ3RoVmFsaWRhdG9yKGxpbWl0VmFsdWUpIH1cbiAgICByZXR1cm4gQmFzZVZhbGlkYXRvci5jYWxsKHRoaXMsIGxpbWl0VmFsdWUpXG4gIH1cbiwgY29tcGFyZTogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gYSA8IGIgfVxuLCBjbGVhbjogZnVuY3Rpb24oeCkgeyByZXR1cm4geC5sZW5ndGggfVxuLCBtZXNzYWdlOiAnRW5zdXJlIHRoaXMgdmFsdWUgaGFzIGF0IGxlYXN0IHtsaW1pdFZhbHVlfSBjaGFyYWN0ZXJzIChpdCBoYXMge3Nob3dWYWx1ZX0pLidcbiwgY29kZTogJ21pbkxlbmd0aCdcbn0pXG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaW5wdXQgaXMgYXQgbW9zdCBhIGdpdmVuIGxlbmd0aC5cbiAqL1xudmFyIE1heExlbmd0aFZhbGlkYXRvciA9IEJhc2VWYWxpZGF0b3IuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGxpbWl0VmFsdWUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTWF4TGVuZ3RoVmFsaWRhdG9yKSkgeyByZXR1cm4gbmV3IE1heExlbmd0aFZhbGlkYXRvcihsaW1pdFZhbHVlKSB9XG4gICAgcmV0dXJuIEJhc2VWYWxpZGF0b3IuY2FsbCh0aGlzLCBsaW1pdFZhbHVlKVxuICB9XG4sIGNvbXBhcmU6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPiBiIH1cbiwgY2xlYW46IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubGVuZ3RoIH1cbiwgbWVzc2FnZTogJ0Vuc3VyZSB0aGlzIHZhbHVlIGhhcyBhdCBtb3N0IHtsaW1pdFZhbHVlfSBjaGFyYWN0ZXJzIChpdCBoYXMge3Nob3dWYWx1ZX0pLidcbiwgY29kZTogJ21heExlbmd0aCdcbn0pXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBFTVBUWV9WQUxVRVM6IEVNUFRZX1ZBTFVFU1xuLCBSZWdleFZhbGlkYXRvcjogUmVnZXhWYWxpZGF0b3JcbiwgVVJMVmFsaWRhdG9yOiBVUkxWYWxpZGF0b3JcbiwgRW1haWxWYWxpZGF0b3I6IEVtYWlsVmFsaWRhdG9yXG4sIHZhbGlkYXRlRW1haWw6IHZhbGlkYXRlRW1haWxcbiwgdmFsaWRhdGVTbHVnOiB2YWxpZGF0ZVNsdWdcbiwgdmFsaWRhdGVJUHY0QWRkcmVzczogdmFsaWRhdGVJUHY0QWRkcmVzc1xuLCB2YWxpZGF0ZUlQdjZBZGRyZXNzOiB2YWxpZGF0ZUlQdjZBZGRyZXNzXG4sIHZhbGlkYXRlSVB2NDZBZGRyZXNzOiB2YWxpZGF0ZUlQdjQ2QWRkcmVzc1xuLCBpcEFkZHJlc3NWYWxpZGF0b3JzOiBpcEFkZHJlc3NWYWxpZGF0b3JzXG4sIHZhbGlkYXRlQ29tbWFTZXBhcmF0ZWRJbnRlZ2VyTGlzdDogdmFsaWRhdGVDb21tYVNlcGFyYXRlZEludGVnZXJMaXN0XG4sIEJhc2VWYWxpZGF0b3I6IEJhc2VWYWxpZGF0b3JcbiwgTWF4VmFsdWVWYWxpZGF0b3I6IE1heFZhbHVlVmFsaWRhdG9yXG4sIE1pblZhbHVlVmFsaWRhdG9yOiBNaW5WYWx1ZVZhbGlkYXRvclxuLCBNYXhMZW5ndGhWYWxpZGF0b3I6IE1heExlbmd0aFZhbGlkYXRvclxuLCBNaW5MZW5ndGhWYWxpZGF0b3I6IE1pbkxlbmd0aFZhbGlkYXRvclxuLCBWYWxpZGF0aW9uRXJyb3I6IFZhbGlkYXRpb25FcnJvclxuLCBpcHY2OiBpcHY2XG59XG4iXX0=
(5)
});
