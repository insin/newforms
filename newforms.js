/**
 * newforms 0.5.0-dev - https://github.com/insin/newforms
 * MIT Licensed
 */
!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.forms=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Concur = require('Concur')
  , is = require('isomorph/is')
  , format = require('isomorph/format').formatObj
  , object = require('isomorph/object')
  , time = require('isomorph/time')
  , url = require('isomorph/url')
  , validators = require('validators')

var util = require('./util')
  , widgets = require('./widgets')

var ValidationError = validators.ValidationError
  , isEmptyValue = validators.isEmptyValue
  , Widget = widgets.Widget
  , cleanIPv6Address = validators.ipv6.cleanIPv6Address

/**
 * An object that is responsible for doing validation and normalisation, or
 * "cleaning", for example: an EmailField makes sure its data is a valid
 * e-mail address and makes sure that acceptable "blank" values all have the
 * same representation.
 * @constructor
 * @param {Object=} kwargs
 */
var Field = Concur.extend({
  constructor: function Field(kwargs) {
    kwargs = object.extend({
      required: true, widget: null, label: null, initial: null,
      helpText: null, errorMessages: null, showHiddenInitial: false,
      validators: [], extraClasses: null
    }, kwargs)
    this.required = kwargs.required
    this.label = kwargs.label
    this.initial = kwargs.initial
    this.showHiddenInitial = kwargs.showHiddenInitial
    this.helpText = kwargs.helpText || ''
    this.extraClasses = kwargs.extraClasses

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
    this.errorMessages =
        object.extend({}, this.defaultErrorMessages, kwargs.errorMessages || {})

    this.validators = this.defaultValidators.concat(kwargs.validators)
  }
  /** Default widget to use when rendering this type of Field. */
, widget: widgets.TextInput
  /** Default widget to use when rendering this type of field as hidden. */
, hiddenWidget: widgets.HiddenInput
  /** Default set of validators. */
, defaultValidators: []
  /** Default error messages. */
, defaultErrorMessages: {
    required: 'This field is required.'
  , invalid: 'Enter a valid value.'
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

Field.prototype.validate = function(value) {
  if (this.required && isEmptyValue(value)) {
    throw ValidationError(this.errorMessages.required)
  }
}

Field.prototype.runValidators = function(value) {
  if (isEmptyValue(value)) {
    return
  }
  var errors = []
  for (var i = 0, l = this.validators.length; i < l; i++) {
    try {
      validators.callValidator(this.validators[i], value)
    }
    catch (e) {
      if (!(e instanceof ValidationError)) {
        throw e
      }

      if (typeof e.code != 'undefined' &&
          typeof this.errorMessages[e.code] != 'undefined' &&
          this.errorMessages[e.code] !== this.defaultErrorMessages[e.code]) {
        var message = this.errorMessages[e.code]
        if (typeof e.params != 'undefined') {
          message = format(message, e.params)
        }
        errors.push(message)
      }
      else {
        errors = errors.concat(e.messages())
      }
    }
  }
  if (errors.length > 0) {
    throw ValidationError(errors)
  }
}

/**
 * Validates the given value and returns its "cleaned" value as an appropriate
 * JavaScript object.
 *
 * Raises ValidationError for any errors.
 *
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
 * Determines if data has changed from initial.
 */
Field.prototype._hasChanged = function(initial, data) {
  // For purposes of seeing whether something has changed, null is the same
  // as an empty string, if the data or inital value we get is null, replace
  // it with ''.
  var dataValue = (data === null ? '' : data)
  var initialValue = (initial === null ? '' : initial)
  return (''+initialValue != ''+dataValue)
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
    kwargs = object.extend({
      maxLength: null, minLength: null
    }, kwargs)
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
  if (isEmptyValue(value)) {
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
IntegerField.prototype.defaultErrorMessages =
    object.extend({}, IntegerField.prototype.defaultErrorMessages, {
      invalid: 'Enter a whole number.'
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
  if (isEmptyValue(value)) {
    return null
  }
  value = Number(value)
  if (isNaN(value) || value.toString().indexOf('.') != -1) {
    throw ValidationError(this.errorMessages.invalid)
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
  constructor: function FloatField(kwargs) {
    if (!(this instanceof Field)) { return new FloatField(kwargs) }
    IntegerField.call(this, kwargs)
  }
})
/** Float validation regular expression, as parseFloat() is too forgiving. */
FloatField.FLOAT_REGEXP = /^[-+]?(?:\d+(?:\.\d+)?|(?:\d+)?\.\d+)$/
FloatField.prototype.defaultErrorMessages =
    object.extend({}, FloatField.prototype.defaultErrorMessages, {
      invalid: 'Enter a number.'
    })

/**
 * Validates that the input looks like valid input for parseFloat() and the
 * result of calling it isn't NaN.
 *
 * @param value the value to be validated.
 *
 * @return a Number obtained from parseFloat(), or null for empty values.
 */
FloatField.prototype.toJavaScript = function(value) {
  value = Field.prototype.toJavaScript.call(this, value)
  if (isEmptyValue(value)) {
    return null
  }
  value = util.strip(value)
  if (!FloatField.FLOAT_REGEXP.test(value)) {
    throw ValidationError(this.errorMessages.invalid)
  }
  value = parseFloat(value)
  if (isNaN(value)) {
    throw ValidationError(this.errorMessages.invalid)
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
  constructor: function DecimalField(kwargs) {
    if (!(this instanceof Field)) { return new DecimalField(kwargs) }
    kwargs = object.extend({maxDigits: null, decimalPlaces: null}, kwargs)
    this.maxDigits = kwargs.maxDigits
    this.decimalPlaces = kwargs.decimalPlaces
    IntegerField.call(this, kwargs)
  }
})
/** Decimal validation regular expression, in lieu of a Decimal type. */
DecimalField.DECIMAL_REGEXP = /^[-+]?(?:\d+(?:\.\d+)?|(?:\d+)?\.\d+)$/
DecimalField.prototype.defaultErrorMessages =
    object.extend({}, DecimalField.prototype.defaultErrorMessages, {
      invalid: 'Enter a number.'
    , maxDigits: 'Ensure that there are no more than {maxDigits} digits in total.'
    , maxDecimalPlaces: 'Ensure that there are no more than {maxDecimalPlaces} decimal places.'
    , maxWholeDigits: 'Ensure that there are no more than {maxWholeDigits} digits before the decimal point.'
    })

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
  if (isEmptyValue(value)) {
    return null
  }

  // Coerce to string and validate that it looks Decimal-like
  value = util.strip(''+value)
  if (!DecimalField.DECIMAL_REGEXP.test(value)) {
    throw ValidationError(this.errorMessages.invalid)
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

  // Perform own validation
  var pieces = value.split('.')
    , wholeDigits = pieces[0].length
    , decimals = (pieces.length == 2 ? pieces[1].length : 0)
    , digits = wholeDigits + decimals
  if (this.maxDigits !== null && digits > this.maxDigits) {
    throw ValidationError(format(this.errorMessages.maxDigits,
                                 {maxDigits: this.maxDigits}))
  }
  if (this.decimalPlaces !== null && decimals > this.decimalPlaces) {
    throw ValidationError(format(this.errorMessages.maxDecimalPlaces,
                                 {maxDecimalPlaces: this.decimalPlaces}))
  }
  if (this.maxDigits !== null &&
      this.decimalPlaces !== null &&
      wholeDigits > (this.maxDigits - this.decimalPlaces)) {
    throw ValidationError(format(this.errorMessages.maxWholeDigits,
                                 {maxWholeDigits: (
                                  this.maxDigits - this.decimalPlaces)}))
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
  throw ValidationError(this.errorMessages.invalid)
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
  constructor: function DateField(kwargs) {
    if (!(this instanceof Field)) { return new DateField(kwargs) }
    BaseTemporalField.call(this, kwargs)
  }
, widget: widgets.DateInput
, inputFormats: util.DEFAULT_DATE_INPUT_FORMATS
})
DateField.prototype.defaultErrorMessages =
    object.extend({}, DateField.prototype.defaultErrorMessages, {
      invalid: 'Enter a valid date.'
    })

/**
 * Validates that the input can be converted to a date.
 * @param {String|Date} value the value to be validated.
 * @return {?Date} a with its year, month and day attributes set, or null for
 *     empty values when they are allowed.
 */
DateField.prototype.toJavaScript = function(value) {
  if (isEmptyValue(value)) {
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
  constructor: function TimeField(kwargs) {
    if (!(this instanceof Field)) { return new TimeField(kwargs) }
    BaseTemporalField.call(this, kwargs)
  }
, widget: widgets.TimeInput
, inputFormats: util.DEFAULT_TIME_INPUT_FORMATS
})
TimeField.prototype.defaultErrorMessages =
    object.extend({}, TimeField.prototype.defaultErrorMessages, {
      invalid: 'Enter a valid time.'
    })

/**
 * Validates that the input can be converted to a time.
 * @param {String|Date} value the value to be validated.
 * @return {?Date} a Date with its hour, minute and second attributes set, or
 *     null for empty values when they are allowed.
 */
TimeField.prototype.toJavaScript = function(value) {
  if (isEmptyValue(value)) {
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
  constructor: function DateTimeField(kwargs) {
    if (!(this instanceof Field)) { return new DateTimeField(kwargs) }
    BaseTemporalField.call(this, kwargs)
  }
, widget: widgets.DateTimeInput
, inputFormats: util.DEFAULT_DATETIME_INPUT_FORMATS
})
DateTimeField.prototype.defaultErrorMessages =
    object.extend({}, DateTimeField.prototype.defaultErrorMessages, {
      invalid: 'Enter a valid date/time.'
    })

/**
 * @param {String|Date|Array.<Date>}
 * @return {?Date}
 */
DateTimeField.prototype.toJavaScript = function(value) {
  if (isEmptyValue(value)) {
    return null
  }
  if (value instanceof Date) {
    return value
  }
  if (is.Array(value)) {
    // Input comes from a SplitDateTimeWidget, for example, so it's two
    // components: date and time.
    if (value.length != 2) {
      throw ValidationError(this.errorMessages.invalid)
    }
    if (isEmptyValue(value[0]) &&
        isEmptyValue(value[1])) {
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
  constructor: function EmailField(kwargs) {
    if (!(this instanceof Field)) { return new EmailField(kwargs) }
    CharField.call(this, kwargs)
  }
, widget: widgets.EmailInput
, defaultValidators: [validators.validateEmail]
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
  constructor: function FileField(kwargs) {
    if (!(this instanceof Field)) { return new FileField(kwargs) }
    kwargs = object.extend({maxLength: null, allowEmptyFile: false}, kwargs)
    this.maxLength = kwargs.maxLength
    this.allowEmptyFile = kwargs.allowEmptyFile
    delete kwargs.maxLength
    Field.call(this, kwargs)
  }
, widget: widgets.ClearableFileInput
})
FileField.prototype.defaultErrorMessages =
    object.extend({}, FileField.prototype.defaultErrorMessages, {
      invalid: 'No file was submitted. Check the encoding type on the form.'
    , missing: 'No file was submitted.'
    , empty: 'The submitted file is empty.'
    , maxLength: 'Ensure this filename has at most {max} characters (it has {length}).'
    , contradicton: 'Please either submit a file or check the clear checkbox, not both.'
    })

FileField.prototype.toJavaScript = function(data, initial) {
  if (isEmptyValue(data)) {
    return null
  }
  // UploadedFile objects should have name and size attributes
  if (typeof data.name == 'undefined' || typeof data.size == 'undefined') {
    throw ValidationError(this.errorMessages.invalid)
  }

  var fileName = data.name
    , fileSize = data.size

  if (this.maxLength !== null && fileName.length > this.maxLength) {
    throw ValidationError(format(this.errorMessages.maxLength, {
                            max: this.maxLength
                          , length: fileName.length
                          }))
  }
  if (!fileName) {
    throw ValidationError(this.errorMessages.invalid)
  }
  if (!this.allowEmptyFile && !fileSize) {
    throw ValidationError(this.errorMessages.empty)
  }
  return data
}

FileField.prototype.clean = function(data, initial) {
  // If the widget got contradictory inputs, we raise a validation error
  if (data === widgets.FILE_INPUT_CONTRADICTION) {
    throw ValidationError(this.errorMessages.contradiction)
  }
  // false means the field value should be cleared; further validation is
  // not needed.
  if (data === false) {
    if (!this.required) {
      return false
    }
    // If the field is required, clearing is not possible (the widget
    // shouldn't return false data in that case anyway). False is not
    // in EMPTY_VALUES; if a False value makes it this far it should be
    // validated from here on out as null (so it will be caught by the
    // required check).
    data = null
  }
  if (!data && initial) {
    return initial
  }
  return CharField.prototype.clean.call(this, data)
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
constructor: function ImageField(kwargs) {
    if (!(this instanceof Field)) { return new ImageField(kwargs) }
    FileField.call(this, kwargs)
  }
})
ImageField.prototype.defaultErrorMessages =
    object.extend({}, ImageField.prototype.defaultErrorMessages, {
      invalidImage: 'Upload a valid image. The file you uploaded was either not an image or a corrupted image.'
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
  constructor: function URLField(kwargs) {
    if (!(this instanceof Field)) { return new URLField(kwargs) }
    CharField.call(this, kwargs)
    this.validators.push(validators.URLValidator())
  }
, widget: widgets.URLInput
})
URLField.prototype.defaultErrorMessages =
    object.extend({}, URLField.prototype.defaultErrorMessages, {
      invalid: 'Enter a valid URL.'
    , invalidLink: 'This URL appears to be a broken link.'
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
  constructor: function BooleanField(kwargs) {
    if (!(this instanceof Field)) { return new BooleanField(kwargs) }
    Field.call(this, kwargs)
  }
, widget: widgets.CheckboxInput
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
    throw ValidationError(this.errorMessages.required)
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
  constructor: function NullBooleanField(kwargs) {
    if (!(this instanceof Field)) { return new NullBooleanField(kwargs) }
    BooleanField.call(this, kwargs)
  }
, widget: widgets.NullBooleanSelect
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
  constructor: function ChoiceField(kwargs) {
    if (!(this instanceof Field)) { return new ChoiceField(kwargs) }
    kwargs = object.extend({choices: []}, kwargs)
    Field.call(this, kwargs)
    this.setChoices(kwargs.choices)
  }
, widget: widgets.Select
})
ChoiceField.prototype.defaultErrorMessages =
    object.extend({}, ChoiceField.prototype.defaultErrorMessages, {
      invalidChoice: 'Select a valid choice. {value} is not one of the available choices.'
    })
ChoiceField.prototype.choices = function() { return this._choices }
ChoiceField.prototype.setChoices = function(choices) {
  // Setting choices also sets the choices on the widget
  this._choices = this.widget.choices = choices
}

ChoiceField.prototype.toJavaScript = function(value) {
  if (isEmptyValue(value)) {
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
    throw ValidationError(
        format(this.errorMessages.invalidChoice, {value: value}))
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
    this.coerce = kwargs.coerce
    this.emptyValue = kwargs.emptyValue
    delete kwargs.coerce
    delete kwargs.emptyValue
    ChoiceField.call(this, kwargs)
  }
})

TypedChoiceField.prototype.toJavaScript = function(value) {
  value = ChoiceField.prototype.toJavaScript.call(this, value)
  ChoiceField.prototype.validate.call(this, value)
  if (value === this.emptyValue || isEmptyValue(value)) {
    return this.emptyValue
  }
  try {
    value = this.coerce(value)
  }
  catch (e) {
    throw ValidationError(
        format(this.errorMessages.invalidChoice, {value: value}))
  }
  return value
}

TypedChoiceField.prototype.validate = function(value) {}

/**
 * Validates that its input is one or more of a valid list of choices.
 * @constructor
 * @extends {ChoiceField}
 * @param {Object=} kwargs
 */
var MultipleChoiceField = ChoiceField.extend({
  constructor: function MultipleChoiceField(kwargs) {
    if (!(this instanceof Field)) { return new MultipleChoiceField(kwargs) }
    ChoiceField.call(this, kwargs)
  }
, widget: widgets.SelectMultiple
, hiddenWidget: widgets.MultipleHiddenInput
})
MultipleChoiceField.prototype.defaultErrorMessages =
    object.extend({}, MultipleChoiceField.prototype.defaultErrorMessages, {
      invalidChoice: 'Select a valid choice. {value} is not one of the available choices.'
    , invalidList: 'Enter a list of values.'
    })

MultipleChoiceField.prototype.toJavaScript = function(value) {
  if (!value) {
    return []
  }
  else if (!(is.Array(value))) {
    throw ValidationError(this.errorMessages.invalidList)
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
    throw ValidationError(this.errorMessages.required)
  }
  for (var i = 0, l = value.length; i < l; i++) {
    if (!this.validValue(value[i])) {
      throw ValidationError(
          format(this.errorMessages.invalidChoice, {value: value[i]}))
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
    this.coerce = kwargs.coerce
    this.emptyValue = kwargs.emptyValue
    delete kwargs.coerce
    delete kwargs.emptyValue
    MultipleChoiceField.call(this, kwargs)
  }
})

TypedMultipleChoiceField.prototype.toJavaScript = function(value) {
  value = MultipleChoiceField.prototype.toJavaScript.call(this, value)
  MultipleChoiceField.prototype.validate.call(this, value)
  if (value === this.emptyValue || isEmptyValue(value) ||
      (is.Array(value) && !value.length)) {
    return this.emptyValue
  }
  var newValue = []
  for (var i = 0, l = value.length; i < l; i++) {
    try {
      newValue.push(this.coerce(value[i]))
    }
    catch (e) {
      throw ValidationError(
          format(this.errorMessages.invalidChoice, {value: value[i]}))
    }
  }
  return newValue
}

TypedMultipleChoiceField.prototype.validate = function(value) {}

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
  constructor: function MultiValueField(kwargs) {
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
MultiValueField.prototype.defaultErrorMessages =
    object.extend({}, MultiValueField.prototype.defaultErrorMessages, {
      invalid: 'Enter a list of values.'
    , incomplete: 'Enter a complete value.'
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
        throw ValidationError(this.errorMessages.required)
      }
      else {
        return this.compress([])
      }
    }
  }
  else {
    throw ValidationError(this.errorMessages.invalid)
  }

  for (i = 0, l = this.fields.length; i < l; i++) {
    var field = this.fields[i]
    var fieldValue = value[i]
    if (fieldValue === undefined) {
      fieldValue = null
    }
    if (isEmptyValue(fieldValue)) {
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
  var i, l

  if (initial === null) {
    initial = []
    for (i = 0, l = data.length; i < l; i++) {
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
  constructor: function SplitDateTimeField(kwargs) {
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
, widget: widgets.SplitDateTimeWidget
, hiddenWidget: widgets.SplitHiddenDateTimeWidget
})
SplitDateTimeField.prototype.defaultErrorMessages =
    object.extend({}, SplitDateTimeField.prototype.defaultErrorMessages, {
      invalidDate: 'Enter a valid date.'
    , invalidTime: 'Enter a valid time.'
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
    var d = dataList[0], t = dataList[1]
    // Raise a validation error if date or time is empty (possible if
    // SplitDateTimeField has required == false).
    if (isEmptyValue(d)) {
      throw ValidationError(this.errorMessages.invalidDate)
    }
    if (isEmptyValue(t)) {
      throw ValidationError(this.errorMessages.invalidTime)
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
  constructor: function IPAddressField(kwargs) {
    if (!(this instanceof Field)) { return new IPAddressField(kwargs) }
    CharField.call(this, kwargs)
  }
})
IPAddressField.prototype.defaultValidators = [validators.validateIPv4Address]
IPAddressField.prototype.defaultErrorMessages =
    object.extend({}, IPAddressField.prototype.defaultErrorMessages, {
      invalid: 'Enter a valid IPv4 address.'
    })

var GenericIPAddressField = CharField.extend({
  constructor: function GenericIPAddressField(kwargs) {
    if (!(this instanceof Field)) { return new GenericIPAddressField(kwargs) }
    kwargs = object.extend({
      protocol: 'both', unpackIPv4: false
    }, kwargs)
    this.unpackIPv4 = kwargs.unpackIPv4
    var ipValidator = validators.ipAddressValidators(kwargs.protocol,
                                                     kwargs.unpackIPv4)
    this.defaultValidators = ipValidator.validators
    this.defaultErrorMessages = object.extend(
      {}, this.defaultErrorMessages, {invalid: ipValidator.message}
    )
    CharField.call(this, kwargs)
  }
})

GenericIPAddressField.prototype.toJavaScript = function(value) {
  if (!value) {
    return ''
  }
  if (value && value.indexOf(':') != -1) {
    return cleanIPv6Address(value, {
      unpackIPv4: this.unpackIPv4
    , errorMessage: this.errorMessages.invalid
    })
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
  constructor: function SlugField(kwargs) {
    if (!(this instanceof Field)) { return new SlugField(kwargs) }
    CharField.call(this, kwargs)
  }
})
SlugField.prototype.defaultValidators = [validators.validateSlug]
SlugField.prototype.defaultErrorMessages =
    object.extend({}, SlugField.prototype.defaultErrorMessages, {
      invalid: "Enter a valid 'slug' consisting of letters, numbers, underscores or hyphens."
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

},{"./util":6,"./widgets":7,"Concur":8,"isomorph/format":11,"isomorph/is":12,"isomorph/object":13,"isomorph/time":14,"isomorph/url":15,"validators":18}],2:[function(require,module,exports){
'use strict';

var Concur = require('Concur')
  , is = require('isomorph/is')
  , format = require('isomorph/format').formatObj
  , object = require('isomorph/object')
  , copy = require('isomorph/copy')
  , validators = require('validators')

var util = require('./util')
  , fields = require('./fields')
  , widgets = require('./widgets')

var ErrorList = util.ErrorList
  , ErrorObject = util.ErrorObject
  , ValidationError = validators.ValidationError
  , Field = fields.Field
  , FileField = fields.FileField
  , Textarea = widgets.Textarea
  , TextInput = widgets.TextInput

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
    , id = object.get(widget.attrs, 'id', this.autoId())
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
    , attrs = (kwargs.attrs !== null ? kwargs.attrs : {})
    , autoId = this.autoId()
    , name = !kwargs.onlyInitial ? this.htmlName : this.htmlInitialName
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

/**
 * Creates the label value to be displayed, adding the form suffix if there is
 * one and the label doesn't end in punctuation.
 */
BoundField.prototype.getLabel = function() {
  return this._addLabelSuffix(''+this.label)
}

BoundField.prototype._addLabelSuffix = function(label) {
  // Only add the suffix if the label does not end in punctuation
  if (this.form.labelSuffix &&
      ':?.!'.indexOf(label.charAt(label.length - 1)) == -1) {
    label += this.form.labelSuffix
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
 */
BoundField.prototype.labelTag = function(kwargs) {
  kwargs = object.extend({contents: null, attrs: null}, kwargs)
  var contents
  if (kwargs.contents !== null) {
    contents = this._addLabelSuffix(''+kwargs.contents)
  }
  else {
    contents = this.getLabel()
  }

  var widget = this.field.widget
    , id = object.get(widget.attrs, 'id', this.autoId())
  if (id) {
    var attrs = object.extend(kwargs.attrs || {}, {htmlFor: widget.idForLabel(id)})
    contents = React.DOM.label(attrs, contents)
  }
  return contents
}

/**
 * Returns a string of space-separated CSS classes for this field.
 */
BoundField.prototype.cssClasses = function(extraClasses) {
  extraClasses = extraClasses || this.field.extraClasses
  if (extraClasses !== null && is.Function(extraClasses.split)) {
    extraClasses = extraClasses.split()
  }
  extraClasses = extraClasses || []
  if (typeof this.form.rowCssClass != 'undefined') {
    extraClasses.push(this.form.rowCssClass)
  }
  if (this.errors().isPopulated() &&
      typeof this.form.errorCssClass != 'undefined') {
    extraClasses.push(this.form.errorCssClass)
  }
  if (this.field.required && typeof this.form.requiredCssClass != 'undefined') {
    extraClasses.push(this.form.requiredCssClass)
  }
  return extraClasses.join(' ')
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
 * @param {Boolean} errorsOnSeparateRow determines if errors are placed in their
 *   own row, or in the row for the field they are related to.
 * @return a list of React.DOM elements representing rows.
 */
BaseForm.prototype._htmlOutput = function(normalRow,
                                          errorRow,
                                          errorsOnSeparateRow) {
  // Errors that should be displayed above all fields
  var topErrors = this.nonFieldErrors()
  var rows = []
  var hiddenFields = []
  var htmlClassAttr = null
  var cssClasses = null
  var hiddenBoundFields = this.hiddenFields()
  var visibleBoundFields = this.visibleFields()

  for (var i = 0, l = hiddenBoundFields.length; i < l; i++) {
    var bf = hiddenBoundFields[i]
    var bfErrors = bf.errors()
    if (bfErrors.isPopulated) {
      topErrors.extend(bfErrors.messages().map(function(error) {
        return '(Hidden field ' + bf.name + ') ' + error
      }))
    }
    hiddenFields.push(bf.render())
  }

  for (i = 0, l = visibleBoundFields.length; i < l; i++) {
    bf = visibleBoundFields[i]
    htmlClassAttr = ''
    cssClasses = bf.cssClasses()
    if (cssClasses) {
      htmlClassAttr = cssClasses
    }

    // Variables which can be optional in each row
    var errors = null
    var label = null
    var helpText = null
    var extraContent = null

    bfErrors = bf.errors()
    if (bfErrors.isPopulated()) {
      errors = bfErrors
      if (errorsOnSeparateRow === true) {
        rows.push(errorRow(errors.render()))
        errors = null
      }
    }

    if (bf.label) {
      label = bf.labelTag() || ''
    }

    if (bf.field.helpText) {
      helpText = bf.field.helpText
    }

    // If this is the last row, it should include any hidden fields
    if (i == l - 1 && hiddenFields.length > 0) {
      extraContent = hiddenFields
    }
    if (errors !== null) {
      errors = errors.render()
    }
    rows.push(normalRow(bf.htmlName, label, bf.render(), helpText, errors,
                        htmlClassAttr, extraContent))
  }

  if (topErrors.isPopulated()) {
    // Add hidden fields to the top error row if it's being displayed and
    // there are no other rows.
    extraContent = null
    if (hiddenFields.length > 0 && rows.length === 0) {
      extraContent = hiddenFields
    }
    rows.splice(0, 0, errorRow(topErrors.render(), extraContent))
  }

  // Put hidden fields in their own error row if there were no rows to
  // display.
  if (hiddenFields.length > 0 && rows.length === 0) {
    rows.push(errorRow('', hiddenFields, this.hiddenFieldRowCssClass))
  }
  return rows
}

/**
 * Returns this form rendered as HTML <tr>s - excluding the <table>.
 */
BaseForm.prototype.asTable = (function() {
  var normalRow = function(key, label, field, helpText, errors, htmlClassAttr,
                           extraContent) {
    var contents = []
    if (errors) {
      contents.push(errors)
    }
    contents.push(field)
    if (helpText) {
      contents.push(React.DOM.br(null))
      contents.push(helpText)
    }
    if (extraContent) {
      contents = contents.concat(extraContent)
    }

    var rowAttrs = {key: key}
    if (htmlClassAttr) {
      rowAttrs['className'] = htmlClassAttr
    }
    return React.DOM.tr(rowAttrs
    , React.DOM.th(null, label)
    , React.DOM.td(null, contents)
    )
  }

  var errorRow = function(errors, extraContent, htmlClassAttr) {
    var contents = []
    if (errors) {
      contents.push(errors)
    }
    if (extraContent) {
      contents = contents.concat(extraContent)
    }
    var rowAttrs = {}
    if (htmlClassAttr) {
      rowAttrs.className = htmlClassAttr
    }
    return React.DOM.tr(rowAttrs
    , React.DOM.td({colSpan: 2}, contents)
    )
  }

  return function() {
    return this._htmlOutput(normalRow, errorRow, false)
  }
})()

/**
 * Returns this form rendered as HTML <li>s - excluding the <ul>.
 */
BaseForm.prototype.asUL = (function() {
  var normalRow = function(key, label, field, helpText, errors, htmlClassAttr,
                           extraContent) {
    var contents = []
    if (errors) {
      contents.push(errors)
    }
    if (label) {
      contents.push(label)
    }
    contents.push(' ')
    contents.push(field)
    if (helpText) {
      contents.push(' ')
      contents.push(helpText)
    }
    if (extraContent) {
      contents = contents.concat(extraContent)
    }

    var rowAttrs = {key: key}
    if (htmlClassAttr) {
      rowAttrs.className = htmlClassAttr
    }
    return React.DOM.li(rowAttrs, contents)
  }

  var errorRow = function(errors, extraContent, htmlClassAttr) {
    var contents = []
    if (errors) {
      contents.push(errors)
    }
    if (extraContent) {
      contents = contents.concat(extraContent)
    }
    var rowAttrs = {}
    if (htmlClassAttr) {
      rowAttrs.className= htmlClassAttr
    }
    return React.DOM.li(rowAttrs, contents)
  }

  return function() {
    return this._htmlOutput(normalRow, errorRow, false)
  }
})()

/**
 * Returns this form rendered as HTML <p>s.
 */
BaseForm.prototype.asP = (function() {
  var normalRow = function(key, label, field, helpText, errors, htmlClassAttr,
                           extraContent) {
    var contents = []
    if (label) {
      contents.push(label)
    }
    contents.push(' ')
    contents.push(field)
    if (helpText) {
      contents.push(' ')
      contents.push(helpText)
    }
    if (extraContent) {
      contents = contents.concat(extraContent)
    }

    var rowAttrs = {key: key}
    if (htmlClassAttr) {
      rowAttrs.className= htmlClassAttr
    }
    return React.DOM.p(rowAttrs, contents)
  }

  var errorRow = function(errors, extraContent, htmlClassAttr) {
    if (extraContent) {
      var contents = []
      if (errors) {
        contents.push(errors)
      }
      contents = contents.concat(extraContent)
      var rowAttrs = {}
      if (htmlClassAttr) {
        rowAttrs['className'] = htmlClassAttr
      }
      // When provided extraContent is usually hidden fields, so we need
      // to give it a block scope wrapper in this case for HTML validity.
      return React.DOM.div(rowAttrs, contents)
    }
    // Otherwise, just display errors as they are
    return errors
  }

  return function() {
    return this._htmlOutput(normalRow, errorRow, true)
  }
})()

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
    , prefix = this.addPrefix(fieldname)
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

      // Try clean_name
      var customClean = 'clean_' + name
      if (typeof this[customClean] != 'undefined' &&
          is.Function(this[customClean])) {
         value = this[customClean]()
         this.cleanedData[name] = value
         continue
      }

      // Try cleanName
      customClean = 'clean' + name.charAt(0).toUpperCase() + name.substr(1)
      if (typeof this[customClean] != 'undefined' &&
          is.Function(this[customClean])) {
        value = this[customClean]()
        this.cleanedData[name] = value
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
  // Pop fields from prototypeProps to contribute towards baseFields
  var fields = []
  for (var name in prototypeProps) {
    if (object.hasOwn(prototypeProps, name) &&
        prototypeProps[name] instanceof Field) {
      fields.push([name, prototypeProps[name]])
      delete prototypeProps[name]
    }
  }
  fields.sort(function(a, b) {
    return a[1].creationCounter - b[1].creationCounter
  })

  // If any mixins which look like form constructors were given, inherit their
  // fields.
  if (object.hasOwn(prototypeProps, '__mixin__')) {
    var mixins = prototypeProps.__mixin__
    if (!is.Array(mixins)) {
      mixins = [mixins]
    }
    // Note that we loop over mixed in forms in *reverse* to preserve the
    // correct order of fields.
    for (var i = mixins.length - 1; i >= 0; i--) {
      var mixin = mixins[i]
      if (is.Function(mixin) &&
          typeof mixin.prototype.baseFields != 'undefined') {
        fields = object.items(mixin.prototype.baseFields).concat(fields)
        // Replace the mixin with an object containing the other prototype
        // properties, to avoid overwriting baseFields when the mixin is
        // applied.
        var formMixin = object.extend({}, mixin.prototype)
        delete formMixin.baseFields
        mixins[i] = formMixin
      }
    }
    prototypeProps.__mixin__ = mixins
  }

  // If we're extending from a form which already has some baseFields, they
  // should be first.
  if (typeof this.baseFields != 'undefined') {
    fields = object.items(this.baseFields).concat(fields)
  }

  // Where -> is "overridden by":
  // parent fields -> mixin form fields -> given fields
  prototypeProps.baseFields = object.fromItems(fields)
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

},{"./fields":1,"./util":6,"./widgets":7,"Concur":8,"isomorph/copy":10,"isomorph/format":11,"isomorph/is":12,"isomorph/object":13,"validators":18}],3:[function(require,module,exports){
'use strict';

var Concur = require('Concur')
  , object = require('isomorph/object')
  , validators = require('validators')

var util = require('./util')
  , widgets = require('./widgets')
  , fields = require('./fields')
  , forms = require('./forms')

var ErrorList = util.ErrorList
  , ValidationError = validators.ValidationError
  , IntegerField = fields.IntegerField
  , BooleanField = fields.BooleanField
  , HiddenInput = widgets.HiddenInput

// Special field names
var TOTAL_FORM_COUNT = 'TOTAL_FORMS'
  , INITIAL_FORM_COUNT = 'INITIAL_FORMS'
  , MIN_NUM_FORM_COUNT = 'MIN_NUM_FORMS'
  , MAX_NUM_FORM_COUNT = 'MAX_NUM_FORMS'
  , ORDERING_FIELD_NAME = 'ORDER'
  , DELETION_FIELD_NAME = 'DELETE'

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

BaseFormSet.prototype.asP = function() {
  var rows = this.managementForm().asP()
  this.forms().forEach(function(form) { rows = rows.concat(form.asP()) })
  return rows
}

BaseFormSet.prototype.asUL = function() {
  var rows = this.managementForm().asUL()
  this.forms().forEach(function(form) { rows = rows.concat(form.asUL()) })
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

},{"./fields":1,"./forms":2,"./util":6,"./widgets":7,"Concur":8,"isomorph/object":13,"validators":18}],4:[function(require,module,exports){
'use strict';

var object = require('isomorph/object')
  , validators = require('validators')

var util = require('./util')
  , fields = require('./fields')

var Field = fields.Field
  , ValidationError = validators.ValidationError

/**
 * A means of hooking newforms up with information about your model layer.
 */
var ModelInterface = {
  /**
   * Set to true if an exception is thrown when a model can't be found.
   */
  throwsIfNotFound: true

  /**
   * Constructor of error thrown when a model can't be found. Any exceptions
   * which do not have this constructor will be rethrown.
   */
, notFoundErrorConstructor: Error

  /**
   * Value returned to indicate not found, instead of throwing an exception.
   */
, notFoundValue: null

  /**
   * Given a model instance, should return the id which will be used to search
   * for valid choices on submission.
   */
, prepareValue: function(obj) {
    throw new Error('You must implement the forms.ModelInterface methods to use Model fields')
  }

  /**
   * Finds a model instance by id, given the model query which was passed to
   * newforms and the id of the selected model.
   */
, findById: function(modelQuery, id) {
    throw new Error('You must implement the forms.ModelInterface methods to use Model fields')
  }
}

function ModelQueryIterator(field) {
  this.field = field
  this.modelQuery = field.modelQuery
}

ModelQueryIterator.prototype.__iter__ = function() {
  var choices = []
  if (this.field.emptyLabel !== null) {
    choices.push(['', this.field.emptyLabel])
  }
  if (this.field.cacheChoices) {
    if (this.field.choiceCache === null) {
      this.field.choiceCache = choices.concat(this.modelChoices())
    }
    return this.field.choiceCache
  }
  else {
    return choices.concat(this.modelChoices())
  }
}

/**
 * Calls the model query function and creates choices from its results.
 */
ModelQueryIterator.prototype.modelChoices = function() {
  var instances = util.iterate(this.modelQuery)
    , choices = []
  for (var i = 0, l = instances.length; i < l; i++) {
    choices.push(this.choice(instances[i]))
  }
  return choices
}

/**
 * Creates a choice from a single model instance.
 */
ModelQueryIterator.prototype.choice = function(obj) {
  return [this.field.prepareValue(obj), this.field.labelFromInstance(obj)]
}

/**
 * A ChoiceField which retrieves its choices as objects returned by a given
 * function.
 * @constructor
 * @extends {ChoiceField}
 * @param {function} modelQuery
 * @param {Object} kwargs
 */
var ModelChoiceField = fields.ChoiceField.extend({
  constructor: function ModelChoiceField(modelQuery, kwargs) {
    if (!(this instanceof Field)) { return new ModelChoiceField(modelQuery, kwargs) }
    kwargs = object.extend({
      required: true, initial: null, cacheChoices: false, emptyLabel: '---------',
      modelInterface: ModelInterface
    }, kwargs)
    if (kwargs.required === true && kwargs.initial !== null) {
      this.emptyLabel = null
    }
    else {
      this.emptyLabel = kwargs.emptyLabel
    }
    this.emptyLabel = kwargs.emptyLabel
    this.cacheChoices = kwargs.cacheChoices
    this.modelInterface = kwargs.modelInterface

    // We don't need the ChoiceField constructor, as we've already handled setting
    // of choices.
    Field.call(this, kwargs)

    this.setModelQuery(modelQuery)
    this.choiceCache = null
  }
})
ModelChoiceField.prototype.defaultErrorMessages =
    object.extend({}, ModelChoiceField.prototype.defaultErrorMessages, {
      invalidChoice: 'Select a valid choice. That choice is not one of the available choices.'
    })

ModelChoiceField.prototype.getModelQuery = function() {
  return this.modelQuery
}

ModelChoiceField.prototype.setModelQuery = function(modelQuery) {
  this.modelQuery = modelQuery
  this.widget.choices = this.getChoices()
}

ModelChoiceField.prototype.getChoices = function() {
  // If this._choices is set, then somebody must have manually set them with
  // the inherited setChoices method.
  if (typeof this._choices != 'undefined') {
    return this._choices
  }

  // Otherwise, return an object which can be used with iterate() to get
  // choices.
  return new ModelQueryIterator(this)
}

ModelChoiceField.prototype.prepareValue = function(obj) {
  var value = null
  if (obj != null) {
    value = this.modelInterface.prepareValue(obj)
  }
  if (value == null) {
    value = Field.prototype.prepareValue.call(this, obj)
  }
  return value
}

/**
 * Creates a choice label from a model instance.
 */
ModelChoiceField.prototype.labelFromInstance = function(obj) {
  return ''+obj
}

ModelChoiceField.prototype.toJavaScript = function(value) {
  if (validators.isEmptyValue(value)) {
    return null
  }
  if (this.modelInterface.throwsIfNotFound) {
    try {
      value = this.modelInterface.findById(this.modelQuery, value)
    }
    catch (e) {
      if (this.modelInterface.notFoundErrorConstructor !== null &&
          !(e instanceof this.modelInterface.notFoundErrorConstructor)) {
        throw e
      }
      throw new ValidationError(this.errorMessages.invalidChoice)
    }
  }
  else {
    value = this.modelInterface.findById(this.modelQuery, value)
    if (value === this.modelInterface.notFoundValue) {
      throw new ValidationError(this.errorMessages.invalidChoice)
    }
  }
  return value
}

ModelChoiceField.prototype.validate = function(value) {
  return Field.prototype.validate.call(this, value)
}

module.exports = {
  ModelInterface: ModelInterface
, ModelChoiceField: ModelChoiceField
}

},{"./fields":1,"./util":6,"isomorph/object":13,"validators":18}],5:[function(require,module,exports){
'use strict';

var object = require('isomorph/object')
  , validators = require('validators')

var util = require('./util')
  , widgets = require('./widgets')
  , fields = require('./fields')
  , forms = require('./forms')
  , formsets = require('./formsets')
  , models = require('./models')

object.extend(
  module.exports
, { ValidationError: validators.ValidationError
  , ErrorObject: util.ErrorObject
  , ErrorList: util.ErrorList
  , formData: util.formData
  , util: {
      iterate: util.iterate
    , prettyName: util.prettyName
    }
  }
, validators
, widgets
, fields
, forms
, formsets
, models
)

},{"./fields":1,"./forms":2,"./formsets":3,"./models":4,"./util":6,"./widgets":7,"isomorph/object":13,"validators":18}],6:[function(require,module,exports){
'use strict';

var Concur = require('Concur')
  , is = require('isomorph/is')
  , object = require('isomorph/object')
  , validators = require('validators')

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
        type == 'email' || type == 'url' || type == 'number' ||
        type == 'textarea' || ((type == 'checkbox' ||
                                type == 'radio') && element.checked)) {
      value = element.value
    }
    else if (type == 'select-one') {
      value = element.options[element.selectedIndex].value
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
  return this.asUL()
}

/**
 * Displays error details as a list.
 */
ErrorObject.prototype.asUL = function() {
  var items = Object.keys(this.errors).map(function(field) {
    return React.DOM.li(null, field, this.errors[field].asUL())
  }.bind(this))
  if (items.length === 0) { return '' }
  return React.DOM.ul({className: 'errorlist'}, items)
}

/**
 * Displays error details as text.
 */
ErrorObject.prototype.asText = function() {
  return Object.keys(this.errors).map(function(field) {
    var mesages = this.errors[field].messages()
    return ['* ' + field].concat(mesages.map(function(message) {
      return ('  * ' + message)
    })).join('\n')
  }.bind(this)).join('\n')
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
  return this.asUL()
}

/**
 * Displays errors as a list.
 */
ErrorList.prototype.asUL = function() {
  return React.DOM.ul({className: 'errorlist'}
  , this.messages().map(function(error) {
      return React.DOM.li(null, error)
    })
  )
}

/**
 * Displays errors as text.
 */
ErrorList.prototype.asText = function() {
  return this.messages().map(function(error) {
    return '* ' + error
  }).join('\n')
}

module.exports = {
  DEFAULT_DATE_INPUT_FORMATS: DEFAULT_DATE_INPUT_FORMATS
, DEFAULT_TIME_INPUT_FORMATS: DEFAULT_TIME_INPUT_FORMATS
, DEFAULT_DATETIME_INPUT_FORMATS: DEFAULT_DATETIME_INPUT_FORMATS
, ErrorObject: ErrorObject
, ErrorList: ErrorList
, formData: formData
, iterate: iterate
, prettyName: prettyName
, strip: strip
}

},{"Concur":8,"isomorph/is":12,"isomorph/object":13,"validators":18}],7:[function(require,module,exports){
'use strict';

var Concur = require('Concur')
  , is = require('isomorph/is')
  , format = require('isomorph/format').formatObj
  , object = require('isomorph/object')
  , time = require('isomorph/time')

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
    , id = object.get(finalAttrs, 'id', null)
    , inputs = []
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
 * File widgets take data from files, not data.
 */
FileInput.prototype.valueFromData = function(data, files, name) {
  return object.get(files, name, null)
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
    var contents = [
      this.initialText, ': '
    , React.DOM.a({href: value.url}, ''+value), ' '
    ]
    if (!this.isRequired) {
      var clearCheckboxName = this.clearCheckboxName(name)
      var clearCheckboxId = this.clearCheckboxId(clearCheckboxName)
      contents = contents.concat([
        CheckboxInput().render(
            clearCheckboxName, false, {attrs: {'id': clearCheckboxId}})
      , ' '
      , React.DOM.label({htmlFor: clearCheckboxId}, this.clearCheckboxLabel)
      ])
    }
    contents = contents.concat([
      React.DOM.br(null)
    , this.inputText, ': '
    , input
    ])
    return React.DOM.div(null, contents)
  }
  else {
      return input
  }
}

ClearableFileInput.prototype.valueFromData = function(data, files, name) {
  var upload = FileInput.prototype.valueFromData(data, files, name)
  if (!this.isRequired &&
      CheckboxInput().valueFromData(data, files,
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
    , values = {'true': true, 'false': false}
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
    , finalChoices = util.iterate(this.choices).concat(choices || [])
  for (i = 0, l = finalChoices.length; i < l; i++) {
    if (is.Array(finalChoices[i][1])) {
      var optgroupOptions = []
        , optgroupChoices = finalChoices[i][1]
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
    , options = this.renderOptions(kwargs.choices, selectedValues)
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
    throw new Error('Index out of bounds')
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
    , choices = util.iterate(this.choices).concat(kwargs.choices || [])
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
    , id = (typeof finalAttrs.id != 'undefined' ? finalAttrs.id : null)
    , renderedWidgets = []
  for (var i = 0, l = this.widgets.length; i < l; i++) {
    var widget = this.widgets[i]
      , widgetValue = null
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
  Widget: Widget
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

},{"./util":6,"Concur":8,"isomorph/format":11,"isomorph/is":12,"isomorph/object":13,"isomorph/time":14}],8:[function(require,module,exports){
var is = require('isomorph/is')
  , object = require('isomorph/object')

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

  // Set up and return the new child constructor
  var childConstructor = inheritFrom(this,
                                     prototypeProps,
                                     constructorProps)
  childConstructor.extend = this.extend
  return childConstructor
}

},{"isomorph/is":12,"isomorph/object":13}],9:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/*! http://mths.be/punycode v1.2.4 by @mathias */
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
  , format = require('isomorph/format').formatObj
  , is = require('isomorph/is')
  , object = require('isomorph/object')

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
 *  Validity is checked by calling isValidIPv6Address() - if an invalid address
 *  is passed, a ValidationError is thrown.
 *
 * Replaces the longest continious zero-sequence with '::' and removes leading
 * zeroes and makes sure all hextets are lowercase.
 */
function cleanIPv6Address(ipStr, kwargs) {
  kwargs = object.extend({
    unpackIPv4: false, errorMessage: 'This is not a valid IPv6 address'
  }, kwargs)

  var bestDoublecolonStart = -1
    , bestDoublecolonLen = 0
    , doublecolonStart = -1
    , doublecolonLen = 0

  if (!isValidIPv6Address(ipStr)) {
    throw ValidationError(kwargs.errorMessage)
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
        validateIPv4Address.__call__(hextet)
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
    , hextets = ipStr.split('::')

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
  , is = require('isomorph/is')
  , object = require('isomorph/object')
  , punycode = require('punycode')
  , url = require('isomorph/url')

var errors = require('./errors')
  , ipv6 = require('./ipv6')

var ValidationError = errors.ValidationError
  , isValidIPv6Address = ipv6.isValidIPv6Address

var EMPTY_VALUES = [null, undefined, '']

var isEmptyValue = function(value) {
  for (var i = 0, l = EMPTY_VALUES.length; i < l; i++) {
    if (value === EMPTY_VALUES[i]) {
      return true
    }
  }
  return false
}

function isCallable(o) {
  return (is.Function(o) || is.Function(o.__call__))
}

/**
 * Calls a validator, which may be a function or an objects with a
 * __call__ method, with the given value.
 */
function callValidator(v, value) {
  if (is.Function(v)) {
    v(value)
  }
  else if (is.Function(v.__call__)) {
    v.__call__(value)
  }
}

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
      this.message =kwargs.message
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
    validateIPv4Address.__call__(value)
  }
  catch (e) {
    if (!(e instanceof ValidationError)) {
      throw e
    }

    if (!isValidIPv6Address(value)) {
      throw ValidationError('Enter a valid IPv4 or IPv6 address.', {code: 'invalid'})
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
    BaseValidator.call(this, limitValue)
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
    BaseValidator.call(this, limitValue)
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
    BaseValidator.call(this, limitValue)
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
    BaseValidator.call(this, limitValue)
  }
, compare: function(a, b) { return a > b }
, clean: function(x) { return x.length }
, message: 'Ensure this value has at most {limitValue} characters (it has {showValue}).'
, code: 'maxLength'
})

module.exports = {
  EMPTY_VALUES: EMPTY_VALUES
, isEmptyValue: isEmptyValue
, isCallable: isCallable
, callValidator: callValidator
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOlxccmVwb3NcXG5ld2Zvcm1zXFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL2xpYi9maWVsZHMuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9saWIvZm9ybXMuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9saWIvZm9ybXNldHMuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9saWIvbW9kZWxzLmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbGliL25ld2Zvcm1zLmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbGliL3V0aWwuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9saWIvd2lkZ2V0cy5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9Db25jdXIvbGliL2NvbmN1ci5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wdW55Y29kZS9wdW55Y29kZS5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9pc29tb3JwaC9jb3B5LmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbm9kZV9tb2R1bGVzL2lzb21vcnBoL2Zvcm1hdC5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9pc29tb3JwaC9pcy5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9pc29tb3JwaC9vYmplY3QuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9ub2RlX21vZHVsZXMvaXNvbW9ycGgvdGltZS5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9pc29tb3JwaC91cmwuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9ub2RlX21vZHVsZXMvdmFsaWRhdG9ycy9saWIvZXJyb3JzLmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbm9kZV9tb2R1bGVzL3ZhbGlkYXRvcnMvbGliL2lwdjYuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9ub2RlX21vZHVsZXMvdmFsaWRhdG9ycy9saWIvdmFsaWRhdG9ycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0aURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1N0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6akJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9WQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbmN1ciA9IHJlcXVpcmUoJ0NvbmN1cicpXG4gICwgaXMgPSByZXF1aXJlKCdpc29tb3JwaC9pcycpXG4gICwgZm9ybWF0ID0gcmVxdWlyZSgnaXNvbW9ycGgvZm9ybWF0JykuZm9ybWF0T2JqXG4gICwgb2JqZWN0ID0gcmVxdWlyZSgnaXNvbW9ycGgvb2JqZWN0JylcbiAgLCB0aW1lID0gcmVxdWlyZSgnaXNvbW9ycGgvdGltZScpXG4gICwgdXJsID0gcmVxdWlyZSgnaXNvbW9ycGgvdXJsJylcbiAgLCB2YWxpZGF0b3JzID0gcmVxdWlyZSgndmFsaWRhdG9ycycpXG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJylcbiAgLCB3aWRnZXRzID0gcmVxdWlyZSgnLi93aWRnZXRzJylcblxudmFyIFZhbGlkYXRpb25FcnJvciA9IHZhbGlkYXRvcnMuVmFsaWRhdGlvbkVycm9yXG4gICwgaXNFbXB0eVZhbHVlID0gdmFsaWRhdG9ycy5pc0VtcHR5VmFsdWVcbiAgLCBXaWRnZXQgPSB3aWRnZXRzLldpZGdldFxuICAsIGNsZWFuSVB2NkFkZHJlc3MgPSB2YWxpZGF0b3JzLmlwdjYuY2xlYW5JUHY2QWRkcmVzc1xuXG4vKipcbiAqIEFuIG9iamVjdCB0aGF0IGlzIHJlc3BvbnNpYmxlIGZvciBkb2luZyB2YWxpZGF0aW9uIGFuZCBub3JtYWxpc2F0aW9uLCBvclxuICogXCJjbGVhbmluZ1wiLCBmb3IgZXhhbXBsZTogYW4gRW1haWxGaWVsZCBtYWtlcyBzdXJlIGl0cyBkYXRhIGlzIGEgdmFsaWRcbiAqIGUtbWFpbCBhZGRyZXNzIGFuZCBtYWtlcyBzdXJlIHRoYXQgYWNjZXB0YWJsZSBcImJsYW5rXCIgdmFsdWVzIGFsbCBoYXZlIHRoZVxuICogc2FtZSByZXByZXNlbnRhdGlvbi5cbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEZpZWxkID0gQ29uY3VyLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBGaWVsZChrd2FyZ3MpIHtcbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtcbiAgICAgIHJlcXVpcmVkOiB0cnVlLCB3aWRnZXQ6IG51bGwsIGxhYmVsOiBudWxsLCBpbml0aWFsOiBudWxsLFxuICAgICAgaGVscFRleHQ6IG51bGwsIGVycm9yTWVzc2FnZXM6IG51bGwsIHNob3dIaWRkZW5Jbml0aWFsOiBmYWxzZSxcbiAgICAgIHZhbGlkYXRvcnM6IFtdLCBleHRyYUNsYXNzZXM6IG51bGxcbiAgICB9LCBrd2FyZ3MpXG4gICAgdGhpcy5yZXF1aXJlZCA9IGt3YXJncy5yZXF1aXJlZFxuICAgIHRoaXMubGFiZWwgPSBrd2FyZ3MubGFiZWxcbiAgICB0aGlzLmluaXRpYWwgPSBrd2FyZ3MuaW5pdGlhbFxuICAgIHRoaXMuc2hvd0hpZGRlbkluaXRpYWwgPSBrd2FyZ3Muc2hvd0hpZGRlbkluaXRpYWxcbiAgICB0aGlzLmhlbHBUZXh0ID0ga3dhcmdzLmhlbHBUZXh0IHx8ICcnXG4gICAgdGhpcy5leHRyYUNsYXNzZXMgPSBrd2FyZ3MuZXh0cmFDbGFzc2VzXG5cbiAgICB2YXIgd2lkZ2V0ID0ga3dhcmdzLndpZGdldCB8fCB0aGlzLndpZGdldFxuICAgIGlmICghKHdpZGdldCBpbnN0YW5jZW9mIFdpZGdldCkpIHtcbiAgICAgIC8vIFdlIG11c3QgaGF2ZSBhIFdpZGdldCBjb25zdHJ1Y3Rvciwgc28gY29uc3RydWN0IHdpdGggaXRcbiAgICAgIHdpZGdldCA9IG5ldyB3aWRnZXQoKVxuICAgIH1cbiAgICAvLyBMZXQgdGhlIHdpZGdldCBrbm93IHdoZXRoZXIgaXQgc2hvdWxkIGRpc3BsYXkgYXMgcmVxdWlyZWRcbiAgICB3aWRnZXQuaXNSZXF1aXJlZCA9IHRoaXMucmVxdWlyZWRcbiAgICAvLyBIb29rIGludG8gdGhpcy53aWRnZXRBdHRycygpIGZvciBhbnkgRmllbGQtc3BlY2lmaWMgSFRNTCBhdHRyaWJ1dGVzXG4gICAgb2JqZWN0LmV4dGVuZCh3aWRnZXQuYXR0cnMsIHRoaXMud2lkZ2V0QXR0cnMod2lkZ2V0KSlcbiAgICB0aGlzLndpZGdldCA9IHdpZGdldFxuXG4gICAgLy8gSW5jcmVtZW50IHRoZSBjcmVhdGlvbiBjb3VudGVyIGFuZCBzYXZlIG91ciBsb2NhbCBjb3B5XG4gICAgdGhpcy5jcmVhdGlvbkNvdW50ZXIgPSBGaWVsZC5jcmVhdGlvbkNvdW50ZXIrK1xuXG4gICAgLy8gQ29weSBlcnJvciBtZXNzYWdlcyBmb3IgdGhpcyBpbnN0YW5jZSBpbnRvIGEgbmV3IG9iamVjdCBhbmQgb3ZlcnJpZGVcbiAgICAvLyB3aXRoIGFueSBwcm92aWRlZCBlcnJvciBtZXNzYWdlcy5cbiAgICB0aGlzLmVycm9yTWVzc2FnZXMgPVxuICAgICAgICBvYmplY3QuZXh0ZW5kKHt9LCB0aGlzLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCBrd2FyZ3MuZXJyb3JNZXNzYWdlcyB8fCB7fSlcblxuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMuZGVmYXVsdFZhbGlkYXRvcnMuY29uY2F0KGt3YXJncy52YWxpZGF0b3JzKVxuICB9XG4gIC8qKiBEZWZhdWx0IHdpZGdldCB0byB1c2Ugd2hlbiByZW5kZXJpbmcgdGhpcyB0eXBlIG9mIEZpZWxkLiAqL1xuLCB3aWRnZXQ6IHdpZGdldHMuVGV4dElucHV0XG4gIC8qKiBEZWZhdWx0IHdpZGdldCB0byB1c2Ugd2hlbiByZW5kZXJpbmcgdGhpcyB0eXBlIG9mIGZpZWxkIGFzIGhpZGRlbi4gKi9cbiwgaGlkZGVuV2lkZ2V0OiB3aWRnZXRzLkhpZGRlbklucHV0XG4gIC8qKiBEZWZhdWx0IHNldCBvZiB2YWxpZGF0b3JzLiAqL1xuLCBkZWZhdWx0VmFsaWRhdG9yczogW11cbiAgLyoqIERlZmF1bHQgZXJyb3IgbWVzc2FnZXMuICovXG4sIGRlZmF1bHRFcnJvck1lc3NhZ2VzOiB7XG4gICAgcmVxdWlyZWQ6ICdUaGlzIGZpZWxkIGlzIHJlcXVpcmVkLidcbiAgLCBpbnZhbGlkOiAnRW50ZXIgYSB2YWxpZCB2YWx1ZS4nXG4gIH1cbn0pXG5cbi8qKlxuICogVHJhY2tzIGVhY2ggdGltZSBhIEZpZWxkIGluc3RhbmNlIGlzIGNyZWF0ZWQ7IHVzZWQgdG8gcmV0YWluIG9yZGVyLlxuICovXG5GaWVsZC5jcmVhdGlvbkNvdW50ZXIgPSAwXG5cbkZpZWxkLnByb3RvdHlwZS5wcmVwYXJlVmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdmFsdWVcbn1cblxuRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZVxufVxuXG5GaWVsZC5wcm90b3R5cGUudmFsaWRhdGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAodGhpcy5yZXF1aXJlZCAmJiBpc0VtcHR5VmFsdWUodmFsdWUpKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5yZXF1aXJlZClcbiAgfVxufVxuXG5GaWVsZC5wcm90b3R5cGUucnVuVmFsaWRhdG9ycyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmIChpc0VtcHR5VmFsdWUodmFsdWUpKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgdmFyIGVycm9ycyA9IFtdXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy52YWxpZGF0b3JzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHRyeSB7XG4gICAgICB2YWxpZGF0b3JzLmNhbGxWYWxpZGF0b3IodGhpcy52YWxpZGF0b3JzW2ldLCB2YWx1ZSlcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7XG4gICAgICAgIHRocm93IGVcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBlLmNvZGUgIT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgICB0eXBlb2YgdGhpcy5lcnJvck1lc3NhZ2VzW2UuY29kZV0gIT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgICB0aGlzLmVycm9yTWVzc2FnZXNbZS5jb2RlXSAhPT0gdGhpcy5kZWZhdWx0RXJyb3JNZXNzYWdlc1tlLmNvZGVdKSB7XG4gICAgICAgIHZhciBtZXNzYWdlID0gdGhpcy5lcnJvck1lc3NhZ2VzW2UuY29kZV1cbiAgICAgICAgaWYgKHR5cGVvZiBlLnBhcmFtcyAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIG1lc3NhZ2UgPSBmb3JtYXQobWVzc2FnZSwgZS5wYXJhbXMpXG4gICAgICAgIH1cbiAgICAgICAgZXJyb3JzLnB1c2gobWVzc2FnZSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBlcnJvcnMgPSBlcnJvcnMuY29uY2F0KGUubWVzc2FnZXMoKSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKGVycm9ycylcbiAgfVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGUgZ2l2ZW4gdmFsdWUgYW5kIHJldHVybnMgaXRzIFwiY2xlYW5lZFwiIHZhbHVlIGFzIGFuIGFwcHJvcHJpYXRlXG4gKiBKYXZhU2NyaXB0IG9iamVjdC5cbiAqXG4gKiBSYWlzZXMgVmFsaWRhdGlvbkVycm9yIGZvciBhbnkgZXJyb3JzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSB0aGUgdmFsdWUgdG8gYmUgdmFsaWRhdGVkLlxuICovXG5GaWVsZC5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IHRoaXMudG9KYXZhU2NyaXB0KHZhbHVlKVxuICB0aGlzLnZhbGlkYXRlKHZhbHVlKVxuICB0aGlzLnJ1blZhbGlkYXRvcnModmFsdWUpXG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIFJldHVybiB0aGUgdmFsdWUgdGhhdCBzaG91bGQgYmUgc2hvd24gZm9yIHRoaXMgZmllbGQgb24gcmVuZGVyIG9mIGEgYm91bmRcbiAqIGZvcm0sIGdpdmVuIHRoZSBzdWJtaXR0ZWQgUE9TVCBkYXRhIGZvciB0aGUgZmllbGQgYW5kIHRoZSBpbml0aWFsIGRhdGEsIGlmXG4gKiBhbnkuXG4gKlxuICogRm9yIG1vc3QgZmllbGRzLCB0aGlzIHdpbGwgc2ltcGx5IGJlIGRhdGE7IEZpbGVGaWVsZHMgbmVlZCB0byBoYW5kbGUgaXQgYSBiaXRcbiAqIGRpZmZlcmVudGx5LlxuICovXG5GaWVsZC5wcm90b3R5cGUuYm91bmREYXRhID0gZnVuY3Rpb24oZGF0YSwgaW5pdGlhbCkge1xuICByZXR1cm4gZGF0YVxufVxuXG4vKipcbiAqIFNwZWNpZmllcyBIVE1MIGF0dHJpYnV0ZXMgd2hpY2ggc2hvdWxkIGJlIGFkZGVkIHRvIGEgZ2l2ZW4gd2lkZ2V0IGZvciB0aGlzXG4gKiBmaWVsZC5cbiAqXG4gKiBAcGFyYW0ge1dpZGdldH0gd2lkZ2V0IGEgd2lkZ2V0LlxuICogQHJldHVybiBhbiBvYmplY3Qgc3BlY2lmeWluZyBIVE1MIGF0dHJpYnV0ZXMgdGhhdCBzaG91bGQgYmUgYWRkZWQgdG8gdGhlXG4gKiAgICAgICAgIGdpdmVuIHdpZGdldCwgYmFzZWQgb24gdGhpcyBmaWVsZC5cbiAqL1xuRmllbGQucHJvdG90eXBlLndpZGdldEF0dHJzID0gZnVuY3Rpb24od2lkZ2V0KSB7XG4gIHJldHVybiB7fVxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgZGF0YSBoYXMgY2hhbmdlZCBmcm9tIGluaXRpYWwuXG4gKi9cbkZpZWxkLnByb3RvdHlwZS5faGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKGluaXRpYWwsIGRhdGEpIHtcbiAgLy8gRm9yIHB1cnBvc2VzIG9mIHNlZWluZyB3aGV0aGVyIHNvbWV0aGluZyBoYXMgY2hhbmdlZCwgbnVsbCBpcyB0aGUgc2FtZVxuICAvLyBhcyBhbiBlbXB0eSBzdHJpbmcsIGlmIHRoZSBkYXRhIG9yIGluaXRhbCB2YWx1ZSB3ZSBnZXQgaXMgbnVsbCwgcmVwbGFjZVxuICAvLyBpdCB3aXRoICcnLlxuICB2YXIgZGF0YVZhbHVlID0gKGRhdGEgPT09IG51bGwgPyAnJyA6IGRhdGEpXG4gIHZhciBpbml0aWFsVmFsdWUgPSAoaW5pdGlhbCA9PT0gbnVsbCA/ICcnIDogaW5pdGlhbClcbiAgcmV0dXJuICgnJytpbml0aWFsVmFsdWUgIT0gJycrZGF0YVZhbHVlKVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBpcyBhIHZhbGlkIFN0cmluZy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIENoYXJGaWVsZCA9IEZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBDaGFyRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IENoYXJGaWVsZChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtcbiAgICAgIG1heExlbmd0aDogbnVsbCwgbWluTGVuZ3RoOiBudWxsXG4gICAgfSwga3dhcmdzKVxuICAgIHRoaXMubWF4TGVuZ3RoID0ga3dhcmdzLm1heExlbmd0aFxuICAgIHRoaXMubWluTGVuZ3RoID0ga3dhcmdzLm1pbkxlbmd0aFxuICAgIEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICAgIGlmICh0aGlzLm1pbkxlbmd0aCAhPT0gbnVsbCkge1xuICAgICAgdGhpcy52YWxpZGF0b3JzLnB1c2godmFsaWRhdG9ycy5NaW5MZW5ndGhWYWxpZGF0b3IodGhpcy5taW5MZW5ndGgpKVxuICAgIH1cbiAgICBpZiAodGhpcy5tYXhMZW5ndGggIT09IG51bGwpIHtcbiAgICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKHZhbGlkYXRvcnMuTWF4TGVuZ3RoVmFsaWRhdG9yKHRoaXMubWF4TGVuZ3RoKSlcbiAgICB9XG4gIH1cbn0pXG5cbkNoYXJGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKGlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuICByZXR1cm4gJycrdmFsdWVcbn1cblxuLyoqXG4gKiBJZiB0aGlzIGZpZWxkIGlzIGNvbmZpZ3VyZWQgdG8gZW5mb3JjZSBhIG1heGltdW0gbGVuZ3RoLCBhZGRzIGEgc3VpdGFibGVcbiAqIG1heExlbmd0aCBhdHRyaWJ1dGUgdG8gdGV4dCBpbnB1dCBmaWVsZHMuXG4gKlxuICogQHBhcmFtIHtXaWRnZXR9IHdpZGdldCB0aGUgd2lkZ2V0IGJlaW5nIHVzZWQgdG8gcmVuZGVyIHRoaXMgZmllbGQncyB2YWx1ZS5cbiAqXG4gKiBAcmV0dXJuIGFkZGl0aW9uYWwgYXR0cmlidXRlcyB3aGljaCBzaG91bGQgYmUgYWRkZWQgdG8gdGhlIGdpdmVuIHdpZGdldC5cbiAqL1xuQ2hhckZpZWxkLnByb3RvdHlwZS53aWRnZXRBdHRycyA9IGZ1bmN0aW9uKHdpZGdldCkge1xuICB2YXIgYXR0cnMgPSB7fVxuICBpZiAodGhpcy5tYXhMZW5ndGggIT09IG51bGwgJiYgKHdpZGdldCBpbnN0YW5jZW9mIHdpZGdldHMuVGV4dElucHV0IHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkZ2V0IGluc3RhbmNlb2Ygd2lkZ2V0cy5QYXNzd29yZElucHV0KSkge1xuICAgIGF0dHJzLm1heExlbmd0aCA9ICcnK3RoaXMubWF4TGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGF0dHJzXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGlzIGEgdmFsaWQgaW50ZWdlci5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEludGVnZXJGaWVsZCA9IEZpZWxkLmV4dGVuZCh7XG4gIHdpZGdldDogd2lkZ2V0cy5OdW1iZXJJbnB1dFxuLCBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gSW50ZWdlckZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBJbnRlZ2VyRmllbGQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7bWF4VmFsdWU6IG51bGwsIG1pblZhbHVlOiBudWxsfSwga3dhcmdzKVxuICAgIHRoaXMubWF4VmFsdWUgPSBrd2FyZ3MubWF4VmFsdWVcbiAgICB0aGlzLm1pblZhbHVlID0ga3dhcmdzLm1pblZhbHVlXG4gICAgRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG5cbiAgICBpZiAodGhpcy5taW5WYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgdGhpcy52YWxpZGF0b3JzLnB1c2godmFsaWRhdG9ycy5NaW5WYWx1ZVZhbGlkYXRvcih0aGlzLm1pblZhbHVlKSlcbiAgICB9XG4gICAgaWYgKHRoaXMubWF4VmFsdWUgIT09IG51bGwpIHtcbiAgICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKHZhbGlkYXRvcnMuTWF4VmFsdWVWYWxpZGF0b3IodGhpcy5tYXhWYWx1ZSkpXG4gICAgfVxuICB9XG59KVxuSW50ZWdlckZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcyA9XG4gICAgb2JqZWN0LmV4dGVuZCh7fSwgSW50ZWdlckZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcywge1xuICAgICAgaW52YWxpZDogJ0VudGVyIGEgd2hvbGUgbnVtYmVyLidcbiAgICB9KVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IE51bWJlcigpIGNhbiBiZSBjYWxsZWQgb24gdGhlIGlucHV0IHdpdGggYSByZXN1bHQgdGhhdCBpc24ndFxuICogTmFOIGFuZCBkb2Vzbid0IGNvbnRhaW4gYW55IGRlY2ltYWwgcG9pbnRzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSB0aGUgdmFsdWUgdG8gYmUgdmFsIGlkYXRlZC5cbiAqIEByZXR1cm4gdGhlIHJlc3VsdCBvZiBOdW1iZXIoKSwgb3IgbnVsbCBmb3IgZW1wdHkgdmFsdWVzLlxuICovXG5JbnRlZ2VyRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhbHVlID0gRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdC5jYWxsKHRoaXMsIHZhbHVlKVxuICBpZiAoaXNFbXB0eVZhbHVlKHZhbHVlKSkge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgdmFsdWUgPSBOdW1iZXIodmFsdWUpXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUudG9TdHJpbmcoKS5pbmRleE9mKCcuJykgIT0gLTEpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWQpXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbkludGVnZXJGaWVsZC5wcm90b3R5cGUud2lkZ2V0QXR0cnMgPSBmdW5jdGlvbih3aWRnZXQpIHtcbiAgdmFyIGF0dHJzID0gRmllbGQucHJvdG90eXBlLndpZGdldEF0dHJzLmNhbGwodGhpcywgd2lkZ2V0KVxuICBpZiAod2lkZ2V0IGluc3RhbmNlb2Ygd2lkZ2V0cy5OdW1iZXJJbnB1dCkge1xuICAgIGlmICh0aGlzLm1pblZhbHVlICE9PSBudWxsKSB7XG4gICAgICBhdHRycy5taW4gPSB0aGlzLm1pblZhbHVlXG4gICAgfVxuICAgIGlmICh0aGlzLm1heFZhbHVlICE9PSBudWxsKSB7XG4gICAgICBhdHRycy5tYXggPSB0aGlzLm1heFZhbHVlXG4gICAgfVxuICB9XG4gIHJldHVybiBhdHRyc1xufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBpcyBhIHZhbGlkIGZsb2F0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7SW50ZWdlckZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEZsb2F0RmllbGQgPSBJbnRlZ2VyRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEZsb2F0RmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IEZsb2F0RmllbGQoa3dhcmdzKSB9XG4gICAgSW50ZWdlckZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuLyoqIEZsb2F0IHZhbGlkYXRpb24gcmVndWxhciBleHByZXNzaW9uLCBhcyBwYXJzZUZsb2F0KCkgaXMgdG9vIGZvcmdpdmluZy4gKi9cbkZsb2F0RmllbGQuRkxPQVRfUkVHRVhQID0gL15bLStdPyg/OlxcZCsoPzpcXC5cXGQrKT98KD86XFxkKyk/XFwuXFxkKykkL1xuRmxvYXRGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMgPVxuICAgIG9iamVjdC5leHRlbmQoe30sIEZsb2F0RmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7XG4gICAgICBpbnZhbGlkOiAnRW50ZXIgYSBudW1iZXIuJ1xuICAgIH0pXG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgdGhlIGlucHV0IGxvb2tzIGxpa2UgdmFsaWQgaW5wdXQgZm9yIHBhcnNlRmxvYXQoKSBhbmQgdGhlXG4gKiByZXN1bHQgb2YgY2FsbGluZyBpdCBpc24ndCBOYU4uXG4gKlxuICogQHBhcmFtIHZhbHVlIHRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKlxuICogQHJldHVybiBhIE51bWJlciBvYnRhaW5lZCBmcm9tIHBhcnNlRmxvYXQoKSwgb3IgbnVsbCBmb3IgZW1wdHkgdmFsdWVzLlxuICovXG5GbG9hdEZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IEZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQuY2FsbCh0aGlzLCB2YWx1ZSlcbiAgaWYgKGlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG4gIHZhbHVlID0gdXRpbC5zdHJpcCh2YWx1ZSlcbiAgaWYgKCFGbG9hdEZpZWxkLkZMT0FUX1JFR0VYUC50ZXN0KHZhbHVlKSkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZClcbiAgfVxuICB2YWx1ZSA9IHBhcnNlRmxvYXQodmFsdWUpXG4gIGlmIChpc05hTih2YWx1ZSkpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWQpXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiBkYXRhIGhhcyBjaGFuZ2VkIGZyb20gaW5pdGlhbC4gSW4gSmF2YVNjcmlwdCwgdHJhaWxpbmcgemVyb2VzXG4gKiBpbiBmbG9hdHMgYXJlIGRyb3BwZWQgd2hlbiBhIGZsb2F0IGlzIGNvZXJjZWQgdG8gYSBTdHJpbmcsIHNvIGUuZy4sIGFuXG4gKiBpbml0aWFsIHZhbHVlIG9mIDEuMCB3b3VsZCBub3QgbWF0Y2ggYSBkYXRhIHZhbHVlIG9mICcxLjAnIGlmIHdlIHdlcmUgdG8gdXNlXG4gKiB0aGUgV2lkZ2V0IG9iamVjdCdzIF9oYXNDaGFuZ2VkLCB3aGljaCBjaGVja3MgY29lcmNlZCBTdHJpbmcgdmFsdWVzLlxuICogQHR5cGUgQm9vbGVhblxuICovXG5GbG9hdEZpZWxkLnByb3RvdHlwZS5faGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKGluaXRpYWwsIGRhdGEpIHtcbiAgLy8gRm9yIHB1cnBvc2VzIG9mIHNlZWluZyB3aGV0aGVyIHNvbWV0aGluZyBoYXMgY2hhbmdlZCwgbnVsbCBpcyB0aGUgc2FtZVxuICAvLyBhcyBhbiBlbXB0eSBzdHJpbmcsIGlmIHRoZSBkYXRhIG9yIGluaXRhbCB2YWx1ZSB3ZSBnZXQgaXMgbnVsbCwgcmVwbGFjZVxuICAvLyBpdCB3aXRoICcnLlxuICB2YXIgZGF0YVZhbHVlID0gKGRhdGEgPT09IG51bGwgPyAnJyA6IGRhdGEpXG4gIHZhciBpbml0aWFsVmFsdWUgPSAoaW5pdGlhbCA9PT0gbnVsbCA/ICcnIDogaW5pdGlhbClcbiAgaWYgKGluaXRpYWxWYWx1ZSA9PT0gZGF0YVZhbHVlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgZWxzZSBpZiAoaW5pdGlhbFZhbHVlID09PSAnJyB8fCBkYXRhVmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gKHBhcnNlRmxvYXQoJycraW5pdGlhbFZhbHVlKSAhPSBwYXJzZUZsb2F0KCcnK2RhdGFWYWx1ZSkpXG59XG5cbkZsb2F0RmllbGQucHJvdG90eXBlLndpZGdldEF0dHJzID0gZnVuY3Rpb24od2lkZ2V0KSB7XG4gIHZhciBhdHRycyA9IEludGVnZXJGaWVsZC5wcm90b3R5cGUud2lkZ2V0QXR0cnMuY2FsbCh0aGlzLCB3aWRnZXQpXG4gIGlmICh3aWRnZXQgaW5zdGFuY2VvZiB3aWRnZXRzLk51bWJlcklucHV0ICYmXG4gICAgICAhb2JqZWN0Lmhhc093bih3aWRnZXQuYXR0cnMsICdzdGVwJykpIHtcbiAgICBvYmplY3Quc2V0RGVmYXVsdChhdHRycywgJ3N0ZXAnLCAnYW55JylcbiAgfVxuICByZXR1cm4gYXR0cnNcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSBkZWNpbWFsIG51bWJlci5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIERlY2ltYWxGaWVsZCA9IEludGVnZXJGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gRGVjaW1hbEZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBEZWNpbWFsRmllbGQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7bWF4RGlnaXRzOiBudWxsLCBkZWNpbWFsUGxhY2VzOiBudWxsfSwga3dhcmdzKVxuICAgIHRoaXMubWF4RGlnaXRzID0ga3dhcmdzLm1heERpZ2l0c1xuICAgIHRoaXMuZGVjaW1hbFBsYWNlcyA9IGt3YXJncy5kZWNpbWFsUGxhY2VzXG4gICAgSW50ZWdlckZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuLyoqIERlY2ltYWwgdmFsaWRhdGlvbiByZWd1bGFyIGV4cHJlc3Npb24sIGluIGxpZXUgb2YgYSBEZWNpbWFsIHR5cGUuICovXG5EZWNpbWFsRmllbGQuREVDSU1BTF9SRUdFWFAgPSAvXlstK10/KD86XFxkKyg/OlxcLlxcZCspP3woPzpcXGQrKT9cXC5cXGQrKSQvXG5EZWNpbWFsRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBEZWNpbWFsRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7XG4gICAgICBpbnZhbGlkOiAnRW50ZXIgYSBudW1iZXIuJ1xuICAgICwgbWF4RGlnaXRzOiAnRW5zdXJlIHRoYXQgdGhlcmUgYXJlIG5vIG1vcmUgdGhhbiB7bWF4RGlnaXRzfSBkaWdpdHMgaW4gdG90YWwuJ1xuICAgICwgbWF4RGVjaW1hbFBsYWNlczogJ0Vuc3VyZSB0aGF0IHRoZXJlIGFyZSBubyBtb3JlIHRoYW4ge21heERlY2ltYWxQbGFjZXN9IGRlY2ltYWwgcGxhY2VzLidcbiAgICAsIG1heFdob2xlRGlnaXRzOiAnRW5zdXJlIHRoYXQgdGhlcmUgYXJlIG5vIG1vcmUgdGhhbiB7bWF4V2hvbGVEaWdpdHN9IGRpZ2l0cyBiZWZvcmUgdGhlIGRlY2ltYWwgcG9pbnQuJ1xuICAgIH0pXG5cbi8qKlxuICogRGVjaW1hbEZpZWxkIG92ZXJyaWRlcyB0aGUgY2xlYW4oKSBtZXRob2QgYXMgaXQgcGVyZm9ybXMgaXRzIG93biB2YWxpZGF0aW9uXG4gKiBhZ2FpbnN0IGEgZGlmZmVyZW50IHZhbHVlIHRoYW4gdGhhdCBnaXZlbiB0byBhbnkgZGVmaW5lZCB2YWxpZGF0b3JzLCBkdWUgdG9cbiAqIEphdmFTY3JpcHQgbGFja2luZyBhIGJ1aWx0LWluIERlY2ltYWwgdHlwZS4gRGVjaW1hbCBmb3JtYXQgYW5kIGNvbXBvbmVudCBzaXplXG4gKiBjaGVja3Mgd2lsbCBiZSBwZXJmb3JtZWQgYWdhaW5zdCBhIG5vcm1hbGlzZWQgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZVxuICogaW5wdXQsIHdoZXJlYXMgVmFsaWRhdG9ycyB3aWxsIGJlIHBhc3NlZCBhIGZsb2F0IHZlcnNpb24gb2YgdGhlIHZhbHVlIGZvclxuICogbWluL21heCBjaGVja2luZy5cbiAqIEBwYXJhbSB7c3RyaW5nfE51bWJlcn0gdmFsdWVcbiAqIEByZXR1cm4ge3N0cmluZ30gYSBub3JtYWxpc2VkIHZlcnNpb24gb2YgdGhlIGlucHV0LlxuICovXG5EZWNpbWFsRmllbGQucHJvdG90eXBlLmNsZWFuID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgLy8gVGFrZSBjYXJlIG9mIGVtcHR5LCByZXF1aXJlZCB2YWxpZGF0aW9uXG4gIEZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZS5jYWxsKHRoaXMsIHZhbHVlKVxuICBpZiAoaXNFbXB0eVZhbHVlKHZhbHVlKSkge1xuICAgIHJldHVybiBudWxsXG4gIH1cblxuICAvLyBDb2VyY2UgdG8gc3RyaW5nIGFuZCB2YWxpZGF0ZSB0aGF0IGl0IGxvb2tzIERlY2ltYWwtbGlrZVxuICB2YWx1ZSA9IHV0aWwuc3RyaXAoJycrdmFsdWUpXG4gIGlmICghRGVjaW1hbEZpZWxkLkRFQ0lNQUxfUkVHRVhQLnRlc3QodmFsdWUpKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5pbnZhbGlkKVxuICB9XG5cbiAgLy8gSW4gbGlldSBvZiBhIERlY2ltYWwgdHlwZSwgRGVjaW1hbEZpZWxkIHZhbGlkYXRlcyBhZ2FpbnN0IGEgc3RyaW5nXG4gIC8vIHJlcHJlc2VudGF0aW9uIG9mIGEgRGVjaW1hbCwgaW4gd2hpY2g6XG4gIC8vICogQW55IGxlYWRpbmcgc2lnbiBoYXMgYmVlbiBzdHJpcHBlZFxuICB2YXIgbmVnYXRpdmUgPSBmYWxzZVxuICBpZiAodmFsdWUuY2hhckF0KDApID09ICcrJyB8fCB2YWx1ZS5jaGFyQXQoMCkgPT0gJy0nKSB7XG4gICAgbmVnYXRpdmUgPSAodmFsdWUuY2hhckF0KDApID09ICctJylcbiAgICB2YWx1ZSA9IHZhbHVlLnN1YnN0cigxKVxuICB9XG4gIC8vICogTGVhZGluZyB6ZXJvcyBoYXZlIGJlZW4gc3RyaXBwZWQgZnJvbSBkaWdpdHMgYmVmb3JlIHRoZSBkZWNpbWFsIHBvaW50LFxuICAvLyAgIGJ1dCB0cmFpbGluZyBkaWdpdHMgYXJlIHJldGFpbmVkIGFmdGVyIHRoZSBkZWNpbWFsIHBvaW50LlxuICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoL14wKy8sICcnKVxuXG4gIC8vIFBlcmZvcm0gb3duIHZhbGlkYXRpb25cbiAgdmFyIHBpZWNlcyA9IHZhbHVlLnNwbGl0KCcuJylcbiAgICAsIHdob2xlRGlnaXRzID0gcGllY2VzWzBdLmxlbmd0aFxuICAgICwgZGVjaW1hbHMgPSAocGllY2VzLmxlbmd0aCA9PSAyID8gcGllY2VzWzFdLmxlbmd0aCA6IDApXG4gICAgLCBkaWdpdHMgPSB3aG9sZURpZ2l0cyArIGRlY2ltYWxzXG4gIGlmICh0aGlzLm1heERpZ2l0cyAhPT0gbnVsbCAmJiBkaWdpdHMgPiB0aGlzLm1heERpZ2l0cykge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcihmb3JtYXQodGhpcy5lcnJvck1lc3NhZ2VzLm1heERpZ2l0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXhEaWdpdHM6IHRoaXMubWF4RGlnaXRzfSkpXG4gIH1cbiAgaWYgKHRoaXMuZGVjaW1hbFBsYWNlcyAhPT0gbnVsbCAmJiBkZWNpbWFscyA+IHRoaXMuZGVjaW1hbFBsYWNlcykge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcihmb3JtYXQodGhpcy5lcnJvck1lc3NhZ2VzLm1heERlY2ltYWxQbGFjZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWF4RGVjaW1hbFBsYWNlczogdGhpcy5kZWNpbWFsUGxhY2VzfSkpXG4gIH1cbiAgaWYgKHRoaXMubWF4RGlnaXRzICE9PSBudWxsICYmXG4gICAgICB0aGlzLmRlY2ltYWxQbGFjZXMgIT09IG51bGwgJiZcbiAgICAgIHdob2xlRGlnaXRzID4gKHRoaXMubWF4RGlnaXRzIC0gdGhpcy5kZWNpbWFsUGxhY2VzKSkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcihmb3JtYXQodGhpcy5lcnJvck1lc3NhZ2VzLm1heFdob2xlRGlnaXRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21heFdob2xlRGlnaXRzOiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXhEaWdpdHMgLSB0aGlzLmRlY2ltYWxQbGFjZXMpfSkpXG4gIH1cblxuICAvLyAqIFZhbHVlcyB3aGljaCBkaWQgbm90IGhhdmUgYSBsZWFkaW5nIHplcm8gZ2FpbiBhIHNpbmdsZSBsZWFkaW5nIHplcm9cbiAgaWYgKHZhbHVlLmNoYXJBdCgwKSA9PSAnLicpIHtcbiAgICB2YWx1ZSA9ICcwJyArIHZhbHVlXG4gIH1cbiAgLy8gUmVzdG9yZSBzaWduIGlmIG5lY2Vzc2FyeVxuICBpZiAobmVnYXRpdmUpIHtcbiAgICB2YWx1ZSA9ICctJyArIHZhbHVlXG4gIH1cblxuICAvLyBWYWxpZGF0ZSBhZ2FpbnN0IGEgZmxvYXQgdmFsdWUgLSBiZXN0IHdlIGNhbiBkbyBpbiB0aGUgbWVhbnRpbWVcbiAgdGhpcy5ydW5WYWxpZGF0b3JzKHBhcnNlRmxvYXQodmFsdWUpKVxuXG4gIC8vIFJldHVybiB0aGUgbm9ybWFsaXRlZCBTdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgcmV0dXJuIHZhbHVlXG59XG5cbkRlY2ltYWxGaWVsZC5wcm90b3R5cGUud2lkZ2V0QXR0cnMgPSBmdW5jdGlvbih3aWRnZXQpIHtcbiAgdmFyIGF0dHJzID0gSW50ZWdlckZpZWxkLnByb3RvdHlwZS53aWRnZXRBdHRycy5jYWxsKHRoaXMsIHdpZGdldClcbiAgaWYgKHdpZGdldCBpbnN0YW5jZW9mIHdpZGdldHMuTnVtYmVySW5wdXQgJiZcbiAgICAgICFvYmplY3QuaGFzT3duKHdpZGdldC5hdHRycywgJ3N0ZXAnKSkge1xuICAgIHZhciBzdGVwID0gJ2FueSdcbiAgICBpZiAodGhpcy5kZWNpbWFsUGxhY2VzICE9PSBudWxsKSB7XG4gICAgICAvLyBVc2UgZXhwb25lbnRpYWwgbm90YXRpb24gZm9yIHNtYWxsIHZhbHVlcyBzaW5jZSB0aGV5IG1pZ2h0XG4gICAgICAvLyBiZSBwYXJzZWQgYXMgMCBvdGhlcndpc2UuXG4gICAgICBpZiAodGhpcy5kZWNpbWFsUGxhY2VzID09PSAwKSB7XG4gICAgICAgIHN0ZXAgPSAnMSdcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuZGVjaW1hbFBsYWNlcyA8IDcpIHtcbiAgICAgICAgc3RlcCA9ICcwLicgKyAnMDAwMDAxJy5zbGljZSgtdGhpcy5kZWNpbWFsUGxhY2VzKVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHN0ZXAgPSAnMWUtJyArIHRoaXMuZGVjaW1hbFBsYWNlc1xuICAgICAgfVxuICAgIH1cbiAgICBvYmplY3Quc2V0RGVmYXVsdChhdHRycywgJ3N0ZXAnLCBzdGVwKVxuICB9XG4gIHJldHVybiBhdHRyc1xufVxuXG4vKipcbiAqIEJhc2UgZmllbGQgZm9yIGZpZWxkcyB3aGljaCB2YWxpZGF0ZSB0aGF0IHRoZWlyIGlucHV0IGlzIGEgZGF0ZSBvciB0aW1lLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7RmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgQmFzZVRlbXBvcmFsRmllbGQgPSBGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gQmFzZVRlbXBvcmFsRmllbGQoa3dhcmdzKSB7XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7aW5wdXRGb3JtYXRzOiBudWxsfSwga3dhcmdzKVxuICAgIEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICAgIGlmIChrd2FyZ3MuaW5wdXRGb3JtYXRzICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmlucHV0Rm9ybWF0cyA9IGt3YXJncy5pbnB1dEZvcm1hdHNcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGlzIGEgdmFsaWQgZGF0ZSBvciB0aW1lLlxuICogQHBhcmFtIHtTdHJpbmd8RGF0ZX1cbiAqIEByZXR1cm4ge0RhdGV9XG4gKi9cbkJhc2VUZW1wb3JhbEZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAoIWlzLkRhdGUodmFsdWUpKSB7XG4gICAgdmFsdWUgPSB1dGlsLnN0cmlwKHZhbHVlKVxuICB9XG4gIGlmIChpcy5TdHJpbmcodmFsdWUpKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmlucHV0Rm9ybWF0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0cnBkYXRlKHZhbHVlLCB0aGlzLmlucHV0Rm9ybWF0c1tpXSlcbiAgICAgIH1cbiAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZClcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgRGF0ZSBmcm9tIHRoZSBnaXZlbiBpbnB1dCBpZiBpdCdzIHZhbGlkIGJhc2VkIG9uIGEgZm9ybWF0LlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlXG4gKiBAcGFyYW0ge1N0cmluZ30gZm9ybWF0XG4gKiBAcmV0dXJuIHtEYXRlfVxuICovXG5CYXNlVGVtcG9yYWxGaWVsZC5wcm90b3R5cGUuc3RycGRhdGUgPSBmdW5jdGlvbih2YWx1ZSwgZm9ybWF0KSB7XG4gIHJldHVybiB0aW1lLnN0cnBkYXRlKHZhbHVlLCBmb3JtYXQpXG59XG5cbkJhc2VUZW1wb3JhbEZpZWxkLnByb3RvdHlwZS5faGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKGluaXRpYWwsIGRhdGEpIHtcbiAgdHJ5IHtcbiAgICBkYXRhID0gdGhpcy50b0phdmFTY3JpcHQoZGF0YSlcbiAgfVxuICBjYXRjaCAoZSkge1xuICAgIGlmICghKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7IHRocm93IGUgfVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaW5pdGlhbCA9IHRoaXMudG9KYXZhU2NyaXB0KGluaXRpYWwpXG4gIGlmICghIWluaXRpYWwgJiYgISFkYXRhKSB7XG4gICAgcmV0dXJuIGluaXRpYWwuZ2V0VGltZSgpICE9PSBkYXRhLmdldFRpbWUoKVxuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiBpbml0aWFsICE9PSBkYXRhXG4gIH1cbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSBkYXRlLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7QmFzZVRlbXBvcmFsRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgRGF0ZUZpZWxkID0gQmFzZVRlbXBvcmFsRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIERhdGVGaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgRGF0ZUZpZWxkKGt3YXJncykgfVxuICAgIEJhc2VUZW1wb3JhbEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIHdpZGdldDogd2lkZ2V0cy5EYXRlSW5wdXRcbiwgaW5wdXRGb3JtYXRzOiB1dGlsLkRFRkFVTFRfREFURV9JTlBVVF9GT1JNQVRTXG59KVxuRGF0ZUZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcyA9XG4gICAgb2JqZWN0LmV4dGVuZCh7fSwgRGF0ZUZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcywge1xuICAgICAgaW52YWxpZDogJ0VudGVyIGEgdmFsaWQgZGF0ZS4nXG4gICAgfSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCB0aGUgaW5wdXQgY2FuIGJlIGNvbnZlcnRlZCB0byBhIGRhdGUuXG4gKiBAcGFyYW0ge1N0cmluZ3xEYXRlfSB2YWx1ZSB0aGUgdmFsdWUgdG8gYmUgdmFsaWRhdGVkLlxuICogQHJldHVybiB7P0RhdGV9IGEgd2l0aCBpdHMgeWVhciwgbW9udGggYW5kIGRheSBhdHRyaWJ1dGVzIHNldCwgb3IgbnVsbCBmb3JcbiAqICAgICBlbXB0eSB2YWx1ZXMgd2hlbiB0aGV5IGFyZSBhbGxvd2VkLlxuICovXG5EYXRlRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmIChpc0VtcHR5VmFsdWUodmFsdWUpKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHZhbHVlLmdldEZ1bGxZZWFyKCksIHZhbHVlLmdldE1vbnRoKCksIHZhbHVlLmdldERhdGUoKSlcbiAgfVxuICByZXR1cm4gQmFzZVRlbXBvcmFsRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdC5jYWxsKHRoaXMsIHZhbHVlKVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBpcyBhIHRpbWUuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtCYXNlVGVtcG9yYWxGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBUaW1lRmllbGQgPSBCYXNlVGVtcG9yYWxGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gVGltZUZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBUaW1lRmllbGQoa3dhcmdzKSB9XG4gICAgQmFzZVRlbXBvcmFsRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgd2lkZ2V0OiB3aWRnZXRzLlRpbWVJbnB1dFxuLCBpbnB1dEZvcm1hdHM6IHV0aWwuREVGQVVMVF9USU1FX0lOUFVUX0ZPUk1BVFNcbn0pXG5UaW1lRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBUaW1lRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7XG4gICAgICBpbnZhbGlkOiAnRW50ZXIgYSB2YWxpZCB0aW1lLidcbiAgICB9KVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IHRoZSBpbnB1dCBjYW4gYmUgY29udmVydGVkIHRvIGEgdGltZS5cbiAqIEBwYXJhbSB7U3RyaW5nfERhdGV9IHZhbHVlIHRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKiBAcmV0dXJuIHs/RGF0ZX0gYSBEYXRlIHdpdGggaXRzIGhvdXIsIG1pbnV0ZSBhbmQgc2Vjb25kIGF0dHJpYnV0ZXMgc2V0LCBvclxuICogICAgIG51bGwgZm9yIGVtcHR5IHZhbHVlcyB3aGVuIHRoZXkgYXJlIGFsbG93ZWQuXG4gKi9cblRpbWVGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKGlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoMTkwMCwgMCwgMSwgdmFsdWUuZ2V0SG91cnMoKSwgdmFsdWUuZ2V0TWludXRlcygpLCB2YWx1ZS5nZXRTZWNvbmRzKCkpXG4gIH1cbiAgcmV0dXJuIEJhc2VUZW1wb3JhbEZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQuY2FsbCh0aGlzLCB2YWx1ZSlcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgRGF0ZSByZXByZXNlbnRpbmcgYSB0aW1lIGZyb20gdGhlIGdpdmVuIGlucHV0IGlmIGl0J3MgdmFsaWQgYmFzZWRcbiAqIG9uIHRoZSBmb3JtYXQuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBmb3JtYXRcbiAqIEByZXR1cm4ge0RhdGV9XG4gKi9cblRpbWVGaWVsZC5wcm90b3R5cGUuc3RycGRhdGUgPSBmdW5jdGlvbih2YWx1ZSwgZm9ybWF0KSB7XG4gIHZhciB0ID0gdGltZS5zdHJwdGltZSh2YWx1ZSwgZm9ybWF0KVxuICByZXR1cm4gbmV3IERhdGUoMTkwMCwgMCwgMSwgdFszXSwgdFs0XSwgdFs1XSlcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSBkYXRlL3RpbWUuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtCYXNlVGVtcG9yYWxGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBEYXRlVGltZUZpZWxkID0gQmFzZVRlbXBvcmFsRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIERhdGVUaW1lRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IERhdGVUaW1lRmllbGQoa3dhcmdzKSB9XG4gICAgQmFzZVRlbXBvcmFsRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgd2lkZ2V0OiB3aWRnZXRzLkRhdGVUaW1lSW5wdXRcbiwgaW5wdXRGb3JtYXRzOiB1dGlsLkRFRkFVTFRfREFURVRJTUVfSU5QVVRfRk9STUFUU1xufSlcbkRhdGVUaW1lRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBEYXRlVGltZUZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcywge1xuICAgICAgaW52YWxpZDogJ0VudGVyIGEgdmFsaWQgZGF0ZS90aW1lLidcbiAgICB9KVxuXG4vKipcbiAqIEBwYXJhbSB7U3RyaW5nfERhdGV8QXJyYXkuPERhdGU+fVxuICogQHJldHVybiB7P0RhdGV9XG4gKi9cbkRhdGVUaW1lRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmIChpc0VtcHR5VmFsdWUodmFsdWUpKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cbiAgaWYgKGlzLkFycmF5KHZhbHVlKSkge1xuICAgIC8vIElucHV0IGNvbWVzIGZyb20gYSBTcGxpdERhdGVUaW1lV2lkZ2V0LCBmb3IgZXhhbXBsZSwgc28gaXQncyB0d29cbiAgICAvLyBjb21wb25lbnRzOiBkYXRlIGFuZCB0aW1lLlxuICAgIGlmICh2YWx1ZS5sZW5ndGggIT0gMikge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5pbnZhbGlkKVxuICAgIH1cbiAgICBpZiAoaXNFbXB0eVZhbHVlKHZhbHVlWzBdKSAmJlxuICAgICAgICBpc0VtcHR5VmFsdWUodmFsdWVbMV0pKSB7XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cbiAgICB2YWx1ZSA9IHZhbHVlLmpvaW4oJyAnKVxuICB9XG4gIHJldHVybiBCYXNlVGVtcG9yYWxGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0LmNhbGwodGhpcywgdmFsdWUpXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IG1hdGNoZXMgYSBnaXZlbiByZWd1bGFyIGV4cHJlc3Npb24uXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtDaGFyRmllbGR9XG4gKiBAcGFyYW0ge3tyZWdleHB8c3RyaW5nfX0gcmVnZXhcbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBSZWdleEZpZWxkID0gQ2hhckZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBSZWdleEZpZWxkKHJlZ2V4LCBrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgUmVnZXhGaWVsZChyZWdleCwga3dhcmdzKSB9XG4gICAgQ2hhckZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICAgIGlmIChpcy5TdHJpbmcocmVnZXgpKSB7XG4gICAgICByZWdleCA9IG5ldyBSZWdFeHAocmVnZXgpXG4gICAgfVxuICAgIHRoaXMucmVnZXggPSByZWdleFxuICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKHZhbGlkYXRvcnMuUmVnZXhWYWxpZGF0b3Ioe3JlZ2V4OiB0aGlzLnJlZ2V4fSkpXG4gIH1cbn0pXG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGFwcGVhcnMgdG8gYmUgYSB2YWxpZCBlLW1haWwgYWRkcmVzcy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0NoYXJGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBFbWFpbEZpZWxkID0gQ2hhckZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBFbWFpbEZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBFbWFpbEZpZWxkKGt3YXJncykgfVxuICAgIENoYXJGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuLCB3aWRnZXQ6IHdpZGdldHMuRW1haWxJbnB1dFxuLCBkZWZhdWx0VmFsaWRhdG9yczogW3ZhbGlkYXRvcnMudmFsaWRhdGVFbWFpbF1cbn0pXG5cbkVtYWlsRmllbGQucHJvdG90eXBlLmNsZWFuID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFsdWUgPSB1dGlsLnN0cmlwKHRoaXMudG9KYXZhU2NyaXB0KHZhbHVlKSlcbiAgcmV0dXJuIENoYXJGaWVsZC5wcm90b3R5cGUuY2xlYW4uY2FsbCh0aGlzLCB2YWx1ZSlcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSB2YWxpZCB1cGxvYWRlZCBmaWxlLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7RmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgRmlsZUZpZWxkID0gRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEZpbGVGaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgRmlsZUZpZWxkKGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe21heExlbmd0aDogbnVsbCwgYWxsb3dFbXB0eUZpbGU6IGZhbHNlfSwga3dhcmdzKVxuICAgIHRoaXMubWF4TGVuZ3RoID0ga3dhcmdzLm1heExlbmd0aFxuICAgIHRoaXMuYWxsb3dFbXB0eUZpbGUgPSBrd2FyZ3MuYWxsb3dFbXB0eUZpbGVcbiAgICBkZWxldGUga3dhcmdzLm1heExlbmd0aFxuICAgIEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIHdpZGdldDogd2lkZ2V0cy5DbGVhcmFibGVGaWxlSW5wdXRcbn0pXG5GaWxlRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBGaWxlRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7XG4gICAgICBpbnZhbGlkOiAnTm8gZmlsZSB3YXMgc3VibWl0dGVkLiBDaGVjayB0aGUgZW5jb2RpbmcgdHlwZSBvbiB0aGUgZm9ybS4nXG4gICAgLCBtaXNzaW5nOiAnTm8gZmlsZSB3YXMgc3VibWl0dGVkLidcbiAgICAsIGVtcHR5OiAnVGhlIHN1Ym1pdHRlZCBmaWxlIGlzIGVtcHR5LidcbiAgICAsIG1heExlbmd0aDogJ0Vuc3VyZSB0aGlzIGZpbGVuYW1lIGhhcyBhdCBtb3N0IHttYXh9IGNoYXJhY3RlcnMgKGl0IGhhcyB7bGVuZ3RofSkuJ1xuICAgICwgY29udHJhZGljdG9uOiAnUGxlYXNlIGVpdGhlciBzdWJtaXQgYSBmaWxlIG9yIGNoZWNrIHRoZSBjbGVhciBjaGVja2JveCwgbm90IGJvdGguJ1xuICAgIH0pXG5cbkZpbGVGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24oZGF0YSwgaW5pdGlhbCkge1xuICBpZiAoaXNFbXB0eVZhbHVlKGRhdGEpKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuICAvLyBVcGxvYWRlZEZpbGUgb2JqZWN0cyBzaG91bGQgaGF2ZSBuYW1lIGFuZCBzaXplIGF0dHJpYnV0ZXNcbiAgaWYgKHR5cGVvZiBkYXRhLm5hbWUgPT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIGRhdGEuc2l6ZSA9PSAndW5kZWZpbmVkJykge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZClcbiAgfVxuXG4gIHZhciBmaWxlTmFtZSA9IGRhdGEubmFtZVxuICAgICwgZmlsZVNpemUgPSBkYXRhLnNpemVcblxuICBpZiAodGhpcy5tYXhMZW5ndGggIT09IG51bGwgJiYgZmlsZU5hbWUubGVuZ3RoID4gdGhpcy5tYXhMZW5ndGgpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IoZm9ybWF0KHRoaXMuZXJyb3JNZXNzYWdlcy5tYXhMZW5ndGgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXg6IHRoaXMubWF4TGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICwgbGVuZ3RoOiBmaWxlTmFtZS5sZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpXG4gIH1cbiAgaWYgKCFmaWxlTmFtZSkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZClcbiAgfVxuICBpZiAoIXRoaXMuYWxsb3dFbXB0eUZpbGUgJiYgIWZpbGVTaXplKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5lbXB0eSlcbiAgfVxuICByZXR1cm4gZGF0YVxufVxuXG5GaWxlRmllbGQucHJvdG90eXBlLmNsZWFuID0gZnVuY3Rpb24oZGF0YSwgaW5pdGlhbCkge1xuICAvLyBJZiB0aGUgd2lkZ2V0IGdvdCBjb250cmFkaWN0b3J5IGlucHV0cywgd2UgcmFpc2UgYSB2YWxpZGF0aW9uIGVycm9yXG4gIGlmIChkYXRhID09PSB3aWRnZXRzLkZJTEVfSU5QVVRfQ09OVFJBRElDVElPTikge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuY29udHJhZGljdGlvbilcbiAgfVxuICAvLyBmYWxzZSBtZWFucyB0aGUgZmllbGQgdmFsdWUgc2hvdWxkIGJlIGNsZWFyZWQ7IGZ1cnRoZXIgdmFsaWRhdGlvbiBpc1xuICAvLyBub3QgbmVlZGVkLlxuICBpZiAoZGF0YSA9PT0gZmFsc2UpIHtcbiAgICBpZiAoIXRoaXMucmVxdWlyZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICAvLyBJZiB0aGUgZmllbGQgaXMgcmVxdWlyZWQsIGNsZWFyaW5nIGlzIG5vdCBwb3NzaWJsZSAodGhlIHdpZGdldFxuICAgIC8vIHNob3VsZG4ndCByZXR1cm4gZmFsc2UgZGF0YSBpbiB0aGF0IGNhc2UgYW55d2F5KS4gRmFsc2UgaXMgbm90XG4gICAgLy8gaW4gRU1QVFlfVkFMVUVTOyBpZiBhIEZhbHNlIHZhbHVlIG1ha2VzIGl0IHRoaXMgZmFyIGl0IHNob3VsZCBiZVxuICAgIC8vIHZhbGlkYXRlZCBmcm9tIGhlcmUgb24gb3V0IGFzIG51bGwgKHNvIGl0IHdpbGwgYmUgY2F1Z2h0IGJ5IHRoZVxuICAgIC8vIHJlcXVpcmVkIGNoZWNrKS5cbiAgICBkYXRhID0gbnVsbFxuICB9XG4gIGlmICghZGF0YSAmJiBpbml0aWFsKSB7XG4gICAgcmV0dXJuIGluaXRpYWxcbiAgfVxuICByZXR1cm4gQ2hhckZpZWxkLnByb3RvdHlwZS5jbGVhbi5jYWxsKHRoaXMsIGRhdGEpXG59XG5cbkZpbGVGaWVsZC5wcm90b3R5cGUuYm91bmREYXRhID0gZnVuY3Rpb24oZGF0YSwgaW5pdGlhbCkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCB8fCBkYXRhID09PSB3aWRnZXRzLkZJTEVfSU5QVVRfQ09OVFJBRElDVElPTikge1xuICAgIHJldHVybiBpbml0aWFsXG4gIH1cbiAgcmV0dXJuIGRhdGFcbn1cblxuRmlsZUZpZWxkLnByb3RvdHlwZS5faGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKGluaXRpYWwsIGRhdGEpIHtcbiAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBpcyBhIHZhbGlkIHVwbG9hZGVkIGltYWdlLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7RmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgSW1hZ2VGaWVsZCA9IEZpbGVGaWVsZC5leHRlbmQoe1xuY29uc3RydWN0b3I6IGZ1bmN0aW9uIEltYWdlRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IEltYWdlRmllbGQoa3dhcmdzKSB9XG4gICAgRmlsZUZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuSW1hZ2VGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMgPVxuICAgIG9iamVjdC5leHRlbmQoe30sIEltYWdlRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7XG4gICAgICBpbnZhbGlkSW1hZ2U6ICdVcGxvYWQgYSB2YWxpZCBpbWFnZS4gVGhlIGZpbGUgeW91IHVwbG9hZGVkIHdhcyBlaXRoZXIgbm90IGFuIGltYWdlIG9yIGEgY29ycnVwdGVkIGltYWdlLidcbiAgICB9KVxuXG4vKipcbiAqIENoZWNrcyB0aGF0IHRoZSBmaWxlLXVwbG9hZCBmaWVsZCBkYXRhIGNvbnRhaW5zIGEgdmFsaWQgaW1hZ2UuXG4gKi9cbkltYWdlRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKGRhdGEsIGluaXRpYWwpIHtcbiAgdmFyIGYgPSBGaWxlRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdC5jYWxsKHRoaXMsIGRhdGEsIGluaXRpYWwpXG4gIGlmIChmID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIC8vIFRPRE8gUGx1ZyBpbiBpbWFnZSBwcm9jZXNzaW5nIGNvZGUgd2hlbiBydW5uaW5nIG9uIHRoZSBzZXJ2ZXJcblxuICByZXR1cm4gZlxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBhcHBlYXJzIHRvIGJlIGEgdmFsaWQgVVJMLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7Q2hhckZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFVSTEZpZWxkID0gQ2hhckZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBVUkxGaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgVVJMRmllbGQoa3dhcmdzKSB9XG4gICAgQ2hhckZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKHZhbGlkYXRvcnMuVVJMVmFsaWRhdG9yKCkpXG4gIH1cbiwgd2lkZ2V0OiB3aWRnZXRzLlVSTElucHV0XG59KVxuVVJMRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBVUkxGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMsIHtcbiAgICAgIGludmFsaWQ6ICdFbnRlciBhIHZhbGlkIFVSTC4nXG4gICAgLCBpbnZhbGlkTGluazogJ1RoaXMgVVJMIGFwcGVhcnMgdG8gYmUgYSBicm9rZW4gbGluay4nXG4gICAgfSlcblxuVVJMRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSkge1xuICAgIHZhciB1cmxGaWVsZHMgPSB1cmwucGFyc2VVcmkodmFsdWUpXG4gICAgaWYgKCF1cmxGaWVsZHMucHJvdG9jb2wpIHtcbiAgICAgIC8vIElmIG5vIFVSTCBwcm90b2NvbCBnaXZlbiwgYXNzdW1lIGh0dHA6Ly9cbiAgICAgIHVybEZpZWxkcy5wcm90b2NvbCA9ICdodHRwJ1xuICAgIH1cbiAgICBpZiAoIXVybEZpZWxkcy5wYXRoKSB7XG4gICAgICAvLyBUaGUgcGF0aCBwb3J0aW9uIG1heSBuZWVkIHRvIGJlIGFkZGVkIGJlZm9yZSBxdWVyeSBwYXJhbXNcbiAgICAgIHVybEZpZWxkcy5wYXRoID0gJy8nXG4gICAgfVxuICAgIHZhbHVlID0gdXJsLm1ha2VVcmkodXJsRmllbGRzKVxuICB9XG4gIHJldHVybiBDaGFyRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdC5jYWxsKHRoaXMsIHZhbHVlKVxufVxuXG5VUkxGaWVsZC5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IHV0aWwuc3RyaXAodGhpcy50b0phdmFTY3JpcHQodmFsdWUpKVxuICByZXR1cm4gQ2hhckZpZWxkLnByb3RvdHlwZS5jbGVhbi5jYWxsKHRoaXMsIHZhbHVlKVxufVxuXG4vKipcbiAqIE5vcm1hbGlzZXMgaXRzIGlucHV0IHRvIGEgQm9vbGVhbnByaW1pdGl2ZS5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEJvb2xlYW5GaWVsZCA9IEZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBCb29sZWFuRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IEJvb2xlYW5GaWVsZChrd2FyZ3MpIH1cbiAgICBGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuLCB3aWRnZXQ6IHdpZGdldHMuQ2hlY2tib3hJbnB1dFxufSlcblxuQm9vbGVhbkZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAvLyBFeHBsaWNpdGx5IGNoZWNrIGZvciBhICdmYWxzZScgc3RyaW5nLCB3aGljaCBpcyB3aGF0IGEgaGlkZGVuIGZpZWxkIHdpbGxcbiAgLy8gc3VibWl0IGZvciBmYWxzZS4gQWxzbyBjaGVjayBmb3IgJzAnLCBzaW5jZSB0aGlzIGlzIHdoYXQgUmFkaW9TZWxlY3Qgd2lsbFxuICAvLyBwcm92aWRlLiBCZWNhdXNlIEJvb2xlYW4oJ2FueXRoaW5nJykgPT0gdHJ1ZSwgd2UgZG9uJ3QgbmVlZCB0byBoYW5kbGUgdGhhdFxuICAvLyBleHBsaWNpdGx5LlxuICBpZiAoaXMuU3RyaW5nKHZhbHVlKSAmJiAodmFsdWUudG9Mb3dlckNhc2UoKSA9PSAnZmFsc2UnIHx8IHZhbHVlID09ICcwJykpIHtcbiAgICB2YWx1ZSA9IGZhbHNlXG4gIH1cbiAgZWxzZSB7XG4gICAgdmFsdWUgPSBCb29sZWFuKHZhbHVlKVxuICB9XG4gIHZhbHVlID0gRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdC5jYWxsKHRoaXMsIHZhbHVlKVxuICBpZiAoIXZhbHVlICYmIHRoaXMucmVxdWlyZWQpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLnJlcXVpcmVkKVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG5Cb29sZWFuRmllbGQucHJvdG90eXBlLl9oYXNDaGFuZ2VkID0gZnVuY3Rpb24oaW5pdGlhbCwgZGF0YSkge1xuICAvLyBTb21ldGltZXMgZGF0YSBvciBpbml0aWFsIGNvdWxkIGJlIG51bGwgb3IgJycgd2hpY2ggc2hvdWxkIGJlIHRoZSBzYW1lXG4gIC8vIHRoaW5nIGFzIGZhbHNlLlxuICBpZiAoaW5pdGlhbCA9PT0gJ2ZhbHNlJykge1xuICAgIC8vIHNob3dIaWRkZW5Jbml0aWFsIG1heSBoYXZlIHRyYW5zZm9ybWVkIGZhbHNlIHRvICdmYWxzZSdcbiAgICBpbml0aWFsID0gZmFsc2VcbiAgfVxuICByZXR1cm4gKEJvb2xlYW4oaW5pdGlhbCkgIT0gQm9vbGVhbihkYXRhKSlcbn1cblxuLyoqXG4gKiBBIGZpZWxkIHdob3NlIHZhbGlkIHZhbHVlcyBhcmUgbnVsbCwgdHJ1ZSBhbmQgZmFsc2UuXG4gKiBJbnZhbGlkIHZhbHVlcyBhcmUgY2xlYW5lZCB0byBudWxsLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7Qm9vbGVhbkZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIE51bGxCb29sZWFuRmllbGQgPSBCb29sZWFuRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIE51bGxCb29sZWFuRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IE51bGxCb29sZWFuRmllbGQoa3dhcmdzKSB9XG4gICAgQm9vbGVhbkZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIHdpZGdldDogd2lkZ2V0cy5OdWxsQm9vbGVhblNlbGVjdFxufSlcblxuTnVsbEJvb2xlYW5GaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgLy8gRXhwbGljaXRseSBjaGVja3MgZm9yIHRoZSBzdHJpbmcgJ1RydWUnIGFuZCAnRmFsc2UnLCB3aGljaCBpcyB3aGF0IGFcbiAgLy8gaGlkZGVuIGZpZWxkIHdpbGwgc3VibWl0IGZvciB0cnVlIGFuZCBmYWxzZSwgYW5kIGZvciAnMScgYW5kICcwJywgd2hpY2hcbiAgLy8gaXMgd2hhdCBhIFJhZGlvRmllbGQgd2lsbCBzdWJtaXQuIFVubGlrZSB0aGUgQm9vbGVhbmZpZWxkIHdlIGFsc28gbmVlZFxuICAvLyB0byBjaGVjayBmb3IgdHJ1ZSwgYmVjYXVzZSB3ZSBhcmUgbm90IHVzaW5nIEJvb2xlYW4oKSBmdW5jdGlvbi5cbiAgaWYgKHZhbHVlID09PSB0cnVlIHx8IHZhbHVlID09ICdUcnVlJyB8fCB2YWx1ZSA9PSAndHJ1ZScgfHwgdmFsdWUgPT0gJzEnKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICBlbHNlIGlmICh2YWx1ZSA9PT0gZmFsc2UgfHwgdmFsdWUgPT0gJ0ZhbHNlJyB8fCB2YWx1ZSA9PSAnZmFsc2UnIHx8IHZhbHVlID09ICcwJykge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIHJldHVybiBudWxsXG59XG5cbk51bGxCb29sZWFuRmllbGQucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24odmFsdWUpIHt9XG5cbk51bGxCb29sZWFuRmllbGQucHJvdG90eXBlLl9oYXNDaGFuZ2VkID0gZnVuY3Rpb24oaW5pdGlhbCwgZGF0YSkge1xuICAvLyBudWxsICh1bmtub3duKSBhbmQgZmFsc2UgKE5vKSBhcmUgbm90IHRoZSBzYW1lXG4gIGlmIChpbml0aWFsICE9PSBudWxsKSB7XG4gICAgICBpbml0aWFsID0gQm9vbGVhbihpbml0aWFsKVxuICB9XG4gIGlmIChkYXRhICE9PSBudWxsKSB7XG4gICAgICBkYXRhID0gQm9vbGVhbihkYXRhKVxuICB9XG4gIHJldHVybiBpbml0aWFsICE9IGRhdGFcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgb25lIG9mIGEgdmFsaWQgbGlzdCBvZiBjaG9pY2VzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7RmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgQ2hvaWNlRmllbGQgPSBGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gQ2hvaWNlRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IENob2ljZUZpZWxkKGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2Nob2ljZXM6IFtdfSwga3dhcmdzKVxuICAgIEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICAgIHRoaXMuc2V0Q2hvaWNlcyhrd2FyZ3MuY2hvaWNlcylcbiAgfVxuLCB3aWRnZXQ6IHdpZGdldHMuU2VsZWN0XG59KVxuQ2hvaWNlRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBDaG9pY2VGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMsIHtcbiAgICAgIGludmFsaWRDaG9pY2U6ICdTZWxlY3QgYSB2YWxpZCBjaG9pY2UuIHt2YWx1ZX0gaXMgbm90IG9uZSBvZiB0aGUgYXZhaWxhYmxlIGNob2ljZXMuJ1xuICAgIH0pXG5DaG9pY2VGaWVsZC5wcm90b3R5cGUuY2hvaWNlcyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fY2hvaWNlcyB9XG5DaG9pY2VGaWVsZC5wcm90b3R5cGUuc2V0Q2hvaWNlcyA9IGZ1bmN0aW9uKGNob2ljZXMpIHtcbiAgLy8gU2V0dGluZyBjaG9pY2VzIGFsc28gc2V0cyB0aGUgY2hvaWNlcyBvbiB0aGUgd2lkZ2V0XG4gIHRoaXMuX2Nob2ljZXMgPSB0aGlzLndpZGdldC5jaG9pY2VzID0gY2hvaWNlc1xufVxuXG5DaG9pY2VGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKGlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuICByZXR1cm4gJycrdmFsdWVcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCB0aGUgZ2l2ZW4gdmFsdWUgaXMgaW4gdGhpcyBmaWVsZCdzIGNob2ljZXMuXG4gKi9cbkNob2ljZUZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIEZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZS5jYWxsKHRoaXMsIHZhbHVlKVxuICBpZiAodmFsdWUgJiYgIXRoaXMudmFsaWRWYWx1ZSh2YWx1ZSkpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IoXG4gICAgICAgIGZvcm1hdCh0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZENob2ljZSwge3ZhbHVlOiB2YWx1ZX0pKVxuICB9XG59XG5cbi8qKlxuICogQ2hlY2tzIHRvIHNlZSBpZiB0aGUgcHJvdmlkZWQgdmFsdWUgaXMgYSB2YWxpZCBjaG9pY2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIHRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKi9cbkNob2ljZUZpZWxkLnByb3RvdHlwZS52YWxpZFZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIGNob2ljZXMgPSB0aGlzLmNob2ljZXMoKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGNob2ljZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKGlzLkFycmF5KGNob2ljZXNbaV1bMV0pKSB7XG4gICAgICAvLyBUaGlzIGlzIGFuIG9wdGdyb3VwLCBzbyBsb29rIGluc2lkZSB0aGUgZ3JvdXAgZm9yIG9wdGlvbnNcbiAgICAgIHZhciBvcHRncm91cENob2ljZXMgPSBjaG9pY2VzW2ldWzFdXG4gICAgICBmb3IgKHZhciBqID0gMCwgayA9IG9wdGdyb3VwQ2hvaWNlcy5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgaWYgKHZhbHVlID09PSAnJytvcHRncm91cENob2ljZXNbal1bMF0pIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHZhbHVlID09PSAnJytjaG9pY2VzW2ldWzBdKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBBIENob2ljZUZpZWxkIHdoaWNoIHJldHVybnMgYSB2YWx1ZSBjb2VyY2VkIGJ5IHNvbWUgcHJvdmlkZWQgZnVuY3Rpb24uXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtDaG9pY2VGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBUeXBlZENob2ljZUZpZWxkID0gQ2hvaWNlRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFR5cGVkQ2hvaWNlRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IFR5cGVkQ2hvaWNlRmllbGQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7XG4gICAgICBjb2VyY2U6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gdmFsIH0sIGVtcHR5VmFsdWU6ICcnXG4gICAgfSwga3dhcmdzKVxuICAgIHRoaXMuY29lcmNlID0ga3dhcmdzLmNvZXJjZVxuICAgIHRoaXMuZW1wdHlWYWx1ZSA9IGt3YXJncy5lbXB0eVZhbHVlXG4gICAgZGVsZXRlIGt3YXJncy5jb2VyY2VcbiAgICBkZWxldGUga3dhcmdzLmVtcHR5VmFsdWVcbiAgICBDaG9pY2VGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuVHlwZWRDaG9pY2VGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFsdWUgPSBDaG9pY2VGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0LmNhbGwodGhpcywgdmFsdWUpXG4gIENob2ljZUZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZS5jYWxsKHRoaXMsIHZhbHVlKVxuICBpZiAodmFsdWUgPT09IHRoaXMuZW1wdHlWYWx1ZSB8fCBpc0VtcHR5VmFsdWUodmFsdWUpKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1wdHlWYWx1ZVxuICB9XG4gIHRyeSB7XG4gICAgdmFsdWUgPSB0aGlzLmNvZXJjZSh2YWx1ZSlcbiAgfVxuICBjYXRjaCAoZSkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcihcbiAgICAgICAgZm9ybWF0KHRoaXMuZXJyb3JNZXNzYWdlcy5pbnZhbGlkQ2hvaWNlLCB7dmFsdWU6IHZhbHVlfSkpXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cblR5cGVkQ2hvaWNlRmllbGQucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24odmFsdWUpIHt9XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGlzIG9uZSBvciBtb3JlIG9mIGEgdmFsaWQgbGlzdCBvZiBjaG9pY2VzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7Q2hvaWNlRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgTXVsdGlwbGVDaG9pY2VGaWVsZCA9IENob2ljZUZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBNdWx0aXBsZUNob2ljZUZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBNdWx0aXBsZUNob2ljZUZpZWxkKGt3YXJncykgfVxuICAgIENob2ljZUZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIHdpZGdldDogd2lkZ2V0cy5TZWxlY3RNdWx0aXBsZVxuLCBoaWRkZW5XaWRnZXQ6IHdpZGdldHMuTXVsdGlwbGVIaWRkZW5JbnB1dFxufSlcbk11bHRpcGxlQ2hvaWNlRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBNdWx0aXBsZUNob2ljZUZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcywge1xuICAgICAgaW52YWxpZENob2ljZTogJ1NlbGVjdCBhIHZhbGlkIGNob2ljZS4ge3ZhbHVlfSBpcyBub3Qgb25lIG9mIHRoZSBhdmFpbGFibGUgY2hvaWNlcy4nXG4gICAgLCBpbnZhbGlkTGlzdDogJ0VudGVyIGEgbGlzdCBvZiB2YWx1ZXMuJ1xuICAgIH0pXG5cbk11bHRpcGxlQ2hvaWNlRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICghdmFsdWUpIHtcbiAgICByZXR1cm4gW11cbiAgfVxuICBlbHNlIGlmICghKGlzLkFycmF5KHZhbHVlKSkpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWRMaXN0KVxuICB9XG4gIHZhciBzdHJpbmdWYWx1ZXMgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHN0cmluZ1ZhbHVlcy5wdXNoKCcnK3ZhbHVlW2ldKVxuICB9XG4gIHJldHVybiBzdHJpbmdWYWx1ZXNcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCB0aGUgaW5wdXQgaXMgYSBsaXN0IGFuZCB0aGF0IGVhY2ggaXRlbSBpcyBpbiB0aGlzIGZpZWxkJ3NcbiAqIGNob2ljZXMuXG4gKi9cbk11bHRpcGxlQ2hvaWNlRmllbGQucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKHRoaXMucmVxdWlyZWQgJiYgIXZhbHVlLmxlbmd0aCkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMucmVxdWlyZWQpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoIXRoaXMudmFsaWRWYWx1ZSh2YWx1ZVtpXSkpIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcihcbiAgICAgICAgICBmb3JtYXQodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWRDaG9pY2UsIHt2YWx1ZTogdmFsdWVbaV19KSlcbiAgICB9XG4gIH1cbn1cblxuTXVsdGlwbGVDaG9pY2VGaWVsZC5wcm90b3R5cGUuX2hhc0NoYW5nZWQgPSBmdW5jdGlvbihpbml0aWFsLCBkYXRhKSB7XG4gIGlmIChpbml0aWFsID09PSBudWxsKSB7XG4gICAgaW5pdGlhbCA9IFtdXG4gIH1cbiAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICBkYXRhID0gW11cbiAgfVxuICBpZiAoaW5pdGlhbC5sZW5ndGggIT0gZGF0YS5sZW5ndGgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHZhciBkYXRhTG9va3VwID0gb2JqZWN0Lmxvb2t1cChkYXRhKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGluaXRpYWwubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHR5cGVvZiBkYXRhTG9va3VwWycnK2luaXRpYWxbaV1dID09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBBTXVsdGlwbGVDaG9pY2VGaWVsZCB3aGljaCByZXR1cm5zIHZhbHVlcyBjb2VyY2VkIGJ5IHNvbWUgcHJvdmlkZWQgZnVuY3Rpb24uXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtNdWx0aXBsZUNob2ljZUZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFR5cGVkTXVsdGlwbGVDaG9pY2VGaWVsZCA9IE11bHRpcGxlQ2hvaWNlRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFR5cGVkTXVsdGlwbGVDaG9pY2VGaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgVHlwZWRNdWx0aXBsZUNob2ljZUZpZWxkKGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgICAgY29lcmNlOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIHZhbCB9LCBlbXB0eVZhbHVlOiBbXVxuICAgIH0sIGt3YXJncylcbiAgICB0aGlzLmNvZXJjZSA9IGt3YXJncy5jb2VyY2VcbiAgICB0aGlzLmVtcHR5VmFsdWUgPSBrd2FyZ3MuZW1wdHlWYWx1ZVxuICAgIGRlbGV0ZSBrd2FyZ3MuY29lcmNlXG4gICAgZGVsZXRlIGt3YXJncy5lbXB0eVZhbHVlXG4gICAgTXVsdGlwbGVDaG9pY2VGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuVHlwZWRNdWx0aXBsZUNob2ljZUZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IE11bHRpcGxlQ2hvaWNlRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdC5jYWxsKHRoaXMsIHZhbHVlKVxuICBNdWx0aXBsZUNob2ljZUZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZS5jYWxsKHRoaXMsIHZhbHVlKVxuICBpZiAodmFsdWUgPT09IHRoaXMuZW1wdHlWYWx1ZSB8fCBpc0VtcHR5VmFsdWUodmFsdWUpIHx8XG4gICAgICAoaXMuQXJyYXkodmFsdWUpICYmICF2YWx1ZS5sZW5ndGgpKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1wdHlWYWx1ZVxuICB9XG4gIHZhciBuZXdWYWx1ZSA9IFtdXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdHJ5IHtcbiAgICAgIG5ld1ZhbHVlLnB1c2godGhpcy5jb2VyY2UodmFsdWVbaV0pKVxuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKFxuICAgICAgICAgIGZvcm1hdCh0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZENob2ljZSwge3ZhbHVlOiB2YWx1ZVtpXX0pKVxuICAgIH1cbiAgfVxuICByZXR1cm4gbmV3VmFsdWVcbn1cblxuVHlwZWRNdWx0aXBsZUNob2ljZUZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7fVxuXG4vKipcbiAqIEFsbG93cyBjaG9vc2luZyBmcm9tIGZpbGVzIGluc2lkZSBhIGNlcnRhaW4gZGlyZWN0b3J5LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7Q2hvaWNlRmllbGR9XG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEZpbGVQYXRoRmllbGQgPSBDaG9pY2VGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gRmlsZVBhdGhGaWVsZChwYXRoLCBrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgRmlsZVBhdGhGaWVsZChwYXRoLCBrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtcbiAgICAgIG1hdGNoOiBudWxsLCByZWN1cnNpdmU6IGZhbHNlLCByZXF1aXJlZDogdHJ1ZSwgd2lkZ2V0OiBudWxsLFxuICAgICAgbGFiZWw6IG51bGwsIGluaXRpYWw6IG51bGwsIGhlbHBUZXh0OiBudWxsXG4gICAgfSwga3dhcmdzKVxuXG4gICAgdGhpcy5wYXRoID0gcGF0aFxuICAgIHRoaXMubWF0Y2ggPSBrd2FyZ3MubWF0Y2hcbiAgICB0aGlzLnJlY3Vyc2l2ZSA9IGt3YXJncy5yZWN1cnNpdmVcbiAgICBkZWxldGUga3dhcmdzLm1hdGNoXG4gICAgZGVsZXRlIGt3YXJncy5yZWN1cnNpdmVcblxuICAgIGt3YXJncy5jaG9pY2VzID0gW11cbiAgICBDaG9pY2VGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcblxuICAgIGlmICh0aGlzLnJlcXVpcmVkKSB7XG4gICAgICB0aGlzLnNldENob2ljZXMoW10pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5zZXRDaG9pY2VzKFtbJycsICctLS0tLS0tLS0nXV0pXG4gICAgfVxuICAgIGlmICh0aGlzLm1hdGNoICE9PSBudWxsKSB7XG4gICAgICB0aGlzLm1hdGNoUkUgPSBuZXcgUmVnRXhwKHRoaXMubWF0Y2gpXG4gICAgfVxuXG4gICAgLy8gVE9ETyBQbHVnIGluIGZpbGUgcGF0aHMgd2hlbiBydW5uaW5nIG9uIHRoZSBzZXJ2ZXJcblxuICAgIHRoaXMud2lkZ2V0LmNob2ljZXMgPSB0aGlzLmNob2ljZXMoKVxuICB9XG59KVxuXG4vKipcbiAqIEEgRmllbGQgd2hvc2UgY2xlYW4oKSBtZXRob2QgY2FsbHMgbXVsdGlwbGUgRmllbGQgY2xlYW4oKSBtZXRob2RzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7RmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgQ29tYm9GaWVsZCA9IEZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBDb21ib0ZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBDb21ib0ZpZWxkKGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2ZpZWxkczogW119LCBrd2FyZ3MpXG4gICAgRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgLy8gU2V0IHJlcXVpcmVkIHRvIEZhbHNlIG9uIHRoZSBpbmRpdmlkdWFsIGZpZWxkcywgYmVjYXVzZSB0aGUgcmVxdWlyZWRcbiAgICAvLyB2YWxpZGF0aW9uIHdpbGwgYmUgaGFuZGxlZCBieSBDb21ib0ZpZWxkLCBub3QgYnkgdGhvc2UgaW5kaXZpZHVhbCBmaWVsZHMuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBrd2FyZ3MuZmllbGRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAga3dhcmdzLmZpZWxkc1tpXS5yZXF1aXJlZCA9IGZhbHNlXG4gICAgfVxuICAgIHRoaXMuZmllbGRzID0ga3dhcmdzLmZpZWxkc1xuICB9XG59KVxuXG5Db21ib0ZpZWxkLnByb3RvdHlwZS5jbGVhbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIEZpZWxkLnByb3RvdHlwZS5jbGVhbi5jYWxsKHRoaXMsIHZhbHVlKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuZmllbGRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhbHVlID0gdGhpcy5maWVsZHNbaV0uY2xlYW4odmFsdWUpXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbi8qKlxuICogQSBGaWVsZCB0aGF0IGFnZ3JlZ2F0ZXMgdGhlIGxvZ2ljIG9mIG11bHRpcGxlIEZpZWxkcy5cbiAqXG4gKiBJdHMgY2xlYW4oKSBtZXRob2QgdGFrZXMgYSBcImRlY29tcHJlc3NlZFwiIGxpc3Qgb2YgdmFsdWVzLCB3aGljaCBhcmUgdGhlblxuICogY2xlYW5lZCBpbnRvIGEgc2luZ2xlIHZhbHVlIGFjY29yZGluZyB0byB0aGlzLmZpZWxkcy4gRWFjaCB2YWx1ZSBpbiB0aGlzXG4gKiBsaXN0IGlzIGNsZWFuZWQgYnkgdGhlIGNvcnJlc3BvbmRpbmcgZmllbGQgLS0gdGhlIGZpcnN0IHZhbHVlIGlzIGNsZWFuZWQgYnlcbiAqIHRoZSBmaXJzdCBmaWVsZCwgdGhlIHNlY29uZCB2YWx1ZSBpcyBjbGVhbmVkIGJ5IHRoZSBzZWNvbmQgZmllbGQsIGV0Yy4gT25jZVxuICogYWxsIGZpZWxkcyBhcmUgY2xlYW5lZCwgdGhlIGxpc3Qgb2YgY2xlYW4gdmFsdWVzIGlzIFwiY29tcHJlc3NlZFwiIGludG8gYVxuICogc2luZ2xlIHZhbHVlLlxuICpcbiAqIFN1YmNsYXNzZXMgc2hvdWxkIG5vdCBoYXZlIHRvIGltcGxlbWVudCBjbGVhbigpLiBJbnN0ZWFkLCB0aGV5IG11c3RcbiAqIGltcGxlbWVudCBjb21wcmVzcygpLCB3aGljaCB0YWtlcyBhIGxpc3Qgb2YgdmFsaWQgdmFsdWVzIGFuZCByZXR1cm5zIGFcbiAqIFwiY29tcHJlc3NlZFwiIHZlcnNpb24gb2YgdGhvc2UgdmFsdWVzIC0tIGEgc2luZ2xlIHZhbHVlLlxuICpcbiAqIFlvdSdsbCBwcm9iYWJseSB3YW50IHRvIHVzZSB0aGlzIHdpdGggTXVsdGlXaWRnZXQuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7RmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgTXVsdGlWYWx1ZUZpZWxkID0gRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIE11bHRpVmFsdWVGaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgTXVsdGlWYWx1ZUZpZWxkKGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2ZpZWxkczogW119LCBrd2FyZ3MpXG4gICAgdGhpcy5yZXF1aXJlQWxsRmllbGRzID0gb2JqZWN0LnBvcChrd2FyZ3MsICdyZXF1aXJlQWxsRmllbGRzJywgdHJ1ZSlcbiAgICBGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcblxuICAgIGZvciAodmFyIGkgPSAwLCBsID0ga3dhcmdzLmZpZWxkcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBmID0ga3dhcmdzLmZpZWxkc1tpXVxuICAgICAgb2JqZWN0LnNldERlZmF1bHQoZi5lcnJvck1lc3NhZ2VzLCAnaW5jb21wbGV0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVycm9yTWVzc2FnZXMuaW5jb21wbGV0ZSlcbiAgICAgIGlmICh0aGlzLnJlcXVpcmVBbGxGaWVsZHMpIHtcbiAgICAgICAgLy8gU2V0IHJlcXVpcmVkIHRvIGZhbHNlIG9uIHRoZSBpbmRpdmlkdWFsIGZpZWxkcywgYmVjYXVzZSB0aGUgcmVxdWlyZWRcbiAgICAgICAgLy8gdmFsaWRhdGlvbiB3aWxsIGJlIGhhbmRsZWQgYnkgTXVsdGlWYWx1ZUZpZWxkLCBub3QgYnkgdGhvc2VcbiAgICAgICAgLy8gaW5kaXZpZHVhbCBmaWVsZHMuXG4gICAgICAgIGYucmVxdWlyZWQgPSBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmZpZWxkcyA9IGt3YXJncy5maWVsZHNcbiAgfVxufSlcbk11bHRpVmFsdWVGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMgPVxuICAgIG9iamVjdC5leHRlbmQoe30sIE11bHRpVmFsdWVGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMsIHtcbiAgICAgIGludmFsaWQ6ICdFbnRlciBhIGxpc3Qgb2YgdmFsdWVzLidcbiAgICAsIGluY29tcGxldGU6ICdFbnRlciBhIGNvbXBsZXRlIHZhbHVlLidcbiAgICB9KVxuXG5NdWx0aVZhbHVlRmllbGQucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24oKSB7fVxuXG4vKipcbiAqIFZhbGlkYXRlcyBldmVyeSB2YWx1ZSBpbiB0aGUgZ2l2ZW4gbGlzdC4gQSB2YWx1ZSBpcyB2YWxpZGF0ZWQgYWdhaW5zdCB0aGVcbiAqIGNvcnJlc3BvbmRpbmcgRmllbGQgaW4gdGhpcy5maWVsZHMuXG4gKlxuICogRm9yIGV4YW1wbGUsIGlmIHRoaXMgTXVsdGlWYWx1ZUZpZWxkIHdhcyBpbnN0YW50aWF0ZWQgd2l0aFxuICoge2ZpZWxkczogW2Zvcm1zLkRhdGVGaWVsZCgpLCBmb3Jtcy5UaW1lRmllbGQoKV19LCBjbGVhbigpIHdvdWxkIGNhbGxcbiAqIERhdGVGaWVsZC5jbGVhbih2YWx1ZVswXSkgYW5kIFRpbWVGaWVsZC5jbGVhbih2YWx1ZVsxXSkuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmFsdWUgdGhlIGlucHV0IHRvIGJlIHZhbGlkYXRlZC5cbiAqXG4gKiBAcmV0dXJuIHRoZSByZXN1bHQgb2YgY2FsbGluZyBjb21wcmVzcygpIG9uIHRoZSBjbGVhbmVkIGlucHV0LlxuICovXG5NdWx0aVZhbHVlRmllbGQucHJvdG90eXBlLmNsZWFuID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIGNsZWFuRGF0YSA9IFtdXG4gIHZhciBlcnJvcnMgPSBbXVxuXG4gIGlmICghdmFsdWUgfHwgaXMuQXJyYXkodmFsdWUpKSB7XG4gICAgdmFyIGFsbFZhbHVlc0VtcHR5ID0gdHJ1ZVxuICAgIGlmIChpcy5BcnJheSh2YWx1ZSkpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmICh2YWx1ZVtpXSkge1xuICAgICAgICAgIGFsbFZhbHVlc0VtcHR5ID0gZmFsc2VcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCF2YWx1ZSB8fCBhbGxWYWx1ZXNFbXB0eSkge1xuICAgICAgaWYgKHRoaXMucmVxdWlyZWQpIHtcbiAgICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5yZXF1aXJlZClcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5jb21wcmVzcyhbXSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5pbnZhbGlkKVxuICB9XG5cbiAgZm9yIChpID0gMCwgbCA9IHRoaXMuZmllbGRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBmaWVsZCA9IHRoaXMuZmllbGRzW2ldXG4gICAgdmFyIGZpZWxkVmFsdWUgPSB2YWx1ZVtpXVxuICAgIGlmIChmaWVsZFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGZpZWxkVmFsdWUgPSBudWxsXG4gICAgfVxuICAgIGlmIChpc0VtcHR5VmFsdWUoZmllbGRWYWx1ZSkpIHtcbiAgICAgIGlmICh0aGlzLnJlcXVpcmVBbGxGaWVsZHMpIHtcbiAgICAgICAgLy8gVGhyb3cgYSAncmVxdWlyZWQnIGVycm9yIGlmIHRoZSBNdWx0aVZhbHVlRmllbGQgaXMgcmVxdWlyZWQgYW5kIGFueVxuICAgICAgICAvLyBmaWVsZCBpcyBlbXB0eS5cbiAgICAgICAgaWYgKHRoaXMucmVxdWlyZWQpIHtcbiAgICAgICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLnJlcXVpcmVkLCB7Y29kZTogJ3JlcXVpcmVkJ30pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGZpZWxkLnJlcXVpcmVkKSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSwgYWRkIGFuICdpbmNvbXBsZXRlJyBlcnJvciB0byB0aGUgbGlzdCBvZiBjb2xsZWN0ZWQgZXJyb3JzXG4gICAgICAgIC8vIGFuZCBza2lwIGZpZWxkIGNsZWFuaW5nLCBpZiBhIHJlcXVpcmVkIGZpZWxkIGlzIGVtcHR5LlxuICAgICAgICBpZiAoZXJyb3JzLmluZGV4T2YoZmllbGQuZXJyb3JNZXNzYWdlcy5pbmNvbXBsZXRlKSA9PSAtMSkge1xuICAgICAgICAgIGVycm9ycy5wdXNoKGZpZWxkLmVycm9yTWVzc2FnZXMuaW5jb21wbGV0ZSlcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjbGVhbkRhdGEucHVzaChmaWVsZC5jbGVhbihmaWVsZFZhbHVlKSlcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7IHRocm93IGUgfVxuICAgICAgLy8gQ29sbGVjdCBhbGwgdmFsaWRhdGlvbiBlcnJvcnMgaW4gYSBzaW5nbGUgbGlzdCwgd2hpY2ggd2UnbGwgdGhyb3cgYXRcbiAgICAgIC8vIHRoZSBlbmQgb2YgY2xlYW4oKSwgcmF0aGVyIHRoYW4gdGhyb3dpbmcgYSBzaW5nbGUgZXhjZXB0aW9uIGZvciB0aGVcbiAgICAgIC8vIGZpcnN0IGVycm9yIHdlIGVuY291bnRlci4gU2tpcCBkdXBsaWNhdGVzLlxuICAgICAgZXJyb3JzID0gZXJyb3JzLmNvbmNhdChlLm1lc3NhZ2VzKCkuZmlsdGVyKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgcmV0dXJuIGVycm9ycy5pbmRleE9mKG0pID09IC0xXG4gICAgICB9KSlcbiAgICB9XG4gIH1cblxuICBpZiAoZXJyb3JzLmxlbmd0aCAhPT0gMCkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcihlcnJvcnMpXG4gIH1cblxuICB2YXIgb3V0ID0gdGhpcy5jb21wcmVzcyhjbGVhbkRhdGEpXG4gIHRoaXMudmFsaWRhdGUob3V0KVxuICB0aGlzLnJ1blZhbGlkYXRvcnMob3V0KVxuICByZXR1cm4gb3V0XG59XG5cbi8qKlxuICogUmV0dXJucyBhIHNpbmdsZSB2YWx1ZSBmb3IgdGhlIGdpdmVuIGxpc3Qgb2YgdmFsdWVzLiBUaGUgdmFsdWVzIGNhbiBiZVxuICogYXNzdW1lZCB0byBiZSB2YWxpZC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgaWYgdGhpcyBNdWx0aVZhbHVlRmllbGQgd2FzIGluc3RhbnRpYXRlZCB3aXRoXG4gKiB7ZmllbGRzOiBbZm9ybXMuRGF0ZUZpZWxkKCksIGZvcm1zLlRpbWVGaWVsZCgpXX0sIHRoaXMgbWlnaHQgcmV0dXJuIGEgRGF0ZVxuICogb2JqZWN0IGNyZWF0ZWQgYnkgY29tYmluaW5nIHRoZSBkYXRlIGFuZCB0aW1lIGluIGRhdGFMaXN0LlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGRhdGFMaXN0XG4gKi9cbk11bHRpVmFsdWVGaWVsZC5wcm90b3R5cGUuY29tcHJlc3MgPSBmdW5jdGlvbihkYXRhTGlzdCkge1xuICB0aHJvdyBuZXcgRXJyb3IoJ1N1YmNsYXNzZXMgbXVzdCBpbXBsZW1lbnQgdGhpcyBtZXRob2QuJylcbn1cblxuTXVsdGlWYWx1ZUZpZWxkLnByb3RvdHlwZS5faGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKGluaXRpYWwsIGRhdGEpIHtcbiAgdmFyIGksIGxcblxuICBpZiAoaW5pdGlhbCA9PT0gbnVsbCkge1xuICAgIGluaXRpYWwgPSBbXVxuICAgIGZvciAoaSA9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgaW5pdGlhbC5wdXNoKCcnKVxuICAgIH1cbiAgfVxuICBlbHNlIGlmICghKGlzLkFycmF5KGluaXRpYWwpKSkge1xuICAgIGluaXRpYWwgPSB0aGlzLndpZGdldC5kZWNvbXByZXNzKGluaXRpYWwpXG4gIH1cblxuICBmb3IgKGkgPSAwLCBsID0gdGhpcy5maWVsZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHRoaXMuZmllbGRzW2ldLl9oYXNDaGFuZ2VkKGluaXRpYWxbaV0sIGRhdGFbaV0pKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBBIE11bHRpVmFsdWVGaWVsZCBjb25zaXN0aW5nIG9mIGEgRGF0ZUZpZWxkIGFuZCBhIFRpbWVGaWVsZC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge011bHRpVmFsdWVGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBTcGxpdERhdGVUaW1lRmllbGQgPSBNdWx0aVZhbHVlRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFNwbGl0RGF0ZVRpbWVGaWVsZChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgU3BsaXREYXRlVGltZUZpZWxkKGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgICAgaW5wdXREYXRlRm9ybWF0czogbnVsbCwgaW5wdXRUaW1lRm9ybWF0czogbnVsbFxuICAgIH0sIGt3YXJncylcbiAgICB2YXIgZXJyb3JzID0gb2JqZWN0LmV4dGVuZCh7fSwgdGhpcy5kZWZhdWx0RXJyb3JNZXNzYWdlcylcbiAgICBpZiAodHlwZW9mIGt3YXJncy5lcnJvck1lc3NhZ2VzICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICBvYmplY3QuZXh0ZW5kKGVycm9ycywga3dhcmdzLmVycm9yTWVzc2FnZXMpXG4gICAgfVxuICAgIGt3YXJncy5maWVsZHMgPSBbXG4gICAgICBEYXRlRmllbGQoe2lucHV0Rm9ybWF0czoga3dhcmdzLmlucHV0RGF0ZUZvcm1hdHMsXG4gICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZXM6IHtpbnZhbGlkOiBlcnJvcnMuaW52YWxpZERhdGV9fSlcbiAgICAsIFRpbWVGaWVsZCh7aW5wdXRGb3JtYXRzOiBrd2FyZ3MuaW5wdXRUaW1lRm9ybWF0cyxcbiAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlczoge2ludmFsaWQ6IGVycm9ycy5pbnZhbGlkVGltZX19KVxuICAgIF1cbiAgICBNdWx0aVZhbHVlRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgd2lkZ2V0OiB3aWRnZXRzLlNwbGl0RGF0ZVRpbWVXaWRnZXRcbiwgaGlkZGVuV2lkZ2V0OiB3aWRnZXRzLlNwbGl0SGlkZGVuRGF0ZVRpbWVXaWRnZXRcbn0pXG5TcGxpdERhdGVUaW1lRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBTcGxpdERhdGVUaW1lRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7XG4gICAgICBpbnZhbGlkRGF0ZTogJ0VudGVyIGEgdmFsaWQgZGF0ZS4nXG4gICAgLCBpbnZhbGlkVGltZTogJ0VudGVyIGEgdmFsaWQgdGltZS4nXG4gICAgfSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCwgaWYgZ2l2ZW4sIGl0cyBpbnB1dCBkb2VzIG5vdCBjb250YWluIGVtcHR5IHZhbHVlcy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBbZGF0YUxpc3RdIGEgdHdvLWl0ZW0gbGlzdCBjb25zaXN0aW5nIG9mIHR3byBEYXRlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdHMsIHRoZSBmaXJzdCBvZiB3aGljaCByZXByZXNlbnRzIGEgZGF0ZSwgdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZCBhIHRpbWUuXG4gKlxuICogQHJldHVybiBhIERhdGUgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgZ2l2ZW4gZGF0ZSBhbmQgdGltZSwgb3JcbiAqICAgICAgICAgbnVsbCBmb3IgZW1wdHkgdmFsdWVzLlxuICovXG5TcGxpdERhdGVUaW1lRmllbGQucHJvdG90eXBlLmNvbXByZXNzID0gZnVuY3Rpb24oZGF0YUxpc3QpIHtcbiAgaWYgKGlzLkFycmF5KGRhdGFMaXN0KSAmJiBkYXRhTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgdmFyIGQgPSBkYXRhTGlzdFswXSwgdCA9IGRhdGFMaXN0WzFdXG4gICAgLy8gUmFpc2UgYSB2YWxpZGF0aW9uIGVycm9yIGlmIGRhdGUgb3IgdGltZSBpcyBlbXB0eSAocG9zc2libGUgaWZcbiAgICAvLyBTcGxpdERhdGVUaW1lRmllbGQgaGFzIHJlcXVpcmVkID09IGZhbHNlKS5cbiAgICBpZiAoaXNFbXB0eVZhbHVlKGQpKSB7XG4gICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWREYXRlKVxuICAgIH1cbiAgICBpZiAoaXNFbXB0eVZhbHVlKHQpKSB7XG4gICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWRUaW1lKVxuICAgIH1cbiAgICByZXR1cm4gbmV3IERhdGUoZC5nZXRGdWxsWWVhcigpLCBkLmdldE1vbnRoKCksIGQuZ2V0RGF0ZSgpLFxuICAgICAgICAgICAgICAgICAgICB0LmdldEhvdXJzKCksIHQuZ2V0TWludXRlcygpLCB0LmdldFNlY29uZHMoKSlcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBpcyBhIHZhbGlkIElQdjQgYWRkcmVzcy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0NoYXJGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKiBAZGVwcmVjYXRlZFxuICovXG52YXIgSVBBZGRyZXNzRmllbGQgPSBDaGFyRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIElQQWRkcmVzc0ZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBJUEFkZHJlc3NGaWVsZChrd2FyZ3MpIH1cbiAgICBDaGFyRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5JUEFkZHJlc3NGaWVsZC5wcm90b3R5cGUuZGVmYXVsdFZhbGlkYXRvcnMgPSBbdmFsaWRhdG9ycy52YWxpZGF0ZUlQdjRBZGRyZXNzXVxuSVBBZGRyZXNzRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBJUEFkZHJlc3NGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMsIHtcbiAgICAgIGludmFsaWQ6ICdFbnRlciBhIHZhbGlkIElQdjQgYWRkcmVzcy4nXG4gICAgfSlcblxudmFyIEdlbmVyaWNJUEFkZHJlc3NGaWVsZCA9IENoYXJGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gR2VuZXJpY0lQQWRkcmVzc0ZpZWxkKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBHZW5lcmljSVBBZGRyZXNzRmllbGQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7XG4gICAgICBwcm90b2NvbDogJ2JvdGgnLCB1bnBhY2tJUHY0OiBmYWxzZVxuICAgIH0sIGt3YXJncylcbiAgICB0aGlzLnVucGFja0lQdjQgPSBrd2FyZ3MudW5wYWNrSVB2NFxuICAgIHZhciBpcFZhbGlkYXRvciA9IHZhbGlkYXRvcnMuaXBBZGRyZXNzVmFsaWRhdG9ycyhrd2FyZ3MucHJvdG9jb2wsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGt3YXJncy51bnBhY2tJUHY0KVxuICAgIHRoaXMuZGVmYXVsdFZhbGlkYXRvcnMgPSBpcFZhbGlkYXRvci52YWxpZGF0b3JzXG4gICAgdGhpcy5kZWZhdWx0RXJyb3JNZXNzYWdlcyA9IG9iamVjdC5leHRlbmQoXG4gICAgICB7fSwgdGhpcy5kZWZhdWx0RXJyb3JNZXNzYWdlcywge2ludmFsaWQ6IGlwVmFsaWRhdG9yLm1lc3NhZ2V9XG4gICAgKVxuICAgIENoYXJGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuR2VuZXJpY0lQQWRkcmVzc0ZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAoIXZhbHVlKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cbiAgaWYgKHZhbHVlICYmIHZhbHVlLmluZGV4T2YoJzonKSAhPSAtMSkge1xuICAgIHJldHVybiBjbGVhbklQdjZBZGRyZXNzKHZhbHVlLCB7XG4gICAgICB1bnBhY2tJUHY0OiB0aGlzLnVucGFja0lQdjRcbiAgICAsIGVycm9yTWVzc2FnZTogdGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWRcbiAgICB9KVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBpcyBhIHZhbGlkIHNsdWcuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtDaGFyRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgU2x1Z0ZpZWxkID0gQ2hhckZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBTbHVnRmllbGQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IFNsdWdGaWVsZChrd2FyZ3MpIH1cbiAgICBDaGFyRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5TbHVnRmllbGQucHJvdG90eXBlLmRlZmF1bHRWYWxpZGF0b3JzID0gW3ZhbGlkYXRvcnMudmFsaWRhdGVTbHVnXVxuU2x1Z0ZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcyA9XG4gICAgb2JqZWN0LmV4dGVuZCh7fSwgU2x1Z0ZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcywge1xuICAgICAgaW52YWxpZDogXCJFbnRlciBhIHZhbGlkICdzbHVnJyBjb25zaXN0aW5nIG9mIGxldHRlcnMsIG51bWJlcnMsIHVuZGVyc2NvcmVzIG9yIGh5cGhlbnMuXCJcbiAgICB9KVxuXG5TbHVnRmllbGQucHJvdG90eXBlLmNsZWFuID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFsdWUgPSB1dGlsLnN0cmlwKHRoaXMudG9KYXZhU2NyaXB0KHZhbHVlKSlcbiAgcmV0dXJuIENoYXJGaWVsZC5wcm90b3R5cGUuY2xlYW4uY2FsbCh0aGlzLCB2YWx1ZSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIEZpZWxkOiBGaWVsZFxuLCBDaGFyRmllbGQ6IENoYXJGaWVsZFxuLCBJbnRlZ2VyRmllbGQ6IEludGVnZXJGaWVsZFxuLCBGbG9hdEZpZWxkOiBGbG9hdEZpZWxkXG4sIERlY2ltYWxGaWVsZDogRGVjaW1hbEZpZWxkXG4sIEJhc2VUZW1wb3JhbEZpZWxkOiBCYXNlVGVtcG9yYWxGaWVsZFxuLCBEYXRlRmllbGQ6IERhdGVGaWVsZFxuLCBUaW1lRmllbGQ6IFRpbWVGaWVsZFxuLCBEYXRlVGltZUZpZWxkOiBEYXRlVGltZUZpZWxkXG4sIFJlZ2V4RmllbGQ6IFJlZ2V4RmllbGRcbiwgRW1haWxGaWVsZDogRW1haWxGaWVsZFxuLCBGaWxlRmllbGQ6IEZpbGVGaWVsZFxuLCBJbWFnZUZpZWxkOiBJbWFnZUZpZWxkXG4sIFVSTEZpZWxkOiBVUkxGaWVsZFxuLCBCb29sZWFuRmllbGQ6IEJvb2xlYW5GaWVsZFxuLCBOdWxsQm9vbGVhbkZpZWxkOiBOdWxsQm9vbGVhbkZpZWxkXG4sIENob2ljZUZpZWxkOiBDaG9pY2VGaWVsZFxuLCBUeXBlZENob2ljZUZpZWxkOiBUeXBlZENob2ljZUZpZWxkXG4sIE11bHRpcGxlQ2hvaWNlRmllbGQ6IE11bHRpcGxlQ2hvaWNlRmllbGRcbiwgVHlwZWRNdWx0aXBsZUNob2ljZUZpZWxkOiBUeXBlZE11bHRpcGxlQ2hvaWNlRmllbGRcbiwgRmlsZVBhdGhGaWVsZDogRmlsZVBhdGhGaWVsZFxuLCBDb21ib0ZpZWxkOiBDb21ib0ZpZWxkXG4sIE11bHRpVmFsdWVGaWVsZDogTXVsdGlWYWx1ZUZpZWxkXG4sIFNwbGl0RGF0ZVRpbWVGaWVsZDogU3BsaXREYXRlVGltZUZpZWxkXG4sIElQQWRkcmVzc0ZpZWxkOiBJUEFkZHJlc3NGaWVsZFxuLCBHZW5lcmljSVBBZGRyZXNzRmllbGQ6IEdlbmVyaWNJUEFkZHJlc3NGaWVsZFxuLCBTbHVnRmllbGQ6IFNsdWdGaWVsZFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29uY3VyID0gcmVxdWlyZSgnQ29uY3VyJylcbiAgLCBpcyA9IHJlcXVpcmUoJ2lzb21vcnBoL2lzJylcbiAgLCBmb3JtYXQgPSByZXF1aXJlKCdpc29tb3JwaC9mb3JtYXQnKS5mb3JtYXRPYmpcbiAgLCBvYmplY3QgPSByZXF1aXJlKCdpc29tb3JwaC9vYmplY3QnKVxuICAsIGNvcHkgPSByZXF1aXJlKCdpc29tb3JwaC9jb3B5JylcbiAgLCB2YWxpZGF0b3JzID0gcmVxdWlyZSgndmFsaWRhdG9ycycpXG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJylcbiAgLCBmaWVsZHMgPSByZXF1aXJlKCcuL2ZpZWxkcycpXG4gICwgd2lkZ2V0cyA9IHJlcXVpcmUoJy4vd2lkZ2V0cycpXG5cbnZhciBFcnJvckxpc3QgPSB1dGlsLkVycm9yTGlzdFxuICAsIEVycm9yT2JqZWN0ID0gdXRpbC5FcnJvck9iamVjdFxuICAsIFZhbGlkYXRpb25FcnJvciA9IHZhbGlkYXRvcnMuVmFsaWRhdGlvbkVycm9yXG4gICwgRmllbGQgPSBmaWVsZHMuRmllbGRcbiAgLCBGaWxlRmllbGQgPSBmaWVsZHMuRmlsZUZpZWxkXG4gICwgVGV4dGFyZWEgPSB3aWRnZXRzLlRleHRhcmVhXG4gICwgVGV4dElucHV0ID0gd2lkZ2V0cy5UZXh0SW5wdXRcblxuLyoqIFByb3BlcnR5IHVuZGVyIHdoaWNoIG5vbi1maWVsZC1zcGVjaWZpYyBlcnJvcnMgYXJlIHN0b3JlZC4gKi9cbnZhciBOT05fRklFTERfRVJST1JTID0gJ19fYWxsX18nXG5cbi8qKlxuICogQSBmaWVsZCBhbmQgaXRzIGFzc29jaWF0ZWQgZGF0YS5cbiAqIEBwYXJhbSB7Rm9ybX0gZm9ybSBhIGZvcm0uXG4gKiBAcGFyYW0ge0ZpZWxkfSBmaWVsZCBvbmUgb2YgdGhlIGZvcm0ncyBmaWVsZHMuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSB0aGUgbmFtZSB1bmRlciB3aGljaCB0aGUgZmllbGQgaXMgaGVsZCBpbiB0aGUgZm9ybS5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgQm91bmRGaWVsZCA9IENvbmN1ci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gQm91bmRGaWVsZChmb3JtLCBmaWVsZCwgbmFtZSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCb3VuZEZpZWxkKSkgeyByZXR1cm4gbmV3IEJvdW5kRmllbGQoZm9ybSwgZmllbGQsIG5hbWUpIH1cbiAgICB0aGlzLmZvcm0gPSBmb3JtXG4gICAgdGhpcy5maWVsZCA9IGZpZWxkXG4gICAgdGhpcy5uYW1lID0gbmFtZVxuICAgIHRoaXMuaHRtbE5hbWUgPSBmb3JtLmFkZFByZWZpeChuYW1lKVxuICAgIHRoaXMuaHRtbEluaXRpYWxOYW1lID0gZm9ybS5hZGRJbml0aWFsUHJlZml4KG5hbWUpXG4gICAgdGhpcy5odG1sSW5pdGlhbElkID0gZm9ybS5hZGRJbml0aWFsUHJlZml4KHRoaXMuYXV0b0lkKCkpXG4gICAgdGhpcy5sYWJlbCA9IHRoaXMuZmllbGQubGFiZWwgIT09IG51bGwgPyB0aGlzLmZpZWxkLmxhYmVsIDogdXRpbC5wcmV0dHlOYW1lKG5hbWUpXG4gICAgdGhpcy5oZWxwVGV4dCA9IGZpZWxkLmhlbHBUZXh0IHx8ICcnXG4gIH1cbn0pXG5cbkJvdW5kRmllbGQucHJvdG90eXBlLmVycm9ycyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5mb3JtLmVycm9ycyh0aGlzLm5hbWUpIHx8IG5ldyB0aGlzLmZvcm0uZXJyb3JDb25zdHJ1Y3RvcigpXG59XG5cbkJvdW5kRmllbGQucHJvdG90eXBlLmlzSGlkZGVuID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmZpZWxkLndpZGdldC5pc0hpZGRlblxufVxuXG4vKipcbiAqIENhbGN1bGF0ZXMgYW5kIHJldHVybnMgdGhlIGlkIGF0dHJpYnV0ZSBmb3IgdGhpcyBCb3VuZEZpZWxkIGlmIHRoZSBhc3NvY2lhdGVkXG4gKiBmb3JtIGhhcyBhbiBhdXRvSWQuIFJldHVybnMgYW4gZW1wdHkgc3RyaW5nIG90aGVyd2lzZS5cbiAqL1xuQm91bmRGaWVsZC5wcm90b3R5cGUuYXV0b0lkID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhdXRvSWQgPSB0aGlzLmZvcm0uYXV0b0lkXG4gIGlmIChhdXRvSWQpIHtcbiAgICBhdXRvSWQgPSAnJythdXRvSWRcbiAgICBpZiAoYXV0b0lkLmluZGV4T2YoJ3tuYW1lfScpICE9IC0xKSB7XG4gICAgICByZXR1cm4gZm9ybWF0KGF1dG9JZCwge25hbWU6IHRoaXMuaHRtbE5hbWV9KVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5odG1sTmFtZVxuICB9XG4gIHJldHVybiAnJ1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGRhdGEgZm9yIHRoaXMgQm91bmRGSWVsZCwgb3IgbnVsbCBpZiBpdCB3YXNuJ3QgZ2l2ZW4uXG4gKi9cbkJvdW5kRmllbGQucHJvdG90eXBlLmRhdGEgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZmllbGQud2lkZ2V0LnZhbHVlRnJvbURhdGEodGhpcy5mb3JtLmRhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZm9ybS5maWxlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5odG1sTmFtZSlcbn1cblxuLyoqXG4gKiBXcmFwcGVyIGFyb3VuZCB0aGUgZmllbGQgd2lkZ2V0J3MgaWRGb3JMYWJlbCBtZXRob2QuIFVzZWZ1bCwgZm9yIGV4YW1wbGUsIGZvclxuICogZm9jdXNpbmcgb24gdGhpcyBmaWVsZCByZWdhcmRsZXNzIG9mIHdoZXRoZXIgaXQgaGFzIGEgc2luZ2xlIHdpZGdldCBvciBhXG4gKiBNdXRpV2lkZ2V0LlxuICovXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS5pZEZvckxhYmVsID0gZnVuY3Rpb24oKSB7XG4gIHZhciB3aWRnZXQgPSB0aGlzLmZpZWxkLndpZGdldFxuICAgICwgaWQgPSBvYmplY3QuZ2V0KHdpZGdldC5hdHRycywgJ2lkJywgdGhpcy5hdXRvSWQoKSlcbiAgcmV0dXJuIHdpZGdldC5pZEZvckxhYmVsKGlkKVxufVxuXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgaWYgKHRoaXMuZmllbGQuc2hvd0hpZGRlbkluaXRpYWwpIHtcbiAgICByZXR1cm4gUmVhY3QuRE9NLmRpdihudWxsLCB0aGlzLmFzV2lkZ2V0KGt3YXJncyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hc0hpZGRlbih7b25seUluaXRpYWw6IHRydWV9KSlcbiAgfVxuICByZXR1cm4gdGhpcy5hc1dpZGdldChrd2FyZ3MpXG59XG5cbi8qKlxuICogUmV0dXJucyBhIGxpc3Qgb2YgU3ViV2lkZ2V0cyB0aGF0IGNvbXByaXNlIGFsbCB3aWRnZXRzIGluIHRoaXMgQm91bmRGaWVsZC5cbiAqIFRoaXMgcmVhbGx5IGlzIG9ubHkgdXNlZnVsIGZvciBSYWRpb1NlbGVjdCB3aWRnZXRzLCBzbyB0aGF0IHlvdSBjYW4gaXRlcmF0ZVxuICogb3ZlciBpbmRpdmlkdWFsIHJhZGlvIGJ1dHRvbnMgd2hlbiByZW5kZXJpbmcuXG4gKi9cbkJvdW5kRmllbGQucHJvdG90eXBlLnN1YldpZGdldHMgPSBCb3VuZEZpZWxkLnByb3RvdHlwZS5fX2l0ZXJfXyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5maWVsZC53aWRnZXQuc3ViV2lkZ2V0cyh0aGlzLmh0bWxOYW1lLCB0aGlzLnZhbHVlKCkpXG59XG5cbi8qKlxuICogUmVuZGVycyBhIHdpZGdldCBmb3IgdGhlIGZpZWxkLlxuICogQHBhcmFtIHtPYmplY3R9IFtrd2FyZ3NdIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICogQGNvbmZpZyB7V2lkZ2V0fSBbd2lkZ2V0XSBhbiBvdmVycmlkZSBmb3IgdGhlIHdpZGdldCB1c2VkIHRvIHJlbmRlciB0aGUgZmllbGRcbiAqICAgLSBpZiBub3QgcHJvdmlkZWQsIHRoZSBmaWVsZCdzIGNvbmZpZ3VyZWQgd2lkZ2V0IHdpbGwgYmUgdXNlZFxuICogQGNvbmZpZyB7T2JqZWN0fSBbYXR0cnNdIGFkZGl0aW9uYWwgYXR0cmlidXRlcyB0byBiZSBhZGRlZCB0byB0aGUgZmllbGQncyB3aWRnZXQuXG4gKi9cbkJvdW5kRmllbGQucHJvdG90eXBlLmFzV2lkZ2V0ID0gZnVuY3Rpb24oa3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgIHdpZGdldDogbnVsbCwgYXR0cnM6IG51bGwsIG9ubHlJbml0aWFsOiBmYWxzZVxuICB9LCBrd2FyZ3MpXG4gIHZhciB3aWRnZXQgPSAoa3dhcmdzLndpZGdldCAhPT0gbnVsbCA/IGt3YXJncy53aWRnZXQgOiB0aGlzLmZpZWxkLndpZGdldClcbiAgICAsIGF0dHJzID0gKGt3YXJncy5hdHRycyAhPT0gbnVsbCA/IGt3YXJncy5hdHRycyA6IHt9KVxuICAgICwgYXV0b0lkID0gdGhpcy5hdXRvSWQoKVxuICAgICwgbmFtZSA9ICFrd2FyZ3Mub25seUluaXRpYWwgPyB0aGlzLmh0bWxOYW1lIDogdGhpcy5odG1sSW5pdGlhbE5hbWVcbiAgaWYgKGF1dG9JZCAmJlxuICAgICAgdHlwZW9mIGF0dHJzLmlkID09ICd1bmRlZmluZWQnICYmXG4gICAgICB0eXBlb2Ygd2lkZ2V0LmF0dHJzLmlkID09ICd1bmRlZmluZWQnKSB7XG4gICAgYXR0cnMuaWQgPSAoIWt3YXJncy5vbmx5SW5pdGlhbCA/IGF1dG9JZCA6IHRoaXMuaHRtbEluaXRpYWxJZClcbiAgfVxuXG4gIHJldHVybiB3aWRnZXQucmVuZGVyKG5hbWUsIHRoaXMudmFsdWUoKSwge2F0dHJzOiBhdHRyc30pXG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgZmllbGQgYXMgYSB0ZXh0IGlucHV0LlxuICogQHBhcmFtIHtPYmplY3R9IFtrd2FyZ3NdIHdpZGdldCBvcHRpb25zLlxuICovXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS5hc1RleHQgPSBmdW5jdGlvbihrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7fSwga3dhcmdzLCB7d2lkZ2V0OiBUZXh0SW5wdXQoKX0pXG4gIHJldHVybiB0aGlzLmFzV2lkZ2V0KGt3YXJncylcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSBmaWVsZCBhcyBhIHRleHRhcmVhLlxuICogQHBhcmFtIHtPYmplY3R9IFtrd2FyZ3NdIHdpZGdldCBvcHRpb25zLlxuICovXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS5hc1RleHRhcmVhID0gZnVuY3Rpb24oa3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe30sIGt3YXJncywge3dpZGdldDogVGV4dGFyZWEoKX0pXG4gIHJldHVybiB0aGlzLmFzV2lkZ2V0KGt3YXJncylcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSBmaWVsZCBhcyBhIGhpZGRlbiBmaWVsZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBba3dhcmdzXSB3aWRnZXQgb3B0aW9ucy5cbiAqL1xuQm91bmRGaWVsZC5wcm90b3R5cGUuYXNIaWRkZW4gPSBmdW5jdGlvbihrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7fSwga3dhcmdzLCB7d2lkZ2V0OiBuZXcgdGhpcy5maWVsZC5oaWRkZW5XaWRnZXQoKX0pXG4gIHJldHVybiB0aGlzLmFzV2lkZ2V0KGt3YXJncylcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB2YWx1ZSBmb3IgdGhpcyBCb3VuZEZpZWxkLCB1c2luZyB0aGUgaW5pdGlhbCB2YWx1ZSBpZiB0aGUgZm9ybVxuICogaXMgbm90IGJvdW5kIG9yIHRoZSBkYXRhIG90aGVyd2lzZS5cbiAqL1xuQm91bmRGaWVsZC5wcm90b3R5cGUudmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGRhdGFcbiAgaWYgKCF0aGlzLmZvcm0uaXNCb3VuZCkge1xuICAgIGRhdGEgPSBvYmplY3QuZ2V0KHRoaXMuZm9ybS5pbml0aWFsLCB0aGlzLm5hbWUsIHRoaXMuZmllbGQuaW5pdGlhbClcbiAgICBpZiAoaXMuRnVuY3Rpb24oZGF0YSkpIHtcbiAgICAgIGRhdGEgPSBkYXRhKClcbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgZGF0YSA9IHRoaXMuZmllbGQuYm91bmREYXRhKHRoaXMuZGF0YSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QuZ2V0KHRoaXMuZm9ybS5pbml0aWFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpZWxkLmluaXRpYWwpKVxuICB9XG4gIHJldHVybiB0aGlzLmZpZWxkLnByZXBhcmVWYWx1ZShkYXRhKVxufVxuXG4vKipcbiAqIENyZWF0ZXMgdGhlIGxhYmVsIHZhbHVlIHRvIGJlIGRpc3BsYXllZCwgYWRkaW5nIHRoZSBmb3JtIHN1ZmZpeCBpZiB0aGVyZSBpc1xuICogb25lIGFuZCB0aGUgbGFiZWwgZG9lc24ndCBlbmQgaW4gcHVuY3R1YXRpb24uXG4gKi9cbkJvdW5kRmllbGQucHJvdG90eXBlLmdldExhYmVsID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9hZGRMYWJlbFN1ZmZpeCgnJyt0aGlzLmxhYmVsKVxufVxuXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS5fYWRkTGFiZWxTdWZmaXggPSBmdW5jdGlvbihsYWJlbCkge1xuICAvLyBPbmx5IGFkZCB0aGUgc3VmZml4IGlmIHRoZSBsYWJlbCBkb2VzIG5vdCBlbmQgaW4gcHVuY3R1YXRpb25cbiAgaWYgKHRoaXMuZm9ybS5sYWJlbFN1ZmZpeCAmJlxuICAgICAgJzo/LiEnLmluZGV4T2YobGFiZWwuY2hhckF0KGxhYmVsLmxlbmd0aCAtIDEpKSA9PSAtMSkge1xuICAgIGxhYmVsICs9IHRoaXMuZm9ybS5sYWJlbFN1ZmZpeFxuICB9XG4gIHJldHVybiBsYWJlbFxufVxuXG4vKipcbiAqIFdyYXBzIHRoZSBnaXZlbiBjb250ZW50cyBpbiBhIDxsYWJlbD4gaWYgdGhlIGZpZWxkIGhhcyBhbiBpZCBhdHRyaWJ1dGUuIElmXG4gKiBjb250ZW50cyBhcmVuJ3QgZ2l2ZW4sIHVzZXMgdGhlIGZpZWxkJ3MgbGFiZWwuXG4gKlxuICogSWYgYXR0cnMgYXJlIGdpdmVuLCB0aGV5J3JlIHVzZWQgYXMgSFRNTCBhdHRyaWJ1dGVzIG9uIHRoZSA8bGFiZWw+IHRhZy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW2t3YXJnc10gY29uZmlndXJhdGlvbiBvcHRpb25zLlxuICogQGNvbmZpZyB7U3RyaW5nfSBbY29udGVudHNdIGNvbnRlbnRzIGZvciB0aGUgbGFiZWwgLSBpZiBub3QgcHJvdmlkZWQsIGxhYmVsXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudHMgd2lsbCBiZSBnZW5lcmF0ZWQgZnJvbSB0aGUgZmllbGQgaXRzZWxmLlxuICogQGNvbmZpZyB7T2JqZWN0fSBbYXR0cnNdIGFkZGl0aW9uYWwgYXR0cmlidXRlcyB0byBiZSBhZGRlZCB0byB0aGUgbGFiZWwuXG4gKi9cbkJvdW5kRmllbGQucHJvdG90eXBlLmxhYmVsVGFnID0gZnVuY3Rpb24oa3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2NvbnRlbnRzOiBudWxsLCBhdHRyczogbnVsbH0sIGt3YXJncylcbiAgdmFyIGNvbnRlbnRzXG4gIGlmIChrd2FyZ3MuY29udGVudHMgIT09IG51bGwpIHtcbiAgICBjb250ZW50cyA9IHRoaXMuX2FkZExhYmVsU3VmZml4KCcnK2t3YXJncy5jb250ZW50cylcbiAgfVxuICBlbHNlIHtcbiAgICBjb250ZW50cyA9IHRoaXMuZ2V0TGFiZWwoKVxuICB9XG5cbiAgdmFyIHdpZGdldCA9IHRoaXMuZmllbGQud2lkZ2V0XG4gICAgLCBpZCA9IG9iamVjdC5nZXQod2lkZ2V0LmF0dHJzLCAnaWQnLCB0aGlzLmF1dG9JZCgpKVxuICBpZiAoaWQpIHtcbiAgICB2YXIgYXR0cnMgPSBvYmplY3QuZXh0ZW5kKGt3YXJncy5hdHRycyB8fCB7fSwge2h0bWxGb3I6IHdpZGdldC5pZEZvckxhYmVsKGlkKX0pXG4gICAgY29udGVudHMgPSBSZWFjdC5ET00ubGFiZWwoYXR0cnMsIGNvbnRlbnRzKVxuICB9XG4gIHJldHVybiBjb250ZW50c1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBzdHJpbmcgb2Ygc3BhY2Utc2VwYXJhdGVkIENTUyBjbGFzc2VzIGZvciB0aGlzIGZpZWxkLlxuICovXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS5jc3NDbGFzc2VzID0gZnVuY3Rpb24oZXh0cmFDbGFzc2VzKSB7XG4gIGV4dHJhQ2xhc3NlcyA9IGV4dHJhQ2xhc3NlcyB8fCB0aGlzLmZpZWxkLmV4dHJhQ2xhc3Nlc1xuICBpZiAoZXh0cmFDbGFzc2VzICE9PSBudWxsICYmIGlzLkZ1bmN0aW9uKGV4dHJhQ2xhc3Nlcy5zcGxpdCkpIHtcbiAgICBleHRyYUNsYXNzZXMgPSBleHRyYUNsYXNzZXMuc3BsaXQoKVxuICB9XG4gIGV4dHJhQ2xhc3NlcyA9IGV4dHJhQ2xhc3NlcyB8fCBbXVxuICBpZiAodHlwZW9mIHRoaXMuZm9ybS5yb3dDc3NDbGFzcyAhPSAndW5kZWZpbmVkJykge1xuICAgIGV4dHJhQ2xhc3Nlcy5wdXNoKHRoaXMuZm9ybS5yb3dDc3NDbGFzcylcbiAgfVxuICBpZiAodGhpcy5lcnJvcnMoKS5pc1BvcHVsYXRlZCgpICYmXG4gICAgICB0eXBlb2YgdGhpcy5mb3JtLmVycm9yQ3NzQ2xhc3MgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBleHRyYUNsYXNzZXMucHVzaCh0aGlzLmZvcm0uZXJyb3JDc3NDbGFzcylcbiAgfVxuICBpZiAodGhpcy5maWVsZC5yZXF1aXJlZCAmJiB0eXBlb2YgdGhpcy5mb3JtLnJlcXVpcmVkQ3NzQ2xhc3MgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBleHRyYUNsYXNzZXMucHVzaCh0aGlzLmZvcm0ucmVxdWlyZWRDc3NDbGFzcylcbiAgfVxuICByZXR1cm4gZXh0cmFDbGFzc2VzLmpvaW4oJyAnKVxufVxuXG4vKipcbiAqIEEgY29sbGVjdGlvbiBvZiBGaWVsZHMgdGhhdCBrbm93cyBob3cgdG8gdmFsaWRhdGUgYW5kIGRpc3BsYXkgaXRzZWxmLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH1cbiAqL1xudmFyIEJhc2VGb3JtID0gQ29uY3VyLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBCYXNlRm9ybShrd2FyZ3MpIHtcbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtcbiAgICAgIGRhdGE6IG51bGwsIGZpbGVzOiBudWxsLCBhdXRvSWQ6ICdpZF97bmFtZX0nLCBwcmVmaXg6IG51bGwsXG4gICAgICBpbml0aWFsOiBudWxsLCBlcnJvckNvbnN0cnVjdG9yOiBFcnJvckxpc3QsIGxhYmVsU3VmZml4OiAnOicsXG4gICAgICBlbXB0eVBlcm1pdHRlZDogZmFsc2VcbiAgICB9LCBrd2FyZ3MpXG4gICAgdGhpcy5pc0JvdW5kID0ga3dhcmdzLmRhdGEgIT09IG51bGwgfHwga3dhcmdzLmZpbGVzICE9PSBudWxsXG4gICAgdGhpcy5kYXRhID0ga3dhcmdzLmRhdGEgfHwge31cbiAgICB0aGlzLmZpbGVzID0ga3dhcmdzLmZpbGVzIHx8IHt9XG4gICAgdGhpcy5hdXRvSWQgPSBrd2FyZ3MuYXV0b0lkXG4gICAgdGhpcy5wcmVmaXggPSBrd2FyZ3MucHJlZml4XG4gICAgdGhpcy5pbml0aWFsID0ga3dhcmdzLmluaXRpYWwgfHwge31cbiAgICB0aGlzLmVycm9yQ29uc3RydWN0b3IgPSBrd2FyZ3MuZXJyb3JDb25zdHJ1Y3RvclxuICAgIHRoaXMubGFiZWxTdWZmaXggPSBrd2FyZ3MubGFiZWxTdWZmaXhcbiAgICB0aGlzLmVtcHR5UGVybWl0dGVkID0ga3dhcmdzLmVtcHR5UGVybWl0dGVkXG4gICAgdGhpcy5fZXJyb3JzID0gbnVsbDsgLy8gU3RvcmVzIGVycm9ycyBhZnRlciBjbGVhbigpIGhhcyBiZWVuIGNhbGxlZFxuICAgIHRoaXMuX2NoYW5nZWREYXRhID0gbnVsbFxuXG4gICAgLy8gVGhlIGJhc2VGaWVsZHMgYXR0cmlidXRlIGlzIHRoZSAqcHJvdG90eXBlLXdpZGUqIGRlZmluaXRpb24gb2YgZmllbGRzLlxuICAgIC8vIEJlY2F1c2UgYSBwYXJ0aWN1bGFyICppbnN0YW5jZSogbWlnaHQgd2FudCB0byBhbHRlciB0aGlzLmZpZWxkcywgd2VcbiAgICAvLyBjcmVhdGUgdGhpcy5maWVsZHMgaGVyZSBieSBkZWVwIGNvcHlpbmcgYmFzZUZpZWxkcy4gSW5zdGFuY2VzIHNob3VsZFxuICAgIC8vIGFsd2F5cyBtb2RpZnkgdGhpcy5maWVsZHM7IHRoZXkgc2hvdWxkIG5vdCBtb2RpZnkgYmFzZUZpZWxkcy5cbiAgICB0aGlzLmZpZWxkcyA9IGNvcHkuZGVlcENvcHkodGhpcy5iYXNlRmllbGRzKVxuICB9XG59KVxuXG4vKipcbiAqIEdldHRlciBmb3IgZXJyb3JzLCB3aGljaCBmaXJzdCBjbGVhbnMgdGhlIGZvcm0gaWYgdGhlcmUgYXJlIG5vIGVycm9yc1xuICogZGVmaW5lZCB5ZXQuXG4gKiBAcGFyYW0ge3N0cmluZz19IG5hbWUgaWYgZ2l2ZW4sIGVycm9ycyBmb3IgdGhpcyBmaWVsZCBuYW1lIHdpbGwgYmUgcmV0dXJuZWRcbiAqICAgaW5zdGVhZCBvZiB0aGUgZnVsbCBlcnJvciBvYmplY3QuXG4gKiBAcmV0dXJuIGVycm9ycyBmb3IgdGhlIGRhdGEgcHJvdmlkZWQgZm9yIHRoZSBmb3JtLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuZXJyb3JzID0gZnVuY3Rpb24obmFtZSkge1xuICBpZiAodGhpcy5fZXJyb3JzID09PSBudWxsKSB7XG4gICAgdGhpcy5mdWxsQ2xlYW4oKVxuICB9XG4gIGlmIChuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX2Vycm9ycy5nZXQobmFtZSlcbiAgfVxuICByZXR1cm4gdGhpcy5fZXJyb3JzXG59XG5cbkJhc2VGb3JtLnByb3RvdHlwZS5jaGFuZ2VkRGF0YSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fY2hhbmdlZERhdGEgPT09IG51bGwpIHtcbiAgICB0aGlzLl9jaGFuZ2VkRGF0YSA9IFtdXG4gICAgdmFyIGluaXRpYWxWYWx1ZVxuICAgIC8vIFhYWDogRm9yIG5vdyB3ZSdyZSBhc2tpbmcgdGhlIGluZGl2aWR1YWwgZmllbGRzIHdoZXRoZXIgb3Igbm90XG4gICAgLy8gdGhlIGRhdGEgaGFzIGNoYW5nZWQuIEl0IHdvdWxkIHByb2JhYmx5IGJlIG1vcmUgZWZmaWNpZW50IHRvIGhhc2hcbiAgICAvLyB0aGUgaW5pdGlhbCBkYXRhLCBzdG9yZSBpdCBpbiBhIGhpZGRlbiBmaWVsZCwgYW5kIGNvbXBhcmUgYSBoYXNoXG4gICAgLy8gb2YgdGhlIHN1Ym1pdHRlZCBkYXRhLCBidXQgd2UnZCBuZWVkIGEgd2F5IHRvIGVhc2lseSBnZXQgdGhlXG4gICAgLy8gc3RyaW5nIHZhbHVlIGZvciBhIGdpdmVuIGZpZWxkLiBSaWdodCBub3csIHRoYXQgbG9naWMgaXMgZW1iZWRkZWRcbiAgICAvLyBpbiB0aGUgcmVuZGVyIG1ldGhvZCBvZiBlYWNoIGZpZWxkJ3Mgd2lkZ2V0LlxuICAgIGZvciAodmFyIG5hbWUgaW4gdGhpcy5maWVsZHMpIHtcbiAgICAgIGlmICghb2JqZWN0Lmhhc093bih0aGlzLmZpZWxkcywgbmFtZSkpIHsgY29udGludWUgfVxuXG4gICAgICB2YXIgZmllbGQgPSB0aGlzLmZpZWxkc1tuYW1lXVxuICAgICAgdmFyIHByZWZpeGVkTmFtZSA9IHRoaXMuYWRkUHJlZml4KG5hbWUpXG4gICAgICB2YXIgZGF0YVZhbHVlID0gZmllbGQud2lkZ2V0LnZhbHVlRnJvbURhdGEodGhpcy5kYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmlsZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlZml4ZWROYW1lKVxuICAgICAgaWYgKCFmaWVsZC5zaG93SGlkZGVuSW5pdGlhbCkge1xuICAgICAgICBpbml0aWFsVmFsdWUgPSBvYmplY3QuZ2V0KHRoaXMuaW5pdGlhbCwgbmFtZSwgZmllbGQuaW5pdGlhbClcbiAgICAgICAgaWYgKGlzLkZ1bmN0aW9uKGluaXRpYWxWYWx1ZSkpIHtcbiAgICAgICAgICBpbml0aWFsVmFsdWUgPSBpbml0aWFsVmFsdWUoKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFyIGluaXRpYWxQcmVmaXhlZE5hbWUgPSB0aGlzLmFkZEluaXRpYWxQcmVmaXgobmFtZSlcbiAgICAgICAgdmFyIGhpZGRlbldpZGdldCA9IG5ldyBmaWVsZC5oaWRkZW5XaWRnZXQoKVxuICAgICAgICB0cnkge1xuICAgICAgICAgIGluaXRpYWxWYWx1ZSA9IGhpZGRlbldpZGdldC52YWx1ZUZyb21EYXRhKFxuICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhLCB0aGlzLmZpbGVzLCBpbml0aWFsUHJlZml4ZWROYW1lKVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHsgdGhyb3cgZSB9XG4gICAgICAgICAgLy8gQWx3YXlzIGFzc3VtZSBkYXRhIGhhcyBjaGFuZ2VkIGlmIHZhbGlkYXRpb24gZmFpbHNcbiAgICAgICAgICB0aGlzLl9jaGFuZ2VkRGF0YS5wdXNoKG5hbWUpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZmllbGQuX2hhc0NoYW5nZWQoaW5pdGlhbFZhbHVlLCBkYXRhVmFsdWUpKSB7XG4gICAgICAgIHRoaXMuX2NoYW5nZWREYXRhLnB1c2gobmFtZSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXMuX2NoYW5nZWREYXRhXG59XG5cbkJhc2VGb3JtLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuYXNUYWJsZSgpXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIEJvdW5kRmllbGQgZm9yIGVhY2ggZmllbGQgaW4gdGhlIGZvcm0sIGluIHRoZSBvcmRlciBpbiB3aGljaCB0aGVcbiAqIGZpZWxkcyB3ZXJlIGNyZWF0ZWQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbdGVzdF0gaWYgcHJvdmlkZWQsIHRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2l0aFxuICogICBmaWVsZCBhbmQgbmFtZSBhcmd1bWVudHMgLSBCb3VuZEZpZWxkcyB3aWxsIG9ubHkgYmUgZ2VuZXJhdGVkIGZvciBmaWVsZHNcbiAqICAgZm9yIHdoaWNoIHRydWUgaXMgcmV0dXJuZWQuXG4gKiBAcmV0dXJuIGEgbGlzdCBvZiBCb3VuZEZpZWxkIG9iamVjdHMgLSBvbmUgZm9yIGVhY2ggZmllbGQgaW4gdGhlIGZvcm0sIGluIHRoZVxuICogICBvcmRlciBpbiB3aGljaCB0aGUgZmllbGRzIHdlcmUgY3JlYXRlZC5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmJvdW5kRmllbGRzID0gZnVuY3Rpb24odGVzdCkge1xuICB0ZXN0ID0gdGVzdCB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIHRydWUgfVxuXG4gIHZhciBmaWVsZHMgPSBbXVxuICBmb3IgKHZhciBuYW1lIGluIHRoaXMuZmllbGRzKSB7XG4gICAgaWYgKG9iamVjdC5oYXNPd24odGhpcy5maWVsZHMsIG5hbWUpICYmXG4gICAgICAgIHRlc3QodGhpcy5maWVsZHNbbmFtZV0sIG5hbWUpID09PSB0cnVlKSB7XG4gICAgICBmaWVsZHMucHVzaChCb3VuZEZpZWxkKHRoaXMsIHRoaXMuZmllbGRzW25hbWVdLCBuYW1lKSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZpZWxkc1xufVxuXG4vKipcbiAqIHtuYW1lIC0+IEJvdW5kRmllbGR9IHZlcnNpb24gb2YgYm91bmRGaWVsZHNcbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmJvdW5kRmllbGRzT2JqID0gZnVuY3Rpb24odGVzdCkge1xuICB0ZXN0ID0gdGVzdCB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIHRydWUgfVxuXG4gIHZhciBmaWVsZHMgPSB7fVxuICBmb3IgKHZhciBuYW1lIGluIHRoaXMuZmllbGRzKSB7XG4gICAgaWYgKG9iamVjdC5oYXNPd24odGhpcy5maWVsZHMsIG5hbWUpICYmXG4gICAgICAgIHRlc3QodGhpcy5maWVsZHNbbmFtZV0sIG5hbWUpID09PSB0cnVlKSB7XG4gICAgICBmaWVsZHNbbmFtZV0gPSBCb3VuZEZpZWxkKHRoaXMsIHRoaXMuZmllbGRzW25hbWVdLCBuYW1lKVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmllbGRzXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIEJvdW5kRmllbGQgZm9yIHRoZSBmaWVsZCB3aXRoIHRoZSBnaXZlbiBuYW1lLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIGEgZmllbGQgbmFtZS5cbiAqIEByZXR1cm4gYSBCb3VuZEZpZWxkIGZvciB0aGUgZmllbGQgd2l0aCB0aGUgZ2l2ZW4gbmFtZSwgaWYgb25lIGV4aXN0cy5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmJvdW5kRmllbGQgPSBmdW5jdGlvbihuYW1lKSB7XG4gIGlmICghb2JqZWN0Lmhhc093bih0aGlzLmZpZWxkcywgbmFtZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJGb3JtIGRvZXMgbm90IGhhdmUgYSAnXCIgKyBuYW1lICsgXCInIGZpZWxkLlwiKVxuICB9XG4gIHJldHVybiBCb3VuZEZpZWxkKHRoaXMsIHRoaXMuZmllbGRzW25hbWVdLCBuYW1lKVxufVxuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciBvciBub3QgdGhlIGZvcm0gaGFzIGVycm9ycy5cbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5pc1ZhbGlkID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5pc0JvdW5kKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgcmV0dXJuICF0aGlzLmVycm9ycygpLmlzUG9wdWxhdGVkKClcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBmaWVsZCBuYW1lIHdpdGggYSBwcmVmaXggYXBwZW5kZWQsIGlmIHRoaXMgRm9ybSBoYXMgYSBwcmVmaXggc2V0LlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkTmFtZSBhIGZpZWxkIG5hbWUuXG4gKiBAcmV0dXJuIGEgZmllbGQgbmFtZSB3aXRoIGEgcHJlZml4IGFwcGVuZGVkLCBpZiB0aGlzIEZvcm0gaGFzIGEgcHJlZml4IHNldCxcbiAqICAgICAgICAgb3RoZXJ3aXNlIDxjb2RlPmZpZWxkTmFtZTwvY29kZT4gaXMgcmV0dXJuZWQgYXMtaXMuXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5hZGRQcmVmaXggPSBmdW5jdGlvbihmaWVsZE5hbWUpIHtcbiAgaWYgKHRoaXMucHJlZml4ICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZm9ybWF0KCd7cHJlZml4fS17ZmllbGROYW1lfScsXG4gICAgICAgICAgICAgICAgICAgIHtwcmVmaXg6IHRoaXMucHJlZml4LCBmaWVsZE5hbWU6IGZpZWxkTmFtZX0pXG4gIH1cbiAgcmV0dXJuIGZpZWxkTmFtZVxufVxuXG4vKipcbiAqIEFkZHMgYW4gaW5pdGlhbCBwcmVmaXggZm9yIGNoZWNraW5nIGR5bmFtaWMgaW5pdGlhbCB2YWx1ZXMuXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5hZGRJbml0aWFsUHJlZml4ID0gZnVuY3Rpb24oZmllbGROYW1lKSB7XG4gIHJldHVybiBmb3JtYXQoJ2luaXRpYWwte2ZpZWxkTmFtZX0nLFxuICAgICAgICAgICAgICAgIHtmaWVsZE5hbWU6IHRoaXMuYWRkUHJlZml4KGZpZWxkTmFtZSl9KVxufVxuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiBmb3Igb3V0cHV0dGluZyBIVE1MLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gbm9ybWFsUm93IGEgZnVuY3Rpb24gd2hpY2ggcHJvZHVjZXMgYSBub3JtYWwgcm93LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZXJyb3JSb3cgYSBmdW5jdGlvbiB3aGljaCBwcm9kdWNlcyBhbiBlcnJvciByb3cuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGVycm9yc09uU2VwYXJhdGVSb3cgZGV0ZXJtaW5lcyBpZiBlcnJvcnMgYXJlIHBsYWNlZCBpbiB0aGVpclxuICogICBvd24gcm93LCBvciBpbiB0aGUgcm93IGZvciB0aGUgZmllbGQgdGhleSBhcmUgcmVsYXRlZCB0by5cbiAqIEByZXR1cm4gYSBsaXN0IG9mIFJlYWN0LkRPTSBlbGVtZW50cyByZXByZXNlbnRpbmcgcm93cy5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLl9odG1sT3V0cHV0ID0gZnVuY3Rpb24obm9ybWFsUm93LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JSb3csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcnNPblNlcGFyYXRlUm93KSB7XG4gIC8vIEVycm9ycyB0aGF0IHNob3VsZCBiZSBkaXNwbGF5ZWQgYWJvdmUgYWxsIGZpZWxkc1xuICB2YXIgdG9wRXJyb3JzID0gdGhpcy5ub25GaWVsZEVycm9ycygpXG4gIHZhciByb3dzID0gW11cbiAgdmFyIGhpZGRlbkZpZWxkcyA9IFtdXG4gIHZhciBodG1sQ2xhc3NBdHRyID0gbnVsbFxuICB2YXIgY3NzQ2xhc3NlcyA9IG51bGxcbiAgdmFyIGhpZGRlbkJvdW5kRmllbGRzID0gdGhpcy5oaWRkZW5GaWVsZHMoKVxuICB2YXIgdmlzaWJsZUJvdW5kRmllbGRzID0gdGhpcy52aXNpYmxlRmllbGRzKClcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGhpZGRlbkJvdW5kRmllbGRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBiZiA9IGhpZGRlbkJvdW5kRmllbGRzW2ldXG4gICAgdmFyIGJmRXJyb3JzID0gYmYuZXJyb3JzKClcbiAgICBpZiAoYmZFcnJvcnMuaXNQb3B1bGF0ZWQpIHtcbiAgICAgIHRvcEVycm9ycy5leHRlbmQoYmZFcnJvcnMubWVzc2FnZXMoKS5tYXAoZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuICcoSGlkZGVuIGZpZWxkICcgKyBiZi5uYW1lICsgJykgJyArIGVycm9yXG4gICAgICB9KSlcbiAgICB9XG4gICAgaGlkZGVuRmllbGRzLnB1c2goYmYucmVuZGVyKCkpXG4gIH1cblxuICBmb3IgKGkgPSAwLCBsID0gdmlzaWJsZUJvdW5kRmllbGRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGJmID0gdmlzaWJsZUJvdW5kRmllbGRzW2ldXG4gICAgaHRtbENsYXNzQXR0ciA9ICcnXG4gICAgY3NzQ2xhc3NlcyA9IGJmLmNzc0NsYXNzZXMoKVxuICAgIGlmIChjc3NDbGFzc2VzKSB7XG4gICAgICBodG1sQ2xhc3NBdHRyID0gY3NzQ2xhc3Nlc1xuICAgIH1cblxuICAgIC8vIFZhcmlhYmxlcyB3aGljaCBjYW4gYmUgb3B0aW9uYWwgaW4gZWFjaCByb3dcbiAgICB2YXIgZXJyb3JzID0gbnVsbFxuICAgIHZhciBsYWJlbCA9IG51bGxcbiAgICB2YXIgaGVscFRleHQgPSBudWxsXG4gICAgdmFyIGV4dHJhQ29udGVudCA9IG51bGxcblxuICAgIGJmRXJyb3JzID0gYmYuZXJyb3JzKClcbiAgICBpZiAoYmZFcnJvcnMuaXNQb3B1bGF0ZWQoKSkge1xuICAgICAgZXJyb3JzID0gYmZFcnJvcnNcbiAgICAgIGlmIChlcnJvcnNPblNlcGFyYXRlUm93ID09PSB0cnVlKSB7XG4gICAgICAgIHJvd3MucHVzaChlcnJvclJvdyhlcnJvcnMucmVuZGVyKCkpKVxuICAgICAgICBlcnJvcnMgPSBudWxsXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGJmLmxhYmVsKSB7XG4gICAgICBsYWJlbCA9IGJmLmxhYmVsVGFnKCkgfHwgJydcbiAgICB9XG5cbiAgICBpZiAoYmYuZmllbGQuaGVscFRleHQpIHtcbiAgICAgIGhlbHBUZXh0ID0gYmYuZmllbGQuaGVscFRleHRcbiAgICB9XG5cbiAgICAvLyBJZiB0aGlzIGlzIHRoZSBsYXN0IHJvdywgaXQgc2hvdWxkIGluY2x1ZGUgYW55IGhpZGRlbiBmaWVsZHNcbiAgICBpZiAoaSA9PSBsIC0gMSAmJiBoaWRkZW5GaWVsZHMubGVuZ3RoID4gMCkge1xuICAgICAgZXh0cmFDb250ZW50ID0gaGlkZGVuRmllbGRzXG4gICAgfVxuICAgIGlmIChlcnJvcnMgIT09IG51bGwpIHtcbiAgICAgIGVycm9ycyA9IGVycm9ycy5yZW5kZXIoKVxuICAgIH1cbiAgICByb3dzLnB1c2gobm9ybWFsUm93KGJmLmh0bWxOYW1lLCBsYWJlbCwgYmYucmVuZGVyKCksIGhlbHBUZXh0LCBlcnJvcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sQ2xhc3NBdHRyLCBleHRyYUNvbnRlbnQpKVxuICB9XG5cbiAgaWYgKHRvcEVycm9ycy5pc1BvcHVsYXRlZCgpKSB7XG4gICAgLy8gQWRkIGhpZGRlbiBmaWVsZHMgdG8gdGhlIHRvcCBlcnJvciByb3cgaWYgaXQncyBiZWluZyBkaXNwbGF5ZWQgYW5kXG4gICAgLy8gdGhlcmUgYXJlIG5vIG90aGVyIHJvd3MuXG4gICAgZXh0cmFDb250ZW50ID0gbnVsbFxuICAgIGlmIChoaWRkZW5GaWVsZHMubGVuZ3RoID4gMCAmJiByb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZXh0cmFDb250ZW50ID0gaGlkZGVuRmllbGRzXG4gICAgfVxuICAgIHJvd3Muc3BsaWNlKDAsIDAsIGVycm9yUm93KHRvcEVycm9ycy5yZW5kZXIoKSwgZXh0cmFDb250ZW50KSlcbiAgfVxuXG4gIC8vIFB1dCBoaWRkZW4gZmllbGRzIGluIHRoZWlyIG93biBlcnJvciByb3cgaWYgdGhlcmUgd2VyZSBubyByb3dzIHRvXG4gIC8vIGRpc3BsYXkuXG4gIGlmIChoaWRkZW5GaWVsZHMubGVuZ3RoID4gMCAmJiByb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJvd3MucHVzaChlcnJvclJvdygnJywgaGlkZGVuRmllbGRzLCB0aGlzLmhpZGRlbkZpZWxkUm93Q3NzQ2xhc3MpKVxuICB9XG4gIHJldHVybiByb3dzXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGZvcm0gcmVuZGVyZWQgYXMgSFRNTCA8dHI+cyAtIGV4Y2x1ZGluZyB0aGUgPHRhYmxlPi5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmFzVGFibGUgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBub3JtYWxSb3cgPSBmdW5jdGlvbihrZXksIGxhYmVsLCBmaWVsZCwgaGVscFRleHQsIGVycm9ycywgaHRtbENsYXNzQXR0cixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhQ29udGVudCkge1xuICAgIHZhciBjb250ZW50cyA9IFtdXG4gICAgaWYgKGVycm9ycykge1xuICAgICAgY29udGVudHMucHVzaChlcnJvcnMpXG4gICAgfVxuICAgIGNvbnRlbnRzLnB1c2goZmllbGQpXG4gICAgaWYgKGhlbHBUZXh0KSB7XG4gICAgICBjb250ZW50cy5wdXNoKFJlYWN0LkRPTS5icihudWxsKSlcbiAgICAgIGNvbnRlbnRzLnB1c2goaGVscFRleHQpXG4gICAgfVxuICAgIGlmIChleHRyYUNvbnRlbnQpIHtcbiAgICAgIGNvbnRlbnRzID0gY29udGVudHMuY29uY2F0KGV4dHJhQ29udGVudClcbiAgICB9XG5cbiAgICB2YXIgcm93QXR0cnMgPSB7a2V5OiBrZXl9XG4gICAgaWYgKGh0bWxDbGFzc0F0dHIpIHtcbiAgICAgIHJvd0F0dHJzWydjbGFzc05hbWUnXSA9IGh0bWxDbGFzc0F0dHJcbiAgICB9XG4gICAgcmV0dXJuIFJlYWN0LkRPTS50cihyb3dBdHRyc1xuICAgICwgUmVhY3QuRE9NLnRoKG51bGwsIGxhYmVsKVxuICAgICwgUmVhY3QuRE9NLnRkKG51bGwsIGNvbnRlbnRzKVxuICAgIClcbiAgfVxuXG4gIHZhciBlcnJvclJvdyA9IGZ1bmN0aW9uKGVycm9ycywgZXh0cmFDb250ZW50LCBodG1sQ2xhc3NBdHRyKSB7XG4gICAgdmFyIGNvbnRlbnRzID0gW11cbiAgICBpZiAoZXJyb3JzKSB7XG4gICAgICBjb250ZW50cy5wdXNoKGVycm9ycylcbiAgICB9XG4gICAgaWYgKGV4dHJhQ29udGVudCkge1xuICAgICAgY29udGVudHMgPSBjb250ZW50cy5jb25jYXQoZXh0cmFDb250ZW50KVxuICAgIH1cbiAgICB2YXIgcm93QXR0cnMgPSB7fVxuICAgIGlmIChodG1sQ2xhc3NBdHRyKSB7XG4gICAgICByb3dBdHRycy5jbGFzc05hbWUgPSBodG1sQ2xhc3NBdHRyXG4gICAgfVxuICAgIHJldHVybiBSZWFjdC5ET00udHIocm93QXR0cnNcbiAgICAsIFJlYWN0LkRPTS50ZCh7Y29sU3BhbjogMn0sIGNvbnRlbnRzKVxuICAgIClcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5faHRtbE91dHB1dChub3JtYWxSb3csIGVycm9yUm93LCBmYWxzZSlcbiAgfVxufSkoKVxuXG4vKipcbiAqIFJldHVybnMgdGhpcyBmb3JtIHJlbmRlcmVkIGFzIEhUTUwgPGxpPnMgLSBleGNsdWRpbmcgdGhlIDx1bD4uXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5hc1VMID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgbm9ybWFsUm93ID0gZnVuY3Rpb24oa2V5LCBsYWJlbCwgZmllbGQsIGhlbHBUZXh0LCBlcnJvcnMsIGh0bWxDbGFzc0F0dHIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYUNvbnRlbnQpIHtcbiAgICB2YXIgY29udGVudHMgPSBbXVxuICAgIGlmIChlcnJvcnMpIHtcbiAgICAgIGNvbnRlbnRzLnB1c2goZXJyb3JzKVxuICAgIH1cbiAgICBpZiAobGFiZWwpIHtcbiAgICAgIGNvbnRlbnRzLnB1c2gobGFiZWwpXG4gICAgfVxuICAgIGNvbnRlbnRzLnB1c2goJyAnKVxuICAgIGNvbnRlbnRzLnB1c2goZmllbGQpXG4gICAgaWYgKGhlbHBUZXh0KSB7XG4gICAgICBjb250ZW50cy5wdXNoKCcgJylcbiAgICAgIGNvbnRlbnRzLnB1c2goaGVscFRleHQpXG4gICAgfVxuICAgIGlmIChleHRyYUNvbnRlbnQpIHtcbiAgICAgIGNvbnRlbnRzID0gY29udGVudHMuY29uY2F0KGV4dHJhQ29udGVudClcbiAgICB9XG5cbiAgICB2YXIgcm93QXR0cnMgPSB7a2V5OiBrZXl9XG4gICAgaWYgKGh0bWxDbGFzc0F0dHIpIHtcbiAgICAgIHJvd0F0dHJzLmNsYXNzTmFtZSA9IGh0bWxDbGFzc0F0dHJcbiAgICB9XG4gICAgcmV0dXJuIFJlYWN0LkRPTS5saShyb3dBdHRycywgY29udGVudHMpXG4gIH1cblxuICB2YXIgZXJyb3JSb3cgPSBmdW5jdGlvbihlcnJvcnMsIGV4dHJhQ29udGVudCwgaHRtbENsYXNzQXR0cikge1xuICAgIHZhciBjb250ZW50cyA9IFtdXG4gICAgaWYgKGVycm9ycykge1xuICAgICAgY29udGVudHMucHVzaChlcnJvcnMpXG4gICAgfVxuICAgIGlmIChleHRyYUNvbnRlbnQpIHtcbiAgICAgIGNvbnRlbnRzID0gY29udGVudHMuY29uY2F0KGV4dHJhQ29udGVudClcbiAgICB9XG4gICAgdmFyIHJvd0F0dHJzID0ge31cbiAgICBpZiAoaHRtbENsYXNzQXR0cikge1xuICAgICAgcm93QXR0cnMuY2xhc3NOYW1lPSBodG1sQ2xhc3NBdHRyXG4gICAgfVxuICAgIHJldHVybiBSZWFjdC5ET00ubGkocm93QXR0cnMsIGNvbnRlbnRzKVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9odG1sT3V0cHV0KG5vcm1hbFJvdywgZXJyb3JSb3csIGZhbHNlKVxuICB9XG59KSgpXG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGZvcm0gcmVuZGVyZWQgYXMgSFRNTCA8cD5zLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuYXNQID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgbm9ybWFsUm93ID0gZnVuY3Rpb24oa2V5LCBsYWJlbCwgZmllbGQsIGhlbHBUZXh0LCBlcnJvcnMsIGh0bWxDbGFzc0F0dHIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYUNvbnRlbnQpIHtcbiAgICB2YXIgY29udGVudHMgPSBbXVxuICAgIGlmIChsYWJlbCkge1xuICAgICAgY29udGVudHMucHVzaChsYWJlbClcbiAgICB9XG4gICAgY29udGVudHMucHVzaCgnICcpXG4gICAgY29udGVudHMucHVzaChmaWVsZClcbiAgICBpZiAoaGVscFRleHQpIHtcbiAgICAgIGNvbnRlbnRzLnB1c2goJyAnKVxuICAgICAgY29udGVudHMucHVzaChoZWxwVGV4dClcbiAgICB9XG4gICAgaWYgKGV4dHJhQ29udGVudCkge1xuICAgICAgY29udGVudHMgPSBjb250ZW50cy5jb25jYXQoZXh0cmFDb250ZW50KVxuICAgIH1cblxuICAgIHZhciByb3dBdHRycyA9IHtrZXk6IGtleX1cbiAgICBpZiAoaHRtbENsYXNzQXR0cikge1xuICAgICAgcm93QXR0cnMuY2xhc3NOYW1lPSBodG1sQ2xhc3NBdHRyXG4gICAgfVxuICAgIHJldHVybiBSZWFjdC5ET00ucChyb3dBdHRycywgY29udGVudHMpXG4gIH1cblxuICB2YXIgZXJyb3JSb3cgPSBmdW5jdGlvbihlcnJvcnMsIGV4dHJhQ29udGVudCwgaHRtbENsYXNzQXR0cikge1xuICAgIGlmIChleHRyYUNvbnRlbnQpIHtcbiAgICAgIHZhciBjb250ZW50cyA9IFtdXG4gICAgICBpZiAoZXJyb3JzKSB7XG4gICAgICAgIGNvbnRlbnRzLnB1c2goZXJyb3JzKVxuICAgICAgfVxuICAgICAgY29udGVudHMgPSBjb250ZW50cy5jb25jYXQoZXh0cmFDb250ZW50KVxuICAgICAgdmFyIHJvd0F0dHJzID0ge31cbiAgICAgIGlmIChodG1sQ2xhc3NBdHRyKSB7XG4gICAgICAgIHJvd0F0dHJzWydjbGFzc05hbWUnXSA9IGh0bWxDbGFzc0F0dHJcbiAgICAgIH1cbiAgICAgIC8vIFdoZW4gcHJvdmlkZWQgZXh0cmFDb250ZW50IGlzIHVzdWFsbHkgaGlkZGVuIGZpZWxkcywgc28gd2UgbmVlZFxuICAgICAgLy8gdG8gZ2l2ZSBpdCBhIGJsb2NrIHNjb3BlIHdyYXBwZXIgaW4gdGhpcyBjYXNlIGZvciBIVE1MIHZhbGlkaXR5LlxuICAgICAgcmV0dXJuIFJlYWN0LkRPTS5kaXYocm93QXR0cnMsIGNvbnRlbnRzKVxuICAgIH1cbiAgICAvLyBPdGhlcndpc2UsIGp1c3QgZGlzcGxheSBlcnJvcnMgYXMgdGhleSBhcmVcbiAgICByZXR1cm4gZXJyb3JzXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2h0bWxPdXRwdXQobm9ybWFsUm93LCBlcnJvclJvdywgdHJ1ZSlcbiAgfVxufSkoKVxuXG4vKipcbiAqIFJldHVybnMgZXJyb3JzIHRoYXQgYXJlbid0IGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY3VsYXIgZmllbGQuXG4gKiBAcmV0dXJuIGVycm9ycyB0aGF0IGFyZW4ndCBhc3NvY2lhdGVkIHdpdGggYSBwYXJ0aWN1bGFyIGZpZWxkIC0gaS5lLiwgZXJyb3JzXG4gKiAgIGdlbmVyYXRlZCBieSBjbGVhbigpLiBXaWxsIGJlIGVtcHR5IGlmIHRoZXJlIGFyZSBub25lLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUubm9uRmllbGRFcnJvcnMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICh0aGlzLmVycm9ycyhOT05fRklFTERfRVJST1JTKSB8fCBuZXcgdGhpcy5lcnJvckNvbnN0cnVjdG9yKCkpXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcmF3IHZhbHVlIGZvciBhIHBhcnRpY3VsYXIgZmllbGQgbmFtZS4gVGhpcyBpcyBqdXN0IGEgY29udmVuaWVudFxuICogd3JhcHBlciBhcm91bmQgd2lkZ2V0LnZhbHVlRnJvbURhdGEuXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5fcmF3VmFsdWUgPSBmdW5jdGlvbihmaWVsZG5hbWUpIHtcbiAgdmFyIGZpZWxkID0gdGhpcy5maWVsZHNbZmllbGRuYW1lXVxuICAgICwgcHJlZml4ID0gdGhpcy5hZGRQcmVmaXgoZmllbGRuYW1lKVxuICByZXR1cm4gZmllbGQud2lkZ2V0LnZhbHVlRnJvbURhdGEodGhpcy5kYXRhLCB0aGlzLmZpbGVzLCBwcmVmaXgpXG59XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgY29udGVudCBvZiB0aGlzLl9lcnJvcnMuXG4gKlxuICogVGhlIGZpZWxkIGFyZ3VtZW50IGlzIHRoZSBuYW1lIG9mIHRoZSBmaWVsZCB0byB3aGljaCB0aGUgZXJyb3JzIHNob3VsZCBiZVxuICogYWRkZWQuIElmIGl0cyB2YWx1ZSBpcyBudWxsIHRoZSBlcnJvcnMgd2lsbCBiZSB0cmVhdGVkIGFzIE5PTl9GSUVMRF9FUlJPUlMuXG4gKlxuICogVGhlIGVycm9yIGFyZ3VtZW50IGNhbiBiZSBhIHNpbmdsZSBlcnJvciwgYSBsaXN0IG9mIGVycm9ycywgb3IgYW4gb2JqZWN0IHRoYXRcbiAqIG1hcHMgZmllbGQgbmFtZXMgdG8gbGlzdHMgb2YgZXJyb3JzLiBXaGF0IHdlIGRlZmluZSBhcyBhbiBcImVycm9yXCIgY2FuIGJlXG4gKiBlaXRoZXIgYSBzaW1wbGUgc3RyaW5nIG9yIGFuIGluc3RhbmNlIG9mIFZhbGlkYXRpb25FcnJvciB3aXRoIGl0cyBtZXNzYWdlXG4gKiBhdHRyaWJ1dGUgc2V0IGFuZCB3aGF0IHdlIGRlZmluZSBhcyBsaXN0IG9yIG9iamVjdCBjYW4gYmUgYW4gYWN0dWFsIGxpc3Qgb3JcbiAqIG9iamVjdCBvciBhbiBpbnN0YW5jZSBvZiBWYWxpZGF0aW9uRXJyb3Igd2l0aCBpdHMgZXJyb3JMaXN0IG9yIGVycm9yT2JqXG4gKiBwcm9wZXJ0eSBzZXQuXG4gKlxuICogSWYgZXJyb3IgaXMgYW4gb2JqZWN0LCB0aGUgZmllbGQgYXJndW1lbnQgKm11c3QqIGJlIG51bGwgYW5kIGVycm9ycyB3aWxsIGJlXG4gKiBhZGRlZCB0byB0aGUgZmllbGRzIHRoYXQgY29ycmVzcG9uZCB0byB0aGUgcHJvcGVydGllcyBvZiB0aGUgb2JqZWN0LlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuYWRkRXJyb3IgPSBmdW5jdGlvbihmaWVsZCwgZXJyb3IpIHtcbiAgaWYgKCEoZXJyb3IgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7XG4gICAgLy8gTm9ybWFsaXNlIHRvIFZhbGlkYXRpb25FcnJvciBhbmQgbGV0IGl0cyBjb25zdHJ1Y3RvciBkbyB0aGUgaGFyZCB3b3JrIG9mXG4gICAgLy8gbWFraW5nIHNlbnNlIG9mIHRoZSBpbnB1dC5cbiAgICBlcnJvciA9IFZhbGlkYXRpb25FcnJvcihlcnJvcilcbiAgfVxuXG4gIGlmIChvYmplY3QuaGFzT3duKGVycm9yLCAnZXJyb3JPYmonKSkge1xuICAgIGlmIChmaWVsZCAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIGFyZ3VtZW50ICdmaWVsZCcgbXVzdCBiZSBudWxsIHdoZW4gdGhlICdlcnJvcicgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICdhcmd1bWVudCBjb250YWlucyBlcnJvcnMgZm9yIG11bHRpcGxlIGZpZWxkcy4nKVxuICAgIH1cbiAgICBlcnJvciA9IGVycm9yLmVycm9yT2JqXG4gIH1cbiAgZWxzZSB7XG4gICAgdmFyIGVycm9yTGlzdCA9IGVycm9yLmVycm9yTGlzdFxuICAgIGVycm9yID0ge31cbiAgICBlcnJvcltmaWVsZCB8fCBOT05fRklFTERfRVJST1JTXSA9IGVycm9yTGlzdFxuICB9XG5cbiAgdmFyIGZpZWxkcyA9IE9iamVjdC5rZXlzKGVycm9yKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGZpZWxkcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBmaWVsZCA9IGZpZWxkc1tpXVxuICAgIGVycm9yTGlzdCA9IGVycm9yW2ZpZWxkXVxuICAgIGlmICghdGhpcy5fZXJyb3JzLmhhc0ZpZWxkKGZpZWxkKSkge1xuICAgICAgaWYgKGZpZWxkICE9PSBOT05fRklFTERfRVJST1JTICYmICFvYmplY3QuaGFzT3duKHRoaXMuZmllbGRzLCBmaWVsZCkpIHtcbiAgICAgICAgdmFyIGZvcm1OYW1lID0gKHRoaXMuY29uc3RydWN0b3IubmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBcIidcIiArIHRoaXMuY29uc3RydWN0b3IubmFtZSArIFwiJ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICA6ICdGb3JtJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGZvcm1OYW1lICsgXCIgaGFzIG5vIGZpZWxkIG5hbWVkICdcIiArIGZpZWxkICsgXCInXCIpXG4gICAgICB9XG4gICAgICB0aGlzLl9lcnJvcnMuc2V0KGZpZWxkLCBuZXcgdGhpcy5lcnJvckNvbnN0cnVjdG9yKCkpXG4gICAgfVxuICAgIHRoaXMuX2Vycm9ycy5nZXQoZmllbGQpLmV4dGVuZChlcnJvckxpc3QpXG4gICAgaWYgKG9iamVjdC5oYXNPd24odGhpcy5jbGVhbmVkRGF0YSwgZmllbGQpKSB7XG4gICAgICBkZWxldGUgdGhpcy5jbGVhbmVkRGF0YVtmaWVsZF1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDbGVhbnMgYWxsIG9mIGRhdGEgYW5kIHBvcHVsYXRlcyBfZXJyb3JzIGFuZCBjbGVhbmVkRGF0YS5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmZ1bGxDbGVhbiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9lcnJvcnMgPSBFcnJvck9iamVjdCgpXG4gIGlmICghdGhpcy5pc0JvdW5kKSB7XG4gICAgcmV0dXJuOyAvLyBTdG9wIGZ1cnRoZXIgcHJvY2Vzc2luZ1xuICB9XG5cbiAgdGhpcy5jbGVhbmVkRGF0YSA9IHt9XG5cbiAgLy8gSWYgdGhlIGZvcm0gaXMgcGVybWl0dGVkIHRvIGJlIGVtcHR5LCBhbmQgbm9uZSBvZiB0aGUgZm9ybSBkYXRhIGhhc1xuICAvLyBjaGFuZ2VkIGZyb20gdGhlIGluaXRpYWwgZGF0YSwgc2hvcnQgY2lyY3VpdCBhbnkgdmFsaWRhdGlvbi5cbiAgaWYgKHRoaXMuZW1wdHlQZXJtaXR0ZWQgJiYgIXRoaXMuaGFzQ2hhbmdlZCgpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB0aGlzLl9jbGVhbkZpZWxkcygpXG4gIHRoaXMuX2NsZWFuRm9ybSgpXG4gIHRoaXMuX3Bvc3RDbGVhbigpXG59XG5cbkJhc2VGb3JtLnByb3RvdHlwZS5fY2xlYW5GaWVsZHMgPSBmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLmZpZWxkcykge1xuICAgIGlmICghb2JqZWN0Lmhhc093bih0aGlzLmZpZWxkcywgbmFtZSkpIHsgY29udGludWUgfVxuXG4gICAgdmFyIGZpZWxkID0gdGhpcy5maWVsZHNbbmFtZV1cbiAgICAvLyB2YWx1ZUZyb21EYXRhKCkgZ2V0cyB0aGUgZGF0YSBmcm9tIHRoZSBkYXRhIG9iamVjdHMuXG4gICAgLy8gRWFjaCB3aWRnZXQgdHlwZSBrbm93cyBob3cgdG8gcmV0cmlldmUgaXRzIG93biBkYXRhLCBiZWNhdXNlIHNvbWUgd2lkZ2V0c1xuICAgIC8vIHNwbGl0IGRhdGEgb3ZlciBzZXZlcmFsIEhUTUwgZmllbGRzLlxuICAgIHZhciB2YWx1ZSA9IGZpZWxkLndpZGdldC52YWx1ZUZyb21EYXRhKHRoaXMuZGF0YSwgdGhpcy5maWxlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZFByZWZpeChuYW1lKSlcbiAgICB0cnkge1xuICAgICAgaWYgKGZpZWxkIGluc3RhbmNlb2YgRmlsZUZpZWxkKSB7XG4gICAgICAgIHZhciBpbml0aWFsID0gb2JqZWN0LmdldCh0aGlzLmluaXRpYWwsIG5hbWUsIGZpZWxkLmluaXRpYWwpXG4gICAgICAgIHZhbHVlID0gZmllbGQuY2xlYW4odmFsdWUsIGluaXRpYWwpXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBmaWVsZC5jbGVhbih2YWx1ZSlcbiAgICAgIH1cbiAgICAgIHRoaXMuY2xlYW5lZERhdGFbbmFtZV0gPSB2YWx1ZVxuXG4gICAgICAvLyBUcnkgY2xlYW5fbmFtZVxuICAgICAgdmFyIGN1c3RvbUNsZWFuID0gJ2NsZWFuXycgKyBuYW1lXG4gICAgICBpZiAodHlwZW9mIHRoaXNbY3VzdG9tQ2xlYW5dICE9ICd1bmRlZmluZWQnICYmXG4gICAgICAgICAgaXMuRnVuY3Rpb24odGhpc1tjdXN0b21DbGVhbl0pKSB7XG4gICAgICAgICB2YWx1ZSA9IHRoaXNbY3VzdG9tQ2xlYW5dKClcbiAgICAgICAgIHRoaXMuY2xlYW5lZERhdGFbbmFtZV0gPSB2YWx1ZVxuICAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gVHJ5IGNsZWFuTmFtZVxuICAgICAgY3VzdG9tQ2xlYW4gPSAnY2xlYW4nICsgbmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5hbWUuc3Vic3RyKDEpXG4gICAgICBpZiAodHlwZW9mIHRoaXNbY3VzdG9tQ2xlYW5dICE9ICd1bmRlZmluZWQnICYmXG4gICAgICAgICAgaXMuRnVuY3Rpb24odGhpc1tjdXN0b21DbGVhbl0pKSB7XG4gICAgICAgIHZhbHVlID0gdGhpc1tjdXN0b21DbGVhbl0oKVxuICAgICAgICB0aGlzLmNsZWFuZWREYXRhW25hbWVdID0gdmFsdWVcbiAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7XG4gICAgICAgIHRocm93IGVcbiAgICAgIH1cbiAgICAgIHRoaXMuYWRkRXJyb3IobmFtZSwgZSlcbiAgICB9XG4gIH1cbn1cblxuQmFzZUZvcm0ucHJvdG90eXBlLl9jbGVhbkZvcm0gPSBmdW5jdGlvbigpIHtcbiAgdmFyIGNsZWFuZWREYXRhXG4gIHRyeSB7XG4gICAgY2xlYW5lZERhdGEgPSB0aGlzLmNsZWFuKClcbiAgfVxuICBjYXRjaCAoZSkge1xuICAgIGlmICghKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7XG4gICAgICB0aHJvdyBlXG4gICAgfVxuICAgIHRoaXMuYWRkRXJyb3IobnVsbCwgZSlcbiAgfVxuICBpZiAoY2xlYW5lZERhdGEpIHtcbiAgICB0aGlzLmNsZWFuZWREYXRhID0gY2xlYW5lZERhdGFcbiAgfVxufVxuXG4vKipcbiAqIEFuIGludGVybmFsIGhvb2sgZm9yIHBlcmZvcm1pbmcgYWRkaXRpb25hbCBjbGVhbmluZyBhZnRlciBmb3JtIGNsZWFuaW5nIGlzXG4gKiBjb21wbGV0ZS5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLl9wb3N0Q2xlYW4gPSBmdW5jdGlvbigpIHt9XG5cbi8qKlxuICogSG9vayBmb3IgZG9pbmcgYW55IGV4dHJhIGZvcm0td2lkZSBjbGVhbmluZyBhZnRlciBlYWNoIEZpZWxkJ3MgY2xlYW4oKSBoYXNcbiAqIGJlZW4gY2FsbGVkLiBBbnkgVmFsaWRhdGlvbkVycm9yIHJhaXNlZCBieSB0aGlzIG1ldGhvZCB3aWxsIG5vdCBiZSBhc3NvY2lhdGVkXG4gKiB3aXRoIGEgcGFydGljdWxhciBmaWVsZDsgaXQgd2lsbCBoYXZlIGEgc3BlY2lhbC1jYXNlIGFzc29jaWF0aW9uIHdpdGggdGhlXG4gKiBmaWVsZCBuYW1lZCAnX19hbGxfXycuXG4gKiBAcmV0dXJuIHZhbGlkYXRlZCwgY2xlYW5lZCBkYXRhLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuY2xlYW5lZERhdGFcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIGRhdGEgZGlmZmVycyBmcm9tIGluaXRpYWwuXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5oYXNDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAodGhpcy5jaGFuZ2VkRGF0YSgpLmxlbmd0aCA+IDApXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiB0aGUgZm9ybSBuZWVkcyB0byBiZSBtdWx0aXBhcnQtZW5jb2RlZCBpbiBvdGhlciB3b3JkcywgaWYgaXRcbiAqIGhhcyBhIEZpbGVJbnB1dC5cbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgZm9ybSBuZWVkcyB0byBiZSBtdWx0aXBhcnQtZW5jb2RlZC5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmlzTXVsdGlwYXJ0ID0gZnVuY3Rpb24oKSB7XG4gIGZvciAodmFyIG5hbWUgaW4gdGhpcy5maWVsZHMpIHtcbiAgICBpZiAob2JqZWN0Lmhhc093bih0aGlzLmZpZWxkcywgbmFtZSkgJiZcbiAgICAgICAgdGhpcy5maWVsZHNbbmFtZV0ud2lkZ2V0Lm5lZWRzTXVsdGlwYXJ0Rm9ybSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogUmV0dXJucyBhIGxpc3Qgb2YgYWxsIHRoZSBCb3VuZEZpZWxkIG9iamVjdHMgdGhhdCBjb3JyZXNwb25kIHRvIGhpZGRlblxuICogZmllbGRzLiBVc2VmdWwgZm9yIG1hbnVhbCBmb3JtIGxheW91dC5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmhpZGRlbkZpZWxkcyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5ib3VuZEZpZWxkcyhmdW5jdGlvbihmaWVsZCkge1xuICAgIHJldHVybiBmaWVsZC53aWRnZXQuaXNIaWRkZW5cbiAgfSlcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbGlzdCBvZiBCb3VuZEZpZWxkIG9iamVjdHMgdGhhdCBkbyBub3QgY29ycmVzcG9uZCB0byBoaWRkZW4gZmllbGRzLlxuICogVGhlIG9wcG9zaXRlIG9mIHRoZSBoaWRkZW5GaWVsZHMoKSBtZXRob2QuXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS52aXNpYmxlRmllbGRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmJvdW5kRmllbGRzKGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgcmV0dXJuICFmaWVsZC53aWRnZXQuaXNIaWRkZW5cbiAgfSlcbn1cblxuZnVuY3Rpb24gRGVjbGFyYXRpdmVGaWVsZHNNZXRhKHByb3RvdHlwZVByb3BzLCBjb25zdHJ1Y3RvclByb3BzKSB7XG4gIC8vIFBvcCBmaWVsZHMgZnJvbSBwcm90b3R5cGVQcm9wcyB0byBjb250cmlidXRlIHRvd2FyZHMgYmFzZUZpZWxkc1xuICB2YXIgZmllbGRzID0gW11cbiAgZm9yICh2YXIgbmFtZSBpbiBwcm90b3R5cGVQcm9wcykge1xuICAgIGlmIChvYmplY3QuaGFzT3duKHByb3RvdHlwZVByb3BzLCBuYW1lKSAmJlxuICAgICAgICBwcm90b3R5cGVQcm9wc1tuYW1lXSBpbnN0YW5jZW9mIEZpZWxkKSB7XG4gICAgICBmaWVsZHMucHVzaChbbmFtZSwgcHJvdG90eXBlUHJvcHNbbmFtZV1dKVxuICAgICAgZGVsZXRlIHByb3RvdHlwZVByb3BzW25hbWVdXG4gICAgfVxuICB9XG4gIGZpZWxkcy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYVsxXS5jcmVhdGlvbkNvdW50ZXIgLSBiWzFdLmNyZWF0aW9uQ291bnRlclxuICB9KVxuXG4gIC8vIElmIGFueSBtaXhpbnMgd2hpY2ggbG9vayBsaWtlIGZvcm0gY29uc3RydWN0b3JzIHdlcmUgZ2l2ZW4sIGluaGVyaXQgdGhlaXJcbiAgLy8gZmllbGRzLlxuICBpZiAob2JqZWN0Lmhhc093bihwcm90b3R5cGVQcm9wcywgJ19fbWl4aW5fXycpKSB7XG4gICAgdmFyIG1peGlucyA9IHByb3RvdHlwZVByb3BzLl9fbWl4aW5fX1xuICAgIGlmICghaXMuQXJyYXkobWl4aW5zKSkge1xuICAgICAgbWl4aW5zID0gW21peGluc11cbiAgICB9XG4gICAgLy8gTm90ZSB0aGF0IHdlIGxvb3Agb3ZlciBtaXhlZCBpbiBmb3JtcyBpbiAqcmV2ZXJzZSogdG8gcHJlc2VydmUgdGhlXG4gICAgLy8gY29ycmVjdCBvcmRlciBvZiBmaWVsZHMuXG4gICAgZm9yICh2YXIgaSA9IG1peGlucy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIG1peGluID0gbWl4aW5zW2ldXG4gICAgICBpZiAoaXMuRnVuY3Rpb24obWl4aW4pICYmXG4gICAgICAgICAgdHlwZW9mIG1peGluLnByb3RvdHlwZS5iYXNlRmllbGRzICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGZpZWxkcyA9IG9iamVjdC5pdGVtcyhtaXhpbi5wcm90b3R5cGUuYmFzZUZpZWxkcykuY29uY2F0KGZpZWxkcylcbiAgICAgICAgLy8gUmVwbGFjZSB0aGUgbWl4aW4gd2l0aCBhbiBvYmplY3QgY29udGFpbmluZyB0aGUgb3RoZXIgcHJvdG90eXBlXG4gICAgICAgIC8vIHByb3BlcnRpZXMsIHRvIGF2b2lkIG92ZXJ3cml0aW5nIGJhc2VGaWVsZHMgd2hlbiB0aGUgbWl4aW4gaXNcbiAgICAgICAgLy8gYXBwbGllZC5cbiAgICAgICAgdmFyIGZvcm1NaXhpbiA9IG9iamVjdC5leHRlbmQoe30sIG1peGluLnByb3RvdHlwZSlcbiAgICAgICAgZGVsZXRlIGZvcm1NaXhpbi5iYXNlRmllbGRzXG4gICAgICAgIG1peGluc1tpXSA9IGZvcm1NaXhpblxuICAgICAgfVxuICAgIH1cbiAgICBwcm90b3R5cGVQcm9wcy5fX21peGluX18gPSBtaXhpbnNcbiAgfVxuXG4gIC8vIElmIHdlJ3JlIGV4dGVuZGluZyBmcm9tIGEgZm9ybSB3aGljaCBhbHJlYWR5IGhhcyBzb21lIGJhc2VGaWVsZHMsIHRoZXlcbiAgLy8gc2hvdWxkIGJlIGZpcnN0LlxuICBpZiAodHlwZW9mIHRoaXMuYmFzZUZpZWxkcyAhPSAndW5kZWZpbmVkJykge1xuICAgIGZpZWxkcyA9IG9iamVjdC5pdGVtcyh0aGlzLmJhc2VGaWVsZHMpLmNvbmNhdChmaWVsZHMpXG4gIH1cblxuICAvLyBXaGVyZSAtPiBpcyBcIm92ZXJyaWRkZW4gYnlcIjpcbiAgLy8gcGFyZW50IGZpZWxkcyAtPiBtaXhpbiBmb3JtIGZpZWxkcyAtPiBnaXZlbiBmaWVsZHNcbiAgcHJvdG90eXBlUHJvcHMuYmFzZUZpZWxkcyA9IG9iamVjdC5mcm9tSXRlbXMoZmllbGRzKVxufVxuXG52YXIgRm9ybSA9IEJhc2VGb3JtLmV4dGVuZCh7XG4gIF9fbWV0YV9fOiBEZWNsYXJhdGl2ZUZpZWxkc01ldGFcbiwgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEZvcm0oKSB7XG4gICAgQmFzZUZvcm0uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICB9XG59KVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgTk9OX0ZJRUxEX0VSUk9SUzogTk9OX0ZJRUxEX0VSUk9SU1xuLCBCb3VuZEZpZWxkOiBCb3VuZEZpZWxkXG4sIEJhc2VGb3JtOiBCYXNlRm9ybVxuLCBEZWNsYXJhdGl2ZUZpZWxkc01ldGE6IERlY2xhcmF0aXZlRmllbGRzTWV0YVxuLCBGb3JtOiBGb3JtXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb25jdXIgPSByZXF1aXJlKCdDb25jdXInKVxuICAsIG9iamVjdCA9IHJlcXVpcmUoJ2lzb21vcnBoL29iamVjdCcpXG4gICwgdmFsaWRhdG9ycyA9IHJlcXVpcmUoJ3ZhbGlkYXRvcnMnKVxuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpXG4gICwgd2lkZ2V0cyA9IHJlcXVpcmUoJy4vd2lkZ2V0cycpXG4gICwgZmllbGRzID0gcmVxdWlyZSgnLi9maWVsZHMnKVxuICAsIGZvcm1zID0gcmVxdWlyZSgnLi9mb3JtcycpXG5cbnZhciBFcnJvckxpc3QgPSB1dGlsLkVycm9yTGlzdFxuICAsIFZhbGlkYXRpb25FcnJvciA9IHZhbGlkYXRvcnMuVmFsaWRhdGlvbkVycm9yXG4gICwgSW50ZWdlckZpZWxkID0gZmllbGRzLkludGVnZXJGaWVsZFxuICAsIEJvb2xlYW5GaWVsZCA9IGZpZWxkcy5Cb29sZWFuRmllbGRcbiAgLCBIaWRkZW5JbnB1dCA9IHdpZGdldHMuSGlkZGVuSW5wdXRcblxuLy8gU3BlY2lhbCBmaWVsZCBuYW1lc1xudmFyIFRPVEFMX0ZPUk1fQ09VTlQgPSAnVE9UQUxfRk9STVMnXG4gICwgSU5JVElBTF9GT1JNX0NPVU5UID0gJ0lOSVRJQUxfRk9STVMnXG4gICwgTUlOX05VTV9GT1JNX0NPVU5UID0gJ01JTl9OVU1fRk9STVMnXG4gICwgTUFYX05VTV9GT1JNX0NPVU5UID0gJ01BWF9OVU1fRk9STVMnXG4gICwgT1JERVJJTkdfRklFTERfTkFNRSA9ICdPUkRFUidcbiAgLCBERUxFVElPTl9GSUVMRF9OQU1FID0gJ0RFTEVURSdcblxuLy8gRGVmYXVsdCBtaW5pbXVtIG51bWJlciBvZiBmb3JtcyBpbiBhIGZvcm1zZXRcbnZhciBERUZBVUxUX01JTl9OVU0gPSAwXG5cbi8vIERlZmF1bHQgbWF4aW11bSBudW1iZXIgb2YgZm9ybXMgaW4gYSBmb3Jtc2V0LCB0byBwcmV2ZW50IG1lbW9yeSBleGhhdXN0aW9uXG52YXIgREVGQVVMVF9NQVhfTlVNID0gMTAwMFxuXG4vKipcbiAqIE1hbmFnZW1lbnRGb3JtIGlzIHVzZWQgdG8ga2VlcCB0cmFjayBvZiBob3cgbWFueSBmb3JtIGluc3RhbmNlcyBhcmUgZGlzcGxheWVkXG4gKiBvbiB0aGUgcGFnZS4gSWYgYWRkaW5nIG5ldyBmb3JtcyB2aWEgSmF2YVNjcmlwdCwgeW91IHNob3VsZCBpbmNyZW1lbnQgdGhlXG4gKiBjb3VudCBmaWVsZCBvZiB0aGlzIGZvcm0gYXMgd2VsbC5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgTWFuYWdlbWVudEZvcm0gPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBmaWVsZHMgPSB7fVxuICBmaWVsZHNbVE9UQUxfRk9STV9DT1VOVF0gPSBJbnRlZ2VyRmllbGQoe3dpZGdldDogSGlkZGVuSW5wdXR9KVxuICBmaWVsZHNbSU5JVElBTF9GT1JNX0NPVU5UXSA9IEludGVnZXJGaWVsZCh7d2lkZ2V0OiBIaWRkZW5JbnB1dH0pXG4gIC8vIE1JTl9OVU1fRk9STV9DT1VOVCBhbmQgTUFYX05VTV9GT1JNX0NPVU5UIGFyZSBvdXRwdXQgd2l0aCB0aGUgcmVzdCBvZlxuICAvLyB0aGUgbWFuYWdlbWVudCBmb3JtLCBidXQgb25seSBmb3IgdGhlIGNvbnZlbmllbmNlIG9mIGNsaWVudC1zaWRlXG4gIC8vIGNvZGUuIFRoZSBQT1NUIHZhbHVlIG9mIHRoZW0gcmV0dXJuZWQgZnJvbSB0aGUgY2xpZW50IGlzIG5vdCBjaGVja2VkLlxuICBmaWVsZHNbTUlOX05VTV9GT1JNX0NPVU5UXSA9IEludGVnZXJGaWVsZCh7cmVxdWlyZWQ6IGZhbHNlLCB3aWRnZXQ6IEhpZGRlbklucHV0fSlcbiAgZmllbGRzW01BWF9OVU1fRk9STV9DT1VOVF0gPSBJbnRlZ2VyRmllbGQoe3JlcXVpcmVkOiBmYWxzZSwgd2lkZ2V0OiBIaWRkZW5JbnB1dH0pXG4gIHJldHVybiBmb3Jtcy5Gb3JtLmV4dGVuZChmaWVsZHMpXG59KSgpXG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIGluc3RhbmNlcyBvZiB0aGUgc2FtZSBGb3JtLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgQmFzZUZvcm1TZXQgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEJhc2VGb3JtU2V0KGt3YXJncykge1xuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgICAgZGF0YTogbnVsbCwgZmlsZXM6IG51bGwsIGF1dG9JZDogJ2lkX3tuYW1lfScsIHByZWZpeDogbnVsbCxcbiAgICAgIGluaXRpYWw6IG51bGwsIGVycm9yQ29uc3RydWN0b3I6IEVycm9yTGlzdCwgbWFuYWdlbWVudEZvcm1Dc3NDbGFzczogbnVsbFxuICAgIH0sIGt3YXJncylcbiAgICB0aGlzLmlzQm91bmQgPSBrd2FyZ3MuZGF0YSAhPT0gbnVsbCB8fCBrd2FyZ3MuZmlsZXMgIT09IG51bGxcbiAgICB0aGlzLnByZWZpeCA9IGt3YXJncy5wcmVmaXggfHwgdGhpcy5nZXREZWZhdWx0UHJlZml4KClcbiAgICB0aGlzLmF1dG9JZCA9IGt3YXJncy5hdXRvSWRcbiAgICB0aGlzLmRhdGEgPSBrd2FyZ3MuZGF0YSB8fCB7fVxuICAgIHRoaXMuZmlsZXMgPSBrd2FyZ3MuZmlsZXMgfHwge31cbiAgICB0aGlzLmluaXRpYWwgPSBrd2FyZ3MuaW5pdGlhbFxuICAgIHRoaXMuZXJyb3JDb25zdHJ1Y3RvciA9IGt3YXJncy5lcnJvckNvbnN0cnVjdG9yXG4gICAgdGhpcy5tYW5hZ2VtZW50Rm9ybUNzc0NsYXNzID0ga3dhcmdzLm1hbmFnZW1lbnRGb3JtQ3NzQ2xhc3NcbiAgICB0aGlzLl9mb3JtcyA9IG51bGxcbiAgICB0aGlzLl9lcnJvcnMgPSBudWxsXG4gICAgdGhpcy5fbm9uRm9ybUVycm9ycyA9IG51bGxcbiAgfVxufSlcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBNYW5hZ2VtZW50Rm9ybSBpbnN0YW5jZSBmb3IgdGhpcyBGb3JtU2V0LlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUubWFuYWdlbWVudEZvcm0gPSBmdW5jdGlvbigpIHtcbiAgdmFyIGZvcm1cbiAgaWYgKHRoaXMuaXNCb3VuZCkge1xuICAgIGZvcm0gPSBuZXcgTWFuYWdlbWVudEZvcm0oe2RhdGE6IHRoaXMuZGF0YSwgYXV0b0lkOiB0aGlzLmF1dG9JZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVmaXg6IHRoaXMucHJlZml4fSlcbiAgICBpZiAoIWZvcm0uaXNWYWxpZCgpKSB7XG4gICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IoJ01hbmFnZW1lbnRGb3JtIGRhdGEgaXMgbWlzc2luZyBvciBoYXMgYmVlbiB0YW1wZXJlZCB3aXRoJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Y29kZTogJ21pc3NpbmdfbWFuYWdlbWVudF9mb3JtJ30pXG4gICAgfVxuICB9XG4gIGVsc2Uge1xuICAgIHZhciBpbml0aWFsID0ge31cbiAgICBpbml0aWFsW1RPVEFMX0ZPUk1fQ09VTlRdID0gdGhpcy50b3RhbEZvcm1Db3VudCgpXG4gICAgaW5pdGlhbFtJTklUSUFMX0ZPUk1fQ09VTlRdID0gdGhpcy5pbml0aWFsRm9ybUNvdW50KClcbiAgICBpbml0aWFsW01JTl9OVU1fRk9STV9DT1VOVF0gPSB0aGlzLm1pbk51bVxuICAgIGluaXRpYWxbTUFYX05VTV9GT1JNX0NPVU5UXSA9IHRoaXMubWF4TnVtXG4gICAgZm9ybSA9IG5ldyBNYW5hZ2VtZW50Rm9ybSh7YXV0b0lkOiB0aGlzLmF1dG9JZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVmaXg6IHRoaXMucHJlZml4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWw6IGluaXRpYWx9KVxuICB9XG4gIGlmICh0aGlzLm1hbmFnZW1lbnRGb3JtQ3NzQ2xhc3MgIT09IG51bGwpIHtcbiAgICBmb3JtLmhpZGRlbkZpZWxkUm93Q3NzQ2xhc3MgPSB0aGlzLm1hbmFnZW1lbnRGb3JtQ3NzQ2xhc3NcbiAgfVxuICByZXR1cm4gZm9ybVxufVxuXG4vKipcbiAqIERldGVybWluZXMgdGhlIG51bWJlciBvZiBmb3JtIGluc3RhbmNlcyB0aGlzIGZvcm1zZXQgY29udGFpbnMsIGJhc2VkIG9uXG4gKiBlaXRoZXIgc3VibWl0dGVkIG1hbmFnZW1lbnQgZGF0YSBvciBpbml0aWFsIGNvbmZpZ3VyYXRpb24sIGFzIGFwcHJvcHJpYXRlLlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUudG90YWxGb3JtQ291bnQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuaXNCb3VuZCkge1xuICAgIC8vIFJldHVybiBhYnNvbHV0ZU1heCBpZiBpdCBpcyBsb3dlciB0aGFuIHRoZSBhY3R1YWwgdG90YWwgZm9ybSBjb3VudCBpblxuICAgIC8vIHRoZSBkYXRhOyB0aGlzIGlzIERvUyBwcm90ZWN0aW9uIHRvIHByZXZlbnQgY2xpZW50cyAgZnJvbSBmb3JjaW5nIHRoZVxuICAgIC8vIHNlcnZlciB0byBpbnN0YW50aWF0ZSBhcmJpdHJhcnkgbnVtYmVycyBvZiBmb3Jtcy5cbiAgICByZXR1cm4gTWF0aC5taW4odGhpcy5tYW5hZ2VtZW50Rm9ybSgpLmNsZWFuZWREYXRhW1RPVEFMX0ZPUk1fQ09VTlRdLCB0aGlzLmFic29sdXRlTWF4KVxuICB9XG4gIGVsc2Uge1xuICAgIHZhciBpbml0aWFsRm9ybXMgPSB0aGlzLmluaXRpYWxGb3JtQ291bnQoKVxuICAgIHZhciB0b3RhbEZvcm1zID0gdGhpcy5pbml0aWFsRm9ybUNvdW50KCkgKyB0aGlzLmV4dHJhXG4gICAgLy8gQWxsb3cgYWxsIGV4aXN0aW5nIHJlbGF0ZWQgb2JqZWN0cy9pbmxpbmVzIHRvIGJlIGRpc3BsYXllZCwgYnV0IGRvbid0XG4gICAgLy8gYWxsb3cgZXh0cmEgYmV5b25kIG1heF9udW0uXG4gICAgaWYgKHRoaXMubWF4TnVtICE9PSBudWxsICYmXG4gICAgICAgIGluaXRpYWxGb3JtcyA+IHRoaXMubWF4TnVtICYmXG4gICAgICAgIHRoaXMubWF4TnVtID49IDApIHtcbiAgICAgIHRvdGFsRm9ybXMgPSBpbml0aWFsRm9ybXNcbiAgICB9XG4gICAgaWYgKHRoaXMubWF4TnVtICE9PSBudWxsICYmXG4gICAgICAgIHRvdGFsRm9ybXMgPiB0aGlzLm1heE51bSAmJlxuICAgICAgICB0aGlzLm1heE51bSA+PSAwKSB7XG4gICAgICB0b3RhbEZvcm1zID0gdGhpcy5tYXhOdW1cbiAgICB9XG4gICAgcmV0dXJuIHRvdGFsRm9ybXNcbiAgfVxufVxuXG4vKipcbiAqIERldGVybWluZXMgdGhlIG51bWJlciBvZiBpbml0aWFsIGZvcm0gaW5zdGFuY2VzIHRoaXMgZm9ybXNldCBjb250YWlucywgYmFzZWRcbiAqIG9uIGVpdGhlciBzdWJtaXR0ZWQgbWFuYWdlbWVudCBkYXRhIG9yIGluaXRpYWwgY29uZmlndXJhdGlvbiwgYXMgYXBwcm9wcmlhdGUuXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5pbml0aWFsRm9ybUNvdW50ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmlzQm91bmQpIHtcbiAgICByZXR1cm4gdGhpcy5tYW5hZ2VtZW50Rm9ybSgpLmNsZWFuZWREYXRhW0lOSVRJQUxfRk9STV9DT1VOVF1cbiAgfVxuICBlbHNlIHtcbiAgICAvLyBVc2UgdGhlIGxlbmd0aCBvZiB0aGUgaW5pdGFsIGRhdGEgaWYgaXQncyB0aGVyZSwgMCBvdGhlcndpc2UuXG4gICAgdmFyIGluaXRpYWxGb3JtcyA9ICh0aGlzLmluaXRpYWwgIT09IG51bGwgJiYgdGhpcy5pbml0aWFsLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gdGhpcy5pbml0aWFsLmxlbmd0aFxuICAgICAgICAgICAgICAgICAgICAgICAgOiAwKVxuICAgIHJldHVybiBpbml0aWFsRm9ybXNcbiAgfVxufVxuXG4vKipcbiAqIEluc3RhbnRpYXRlcyBmb3JtcyB3aGVuIGZpcnN0IGFjY2Vzc2VkLlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuZm9ybXMgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX2Zvcm1zID09PSBudWxsKSB7XG4gICAgdGhpcy5fZm9ybXMgPSBbXVxuICAgIHZhciB0b3RhbEZvcm1Db3VudCA9IHRoaXMudG90YWxGb3JtQ291bnQoKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG90YWxGb3JtQ291bnQ7IGkrKykge1xuICAgICAgdGhpcy5fZm9ybXMucHVzaCh0aGlzLl9jb25zdHJ1Y3RGb3JtKGkpKVxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcy5fZm9ybXNcbn1cblxuLyoqXG4gKiBJbnN0YW50aWF0ZXMgYW5kIHJldHVybnMgdGhlIGl0aCBmb3JtIGluc3RhbmNlIGluIHRoZSBmb3Jtc2V0LlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuX2NvbnN0cnVjdEZvcm0gPSBmdW5jdGlvbihpKSB7XG4gIHZhciBkZWZhdWx0cyA9IHtcbiAgICBhdXRvSWQ6IHRoaXMuYXV0b0lkXG4gICwgcHJlZml4OiB0aGlzLmFkZFByZWZpeChpKVxuICAsIGVycm9yQ29uc3RydWN0b3I6IHRoaXMuZXJyb3JDb25zdHJ1Y3RvclxuICB9XG4gIGlmICh0aGlzLmlzQm91bmQpIHtcbiAgICBkZWZhdWx0cy5kYXRhID0gdGhpcy5kYXRhXG4gICAgZGVmYXVsdHMuZmlsZXMgPSB0aGlzLmZpbGVzXG4gIH1cbiAgaWYgKHRoaXMuaW5pdGlhbCAhPT0gbnVsbCAmJiB0aGlzLmluaXRpYWwubGVuZ3RoID4gMCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5pbml0aWFsW2ldICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICBkZWZhdWx0cy5pbml0aWFsID0gdGhpcy5pbml0aWFsW2ldXG4gICAgfVxuICB9XG4gIC8vIEFsbG93IGV4dHJhIGZvcm1zIHRvIGJlIGVtcHR5XG4gIGlmIChpID49IHRoaXMuaW5pdGlhbEZvcm1Db3VudCgpKSB7XG4gICAgZGVmYXVsdHMuZW1wdHlQZXJtaXR0ZWQgPSB0cnVlXG4gIH1cblxuICB2YXIgZm9ybSA9IG5ldyB0aGlzLmZvcm0oZGVmYXVsdHMpXG4gIHRoaXMuYWRkRmllbGRzKGZvcm0sIGkpXG4gIHJldHVybiBmb3JtXG59XG5cbi8qKlxuICogUmV0dXJucyBhIGxpc3Qgb2YgYWxsIHRoZSBpbml0aWFsIGZvcm1zIGluIHRoaXMgZm9ybXNldC5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmluaXRpYWxGb3JtcyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5mb3JtcygpLnNsaWNlKDAsIHRoaXMuaW5pdGlhbEZvcm1Db3VudCgpKVxufVxuXG4vKipcbiAqIFJldHVybnMgYSBsaXN0IG9mIGFsbCB0aGUgZXh0cmEgZm9ybXMgaW4gdGhpcyBmb3Jtc2V0LlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuZXh0cmFGb3JtcyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5mb3JtcygpLnNsaWNlKHRoaXMuaW5pdGlhbEZvcm1Db3VudCgpKVxufVxuXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuZW1wdHlGb3JtID0gZnVuY3Rpb24oKSB7XG4gIHZhciBrd2FyZ3MgPSB7XG4gICAgYXV0b0lkOiB0aGlzLmF1dG9JZCxcbiAgICBwcmVmaXg6IHRoaXMuYWRkUHJlZml4KCdfX3ByZWZpeF9fJyksXG4gICAgZW1wdHlQZXJtaXR0ZWQ6IHRydWVcbiAgfVxuICB2YXIgZm9ybSA9IG5ldyB0aGlzLmZvcm0oa3dhcmdzKVxuICB0aGlzLmFkZEZpZWxkcyhmb3JtLCBudWxsKVxuICByZXR1cm4gZm9ybVxufVxuXG4vKipcbiAqIFJldHVybnMgYSBsaXN0IG9mIGZvcm0uY2xlYW5lZERhdGEgb2JqZWN0cyBmb3IgZXZlcnkgZm9ybSBpbiB0aGlzLmZvcm1zKCkuXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5jbGVhbmVkRGF0YSA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXRoaXMuaXNWYWxpZCgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHRoaXMuY29uc3RydWN0b3IubmFtZSArXG4gICAgICAgICAgICAgICAgICAgIFwiIG9iamVjdCBoYXMgbm8gYXR0cmlidXRlICdjbGVhbmVkRGF0YSdcIilcbiAgfVxuICByZXR1cm4gdGhpcy5mb3JtcygpLm1hcChmdW5jdGlvbihmb3JtKSB7IHJldHVybiBmb3JtLmNsZWFuZWREYXRhIH0pXG59XG5cbi8qKlxuICogUmV0dXJucyBhIGxpc3Qgb2YgZm9ybXMgdGhhdCBoYXZlIGJlZW4gbWFya2VkIGZvciBkZWxldGlvbi5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmRlbGV0ZWRGb3JtcyA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXRoaXMuaXNWYWxpZCgpIHx8ICF0aGlzLmNhbkRlbGV0ZSkgeyByZXR1cm4gW10gfVxuXG4gIHZhciBmb3JtcyA9IHRoaXMuZm9ybXMoKVxuXG4gIC8vIENvbnN0cnVjdCBfZGVsZXRlZEZvcm1JbmRleGVzLCB3aGljaCBpcyBqdXN0IGEgbGlzdCBvZiBmb3JtIGluZGV4ZXNcbiAgLy8gdGhhdCBoYXZlIGhhZCB0aGVpciBkZWxldGlvbiB3aWRnZXQgc2V0IHRvIHRydWUuXG4gIGlmICh0eXBlb2YgdGhpcy5fZGVsZXRlZEZvcm1JbmRleGVzID09ICd1bmRlZmluZWQnKSB7XG4gICAgdGhpcy5fZGVsZXRlZEZvcm1JbmRleGVzID0gW11cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGZvcm1zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGZvcm0gPSBmb3Jtc1tpXVxuICAgICAgLy8gSWYgdGhpcyBpcyBhbiBleHRyYSBmb3JtIGFuZCBoYXNuJ3QgY2hhbmdlZCwgaWdub3JlIGl0XG4gICAgICBpZiAoaSA+PSB0aGlzLmluaXRpYWxGb3JtQ291bnQoKSAmJiAhZm9ybS5oYXNDaGFuZ2VkKCkpIHtcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl9zaG91bGREZWxldGVGb3JtKGZvcm0pKSB7XG4gICAgICAgIHRoaXMuX2RlbGV0ZWRGb3JtSW5kZXhlcy5wdXNoKGkpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXMuX2RlbGV0ZWRGb3JtSW5kZXhlcy5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gZm9ybXNbaV0gfSlcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbGlzdCBvZiBmb3JtcyBpbiB0aGUgb3JkZXIgc3BlY2lmaWVkIGJ5IHRoZSBpbmNvbWluZyBkYXRhLlxuICogVGhyb3dzIGFuIEVycm9yIGlmIG9yZGVyaW5nIGlzIG5vdCBhbGxvd2VkLlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUub3JkZXJlZEZvcm1zID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5pc1ZhbGlkKCkgfHwgIXRoaXMuY2FuT3JkZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5jb25zdHJ1Y3Rvci5uYW1lICtcbiAgICAgICAgICAgICAgICAgICAgXCIgb2JqZWN0IGhhcyBubyBhdHRyaWJ1dGUgJ29yZGVyZWRGb3JtcydcIilcbiAgfVxuXG4gIHZhciBmb3JtcyA9IHRoaXMuZm9ybXMoKVxuXG4gIC8vIENvbnN0cnVjdCBfb3JkZXJpbmcsIHdoaWNoIGlzIGEgbGlzdCBvZiBbZm9ybSBpbmRleCwgb3JkZXJGaWVsZFZhbHVlXVxuICAvLyBwYWlycy4gQWZ0ZXIgY29uc3RydWN0aW5nIHRoaXMgbGlzdCwgd2UnbGwgc29ydCBpdCBieSBvcmRlckZpZWxkVmFsdWVcbiAgLy8gc28gd2UgaGF2ZSBhIHdheSB0byBnZXQgdG8gdGhlIGZvcm0gaW5kZXhlcyBpbiB0aGUgb3JkZXIgc3BlY2lmaWVkIGJ5XG4gIC8vIHRoZSBmb3JtIGRhdGEuXG4gIGlmICh0eXBlb2YgdGhpcy5fb3JkZXJpbmcgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB0aGlzLl9vcmRlcmluZyA9IFtdXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBmb3Jtcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBmb3JtID0gZm9ybXNbaV1cbiAgICAgIC8vIElmIHRoaXMgaXMgYW4gZXh0cmEgZm9ybSBhbmQgaGFzbid0IGNoYW5nZWQsIGlnbm9yZSBpdFxuICAgICAgaWYgKGkgPj0gdGhpcy5pbml0aWFsRm9ybUNvdW50KCkgJiYgIWZvcm0uaGFzQ2hhbmdlZCgpKSB7XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICAvLyBEb24ndCBhZGQgZGF0YSBtYXJrZWQgZm9yIGRlbGV0aW9uXG4gICAgICBpZiAodGhpcy5jYW5EZWxldGUgJiYgdGhpcy5fc2hvdWxkRGVsZXRlRm9ybShmb3JtKSkge1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgdGhpcy5fb3JkZXJpbmcucHVzaChbaSwgZm9ybS5jbGVhbmVkRGF0YVtPUkRFUklOR19GSUVMRF9OQU1FXV0pXG4gICAgfVxuXG4gICAgLy8gTnVsbCBzaG91bGQgYmUgc29ydGVkIGJlbG93IGFueXRoaW5nIGVsc2UuIEFsbG93aW5nIG51bGwgYXMgYVxuICAgIC8vIGNvbXBhcmlzb24gdmFsdWUgbWFrZXMgaXQgc28gd2UgY2FuIGxlYXZlIG9yZGVyaW5nIGZpZWxkcyBibGFuay5cbiAgICB0aGlzLl9vcmRlcmluZy5zb3J0KGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgIGlmICh4WzFdID09PSBudWxsICYmIHlbMV0gPT09IG51bGwpIHtcbiAgICAgICAgLy8gU29ydCBieSBmb3JtIGluZGV4IGlmIGJvdGggb3JkZXIgZmllbGQgdmFsdWVzIGFyZSBudWxsXG4gICAgICAgIHJldHVybiB4WzBdIC0geVswXVxuICAgICAgfVxuICAgICAgaWYgKHhbMV0gPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIDFcbiAgICAgIH1cbiAgICAgIGlmICh5WzFdID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiAtMVxuICAgICAgfVxuICAgICAgcmV0dXJuIHhbMV0gLSB5WzFdXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiB0aGlzLl9vcmRlcmluZy5tYXAoZnVuY3Rpb24ob3JkZXJpbmcpIHsgcmV0dXJuIGZvcm1zW29yZGVyaW5nWzBdXX0pXG59XG5cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5nZXREZWZhdWx0UHJlZml4ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnZm9ybSdcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIEVycm9yTGlzdCBvZiBlcnJvcnMgdGhhdCBhcmVuJ3QgYXNzb2NpYXRlZCB3aXRoIGEgcGFydGljdWxhclxuICogZm9ybSAtLSBpLmUuLCBmcm9tIGZvcm1zZXQuY2xlYW4oKS4gUmV0dXJucyBhbiBlbXB0eSBFcnJvckxpc3QgaWYgdGhlcmUgYXJlXG4gKiBub25lLlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUubm9uRm9ybUVycm9ycyA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fbm9uRm9ybUVycm9ycyA9PT0gbnVsbCkge1xuICAgIHRoaXMuZnVsbENsZWFuKClcbiAgfVxuICByZXR1cm4gdGhpcy5fbm9uRm9ybUVycm9yc1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBsaXN0IG9mIGZvcm0uZXJyb3JzIGZvciBldmVyeSBmb3JtIGluIHRoaXMuZm9ybXMuXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5lcnJvcnMgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX2Vycm9ycyA9PT0gbnVsbCkge1xuICAgIHRoaXMuZnVsbENsZWFuKClcbiAgfVxuICByZXR1cm4gdGhpcy5fZXJyb3JzXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgbnVtYmVyIG9mIGVycm9ycyBhY3Jvc3MgYWxsIGZvcm1zIGluIHRoZSBmb3Jtc2V0LlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUudG90YWxFcnJvckNvdW50ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAodGhpcy5ub25Gb3JtRXJyb3JzKCkubGVuZ3RoKCkgK1xuICAgICAgICAgIHRoaXMuZXJyb3JzKCkucmVkdWNlKGZ1bmN0aW9uKHN1bSwgZm9ybUVycm9ycykge1xuICAgICAgICAgICAgcmV0dXJuIHN1bSArIGZvcm1FcnJvcnMubGVuZ3RoKClcbiAgICAgICAgICB9LCAwKSlcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBmb3JtIHdhcyBtYXJrZWQgZm9yIGRlbGV0aW9uLlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuX3Nob3VsZERlbGV0ZUZvcm0gPSBmdW5jdGlvbihmb3JtKSB7XG4gIHJldHVybiBvYmplY3QuZ2V0KGZvcm0uY2xlYW5lZERhdGEsIERFTEVUSU9OX0ZJRUxEX05BTUUsIGZhbHNlKVxufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBldmVyeSBmb3JtIGluIHRoaXMuZm9ybXMoKSBpcyB2YWxpZC5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmlzVmFsaWQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLmlzQm91bmQpIHsgcmV0dXJuIGZhbHNlIH1cblxuICAvLyBXZSBsb29wIG92ZXIgZXZlcnkgZm9ybS5lcnJvcnMgaGVyZSByYXRoZXIgdGhhbiBzaG9ydCBjaXJjdWl0aW5nIG9uIHRoZVxuICAvLyBmaXJzdCBmYWlsdXJlIHRvIG1ha2Ugc3VyZSB2YWxpZGF0aW9uIGdldHMgdHJpZ2dlcmVkIGZvciBldmVyeSBmb3JtLlxuICB2YXIgZm9ybXNWYWxpZCA9IHRydWVcbiAgLy8gVHJpZ2dlcnMgYSBmdWxsIGNsZWFuXG4gIHRoaXMuZXJyb3JzKClcbiAgdmFyIGZvcm1zID0gdGhpcy5mb3JtcygpXG4gIGZvciAodmFyIGkgPSAwLCBsID0gZm9ybXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIGZvcm0gPSBmb3Jtc1tpXVxuICAgIGlmICh0aGlzLmNhbkRlbGV0ZSAmJiB0aGlzLl9zaG91bGREZWxldGVGb3JtKGZvcm0pKSB7XG4gICAgICAvLyBUaGlzIGZvcm0gaXMgZ29pbmcgdG8gYmUgZGVsZXRlZCBzbyBhbnkgb2YgaXRzIGVycm9ycyBzaG91bGRcbiAgICAgIC8vIG5vdCBjYXVzZSB0aGUgZW50aXJlIGZvcm1zZXQgdG8gYmUgaW52YWxpZC5cbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIGlmICghZm9ybS5pc1ZhbGlkKCkpIHtcbiAgICAgIGZvcm1zVmFsaWQgPSBmYWxzZVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiAoZm9ybXNWYWxpZCAmJiAhdGhpcy5ub25Gb3JtRXJyb3JzKCkuaXNQb3B1bGF0ZWQoKSlcbn1cblxuLyoqXG4gKiBDbGVhbnMgYWxsIG9mIHRoaXMuZGF0YSBhbmQgcG9wdWxhdGVzIHRoaXMuX2Vycm9ycyBhbmQgdGhpcy5fbm9uRm9ybUVycm9ycy5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmZ1bGxDbGVhbiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9lcnJvcnMgPSBbXVxuICB0aGlzLl9ub25Gb3JtRXJyb3JzID0gbmV3IHRoaXMuZXJyb3JDb25zdHJ1Y3RvcigpXG5cbiAgaWYgKCF0aGlzLmlzQm91bmQpIHtcbiAgICByZXR1cm4gLy8gU3RvcCBmdXJ0aGVyIHByb2Nlc3NpbmdcbiAgfVxuXG4gIHZhciBmb3JtcyA9IHRoaXMuZm9ybXMoKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGZvcm1zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBmb3JtID0gZm9ybXNbaV1cbiAgICB0aGlzLl9lcnJvcnMucHVzaChmb3JtLmVycm9ycygpKVxuICB9XG5cbiAgdHJ5IHtcbiAgICB2YXIgdG90YWxGb3JtQ291bnQgPSB0aGlzLnRvdGFsRm9ybUNvdW50KClcbiAgICB2YXIgZGVsZXRlZEZvcm1Db3VudCA9IHRoaXMuZGVsZXRlZEZvcm1zKCkubGVuZ3RoXG4gICAgaWYgKCh0aGlzLnZhbGlkYXRlTWF4ICYmIHRvdGFsRm9ybUNvdW50IC0gZGVsZXRlZEZvcm1Db3VudCA+IHRoaXMubWF4TnVtKSB8fFxuICAgICAgICAgdGhpcy5tYW5hZ2VtZW50Rm9ybSgpLmNsZWFuZWREYXRhW1RPVEFMX0ZPUk1fQ09VTlRdID4gdGhpcy5hYnNvbHV0ZU1heCkge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKCdQbGVhc2Ugc3VibWl0ICcgKyB0aGlzLm1heE51bSArICcgb3IgZmV3ZXIgZm9ybXMuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Y29kZTogJ3Rvb01hbnlGb3Jtcyd9KVxuICAgIH1cbiAgICBpZiAodGhpcy52YWxpZGF0ZU1pbiAmJiB0b3RhbEZvcm1Db3VudCAtIGRlbGV0ZWRGb3JtQ291bnQgPCB0aGlzLm1pbk51bSkge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKCdQbGVhc2Ugc3VibWl0ICcgKyB0aGlzLm1pbk51bSArICcgb3IgbW9yZSBmb3Jtcy4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjb2RlOiAndG9vRmV3Rm9ybXMnfSlcbiAgICB9XG4gICAgLy8gR2l2ZSB0aGlzLmNsZWFuKCkgYSBjaGFuY2UgdG8gZG8gY3Jvc3MtZm9ybSB2YWxpZGF0aW9uLlxuICAgIHRoaXMuY2xlYW4oKVxuICB9XG4gIGNhdGNoIChlKSB7XG4gICAgaWYgKCEoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHsgdGhyb3cgZSB9XG4gICAgdGhpcy5fbm9uRm9ybUVycm9ycyA9IG5ldyB0aGlzLmVycm9yQ29uc3RydWN0b3IoZS5tZXNzYWdlcygpKVxuICB9XG59XG5cbi8qKlxuICogSG9vayBmb3IgZG9pbmcgYW55IGV4dHJhIGZvcm1zZXQtd2lkZSBjbGVhbmluZyBhZnRlciBGb3JtLmNsZWFuKCkgaGFzIGJlZW5cbiAqIGNhbGxlZCBvbiBldmVyeSBmb3JtLiBBbnkgVmFsaWRhdGlvbkVycm9yIHJhaXNlZCBieSB0aGlzIG1ldGhvZCB3aWxsIG5vdCBiZVxuICogYXNzb2NpYXRlZCB3aXRoIGEgcGFydGljdWxhciBmb3JtOyBpdCB3aWxsIGJlIGFjY2VzaWJsZSB2aWFcbiAqIGZvcm1zZXQubm9uRm9ybUVycm9ycygpXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5jbGVhbiA9IGZ1bmN0aW9uKCkge31cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYW55IGZvcm0gZGlmZmVycyBmcm9tIGluaXRpYWwuXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5oYXNDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG4gIHZhciBmb3JtcyA9IHRoaXMuZm9ybXMoKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGZvcm1zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChmb3Jtc1tpXS5oYXNDaGFuZ2VkKCkpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZVxufVxuXG4vKipcbiAqIEEgaG9vayBmb3IgYWRkaW5nIGV4dHJhIGZpZWxkcyBvbiB0byBlYWNoIGZvcm0gaW5zdGFuY2UuXG4gKiBAcGFyYW0ge0Zvcm19IGZvcm0gdGhlIGZvcm0gZmllbGRzIGFyZSB0byBiZSBhZGRlZCB0by5cbiAqIEBwYXJhbSB7TnVtYmVyfSBpbmRleCB0aGUgaW5kZXggb2YgdGhlIGdpdmVuIGZvcm0gaW4gdGhlIGZvcm1zZXQuXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5hZGRGaWVsZHMgPSBmdW5jdGlvbihmb3JtLCBpbmRleCkge1xuICBpZiAodGhpcy5jYW5PcmRlcikge1xuICAgIC8vIE9ubHkgcHJlLWZpbGwgdGhlIG9yZGVyaW5nIGZpZWxkIGZvciBpbml0aWFsIGZvcm1zXG4gICAgaWYgKGluZGV4ICE9IG51bGwgJiYgaW5kZXggPCB0aGlzLmluaXRpYWxGb3JtQ291bnQoKSkge1xuICAgICAgZm9ybS5maWVsZHNbT1JERVJJTkdfRklFTERfTkFNRV0gPVxuICAgICAgICAgIEludGVnZXJGaWVsZCh7bGFiZWw6ICdPcmRlcicsIGluaXRpYWw6IGluZGV4ICsgMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZX0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZm9ybS5maWVsZHNbT1JERVJJTkdfRklFTERfTkFNRV0gPVxuICAgICAgICAgIEludGVnZXJGaWVsZCh7bGFiZWw6ICdPcmRlcicsIHJlcXVpcmVkOiBmYWxzZX0pXG4gICAgfVxuICB9XG4gIGlmICh0aGlzLmNhbkRlbGV0ZSkge1xuICAgIGZvcm0uZmllbGRzW0RFTEVUSU9OX0ZJRUxEX05BTUVdID1cbiAgICAgICAgQm9vbGVhbkZpZWxkKHtsYWJlbDogJ0RlbGV0ZScsIHJlcXVpcmVkOiBmYWxzZX0pXG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBmb3Jtc2V0IHByZWZpeCB3aXRoIHRoZSBmb3JtIGluZGV4IGFwcGVuZGVkLlxuICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4IHRoZSBpbmRleCBvZiBhIGZvcm0gaW4gdGhlIGZvcm1zZXQuXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5hZGRQcmVmaXggPSBmdW5jdGlvbihpbmRleCkge1xuICByZXR1cm4gdGhpcy5wcmVmaXggKyAnLScgKyBpbmRleFxufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZm9ybXNldCBuZWVkcyB0byBiZSBtdWx0aXBhcnQtZW5jb2RlZCwgaS5lLiBpdCBoYXMgYVxuICogRmlsZUlucHV0LiBPdGhlcndpc2UsIGZhbHNlLlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuaXNNdWx0aXBhcnQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICh0aGlzLmZvcm1zKCkubGVuZ3RoID4gMCAmJiB0aGlzLmZvcm1zKClbMF0uaXNNdWx0aXBhcnQoKSlcbn1cblxuQmFzZUZvcm1TZXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5hc1RhYmxlKClcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgZm9ybXNldCByZW5kZXJlZCBhcyBIVE1MIDx0cj5zIC0gZXhjbHVkaW5nIHRoZSA8dGFibGU+LlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuYXNUYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAvLyBYWFg6IHRoZXJlIGlzIG5vIHNlbWFudGljIGRpdmlzaW9uIGJldHdlZW4gZm9ybXMgaGVyZSwgdGhlcmUgcHJvYmFibHlcbiAgLy8gc2hvdWxkIGJlLiBJdCBtaWdodCBtYWtlIHNlbnNlIHRvIHJlbmRlciBlYWNoIGZvcm0gYXMgYSB0YWJsZSByb3cgd2l0aFxuICAvLyBlYWNoIGZpZWxkIGFzIGEgdGQuXG4gIHZhciByb3dzID0gdGhpcy5tYW5hZ2VtZW50Rm9ybSgpLmFzVGFibGUoKVxuICB0aGlzLmZvcm1zKCkuZm9yRWFjaChmdW5jdGlvbihmb3JtKSB7IHJvd3MgPSByb3dzLmNvbmNhdChmb3JtLmFzVGFibGUoKSkgfSlcbiAgcmV0dXJuIHJvd3Ncbn1cblxuQmFzZUZvcm1TZXQucHJvdG90eXBlLmFzUCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcm93cyA9IHRoaXMubWFuYWdlbWVudEZvcm0oKS5hc1AoKVxuICB0aGlzLmZvcm1zKCkuZm9yRWFjaChmdW5jdGlvbihmb3JtKSB7IHJvd3MgPSByb3dzLmNvbmNhdChmb3JtLmFzUCgpKSB9KVxuICByZXR1cm4gcm93c1xufVxuXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuYXNVTCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcm93cyA9IHRoaXMubWFuYWdlbWVudEZvcm0oKS5hc1VMKClcbiAgdGhpcy5mb3JtcygpLmZvckVhY2goZnVuY3Rpb24oZm9ybSkgeyByb3dzID0gcm93cy5jb25jYXQoZm9ybS5hc1VMKCkpIH0pXG4gIHJldHVybiByb3dzXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIEZvcm1TZXQgY29uc3RydWN0b3IgZm9yIHRoZSBnaXZlbiBGb3JtIGNvbnN0cnVjdG9yLlxuICogQHBhcmFtIHtGb3JtfSBmb3JtXG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG5mdW5jdGlvbiBmb3Jtc2V0RmFjdG9yeShmb3JtLCBrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7XG4gICAgZm9ybXNldDogQmFzZUZvcm1TZXQsIGV4dHJhOiAxLCBjYW5PcmRlcjogZmFsc2UsIGNhbkRlbGV0ZTogZmFsc2UsXG4gICAgbWF4TnVtOiBERUZBVUxUX01BWF9OVU0sIHZhbGlkYXRlTWF4OiBmYWxzZSxcbiAgICBtaW5OdW06IERFRkFVTFRfTUlOX05VTSwgdmFsaWRhdGVNaW46IGZhbHNlXG4gIH0sIGt3YXJncylcblxuICAvLyBSZW1vdmUgc3BlY2lhbCBwcm9wZXJ0aWVzIGZyb20ga3dhcmdzLCBhcyBpdCB3aWxsIHN1YnNlcXVlbnRseSBiZSB1c2VkIHRvXG4gIC8vIGFkZCBwcm9wZXJ0aWVzIHRvIHRoZSBuZXcgZm9ybXNldCdzIHByb3RvdHlwZS5cbiAgdmFyIGZvcm1zZXQgPSBvYmplY3QucG9wKGt3YXJncywgJ2Zvcm1zZXQnKVxuICB2YXIgZXh0cmEgPSBvYmplY3QucG9wKGt3YXJncywgJ2V4dHJhJylcbiAgdmFyIGNhbk9yZGVyID0gb2JqZWN0LnBvcChrd2FyZ3MsICdjYW5PcmRlcicpXG4gIHZhciBjYW5EZWxldGUgPSBvYmplY3QucG9wKGt3YXJncywgJ2NhbkRlbGV0ZScpXG4gIHZhciBtYXhOdW0gPSBvYmplY3QucG9wKGt3YXJncywgJ21heE51bScpXG4gIHZhciB2YWxpZGF0ZU1heCA9IG9iamVjdC5wb3Aoa3dhcmdzLCAndmFsaWRhdGVNYXgnKVxuICB2YXIgbWluTnVtID0gb2JqZWN0LnBvcChrd2FyZ3MsICdtaW5OdW0nKVxuICB2YXIgdmFsaWRhdGVNaW4gPSBvYmplY3QucG9wKGt3YXJncywgJ3ZhbGlkYXRlTWluJylcblxuICAvLyBIYXJkIGxpbWl0IG9uIGZvcm1zIGluc3RhbnRpYXRlZCwgdG8gcHJldmVudCBtZW1vcnktZXhoYXVzdGlvbiBhdHRhY2tzXG4gIC8vIGxpbWl0IGlzIHNpbXBseSBtYXhOdW0gKyBERUZBVUxUX01BWF9OVU0gKHdoaWNoIGlzIDIgKiBERUZBVUxUX01BWF9OVU1cbiAgLy8gaWYgbWF4TnVtIGlzIG5vdCBwcm92aWRlZCBpbiB0aGUgZmlyc3QgcGxhY2UpXG4gIHZhciBhYnNvbHV0ZU1heCA9IG1heE51bSArIERFRkFVTFRfTUFYX05VTVxuICBleHRyYSArPSBtaW5OdW1cblxuICBrd2FyZ3MuY29uc3RydWN0b3IgPSBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICB0aGlzLmZvcm0gPSBmb3JtXG4gICAgdGhpcy5leHRyYSA9IGV4dHJhXG4gICAgdGhpcy5jYW5PcmRlciA9IGNhbk9yZGVyXG4gICAgdGhpcy5jYW5EZWxldGUgPSBjYW5EZWxldGVcbiAgICB0aGlzLm1heE51bSA9IG1heE51bVxuICAgIHRoaXMudmFsaWRhdGVNYXggPSB2YWxpZGF0ZU1heFxuICAgIHRoaXMubWluTnVtID0gbWluTnVtXG4gICAgdGhpcy52YWxpZGF0ZU1pbiA9IHZhbGlkYXRlTWluXG4gICAgdGhpcy5hYnNvbHV0ZU1heCA9IGFic29sdXRlTWF4XG4gICAgZm9ybXNldC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuXG4gIHZhciBmb3Jtc2V0Q29uc3RydWN0b3IgPSBmb3Jtc2V0LmV4dGVuZChrd2FyZ3MpXG5cbiAgcmV0dXJuIGZvcm1zZXRDb25zdHJ1Y3RvclxufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBldmVyeSBmb3Jtc2V0IGluIGZvcm1zZXRzIGlzIHZhbGlkLlxuICovXG5mdW5jdGlvbiBhbGxWYWxpZChmb3Jtc2V0cykge1xuICB2YXIgdmFsaWQgPSB0cnVlXG4gIGZvciAodmFyIGkgPSAwLCBsID0gZm9ybXNldHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKCFmb3Jtc2V0c1tpXS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgdmFsaWQgPSBmYWxzZVxuICAgIH1cbiAgfVxuICByZXR1cm4gdmFsaWRcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIERFRkFVTFRfTUFYX05VTTogREVGQVVMVF9NQVhfTlVNXG4sIEJhc2VGb3JtU2V0OiBCYXNlRm9ybVNldFxuLCBmb3Jtc2V0RmFjdG9yeTogZm9ybXNldEZhY3RvcnlcbiwgYWxsVmFsaWQ6IGFsbFZhbGlkXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBvYmplY3QgPSByZXF1aXJlKCdpc29tb3JwaC9vYmplY3QnKVxuICAsIHZhbGlkYXRvcnMgPSByZXF1aXJlKCd2YWxpZGF0b3JzJylcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuICAsIGZpZWxkcyA9IHJlcXVpcmUoJy4vZmllbGRzJylcblxudmFyIEZpZWxkID0gZmllbGRzLkZpZWxkXG4gICwgVmFsaWRhdGlvbkVycm9yID0gdmFsaWRhdG9ycy5WYWxpZGF0aW9uRXJyb3JcblxuLyoqXG4gKiBBIG1lYW5zIG9mIGhvb2tpbmcgbmV3Zm9ybXMgdXAgd2l0aCBpbmZvcm1hdGlvbiBhYm91dCB5b3VyIG1vZGVsIGxheWVyLlxuICovXG52YXIgTW9kZWxJbnRlcmZhY2UgPSB7XG4gIC8qKlxuICAgKiBTZXQgdG8gdHJ1ZSBpZiBhbiBleGNlcHRpb24gaXMgdGhyb3duIHdoZW4gYSBtb2RlbCBjYW4ndCBiZSBmb3VuZC5cbiAgICovXG4gIHRocm93c0lmTm90Rm91bmQ6IHRydWVcblxuICAvKipcbiAgICogQ29uc3RydWN0b3Igb2YgZXJyb3IgdGhyb3duIHdoZW4gYSBtb2RlbCBjYW4ndCBiZSBmb3VuZC4gQW55IGV4Y2VwdGlvbnNcbiAgICogd2hpY2ggZG8gbm90IGhhdmUgdGhpcyBjb25zdHJ1Y3RvciB3aWxsIGJlIHJldGhyb3duLlxuICAgKi9cbiwgbm90Rm91bmRFcnJvckNvbnN0cnVjdG9yOiBFcnJvclxuXG4gIC8qKlxuICAgKiBWYWx1ZSByZXR1cm5lZCB0byBpbmRpY2F0ZSBub3QgZm91bmQsIGluc3RlYWQgb2YgdGhyb3dpbmcgYW4gZXhjZXB0aW9uLlxuICAgKi9cbiwgbm90Rm91bmRWYWx1ZTogbnVsbFxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIG1vZGVsIGluc3RhbmNlLCBzaG91bGQgcmV0dXJuIHRoZSBpZCB3aGljaCB3aWxsIGJlIHVzZWQgdG8gc2VhcmNoXG4gICAqIGZvciB2YWxpZCBjaG9pY2VzIG9uIHN1Ym1pc3Npb24uXG4gICAqL1xuLCBwcmVwYXJlVmFsdWU6IGZ1bmN0aW9uKG9iaikge1xuICAgIHRocm93IG5ldyBFcnJvcignWW91IG11c3QgaW1wbGVtZW50IHRoZSBmb3Jtcy5Nb2RlbEludGVyZmFjZSBtZXRob2RzIHRvIHVzZSBNb2RlbCBmaWVsZHMnKVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIGEgbW9kZWwgaW5zdGFuY2UgYnkgaWQsIGdpdmVuIHRoZSBtb2RlbCBxdWVyeSB3aGljaCB3YXMgcGFzc2VkIHRvXG4gICAqIG5ld2Zvcm1zIGFuZCB0aGUgaWQgb2YgdGhlIHNlbGVjdGVkIG1vZGVsLlxuICAgKi9cbiwgZmluZEJ5SWQ6IGZ1bmN0aW9uKG1vZGVsUXVlcnksIGlkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgbXVzdCBpbXBsZW1lbnQgdGhlIGZvcm1zLk1vZGVsSW50ZXJmYWNlIG1ldGhvZHMgdG8gdXNlIE1vZGVsIGZpZWxkcycpXG4gIH1cbn1cblxuZnVuY3Rpb24gTW9kZWxRdWVyeUl0ZXJhdG9yKGZpZWxkKSB7XG4gIHRoaXMuZmllbGQgPSBmaWVsZFxuICB0aGlzLm1vZGVsUXVlcnkgPSBmaWVsZC5tb2RlbFF1ZXJ5XG59XG5cbk1vZGVsUXVlcnlJdGVyYXRvci5wcm90b3R5cGUuX19pdGVyX18gPSBmdW5jdGlvbigpIHtcbiAgdmFyIGNob2ljZXMgPSBbXVxuICBpZiAodGhpcy5maWVsZC5lbXB0eUxhYmVsICE9PSBudWxsKSB7XG4gICAgY2hvaWNlcy5wdXNoKFsnJywgdGhpcy5maWVsZC5lbXB0eUxhYmVsXSlcbiAgfVxuICBpZiAodGhpcy5maWVsZC5jYWNoZUNob2ljZXMpIHtcbiAgICBpZiAodGhpcy5maWVsZC5jaG9pY2VDYWNoZSA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5maWVsZC5jaG9pY2VDYWNoZSA9IGNob2ljZXMuY29uY2F0KHRoaXMubW9kZWxDaG9pY2VzKCkpXG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZpZWxkLmNob2ljZUNhY2hlXG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIGNob2ljZXMuY29uY2F0KHRoaXMubW9kZWxDaG9pY2VzKCkpXG4gIH1cbn1cblxuLyoqXG4gKiBDYWxscyB0aGUgbW9kZWwgcXVlcnkgZnVuY3Rpb24gYW5kIGNyZWF0ZXMgY2hvaWNlcyBmcm9tIGl0cyByZXN1bHRzLlxuICovXG5Nb2RlbFF1ZXJ5SXRlcmF0b3IucHJvdG90eXBlLm1vZGVsQ2hvaWNlcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaW5zdGFuY2VzID0gdXRpbC5pdGVyYXRlKHRoaXMubW9kZWxRdWVyeSlcbiAgICAsIGNob2ljZXMgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGluc3RhbmNlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBjaG9pY2VzLnB1c2godGhpcy5jaG9pY2UoaW5zdGFuY2VzW2ldKSlcbiAgfVxuICByZXR1cm4gY2hvaWNlc1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBjaG9pY2UgZnJvbSBhIHNpbmdsZSBtb2RlbCBpbnN0YW5jZS5cbiAqL1xuTW9kZWxRdWVyeUl0ZXJhdG9yLnByb3RvdHlwZS5jaG9pY2UgPSBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIFt0aGlzLmZpZWxkLnByZXBhcmVWYWx1ZShvYmopLCB0aGlzLmZpZWxkLmxhYmVsRnJvbUluc3RhbmNlKG9iaildXG59XG5cbi8qKlxuICogQSBDaG9pY2VGaWVsZCB3aGljaCByZXRyaWV2ZXMgaXRzIGNob2ljZXMgYXMgb2JqZWN0cyByZXR1cm5lZCBieSBhIGdpdmVuXG4gKiBmdW5jdGlvbi5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0Nob2ljZUZpZWxkfVxuICogQHBhcmFtIHtmdW5jdGlvbn0gbW9kZWxRdWVyeVxuICogQHBhcmFtIHtPYmplY3R9IGt3YXJnc1xuICovXG52YXIgTW9kZWxDaG9pY2VGaWVsZCA9IGZpZWxkcy5DaG9pY2VGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gTW9kZWxDaG9pY2VGaWVsZChtb2RlbFF1ZXJ5LCBrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgTW9kZWxDaG9pY2VGaWVsZChtb2RlbFF1ZXJ5LCBrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtcbiAgICAgIHJlcXVpcmVkOiB0cnVlLCBpbml0aWFsOiBudWxsLCBjYWNoZUNob2ljZXM6IGZhbHNlLCBlbXB0eUxhYmVsOiAnLS0tLS0tLS0tJyxcbiAgICAgIG1vZGVsSW50ZXJmYWNlOiBNb2RlbEludGVyZmFjZVxuICAgIH0sIGt3YXJncylcbiAgICBpZiAoa3dhcmdzLnJlcXVpcmVkID09PSB0cnVlICYmIGt3YXJncy5pbml0aWFsICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmVtcHR5TGFiZWwgPSBudWxsXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5lbXB0eUxhYmVsID0ga3dhcmdzLmVtcHR5TGFiZWxcbiAgICB9XG4gICAgdGhpcy5lbXB0eUxhYmVsID0ga3dhcmdzLmVtcHR5TGFiZWxcbiAgICB0aGlzLmNhY2hlQ2hvaWNlcyA9IGt3YXJncy5jYWNoZUNob2ljZXNcbiAgICB0aGlzLm1vZGVsSW50ZXJmYWNlID0ga3dhcmdzLm1vZGVsSW50ZXJmYWNlXG5cbiAgICAvLyBXZSBkb24ndCBuZWVkIHRoZSBDaG9pY2VGaWVsZCBjb25zdHJ1Y3RvciwgYXMgd2UndmUgYWxyZWFkeSBoYW5kbGVkIHNldHRpbmdcbiAgICAvLyBvZiBjaG9pY2VzLlxuICAgIEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuXG4gICAgdGhpcy5zZXRNb2RlbFF1ZXJ5KG1vZGVsUXVlcnkpXG4gICAgdGhpcy5jaG9pY2VDYWNoZSA9IG51bGxcbiAgfVxufSlcbk1vZGVsQ2hvaWNlRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBNb2RlbENob2ljZUZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcywge1xuICAgICAgaW52YWxpZENob2ljZTogJ1NlbGVjdCBhIHZhbGlkIGNob2ljZS4gVGhhdCBjaG9pY2UgaXMgbm90IG9uZSBvZiB0aGUgYXZhaWxhYmxlIGNob2ljZXMuJ1xuICAgIH0pXG5cbk1vZGVsQ2hvaWNlRmllbGQucHJvdG90eXBlLmdldE1vZGVsUXVlcnkgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMubW9kZWxRdWVyeVxufVxuXG5Nb2RlbENob2ljZUZpZWxkLnByb3RvdHlwZS5zZXRNb2RlbFF1ZXJ5ID0gZnVuY3Rpb24obW9kZWxRdWVyeSkge1xuICB0aGlzLm1vZGVsUXVlcnkgPSBtb2RlbFF1ZXJ5XG4gIHRoaXMud2lkZ2V0LmNob2ljZXMgPSB0aGlzLmdldENob2ljZXMoKVxufVxuXG5Nb2RlbENob2ljZUZpZWxkLnByb3RvdHlwZS5nZXRDaG9pY2VzID0gZnVuY3Rpb24oKSB7XG4gIC8vIElmIHRoaXMuX2Nob2ljZXMgaXMgc2V0LCB0aGVuIHNvbWVib2R5IG11c3QgaGF2ZSBtYW51YWxseSBzZXQgdGhlbSB3aXRoXG4gIC8vIHRoZSBpbmhlcml0ZWQgc2V0Q2hvaWNlcyBtZXRob2QuXG4gIGlmICh0eXBlb2YgdGhpcy5fY2hvaWNlcyAhPSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiB0aGlzLl9jaG9pY2VzXG4gIH1cblxuICAvLyBPdGhlcndpc2UsIHJldHVybiBhbiBvYmplY3Qgd2hpY2ggY2FuIGJlIHVzZWQgd2l0aCBpdGVyYXRlKCkgdG8gZ2V0XG4gIC8vIGNob2ljZXMuXG4gIHJldHVybiBuZXcgTW9kZWxRdWVyeUl0ZXJhdG9yKHRoaXMpXG59XG5cbk1vZGVsQ2hvaWNlRmllbGQucHJvdG90eXBlLnByZXBhcmVWYWx1ZSA9IGZ1bmN0aW9uKG9iaikge1xuICB2YXIgdmFsdWUgPSBudWxsXG4gIGlmIChvYmogIT0gbnVsbCkge1xuICAgIHZhbHVlID0gdGhpcy5tb2RlbEludGVyZmFjZS5wcmVwYXJlVmFsdWUob2JqKVxuICB9XG4gIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgdmFsdWUgPSBGaWVsZC5wcm90b3R5cGUucHJlcGFyZVZhbHVlLmNhbGwodGhpcywgb2JqKVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBjaG9pY2UgbGFiZWwgZnJvbSBhIG1vZGVsIGluc3RhbmNlLlxuICovXG5Nb2RlbENob2ljZUZpZWxkLnByb3RvdHlwZS5sYWJlbEZyb21JbnN0YW5jZSA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gJycrb2JqXG59XG5cbk1vZGVsQ2hvaWNlRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh2YWxpZGF0b3JzLmlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG4gIGlmICh0aGlzLm1vZGVsSW50ZXJmYWNlLnRocm93c0lmTm90Rm91bmQpIHtcbiAgICB0cnkge1xuICAgICAgdmFsdWUgPSB0aGlzLm1vZGVsSW50ZXJmYWNlLmZpbmRCeUlkKHRoaXMubW9kZWxRdWVyeSwgdmFsdWUpXG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBpZiAodGhpcy5tb2RlbEludGVyZmFjZS5ub3RGb3VuZEVycm9yQ29uc3RydWN0b3IgIT09IG51bGwgJiZcbiAgICAgICAgICAhKGUgaW5zdGFuY2VvZiB0aGlzLm1vZGVsSW50ZXJmYWNlLm5vdEZvdW5kRXJyb3JDb25zdHJ1Y3RvcikpIHtcbiAgICAgICAgdGhyb3cgZVxuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZENob2ljZSlcbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgdmFsdWUgPSB0aGlzLm1vZGVsSW50ZXJmYWNlLmZpbmRCeUlkKHRoaXMubW9kZWxRdWVyeSwgdmFsdWUpXG4gICAgaWYgKHZhbHVlID09PSB0aGlzLm1vZGVsSW50ZXJmYWNlLm5vdEZvdW5kVmFsdWUpIHtcbiAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWRDaG9pY2UpXG4gICAgfVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG5Nb2RlbENob2ljZUZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBGaWVsZC5wcm90b3R5cGUudmFsaWRhdGUuY2FsbCh0aGlzLCB2YWx1ZSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIE1vZGVsSW50ZXJmYWNlOiBNb2RlbEludGVyZmFjZVxuLCBNb2RlbENob2ljZUZpZWxkOiBNb2RlbENob2ljZUZpZWxkXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBvYmplY3QgPSByZXF1aXJlKCdpc29tb3JwaC9vYmplY3QnKVxuICAsIHZhbGlkYXRvcnMgPSByZXF1aXJlKCd2YWxpZGF0b3JzJylcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuICAsIHdpZGdldHMgPSByZXF1aXJlKCcuL3dpZGdldHMnKVxuICAsIGZpZWxkcyA9IHJlcXVpcmUoJy4vZmllbGRzJylcbiAgLCBmb3JtcyA9IHJlcXVpcmUoJy4vZm9ybXMnKVxuICAsIGZvcm1zZXRzID0gcmVxdWlyZSgnLi9mb3Jtc2V0cycpXG4gICwgbW9kZWxzID0gcmVxdWlyZSgnLi9tb2RlbHMnKVxuXG5vYmplY3QuZXh0ZW5kKFxuICBtb2R1bGUuZXhwb3J0c1xuLCB7IFZhbGlkYXRpb25FcnJvcjogdmFsaWRhdG9ycy5WYWxpZGF0aW9uRXJyb3JcbiAgLCBFcnJvck9iamVjdDogdXRpbC5FcnJvck9iamVjdFxuICAsIEVycm9yTGlzdDogdXRpbC5FcnJvckxpc3RcbiAgLCBmb3JtRGF0YTogdXRpbC5mb3JtRGF0YVxuICAsIHV0aWw6IHtcbiAgICAgIGl0ZXJhdGU6IHV0aWwuaXRlcmF0ZVxuICAgICwgcHJldHR5TmFtZTogdXRpbC5wcmV0dHlOYW1lXG4gICAgfVxuICB9XG4sIHZhbGlkYXRvcnNcbiwgd2lkZ2V0c1xuLCBmaWVsZHNcbiwgZm9ybXNcbiwgZm9ybXNldHNcbiwgbW9kZWxzXG4pXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb25jdXIgPSByZXF1aXJlKCdDb25jdXInKVxuICAsIGlzID0gcmVxdWlyZSgnaXNvbW9ycGgvaXMnKVxuICAsIG9iamVjdCA9IHJlcXVpcmUoJ2lzb21vcnBoL29iamVjdCcpXG4gICwgdmFsaWRhdG9ycyA9IHJlcXVpcmUoJ3ZhbGlkYXRvcnMnKVxuXG52YXIgVmFsaWRhdGlvbkVycm9yID0gdmFsaWRhdG9ycy5WYWxpZGF0aW9uRXJyb3JcblxudmFyIERFRkFVTFRfREFURV9JTlBVVF9GT1JNQVRTID0gW1xuICAnJVktJW0tJWQnICAgICAgICAgICAgICAvLyAnMjAwNi0xMC0yNSdcbiwgJyVtLyVkLyVZJywgJyVtLyVkLyV5JyAgLy8gJzEwLzI1LzIwMDYnLCAnMTAvMjUvMDYnXG4sICclYiAlZCAlWScsICclYiAlZCwgJVknIC8vICdPY3QgMjUgMjAwNicsICdPY3QgMjUsIDIwMDYnXG4sICclZCAlYiAlWScsICclZCAlYiwgJVknIC8vICcyNSBPY3QgMjAwNicsICcyNSBPY3QsIDIwMDYnXG4sICclQiAlZCAlWScsICclQiAlZCwgJVknIC8vICdPY3RvYmVyIDI1IDIwMDYnLCAnT2N0b2JlciAyNSwgMjAwNidcbiwgJyVkICVCICVZJywgJyVkICVCLCAlWScgLy8gJzI1IE9jdG9iZXIgMjAwNicsICcyNSBPY3RvYmVyLCAyMDA2J1xuXVxuXG52YXIgREVGQVVMVF9USU1FX0lOUFVUX0ZPUk1BVFMgPSBbXG4gICclSDolTTolUycgLy8gJzE0OjMwOjU5J1xuLCAnJUg6JU0nICAgIC8vICcxNDozMCdcbl1cblxudmFyIERFRkFVTFRfREFURVRJTUVfSU5QVVRfRk9STUFUUyA9IFtcbiAgJyVZLSVtLSVkICVIOiVNOiVTJyAvLyAnMjAwNi0xMC0yNSAxNDozMDo1OSdcbiwgJyVZLSVtLSVkICVIOiVNJyAgICAvLyAnMjAwNi0xMC0yNSAxNDozMCdcbiwgJyVZLSVtLSVkJyAgICAgICAgICAvLyAnMjAwNi0xMC0yNSdcbiwgJyVtLyVkLyVZICVIOiVNOiVTJyAvLyAnMTAvMjUvMjAwNiAxNDozMDo1OSdcbiwgJyVtLyVkLyVZICVIOiVNJyAgICAvLyAnMTAvMjUvMjAwNiAxNDozMCdcbiwgJyVtLyVkLyVZJyAgICAgICAgICAvLyAnMTAvMjUvMjAwNidcbiwgJyVtLyVkLyV5ICVIOiVNOiVTJyAvLyAnMTAvMjUvMDYgMTQ6MzA6NTknXG4sICclbS8lZC8leSAlSDolTScgICAgLy8gJzEwLzI1LzA2IDE0OjMwJ1xuLCAnJW0vJWQvJXknICAgICAgICAgIC8vICcxMC8yNS8wNidcbl1cblxuLyoqXG4gKiBBbGxvd3MgYW4gQXJyYXksIGFuIG9iamVjdCB3aXRoIGFuIF9faXRlcl9fIG1ldGhvZCBvciBhIGZ1bmN0aW9uIHdoaWNoXG4gKiByZXR1cm5zIGVpdGhlciBiZSB1c2VkIHdoZW4gdWx0aW1hdGVseSBleHBlY3RpbmcgYW4gQXJyYXkuXG4gKi9cbmZ1bmN0aW9uIGl0ZXJhdGUobykge1xuICBpZiAoaXMuQXJyYXkobykpIHtcbiAgICByZXR1cm4gb1xuICB9XG4gIGlmIChpcy5GdW5jdGlvbihvKSkge1xuICAgIG8gPSBvKClcbiAgfVxuICBpZiAobyAhPSBudWxsICYmIGlzLkZ1bmN0aW9uKG8uX19pdGVyX18pKSB7XG4gICAgbyA9IG8uX19pdGVyX18oKVxuICB9XG4gIHJldHVybiBvIHx8IFtdXG59XG5cbi8qKlxuICogQ29udmVydHMgJ2ZpcnN0TmFtZScgYW5kICdmaXJzdF9uYW1lJyB0byAnRmlyc3QgbmFtZScsIGFuZFxuICogJ1NIT1VUSU5HX0xJS0VfVEhJUycgdG8gJ1NIT1VUSU5HIExJS0UgVEhJUycuXG4gKi9cbnZhciBwcmV0dHlOYW1lID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgY2Fwc1JFID0gLyhbQS1aXSspL2dcbiAgdmFyIHNwbGl0UkUgPSAvWyBfXSsvXG4gIHZhciBhbGxDYXBzUkUgPSAvXltBLVpdW0EtWjAtOV0rJC9cblxuICByZXR1cm4gZnVuY3Rpb24obmFtZSkge1xuICAgIC8vIFByZWZpeCBzZXF1ZW5jZXMgb2YgY2FwcyB3aXRoIHNwYWNlcyBhbmQgc3BsaXQgb24gYWxsIHNwYWNlXG4gICAgLy8gY2hhcmFjdGVycy5cbiAgICB2YXIgcGFydHMgPSBuYW1lLnJlcGxhY2UoY2Fwc1JFLCAnICQxJykuc3BsaXQoc3BsaXRSRSlcblxuICAgIC8vIElmIHdlIGhhZCBhbiBpbml0aWFsIGNhcC4uLlxuICAgIGlmIChwYXJ0c1swXSA9PT0gJycpIHtcbiAgICAgIHBhcnRzLnNwbGljZSgwLCAxKVxuICAgIH1cblxuICAgIC8vIEdpdmUgdGhlIGZpcnN0IHdvcmQgYW4gaW5pdGlhbCBjYXAgYW5kIGFsbCBzdWJzZXF1ZW50IHdvcmRzIGFuXG4gICAgLy8gaW5pdGlhbCBsb3dlcmNhc2UgaWYgbm90IGFsbCBjYXBzLlxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICBwYXJ0c1swXSA9IHBhcnRzWzBdLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICtcbiAgICAgICAgICAgICAgICAgICBwYXJ0c1swXS5zdWJzdHIoMSlcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKCFhbGxDYXBzUkUudGVzdChwYXJ0c1tpXSkpIHtcbiAgICAgICAgcGFydHNbaV0gPSBwYXJ0c1tpXS5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArXG4gICAgICAgICAgICAgICAgICAgcGFydHNbaV0uc3Vic3RyKDEpXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnRzLmpvaW4oJyAnKVxuICB9XG59KSgpXG5cbi8qKlxuICogQ3JlYXRlcyBhbiBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBkYXRhIGhlbGQgaW4gYSBmb3JtJ3MgZWxlbWVudHMuXG4gKiBAcGFyYW0ge0hUTUxGb3JtRWxlbWVudHxzdHJpbmd9IGZvcm0gYSBmb3JtIERPTSBlbGVtZW50IG9yIGEgU3RyaW5nXG4gKiAgIHNwZWNpZnlpbmcgYSBmb3JtJ3MgaWQgb3IgbmFtZSBhdHRyaWJ1dGUuIElmIGEgU3RyaW5nIGlzIGdpdmVuLCBpZCBpcyB0cmllZFxuICogICBiZWZvcmUgbmFtZSB3aGVuIGF0dGVtcHRpbmcgdG8gZmluZCB0aGUgZm9ybSBpbiB0aGUgRE9NLiBBbiBlcnJvciB3aWxsIGJlXG4gKiAgIHRocm93biBpZiB0aGUgZm9ybSBjb3VsZCBub3QgYmUgZm91bmQuXG4gKiBAcmV0dXJuIGFuIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIGRhdGEgcHJlc2VudCBpbiB0aGUgZm9ybS5cbiAqL1xuZnVuY3Rpb24gZm9ybURhdGEoZm9ybSkge1xuICB2YXIgZGF0YSA9IHt9XG4gIGlmIChpcy5TdHJpbmcoZm9ybSkpIHtcbiAgICBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZm9ybSkgfHwgZG9jdW1lbnQuZm9ybXNbZm9ybV1cbiAgfVxuICBpZiAoIWZvcm0pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJmb3JtRGF0YSBjb3VsZG4ndCBmaW5kIGEgZm9ybSB3aXRoICdcIiArIGZvcm0gKyBcIidcIilcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gZm9ybS5lbGVtZW50cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgZWxlbWVudCA9IGZvcm0uZWxlbWVudHNbaV1cbiAgICB2YXIgdHlwZSA9IGVsZW1lbnQudHlwZVxuICAgIHZhciB2YWx1ZSA9IG51bGxcblxuICAgIC8vIFJldHJpZXZlIHRoZSBlbGVtZW50J3MgdmFsdWUgKG9yIHZhbHVlcylcbiAgICBpZiAodHlwZSA9PSAnaGlkZGVuJyB8fCB0eXBlID09ICdwYXNzd29yZCcgfHwgdHlwZSA9PSAndGV4dCcgfHxcbiAgICAgICAgdHlwZSA9PSAnZW1haWwnIHx8IHR5cGUgPT0gJ3VybCcgfHwgdHlwZSA9PSAnbnVtYmVyJyB8fFxuICAgICAgICB0eXBlID09ICd0ZXh0YXJlYScgfHwgKCh0eXBlID09ICdjaGVja2JveCcgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9PSAncmFkaW8nKSAmJiBlbGVtZW50LmNoZWNrZWQpKSB7XG4gICAgICB2YWx1ZSA9IGVsZW1lbnQudmFsdWVcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSA9PSAnc2VsZWN0LW9uZScpIHtcbiAgICAgIHZhbHVlID0gZWxlbWVudC5vcHRpb25zW2VsZW1lbnQuc2VsZWN0ZWRJbmRleF0udmFsdWVcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSA9PSAnc2VsZWN0LW11bHRpcGxlJykge1xuICAgICAgdmFsdWUgPSBbXVxuICAgICAgZm9yICh2YXIgaiA9IDAsIG0gPSBlbGVtZW50Lm9wdGlvbnMubGVuZ3RoOyBqIDwgbTsgaisrKSB7XG4gICAgICAgIGlmIChlbGVtZW50Lm9wdGlvbnNbal0uc2VsZWN0ZWQpIHtcbiAgICAgICAgICB2YWx1ZS5wdXNoKGVsZW1lbnQub3B0aW9uc1tqXS52YWx1ZSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YWx1ZSA9IG51bGxcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZGQgYW55IHZhbHVlIG9idGFpbmVkIHRvIHRoZSBkYXRhIG9iamVjdFxuICAgIGlmICh2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgaWYgKG9iamVjdC5oYXNPd24oZGF0YSwgZWxlbWVudC5uYW1lKSkge1xuICAgICAgICBpZiAoaXMuQXJyYXkoZGF0YVtlbGVtZW50Lm5hbWVdKSkge1xuICAgICAgICAgIGRhdGFbZWxlbWVudC5uYW1lXSA9IGRhdGFbZWxlbWVudC5uYW1lXS5jb25jYXQodmFsdWUpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGF0YVtlbGVtZW50Lm5hbWVdID0gW2RhdGFbZWxlbWVudC5uYW1lXSwgdmFsdWVdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkYXRhW2VsZW1lbnQubmFtZV0gPSB2YWx1ZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkYXRhXG59XG5cbi8qKlxuICogQ29lcmNlcyB0byBzdHJpbmcgYW5kIHN0cmlwcyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzcGFjZXMuXG4gKi9cbnZhciBzdHJpcCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc3RyaXBSRSA9LyheXFxzK3xcXHMrJCkvZ1xuICByZXR1cm4gZnVuY3Rpb24gc3RyaXAocykge1xuICAgIHJldHVybiAoJycrcykucmVwbGFjZShzdHJpcFJFLCAnJylcbiAgfVxufSgpXG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIGZpZWxkIGVycm9ycyB0aGF0IGtub3dzIGhvdyB0byBkaXNwbGF5IGl0c2VsZiBpbiB2YXJpb3VzXG4gKiBmb3JtYXRzLiBUaGlzIG9iamVjdCdzIC5lcnJvciBwcm9wZXJ0aWVzIGFyZSB0aGUgZmllbGQgbmFtZXMgYW5kXG4gKiBjb3JyZXNwb25kaW5nIHZhbHVlcyBhcmUgdGhlIGVycm9ycy5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgRXJyb3JPYmplY3QgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEVycm9yT2JqZWN0KGVycm9ycykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBFcnJvck9iamVjdCkpIHsgcmV0dXJuIG5ldyBFcnJvck9iamVjdChlcnJvcnMpIH1cbiAgICB0aGlzLmVycm9ycyA9IGVycm9ycyB8fCB7fVxuICB9XG59KVxuXG5FcnJvck9iamVjdC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oZmllbGQsIGVycm9yKSB7XG4gIHRoaXMuZXJyb3JzW2ZpZWxkXSA9IGVycm9yXG59XG5cbkVycm9yT2JqZWN0LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihmaWVsZCkge1xuICByZXR1cm4gdGhpcy5lcnJvcnNbZmllbGRdXG59XG5cbkVycm9yT2JqZWN0LnByb3RvdHlwZS5oYXNGaWVsZCA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gIHJldHVybiBvYmplY3QuaGFzT3duKHRoaXMuZXJyb3JzLCBmaWVsZClcbn1cblxuRXJyb3JPYmplY3QucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5lcnJvcnMpLmxlbmd0aFxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgYW55IGVycm9ycyBhcmUgcHJlc2VudC5cbiAqL1xuRXJyb3JPYmplY3QucHJvdG90eXBlLmlzUG9wdWxhdGVkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAodGhpcy5sZW5ndGgoKSA+IDApXG59XG5cbi8qKlxuICogRGVmYXVsdCBkaXNwbGF5IGlzIGFzIGEgbGlzdC5cbiAqL1xuRXJyb3JPYmplY3QucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5hc1VMKClcbn1cblxuLyoqXG4gKiBEaXNwbGF5cyBlcnJvciBkZXRhaWxzIGFzIGEgbGlzdC5cbiAqL1xuRXJyb3JPYmplY3QucHJvdG90eXBlLmFzVUwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGl0ZW1zID0gT2JqZWN0LmtleXModGhpcy5lcnJvcnMpLm1hcChmdW5jdGlvbihmaWVsZCkge1xuICAgIHJldHVybiBSZWFjdC5ET00ubGkobnVsbCwgZmllbGQsIHRoaXMuZXJyb3JzW2ZpZWxkXS5hc1VMKCkpXG4gIH0uYmluZCh0aGlzKSlcbiAgaWYgKGl0ZW1zLmxlbmd0aCA9PT0gMCkgeyByZXR1cm4gJycgfVxuICByZXR1cm4gUmVhY3QuRE9NLnVsKHtjbGFzc05hbWU6ICdlcnJvcmxpc3QnfSwgaXRlbXMpXG59XG5cbi8qKlxuICogRGlzcGxheXMgZXJyb3IgZGV0YWlscyBhcyB0ZXh0LlxuICovXG5FcnJvck9iamVjdC5wcm90b3R5cGUuYXNUZXh0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLmVycm9ycykubWFwKGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgdmFyIG1lc2FnZXMgPSB0aGlzLmVycm9yc1tmaWVsZF0ubWVzc2FnZXMoKVxuICAgIHJldHVybiBbJyogJyArIGZpZWxkXS5jb25jYXQobWVzYWdlcy5tYXAoZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgcmV0dXJuICgnICAqICcgKyBtZXNzYWdlKVxuICAgIH0pKS5qb2luKCdcXG4nKVxuICB9LmJpbmQodGhpcykpLmpvaW4oJ1xcbicpXG59XG5cbi8qKlxuICogQSBsaXN0IG9mIGVycm9ycyB3aGljaCBrbm93cyBob3cgdG8gZGlzcGxheSBpdHNlbGYgaW4gdmFyaW91cyBmb3JtYXRzLlxuICogQHBhcmFtIHtBcnJheT19IGxpc3QgYSBsaXN0IG9mIGVycm9ycy5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgRXJyb3JMaXN0ID0gQ29uY3VyLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBFcnJvckxpc3QobGlzdCkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBFcnJvckxpc3QpKSB7IHJldHVybiBuZXcgRXJyb3JMaXN0KGxpc3QpIH1cbiAgICB0aGlzLmRhdGEgPSBsaXN0IHx8IFtdXG4gIH1cbn0pXG5cbi8qKlxuICogQWRkcyBtb3JlIGVycm9ycy5cbiAqIEBwYXJhbSB7QXJyYXl9IGVycm9yTGlzdCBhIGxpc3Qgb2YgZXJyb3JzXG4gKi9cbkVycm9yTGlzdC5wcm90b3R5cGUuZXh0ZW5kID0gZnVuY3Rpb24oZXJyb3JMaXN0KSB7XG4gIHRoaXMuZGF0YS5wdXNoLmFwcGx5KHRoaXMuZGF0YSwgZXJyb3JMaXN0KVxufVxuXG5FcnJvckxpc3QucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5kYXRhLmxlbmd0aFxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgYW55IGVycm9ycyBhcmUgcHJlc2VudC5cbiAqL1xuRXJyb3JMaXN0LnByb3RvdHlwZS5pc1BvcHVsYXRlZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gKHRoaXMubGVuZ3RoKCkgPiAwKVxufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGxpc3Qgb2YgbWVzc2FnZXMgaGVsZCBpbiB0aGlzIEVycm9yTGlzdC5cbiAqL1xuRXJyb3JMaXN0LnByb3RvdHlwZS5tZXNzYWdlcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbWVzc2FnZXMgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgZXJyb3IgPSB0aGlzLmRhdGFbaV1cbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpIHtcbiAgICAgIGVycm9yID0gZXJyb3IubWVzc2FnZXMoKVswXVxuICAgIH1cbiAgICBtZXNzYWdlcy5wdXNoKGVycm9yKVxuICB9XG4gIHJldHVybiBtZXNzYWdlc1xufVxuXG4vKipcbiAqICBEZWZhdWx0IGRpc3BsYXkgaXMgYXMgYSBsaXN0LlxuICovXG5FcnJvckxpc3QucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5hc1VMKClcbn1cblxuLyoqXG4gKiBEaXNwbGF5cyBlcnJvcnMgYXMgYSBsaXN0LlxuICovXG5FcnJvckxpc3QucHJvdG90eXBlLmFzVUwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFJlYWN0LkRPTS51bCh7Y2xhc3NOYW1lOiAnZXJyb3JsaXN0J31cbiAgLCB0aGlzLm1lc3NhZ2VzKCkubWFwKGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICByZXR1cm4gUmVhY3QuRE9NLmxpKG51bGwsIGVycm9yKVxuICAgIH0pXG4gIClcbn1cblxuLyoqXG4gKiBEaXNwbGF5cyBlcnJvcnMgYXMgdGV4dC5cbiAqL1xuRXJyb3JMaXN0LnByb3RvdHlwZS5hc1RleHQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMubWVzc2FnZXMoKS5tYXAoZnVuY3Rpb24oZXJyb3IpIHtcbiAgICByZXR1cm4gJyogJyArIGVycm9yXG4gIH0pLmpvaW4oJ1xcbicpXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBERUZBVUxUX0RBVEVfSU5QVVRfRk9STUFUUzogREVGQVVMVF9EQVRFX0lOUFVUX0ZPUk1BVFNcbiwgREVGQVVMVF9USU1FX0lOUFVUX0ZPUk1BVFM6IERFRkFVTFRfVElNRV9JTlBVVF9GT1JNQVRTXG4sIERFRkFVTFRfREFURVRJTUVfSU5QVVRfRk9STUFUUzogREVGQVVMVF9EQVRFVElNRV9JTlBVVF9GT1JNQVRTXG4sIEVycm9yT2JqZWN0OiBFcnJvck9iamVjdFxuLCBFcnJvckxpc3Q6IEVycm9yTGlzdFxuLCBmb3JtRGF0YTogZm9ybURhdGFcbiwgaXRlcmF0ZTogaXRlcmF0ZVxuLCBwcmV0dHlOYW1lOiBwcmV0dHlOYW1lXG4sIHN0cmlwOiBzdHJpcFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29uY3VyID0gcmVxdWlyZSgnQ29uY3VyJylcbiAgLCBpcyA9IHJlcXVpcmUoJ2lzb21vcnBoL2lzJylcbiAgLCBmb3JtYXQgPSByZXF1aXJlKCdpc29tb3JwaC9mb3JtYXQnKS5mb3JtYXRPYmpcbiAgLCBvYmplY3QgPSByZXF1aXJlKCdpc29tb3JwaC9vYmplY3QnKVxuICAsIHRpbWUgPSByZXF1aXJlKCdpc29tb3JwaC90aW1lJylcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuXG4vKipcbiAqIFNvbWUgd2lkZ2V0cyBhcmUgbWFkZSBvZiBtdWx0aXBsZSBIVE1MIGVsZW1lbnRzIC0tIG5hbWVseSwgUmFkaW9TZWxlY3QuXG4gKiBUaGlzIHJlcHJlc2VudHMgdGhlIFwiaW5uZXJcIiBIVE1MIGVsZW1lbnQgb2YgYSB3aWRnZXQuXG4gKi9cbnZhciBTdWJXaWRnZXQgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFN1YldpZGdldChwYXJlbnRXaWRnZXQsIG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU3ViV2lkZ2V0KSkge1xuICAgICAgcmV0dXJuIG5ldyBTdWJXaWRnZXQocGFyZW50V2lkZ2V0LCBuYW1lLCB2YWx1ZSwga3dhcmdzKVxuICAgIH1cbiAgICB0aGlzLnBhcmVudFdpZGdldCA9IHBhcmVudFdpZGdldFxuICAgIHRoaXMubmFtZSA9IG5hbWVcbiAgICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbCwgY2hvaWNlczogW119LCBrd2FyZ3MpXG4gICAgdGhpcy5hdHRycyA9IGt3YXJncy5hdHRyc1xuICAgIHRoaXMuY2hvaWNlcyA9IGt3YXJncy5jaG9pY2VzXG4gIH1cbn0pXG5cblN1YldpZGdldC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBrd2FyZ3MgPSB7YXR0cnM6IHRoaXMuYXR0cnN9XG4gIGlmICh0aGlzLmNob2ljZXMubGVuZ3RoKSB7XG4gICAga3dhcmdzLmNob2ljZXMgPSB0aGlzLmNob2ljZXNcbiAgfVxuICByZXR1cm4gdGhpcy5wYXJlbnRXaWRnZXQucmVuZGVyKHRoaXMubmFtZSwgdGhpcy52YWx1ZSwga3dhcmdzKVxufVxuXG4vKipcbiAqIEFuIEhUTUwgZm9ybSB3aWRnZXQuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBXaWRnZXQgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFdpZGdldChrd2FyZ3MpIHtcbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbH0sIGt3YXJncylcbiAgICB0aGlzLmF0dHJzID0gb2JqZWN0LmV4dGVuZCh7fSwga3dhcmdzLmF0dHJzKVxuICB9XG4gIC8qKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhpcyBjb3JyZXNwb25kcyB0byBhbiA8aW5wdXQgdHlwZT1cImhpZGRlblwiPi4gKi9cbiwgaXNIaWRkZW46IGZhbHNlXG4gIC8qKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhpcyB3aWRnZXQgbmVlZHMgYSBtdWx0aXBhcnQtZW5jb2RlZCBmb3JtLiAqL1xuLCBuZWVkc011bHRpcGFydEZvcm06IGZhbHNlXG4gIC8qKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhpcyB3aWRnZXQgaXMgZm9yIGEgcmVxdWlyZWQgZmllbGQuLiAqL1xuLCBpc1JlcXVpcmVkOiBmYWxzZVxufSlcblxuLyoqXG4gKiBZaWVsZHMgYWxsIFwic3Vid2lkZ2V0c1wiIG9mIHRoaXMgd2lkZ2V0LiBVc2VkIG9ubHkgYnkgUmFkaW9TZWxlY3QgdG9cbiAqIGFsbG93IGFjY2VzcyB0byBpbmRpdmlkdWFsIDxpbnB1dCB0eXBlPVwicmFkaW9cIj4gYnV0dG9ucy5cbiAqXG4gKiBBcmd1bWVudHMgYXJlIHRoZSBzYW1lIGFzIGZvciByZW5kZXIoKS5cbiAqL1xuV2lkZ2V0LnByb3RvdHlwZS5zdWJXaWRnZXRzID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICByZXR1cm4gW1N1YldpZGdldCh0aGlzLCBuYW1lLCB2YWx1ZSwga3dhcmdzKV1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgV2lkZ2V0IHJlbmRlcmVkIGFzIEhUTUwuXG4gKlxuICogVGhlIHZhbHVlIGdpdmVuIGlzIG5vdCBndWFyYW50ZWVkIHRvIGJlIHZhbGlkIGlucHV0LCBzbyBzdWJjbGFzc1xuICogaW1wbGVtZW50YXRpb25zIHNob3VsZCBwcm9ncmFtIGRlZmVuc2l2ZWx5LlxuICpcbiAqIEBhYnN0cmFjdFxuICovXG5XaWRnZXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdDb25zdHJ1Y3RvcnMgZXh0ZW5kaW5nIG11c3QgaW1wbGVtZW50IGEgcmVuZGVyKCkgbWV0aG9kLicpXG59XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIGZvciBidWlsZGluZyBhbiBIVE1MIGF0dHJpYnV0ZXMgb2JqZWN0LlxuICovXG5XaWRnZXQucHJvdG90eXBlLmJ1aWxkQXR0cnMgPSBmdW5jdGlvbihleHRyYUF0dHJzLCBrd2FyZ3MpIHtcbiAgdmFyIGF0dHJzID0gb2JqZWN0LmV4dGVuZCh7fSwgdGhpcy5hdHRycywga3dhcmdzLCBleHRyYUF0dHJzKVxuICBhdHRycy5yZWYgPSBhdHRycy5pZFxuICByZXR1cm4gYXR0cnNcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgYSB2YWx1ZSBmb3IgdGhpcyB3aWRnZXQgZnJvbSB0aGUgZ2l2ZW4gZGF0YS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIGZvcm0gZGF0YS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlcyBmaWxlIGRhdGEuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSB0aGUgZmllbGQgbmFtZSB0byBiZSB1c2VkIHRvIHJldHJpZXZlIGRhdGEuXG4gKiBAcmV0dXJuIGEgdmFsdWUgZm9yIHRoaXMgd2lkZ2V0LCBvciBudWxsIGlmIG5vIHZhbHVlIHdhcyBwcm92aWRlZC5cbiAqL1xuV2lkZ2V0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhID0gZnVuY3Rpb24oZGF0YSwgZmlsZXMsIG5hbWUpIHtcbiAgcmV0dXJuIG9iamVjdC5nZXQoZGF0YSwgbmFtZSwgbnVsbClcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBIVE1MIGlkIGF0dHJpYnV0ZSBvZiB0aGlzIFdpZGdldCBmb3IgdXNlIGJ5IGFcbiAqIDxsYWJlbD4sIGdpdmVuIHRoZSBpZCBvZiB0aGUgZmllbGQuXG4gKlxuICogVGhpcyBob29rIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIHNvbWUgd2lkZ2V0cyBoYXZlIG11bHRpcGxlIEhUTUwgZWxlbWVudHMgYW5kLFxuICogdGh1cywgbXVsdGlwbGUgaWRzLiBJbiB0aGF0IGNhc2UsIHRoaXMgbWV0aG9kIHNob3VsZCByZXR1cm4gYW4gSUQgdmFsdWUgdGhhdFxuICogY29ycmVzcG9uZHMgdG8gdGhlIGZpcnN0IGlkIGluIHRoZSB3aWRnZXQncyB0YWdzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBpZCBhIGZpZWxkIGlkLlxuICogQHJldHVybiB0aGUgaWQgd2hpY2ggc2hvdWxkIGJlIHVzZWQgYnkgYSA8bGFiZWw+PiBmb3IgdGhpcyBXaWRnZXQuXG4gKi9cbldpZGdldC5wcm90b3R5cGUuaWRGb3JMYWJlbCA9IGZ1bmN0aW9uKGlkKSB7XG4gIHJldHVybiBpZFxufVxuXG4vKipcbiAqIEFuIEhUTUwgPGlucHV0PiB3aWRnZXQuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtXaWRnZXR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgSW5wdXQgPSBXaWRnZXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIElucHV0KGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXaWRnZXQpKSB7IHJldHVybiBuZXcgSW5wdXQoa3dhcmdzKSB9XG4gICAgV2lkZ2V0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4gIC8qKiBUaGUgdHlwZSBhdHRyaWJ1dGUgb2YgdGhpcyBpbnB1dCAtIHN1YmNsYXNzZXMgbXVzdCBkZWZpbmUgaXQuICovXG4sIGlucHV0VHlwZTogbnVsbFxufSlcblxuSW5wdXQucHJvdG90eXBlLl9mb3JtYXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZVxufVxuXG5JbnB1dC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbH0sIGt3YXJncylcbiAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgdmFsdWUgPSAnJ1xuICB9XG4gIHZhciBmaW5hbEF0dHJzID0gdGhpcy5idWlsZEF0dHJzKGt3YXJncy5hdHRycywge3R5cGU6IHRoaXMuaW5wdXRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lfSlcbiAgaWYgKHZhbHVlICE9PSAnJykge1xuICAgIC8vIE9ubHkgYWRkIHRoZSB2YWx1ZSBhdHRyaWJ1dGUgaWYgdmFsdWUgaXMgbm9uLWVtcHR5XG4gICAgZmluYWxBdHRycy5kZWZhdWx0VmFsdWUgPSAnJyt0aGlzLl9mb3JtYXRWYWx1ZSh2YWx1ZSlcbiAgfVxuICByZXR1cm4gUmVhY3QuRE9NLmlucHV0KGZpbmFsQXR0cnMpXG59XG5cbi8qKlxuICogQW4gSFRNTCA8aW5wdXQgdHlwZT1cInRleHRcIj4gd2lkZ2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7SW5wdXR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgVGV4dElucHV0ID0gSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFRleHRJbnB1dChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IFRleHRJbnB1dChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbH0sIGt3YXJncylcbiAgICBpZiAoa3dhcmdzLmF0dHJzICE9IG51bGwpIHtcbiAgICAgIHRoaXMuaW5wdXRUeXBlID0gb2JqZWN0LnBvcChrd2FyZ3MuYXR0cnMsICd0eXBlJywgdGhpcy5pbnB1dFR5cGUpXG4gICAgfVxuICAgIElucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIGlucHV0VHlwZTogJ3RleHQnXG59KVxuXG4vKipcbiAqIEFuIEhUTUwgPGlucHV0IHR5cGU9XCJudW1iZXJcIj4gd2lkZ2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7VGV4dElucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIE51bWJlcklucHV0ID0gVGV4dElucHV0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBOdW1iZXJJbnB1dChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IE51bWJlcklucHV0KGt3YXJncykgfVxuICAgIFRleHRJbnB1dC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuLCBpbnB1dFR5cGU6ICdudW1iZXInXG59KVxuXG4vKipcbiAqIEFuIEhUTUwgPGlucHV0IHR5cGU9XCJlbWFpbFwiPiB3aWRnZXQuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtUZXh0SW5wdXR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgRW1haWxJbnB1dCA9IFRleHRJbnB1dC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gRW1haWxJbnB1dChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IEVtYWlsSW5wdXQoa3dhcmdzKSB9XG4gICAgVGV4dElucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIGlucHV0VHlwZTogJ2VtYWlsJ1xufSlcblxuLyoqXG4gKiBBbiBIVE1MIDxpbnB1dCB0eXBlPVwidXJsXCI+IHdpZGdldC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1RleHRJbnB1dH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBVUkxJbnB1dCA9IFRleHRJbnB1dC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gVVJMSW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBVUkxJbnB1dChrd2FyZ3MpIH1cbiAgICBUZXh0SW5wdXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgaW5wdXRUeXBlOiAndXJsJ1xufSlcblxuLyoqXG4gKiBBbiBIVE1MIDxpbnB1dCB0eXBlPVwicGFzc3dvcmRcIj4gd2lkZ2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7VGV4dElucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFBhc3N3b3JkSW5wdXQgPSBUZXh0SW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFBhc3N3b3JkSW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBQYXNzd29yZElucHV0KGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe3JlbmRlclZhbHVlOiBmYWxzZX0sIGt3YXJncylcbiAgICBUZXh0SW5wdXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgdGhpcy5yZW5kZXJWYWx1ZSA9IGt3YXJncy5yZW5kZXJWYWx1ZVxuICB9XG4sIGlucHV0VHlwZTogJ3Bhc3N3b3JkJ1xufSlcblxuUGFzc3dvcmRJbnB1dC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICBpZiAoIXRoaXMucmVuZGVyVmFsdWUpIHtcbiAgICB2YWx1ZSA9ICcnXG4gIH1cbiAgcmV0dXJuIFRleHRJbnB1dC5wcm90b3R5cGUucmVuZGVyLmNhbGwodGhpcywgbmFtZSwgdmFsdWUsIGt3YXJncylcbn1cblxuLyoqXG4gKiBBbiBIVE1MIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCI+IHdpZGdldC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0lucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEhpZGRlbklucHV0ID0gSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIEhpZGRlbklucHV0KGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXaWRnZXQpKSB7IHJldHVybiBuZXcgSGlkZGVuSW5wdXQoa3dhcmdzKSB9XG4gICAgSW5wdXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgaW5wdXRUeXBlOiAnaGlkZGVuJ1xuLCBpc0hpZGRlbjogdHJ1ZVxufSlcblxuLyoqXG4gKiBBIHdpZGdldCB0aGF0IGhhbmRsZXMgPGlucHV0IHR5cGU9XCJoaWRkZW5cIj4gZm9yIGZpZWxkcyB0aGF0IGhhdmUgYSBsaXN0IG9mXG4gKiB2YWx1ZXMuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtIaWRkZW5JbnB1dH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBNdWx0aXBsZUhpZGRlbklucHV0ID0gSGlkZGVuSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIE11bHRpcGxlSGlkZGVuSW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBNdWx0aXBsZUhpZGRlbklucHV0KGt3YXJncykgfVxuICAgIEhpZGRlbklucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuXG5NdWx0aXBsZUhpZGRlbklucHV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiBudWxsfSwga3dhcmdzKVxuICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICB2YWx1ZSA9IFtdXG4gIH1cbiAgdmFyIGZpbmFsQXR0cnMgPSB0aGlzLmJ1aWxkQXR0cnMoa3dhcmdzLmF0dHJzLCB7dHlwZTogdGhpcy5pbnB1dFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWV9KVxuICAgICwgaWQgPSBvYmplY3QuZ2V0KGZpbmFsQXR0cnMsICdpZCcsIG51bGwpXG4gICAgLCBpbnB1dHMgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBpbnB1dEF0dHJzID0gb2JqZWN0LmV4dGVuZCh7fSwgZmluYWxBdHRycywge3ZhbHVlOiB2YWx1ZVtpXX0pXG4gICAgaWYgKGlkKSB7XG4gICAgICAvLyBBbiBJRCBhdHRyaWJ1dGUgd2FzIGdpdmVuLiBBZGQgYSBudW1lcmljIGluZGV4IGFzIGEgc3VmZml4XG4gICAgICAvLyBzbyB0aGF0IHRoZSBpbnB1dHMgZG9uJ3QgYWxsIGhhdmUgdGhlIHNhbWUgSUQgYXR0cmlidXRlLlxuICAgICAgaW5wdXRBdHRycy5pZCA9IGZvcm1hdCgne2lkfV97aX0nLCB7aWQ6IGlkLCBpOiBpfSlcbiAgICB9XG4gICAgaW5wdXRzLnB1c2goUmVhY3QuRE9NLmlucHV0KGlucHV0QXR0cnMpKVxuICB9XG4gIHJldHVybiBSZWFjdC5ET00uZGl2KG51bGwsIGlucHV0cylcbn1cblxuTXVsdGlwbGVIaWRkZW5JbnB1dC5wcm90b3R5cGUudmFsdWVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGEsIGZpbGVzLCBuYW1lKSB7XG4gIGlmICh0eXBlb2YgZGF0YVtuYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBbXS5jb25jYXQoZGF0YVtuYW1lXSlcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG4vKipcbiAqIEFuIEhUTUwgPGlucHV0IHR5cGU9XCJmaWxlXCI+IHdpZGdldC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0lucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEZpbGVJbnB1dCA9IElucHV0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBGaWxlSW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBGaWxlSW5wdXQoa3dhcmdzKSB9XG4gICAgSW5wdXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgaW5wdXRUeXBlOiAnZmlsZSdcbiwgbmVlZHNNdWx0aXBhcnRGb3JtOiB0cnVlXG59KVxuXG5GaWxlSW5wdXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAgcmV0dXJuIElucHV0LnByb3RvdHlwZS5yZW5kZXIuY2FsbCh0aGlzLCBuYW1lLCBudWxsLCBrd2FyZ3MpXG59XG5cbi8qKlxuICogRmlsZSB3aWRnZXRzIHRha2UgZGF0YSBmcm9tIGZpbGVzLCBub3QgZGF0YS5cbiAqL1xuRmlsZUlucHV0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhID0gZnVuY3Rpb24oZGF0YSwgZmlsZXMsIG5hbWUpIHtcbiAgcmV0dXJuIG9iamVjdC5nZXQoZmlsZXMsIG5hbWUsIG51bGwpXG59XG5cbnZhciBGSUxFX0lOUFVUX0NPTlRSQURJQ1RJT04gPSB7fVxuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpbGVJbnB1dH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBDbGVhcmFibGVGaWxlSW5wdXQgPSBGaWxlSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIENsZWFyYWJsZUZpbGVJbnB1dChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IENsZWFyYWJsZUZpbGVJbnB1dChrd2FyZ3MpIH1cbiAgICBGaWxlSW5wdXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgaW5pdGlhbFRleHQ6ICdDdXJyZW50bHknXG4sIGlucHV0VGV4dDogJ0NoYW5nZSdcbiwgY2xlYXJDaGVja2JveExhYmVsOiAnQ2xlYXInXG59KVxuXG4vKipcbiAqIEdpdmVuIHRoZSBuYW1lIG9mIHRoZSBmaWxlIGlucHV0LCByZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGNsZWFyIGNoZWNrYm94XG4gKiBpbnB1dC5cbiAqL1xuQ2xlYXJhYmxlRmlsZUlucHV0LnByb3RvdHlwZS5jbGVhckNoZWNrYm94TmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuIG5hbWUgKyAnLWNsZWFyJ1xufVxuXG4vKipcbiAqIEdpdmVuIHRoZSBuYW1lIG9mIHRoZSBjbGVhciBjaGVja2JveCBpbnB1dCwgcmV0dXJuIHRoZSBIVE1MIGlkIGZvciBpdC5cbiAqL1xuQ2xlYXJhYmxlRmlsZUlucHV0LnByb3RvdHlwZS5jbGVhckNoZWNrYm94SWQgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHJldHVybiBuYW1lICsgJ19pZCdcbn1cblxuQ2xlYXJhYmxlRmlsZUlucHV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIHZhciBpbnB1dCA9IEZpbGVJbnB1dC5wcm90b3R5cGUucmVuZGVyLmNhbGwodGhpcywgbmFtZSwgdmFsdWUsIGt3YXJncylcbiAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZS51cmwgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB2YXIgY29udGVudHMgPSBbXG4gICAgICB0aGlzLmluaXRpYWxUZXh0LCAnOiAnXG4gICAgLCBSZWFjdC5ET00uYSh7aHJlZjogdmFsdWUudXJsfSwgJycrdmFsdWUpLCAnICdcbiAgICBdXG4gICAgaWYgKCF0aGlzLmlzUmVxdWlyZWQpIHtcbiAgICAgIHZhciBjbGVhckNoZWNrYm94TmFtZSA9IHRoaXMuY2xlYXJDaGVja2JveE5hbWUobmFtZSlcbiAgICAgIHZhciBjbGVhckNoZWNrYm94SWQgPSB0aGlzLmNsZWFyQ2hlY2tib3hJZChjbGVhckNoZWNrYm94TmFtZSlcbiAgICAgIGNvbnRlbnRzID0gY29udGVudHMuY29uY2F0KFtcbiAgICAgICAgQ2hlY2tib3hJbnB1dCgpLnJlbmRlcihcbiAgICAgICAgICAgIGNsZWFyQ2hlY2tib3hOYW1lLCBmYWxzZSwge2F0dHJzOiB7J2lkJzogY2xlYXJDaGVja2JveElkfX0pXG4gICAgICAsICcgJ1xuICAgICAgLCBSZWFjdC5ET00ubGFiZWwoe2h0bWxGb3I6IGNsZWFyQ2hlY2tib3hJZH0sIHRoaXMuY2xlYXJDaGVja2JveExhYmVsKVxuICAgICAgXSlcbiAgICB9XG4gICAgY29udGVudHMgPSBjb250ZW50cy5jb25jYXQoW1xuICAgICAgUmVhY3QuRE9NLmJyKG51bGwpXG4gICAgLCB0aGlzLmlucHV0VGV4dCwgJzogJ1xuICAgICwgaW5wdXRcbiAgICBdKVxuICAgIHJldHVybiBSZWFjdC5ET00uZGl2KG51bGwsIGNvbnRlbnRzKVxuICB9XG4gIGVsc2Uge1xuICAgICAgcmV0dXJuIGlucHV0XG4gIH1cbn1cblxuQ2xlYXJhYmxlRmlsZUlucHV0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhID0gZnVuY3Rpb24oZGF0YSwgZmlsZXMsIG5hbWUpIHtcbiAgdmFyIHVwbG9hZCA9IEZpbGVJbnB1dC5wcm90b3R5cGUudmFsdWVGcm9tRGF0YShkYXRhLCBmaWxlcywgbmFtZSlcbiAgaWYgKCF0aGlzLmlzUmVxdWlyZWQgJiZcbiAgICAgIENoZWNrYm94SW5wdXQoKS52YWx1ZUZyb21EYXRhKGRhdGEsIGZpbGVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGVhckNoZWNrYm94TmFtZShuYW1lKSkpIHtcbiAgICBpZiAodXBsb2FkKSB7XG4gICAgICAvLyBJZiB0aGUgdXNlciBjb250cmFkaWN0cyB0aGVtc2VsdmVzICh1cGxvYWRzIGEgbmV3IGZpbGUgQU5EXG4gICAgICAvLyBjaGVja3MgdGhlIFwiY2xlYXJcIiBjaGVja2JveCksIHdlIHJldHVybiBhIHVuaXF1ZSBtYXJrZXJcbiAgICAgIC8vIG9iamVjdCB0aGF0IEZpbGVGaWVsZCB3aWxsIHR1cm4gaW50byBhIFZhbGlkYXRpb25FcnJvci5cbiAgICAgIHJldHVybiBGSUxFX0lOUFVUX0NPTlRSQURJQ1RJT05cbiAgICB9XG4gICAgLy8gZmFsc2Ugc2lnbmFscyB0byBjbGVhciBhbnkgZXhpc3RpbmcgdmFsdWUsIGFzIG9wcG9zZWQgdG8ganVzdCBudWxsXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgcmV0dXJuIHVwbG9hZFxufVxuXG4vKipcbiAqIEFuIEhUTUwgPHRleHRhcmVhPiB3aWRnZXQuXG4gKiBAcGFyYW0ge09iamVjdH0gW2t3YXJnc10gY29uZmlndXJhdGlvbiBvcHRpb25zXG4gKiBAY29uZmlnIHtPYmplY3R9IFthdHRyc10gSFRNTCBhdHRyaWJ1dGVzIGZvciB0aGUgcmVuZGVyZWQgd2lkZ2V0LiBEZWZhdWx0XG4gKiAgIHJvd3MgYW5kIGNvbHMgYXR0cmlidXRlcyB3aWxsIGJlIHVzZWQgaWYgbm90IHByb3ZpZGVkLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7V2lkZ2V0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFRleHRhcmVhID0gV2lkZ2V0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBUZXh0YXJlYShrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IFRleHRhcmVhKGt3YXJncykgfVxuICAgIC8vIEVuc3VyZSB3ZSBoYXZlIHNvbWV0aGluZyBpbiBhdHRyc1xuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiBudWxsfSwga3dhcmdzKVxuICAgIC8vIFByb3ZpZGUgZGVmYXVsdCAnY29scycgYW5kICdyb3dzJyBhdHRyaWJ1dGVzXG4gICAga3dhcmdzLmF0dHJzID0gb2JqZWN0LmV4dGVuZCh7cm93czogJzEwJywgY29sczogJzQwJ30sIGt3YXJncy5hdHRycylcbiAgICBXaWRnZXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5cblRleHRhcmVhLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiBudWxsfSwga3dhcmdzKVxuICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICB2YWx1ZSA9ICcnXG4gIH1cbiAgdmFyIGZpbmFsQXR0cnMgPSB0aGlzLmJ1aWxkQXR0cnMoa3dhcmdzLmF0dHJzLCB7bmFtZTogbmFtZSwgZGVmYXVsdFZhbHVlOiB2YWx1ZX0pXG4gIHJldHVybiBSZWFjdC5ET00udGV4dGFyZWEoZmluYWxBdHRycylcbn1cblxuLyoqXG4gKiBBIDxpbnB1dCB0eXBlPVwidGV4dFwiPiB3aGljaCwgaWYgZ2l2ZW4gYSBEYXRlIG9iamVjdCB0byBkaXNwbGF5LCBmb3JtYXRzIGl0IGFzXG4gKiBhbiBhcHByb3ByaWF0ZSBkYXRlL3RpbWUgU3RyaW5nLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7VGV4dElucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIERhdGVUaW1lQmFzZUlucHV0ID0gVGV4dElucHV0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBEYXRlVGltZUJhc2VJbnB1dChrd2FyZ3MpIHtcbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtmb3JtYXQ6IG51bGx9LCBrd2FyZ3MpXG4gICAgVGV4dElucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICAgIHRoaXMuZm9ybWF0ID0gKGt3YXJncy5mb3JtYXQgIT09IG51bGwgPyBrd2FyZ3MuZm9ybWF0IDogdGhpcy5kZWZhdWx0Rm9ybWF0KVxuICB9XG59KVxuXG5EYXRlVGltZUJhc2VJbnB1dC5wcm90b3R5cGUuX2Zvcm1hdFZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKGlzLkRhdGUodmFsdWUpKSB7XG4gICAgcmV0dXJuIHRpbWUuc3RyZnRpbWUodmFsdWUsIHRoaXMuZm9ybWF0KVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0RhdGVUaW1lQmFzZUlucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIERhdGVJbnB1dCA9IERhdGVUaW1lQmFzZUlucHV0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBEYXRlSW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIERhdGVJbnB1dCkpIHsgcmV0dXJuIG5ldyBEYXRlSW5wdXQoa3dhcmdzKSB9XG4gICAgRGF0ZVRpbWVCYXNlSW5wdXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgZGVmYXVsdEZvcm1hdDogdXRpbC5ERUZBVUxUX0RBVEVfSU5QVVRfRk9STUFUU1swXVxufSlcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtEYXRlVGltZUJhc2VJbnB1dH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBEYXRlVGltZUlucHV0ID0gRGF0ZVRpbWVCYXNlSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIERhdGVUaW1lSW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIERhdGVUaW1lSW5wdXQpKSB7IHJldHVybiBuZXcgRGF0ZVRpbWVJbnB1dChrd2FyZ3MpIH1cbiAgICBEYXRlVGltZUJhc2VJbnB1dC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuLCBkZWZhdWx0Rm9ybWF0OiB1dGlsLkRFRkFVTFRfREFURVRJTUVfSU5QVVRfRk9STUFUU1swXVxufSlcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtEYXRlVGltZUJhc2VJbnB1dH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBUaW1lSW5wdXQgPSBEYXRlVGltZUJhc2VJbnB1dC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gVGltZUlucHV0KGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBUaW1lSW5wdXQpKSB7IHJldHVybiBuZXcgVGltZUlucHV0KGt3YXJncykgfVxuICAgIERhdGVUaW1lQmFzZUlucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIGRlZmF1bHRGb3JtYXQ6IHV0aWwuREVGQVVMVF9USU1FX0lOUFVUX0ZPUk1BVFNbMF1cbn0pXG5cbnZhciBkZWZhdWx0Q2hlY2tUZXN0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSAhPT0gZmFsc2UgJiZcbiAgICAgICAgICB2YWx1ZSAhPT0gbnVsbCAmJlxuICAgICAgICAgIHZhbHVlICE9PSAnJylcbn1cblxuLyoqXG4gKiBBbiBIVE1MIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIj4gd2lkZ2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7V2lkZ2V0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIENoZWNrYm94SW5wdXQgPSBXaWRnZXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIENoZWNrYm94SW5wdXQoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBDaGVja2JveElucHV0KGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2NoZWNrVGVzdDogZGVmYXVsdENoZWNrVGVzdH0sIGt3YXJncylcbiAgICBXaWRnZXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgdGhpcy5jaGVja1Rlc3QgPSBrd2FyZ3MuY2hlY2tUZXN0XG4gIH1cbn0pXG5cbkNoZWNrYm94SW5wdXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7YXR0cnM6IG51bGx9LCBrd2FyZ3MpXG4gIHZhciBjaGVja2VkID0gdGhpcy5jaGVja1Rlc3QodmFsdWUpXG4gIHZhciBmaW5hbEF0dHJzID0gdGhpcy5idWlsZEF0dHJzKGt3YXJncy5hdHRycywge3R5cGU6ICdjaGVja2JveCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWV9KVxuICBpZiAodmFsdWUgIT09ICcnICYmIHZhbHVlICE9PSB0cnVlICYmIHZhbHVlICE9PSBmYWxzZSAmJiB2YWx1ZSAhPT0gbnVsbCAmJlxuICAgICAgdmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9ubHkgYWRkIHRoZSB2YWx1ZSBhdHRyaWJ1dGUgaWYgdmFsdWUgaXMgbm9uLWVtcHR5XG4gICAgZmluYWxBdHRycy52YWx1ZSA9IHZhbHVlXG4gIH1cbiAgaWYgKGNoZWNrZWQpIHtcbiAgICBmaW5hbEF0dHJzLmRlZmF1bHRDaGVja2VkID0gJ2NoZWNrZWQnXG4gIH1cbiAgcmV0dXJuIFJlYWN0LkRPTS5pbnB1dChmaW5hbEF0dHJzKVxufVxuXG5DaGVja2JveElucHV0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhID0gZnVuY3Rpb24oZGF0YSwgZmlsZXMsIG5hbWUpIHtcbiAgaWYgKHR5cGVvZiBkYXRhW25hbWVdID09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gIEEgbWlzc2luZyB2YWx1ZSBtZWFucyBGYWxzZSBiZWNhdXNlIEhUTUwgZm9ybSBzdWJtaXNzaW9uIGRvZXMgbm90XG4gICAgLy8gc2VuZCByZXN1bHRzIGZvciB1bnNlbGVjdGVkIGNoZWNrYm94ZXMuXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgdmFyIHZhbHVlID0gZGF0YVtuYW1lXVxuICAgICwgdmFsdWVzID0geyd0cnVlJzogdHJ1ZSwgJ2ZhbHNlJzogZmFsc2V9XG4gIC8vIFRyYW5zbGF0ZSB0cnVlIGFuZCBmYWxzZSBzdHJpbmdzIHRvIGJvb2xlYW4gdmFsdWVzXG4gIGlmIChpcy5TdHJpbmcodmFsdWUpKSB7XG4gICAgdmFsdWUgPSBvYmplY3QuZ2V0KHZhbHVlcywgdmFsdWUudG9Mb3dlckNhc2UoKSwgdmFsdWUpXG4gIH1cbiAgcmV0dXJuICEhdmFsdWVcbn1cblxuLyoqXG4gKiBBbiBIVE1MIDxzZWxlY3Q+IHdpZGdldC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1dpZGdldH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBTZWxlY3QgPSBXaWRnZXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFNlbGVjdChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IFNlbGVjdChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtjaG9pY2VzOiBbXX0sIGt3YXJncylcbiAgICBXaWRnZXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgdGhpcy5jaG9pY2VzID0ga3dhcmdzLmNob2ljZXMgfHwgW11cbiAgfVxuLCBhbGxvd011bHRpcGxlU2VsZWN0ZWQ6IGZhbHNlXG59KVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIHdpZGdldC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIHRoZSBmaWVsZCBuYW1lLlxuICogQHBhcmFtIHNlbGVjdGVkVmFsdWUgdGhlIHZhbHVlIG9mIGFuIG9wdGlvbiB3aGljaCBzaG91bGQgYmUgbWFya2VkIGFzXG4gKiAgIHNlbGVjdGVkLCBvciBudWxsIGlmIG5vIHZhbHVlIGlzIHNlbGVjdGVkIC0tIHdpbGwgYmUgbm9ybWFsaXNlZCB0byBhIFN0cmluZ1xuICogICBmb3IgY29tcGFyaXNvbiB3aXRoIGNob2ljZSB2YWx1ZXMuXG4gKiBAcGFyYW0ge09iamVjdH0gW2F0dHJzXSBhZGRpdGlvbmFsIEhUTUwgYXR0cmlidXRlcyBmb3IgdGhlIHJlbmRlcmVkIHdpZGdldC5cbiAqIEBwYXJhbSB7QXJyYXl9IFtjaG9pY2VzXSBjaG9pY2VzIHRvIGJlIHVzZWQgd2hlbiByZW5kZXJpbmcgdGhlIHdpZGdldCwgaW5cbiAqICAgYWRkaXRpb24gdG8gdGhvc2UgYWxyZWFkeSBoZWxkIGJ5IHRoZSB3aWRnZXQgaXRzZWxmLlxuICogQHJldHVybiBhIDxzZWxlY3Q+IGVsZW1lbnQuXG4gKi9cblNlbGVjdC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgc2VsZWN0ZWRWYWx1ZSwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiBudWxsLCBjaG9pY2VzOiBbXX0sIGt3YXJncylcbiAgaWYgKHNlbGVjdGVkVmFsdWUgPT09IG51bGwpIHtcbiAgICBzZWxlY3RlZFZhbHVlID0gJydcbiAgfVxuICB2YXIgZmluYWxBdHRycyA9IHRoaXMuYnVpbGRBdHRycyhrd2FyZ3MuYXR0cnMsIHtuYW1lOiBuYW1lfSlcbiAgdmFyIG9wdGlvbnMgPSB0aGlzLnJlbmRlck9wdGlvbnMoa3dhcmdzLmNob2ljZXMsIFtzZWxlY3RlZFZhbHVlXSlcbiAgcmV0dXJuIFJlYWN0LkRPTS5zZWxlY3QoZmluYWxBdHRycywgb3B0aW9ucylcbn1cblxuU2VsZWN0LnByb3RvdHlwZS5yZW5kZXJPcHRpb25zID0gZnVuY3Rpb24oY2hvaWNlcywgc2VsZWN0ZWRWYWx1ZXMpIHtcbiAgLy8gTm9ybWFsaXNlIHRvIHN0cmluZ3NcbiAgdmFyIHNlbGVjdGVkVmFsdWVzTG9va3VwID0ge31cbiAgLy8gV2UgZG9uJ3QgZHVjayB0eXBlIHBhc3Npbmcgb2YgYSBTdHJpbmcsIGFzIGluZGV4IGFjY2VzcyB0byBjaGFyYWN0ZXJzIGlzbid0XG4gIC8vIHBhcnQgb2YgdGhlIHNwZWMuXG4gIHZhciBzZWxlY3RlZFZhbHVlU3RyaW5nID0gKGlzLlN0cmluZyhzZWxlY3RlZFZhbHVlcykpXG4gIHZhciBpLCBsXG4gIGZvciAoaSA9IDAsIGwgPSBzZWxlY3RlZFZhbHVlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBzZWxlY3RlZFZhbHVlc0xvb2t1cFsnJysoc2VsZWN0ZWRWYWx1ZVN0cmluZyA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkVmFsdWVzLmNoYXJBdChpKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkVmFsdWVzW2ldKV0gPSB0cnVlXG4gIH1cblxuICB2YXIgb3B0aW9ucyA9IFtdXG4gICAgLCBmaW5hbENob2ljZXMgPSB1dGlsLml0ZXJhdGUodGhpcy5jaG9pY2VzKS5jb25jYXQoY2hvaWNlcyB8fCBbXSlcbiAgZm9yIChpID0gMCwgbCA9IGZpbmFsQ2hvaWNlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoaXMuQXJyYXkoZmluYWxDaG9pY2VzW2ldWzFdKSkge1xuICAgICAgdmFyIG9wdGdyb3VwT3B0aW9ucyA9IFtdXG4gICAgICAgICwgb3B0Z3JvdXBDaG9pY2VzID0gZmluYWxDaG9pY2VzW2ldWzFdXG4gICAgICBmb3IgKHZhciBqID0gMCwgayA9IG9wdGdyb3VwQ2hvaWNlcy5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgb3B0Z3JvdXBPcHRpb25zLnB1c2godGhpcy5yZW5kZXJPcHRpb24oc2VsZWN0ZWRWYWx1ZXNMb29rdXAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGdyb3VwQ2hvaWNlc1tqXVswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0Z3JvdXBDaG9pY2VzW2pdWzFdKSlcbiAgICAgIH1cbiAgICAgIG9wdGlvbnMucHVzaChSZWFjdC5ET00ub3B0Z3JvdXAoe2xhYmVsOiBmaW5hbENob2ljZXNbaV1bMF19LCBvcHRncm91cE9wdGlvbnMpKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIG9wdGlvbnMucHVzaCh0aGlzLnJlbmRlck9wdGlvbihzZWxlY3RlZFZhbHVlc0xvb2t1cCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbENob2ljZXNbaV1bMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxDaG9pY2VzW2ldWzFdKSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9wdGlvbnNcbn1cblxuU2VsZWN0LnByb3RvdHlwZS5yZW5kZXJPcHRpb24gPSBmdW5jdGlvbihzZWxlY3RlZFZhbHVlc0xvb2t1cCwgb3B0VmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdExhYmVsKSB7XG4gIG9wdFZhbHVlID0gJycrb3B0VmFsdWVcbiAgdmFyIGF0dHJzID0ge3ZhbHVlOiBvcHRWYWx1ZX1cbiAgaWYgKHR5cGVvZiBzZWxlY3RlZFZhbHVlc0xvb2t1cFtvcHRWYWx1ZV0gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBhdHRyc1snc2VsZWN0ZWQnXSA9ICdzZWxlY3RlZCdcbiAgICBpZiAoIXRoaXMuYWxsb3dNdWx0aXBsZVNlbGVjdGVkKSB7XG4gICAgICAvLyBPbmx5IGFsbG93IGZvciBhIHNpbmdsZSBzZWxlY3Rpb24gd2l0aCB0aGlzIHZhbHVlXG4gICAgICBkZWxldGUgc2VsZWN0ZWRWYWx1ZXNMb29rdXBbb3B0VmFsdWVdXG4gICAgfVxuICB9XG4gIHJldHVybiBSZWFjdC5ET00ub3B0aW9uKGF0dHJzLCBvcHRMYWJlbClcbn1cblxuLyoqXG4gKiBBIDxzZWxlY3Q+IHdpZGdldCBpbnRlbmRlZCB0byBiZSB1c2VkIHdpdGggTnVsbEJvb2xlYW5GaWVsZC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1NlbGVjdH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBOdWxsQm9vbGVhblNlbGVjdCA9IFNlbGVjdC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gTnVsbEJvb2xlYW5TZWxlY3Qoa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBOdWxsQm9vbGVhblNlbGVjdChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBrd2FyZ3MgfHwge31cbiAgICAvLyBTZXQgb3Igb3ZlcnJyaWRlIGNob2ljZXNcbiAgICBrd2FyZ3MuY2hvaWNlcyA9IFtbJzEnLCAnVW5rbm93biddLCBbJzInLCAnWWVzJ10sIFsnMycsICdObyddXVxuICAgIFNlbGVjdC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuTnVsbEJvb2xlYW5TZWxlY3QucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAgaWYgKHZhbHVlID09PSB0cnVlIHx8IHZhbHVlID09ICcyJykge1xuICAgIHZhbHVlID0gJzInXG4gIH1cbiAgZWxzZSBpZiAodmFsdWUgPT09IGZhbHNlIHx8IHZhbHVlID09ICczJykge1xuICAgIHZhbHVlID0gJzMnXG4gIH1cbiAgZWxzZSB7XG4gICAgdmFsdWUgPSAnMSdcbiAgfVxuICByZXR1cm4gU2VsZWN0LnByb3RvdHlwZS5yZW5kZXIuY2FsbCh0aGlzLCBuYW1lLCB2YWx1ZSwga3dhcmdzKVxufVxuXG5OdWxsQm9vbGVhblNlbGVjdC5wcm90b3R5cGUudmFsdWVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGEsIGZpbGVzLCBuYW1lKSB7XG4gIHZhciB2YWx1ZSA9IG51bGxcbiAgaWYgKHR5cGVvZiBkYXRhW25hbWVdICE9ICd1bmRlZmluZWQnKSB7XG4gICAgdmFyIGRhdGFWYWx1ZSA9IGRhdGFbbmFtZV1cbiAgICBpZiAoZGF0YVZhbHVlID09PSB0cnVlIHx8IGRhdGFWYWx1ZSA9PSAnVHJ1ZScgfHwgZGF0YVZhbHVlID09ICd0cnVlJyB8fFxuICAgICAgICBkYXRhVmFsdWUgPT0gJzInKSB7XG4gICAgICB2YWx1ZSA9IHRydWVcbiAgICB9XG4gICAgZWxzZSBpZiAoZGF0YVZhbHVlID09PSBmYWxzZSB8fCBkYXRhVmFsdWUgPT0gJ0ZhbHNlJyB8fFxuICAgICAgICAgICAgIGRhdGFWYWx1ZSA9PSAnZmFsc2UnIHx8IGRhdGFWYWx1ZSA9PSAnMycpIHtcbiAgICAgIHZhbHVlID0gZmFsc2VcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbi8qKlxuICogQW4gSFRNTCA8c2VsZWN0PiB3aWRnZXQgd2hpY2ggYWxsb3dzIG11bHRpcGxlIHNlbGVjdGlvbnMuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtTZWxlY3R9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgU2VsZWN0TXVsdGlwbGUgPSBTZWxlY3QuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFNlbGVjdE11bHRpcGxlKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXaWRnZXQpKSB7IHJldHVybiBuZXcgU2VsZWN0TXVsdGlwbGUoa3dhcmdzKSB9XG4gICAgU2VsZWN0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIGFsbG93TXVsdGlwbGVTZWxlY3RlZDogdHJ1ZVxufSlcblxuLyoqXG4gKiBSZW5kZXJzIHRoZSB3aWRnZXQuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSB0aGUgZmllbGQgbmFtZS5cbiAqIEBwYXJhbSB7QXJyYXl9IHNlbGVjdGVkVmFsdWVzIHRoZSB2YWx1ZXMgb2Ygb3B0aW9ucyB3aGljaCBzaG91bGQgYmUgbWFya2VkIGFzXG4gKiAgIHNlbGVjdGVkLCBvciBudWxsIGlmIG5vIHZhbHVlcyBhcmUgc2VsZWN0ZWQgLSB0aGVzZSB3aWxsIGJlIG5vcm1hbGlzZWQgdG9cbiAqICAgU3RyaW5ncyBmb3IgY29tcGFyaXNvbiB3aXRoIGNob2ljZSB2YWx1ZXMuXG4gKiBAcGFyYW0ge09iamVjdH0gW2t3YXJnc10gYWRkaXRpb25hbCByZW5kZXJpbmcgb3B0aW9ucy5cbiAqIEBjb25maWcge09iamVjdH0gW2F0dHJzXSBhZGRpdGlvbmFsIEhUTUwgYXR0cmlidXRlcyBmb3IgdGhlIHJlbmRlcmVkIHdpZGdldC5cbiAqIEBjb25maWcge0FycmF5fSBbY2hvaWNlc10gY2hvaWNlcyB0byBiZSB1c2VkIHdoZW4gcmVuZGVyaW5nIHRoZSB3aWRnZXQsIGluXG4gKiAgIGFkZGl0aW9uIHRvIHRob3NlIGFscmVhZHkgaGVsZCBieSB0aGUgd2lkZ2V0IGl0c2VsZi5cbiAqIEByZXR1cm4gYSA8c2VsZWN0PiBlbGVtZW50IHdoaWNoIGFsbG93cyBtdWx0aXBsZSBzZWxlY3Rpb25zLlxuICovXG5TZWxlY3RNdWx0aXBsZS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgc2VsZWN0ZWRWYWx1ZXMsIGt3YXJncykge1xuICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbCwgY2hvaWNlczogW119LCBrd2FyZ3MpXG4gIGlmIChzZWxlY3RlZFZhbHVlcyA9PT0gbnVsbCkge1xuICAgIHNlbGVjdGVkVmFsdWVzID0gW11cbiAgfVxuICBpZiAoIWlzLkFycmF5KHNlbGVjdGVkVmFsdWVzKSkge1xuICAgIC8vIFRPRE8gT3V0cHV0IHdhcm5pbmcgaW4gZGV2ZWxvcG1lbnRcbiAgICBzZWxlY3RlZFZhbHVlcyA9IFtzZWxlY3RlZFZhbHVlc11cbiAgfVxuICB2YXIgZmluYWxBdHRycyA9IHRoaXMuYnVpbGRBdHRycyhrd2FyZ3MuYXR0cnMsIHtuYW1lOiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdWx0aXBsZTogJ211bHRpcGxlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBzZWxlY3RlZFZhbHVlc30pXG4gICAgLCBvcHRpb25zID0gdGhpcy5yZW5kZXJPcHRpb25zKGt3YXJncy5jaG9pY2VzLCBzZWxlY3RlZFZhbHVlcylcbiAgcmV0dXJuIFJlYWN0LkRPTS5zZWxlY3QoZmluYWxBdHRycywgb3B0aW9ucylcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgdmFsdWVzIGZvciB0aGlzIHdpZGdldCBmcm9tIHRoZSBnaXZlbiBkYXRhLlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgZm9ybSBkYXRhLlxuICogQHBhcmFtIHtPYmplY3R9IGZpbGVzIGZpbGUgZGF0YS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIHRoZSBmaWVsZCBuYW1lIHRvIGJlIHVzZWQgdG8gcmV0cmlldmUgZGF0YS5cbiAqIEByZXR1cm4ge0FycmF5fSB2YWx1ZXMgZm9yIHRoaXMgd2lkZ2V0LCBvciBudWxsIGlmIG5vIHZhbHVlcyB3ZXJlIHByb3ZpZGVkLlxuICovXG5TZWxlY3RNdWx0aXBsZS5wcm90b3R5cGUudmFsdWVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGEsIGZpbGVzLCBuYW1lKSB7XG4gIGlmICh0eXBlb2YgZGF0YVtuYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBbXS5jb25jYXQoZGF0YVtuYW1lXSlcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG4vKipcbiAqIEFuIG9iamVjdCB1c2VkIGJ5IENob2ljZUZpZWxkUmVuZGVyZXIgdGhhdCByZXByZXNlbnRzIGEgc2luZ2xlXG4gKiA8aW5wdXQ+LlxuICovXG52YXIgQ2hvaWNlSW5wdXQgPSBTdWJXaWRnZXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIENob2ljZUlucHV0KG5hbWUsIHZhbHVlLCBhdHRycywgY2hvaWNlLCBpbmRleCkge1xuICAgIHRoaXMubmFtZSA9IG5hbWVcbiAgICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgICB0aGlzLmF0dHJzID0gYXR0cnNcbiAgICB0aGlzLmNob2ljZVZhbHVlID0gJycrY2hvaWNlWzBdXG4gICAgdGhpcy5jaG9pY2VMYWJlbCA9ICcnK2Nob2ljZVsxXVxuICAgIHRoaXMuaW5kZXggPSBpbmRleFxuICAgIGlmICh0eXBlb2YgdGhpcy5hdHRycy5pZCAhPSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5hdHRycy5pZCArPSAnXycgKyB0aGlzLmluZGV4XG4gICAgfVxuICB9XG4sIGlucHV0VHlwZTogbnVsbCAvLyBTdWJjbGFzc2VzIG11c3QgZGVmaW5lIHRoaXNcbn0pXG5cbi8qKlxuICogUmVuZGVycyBhIDxsYWJlbD4gZW5jbG9zaW5nIHRoZSB3aWRnZXQgYW5kIGl0cyBsYWJlbCB0ZXh0LlxuICovXG5DaG9pY2VJbnB1dC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBsYWJlbEF0dHJzID0ge31cbiAgaWYgKHRoaXMuaWRGb3JMYWJlbCgpKSB7XG4gICAgbGFiZWxBdHRycy5odG1sRm9yID0gdGhpcy5pZEZvckxhYmVsKClcbiAgfVxuICByZXR1cm4gUmVhY3QuRE9NLmxhYmVsKGxhYmVsQXR0cnMsIHRoaXMudGFnKCksICcgJywgdGhpcy5jaG9pY2VMYWJlbClcbn1cblxuQ2hvaWNlSW5wdXQucHJvdG90eXBlLmlzQ2hlY2tlZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy52YWx1ZSA9PT0gdGhpcy5jaG9pY2VWYWx1ZVxufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIDxpbnB1dD4gcG9ydGlvbiBvZiB0aGUgd2lkZ2V0LlxuICovXG5DaG9pY2VJbnB1dC5wcm90b3R5cGUudGFnID0gZnVuY3Rpb24oKSB7XG4gIHZhciBmaW5hbEF0dHJzID0gb2JqZWN0LmV4dGVuZCh7fSwgdGhpcy5hdHRycywge1xuICAgIHR5cGU6IHRoaXMuaW5wdXRUeXBlLCBuYW1lOiB0aGlzLm5hbWUsIHZhbHVlOiB0aGlzLmNob2ljZVZhbHVlXG4gIH0pXG4gIGlmICh0aGlzLmlzQ2hlY2tlZCgpKSB7XG4gICAgZmluYWxBdHRycy5kZWZhdWx0Q2hlY2tlZCA9ICdjaGVja2VkJ1xuICB9XG4gIHJldHVybiBSZWFjdC5ET00uaW5wdXQoZmluYWxBdHRycylcbn1cblxuQ2hvaWNlSW5wdXQucHJvdG90eXBlLmlkRm9yTGFiZWwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG9iamVjdC5nZXQodGhpcy5hdHRycywgJ2lkJywgJycpXG59XG5cbnZhciBSYWRpb0Nob2ljZUlucHV0ID0gQ2hvaWNlSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFJhZGlvQ2hvaWNlSW5wdXQobmFtZSwgdmFsdWUsIGF0dHJzLCBjaG9pY2UsIGluZGV4KSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJhZGlvQ2hvaWNlSW5wdXQpKSB7XG4gICAgICByZXR1cm4gbmV3IFJhZGlvQ2hvaWNlSW5wdXQobmFtZSwgdmFsdWUsIGF0dHJzLCBjaG9pY2UsIGluZGV4KVxuICAgIH1cbiAgICBDaG9pY2VJbnB1dC5jYWxsKHRoaXMsIG5hbWUsIHZhbHVlLCBhdHRycywgY2hvaWNlLCBpbmRleClcbiAgICB0aGlzLnZhbHVlID0gJycrdGhpcy52YWx1ZVxuICB9XG4sIGlucHV0VHlwZTogJ3JhZGlvJ1xufSlcblxudmFyIENoZWNrYm94Q2hvaWNlSW5wdXQgPSBDaG9pY2VJbnB1dC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gQ2hlY2tib3hDaG9pY2VJbnB1dChuYW1lLCB2YWx1ZSwgYXR0cnMsIGNob2ljZSwgaW5kZXgpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQ2hlY2tib3hDaG9pY2VJbnB1dCkpIHtcbiAgICAgIHJldHVybiBuZXcgQ2hlY2tib3hDaG9pY2VJbnB1dChuYW1lLCB2YWx1ZSwgYXR0cnMsIGNob2ljZSwgaW5kZXgpXG4gICAgfVxuICAgIGlmICghaXMuQXJyYXkodmFsdWUpKSB7XG4gICAgICAvLyBUT0RPIE91dHB1dCB3YXJuaW5nIGluIGRldmVsb3BtZW50XG4gICAgICB2YWx1ZSA9IFt2YWx1ZV1cbiAgICB9XG4gICAgQ2hvaWNlSW5wdXQuY2FsbCh0aGlzLCBuYW1lLCB2YWx1ZSwgYXR0cnMsIGNob2ljZSwgaW5kZXgpXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLnZhbHVlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdGhpcy52YWx1ZVtpXSA9ICcnK3RoaXMudmFsdWVbaV1cbiAgICB9XG4gIH1cbiwgaW5wdXRUeXBlOiAnY2hlY2tib3gnXG59KVxuXG5DaGVja2JveENob2ljZUlucHV0LnByb3RvdHlwZS5pc0NoZWNrZWQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudmFsdWUuaW5kZXhPZih0aGlzLmNob2ljZVZhbHVlKSAhPT0gLTFcbn1cblxuLyoqXG4gKiBBbiBvYmplY3QgdXNlZCBieSBjaG9pY2UgU2VsZWN0cyB0byBlbmFibGUgY3VzdG9taXNhdGlvbiBvZiBjaG9pY2Ugd2lkZ2V0cy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IGF0dHJzXG4gKiBAcGFyYW0ge0FycmF5fSBjaG9pY2VzXG4gKi9cbnZhciBDaG9pY2VGaWVsZFJlbmRlcmVyID0gQ29uY3VyLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBDaG9pY2VGaWVsZFJlbmRlcmVyKG5hbWUsIHZhbHVlLCBhdHRycywgY2hvaWNlcykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBDaG9pY2VGaWVsZFJlbmRlcmVyKSkge1xuICAgICAgcmV0dXJuIG5ldyBDaG9pY2VGaWVsZFJlbmRlcmVyKG5hbWUsIHZhbHVlLCBhdHRycywgY2hvaWNlcylcbiAgICB9XG4gICAgdGhpcy5uYW1lID0gbmFtZVxuICAgIHRoaXMudmFsdWUgPSB2YWx1ZVxuICAgIHRoaXMuYXR0cnMgPSBhdHRyc1xuICAgIHRoaXMuY2hvaWNlcyA9IGNob2ljZXNcbiAgfVxuLCBjaG9pY2VJbnB1dENvbnN0cnVjdG9yOiBudWxsXG59KVxuXG5DaG9pY2VGaWVsZFJlbmRlcmVyLnByb3RvdHlwZS5fX2l0ZXJfXyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5jaG9pY2VJbnB1dHMoKVxufVxuXG5DaG9pY2VGaWVsZFJlbmRlcmVyLnByb3RvdHlwZS5jaG9pY2VJbnB1dHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGlucHV0cyA9IFtdXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5jaG9pY2VzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlucHV0cy5wdXNoKHRoaXMuY2hvaWNlSW5wdXRDb25zdHJ1Y3Rvcih0aGlzLm5hbWUsIHRoaXMudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5leHRlbmQoe30sIHRoaXMuYXR0cnMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNob2ljZXNbaV0sIGkpKVxuICB9XG4gIHJldHVybiBpbnB1dHNcbn1cblxuQ2hvaWNlRmllbGRSZW5kZXJlci5wcm90b3R5cGUuY2hvaWNlSW5wdXQgPSBmdW5jdGlvbihpKSB7XG4gIGlmIChpID49IHRoaXMuY2hvaWNlcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0luZGV4IG91dCBvZiBib3VuZHMnKVxuICB9XG4gIHJldHVybiB0aGlzLmNob2ljZUlucHV0Q29uc3RydWN0b3IodGhpcy5uYW1lLCB0aGlzLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5leHRlbmQoe30sIHRoaXMuYXR0cnMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2hvaWNlc1tpXSwgaSlcbn1cblxuLyoqXG4gKiBPdXRwdXRzIGEgPHVsPiBmb3IgdGhpcyBzZXQgb2YgY2hvaWNlIGZpZWxkcy5cbiAqIElmIGFuIGlkIHdhcyBnaXZlbiB0byB0aGUgZmllbGQsIGl0IGlzIGFwcGxpZWQgdG8gdGhlIDx1bD4gKGVhY2ggaXRlbSBpbiB0aGVcbiAqIGxpc3Qgd2lsbCBnZXQgYW4gaWQgb2YgYCRpZF8kaWApLlxuICovXG5DaG9pY2VGaWVsZFJlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGlkID0gb2JqZWN0LmdldCh0aGlzLmF0dHJzLCAnaWQnLCBudWxsKVxuICB2YXIgaXRlbXMgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuY2hvaWNlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgY2hvaWNlID0gdGhpcy5jaG9pY2VzW2ldXG4gICAgdmFyIGNob2ljZVZhbHVlID0gY2hvaWNlWzBdXG4gICAgdmFyIGNob2ljZUxhYmVsID0gY2hvaWNlWzFdXG4gICAgaWYgKGlzLkFycmF5KGNob2ljZUxhYmVsKSkge1xuICAgICAgdmFyIGF0dHJzUGx1cyA9IG9iamVjdC5leHRlbmQoe30sIHRoaXMuYXR0cnMpXG4gICAgICBpZiAoaWQpIHtcbiAgICAgICAgYXR0cnNQbHVzLmlkICs9J18nICsgaVxuICAgICAgfVxuICAgICAgdmFyIHN1YlJlbmRlcmVyID0gQ2hvaWNlRmllbGRSZW5kZXJlcih0aGlzLm5hbWUsIHRoaXMudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzUGx1cywgY2hvaWNlTGFiZWwpXG4gICAgICBzdWJSZW5kZXJlci5jaG9pY2VJbnB1dENvbnN0cnVjdG9yID0gdGhpcy5jaG9pY2VJbnB1dENvbnN0cnVjdG9yXG4gICAgICBpdGVtcy5wdXNoKFJlYWN0LkRPTS5saShudWxsLCBjaG9pY2VWYWx1ZSwgc3ViUmVuZGVyZXIucmVuZGVyKCkpKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZhciB3ID0gdGhpcy5jaG9pY2VJbnB1dENvbnN0cnVjdG9yKHRoaXMubmFtZSwgdGhpcy52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5leHRlbmQoe30sIHRoaXMuYXR0cnMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hvaWNlLCBpKVxuICAgICAgaXRlbXMucHVzaChSZWFjdC5ET00ubGkobnVsbCwgdy5yZW5kZXIoKSkpXG4gICAgfVxuICB9XG4gIHZhciBsaXN0QXR0cnMgPSB7fVxuICBpZiAoaWQpIHtcbiAgICBsaXN0QXR0cnMuaWQgPSBpZFxuICB9XG4gIHJldHVybiBSZWFjdC5ET00udWwobGlzdEF0dHJzLCBpdGVtcylcbn1cblxudmFyIFJhZGlvRmllbGRSZW5kZXJlciA9IENob2ljZUZpZWxkUmVuZGVyZXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIFJhZGlvRmllbGRSZW5kZXJlcihuYW1lLCB2YWx1ZSwgYXR0cnMsIGNob2ljZXMpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmFkaW9GaWVsZFJlbmRlcmVyKSkge1xuICAgICAgcmV0dXJuIG5ldyBSYWRpb0ZpZWxkUmVuZGVyZXIobmFtZSwgdmFsdWUsIGF0dHJzLCBjaG9pY2VzKVxuICAgIH1cbiAgICBDaG9pY2VGaWVsZFJlbmRlcmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgfVxuLCBjaG9pY2VJbnB1dENvbnN0cnVjdG9yOiBSYWRpb0Nob2ljZUlucHV0XG59KVxuXG52YXIgQ2hlY2tib3hGaWVsZFJlbmRlcmVyID0gQ2hvaWNlRmllbGRSZW5kZXJlci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gQ2hlY2tib3hGaWVsZFJlbmRlcmVyKG5hbWUsIHZhbHVlLCBhdHRycywgY2hvaWNlcykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBDaGVja2JveEZpZWxkUmVuZGVyZXIpKSB7XG4gICAgICByZXR1cm4gbmV3IENoZWNrYm94RmllbGRSZW5kZXJlcihuYW1lLCB2YWx1ZSwgYXR0cnMsIGNob2ljZXMpXG4gICAgfVxuICAgIENob2ljZUZpZWxkUmVuZGVyZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICB9XG4sIGNob2ljZUlucHV0Q29uc3RydWN0b3I6IENoZWNrYm94Q2hvaWNlSW5wdXRcbn0pXG5cbnZhciBSZW5kZXJlck1peGluID0gQ29uY3VyLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBSZW5kZXJlck1peGluKGt3YXJncykge1xuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe3JlbmRlcmVyOiBudWxsfSwga3dhcmdzKVxuICAgIC8vIE92ZXJyaWRlIHRoZSBkZWZhdWx0IHJlbmRlcmVyIGlmIHdlIHdlcmUgcGFzc2VkIG9uZVxuICAgIGlmIChrd2FyZ3MucmVuZGVyZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMucmVuZGVyZXIgPSBrd2FyZ3MucmVuZGVyZXJcbiAgICB9XG4gIH1cbiwgX2VtcHR5VmFsdWU6IG51bGxcbn0pXG5cblJlbmRlcmVyTWl4aW4ucHJvdG90eXBlLnN1YldpZGdldHMgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIHJldHVybiB1dGlsLml0ZXJhdGUodGhpcy5nZXRSZW5kZXJlcihuYW1lLCB2YWx1ZSwga3dhcmdzKSlcbn1cblxuLyoqXG4gKiBAcmV0dXJuIGFuIGluc3RhbmNlIG9mIHRoZSByZW5kZXJlciB0byBiZSB1c2VkIHRvIHJlbmRlciB0aGlzIHdpZGdldC5cbiAqL1xuUmVuZGVyZXJNaXhpbi5wcm90b3R5cGUuZ2V0UmVuZGVyZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiBudWxsLCBjaG9pY2VzOiBbXX0sIGt3YXJncylcbiAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgdmFsdWUgPSB0aGlzLl9lbXB0eVZhbHVlXG4gIH1cbiAgdmFyIGZpbmFsQXR0cnMgPSB0aGlzLmJ1aWxkQXR0cnMoa3dhcmdzLmF0dHJzKVxuICAgICwgY2hvaWNlcyA9IHV0aWwuaXRlcmF0ZSh0aGlzLmNob2ljZXMpLmNvbmNhdChrd2FyZ3MuY2hvaWNlcyB8fCBbXSlcbiAgcmV0dXJuIG5ldyB0aGlzLnJlbmRlcmVyKG5hbWUsIHZhbHVlLCBmaW5hbEF0dHJzLCBjaG9pY2VzKVxufVxuXG5SZW5kZXJlck1peGluLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIHJldHVybiB0aGlzLmdldFJlbmRlcmVyKG5hbWUsIHZhbHVlLCBrd2FyZ3MpLnJlbmRlcigpXG59XG5cbi8qKlxuICogV2lkZ2V0cyB1c2luZyB0aGlzIFJlbmRlcmVyTWl4aW4gYXJlIG1hZGUgb2YgYSBjb2xsZWN0aW9uIG9mIHN1YndpZGdldHMsIGVhY2hcbiAqIHdpdGggdGhlaXIgb3duIDxsYWJlbD4sIGFuZCBkaXN0aW5jdCBJRC5cbiAqIFRoZSBJRHMgYXJlIG1hZGUgZGlzdGluY3QgYnkgeSBcIl9YXCIgc3VmZml4LCB3aGVyZSBYIGlzIHRoZSB6ZXJvLWJhc2VkIGluZGV4XG4gKiBvZiB0aGUgY2hvaWNlIGZpZWxkLiBUaHVzLCB0aGUgbGFiZWwgZm9yIHRoZSBtYWluIHdpZGdldCBzaG91bGQgcmVmZXJlbmNlIHRoZVxuICogZmlyc3Qgc3Vid2lkZ2V0LCBoZW5jZSB0aGUgXCJfMFwiIHN1ZmZpeC5cbiAqL1xuUmVuZGVyZXJNaXhpbi5wcm90b3R5cGUuaWRGb3JMYWJlbCA9IGZ1bmN0aW9uKGlkKSB7XG4gIGlmIChpZCkge1xuICAgIGlkICs9ICdfMCdcbiAgfVxuICByZXR1cm4gaWRcbn1cblxuLyoqXG4gKiBSZW5kZXJzIGEgc2luZ2xlIHNlbGVjdCBhcyBhIGxpc3Qgb2YgPGlucHV0IHR5cGU9XCJyYWRpb1wiPiBlbGVtZW50cy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1NlbGVjdH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBSYWRpb1NlbGVjdCA9IFNlbGVjdC5leHRlbmQoe1xuICBfX21peGluX186IFJlbmRlcmVyTWl4aW5cbiwgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBSYWRpb1NlbGVjdCkpIHsgcmV0dXJuIG5ldyBSYWRpb1NlbGVjdChrd2FyZ3MpIH1cbiAgICBSZW5kZXJlck1peGluLmNhbGwodGhpcywga3dhcmdzKVxuICAgIFNlbGVjdC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuLCByZW5kZXJlcjogUmFkaW9GaWVsZFJlbmRlcmVyXG4sIF9lbXB0eVZhbHVlOiAnJ1xufSlcblxuLyoqXG4gKiBNdWx0aXBsZSBzZWxlY3Rpb25zIHJlcHJlc2VudGVkIGFzIGEgbGlzdCBvZiA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCI+IHdpZGdldHMuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtTZWxlY3RNdWx0aXBsZX1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBDaGVja2JveFNlbGVjdE11bHRpcGxlID0gU2VsZWN0TXVsdGlwbGUuZXh0ZW5kKHtcbiAgX19taXhpbl9fOiBSZW5kZXJlck1peGluXG4sIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQ2hlY2tib3hTZWxlY3RNdWx0aXBsZSkpIHsgcmV0dXJuIG5ldyBDaGVja2JveFNlbGVjdE11bHRpcGxlKGt3YXJncykgfVxuICAgIFJlbmRlcmVyTWl4aW4uY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgU2VsZWN0TXVsdGlwbGUuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgcmVuZGVyZXI6IENoZWNrYm94RmllbGRSZW5kZXJlclxuLCBfZW1wdHlWYWx1ZTogW11cbn0pXG5cbi8qKlxuICogQSB3aWRnZXQgdGhhdCBpcyBjb21wb3NlZCBvZiBtdWx0aXBsZSB3aWRnZXRzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7V2lkZ2V0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIE11bHRpV2lkZ2V0ID0gV2lkZ2V0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBNdWx0aVdpZGdldCh3aWRnZXRzLCBrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IE11bHRpV2lkZ2V0KHdpZGdldHMsIGt3YXJncykgfVxuICAgIHRoaXMud2lkZ2V0cyA9IFtdXG4gICAgdmFyIG5lZWRzTXVsdGlwYXJ0Rm9ybSA9IGZhbHNlXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB3aWRnZXRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIHdpZGdldCA9IHdpZGdldHNbaV0gaW5zdGFuY2VvZiBXaWRnZXQgPyB3aWRnZXRzW2ldIDogbmV3IHdpZGdldHNbaV0oKVxuICAgICAgaWYgKHdpZGdldC5uZWVkc011bHRpcGFydEZvcm0pIHtcbiAgICAgICAgbmVlZHNNdWx0aXBhcnRGb3JtID0gdHJ1ZVxuICAgICAgfVxuICAgICAgdGhpcy53aWRnZXRzLnB1c2god2lkZ2V0KVxuICAgIH1cbiAgICB0aGlzLm5lZWRzTXVsdGlwYXJ0Rm9ybSA9IG5lZWRzTXVsdGlwYXJ0Rm9ybVxuICAgIFdpZGdldC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuLyoqXG4gKiBUaGlzIG1ldGhvZCBpcyBkaWZmZXJlbnQgdGhhbiBvdGhlciB3aWRnZXRzJywgYmVjYXVzZSBpdCBoYXMgdG8gZmlndXJlIG91dFxuICogaG93IHRvIHNwbGl0IGEgc2luZ2xlIHZhbHVlIGZvciBkaXNwbGF5IGluIG11bHRpcGxlIHdpZGdldHMuXG4gKlxuICogSWYgdGhlIGdpdmVuIHZhbHVlIGlzIE5PVCBhIGxpc3QsIGl0IHdpbGwgZmlyc3QgYmUgXCJkZWNvbXByZXNzZWRcIiBpbnRvIGEgbGlzdFxuICogYmVmb3JlIGl0IGlzIHJlbmRlcmVkIGJ5IGNhbGxpbmcgdGhlICBNdWx0aVdpZGdldCNkZWNvbXByZXNzIGZ1bmN0aW9uLlxuICpcbiAqIEVhY2ggdmFsdWUgaW4gdGhlIGxpc3QgaXMgcmVuZGVyZWQgIHdpdGggdGhlIGNvcnJlc3BvbmRpbmcgd2lkZ2V0IC0tIHRoZVxuICogZmlyc3QgdmFsdWUgaXMgcmVuZGVyZWQgaW4gdGhlIGZpcnN0IHdpZGdldCwgdGhlIHNlY29uZCB2YWx1ZSBpcyByZW5kZXJlZCBpblxuICogdGhlIHNlY29uZCB3aWRnZXQsIGFuZCBzbyBvbi5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSB0aGUgZmllbGQgbmFtZS5cbiAqIEBwYXJhbSB2YWx1ZSBhIGxpc3Qgb2YgdmFsdWVzLCBvciBhIG5vcm1hbCB2YWx1ZSAoZS5nLiwgYSBTdHJpbmcgdGhhdCBoYXNcbiAqICAgYmVlbiBcImNvbXByZXNzZWRcIiBmcm9tIGEgbGlzdCBvZiB2YWx1ZXMpLlxuICogQHBhcmFtIHtPYmplY3R9IFtrd2FyZ3NdIHJlbmRlcmluZyBvcHRpb25zXG4gKiBAY29uZmlnIHtPYmplY3R9IFthdHRyc10gYWRkaXRpb25hbCBIVE1MIGF0dHJpYnV0ZXMgZm9yIHRoZSByZW5kZXJlZCB3aWRnZXQuXG4gKiBAcmV0dXJuIGEgcmVuZGVyZWQgY29sbGVjdGlvbiBvZiB3aWRnZXRzLlxuICovXG5NdWx0aVdpZGdldC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbH0sIGt3YXJncylcbiAgaWYgKCEoaXMuQXJyYXkodmFsdWUpKSkge1xuICAgIHZhbHVlID0gdGhpcy5kZWNvbXByZXNzKHZhbHVlKVxuICB9XG4gIHZhciBmaW5hbEF0dHJzID0gdGhpcy5idWlsZEF0dHJzKGt3YXJncy5hdHRycylcbiAgICAsIGlkID0gKHR5cGVvZiBmaW5hbEF0dHJzLmlkICE9ICd1bmRlZmluZWQnID8gZmluYWxBdHRycy5pZCA6IG51bGwpXG4gICAgLCByZW5kZXJlZFdpZGdldHMgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMud2lkZ2V0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgd2lkZ2V0ID0gdGhpcy53aWRnZXRzW2ldXG4gICAgICAsIHdpZGdldFZhbHVlID0gbnVsbFxuICAgIGlmICh0eXBlb2YgdmFsdWVbaV0gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHdpZGdldFZhbHVlID0gdmFsdWVbaV1cbiAgICB9XG4gICAgaWYgKGlkKSB7XG4gICAgICBmaW5hbEF0dHJzLmlkID0gaWQgKyAnXycgKyBpXG4gICAgfVxuICAgIHJlbmRlcmVkV2lkZ2V0cy5wdXNoKFxuICAgICAgICB3aWRnZXQucmVuZGVyKG5hbWUgKyAnXycgKyBpLCB3aWRnZXRWYWx1ZSwge2F0dHJzOiBmaW5hbEF0dHJzfSkpXG4gIH1cbiAgcmV0dXJuIHRoaXMuZm9ybWF0T3V0cHV0KHJlbmRlcmVkV2lkZ2V0cylcbn1cblxuTXVsdGlXaWRnZXQucHJvdG90eXBlLmlkRm9yTGFiZWwgPSBmdW5jdGlvbihpZCkge1xuICBpZiAoaWQpIHtcbiAgICBpZCArPSAnXzAnXG4gIH1cbiAgcmV0dXJuIGlkXG59XG5cbk11bHRpV2lkZ2V0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhID0gZnVuY3Rpb24oZGF0YSwgZmlsZXMsIG5hbWUpIHtcbiAgdmFyIHZhbHVlcyA9IFtdXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy53aWRnZXRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhbHVlc1tpXSA9IHRoaXMud2lkZ2V0c1tpXS52YWx1ZUZyb21EYXRhKGRhdGEsIGZpbGVzLCBuYW1lICsgJ18nICsgaSlcbiAgfVxuICByZXR1cm4gdmFsdWVzXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBlbGVtZW50IGNvbnRhaW5pbmcgYSBnaXZlbiBsaXN0IG9mIHJlbmRlcmVkIHdpZGdldHMuXG4gKlxuICogVGhpcyBob29rIGFsbG93cyB5b3UgdG8gZm9ybWF0IHRoZSBIVE1MIGRlc2lnbiBvZiB0aGUgd2lkZ2V0cywgaWYgbmVlZGVkLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHJlbmRlcmVkV2lkZ2V0cyBhIGxpc3Qgb2YgcmVuZGVyZWQgd2lkZ2V0cy5cbiAqIEByZXR1cm4gYSA8ZGl2PiBjb250YWluaW5nIHRoZSByZW5kZXJlZCB3aWRnZXRzLlxuICovXG5NdWx0aVdpZGdldC5wcm90b3R5cGUuZm9ybWF0T3V0cHV0ID0gZnVuY3Rpb24ocmVuZGVyZWRXaWRnZXRzKSB7XG4gIHJldHVybiBSZWFjdC5ET00uZGl2KG51bGwsIHJlbmRlcmVkV2lkZ2V0cylcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbGlzdCBvZiBkZWNvbXByZXNzZWQgdmFsdWVzIGZvciB0aGUgZ2l2ZW4gY29tcHJlc3NlZCB2YWx1ZS5cbiAqIEBhYnN0cmFjdFxuICogQHBhcmFtIHZhbHVlIGEgY29tcHJlc3NlZCB2YWx1ZSwgd2hpY2ggY2FuIGJlIGFzc3VtZWQgdG8gYmUgdmFsaWQsIGJ1dCBub3RcbiAqICAgbmVjZXNzYXJpbHkgbm9uLWVtcHR5LlxuICogQHJldHVybiBhIGxpc3Qgb2YgZGVjb21wcmVzc2VkIHZhbHVlcyBmb3IgdGhlIGdpdmVuIGNvbXByZXNzZWQgdmFsdWUuXG4gKi9cbk11bHRpV2lkZ2V0LnByb3RvdHlwZS5kZWNvbXByZXNzID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdNdWx0aVdpZGdldCBzdWJjbGFzc2VzIG11c3QgaW1wbGVtZW50IGEgZGVjb21wcmVzcygpIG1ldGhvZC4nKVxufVxuXG4vKipcbiAqIFNwbGl0cyBEYXRlIGlucHV0IGludG8gdHdvIDxpbnB1dCB0eXBlPVwidGV4dFwiPiBlbGVtZW50cy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge011bHRpV2lkZ2V0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFNwbGl0RGF0ZVRpbWVXaWRnZXQgPSBNdWx0aVdpZGdldC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gU3BsaXREYXRlVGltZVdpZGdldChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IFNwbGl0RGF0ZVRpbWVXaWRnZXQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7ZGF0ZUZvcm1hdDogbnVsbCwgdGltZUZvcm1hdDogbnVsbH0sIGt3YXJncylcbiAgICB2YXIgd2lkZ2V0cyA9IFtcbiAgICAgIERhdGVJbnB1dCh7YXR0cnM6IGt3YXJncy5hdHRycywgZm9ybWF0OiBrd2FyZ3MuZGF0ZUZvcm1hdH0pXG4gICAgLCBUaW1lSW5wdXQoe2F0dHJzOiBrd2FyZ3MuYXR0cnMsIGZvcm1hdDoga3dhcmdzLnRpbWVGb3JtYXR9KVxuICAgIF1cbiAgICBNdWx0aVdpZGdldC5jYWxsKHRoaXMsIHdpZGdldHMsIGt3YXJncy5hdHRycylcbiAgfVxufSlcblxuU3BsaXREYXRlVGltZVdpZGdldC5wcm90b3R5cGUuZGVjb21wcmVzcyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSkge1xuICAgIHJldHVybiBbXG4gICAgICBuZXcgRGF0ZSh2YWx1ZS5nZXRGdWxsWWVhcigpLCB2YWx1ZS5nZXRNb250aCgpLCB2YWx1ZS5nZXREYXRlKCkpXG4gICAgLCBuZXcgRGF0ZSgxOTAwLCAwLCAxLCB2YWx1ZS5nZXRIb3VycygpLCB2YWx1ZS5nZXRNaW51dGVzKCksIHZhbHVlLmdldFNlY29uZHMoKSlcbiAgICBdXG4gIH1cbiAgcmV0dXJuIFtudWxsLCBudWxsXVxufVxuXG4vKipcbiAqIFNwbGl0cyBEYXRlIGlucHV0IGludG8gdHdvIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCI+IGVsZW1lbnRzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7U3BsaXREYXRlVGltZVdpZGdldH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBTcGxpdEhpZGRlbkRhdGVUaW1lV2lkZ2V0ID0gU3BsaXREYXRlVGltZVdpZGdldC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gU3BsaXRIaWRkZW5EYXRlVGltZVdpZGdldChrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IFNwbGl0SGlkZGVuRGF0ZVRpbWVXaWRnZXQoa3dhcmdzKSB9XG4gICAgU3BsaXREYXRlVGltZVdpZGdldC5jYWxsKHRoaXMsIGt3YXJncylcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMud2lkZ2V0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRoaXMud2lkZ2V0c1tpXS5pbnB1dFR5cGUgPSAnaGlkZGVuJ1xuICAgICAgdGhpcy53aWRnZXRzW2ldLmlzSGlkZGVuID0gdHJ1ZVxuICAgIH1cbiAgfVxuLCBpc0hpZGRlbjogdHJ1ZVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFdpZGdldDogV2lkZ2V0XG4sIElucHV0OiBJbnB1dFxuLCBUZXh0SW5wdXQ6IFRleHRJbnB1dFxuLCBOdW1iZXJJbnB1dDogTnVtYmVySW5wdXRcbiwgRW1haWxJbnB1dDogRW1haWxJbnB1dFxuLCBVUkxJbnB1dDogVVJMSW5wdXRcbiwgUGFzc3dvcmRJbnB1dDogUGFzc3dvcmRJbnB1dFxuLCBIaWRkZW5JbnB1dDogSGlkZGVuSW5wdXRcbiwgTXVsdGlwbGVIaWRkZW5JbnB1dDogTXVsdGlwbGVIaWRkZW5JbnB1dFxuLCBGaWxlSW5wdXQ6IEZpbGVJbnB1dFxuLCBGSUxFX0lOUFVUX0NPTlRSQURJQ1RJT046IEZJTEVfSU5QVVRfQ09OVFJBRElDVElPTlxuLCBDbGVhcmFibGVGaWxlSW5wdXQ6IENsZWFyYWJsZUZpbGVJbnB1dFxuLCBUZXh0YXJlYTogVGV4dGFyZWFcbiwgRGF0ZUlucHV0OiBEYXRlSW5wdXRcbiwgRGF0ZVRpbWVJbnB1dDogRGF0ZVRpbWVJbnB1dFxuLCBUaW1lSW5wdXQ6IFRpbWVJbnB1dFxuLCBDaGVja2JveElucHV0OiBDaGVja2JveElucHV0XG4sIFNlbGVjdDogU2VsZWN0XG4sIE51bGxCb29sZWFuU2VsZWN0OiBOdWxsQm9vbGVhblNlbGVjdFxuLCBTZWxlY3RNdWx0aXBsZTogU2VsZWN0TXVsdGlwbGVcbiwgQ2hvaWNlSW5wdXQ6IENob2ljZUlucHV0XG4sIFJhZGlvQ2hvaWNlSW5wdXQ6IFJhZGlvQ2hvaWNlSW5wdXRcbiwgQ2hlY2tib3hDaG9pY2VJbnB1dDogQ2hlY2tib3hDaG9pY2VJbnB1dFxuLCBDaG9pY2VGaWVsZFJlbmRlcmVyOiBDaG9pY2VGaWVsZFJlbmRlcmVyXG4sIFJlbmRlcmVyTWl4aW46IFJlbmRlcmVyTWl4aW5cbiwgUmFkaW9GaWVsZFJlbmRlcmVyOiBSYWRpb0ZpZWxkUmVuZGVyZXJcbiwgQ2hlY2tib3hGaWVsZFJlbmRlcmVyOiBDaGVja2JveEZpZWxkUmVuZGVyZXJcbiwgUmFkaW9TZWxlY3Q6IFJhZGlvU2VsZWN0XG4sIENoZWNrYm94U2VsZWN0TXVsdGlwbGU6IENoZWNrYm94U2VsZWN0TXVsdGlwbGVcbiwgTXVsdGlXaWRnZXQ6IE11bHRpV2lkZ2V0XG4sIFNwbGl0RGF0ZVRpbWVXaWRnZXQ6IFNwbGl0RGF0ZVRpbWVXaWRnZXRcbiwgU3BsaXRIaWRkZW5EYXRlVGltZVdpZGdldDogU3BsaXRIaWRkZW5EYXRlVGltZVdpZGdldFxufVxuIiwidmFyIGlzID0gcmVxdWlyZSgnaXNvbW9ycGgvaXMnKVxuICAsIG9iamVjdCA9IHJlcXVpcmUoJ2lzb21vcnBoL29iamVjdCcpXG5cbi8qKlxuICogTWl4ZXMgaW4gcHJvcGVydGllcyBmcm9tIG9uZSBvYmplY3QgdG8gYW5vdGhlci4gSWYgdGhlIHNvdXJjZSBvYmplY3QgaXMgYVxuICogRnVuY3Rpb24sIGl0cyBwcm90b3R5cGUgaXMgbWl4ZWQgaW4gaW5zdGVhZC5cbiAqL1xuZnVuY3Rpb24gbWl4aW4oZGVzdCwgc3JjKSB7XG4gIGlmIChpcy5GdW5jdGlvbihzcmMpKSB7XG4gICAgb2JqZWN0LmV4dGVuZChkZXN0LCBzcmMucHJvdG90eXBlKVxuICB9XG4gIGVsc2Uge1xuICAgIG9iamVjdC5leHRlbmQoZGVzdCwgc3JjKVxuICB9XG59XG5cbi8qKlxuICogQXBwbGllcyBtaXhpbnMgc3BlY2lmaWVkIGFzIGEgX19taXhpbl9fIHByb3BlcnR5IG9uIHRoZSBnaXZlbiBwcm9wZXJ0aWVzXG4gKiBvYmplY3QsIHJldHVybmluZyBhbiBvYmplY3QgY29udGFpbmluZyB0aGUgbWl4ZWQgaW4gcHJvcGVydGllcy5cbiAqL1xuZnVuY3Rpb24gYXBwbHlNaXhpbnMocHJvcGVydGllcykge1xuICB2YXIgbWl4aW5zID0gcHJvcGVydGllcy5fX21peGluX19cbiAgaWYgKCFpcy5BcnJheShtaXhpbnMpKSB7XG4gICAgbWl4aW5zID0gW21peGluc11cbiAgfVxuICB2YXIgbWl4ZWRQcm9wZXJ0aWVzID0ge31cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBtaXhpbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgbWl4aW4obWl4ZWRQcm9wZXJ0aWVzLCBtaXhpbnNbaV0pXG4gIH1cbiAgZGVsZXRlIHByb3BlcnRpZXMuX19taXhpbl9fXG4gIHJldHVybiBvYmplY3QuZXh0ZW5kKG1peGVkUHJvcGVydGllcywgcHJvcGVydGllcylcbn1cblxuLyoqXG4gKiBJbmhlcml0cyBhbm90aGVyIGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlIGFuZCBzZXRzIGl0cyBwcm90b3R5cGUgYW5kXG4gKiBjb25zdHJ1Y3RvciBwcm9wZXJ0aWVzIGluIG9uZSBmZWxsIHN3b29wLlxuICpcbiAqIElmIGEgY2hpbGQgY29uc3RydWN0b3IgaXMgbm90IHByb3ZpZGVkIHZpYSBwcm90b3R5cGVQcm9wcy5jb25zdHJ1Y3RvcixcbiAqIGEgbmV3IGNvbnN0cnVjdG9yIHdpbGwgYmUgY3JlYXRlZC5cbiAqL1xuZnVuY3Rpb24gaW5oZXJpdEZyb20ocGFyZW50Q29uc3RydWN0b3IsIHByb3RvdHlwZVByb3BzLCBjb25zdHJ1Y3RvclByb3BzKSB7XG4gIC8vIEdldCBvciBjcmVhdGUgYSBjaGlsZCBjb25zdHJ1Y3RvclxuICB2YXIgY2hpbGRDb25zdHJ1Y3RvclxuICBpZiAocHJvdG90eXBlUHJvcHMgJiYgb2JqZWN0Lmhhc093bihwcm90b3R5cGVQcm9wcywgJ2NvbnN0cnVjdG9yJykpIHtcbiAgICBjaGlsZENvbnN0cnVjdG9yID0gcHJvdG90eXBlUHJvcHMuY29uc3RydWN0b3JcbiAgfVxuICBlbHNlIHtcbiAgICBjaGlsZENvbnN0cnVjdG9yID0gZnVuY3Rpb24oKSB7XG4gICAgICBwYXJlbnRDb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgfVxuICB9XG5cbiAgLy8gQmFzZSBjb25zdHJ1Y3RvcnMgc2hvdWxkIG9ubHkgaGF2ZSB0aGUgcHJvcGVydGllcyB0aGV5J3JlIGRlZmluZWQgd2l0aFxuICBpZiAocGFyZW50Q29uc3RydWN0b3IgIT09IENvbmN1cikge1xuICAgIC8vIEluaGVyaXQgdGhlIHBhcmVudCdzIHByb3RvdHlwZVxuICAgIG9iamVjdC5pbmhlcml0cyhjaGlsZENvbnN0cnVjdG9yLCBwYXJlbnRDb25zdHJ1Y3RvcilcbiAgICBjaGlsZENvbnN0cnVjdG9yLl9fc3VwZXJfXyA9IHBhcmVudENvbnN0cnVjdG9yLnByb3RvdHlwZVxuICB9XG5cbiAgLy8gQWRkIHByb3RvdHlwZSBwcm9wZXJ0aWVzLCBpZiBnaXZlblxuICBpZiAocHJvdG90eXBlUHJvcHMpIHtcbiAgICBvYmplY3QuZXh0ZW5kKGNoaWxkQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b3R5cGVQcm9wcylcbiAgfVxuXG4gIC8vIEFkZCBjb25zdHJ1Y3RvciBwcm9wZXJ0aWVzLCBpZiBnaXZlblxuICBpZiAoY29uc3RydWN0b3JQcm9wcykge1xuICAgIG9iamVjdC5leHRlbmQoY2hpbGRDb25zdHJ1Y3RvciwgY29uc3RydWN0b3JQcm9wcylcbiAgfVxuXG4gIHJldHVybiBjaGlsZENvbnN0cnVjdG9yXG59XG5cbi8qKlxuICogTmFtZXNwYWNlIGFuZCBkdW1teSBjb25zdHJ1Y3RvciBmb3IgaW5pdGlhbCBleHRlbnNpb24uXG4gKi9cbnZhciBDb25jdXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge31cblxuLyoqXG4gKiBDcmVhdGVzIG9yIHVzZXMgYSBjaGlsZCBjb25zdHJ1Y3RvciB0byBpbmhlcml0IGZyb20gdGhlIHRoZSBjYWxsXG4gKiBjb250ZXh0LCB3aGljaCBpcyBleHBlY3RlZCB0byBiZSBhIGNvbnN0cnVjdG9yLlxuICovXG5Db25jdXIuZXh0ZW5kID0gZnVuY3Rpb24ocHJvdG90eXBlUHJvcHMsIGNvbnN0cnVjdG9yUHJvcHMpIHtcbiAgLy8gSWYgdGhlIGNvbnN0cnVjdG9yIGJlaW5nIGluaGVyaXRlZCBmcm9tIGhhcyBhIF9fbWV0YV9fIGZ1bmN0aW9uIHNvbWV3aGVyZVxuICAvLyBpbiBpdHMgcHJvdG90eXBlIGNoYWluLCBjYWxsIGl0IHRvIGN1c3RvbWlzZSBwcm90b3R5cGUgYW5kIGNvbnN0cnVjdG9yXG4gIC8vIHByb3BlcnRpZXMgYmVmb3JlIHRoZXkncmUgdXNlZCB0byBzZXQgdXAgdGhlIG5ldyBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZS5cbiAgaWYgKHR5cGVvZiB0aGlzLnByb3RvdHlwZS5fX21ldGFfXyAhPSAndW5kZWZpbmVkJykge1xuICAgIC8vIFByb3BlcnR5IG9iamVjdHMgbXVzdCBhbHdheXMgZXhpc3Qgc28gcHJvcGVydGllcyBjYW4gYmUgYWRkZWQgdG9cbiAgICAvLyBhbmQgcmVtb3ZlZCBmcm9tIHRoZW0uXG4gICAgcHJvdG90eXBlUHJvcHMgPSBwcm90b3R5cGVQcm9wcyB8fCB7fVxuICAgIGNvbnN0cnVjdG9yUHJvcHMgPSBjb25zdHJ1Y3RvclByb3BzIHx8IHt9XG4gICAgdGhpcy5wcm90b3R5cGUuX19tZXRhX18ocHJvdG90eXBlUHJvcHMsIGNvbnN0cnVjdG9yUHJvcHMpXG4gIH1cblxuICAvLyBJZiBhbnkgbWl4aW5zIGFyZSBzcGVjaWZpZWQsIG1peCB0aGVtIGludG8gdGhlIHByb3BlcnR5IG9iamVjdHNcbiAgaWYgKHByb3RvdHlwZVByb3BzICYmIG9iamVjdC5oYXNPd24ocHJvdG90eXBlUHJvcHMsICdfX21peGluX18nKSkge1xuICAgIHByb3RvdHlwZVByb3BzID0gYXBwbHlNaXhpbnMocHJvdG90eXBlUHJvcHMpXG4gIH1cbiAgaWYgKGNvbnN0cnVjdG9yUHJvcHMgJiYgb2JqZWN0Lmhhc093bihjb25zdHJ1Y3RvclByb3BzLCAnX19taXhpbl9fJykpIHtcbiAgICBjb25zdHJ1Y3RvclByb3BzID0gYXBwbHlNaXhpbnMoY29uc3RydWN0b3JQcm9wcylcbiAgfVxuXG4gIC8vIFNldCB1cCBhbmQgcmV0dXJuIHRoZSBuZXcgY2hpbGQgY29uc3RydWN0b3JcbiAgdmFyIGNoaWxkQ29uc3RydWN0b3IgPSBpbmhlcml0RnJvbSh0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvdHlwZVByb3BzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yUHJvcHMpXG4gIGNoaWxkQ29uc3RydWN0b3IuZXh0ZW5kID0gdGhpcy5leHRlbmRcbiAgcmV0dXJuIGNoaWxkQ29uc3RydWN0b3Jcbn1cbiIsInZhciBnbG9iYWw9dHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9Oy8qISBodHRwOi8vbXRocy5iZS9wdW55Y29kZSB2MS4yLjQgYnkgQG1hdGhpYXMgKi9cbjsoZnVuY3Rpb24ocm9vdCkge1xuXG5cdC8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZXMgKi9cblx0dmFyIGZyZWVFeHBvcnRzID0gdHlwZW9mIGV4cG9ydHMgPT0gJ29iamVjdCcgJiYgZXhwb3J0cztcblx0dmFyIGZyZWVNb2R1bGUgPSB0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZSAmJlxuXHRcdG1vZHVsZS5leHBvcnRzID09IGZyZWVFeHBvcnRzICYmIG1vZHVsZTtcblx0dmFyIGZyZWVHbG9iYWwgPSB0eXBlb2YgZ2xvYmFsID09ICdvYmplY3QnICYmIGdsb2JhbDtcblx0aWYgKGZyZWVHbG9iYWwuZ2xvYmFsID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWwud2luZG93ID09PSBmcmVlR2xvYmFsKSB7XG5cdFx0cm9vdCA9IGZyZWVHbG9iYWw7XG5cdH1cblxuXHQvKipcblx0ICogVGhlIGBwdW55Y29kZWAgb2JqZWN0LlxuXHQgKiBAbmFtZSBwdW55Y29kZVxuXHQgKiBAdHlwZSBPYmplY3Rcblx0ICovXG5cdHZhciBwdW55Y29kZSxcblxuXHQvKiogSGlnaGVzdCBwb3NpdGl2ZSBzaWduZWQgMzItYml0IGZsb2F0IHZhbHVlICovXG5cdG1heEludCA9IDIxNDc0ODM2NDcsIC8vIGFrYS4gMHg3RkZGRkZGRiBvciAyXjMxLTFcblxuXHQvKiogQm9vdHN0cmluZyBwYXJhbWV0ZXJzICovXG5cdGJhc2UgPSAzNixcblx0dE1pbiA9IDEsXG5cdHRNYXggPSAyNixcblx0c2tldyA9IDM4LFxuXHRkYW1wID0gNzAwLFxuXHRpbml0aWFsQmlhcyA9IDcyLFxuXHRpbml0aWFsTiA9IDEyOCwgLy8gMHg4MFxuXHRkZWxpbWl0ZXIgPSAnLScsIC8vICdcXHgyRCdcblxuXHQvKiogUmVndWxhciBleHByZXNzaW9ucyAqL1xuXHRyZWdleFB1bnljb2RlID0gL154bi0tLyxcblx0cmVnZXhOb25BU0NJSSA9IC9bXiAtfl0vLCAvLyB1bnByaW50YWJsZSBBU0NJSSBjaGFycyArIG5vbi1BU0NJSSBjaGFyc1xuXHRyZWdleFNlcGFyYXRvcnMgPSAvXFx4MkV8XFx1MzAwMnxcXHVGRjBFfFxcdUZGNjEvZywgLy8gUkZDIDM0OTAgc2VwYXJhdG9yc1xuXG5cdC8qKiBFcnJvciBtZXNzYWdlcyAqL1xuXHRlcnJvcnMgPSB7XG5cdFx0J292ZXJmbG93JzogJ092ZXJmbG93OiBpbnB1dCBuZWVkcyB3aWRlciBpbnRlZ2VycyB0byBwcm9jZXNzJyxcblx0XHQnbm90LWJhc2ljJzogJ0lsbGVnYWwgaW5wdXQgPj0gMHg4MCAobm90IGEgYmFzaWMgY29kZSBwb2ludCknLFxuXHRcdCdpbnZhbGlkLWlucHV0JzogJ0ludmFsaWQgaW5wdXQnXG5cdH0sXG5cblx0LyoqIENvbnZlbmllbmNlIHNob3J0Y3V0cyAqL1xuXHRiYXNlTWludXNUTWluID0gYmFzZSAtIHRNaW4sXG5cdGZsb29yID0gTWF0aC5mbG9vcixcblx0c3RyaW5nRnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZSxcblxuXHQvKiogVGVtcG9yYXJ5IHZhcmlhYmxlICovXG5cdGtleTtcblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHQvKipcblx0ICogQSBnZW5lcmljIGVycm9yIHV0aWxpdHkgZnVuY3Rpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIFRoZSBlcnJvciB0eXBlLlxuXHQgKiBAcmV0dXJucyB7RXJyb3J9IFRocm93cyBhIGBSYW5nZUVycm9yYCB3aXRoIHRoZSBhcHBsaWNhYmxlIGVycm9yIG1lc3NhZ2UuXG5cdCAqL1xuXHRmdW5jdGlvbiBlcnJvcih0eXBlKSB7XG5cdFx0dGhyb3cgUmFuZ2VFcnJvcihlcnJvcnNbdHlwZV0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBgQXJyYXkjbWFwYCB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnkgYXJyYXlcblx0ICogaXRlbS5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBhcnJheSBvZiB2YWx1ZXMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZnVuY3Rpb24gbWFwKGFycmF5LCBmbikge1xuXHRcdHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG5cdFx0d2hpbGUgKGxlbmd0aC0tKSB7XG5cdFx0XHRhcnJheVtsZW5ndGhdID0gZm4oYXJyYXlbbGVuZ3RoXSk7XG5cdFx0fVxuXHRcdHJldHVybiBhcnJheTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIHNpbXBsZSBgQXJyYXkjbWFwYC1saWtlIHdyYXBwZXIgdG8gd29yayB3aXRoIGRvbWFpbiBuYW1lIHN0cmluZ3MuXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIGRvbWFpbiBuYW1lLlxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnlcblx0ICogY2hhcmFjdGVyLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IHN0cmluZyBvZiBjaGFyYWN0ZXJzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFja1xuXHQgKiBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcERvbWFpbihzdHJpbmcsIGZuKSB7XG5cdFx0cmV0dXJuIG1hcChzdHJpbmcuc3BsaXQocmVnZXhTZXBhcmF0b3JzKSwgZm4pLmpvaW4oJy4nKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIG51bWVyaWMgY29kZSBwb2ludHMgb2YgZWFjaCBVbmljb2RlXG5cdCAqIGNoYXJhY3RlciBpbiB0aGUgc3RyaW5nLiBXaGlsZSBKYXZhU2NyaXB0IHVzZXMgVUNTLTIgaW50ZXJuYWxseSxcblx0ICogdGhpcyBmdW5jdGlvbiB3aWxsIGNvbnZlcnQgYSBwYWlyIG9mIHN1cnJvZ2F0ZSBoYWx2ZXMgKGVhY2ggb2Ygd2hpY2hcblx0ICogVUNTLTIgZXhwb3NlcyBhcyBzZXBhcmF0ZSBjaGFyYWN0ZXJzKSBpbnRvIGEgc2luZ2xlIGNvZGUgcG9pbnQsXG5cdCAqIG1hdGNoaW5nIFVURi0xNi5cblx0ICogQHNlZSBgcHVueWNvZGUudWNzMi5lbmNvZGVgXG5cdCAqIEBzZWUgPGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG5cdCAqIEBuYW1lIGRlY29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIFRoZSBVbmljb2RlIGlucHV0IHN0cmluZyAoVUNTLTIpLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBuZXcgYXJyYXkgb2YgY29kZSBwb2ludHMuXG5cdCAqL1xuXHRmdW5jdGlvbiB1Y3MyZGVjb2RlKHN0cmluZykge1xuXHRcdHZhciBvdXRwdXQgPSBbXSxcblx0XHQgICAgY291bnRlciA9IDAsXG5cdFx0ICAgIGxlbmd0aCA9IHN0cmluZy5sZW5ndGgsXG5cdFx0ICAgIHZhbHVlLFxuXHRcdCAgICBleHRyYTtcblx0XHR3aGlsZSAoY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0dmFsdWUgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0aWYgKHZhbHVlID49IDB4RDgwMCAmJiB2YWx1ZSA8PSAweERCRkYgJiYgY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0XHQvLyBoaWdoIHN1cnJvZ2F0ZSwgYW5kIHRoZXJlIGlzIGEgbmV4dCBjaGFyYWN0ZXJcblx0XHRcdFx0ZXh0cmEgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0XHRpZiAoKGV4dHJhICYgMHhGQzAwKSA9PSAweERDMDApIHsgLy8gbG93IHN1cnJvZ2F0ZVxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKCgodmFsdWUgJiAweDNGRikgPDwgMTApICsgKGV4dHJhICYgMHgzRkYpICsgMHgxMDAwMCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gdW5tYXRjaGVkIHN1cnJvZ2F0ZTsgb25seSBhcHBlbmQgdGhpcyBjb2RlIHVuaXQsIGluIGNhc2UgdGhlIG5leHRcblx0XHRcdFx0XHQvLyBjb2RlIHVuaXQgaXMgdGhlIGhpZ2ggc3Vycm9nYXRlIG9mIGEgc3Vycm9nYXRlIHBhaXJcblx0XHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0XHRcdFx0Y291bnRlci0tO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhIHN0cmluZyBiYXNlZCBvbiBhbiBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuXHQgKiBAc2VlIGBwdW55Y29kZS51Y3MyLmRlY29kZWBcblx0ICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcblx0ICogQG5hbWUgZW5jb2RlXG5cdCAqIEBwYXJhbSB7QXJyYXl9IGNvZGVQb2ludHMgVGhlIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBuZXcgVW5pY29kZSBzdHJpbmcgKFVDUy0yKS5cblx0ICovXG5cdGZ1bmN0aW9uIHVjczJlbmNvZGUoYXJyYXkpIHtcblx0XHRyZXR1cm4gbWFwKGFycmF5LCBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0dmFyIG91dHB1dCA9ICcnO1xuXHRcdFx0aWYgKHZhbHVlID4gMHhGRkZGKSB7XG5cdFx0XHRcdHZhbHVlIC09IDB4MTAwMDA7XG5cdFx0XHRcdG91dHB1dCArPSBzdHJpbmdGcm9tQ2hhckNvZGUodmFsdWUgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApO1xuXHRcdFx0XHR2YWx1ZSA9IDB4REMwMCB8IHZhbHVlICYgMHgzRkY7XG5cdFx0XHR9XG5cdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlKTtcblx0XHRcdHJldHVybiBvdXRwdXQ7XG5cdFx0fSkuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBiYXNpYyBjb2RlIHBvaW50IGludG8gYSBkaWdpdC9pbnRlZ2VyLlxuXHQgKiBAc2VlIGBkaWdpdFRvQmFzaWMoKWBcblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGNvZGVQb2ludCBUaGUgYmFzaWMgbnVtZXJpYyBjb2RlIHBvaW50IHZhbHVlLlxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQgKGZvciB1c2UgaW5cblx0ICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpbiB0aGUgcmFuZ2UgYDBgIHRvIGBiYXNlIC0gMWAsIG9yIGBiYXNlYCBpZlxuXHQgKiB0aGUgY29kZSBwb2ludCBkb2VzIG5vdCByZXByZXNlbnQgYSB2YWx1ZS5cblx0ICovXG5cdGZ1bmN0aW9uIGJhc2ljVG9EaWdpdChjb2RlUG9pbnQpIHtcblx0XHRpZiAoY29kZVBvaW50IC0gNDggPCAxMCkge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDIyO1xuXHRcdH1cblx0XHRpZiAoY29kZVBvaW50IC0gNjUgPCAyNikge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDY1O1xuXHRcdH1cblx0XHRpZiAoY29kZVBvaW50IC0gOTcgPCAyNikge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDk3O1xuXHRcdH1cblx0XHRyZXR1cm4gYmFzZTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIGRpZ2l0L2ludGVnZXIgaW50byBhIGJhc2ljIGNvZGUgcG9pbnQuXG5cdCAqIEBzZWUgYGJhc2ljVG9EaWdpdCgpYFxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0gZGlnaXQgVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50LlxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgYmFzaWMgY29kZSBwb2ludCB3aG9zZSB2YWx1ZSAod2hlbiB1c2VkIGZvclxuXHQgKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGlzIGBkaWdpdGAsIHdoaWNoIG5lZWRzIHRvIGJlIGluIHRoZSByYW5nZVxuXHQgKiBgMGAgdG8gYGJhc2UgLSAxYC4gSWYgYGZsYWdgIGlzIG5vbi16ZXJvLCB0aGUgdXBwZXJjYXNlIGZvcm0gaXNcblx0ICogdXNlZDsgZWxzZSwgdGhlIGxvd2VyY2FzZSBmb3JtIGlzIHVzZWQuIFRoZSBiZWhhdmlvciBpcyB1bmRlZmluZWRcblx0ICogaWYgYGZsYWdgIGlzIG5vbi16ZXJvIGFuZCBgZGlnaXRgIGhhcyBubyB1cHBlcmNhc2UgZm9ybS5cblx0ICovXG5cdGZ1bmN0aW9uIGRpZ2l0VG9CYXNpYyhkaWdpdCwgZmxhZykge1xuXHRcdC8vICAwLi4yNSBtYXAgdG8gQVNDSUkgYS4ueiBvciBBLi5aXG5cdFx0Ly8gMjYuLjM1IG1hcCB0byBBU0NJSSAwLi45XG5cdFx0cmV0dXJuIGRpZ2l0ICsgMjIgKyA3NSAqIChkaWdpdCA8IDI2KSAtICgoZmxhZyAhPSAwKSA8PCA1KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBCaWFzIGFkYXB0YXRpb24gZnVuY3Rpb24gYXMgcGVyIHNlY3Rpb24gMy40IG9mIFJGQyAzNDkyLlxuXHQgKiBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNDkyI3NlY3Rpb24tMy40XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRmdW5jdGlvbiBhZGFwdChkZWx0YSwgbnVtUG9pbnRzLCBmaXJzdFRpbWUpIHtcblx0XHR2YXIgayA9IDA7XG5cdFx0ZGVsdGEgPSBmaXJzdFRpbWUgPyBmbG9vcihkZWx0YSAvIGRhbXApIDogZGVsdGEgPj4gMTtcblx0XHRkZWx0YSArPSBmbG9vcihkZWx0YSAvIG51bVBvaW50cyk7XG5cdFx0Zm9yICgvKiBubyBpbml0aWFsaXphdGlvbiAqLzsgZGVsdGEgPiBiYXNlTWludXNUTWluICogdE1heCA+PiAxOyBrICs9IGJhc2UpIHtcblx0XHRcdGRlbHRhID0gZmxvb3IoZGVsdGEgLyBiYXNlTWludXNUTWluKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZsb29yKGsgKyAoYmFzZU1pbnVzVE1pbiArIDEpICogZGVsdGEgLyAoZGVsdGEgKyBza2V3KSk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzIHRvIGEgc3RyaW5nIG9mIFVuaWNvZGVcblx0ICogc3ltYm9scy5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKi9cblx0ZnVuY3Rpb24gZGVjb2RlKGlucHV0KSB7XG5cdFx0Ly8gRG9uJ3QgdXNlIFVDUy0yXG5cdFx0dmFyIG91dHB1dCA9IFtdLFxuXHRcdCAgICBpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0XHQgICAgb3V0LFxuXHRcdCAgICBpID0gMCxcblx0XHQgICAgbiA9IGluaXRpYWxOLFxuXHRcdCAgICBiaWFzID0gaW5pdGlhbEJpYXMsXG5cdFx0ICAgIGJhc2ljLFxuXHRcdCAgICBqLFxuXHRcdCAgICBpbmRleCxcblx0XHQgICAgb2xkaSxcblx0XHQgICAgdyxcblx0XHQgICAgayxcblx0XHQgICAgZGlnaXQsXG5cdFx0ICAgIHQsXG5cdFx0ICAgIC8qKiBDYWNoZWQgY2FsY3VsYXRpb24gcmVzdWx0cyAqL1xuXHRcdCAgICBiYXNlTWludXNUO1xuXG5cdFx0Ly8gSGFuZGxlIHRoZSBiYXNpYyBjb2RlIHBvaW50czogbGV0IGBiYXNpY2AgYmUgdGhlIG51bWJlciBvZiBpbnB1dCBjb2RlXG5cdFx0Ly8gcG9pbnRzIGJlZm9yZSB0aGUgbGFzdCBkZWxpbWl0ZXIsIG9yIGAwYCBpZiB0aGVyZSBpcyBub25lLCB0aGVuIGNvcHlcblx0XHQvLyB0aGUgZmlyc3QgYmFzaWMgY29kZSBwb2ludHMgdG8gdGhlIG91dHB1dC5cblxuXHRcdGJhc2ljID0gaW5wdXQubGFzdEluZGV4T2YoZGVsaW1pdGVyKTtcblx0XHRpZiAoYmFzaWMgPCAwKSB7XG5cdFx0XHRiYXNpYyA9IDA7XG5cdFx0fVxuXG5cdFx0Zm9yIChqID0gMDsgaiA8IGJhc2ljOyArK2opIHtcblx0XHRcdC8vIGlmIGl0J3Mgbm90IGEgYmFzaWMgY29kZSBwb2ludFxuXHRcdFx0aWYgKGlucHV0LmNoYXJDb2RlQXQoaikgPj0gMHg4MCkge1xuXHRcdFx0XHRlcnJvcignbm90LWJhc2ljJyk7XG5cdFx0XHR9XG5cdFx0XHRvdXRwdXQucHVzaChpbnB1dC5jaGFyQ29kZUF0KGopKTtcblx0XHR9XG5cblx0XHQvLyBNYWluIGRlY29kaW5nIGxvb3A6IHN0YXJ0IGp1c3QgYWZ0ZXIgdGhlIGxhc3QgZGVsaW1pdGVyIGlmIGFueSBiYXNpYyBjb2RlXG5cdFx0Ly8gcG9pbnRzIHdlcmUgY29waWVkOyBzdGFydCBhdCB0aGUgYmVnaW5uaW5nIG90aGVyd2lzZS5cblxuXHRcdGZvciAoaW5kZXggPSBiYXNpYyA+IDAgPyBiYXNpYyArIDEgOiAwOyBpbmRleCA8IGlucHV0TGVuZ3RoOyAvKiBubyBmaW5hbCBleHByZXNzaW9uICovKSB7XG5cblx0XHRcdC8vIGBpbmRleGAgaXMgdGhlIGluZGV4IG9mIHRoZSBuZXh0IGNoYXJhY3RlciB0byBiZSBjb25zdW1lZC5cblx0XHRcdC8vIERlY29kZSBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyIGludG8gYGRlbHRhYCxcblx0XHRcdC8vIHdoaWNoIGdldHMgYWRkZWQgdG8gYGlgLiBUaGUgb3ZlcmZsb3cgY2hlY2tpbmcgaXMgZWFzaWVyXG5cdFx0XHQvLyBpZiB3ZSBpbmNyZWFzZSBgaWAgYXMgd2UgZ28sIHRoZW4gc3VidHJhY3Qgb2ZmIGl0cyBzdGFydGluZ1xuXHRcdFx0Ly8gdmFsdWUgYXQgdGhlIGVuZCB0byBvYnRhaW4gYGRlbHRhYC5cblx0XHRcdGZvciAob2xkaSA9IGksIHcgPSAxLCBrID0gYmFzZTsgLyogbm8gY29uZGl0aW9uICovOyBrICs9IGJhc2UpIHtcblxuXHRcdFx0XHRpZiAoaW5kZXggPj0gaW5wdXRMZW5ndGgpIHtcblx0XHRcdFx0XHRlcnJvcignaW52YWxpZC1pbnB1dCcpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZGlnaXQgPSBiYXNpY1RvRGlnaXQoaW5wdXQuY2hhckNvZGVBdChpbmRleCsrKSk7XG5cblx0XHRcdFx0aWYgKGRpZ2l0ID49IGJhc2UgfHwgZGlnaXQgPiBmbG9vcigobWF4SW50IC0gaSkgLyB3KSkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aSArPSBkaWdpdCAqIHc7XG5cdFx0XHRcdHQgPSBrIDw9IGJpYXMgPyB0TWluIDogKGsgPj0gYmlhcyArIHRNYXggPyB0TWF4IDogayAtIGJpYXMpO1xuXG5cdFx0XHRcdGlmIChkaWdpdCA8IHQpIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0aWYgKHcgPiBmbG9vcihtYXhJbnQgLyBiYXNlTWludXNUKSkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dyAqPSBiYXNlTWludXNUO1xuXG5cdFx0XHR9XG5cblx0XHRcdG91dCA9IG91dHB1dC5sZW5ndGggKyAxO1xuXHRcdFx0YmlhcyA9IGFkYXB0KGkgLSBvbGRpLCBvdXQsIG9sZGkgPT0gMCk7XG5cblx0XHRcdC8vIGBpYCB3YXMgc3VwcG9zZWQgdG8gd3JhcCBhcm91bmQgZnJvbSBgb3V0YCB0byBgMGAsXG5cdFx0XHQvLyBpbmNyZW1lbnRpbmcgYG5gIGVhY2ggdGltZSwgc28gd2UnbGwgZml4IHRoYXQgbm93OlxuXHRcdFx0aWYgKGZsb29yKGkgLyBvdXQpID4gbWF4SW50IC0gbikge1xuXHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdH1cblxuXHRcdFx0biArPSBmbG9vcihpIC8gb3V0KTtcblx0XHRcdGkgJT0gb3V0O1xuXG5cdFx0XHQvLyBJbnNlcnQgYG5gIGF0IHBvc2l0aW9uIGBpYCBvZiB0aGUgb3V0cHV0XG5cdFx0XHRvdXRwdXQuc3BsaWNlKGkrKywgMCwgbik7XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdWNzMmVuY29kZShvdXRwdXQpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scyB0byBhIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5XG5cdCAqIHN5bWJvbHMuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cblx0ICovXG5cdGZ1bmN0aW9uIGVuY29kZShpbnB1dCkge1xuXHRcdHZhciBuLFxuXHRcdCAgICBkZWx0YSxcblx0XHQgICAgaGFuZGxlZENQQ291bnQsXG5cdFx0ICAgIGJhc2ljTGVuZ3RoLFxuXHRcdCAgICBiaWFzLFxuXHRcdCAgICBqLFxuXHRcdCAgICBtLFxuXHRcdCAgICBxLFxuXHRcdCAgICBrLFxuXHRcdCAgICB0LFxuXHRcdCAgICBjdXJyZW50VmFsdWUsXG5cdFx0ICAgIG91dHB1dCA9IFtdLFxuXHRcdCAgICAvKiogYGlucHV0TGVuZ3RoYCB3aWxsIGhvbGQgdGhlIG51bWJlciBvZiBjb2RlIHBvaW50cyBpbiBgaW5wdXRgLiAqL1xuXHRcdCAgICBpbnB1dExlbmd0aCxcblx0XHQgICAgLyoqIENhY2hlZCBjYWxjdWxhdGlvbiByZXN1bHRzICovXG5cdFx0ICAgIGhhbmRsZWRDUENvdW50UGx1c09uZSxcblx0XHQgICAgYmFzZU1pbnVzVCxcblx0XHQgICAgcU1pbnVzVDtcblxuXHRcdC8vIENvbnZlcnQgdGhlIGlucHV0IGluIFVDUy0yIHRvIFVuaWNvZGVcblx0XHRpbnB1dCA9IHVjczJkZWNvZGUoaW5wdXQpO1xuXG5cdFx0Ly8gQ2FjaGUgdGhlIGxlbmd0aFxuXHRcdGlucHV0TGVuZ3RoID0gaW5wdXQubGVuZ3RoO1xuXG5cdFx0Ly8gSW5pdGlhbGl6ZSB0aGUgc3RhdGVcblx0XHRuID0gaW5pdGlhbE47XG5cdFx0ZGVsdGEgPSAwO1xuXHRcdGJpYXMgPSBpbml0aWFsQmlhcztcblxuXHRcdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHNcblx0XHRmb3IgKGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cdFx0XHRpZiAoY3VycmVudFZhbHVlIDwgMHg4MCkge1xuXHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoY3VycmVudFZhbHVlKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aGFuZGxlZENQQ291bnQgPSBiYXNpY0xlbmd0aCA9IG91dHB1dC5sZW5ndGg7XG5cblx0XHQvLyBgaGFuZGxlZENQQ291bnRgIGlzIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgdGhhdCBoYXZlIGJlZW4gaGFuZGxlZDtcblx0XHQvLyBgYmFzaWNMZW5ndGhgIGlzIHRoZSBudW1iZXIgb2YgYmFzaWMgY29kZSBwb2ludHMuXG5cblx0XHQvLyBGaW5pc2ggdGhlIGJhc2ljIHN0cmluZyAtIGlmIGl0IGlzIG5vdCBlbXB0eSAtIHdpdGggYSBkZWxpbWl0ZXJcblx0XHRpZiAoYmFzaWNMZW5ndGgpIHtcblx0XHRcdG91dHB1dC5wdXNoKGRlbGltaXRlcik7XG5cdFx0fVxuXG5cdFx0Ly8gTWFpbiBlbmNvZGluZyBsb29wOlxuXHRcdHdoaWxlIChoYW5kbGVkQ1BDb3VudCA8IGlucHV0TGVuZ3RoKSB7XG5cblx0XHRcdC8vIEFsbCBub24tYmFzaWMgY29kZSBwb2ludHMgPCBuIGhhdmUgYmVlbiBoYW5kbGVkIGFscmVhZHkuIEZpbmQgdGhlIG5leHRcblx0XHRcdC8vIGxhcmdlciBvbmU6XG5cdFx0XHRmb3IgKG0gPSBtYXhJbnQsIGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA+PSBuICYmIGN1cnJlbnRWYWx1ZSA8IG0pIHtcblx0XHRcdFx0XHRtID0gY3VycmVudFZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIEluY3JlYXNlIGBkZWx0YWAgZW5vdWdoIHRvIGFkdmFuY2UgdGhlIGRlY29kZXIncyA8bixpPiBzdGF0ZSB0byA8bSwwPixcblx0XHRcdC8vIGJ1dCBndWFyZCBhZ2FpbnN0IG92ZXJmbG93XG5cdFx0XHRoYW5kbGVkQ1BDb3VudFBsdXNPbmUgPSBoYW5kbGVkQ1BDb3VudCArIDE7XG5cdFx0XHRpZiAobSAtIG4gPiBmbG9vcigobWF4SW50IC0gZGVsdGEpIC8gaGFuZGxlZENQQ291bnRQbHVzT25lKSkge1xuXHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdH1cblxuXHRcdFx0ZGVsdGEgKz0gKG0gLSBuKSAqIGhhbmRsZWRDUENvdW50UGx1c09uZTtcblx0XHRcdG4gPSBtO1xuXG5cdFx0XHRmb3IgKGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblxuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlIDwgbiAmJiArK2RlbHRhID4gbWF4SW50KSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlID09IG4pIHtcblx0XHRcdFx0XHQvLyBSZXByZXNlbnQgZGVsdGEgYXMgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlclxuXHRcdFx0XHRcdGZvciAocSA9IGRlbHRhLCBrID0gYmFzZTsgLyogbm8gY29uZGl0aW9uICovOyBrICs9IGJhc2UpIHtcblx0XHRcdFx0XHRcdHQgPSBrIDw9IGJpYXMgPyB0TWluIDogKGsgPj0gYmlhcyArIHRNYXggPyB0TWF4IDogayAtIGJpYXMpO1xuXHRcdFx0XHRcdFx0aWYgKHEgPCB0KSB7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cU1pbnVzVCA9IHEgLSB0O1xuXHRcdFx0XHRcdFx0YmFzZU1pbnVzVCA9IGJhc2UgLSB0O1xuXHRcdFx0XHRcdFx0b3V0cHV0LnB1c2goXG5cdFx0XHRcdFx0XHRcdHN0cmluZ0Zyb21DaGFyQ29kZShkaWdpdFRvQmFzaWModCArIHFNaW51c1QgJSBiYXNlTWludXNULCAwKSlcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRxID0gZmxvb3IocU1pbnVzVCAvIGJhc2VNaW51c1QpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShkaWdpdFRvQmFzaWMocSwgMCkpKTtcblx0XHRcdFx0XHRiaWFzID0gYWRhcHQoZGVsdGEsIGhhbmRsZWRDUENvdW50UGx1c09uZSwgaGFuZGxlZENQQ291bnQgPT0gYmFzaWNMZW5ndGgpO1xuXHRcdFx0XHRcdGRlbHRhID0gMDtcblx0XHRcdFx0XHQrK2hhbmRsZWRDUENvdW50O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCsrZGVsdGE7XG5cdFx0XHQrK247XG5cblx0XHR9XG5cdFx0cmV0dXJuIG91dHB1dC5qb2luKCcnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyByZXByZXNlbnRpbmcgYSBkb21haW4gbmFtZSB0byBVbmljb2RlLiBPbmx5IHRoZVxuXHQgKiBQdW55Y29kZWQgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLCBpLmUuIGl0IGRvZXNuJ3Rcblx0ICogbWF0dGVyIGlmIHlvdSBjYWxsIGl0IG9uIGEgc3RyaW5nIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBjb252ZXJ0ZWQgdG9cblx0ICogVW5pY29kZS5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIFB1bnljb2RlIGRvbWFpbiBuYW1lIHRvIGNvbnZlcnQgdG8gVW5pY29kZS5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIFVuaWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIFB1bnljb2RlXG5cdCAqIHN0cmluZy5cblx0ICovXG5cdGZ1bmN0aW9uIHRvVW5pY29kZShkb21haW4pIHtcblx0XHRyZXR1cm4gbWFwRG9tYWluKGRvbWFpbiwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhQdW55Y29kZS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyBkZWNvZGUoc3RyaW5nLnNsaWNlKDQpLnRvTG93ZXJDYXNlKCkpXG5cdFx0XHRcdDogc3RyaW5nO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgVW5pY29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgdG8gUHVueWNvZGUuIE9ubHkgdGhlXG5cdCAqIG5vbi1BU0NJSSBwYXJ0cyBvZiB0aGUgZG9tYWluIG5hbWUgd2lsbCBiZSBjb252ZXJ0ZWQsIGkuZS4gaXQgZG9lc24ndFxuXHQgKiBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgd2l0aCBhIGRvbWFpbiB0aGF0J3MgYWxyZWFkeSBpbiBBU0NJSS5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIGRvbWFpbiBuYW1lIHRvIGNvbnZlcnQsIGFzIGEgVW5pY29kZSBzdHJpbmcuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBQdW55Y29kZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZ2l2ZW4gZG9tYWluIG5hbWUuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b0FTQ0lJKGRvbWFpbikge1xuXHRcdHJldHVybiBtYXBEb21haW4oZG9tYWluLCBmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiByZWdleE5vbkFTQ0lJLnRlc3Qoc3RyaW5nKVxuXHRcdFx0XHQ/ICd4bi0tJyArIGVuY29kZShzdHJpbmcpXG5cdFx0XHRcdDogc3RyaW5nO1xuXHRcdH0pO1xuXHR9XG5cblx0LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cblx0LyoqIERlZmluZSB0aGUgcHVibGljIEFQSSAqL1xuXHRwdW55Y29kZSA9IHtcblx0XHQvKipcblx0XHQgKiBBIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGN1cnJlbnQgUHVueWNvZGUuanMgdmVyc2lvbiBudW1iZXIuXG5cdFx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdFx0ICogQHR5cGUgU3RyaW5nXG5cdFx0ICovXG5cdFx0J3ZlcnNpb24nOiAnMS4yLjQnLFxuXHRcdC8qKlxuXHRcdCAqIEFuIG9iamVjdCBvZiBtZXRob2RzIHRvIGNvbnZlcnQgZnJvbSBKYXZhU2NyaXB0J3MgaW50ZXJuYWwgY2hhcmFjdGVyXG5cdFx0ICogcmVwcmVzZW50YXRpb24gKFVDUy0yKSB0byBVbmljb2RlIGNvZGUgcG9pbnRzLCBhbmQgYmFjay5cblx0XHQgKiBAc2VlIDxodHRwOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIE9iamVjdFxuXHRcdCAqL1xuXHRcdCd1Y3MyJzoge1xuXHRcdFx0J2RlY29kZSc6IHVjczJkZWNvZGUsXG5cdFx0XHQnZW5jb2RlJzogdWNzMmVuY29kZVxuXHRcdH0sXG5cdFx0J2RlY29kZSc6IGRlY29kZSxcblx0XHQnZW5jb2RlJzogZW5jb2RlLFxuXHRcdCd0b0FTQ0lJJzogdG9BU0NJSSxcblx0XHQndG9Vbmljb2RlJzogdG9Vbmljb2RlXG5cdH07XG5cblx0LyoqIEV4cG9zZSBgcHVueWNvZGVgICovXG5cdC8vIFNvbWUgQU1EIGJ1aWxkIG9wdGltaXplcnMsIGxpa2Ugci5qcywgY2hlY2sgZm9yIHNwZWNpZmljIGNvbmRpdGlvbiBwYXR0ZXJuc1xuXHQvLyBsaWtlIHRoZSBmb2xsb3dpbmc6XG5cdGlmIChcblx0XHR0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiZcblx0XHR0eXBlb2YgZGVmaW5lLmFtZCA9PSAnb2JqZWN0JyAmJlxuXHRcdGRlZmluZS5hbWRcblx0KSB7XG5cdFx0ZGVmaW5lKCdwdW55Y29kZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHB1bnljb2RlO1xuXHRcdH0pO1xuXHR9IGVsc2UgaWYgKGZyZWVFeHBvcnRzICYmICFmcmVlRXhwb3J0cy5ub2RlVHlwZSkge1xuXHRcdGlmIChmcmVlTW9kdWxlKSB7IC8vIGluIE5vZGUuanMgb3IgUmluZ29KUyB2MC44LjArXG5cdFx0XHRmcmVlTW9kdWxlLmV4cG9ydHMgPSBwdW55Y29kZTtcblx0XHR9IGVsc2UgeyAvLyBpbiBOYXJ3aGFsIG9yIFJpbmdvSlMgdjAuNy4wLVxuXHRcdFx0Zm9yIChrZXkgaW4gcHVueWNvZGUpIHtcblx0XHRcdFx0cHVueWNvZGUuaGFzT3duUHJvcGVydHkoa2V5KSAmJiAoZnJlZUV4cG9ydHNba2V5XSA9IHB1bnljb2RlW2tleV0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHsgLy8gaW4gUmhpbm8gb3IgYSB3ZWIgYnJvd3NlclxuXHRcdHJvb3QucHVueWNvZGUgPSBwdW55Y29kZTtcblx0fVxuXG59KHRoaXMpKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGlzID0gcmVxdWlyZSgnLi9pcycpXG5cbi8qIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIE9XTCBKYXZhU2NyaXB0IFV0aWxpdGllcy5cblxuT1dMIEphdmFTY3JpcHQgVXRpbGl0aWVzIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vclxubW9kaWZ5IGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG5hcyBwdWJsaXNoZWQgYnkgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZlxudGhlIExpY2Vuc2UsIG9yIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG5cbk9XTCBKYXZhU2NyaXB0IFV0aWxpdGllcyBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2Zcbk1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbkdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuXG5Zb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG5MaWNlbnNlIGFsb25nIHdpdGggT1dMIEphdmFTY3JpcHQgVXRpbGl0aWVzLiAgSWYgbm90LCBzZWVcbjxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiovXG5cbi8vIFJlLXVzYWJsZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiB1c2VkIGJ5IGNsb25lKClcbmZ1bmN0aW9uIENsb25lKCkge31cblxuLy8gQ2xvbmUgb2JqZWN0cywgc2tpcCBvdGhlciB0eXBlc1xuZnVuY3Rpb24gY2xvbmUodGFyZ2V0KSB7XG4gIGlmICh0eXBlb2YgdGFyZ2V0ID09ICdvYmplY3QnKSB7XG4gICAgQ2xvbmUucHJvdG90eXBlID0gdGFyZ2V0XG4gICAgcmV0dXJuIG5ldyBDbG9uZSgpXG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIHRhcmdldFxuICB9XG59XG5cbi8vIFNoYWxsb3cgQ29weVxuZnVuY3Rpb24gY29weSh0YXJnZXQpIHtcbiAgaWYgKHR5cGVvZiB0YXJnZXQgIT0gJ29iamVjdCcpIHtcbiAgICAvLyBOb24tb2JqZWN0cyBoYXZlIHZhbHVlIHNlbWFudGljcywgc28gdGFyZ2V0IGlzIGFscmVhZHkgYSBjb3B5XG4gICAgcmV0dXJuIHRhcmdldFxuICB9XG4gIGVsc2Uge1xuICAgIHZhciB2YWx1ZSA9IHRhcmdldC52YWx1ZU9mKClcbiAgICBpZiAodGFyZ2V0ICE9IHZhbHVlKSB7XG4gICAgICAvLyB0aGUgb2JqZWN0IGlzIGEgc3RhbmRhcmQgb2JqZWN0IHdyYXBwZXIgZm9yIGEgbmF0aXZlIHR5cGUsIHNheSBTdHJpbmcuXG4gICAgICAvLyB3ZSBjYW4gbWFrZSBhIGNvcHkgYnkgaW5zdGFudGlhdGluZyBhIG5ldyBvYmplY3QgYXJvdW5kIHRoZSB2YWx1ZS5cbiAgICAgIHJldHVybiBuZXcgdGFyZ2V0LmNvbnN0cnVjdG9yKHZhbHVlKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZhciBjLCBwcm9wZXJ0eVxuICAgICAgLy8gV2UgaGF2ZSBhIG5vcm1hbCBvYmplY3QuIElmIHBvc3NpYmxlLCB3ZSdsbCBjbG9uZSB0aGUgb3JpZ2luYWwnc1xuICAgICAgLy8gcHJvdG90eXBlIChub3QgdGhlIG9yaWdpbmFsKSB0byBnZXQgYW4gZW1wdHkgb2JqZWN0IHdpdGggdGhlIHNhbWVcbiAgICAgIC8vIHByb3RvdHlwZSBjaGFpbiBhcyB0aGUgb3JpZ2luYWwuIElmIGp1c3QgY29weSB0aGUgaW5zdGFuY2UgcHJvcGVydGllcy5cbiAgICAgIC8vIE90aGVyd2lzZSwgd2UgaGF2ZSB0byBjb3B5IHRoZSB3aG9sZSB0aGluZywgcHJvcGVydHktYnktcHJvcGVydHkuXG4gICAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgdGFyZ2V0LmNvbnN0cnVjdG9yICYmIHRhcmdldC5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KSB7XG4gICAgICAgIGMgPSBjbG9uZSh0YXJnZXQuY29uc3RydWN0b3IucHJvdG90eXBlKVxuXG4gICAgICAgIC8vIEdpdmUgdGhlIGNvcHkgYWxsIHRoZSBpbnN0YW5jZSBwcm9wZXJ0aWVzIG9mIHRhcmdldC4gSXQgaGFzIHRoZSBzYW1lXG4gICAgICAgIC8vIHByb3RvdHlwZSBhcyB0YXJnZXQsIHNvIGluaGVyaXRlZCBwcm9wZXJ0aWVzIGFyZSBhbHJlYWR5IHRoZXJlLlxuICAgICAgICBmb3IgKHByb3BlcnR5IGluIHRhcmdldCkge1xuICAgICAgICAgIGlmICh0YXJnZXQuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG4gICAgICAgICAgICBjW3Byb3BlcnR5XSA9IHRhcmdldFtwcm9wZXJ0eV1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjID0ge31cbiAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiB0YXJnZXQpIHtcbiAgICAgICAgICBjW3Byb3BlcnR5XSA9IHRhcmdldFtwcm9wZXJ0eV1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gY1xuICAgIH1cbiAgfVxufVxuXG4vLyBEZWVwIENvcHlcbnZhciBkZWVwQ29waWVycyA9IFtdXG5cbmZ1bmN0aW9uIERlZXBDb3BpZXIoY29uZmlnKSB7XG4gIGZvciAodmFyIGtleSBpbiBjb25maWcpIHtcbiAgICB0aGlzW2tleV0gPSBjb25maWdba2V5XVxuICB9XG59XG5cbkRlZXBDb3BpZXIucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogRGVlcENvcGllclxuXG4gIC8vIERldGVybWluZXMgaWYgdGhpcyBEZWVwQ29waWVyIGNhbiBoYW5kbGUgdGhlIGdpdmVuIG9iamVjdC5cbiwgY2FuQ29weTogZnVuY3Rpb24oc291cmNlKSB7IHJldHVybiBmYWxzZSB9XG5cbiAgLy8gU3RhcnRzIHRoZSBkZWVwIGNvcHlpbmcgcHJvY2VzcyBieSBjcmVhdGluZyB0aGUgY29weSBvYmplY3QuIFlvdSBjYW5cbiAgLy8gaW5pdGlhbGl6ZSBhbnkgcHJvcGVydGllcyB5b3Ugd2FudCwgYnV0IHlvdSBjYW4ndCBjYWxsIHJlY3Vyc2l2ZWx5IGludG8gdGhlXG4gIC8vIERlZXBDb3B5QWxnb3JpdGhtLlxuLCBjcmVhdGU6IGZ1bmN0aW9uKHNvdXJjZSkge31cblxuICAvLyBDb21wbGV0ZXMgdGhlIGRlZXAgY29weSBvZiB0aGUgc291cmNlIG9iamVjdCBieSBwb3B1bGF0aW5nIGFueSBwcm9wZXJ0aWVzXG4gIC8vIHRoYXQgbmVlZCB0byBiZSByZWN1cnNpdmVseSBkZWVwIGNvcGllZC4gWW91IGNhbiBkbyB0aGlzIGJ5IHVzaW5nIHRoZVxuICAvLyBwcm92aWRlZCBkZWVwQ29weUFsZ29yaXRobSBpbnN0YW5jZSdzIGRlZXBDb3B5KCkgbWV0aG9kLiBUaGlzIHdpbGwgaGFuZGxlXG4gIC8vIGN5Y2xpYyByZWZlcmVuY2VzIGZvciBvYmplY3RzIGFscmVhZHkgZGVlcENvcGllZCwgaW5jbHVkaW5nIHRoZSBzb3VyY2VcbiAgLy8gb2JqZWN0IGl0c2VsZi4gVGhlIFwicmVzdWx0XCIgcGFzc2VkIGluIGlzIHRoZSBvYmplY3QgcmV0dXJuZWQgZnJvbSBjcmVhdGUoKS5cbiwgcG9wdWxhdGU6IGZ1bmN0aW9uKGRlZXBDb3B5QWxnb3JpdGhtLCBzb3VyY2UsIHJlc3VsdCkge31cbn1cblxuZnVuY3Rpb24gRGVlcENvcHlBbGdvcml0aG0oKSB7XG4gIC8vIGNvcGllZE9iamVjdHMga2VlcHMgdHJhY2sgb2Ygb2JqZWN0cyBhbHJlYWR5IGNvcGllZCBieSB0aGlzIGRlZXBDb3B5XG4gIC8vIG9wZXJhdGlvbiwgc28gd2UgY2FuIGNvcnJlY3RseSBoYW5kbGUgY3ljbGljIHJlZmVyZW5jZXMuXG4gIHRoaXMuY29waWVkT2JqZWN0cyA9IFtdXG4gIHZhciB0aGlzUGFzcyA9IHRoaXNcbiAgdGhpcy5yZWN1cnNpdmVEZWVwQ29weSA9IGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgIHJldHVybiB0aGlzUGFzcy5kZWVwQ29weShzb3VyY2UpXG4gIH1cbiAgdGhpcy5kZXB0aCA9IDBcbn1cbkRlZXBDb3B5QWxnb3JpdGhtLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IERlZXBDb3B5QWxnb3JpdGhtXG5cbiwgbWF4RGVwdGg6IDI1NlxuXG4gIC8vIEFkZCBhbiBvYmplY3QgdG8gdGhlIGNhY2hlLiAgTm8gYXR0ZW1wdCBpcyBtYWRlIHRvIGZpbHRlciBkdXBsaWNhdGVzOyB3ZVxuICAvLyBhbHdheXMgY2hlY2sgZ2V0Q2FjaGVkUmVzdWx0KCkgYmVmb3JlIGNhbGxpbmcgaXQuXG4sIGNhY2hlUmVzdWx0OiBmdW5jdGlvbihzb3VyY2UsIHJlc3VsdCkge1xuICAgIHRoaXMuY29waWVkT2JqZWN0cy5wdXNoKFtzb3VyY2UsIHJlc3VsdF0pXG4gIH1cblxuICAvLyBSZXR1cm5zIHRoZSBjYWNoZWQgY29weSBvZiBhIGdpdmVuIG9iamVjdCwgb3IgdW5kZWZpbmVkIGlmIGl0J3MgYW4gb2JqZWN0XG4gIC8vIHdlIGhhdmVuJ3Qgc2VlbiBiZWZvcmUuXG4sIGdldENhY2hlZFJlc3VsdDogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgdmFyIGNvcGllZE9iamVjdHMgPSB0aGlzLmNvcGllZE9iamVjdHNcbiAgICB2YXIgbGVuZ3RoID0gY29waWVkT2JqZWN0cy5sZW5ndGhcbiAgICBmb3IgKCB2YXIgaT0wOyBpPGxlbmd0aDsgaSsrICkge1xuICAgICAgaWYgKCBjb3BpZWRPYmplY3RzW2ldWzBdID09PSBzb3VyY2UgKSB7XG4gICAgICAgIHJldHVybiBjb3BpZWRPYmplY3RzW2ldWzFdXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuXG4gIC8vIGRlZXBDb3B5IGhhbmRsZXMgdGhlIHNpbXBsZSBjYXNlcyBpdHNlbGY6IG5vbi1vYmplY3RzIGFuZCBvYmplY3QncyB3ZSd2ZVxuICAvLyBzZWVuIGJlZm9yZS4gRm9yIGNvbXBsZXggY2FzZXMsIGl0IGZpcnN0IGlkZW50aWZpZXMgYW4gYXBwcm9wcmlhdGVcbiAgLy8gRGVlcENvcGllciwgdGhlbiBjYWxscyBhcHBseURlZXBDb3BpZXIoKSB0byBkZWxlZ2F0ZSB0aGUgZGV0YWlscyBvZiBjb3B5aW5nXG4gIC8vIHRoZSBvYmplY3QgdG8gdGhhdCBEZWVwQ29waWVyLlxuLCBkZWVwQ29weTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgLy8gbnVsbCBpcyBhIHNwZWNpYWwgY2FzZTogaXQncyB0aGUgb25seSB2YWx1ZSBvZiB0eXBlICdvYmplY3QnIHdpdGhvdXRcbiAgICAvLyBwcm9wZXJ0aWVzLlxuICAgIGlmIChzb3VyY2UgPT09IG51bGwpIHsgcmV0dXJuIG51bGwgfVxuXG4gICAgLy8gQWxsIG5vbi1vYmplY3RzIHVzZSB2YWx1ZSBzZW1hbnRpY3MgYW5kIGRvbid0IG5lZWQgZXhwbGljdCBjb3B5aW5nXG4gICAgaWYgKHR5cGVvZiBzb3VyY2UgIT0gJ29iamVjdCcpIHsgcmV0dXJuIHNvdXJjZSB9XG5cbiAgICB2YXIgY2FjaGVkUmVzdWx0ID0gdGhpcy5nZXRDYWNoZWRSZXN1bHQoc291cmNlKVxuXG4gICAgLy8gV2UndmUgYWxyZWFkeSBzZWVuIHRoaXMgb2JqZWN0IGR1cmluZyB0aGlzIGRlZXAgY29weSBvcGVyYXRpb24gc28gY2FuXG4gICAgLy8gaW1tZWRpYXRlbHkgcmV0dXJuIHRoZSByZXN1bHQuIFRoaXMgcHJlc2VydmVzIHRoZSBjeWNsaWMgcmVmZXJlbmNlXG4gICAgLy8gc3RydWN0dXJlIGFuZCBwcm90ZWN0cyB1cyBmcm9tIGluZmluaXRlIHJlY3Vyc2lvbi5cbiAgICBpZiAoY2FjaGVkUmVzdWx0KSB7IHJldHVybiBjYWNoZWRSZXN1bHQgfVxuXG4gICAgLy8gT2JqZWN0cyBtYXkgbmVlZCBzcGVjaWFsIGhhbmRsaW5nIGRlcGVuZGluZyBvbiB0aGVpciBjbGFzcy4gVGhlcmUgaXMgYVxuICAgIC8vIGNsYXNzIG9mIGhhbmRsZXJzIGNhbGwgXCJEZWVwQ29waWVyc1wiIHRoYXQga25vdyBob3cgdG8gY29weSBjZXJ0YWluXG4gICAgLy8gb2JqZWN0cy4gVGhlcmUgaXMgYWxzbyBhIGZpbmFsLCBnZW5lcmljIGRlZXAgY29waWVyIHRoYXQgY2FuIGhhbmRsZSBhbnlcbiAgICAvLyBvYmplY3QuXG4gICAgZm9yICh2YXIgaT0wOyBpPGRlZXBDb3BpZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZGVlcENvcGllciA9IGRlZXBDb3BpZXJzW2ldXG4gICAgICBpZiAoZGVlcENvcGllci5jYW5Db3B5KHNvdXJjZSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXBwbHlEZWVwQ29waWVyKGRlZXBDb3BpZXIsIHNvdXJjZSlcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gVGhlIGdlbmVyaWMgY29waWVyIGNhbiBoYW5kbGUgYW55dGhpbmcsIHNvIHdlIHNob3VsZCBuZXZlciByZWFjaCB0aGlzXG4gICAgLy8gbGluZS5cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIERlZXBDb3BpZXIgaXMgYWJsZSB0byBjb3B5ICcgKyBzb3VyY2UpXG4gIH1cblxuICAvLyBPbmNlIHdlJ3ZlIGlkZW50aWZpZWQgd2hpY2ggRGVlcENvcGllciB0byB1c2UsIHdlIG5lZWQgdG8gY2FsbCBpdCBpbiBhXG4gIC8vIHZlcnkgcGFydGljdWxhciBvcmRlcjogY3JlYXRlLCBjYWNoZSwgcG9wdWxhdGUuVGhpcyBpcyB0aGUga2V5IHRvIGRldGVjdGluZ1xuICAvLyBjeWNsZXMuIFdlIGFsc28ga2VlcCB0cmFjayBvZiByZWN1cnNpb24gZGVwdGggd2hlbiBjYWxsaW5nIHRoZSBwb3RlbnRpYWxseVxuICAvLyByZWN1cnNpdmUgcG9wdWxhdGUoKTogdGhpcyBpcyBhIGZhaWwtZmFzdCB0byBwcmV2ZW50IGFuIGluZmluaXRlIGxvb3AgZnJvbVxuICAvLyBjb25zdW1pbmcgYWxsIGF2YWlsYWJsZSBtZW1vcnkgYW5kIGNyYXNoaW5nIG9yIHNsb3dpbmcgZG93biB0aGUgYnJvd3Nlci5cbiwgYXBwbHlEZWVwQ29waWVyOiBmdW5jdGlvbihkZWVwQ29waWVyLCBzb3VyY2UpIHtcbiAgICAvLyBTdGFydCBieSBjcmVhdGluZyBhIHN0dWIgb2JqZWN0IHRoYXQgcmVwcmVzZW50cyB0aGUgY29weS5cbiAgICB2YXIgcmVzdWx0ID0gZGVlcENvcGllci5jcmVhdGUoc291cmNlKVxuXG4gICAgLy8gV2Ugbm93IGtub3cgdGhlIGRlZXAgY29weSBvZiBzb3VyY2Ugc2hvdWxkIGFsd2F5cyBiZSByZXN1bHQsIHNvIGlmIHdlXG4gICAgLy8gZW5jb3VudGVyIHNvdXJjZSBhZ2FpbiBkdXJpbmcgdGhpcyBkZWVwIGNvcHkgd2UgY2FuIGltbWVkaWF0ZWx5IHVzZVxuICAgIC8vIHJlc3VsdCBpbnN0ZWFkIG9mIGRlc2NlbmRpbmcgaW50byBpdCByZWN1cnNpdmVseS5cbiAgICB0aGlzLmNhY2hlUmVzdWx0KHNvdXJjZSwgcmVzdWx0KVxuXG4gICAgLy8gT25seSBEZWVwQ29waWVyLnBvcHVsYXRlKCkgY2FuIHJlY3Vyc2l2ZWx5IGRlZXAgY29weS4gIG8sIHRvIGtlZXAgdHJhY2tcbiAgICAvLyBvZiByZWN1cnNpb24gZGVwdGgsIHdlIGluY3JlbWVudCB0aGlzIHNoYXJlZCBjb3VudGVyIGJlZm9yZSBjYWxsaW5nIGl0LFxuICAgIC8vIGFuZCBkZWNyZW1lbnQgaXQgYWZ0ZXJ3YXJkcy5cbiAgICB0aGlzLmRlcHRoKytcbiAgICBpZiAodGhpcy5kZXB0aCA+IHRoaXMubWF4RGVwdGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4Y2VlZGVkIG1heCByZWN1cnNpb24gZGVwdGggaW4gZGVlcCBjb3B5LlwiKVxuICAgIH1cblxuICAgIC8vIEl0J3Mgbm93IHNhZmUgdG8gbGV0IHRoZSBkZWVwQ29waWVyIHJlY3Vyc2l2ZWx5IGRlZXAgY29weSBpdHMgcHJvcGVydGllc1xuICAgIGRlZXBDb3BpZXIucG9wdWxhdGUodGhpcy5yZWN1cnNpdmVEZWVwQ29weSwgc291cmNlLCByZXN1bHQpXG5cbiAgICB0aGlzLmRlcHRoLS1cblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxufVxuXG4vLyBFbnRyeSBwb2ludCBmb3IgZGVlcCBjb3B5LlxuLy8gICBzb3VyY2UgaXMgdGhlIG9iamVjdCB0byBiZSBkZWVwIGNvcGllZC5cbi8vICAgbWF4RGVwdGggaXMgYW4gb3B0aW9uYWwgcmVjdXJzaW9uIGxpbWl0LiBEZWZhdWx0cyB0byAyNTYuXG5mdW5jdGlvbiBkZWVwQ29weShzb3VyY2UsIG1heERlcHRoKSB7XG4gIHZhciBkZWVwQ29weUFsZ29yaXRobSA9IG5ldyBEZWVwQ29weUFsZ29yaXRobSgpXG4gIGlmIChtYXhEZXB0aCkge1xuICAgIGRlZXBDb3B5QWxnb3JpdGhtLm1heERlcHRoID0gbWF4RGVwdGhcbiAgfVxuICByZXR1cm4gZGVlcENvcHlBbGdvcml0aG0uZGVlcENvcHkoc291cmNlKVxufVxuXG4vLyBQdWJsaWNseSBleHBvc2UgdGhlIERlZXBDb3BpZXIgY2xhc3NcbmRlZXBDb3B5LkRlZXBDb3BpZXIgPSBEZWVwQ29waWVyXG5cbi8vIFB1YmxpY2x5IGV4cG9zZSB0aGUgbGlzdCBvZiBkZWVwQ29waWVyc1xuZGVlcENvcHkuZGVlcENvcGllcnMgPSBkZWVwQ29waWVyc1xuXG4vLyBNYWtlIGRlZXBDb3B5KCkgZXh0ZW5zaWJsZSBieSBhbGxvd2luZyBvdGhlcnMgdG8gcmVnaXN0ZXIgdGhlaXIgb3duIGN1c3RvbVxuLy8gRGVlcENvcGllcnMuXG5kZWVwQ29weS5yZWdpc3RlciA9IGZ1bmN0aW9uKGRlZXBDb3BpZXIpIHtcbiAgaWYgKCEoZGVlcENvcGllciBpbnN0YW5jZW9mIERlZXBDb3BpZXIpKSB7XG4gICAgZGVlcENvcGllciA9IG5ldyBEZWVwQ29waWVyKGRlZXBDb3BpZXIpXG4gIH1cbiAgZGVlcENvcGllcnMudW5zaGlmdChkZWVwQ29waWVyKVxufVxuXG4vLyBHZW5lcmljIE9iamVjdCBjb3BpZXJcbi8vIFRoZSB1bHRpbWF0ZSBmYWxsYmFjayBEZWVwQ29waWVyLCB3aGljaCB0cmllcyB0byBoYW5kbGUgdGhlIGdlbmVyaWMgY2FzZS5cbi8vIFRoaXMgc2hvdWxkIHdvcmsgZm9yIGJhc2UgT2JqZWN0cyBhbmQgbWFueSB1c2VyLWRlZmluZWQgY2xhc3Nlcy5cbmRlZXBDb3B5LnJlZ2lzdGVyKHtcbiAgY2FuQ29weTogZnVuY3Rpb24oc291cmNlKSB7IHJldHVybiB0cnVlIH1cblxuLCBjcmVhdGU6IGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBzb3VyY2UuY29uc3RydWN0b3IpIHtcbiAgICAgIHJldHVybiBjbG9uZShzb3VyY2UuY29uc3RydWN0b3IucHJvdG90eXBlKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiB7fVxuICAgIH1cbiAgfVxuXG4sIHBvcHVsYXRlOiBmdW5jdGlvbihkZWVwQ29weSwgc291cmNlLCByZXN1bHQpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSBkZWVwQ29weShzb3VyY2Vba2V5XSlcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG59KVxuXG4vLyBBcnJheSBjb3BpZXJcbmRlZXBDb3B5LnJlZ2lzdGVyKHtcbiAgY2FuQ29weTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgcmV0dXJuIGlzLkFycmF5KHNvdXJjZSlcbiAgfVxuXG4sIGNyZWF0ZTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgcmV0dXJuIG5ldyBzb3VyY2UuY29uc3RydWN0b3IoKVxuICB9XG5cbiwgcG9wdWxhdGU6IGZ1bmN0aW9uKGRlZXBDb3B5LCBzb3VyY2UsIHJlc3VsdCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc291cmNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICByZXN1bHQucHVzaChkZWVwQ29weShzb3VyY2VbaV0pKVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cbn0pXG5cbi8vIERhdGUgY29waWVyXG5kZWVwQ29weS5yZWdpc3Rlcih7XG4gIGNhbkNvcHk6IGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgIHJldHVybiBpcy5EYXRlKHNvdXJjZSlcbiAgfVxuXG4sIGNyZWF0ZTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHNvdXJjZSlcbiAgfVxufSlcblxuLy8gUmVnRXhwIGNvcGllclxuZGVlcENvcHkucmVnaXN0ZXIoe1xuICBjYW5Db3B5OiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICByZXR1cm4gaXMuUmVnRXhwKHNvdXJjZSlcbiAgfVxuXG4sIGNyZWF0ZTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgcmV0dXJuIHNvdXJjZVxuICB9XG59KVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgRGVlcENvcHlBbGdvcml0aG06IERlZXBDb3B5QWxnb3JpdGhtXG4sIGNvcHk6IGNvcHlcbiwgY2xvbmU6IGNsb25lXG4sIGRlZXBDb3B5OiBkZWVwQ29weVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2VcbiAgLCBmb3JtYXRSZWdFeHAgPSAvJVslc10vZ1xuICAsIGZvcm1hdE9ialJlZ0V4cCA9IC8oe3s/KShcXHcrKX0vZ1xuXG4vKipcbiAqIFJlcGxhY2VzICVzIHBsYWNlaG9sZGVycyBpbiBhIHN0cmluZyB3aXRoIHBvc2l0aW9uYWwgYXJndW1lbnRzLlxuICovXG5mdW5jdGlvbiBmb3JtYXQocykge1xuICByZXR1cm4gZm9ybWF0QXJyKHMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSlcbn1cblxuLyoqXG4gKiBSZXBsYWNlcyAlcyBwbGFjZWhvbGRlcnMgaW4gYSBzdHJpbmcgd2l0aCBhcnJheSBjb250ZW50cy5cbiAqL1xuZnVuY3Rpb24gZm9ybWF0QXJyKHMsIGEpIHtcbiAgdmFyIGkgPSAwXG4gIHJldHVybiBzLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbihtKSB7IHJldHVybiBtID09ICclJScgPyAnJScgOiBhW2krK10gfSlcbn1cblxuLyoqXG4gKiBSZXBsYWNlcyB7cHJvcGVydHlOYW1lfSBwbGFjZWhvbGRlcnMgaW4gYSBzdHJpbmcgd2l0aCBvYmplY3QgcHJvcGVydGllcy5cbiAqL1xuZnVuY3Rpb24gZm9ybWF0T2JqKHMsIG8pIHtcbiAgcmV0dXJuIHMucmVwbGFjZShmb3JtYXRPYmpSZWdFeHAsIGZ1bmN0aW9uKG0sIGIsIHApIHsgcmV0dXJuIGIubGVuZ3RoID09IDIgPyBtLnNsaWNlKDEpIDogb1twXSB9KVxufVxuXG52YXIgdW5pdHMgPSAna01HVFBFWlknXG4gICwgc3RyaXBEZWNpbWFscyA9IC9cXC4wMCR8MCQvXG5cbi8qKlxuICogRm9ybWF0cyBieXRlcyBhcyBhIGZpbGUgc2l6ZSB3aXRoIHRoZSBhcHByb3ByaWF0ZWx5IHNjYWxlZCB1bml0cy5cbiAqL1xuZnVuY3Rpb24gZmlsZVNpemUoYnl0ZXMsIHRocmVzaG9sZCkge1xuICB0aHJlc2hvbGQgPSBNYXRoLm1pbih0aHJlc2hvbGQgfHwgNzY4LCAxMDI0KVxuICB2YXIgaSA9IC0xXG4gICAgLCB1bml0ID0gJ2J5dGVzJ1xuICAgICwgc2l6ZSA9IGJ5dGVzXG4gIHdoaWxlIChzaXplID4gdGhyZXNob2xkICYmIGkgPCB1bml0cy5sZW5ndGgpIHtcbiAgICBzaXplID0gc2l6ZSAvIDEwMjRcbiAgICBpKytcbiAgfVxuICBpZiAoaSA+IC0xKSB7XG4gICAgdW5pdCA9IHVuaXRzLmNoYXJBdChpKSArICdCJ1xuICB9XG4gIHJldHVybiBzaXplLnRvRml4ZWQoMikucmVwbGFjZShzdHJpcERlY2ltYWxzLCAnJykgKyAnICcgKyB1bml0XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBmb3JtYXQ6IGZvcm1hdFxuLCBmb3JtYXRBcnI6IGZvcm1hdEFyclxuLCBmb3JtYXRPYmo6IGZvcm1hdE9ialxuLCBmaWxlU2l6ZTogZmlsZVNpemVcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuXG4vLyBUeXBlIGNoZWNrc1xuXG5mdW5jdGlvbiBpc0FycmF5KG8pIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwobykgPT0gJ1tvYmplY3QgQXJyYXldJ1xufVxuXG5mdW5jdGlvbiBpc0Jvb2xlYW4obykge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvKSA9PSAnW29iamVjdCBCb29sZWFuXSdcbn1cblxuZnVuY3Rpb24gaXNEYXRlKG8pIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwobykgPT0gJ1tvYmplY3QgRGF0ZV0nXG59XG5cbmZ1bmN0aW9uIGlzRXJyb3Iobykge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvKSA9PSAnW29iamVjdCBFcnJvcl0nXG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24obykge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvKSA9PSAnW29iamVjdCBGdW5jdGlvbl0nXG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKG8pIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwobykgPT0gJ1tvYmplY3QgTnVtYmVyXSdcbn1cblxuZnVuY3Rpb24gaXNPYmplY3Qobykge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvKSA9PSAnW29iamVjdCBPYmplY3RdJ1xufVxuXG5mdW5jdGlvbiBpc1JlZ0V4cChvKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKG8pID09ICdbb2JqZWN0IFJlZ0V4cF0nXG59XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKG8pIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwobykgPT0gJ1tvYmplY3QgU3RyaW5nXSdcbn1cblxuLy8gQ29udGVudCBjaGVja3NcblxuZnVuY3Rpb24gaXNFbXB0eShvKSB7XG4gIC8qIGpzaGludCBpZ25vcmU6c3RhcnQgKi9cbiAgZm9yICh2YXIgcHJvcCBpbiBvKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgLyoganNoaW50IGlnbm9yZTplbmQgKi9cbiAgcmV0dXJuIHRydWVcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIEFycmF5OiBpc0FycmF5XG4sIEJvb2xlYW46IGlzQm9vbGVhblxuLCBEYXRlOiBpc0RhdGVcbiwgRW1wdHk6IGlzRW1wdHlcbiwgRXJyb3I6IGlzRXJyb3JcbiwgRnVuY3Rpb246IGlzRnVuY3Rpb25cbiwgTmFOOiBpc05hTlxuLCBOdW1iZXI6IGlzTnVtYmVyXG4sIE9iamVjdDogaXNPYmplY3RcbiwgUmVnRXhwOiBpc1JlZ0V4cFxuLCBTdHJpbmc6IGlzU3RyaW5nXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogV3JhcHMgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSgpIHNvIGl0IGNhbiBiZSBjYWxsZWQgd2l0aCBhbiBvYmplY3RcbiAqIGFuZCBwcm9wZXJ0eSBuYW1lLlxuICovXG52YXIgaGFzT3duID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5XG4gIHJldHVybiBmdW5jdGlvbihvYmosIHByb3ApIHsgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSB9XG59KSgpXG5cbi8qKlxuICogQ29waWVzIG93biBwcm9wZXJ0aWVzIGZyb20gYW55IGdpdmVuIG9iamVjdHMgdG8gYSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIGV4dGVuZChkZXN0KSB7XG4gIGZvciAodmFyIGkgPSAxLCBsID0gYXJndW1lbnRzLmxlbmd0aCwgc3JjOyBpIDwgbDsgaSsrKSB7XG4gICAgc3JjID0gYXJndW1lbnRzW2ldXG4gICAgaWYgKHNyYykge1xuICAgICAgZm9yICh2YXIgcHJvcCBpbiBzcmMpIHtcbiAgICAgICAgaWYgKGhhc093bihzcmMsIHByb3ApKSB7XG4gICAgICAgICAgZGVzdFtwcm9wXSA9IHNyY1twcm9wXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkZXN0XG59XG5cbi8qKlxuICogTWFrZXMgYSBjb25zdHJ1Y3RvciBpbmhlcml0IGFub3RoZXIgY29uc3RydWN0b3IncyBwcm90b3R5cGUgd2l0aG91dFxuICogaGF2aW5nIHRvIGFjdHVhbGx5IHVzZSB0aGUgY29uc3RydWN0b3IuXG4gKi9cbmZ1bmN0aW9uIGluaGVyaXRzKGNoaWxkQ29uc3RydWN0b3IsIHBhcmVudENvbnN0cnVjdG9yKSB7XG4gIHZhciBGID0gZnVuY3Rpb24oKSB7fVxuICBGLnByb3RvdHlwZSA9IHBhcmVudENvbnN0cnVjdG9yLnByb3RvdHlwZVxuICBjaGlsZENvbnN0cnVjdG9yLnByb3RvdHlwZSA9IG5ldyBGKClcbiAgY2hpbGRDb25zdHJ1Y3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjaGlsZENvbnN0cnVjdG9yXG4gIHJldHVybiBjaGlsZENvbnN0cnVjdG9yXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBBcnJheSBvZiBbcHJvcGVydHksIHZhbHVlXSBwYWlycyBmcm9tIGFuIE9iamVjdC5cbiAqL1xuZnVuY3Rpb24gaXRlbXMob2JqKSB7XG4gIHZhciBpdGVtc18gPSBbXVxuICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgIGlmIChoYXNPd24ob2JqLCBwcm9wKSkge1xuICAgICAgaXRlbXNfLnB1c2goW3Byb3AsIG9ialtwcm9wXV0pXG4gICAgfVxuICB9XG4gIHJldHVybiBpdGVtc19cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdCBmcm9tIGFuIEFycmF5IG9mIFtwcm9wZXJ0eSwgdmFsdWVdIHBhaXJzLlxuICovXG5mdW5jdGlvbiBmcm9tSXRlbXMoaXRlbXMpIHtcbiAgdmFyIG9iaiA9IHt9XG4gIGZvciAodmFyIGkgPSAwLCBsID0gaXRlbXMubGVuZ3RoLCBpdGVtOyBpIDwgbDsgaSsrKSB7XG4gICAgaXRlbSA9IGl0ZW1zW2ldXG4gICAgb2JqW2l0ZW1bMF1dID0gaXRlbVsxXVxuICB9XG4gIHJldHVybiBvYmpcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbG9va3VwIE9iamVjdCBmcm9tIGFuIEFycmF5LCBjb2VyY2luZyBlYWNoIGl0ZW0gdG8gYSBTdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGxvb2t1cChhcnIpIHtcbiAgdmFyIG9iaiA9IHt9XG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXJyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIG9ialsnJythcnJbaV1dID0gdHJ1ZVxuICB9XG4gIHJldHVybiBvYmpcbn1cblxuLyoqXG4gKiBJZiB0aGUgZ2l2ZW4gb2JqZWN0IGhhcyB0aGUgZ2l2ZW4gcHJvcGVydHksIHJldHVybnMgaXRzIHZhbHVlLCBvdGhlcndpc2VcbiAqIHJldHVybnMgdGhlIGdpdmVuIGRlZmF1bHQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIGdldChvYmosIHByb3AsIGRlZmF1bHRWYWx1ZSkge1xuICByZXR1cm4gKGhhc093bihvYmosIHByb3ApID8gb2JqW3Byb3BdIDogZGVmYXVsdFZhbHVlKVxufVxuXG4vKipcbiAqIERlbGV0ZXMgYW5kIHJldHVybnMgYW4gb3duIHByb3BlcnR5IGZyb20gYW4gb2JqZWN0LCBvcHRpb25hbGx5IHJldHVybmluZyBhXG4gKiBkZWZhdWx0IHZhbHVlIGlmIHRoZSBvYmplY3QgZGlkbid0IGhhdmUgdGhlcHJvcGVydHkuXG4gKiBAdGhyb3dzIGlmIGdpdmVuIGFuIG9iamVjdCB3aGljaCBpcyBudWxsIChvciB1bmRlZmluZWQpLCBvciBpZiB0aGUgcHJvcGVydHlcbiAqICAgZG9lc24ndCBleGlzdCBhbmQgdGhlcmUgd2FzIG5vIGRlZmF1bHRWYWx1ZSBnaXZlbi5cbiAqL1xuZnVuY3Rpb24gcG9wKG9iaiwgcHJvcCwgZGVmYXVsdFZhbHVlKSB7XG4gIGlmIChvYmogPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcigncG9wUHJvcCB3YXMgZ2l2ZW4gJyArIG9iailcbiAgfVxuICBpZiAoaGFzT3duKG9iaiwgcHJvcCkpIHtcbiAgICB2YXIgdmFsdWUgPSBvYmpbcHJvcF1cbiAgICBkZWxldGUgb2JqW3Byb3BdXG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cbiAgZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwicG9wUHJvcCB3YXMgZ2l2ZW4gYW4gb2JqZWN0IHdoaWNoIGRpZG4ndCBoYXZlIGFuIG93biAnXCIgK1xuICAgICAgICAgICAgICAgICAgICBwcm9wICsgXCInIHByb3BlcnR5LCB3aXRob3V0IGEgZGVmYXVsdCB2YWx1ZSB0byByZXR1cm5cIilcbiAgfVxuICByZXR1cm4gZGVmYXVsdFZhbHVlXG59XG5cbi8qKlxuICogSWYgdGhlIHByb3AgaXMgaW4gdGhlIG9iamVjdCwgcmV0dXJuIGl0cyB2YWx1ZS4gSWYgbm90LCBzZXQgdGhlIHByb3AgdG9cbiAqIGRlZmF1bHRWYWx1ZSBhbmQgcmV0dXJuIGRlZmF1bHRWYWx1ZS5cbiAqL1xuZnVuY3Rpb24gc2V0RGVmYXVsdChvYmosIHByb3AsIGRlZmF1bHRWYWx1ZSkge1xuICBpZiAob2JqID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldERlZmF1bHQgd2FzIGdpdmVuICcgKyBvYmopXG4gIH1cbiAgZGVmYXVsdFZhbHVlID0gZGVmYXVsdFZhbHVlIHx8IG51bGxcbiAgaWYgKGhhc093bihvYmosIHByb3ApKSB7XG4gICAgcmV0dXJuIG9ialtwcm9wXVxuICB9XG4gIGVsc2Uge1xuICAgIG9ialtwcm9wXSA9IGRlZmF1bHRWYWx1ZVxuICAgIHJldHVybiBkZWZhdWx0VmFsdWVcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaGFzT3duOiBoYXNPd25cbiwgZXh0ZW5kOiBleHRlbmRcbiwgaW5oZXJpdHM6IGluaGVyaXRzXG4sIGl0ZW1zOiBpdGVtc1xuLCBmcm9tSXRlbXM6IGZyb21JdGVtc1xuLCBsb29rdXA6IGxvb2t1cFxuLCBnZXQ6IGdldFxuLCBwb3A6IHBvcFxuLCBzZXREZWZhdWx0OiBzZXREZWZhdWx0XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpcyA9IHJlcXVpcmUoJy4vaXMnKVxuXG4vKipcbiAqIFBhZHMgYSBudW1iZXIgd2l0aCBhIGxlYWRpbmcgemVybyBpZiBuZWNlc3NhcnkuXG4gKi9cbmZ1bmN0aW9uIHBhZChudW1iZXIpIHtcbiAgcmV0dXJuIChudW1iZXIgPCAxMCA/ICcwJyArIG51bWJlciA6IG51bWJlcilcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBpbmRleCBvZiBpdGVtIGluIGxpc3QsIG9yIC0xIGlmIGl0J3Mgbm90IGluIGxpc3QuXG4gKi9cbmZ1bmN0aW9uIGluZGV4T2YoaXRlbSwgbGlzdCkge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3QubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKGl0ZW0gPT09IGxpc3RbaV0pIHtcbiAgICAgIHJldHVybiBpXG4gICAgfVxuICB9XG4gIHJldHVybiAtMVxufVxuXG4vKipcbiAqIE1hcHMgZGlyZWN0aXZlIGNvZGVzIHRvIHJlZ3VsYXIgZXhwcmVzc2lvbiBwYXR0ZXJucyB3aGljaCB3aWxsIGNhcHR1cmUgdGhlXG4gKiBkYXRhIHRoZSBkaXJlY3RpdmUgY29ycmVzcG9uZHMgdG8sIG9yIGluIHRoZSBjYXNlIG9mIGxvY2FsZS1kZXBlbmRlbnRcbiAqIGRpcmVjdGl2ZXMsIGEgZnVuY3Rpb24gd2hpY2ggdGFrZXMgYSBsb2NhbGUgYW5kIGdlbmVyYXRlcyBhIHJlZ3VsYXJcbiAqIGV4cHJlc3Npb24gcGF0dGVybi5cbiAqL1xudmFyIHBhcnNlckRpcmVjdGl2ZXMgPSB7XG4gIC8vIExvY2FsZSdzIGFiYnJldmlhdGVkIG1vbnRoIG5hbWVcbiAgJ2InOiBmdW5jdGlvbihsKSB7IHJldHVybiAnKCcgKyBsLmIuam9pbignfCcpICsgJyknIH1cbiAgLy8gTG9jYWxlJ3MgZnVsbCBtb250aCBuYW1lXG4sICdCJzogZnVuY3Rpb24obCkgeyByZXR1cm4gJygnICsgbC5CLmpvaW4oJ3wnKSArICcpJyB9XG4gIC8vIExvY2FsZSdzIGVxdWl2YWxlbnQgb2YgZWl0aGVyIEFNIG9yIFBNLlxuLCAncCc6IGZ1bmN0aW9uKGwpIHsgcmV0dXJuICcoJyArIGwuQU0gKyAnfCcgKyBsLlBNICsgJyknIH1cbiwgJ2QnOiAnKFxcXFxkXFxcXGQ/KScgLy8gRGF5IG9mIHRoZSBtb250aCBhcyBhIGRlY2ltYWwgbnVtYmVyIFswMSwzMV1cbiwgJ0gnOiAnKFxcXFxkXFxcXGQ/KScgLy8gSG91ciAoMjQtaG91ciBjbG9jaykgYXMgYSBkZWNpbWFsIG51bWJlciBbMDAsMjNdXG4sICdJJzogJyhcXFxcZFxcXFxkPyknIC8vIEhvdXIgKDEyLWhvdXIgY2xvY2spIGFzIGEgZGVjaW1hbCBudW1iZXIgWzAxLDEyXVxuLCAnbSc6ICcoXFxcXGRcXFxcZD8pJyAvLyBNb250aCBhcyBhIGRlY2ltYWwgbnVtYmVyIFswMSwxMl1cbiwgJ00nOiAnKFxcXFxkXFxcXGQ/KScgLy8gTWludXRlIGFzIGEgZGVjaW1hbCBudW1iZXIgWzAwLDU5XVxuLCAnUyc6ICcoXFxcXGRcXFxcZD8pJyAvLyBTZWNvbmQgYXMgYSBkZWNpbWFsIG51bWJlciBbMDAsNTldXG4sICd5JzogJyhcXFxcZFxcXFxkPyknIC8vIFllYXIgd2l0aG91dCBjZW50dXJ5IGFzIGEgZGVjaW1hbCBudW1iZXIgWzAwLDk5XVxuLCAnWSc6ICcoXFxcXGR7NH0pJyAgLy8gWWVhciB3aXRoIGNlbnR1cnkgYXMgYSBkZWNpbWFsIG51bWJlclxuLCAnJSc6ICclJyAgICAgICAgIC8vIEEgbGl0ZXJhbCAnJScgY2hhcmFjdGVyXG59XG5cbi8qKlxuICogTWFwcyBkaXJlY3RpdmUgY29kZXMgdG8gZnVuY3Rpb25zIHdoaWNoIHRha2UgdGhlIGRhdGUgdG8gYmUgZm9ybWF0dGVkIGFuZFxuICogbG9jYWxlIGRldGFpbHMgKGlmIHJlcXVpcmVkKSwgcmV0dXJuaW5nIGFuIGFwcHJvcHJpYXRlIGZvcm1hdHRlZCB2YWx1ZS5cbiAqL1xudmFyIGZvcm1hdHRlckRpcmVjdGl2ZXMgPSB7XG4gICdhJzogZnVuY3Rpb24oZCwgbCkgeyByZXR1cm4gbC5hW2QuZ2V0RGF5KCldIH1cbiwgJ0EnOiBmdW5jdGlvbihkLCBsKSB7IHJldHVybiBsLkFbZC5nZXREYXkoKV0gfVxuLCAnYic6IGZ1bmN0aW9uKGQsIGwpIHsgcmV0dXJuIGwuYltkLmdldE1vbnRoKCldIH1cbiwgJ0InOiBmdW5jdGlvbihkLCBsKSB7IHJldHVybiBsLkJbZC5nZXRNb250aCgpXSB9XG4sICdkJzogZnVuY3Rpb24oZCkgeyByZXR1cm4gcGFkKGQuZ2V0RGF0ZSgpLCAyKSB9XG4sICdIJzogZnVuY3Rpb24oZCkgeyByZXR1cm4gcGFkKGQuZ2V0SG91cnMoKSwgMikgfVxuLCAnTSc6IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHBhZChkLmdldE1pbnV0ZXMoKSwgMikgfVxuLCAnbSc6IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHBhZChkLmdldE1vbnRoKCkgKyAxLCAyKSB9XG4sICdTJzogZnVuY3Rpb24oZCkgeyByZXR1cm4gcGFkKGQuZ2V0U2Vjb25kcygpLCAyKSB9XG4sICd3JzogZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5nZXREYXkoKSB9XG4sICdZJzogZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5nZXRGdWxsWWVhcigpIH1cbiwgJyUnOiBmdW5jdGlvbihkKSB7IHJldHVybiAnJScgfVxufVxuXG4vKiogVGVzdCBmb3IgaGFuZ2luZyBwZXJjZW50YWdlIHN5bWJvbHMuICovXG52YXIgc3RyZnRpbWVGb3JtYXRDaGVjayA9IC9bXiVdJSQvXG5cbi8qKlxuICogQSBwYXJ0aWFsIGltcGxlbWVudGF0aW9uIG9mIHN0cnB0aW1lIHdoaWNoIHBhcnNlcyB0aW1lIGRldGFpbHMgZnJvbSBhIHN0cmluZyxcbiAqIGJhc2VkIG9uIGEgZm9ybWF0IHN0cmluZy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBmb3JtYXRcbiAqIEBwYXJhbSB7T2JqZWN0fSBsb2NhbGVcbiAqL1xuZnVuY3Rpb24gVGltZVBhcnNlcihmb3JtYXQsIGxvY2FsZSkge1xuICB0aGlzLmZvcm1hdCA9IGZvcm1hdFxuICB0aGlzLmxvY2FsZSA9IGxvY2FsZVxuICB2YXIgY2FjaGVkUGF0dGVybiA9IFRpbWVQYXJzZXIuX2NhY2hlW2xvY2FsZS5uYW1lICsgJ3wnICsgZm9ybWF0XVxuICBpZiAoY2FjaGVkUGF0dGVybiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5yZSA9IGNhY2hlZFBhdHRlcm5bMF1cbiAgICB0aGlzLm1hdGNoT3JkZXIgPSBjYWNoZWRQYXR0ZXJuWzFdXG4gIH1cbiAgZWxzZSB7XG4gICAgdGhpcy5jb21waWxlUGF0dGVybigpXG4gIH1cbn1cblxuLyoqXG4gKiBDYWNoZXMgUmVnRXhwcyBhbmQgbWF0Y2ggb3JkZXJzIGdlbmVyYXRlZCBwZXIgbG9jYWxlL2Zvcm1hdCBzdHJpbmcgY29tYm8uXG4gKi9cblRpbWVQYXJzZXIuX2NhY2hlID0ge31cblxuVGltZVBhcnNlci5wcm90b3R5cGUuY29tcGlsZVBhdHRlcm4gPSBmdW5jdGlvbigpIHtcbiAgLy8gTm9ybWFsaXNlIHdoaXRlc3BhY2UgYmVmb3JlIGZ1cnRoZXIgcHJvY2Vzc2luZ1xuICB2YXIgZm9ybWF0ID0gdGhpcy5mb3JtYXQuc3BsaXQoLyg/Olxcc3xcXHR8XFxuKSsvKS5qb2luKCcgJylcbiAgICAsIHBhdHRlcm4gPSBbXVxuICAgICwgbWF0Y2hPcmRlciA9IFtdXG4gICAgLCBjXG4gICAgLCBkaXJlY3RpdmVcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGZvcm1hdC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBjID0gZm9ybWF0LmNoYXJBdChpKVxuICAgIGlmIChjICE9ICclJykge1xuICAgICAgaWYgKGMgPT09ICcgJykge1xuICAgICAgICBwYXR0ZXJuLnB1c2goJyArJylcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBwYXR0ZXJuLnB1c2goYylcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgaWYgKGkgPT0gbCAtIDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignc3RycHRpbWUgZm9ybWF0IGVuZHMgd2l0aCByYXcgJScpXG4gICAgfVxuXG4gICAgYyA9IGZvcm1hdC5jaGFyQXQoKytpKVxuICAgIGRpcmVjdGl2ZSA9IHBhcnNlckRpcmVjdGl2ZXNbY11cbiAgICBpZiAoZGlyZWN0aXZlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignc3RycHRpbWUgZm9ybWF0IGNvbnRhaW5zIGFuIHVua25vd24gZGlyZWN0aXZlOiAlJyArIGMpXG4gICAgfVxuICAgIGVsc2UgaWYgKGlzLkZ1bmN0aW9uKGRpcmVjdGl2ZSkpIHtcbiAgICAgIHBhdHRlcm4ucHVzaChkaXJlY3RpdmUodGhpcy5sb2NhbGUpKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHBhdHRlcm4ucHVzaChkaXJlY3RpdmUpXG4gICAgfVxuXG4gICAgaWYgKGMgIT0gJyUnKSB7XG4gICAgICAgbWF0Y2hPcmRlci5wdXNoKGMpXG4gICAgfVxuICB9XG5cbiAgdGhpcy5yZSA9IG5ldyBSZWdFeHAoJ14nICsgcGF0dGVybi5qb2luKCcnKSArICckJylcbiAgdGhpcy5tYXRjaE9yZGVyID0gbWF0Y2hPcmRlclxuICBUaW1lUGFyc2VyLl9jYWNoZVt0aGlzLmxvY2FsZS5uYW1lICsgJ3wnICsgdGhpcy5mb3JtYXRdID0gW3RoaXMucmUsIG1hdGNoT3JkZXJdXG59XG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gZXh0cmFjdCBkYXRlIGFuZCB0aW1lIGRldGFpbHMgZnJvbSB0aGUgZ2l2ZW4gaW5wdXQuXG4gKiBAcGFyYW0ge3N0cmluZ30gaW5wdXRcbiAqIEByZXR1cm4ge0FycmF5LjxudW1iZXI+fVxuICovXG5UaW1lUGFyc2VyLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gIHZhciBtYXRjaGVzID0gdGhpcy5yZS5leGVjKGlucHV0KVxuICBpZiAobWF0Y2hlcyA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignVGltZSBkYXRhIGRpZCBub3QgbWF0Y2ggZm9ybWF0OiBkYXRhPScgKyBpbnB1dCArXG4gICAgICAgICAgICAgICAgICAgICcsIGZvcm1hdD0nICsgdGhpcy5mb3JtYXQpXG4gIH1cblxuICAgIC8vIERlZmF1bHQgdmFsdWVzIGZvciB3aGVuIG1vcmUgYWNjdXJhdGUgdmFsdWVzIGNhbm5vdCBiZSBpbmZlcnJlZFxuICB2YXIgdGltZSA9IFsxOTAwLCAxLCAxLCAwLCAwLCAwXVxuICAgIC8vIE1hdGNoZWQgdGltZSBkYXRhLCBrZXllZCBieSBkaXJlY3RpdmUgY29kZVxuICAgICwgZGF0YSA9IHt9XG5cbiAgZm9yICh2YXIgaSA9IDEsIGwgPSBtYXRjaGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGRhdGFbdGhpcy5tYXRjaE9yZGVyW2kgLSAxXV0gPSBtYXRjaGVzW2ldXG4gIH1cblxuICAvLyBFeHRyYWN0IHllYXJcbiAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ1knKSkge1xuICAgIHRpbWVbMF0gPSBwYXJzZUludChkYXRhLlksIDEwKVxuICB9XG4gIGVsc2UgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3knKSkge1xuICAgIHZhciB5ZWFyID0gcGFyc2VJbnQoZGF0YS55LCAxMClcbiAgICBpZiAoeWVhciA8IDY4KSB7XG4gICAgICAgIHllYXIgPSAyMDAwICsgeWVhclxuICAgIH1cbiAgICBlbHNlIGlmICh5ZWFyIDwgMTAwKSB7XG4gICAgICAgIHllYXIgPSAxOTAwICsgeWVhclxuICAgIH1cbiAgICB0aW1lWzBdID0geWVhclxuICB9XG5cbiAgLy8gRXh0cmFjdCBtb250aFxuICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbScpKSB7XG4gICAgdmFyIG1vbnRoID0gcGFyc2VJbnQoZGF0YS5tLCAxMClcbiAgICBpZiAobW9udGggPCAxIHx8IG1vbnRoID4gMTIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTW9udGggaXMgb3V0IG9mIHJhbmdlOiAnICsgbW9udGgpXG4gICAgfVxuICAgIHRpbWVbMV0gPSBtb250aFxuICB9XG4gIGVsc2UgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ0InKSkge1xuICAgIHRpbWVbMV0gPSBpbmRleE9mKGRhdGEuQiwgdGhpcy5sb2NhbGUuQikgKyAxXG4gIH1cbiAgZWxzZSBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYicpKSB7XG4gICAgdGltZVsxXSA9IGluZGV4T2YoZGF0YS5iLCB0aGlzLmxvY2FsZS5iKSArIDFcbiAgfVxuXG4gIC8vIEV4dHJhY3QgZGF5IG9mIG1vbnRoXG4gIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdkJykpIHtcbiAgICB2YXIgZGF5ID0gcGFyc2VJbnQoZGF0YS5kLCAxMClcbiAgICBpZiAoZGF5IDwgMSB8fCBkYXkgPiAzMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEYXkgaXMgb3V0IG9mIHJhbmdlOiAnICsgZGF5KVxuICAgIH1cbiAgICB0aW1lWzJdID0gZGF5XG4gIH1cblxuICAvLyBFeHRyYWN0IGhvdXJcbiAgdmFyIGhvdXJcbiAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ0gnKSkge1xuICAgIGhvdXIgPSBwYXJzZUludChkYXRhLkgsIDEwKVxuICAgIGlmIChob3VyID4gMjMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSG91ciBpcyBvdXQgb2YgcmFuZ2U6ICcgKyBob3VyKVxuICAgIH1cbiAgICB0aW1lWzNdID0gaG91clxuICB9XG4gIGVsc2UgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ0knKSkge1xuICAgIGhvdXIgPSBwYXJzZUludChkYXRhLkksIDEwKVxuICAgIGlmIChob3VyIDwgMSB8fCBob3VyID4gMTIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSG91ciBpcyBvdXQgb2YgcmFuZ2U6ICcgKyBob3VyKVxuICAgIH1cblxuICAgIC8vIElmIHdlIGRvbid0IGdldCBhbnkgbW9yZSBpbmZvcm1hdGlvbiwgd2UnbGwgYXNzdW1lIHRoaXMgdGltZSBpc1xuICAgIC8vIGEubS4gLSAxMiBhLm0uIGlzIG1pZG5pZ2h0LlxuICAgIGlmIChob3VyID09IDEyKSB7XG4gICAgICAgIGhvdXIgPSAwXG4gICAgfVxuXG4gICAgdGltZVszXSA9IGhvdXJcblxuICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdwJykpIHtcbiAgICAgIGlmIChkYXRhLnAgPT0gdGhpcy5sb2NhbGUuUE0pIHtcbiAgICAgICAgLy8gV2UndmUgYWxyZWFkeSBoYW5kbGVkIHRoZSBtaWRuaWdodCBzcGVjaWFsIGNhc2UsIHNvIGl0J3NcbiAgICAgICAgLy8gc2FmZSB0byBidW1wIHRoZSB0aW1lIGJ5IDEyIGhvdXJzIHdpdGhvdXQgZnVydGhlciBjaGVja3MuXG4gICAgICAgIHRpbWVbM10gPSB0aW1lWzNdICsgMTJcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBFeHRyYWN0IG1pbnV0ZVxuICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnTScpKSB7XG4gICAgdmFyIG1pbnV0ZSA9IHBhcnNlSW50KGRhdGEuTSwgMTApXG4gICAgaWYgKG1pbnV0ZSA+IDU5KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTWludXRlIGlzIG91dCBvZiByYW5nZTogJyArIG1pbnV0ZSlcbiAgICB9XG4gICAgdGltZVs0XSA9IG1pbnV0ZVxuICB9XG5cbiAgLy8gRXh0cmFjdCBzZWNvbmRzXG4gIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdTJykpIHtcbiAgICB2YXIgc2Vjb25kID0gcGFyc2VJbnQoZGF0YS5TLCAxMClcbiAgICBpZiAoc2Vjb25kID4gNTkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU2Vjb25kIGlzIG91dCBvZiByYW5nZTogJyArIHNlY29uZClcbiAgICB9XG4gICAgdGltZVs1XSA9IHNlY29uZFxuICB9XG5cbiAgLy8gVmFsaWRhdGUgZGF5IG9mIG1vbnRoXG4gIGRheSA9IHRpbWVbMl0sIG1vbnRoID0gdGltZVsxXSwgeWVhciA9IHRpbWVbMF1cbiAgaWYgKCgobW9udGggPT0gNCB8fCBtb250aCA9PSA2IHx8IG1vbnRoID09IDkgfHwgbW9udGggPT0gMTEpICYmXG4gICAgICBkYXkgPiAzMCkgfHxcbiAgICAgIChtb250aCA9PSAyICYmIGRheSA+ICgoeWVhciAlIDQgPT09IDAgJiYgeWVhciAlIDEwMCAhPT0gMCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5ZWFyICUgNDAwID09PSAwKSA/IDI5IDogMjgpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignRGF5IGlzIG91dCBvZiByYW5nZTogJyArIGRheSlcbiAgfVxuXG4gIHJldHVybiB0aW1lXG59XG5cbnZhciB0aW1lICA9IHtcbiAgLyoqIERlZmF1bHQgbG9jYWxlIG5hbWUuICovXG4gIGRlZmF1bHRMb2NhbGU6ICdlbidcblxuICAvKiogTG9jYWxlIGRldGFpbHMuICovXG4sIGxvY2FsZXM6IHtcbiAgICBlbjoge1xuICAgICAgbmFtZTogJ2VuJ1xuICAgICwgYTogWydTdW4nLCAnTW9uJywgJ1R1ZScsICdXZWQnLCAnVGh1JywgJ0ZyaScsICdTYXQnXVxuICAgICwgQTogWydTdW5kYXknLCAnTW9uZGF5JywgJ1R1ZXNkYXknLCAnV2VkbmVzZGF5JywgJ1RodXJzZGF5JyxcbiAgICAgICAgICAnRnJpZGF5JywgJ1NhdHVyZGF5J11cbiAgICAsIEFNOiAnQU0nXG4gICAgLCBiOiBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXVxuICAgICwgQjogWydKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJywgJ0p1bHknLFxuICAgICAgICAgICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXVxuICAgICwgUE06ICdQTSdcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIGxvY2FsZSB3aXRoIHRoZSBnaXZlbiBjb2RlLlxuICogQHBhcmFtIHtzdHJpbmd9IGNvZGVcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xudmFyIGdldExvY2FsZSA9IHRpbWUuZ2V0TG9jYWxlID0gZnVuY3Rpb24oY29kZSkge1xuICBpZiAoY29kZSkge1xuICAgIGlmICh0aW1lLmxvY2FsZXMuaGFzT3duUHJvcGVydHkoY29kZSkpIHtcbiAgICAgIHJldHVybiB0aW1lLmxvY2FsZXNbY29kZV1cbiAgICB9XG4gICAgZWxzZSBpZiAoY29kZS5sZW5ndGggPiAyKSB7XG4gICAgICAvLyBJZiB3ZSBhcHBlYXIgdG8gaGF2ZSBtb3JlIHRoYW4gYSBsYW5ndWFnZSBjb2RlLCB0cnkgdGhlXG4gICAgICAvLyBsYW5ndWFnZSBjb2RlIG9uIGl0cyBvd24uXG4gICAgICB2YXIgbGFuZ3VhZ2VDb2RlID0gY29kZS5zdWJzdHJpbmcoMCwgMilcbiAgICAgIGlmICh0aW1lLmxvY2FsZXMuaGFzT3duUHJvcGVydHkobGFuZ3VhZ2VDb2RlKSkge1xuICAgICAgICByZXR1cm4gdGltZS5sb2NhbGVzW2xhbmd1YWdlQ29kZV1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRpbWUubG9jYWxlc1t0aW1lLmRlZmF1bHRMb2NhbGVdXG59XG5cbi8qKlxuICogUGFyc2VzIHRpbWUgZGV0YWlscyBmcm9tIGEgc3RyaW5nLCBiYXNlZCBvbiBhIGZvcm1hdCBzdHJpbmcuXG4gKiBAcGFyYW0ge3N0cmluZ30gaW5wdXRcbiAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtYXRcbiAqIEBwYXJhbSB7c3RyaW5nPX0gbG9jYWxlXG4gKiBAcmV0dXJuIHtBcnJheS48bnVtYmVyPn1cbiAqL1xudmFyIHN0cnB0aW1lID0gdGltZS5zdHJwdGltZSA9IGZ1bmN0aW9uKGlucHV0LCBmb3JtYXQsIGxvY2FsZSkge1xuICByZXR1cm4gbmV3IFRpbWVQYXJzZXIoZm9ybWF0LCBnZXRMb2NhbGUobG9jYWxlKSkucGFyc2UoaW5wdXQpXG59XG5cbi8qKlxuICogQ29udmVuaWVuY2Ugd3JhcHBlciBhcm91bmQgdGltZS5zdHJwdGltZSB3aGljaCByZXR1cm5zIGEgSmF2YVNjcmlwdCBEYXRlLlxuICogQHBhcmFtIHtzdHJpbmd9IGlucHV0XG4gKiBAcGFyYW0ge3N0cmluZ30gZm9ybWF0XG4gKiBAcGFyYW0ge3N0cmluZz19IGxvY2FsZVxuICogQHJldHVybiB7ZGF0ZX1cbiAqL1xudGltZS5zdHJwZGF0ZSA9IGZ1bmN0aW9uKGlucHV0LCBmb3JtYXQsIGxvY2FsZSkge1xuICB2YXIgdCA9IHN0cnB0aW1lKGlucHV0LCBmb3JtYXQsIGxvY2FsZSlcbiAgcmV0dXJuIG5ldyBEYXRlKHRbMF0sIHRbMV0gLSAxLCB0WzJdLCB0WzNdLCB0WzRdLCB0WzVdKVxufVxuXG4vKipcbiAqIEEgcGFydGlhbCBpbXBsZW1lbnRhdGlvbiBvZiA8Y29kZT5zdHJmdGltZTwvY29kZT4sIHdoaWNoIGZvcm1hdHMgYSBkYXRlXG4gKiBhY2NvcmRpbmcgdG8gYSBmb3JtYXQgc3RyaW5nLiBBbiBFcnJvciB3aWxsIGJlIHRocm93biBpZiBhbiBpbnZhbGlkXG4gKiBmb3JtYXQgc3RyaW5nIGlzIGdpdmVuLlxuICogQHBhcmFtIHtkYXRlfSBkYXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gZm9ybWF0XG4gKiBAcGFyYW0ge3N0cmluZz19IGxvY2FsZVxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG50aW1lLnN0cmZ0aW1lID0gZnVuY3Rpb24oZGF0ZSwgZm9ybWF0LCBsb2NhbGUpIHtcbiAgaWYgKHN0cmZ0aW1lRm9ybWF0Q2hlY2sudGVzdChmb3JtYXQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzdHJmdGltZSBmb3JtYXQgZW5kcyB3aXRoIHJhdyAlJylcbiAgfVxuICBsb2NhbGUgPSBnZXRMb2NhbGUobG9jYWxlKVxuICByZXR1cm4gZm9ybWF0LnJlcGxhY2UoLyglLikvZywgZnVuY3Rpb24ocywgZikge1xuICAgIHZhciBjb2RlID0gZi5jaGFyQXQoMSlcbiAgICBpZiAodHlwZW9mIGZvcm1hdHRlckRpcmVjdGl2ZXNbY29kZV0gPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignc3RyZnRpbWUgZm9ybWF0IGNvbnRhaW5zIGFuIHVua25vd24gZGlyZWN0aXZlOiAnICsgZilcbiAgICB9XG4gICAgcmV0dXJuIGZvcm1hdHRlckRpcmVjdGl2ZXNbY29kZV0oZGF0ZSwgbG9jYWxlKVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRpbWVcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gcGFyc2VVcmkgMS4yLjJcbi8vIChjKSBTdGV2ZW4gTGV2aXRoYW4gPHN0ZXZlbmxldml0aGFuLmNvbT5cbi8vIE1JVCBMaWNlbnNlXG5mdW5jdGlvbiBwYXJzZVVyaSAoc3RyKSB7XG4gIHZhciBvID0gcGFyc2VVcmkub3B0aW9uc1xuICAgICwgbSA9IG8ucGFyc2VyW28uc3RyaWN0TW9kZSA/IFwic3RyaWN0XCIgOiBcImxvb3NlXCJdLmV4ZWMoc3RyKVxuICAgICwgdXJpID0ge31cbiAgICAsIGkgPSAxNFxuXG4gIHdoaWxlIChpLS0pIHsgdXJpW28ua2V5W2ldXSA9IG1baV0gfHwgXCJcIiB9XG5cbiAgdXJpW28ucS5uYW1lXSA9IHt9O1xuICB1cmlbby5rZXlbMTJdXS5yZXBsYWNlKG8ucS5wYXJzZXIsIGZ1bmN0aW9uICgkMCwgJDEsICQyKSB7XG4gICAgaWYgKCQxKSB7IHVyaVtvLnEubmFtZV1bJDFdID0gJDIgfVxuICB9KVxuXG4gIHJldHVybiB1cmlcbn1cblxucGFyc2VVcmkub3B0aW9ucyA9IHtcbiAgc3RyaWN0TW9kZTogZmFsc2Vcbiwga2V5OiBbJ3NvdXJjZScsJ3Byb3RvY29sJywnYXV0aG9yaXR5JywndXNlckluZm8nLCd1c2VyJywncGFzc3dvcmQnLCdob3N0JywncG9ydCcsJ3JlbGF0aXZlJywncGF0aCcsJ2RpcmVjdG9yeScsJ2ZpbGUnLCdxdWVyeScsJ2FuY2hvciddXG4sIHE6IHtcbiAgICBuYW1lOiAncXVlcnlLZXknXG4gICwgcGFyc2VyOiAvKD86XnwmKShbXiY9XSopPT8oW14mXSopL2dcbiAgfVxuLCBwYXJzZXI6IHtcbiAgICBzdHJpY3Q6IC9eKD86KFteOlxcLz8jXSspOik/KD86XFwvXFwvKCg/OigoW146QF0qKSg/OjooW146QF0qKSk/KT9AKT8oW146XFwvPyNdKikoPzo6KFxcZCopKT8pKT8oKCgoPzpbXj8jXFwvXSpcXC8pKikoW14/I10qKSkoPzpcXD8oW14jXSopKT8oPzojKC4qKSk/KS9cbiAgLCBsb29zZTogL14oPzooPyFbXjpAXSs6W146QFxcL10qQCkoW146XFwvPyMuXSspOik/KD86XFwvXFwvKT8oKD86KChbXjpAXSopKD86OihbXjpAXSopKT8pP0ApPyhbXjpcXC8/I10qKSg/OjooXFxkKikpPykoKChcXC8oPzpbXj8jXSg/IVtePyNcXC9dKlxcLltePyNcXC8uXSsoPzpbPyNdfCQpKSkqXFwvPyk/KFtePyNcXC9dKikpKD86XFw/KFteI10qKSk/KD86IyguKikpPykvXG4gIH1cbn1cblxuLy8gbWFrZVVSSSAxLjIuMiAtIGNyZWF0ZSBhIFVSSSBmcm9tIGFuIG9iamVjdCBzcGVjaWZpY2F0aW9uOyBjb21wYXRpYmxlIHdpdGhcbi8vIHBhcnNlVVJJIChodHRwOi8vYmxvZy5zdGV2ZW5sZXZpdGhhbi5jb20vYXJjaGl2ZXMvcGFyc2V1cmkpXG4vLyAoYykgTmlhbGwgU21hcnQgPG5pYWxsc21hcnQuY29tPlxuLy8gTUlUIExpY2Vuc2VcbmZ1bmN0aW9uIG1ha2VVcmkodSkge1xuICB2YXIgdXJpID0gJydcbiAgaWYgKHUucHJvdG9jb2wpIHtcbiAgICB1cmkgKz0gdS5wcm90b2NvbCArICc6Ly8nXG4gIH1cbiAgaWYgKHUudXNlcikge1xuICAgIHVyaSArPSB1LnVzZXJcbiAgfVxuICBpZiAodS5wYXNzd29yZCkge1xuICAgIHVyaSArPSAnOicgKyB1LnBhc3N3b3JkXG4gIH1cbiAgaWYgKHUudXNlciB8fCB1LnBhc3N3b3JkKSB7XG4gICAgdXJpICs9ICdAJ1xuICB9XG4gIGlmICh1Lmhvc3QpIHtcbiAgICB1cmkgKz0gdS5ob3N0XG4gIH1cbiAgaWYgKHUucG9ydCkge1xuICAgIHVyaSArPSAnOicgKyB1LnBvcnRcbiAgfVxuICBpZiAodS5wYXRoKSB7XG4gICAgdXJpICs9IHUucGF0aFxuICB9XG4gIHZhciBxayA9IHUucXVlcnlLZXlcbiAgdmFyIHFzID0gW11cbiAgZm9yICh2YXIgayBpbiBxaykge1xuICAgIGlmICghcWsuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIHZhciB2ID0gZW5jb2RlVVJJQ29tcG9uZW50KHFrW2tdKVxuICAgIGsgPSBlbmNvZGVVUklDb21wb25lbnQoaylcbiAgICBpZiAodikge1xuICAgICAgcXMucHVzaChrICsgJz0nICsgdilcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBxcy5wdXNoKGspXG4gICAgfVxuICB9XG4gIGlmIChxcy5sZW5ndGggPiAwKSB7XG4gICAgdXJpICs9ICc/JyArIHFzLmpvaW4oJyYnKVxuICB9XG4gIGlmICh1LmFuY2hvcikge1xuICAgIHVyaSArPSAnIycgKyB1LmFuY2hvclxuICB9XG4gIHJldHVybiB1cmlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHBhcnNlVXJpOiBwYXJzZVVyaVxuLCBtYWtlVXJpOiBtYWtlVXJpXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb25jdXIgPSByZXF1aXJlKCdDb25jdXInKVxuICAsIGZvcm1hdCA9IHJlcXVpcmUoJ2lzb21vcnBoL2Zvcm1hdCcpLmZvcm1hdE9ialxuICAsIGlzID0gcmVxdWlyZSgnaXNvbW9ycGgvaXMnKVxuICAsIG9iamVjdCA9IHJlcXVpcmUoJ2lzb21vcnBoL29iamVjdCcpXG5cbnZhciBOT05fRklFTERfRVJST1JTID0gJ19fYWxsX18nXG5cbi8qKlxuICogQSB2YWxpZGF0aW9uIGVycm9yLCBjb250YWluaW5nIGEgbGlzdCBvZiBtZXNzYWdlcy4gU2luZ2xlIG1lc3NhZ2VzIChlLmcuXG4gKiB0aG9zZSBwcm9kdWNlZCBieSB2YWxpZGF0b3JzKSBtYXkgaGF2ZSBhbiBhc3NvY2lhdGVkIGVycm9yIGNvZGUgYW5kXG4gKiBwYXJhbWV0ZXJzIHRvIGFsbG93IGN1c3RvbWlzYXRpb24gYnkgZmllbGRzLlxuICpcbiAqIFRoZSBtZXNzYWdlIGFyZ3VtZW50IGNhbiBiZSBhIHNpbmdsZSBlcnJvciwgYSBsaXN0IG9mIGVycm9ycywgb3IgYW4gb2JqZWN0XG4gKiB0aGF0IG1hcHMgZmllbGQgbmFtZXMgdG8gbGlzdHMgb2YgZXJyb3JzLiBXaGF0IHdlIGRlZmluZSBhcyBhbiBcImVycm9yXCIgY2FuXG4gKiBiZSBlaXRoZXIgYSBzaW1wbGUgc3RyaW5nIG9yIGFuIGluc3RhbmNlIG9mIFZhbGlkYXRpb25FcnJvciB3aXRoIGl0cyBtZXNzYWdlXG4gKiBhdHRyaWJ1dGUgc2V0LCBhbmQgd2hhdCB3ZSBkZWZpbmUgYXMgbGlzdCBvciBvYmplY3QgY2FuIGJlIGFuIGFjdHVhbCBsaXN0IG9yXG4gKiBvYmplY3Qgb3IgYW4gaW5zdGFuY2Ugb2YgVmFsaWRhdGlvbkVycm9yIHdpdGggaXRzIGVycm9yTGlzdCBvciBlcnJvck9ialxuICogcHJvcGVydHkgc2V0LlxuICovXG52YXIgVmFsaWRhdGlvbkVycm9yID0gQ29uY3VyLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3IobWVzc2FnZSwga3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHsgcmV0dXJuIG5ldyBWYWxpZGF0aW9uRXJyb3IobWVzc2FnZSwga3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7Y29kZTogbnVsbCwgcGFyYW1zOiBudWxsfSwga3dhcmdzKVxuXG4gICAgdmFyIGNvZGUgPSBrd2FyZ3MuY29kZVxuICAgIHZhciBwYXJhbXMgPSBrd2FyZ3MucGFyYW1zXG5cbiAgICBpZiAobWVzc2FnZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikge1xuICAgICAgaWYgKG9iamVjdC5oYXNPd24obWVzc2FnZSwgJ2Vycm9yT2JqJykpIHtcbiAgICAgICAgbWVzc2FnZSA9IG1lc3NhZ2UuZXJyb3JPYmpcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKG9iamVjdC5oYXNPd24obWVzc2FnZSwgJ21lc3NhZ2UnKSkge1xuICAgICAgICBtZXNzYWdlID0gbWVzc2FnZS5lcnJvckxpc3RcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjb2RlID0gbWVzc2FnZS5jb2RlXG4gICAgICAgIHBhcmFtcyA9IG1lc3NhZ2UucGFyYW1zXG4gICAgICAgIG1lc3NhZ2UgPSBtZXNzYWdlLm1lc3NhZ2VcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaXMuT2JqZWN0KG1lc3NhZ2UpKSB7XG4gICAgICB0aGlzLmVycm9yT2JqID0ge31cbiAgICAgIE9iamVjdC5rZXlzKG1lc3NhZ2UpLmZvckVhY2goZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgdmFyIG1lc3NhZ2VzID0gbWVzc2FnZVtmaWVsZF1cbiAgICAgICAgaWYgKCEobWVzc2FnZXMgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7XG4gICAgICAgICAgbWVzc2FnZXMgPSBWYWxpZGF0aW9uRXJyb3IobWVzc2FnZXMpXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lcnJvck9ialtmaWVsZF0gPSBtZXNzYWdlcy5lcnJvckxpc3RcbiAgICAgIH0uYmluZCh0aGlzKSlcbiAgICB9XG4gICAgZWxzZSBpZiAoaXMuQXJyYXkobWVzc2FnZSkpIHtcbiAgICAgIHRoaXMuZXJyb3JMaXN0ID0gW11cbiAgICAgIG1lc3NhZ2UuZm9yRWFjaChmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgIC8vIE5vcm1hbGl6ZSBzdHJpbmdzIHRvIGluc3RhbmNlcyBvZiBWYWxpZGF0aW9uRXJyb3JcbiAgICAgICAgaWYgKCEobWVzc2FnZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHtcbiAgICAgICAgICBtZXNzYWdlID0gVmFsaWRhdGlvbkVycm9yKG1lc3NhZ2UpXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lcnJvckxpc3QucHVzaC5hcHBseSh0aGlzLmVycm9yTGlzdCwgbWVzc2FnZS5lcnJvckxpc3QpXG4gICAgICB9LmJpbmQodGhpcykpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZVxuICAgICAgdGhpcy5jb2RlID0gY29kZVxuICAgICAgdGhpcy5wYXJhbXMgPSBwYXJhbXNcbiAgICAgIHRoaXMuZXJyb3JMaXN0ID0gW3RoaXNdXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFJldHVybnMgdmFsaWRhdGlvbiBtZXNzYWdlcyBhcyBhbiBvYmplY3Qgd2l0aCBmaWVsZCBuYW1lcyBhcyBwcm9wZXJ0aWVzLlxuICogVGhyb3dzIGFuIGVycm9yIGlmIHRoaXMgdmFsaWRhdGlvbiBlcnJvciB3YXMgbm90IGNyZWF0ZWQgd2l0aCBhIGZpZWxkIGVycm9yXG4gKiBvYmplY3QuXG4gKi9cblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUubWVzc2FnZU9iaiA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIW9iamVjdC5oYXNPd24odGhpcywgJ2Vycm9yT2JqJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZhbGlkYXRpb25FcnJvciBoYXMgbm8gZXJyb3JPYmonKVxuICB9XG4gIHJldHVybiB0aGlzLl9faXRlcl9fKClcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHZhbGlkYXRpb24gbWVzc2FnZXMgYXMgYSBsaXN0LlxuICovXG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLm1lc3NhZ2VzID0gZnVuY3Rpb24oKSB7XG4gIGlmIChvYmplY3QuaGFzT3duKHRoaXMsICdlcnJvck9iaicpKSB7XG4gICAgdmFyIG1lc3NhZ2VzID0gW11cbiAgICBPYmplY3Qua2V5cyh0aGlzLmVycm9yT2JqKS5mb3JFYWNoKGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICB2YXIgZXJyb3JzID0gdGhpcy5lcnJvck9ialtmaWVsZF1cbiAgICAgIG1lc3NhZ2VzLnB1c2guYXBwbHkobWVzc2FnZXMsIFZhbGlkYXRpb25FcnJvcihlcnJvcnMpLl9faXRlcl9fKCkpXG4gICAgfS5iaW5kKHRoaXMpKVxuICAgIHJldHVybiBtZXNzYWdlc1xuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiB0aGlzLl9faXRlcl9fKClcbiAgfVxufVxuXG4vKipcbiAqIEdlbmVyYXRlcyBhbiBvYmplY3Qgb2YgZmllbGQgZXJyb3IgbWVzc2FncyBvciBhIGxpc3Qgb2YgZXJyb3IgbWVzc2FnZXNcbiAqIGRlcGVuZGluZyBvbiBob3cgdGhpcyBWYWxpZGF0aW9uRXJyb3IgaGFzIGJlZW4gY29uc3RydWN0ZWQuXG4gKi9cblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUuX19pdGVyX18gPSBmdW5jdGlvbigpIHtcbiAgaWYgKG9iamVjdC5oYXNPd24odGhpcywgJ2Vycm9yT2JqJykpIHtcbiAgICB2YXIgbWVzc2FnZU9iaiA9IHt9XG4gICAgT2JqZWN0LmtleXModGhpcy5lcnJvck9iaikuZm9yRWFjaChmdW5jdGlvbihmaWVsZCkge1xuICAgICAgdmFyIGVycm9ycyA9IHRoaXMuZXJyb3JPYmpbZmllbGRdXG4gICAgICBtZXNzYWdlT2JqW2ZpZWxkXSA9IFZhbGlkYXRpb25FcnJvcihlcnJvcnMpLl9faXRlcl9fKClcbiAgICB9LmJpbmQodGhpcykpXG4gICAgcmV0dXJuIG1lc3NhZ2VPYmpcbiAgfVxuICBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5lcnJvckxpc3QubWFwKGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICB2YXIgbWVzc2FnZSA9IGVycm9yLm1lc3NhZ2VcbiAgICAgIGlmIChlcnJvci5wYXJhbXMpIHtcbiAgICAgICAgbWVzc2FnZSA9IGZvcm1hdChtZXNzYWdlLCBlcnJvci5wYXJhbXMpXG4gICAgICB9XG4gICAgICByZXR1cm4gbWVzc2FnZVxuICAgIH0pXG4gIH1cbn1cblxuLyoqXG4gKiBQYXNzZXMgdGhpcyBlcnJvcidzIG1lc3NhZ2VzIG9uIHRvIHRoZSBnaXZlbiBlcnJvciBvYmplY3QsIGFkZGluZyB0byBhXG4gKiBwYXJ0aWN1bGFyIGZpZWxkJ3MgZXJyb3IgbWVzc2FnZXMgaWYgYWxyZWFkeSBwcmVzZW50LlxuICovXG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLnVwZGF0ZUVycm9yT2JqID0gZnVuY3Rpb24oZXJyb3JPYmopIHtcbiAgaWYgKG9iamVjdC5oYXNPd24odGhpcywgJ2Vycm9yT2JqJykpIHtcbiAgICBpZiAoZXJyb3JPYmopIHtcbiAgICAgIE9iamVjdC5rZXlzKHRoaXMuZXJyb3JPYmopLmZvckVhY2goZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgaWYgKCFvYmplY3QuaGFzT3duKGVycm9yT2JqLCBmaWVsZCkpIHtcbiAgICAgICAgICBlcnJvck9ialtmaWVsZF0gPSBbXVxuICAgICAgICB9XG4gICAgICAgIHZhciBlcnJvcnMgPSBlcnJvck9ialtmaWVsZF1cbiAgICAgICAgZXJyb3JzLnB1c2guYXBwbHkoZXJyb3JzLCB0aGlzLmVycm9yT2JqW2ZpZWxkXSlcbiAgICAgIH0uYmluZCh0aGlzKSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBlcnJvck9iaiA9IHRoaXMuZXJyb3JPYmpcbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgaWYgKCFvYmplY3QuaGFzT3duKGVycm9yT2JqLCBOT05fRklFTERfRVJST1JTKSkge1xuICAgICAgZXJyb3JPYmpbTk9OX0ZJRUxEX0VSUk9SU10gPSBbXVxuICAgIH1cbiAgICB2YXIgbm9uRmllbGRFcnJvcnMgPSBlcnJvck9ialtOT05fRklFTERfRVJST1JTXVxuICAgIG5vbkZpZWxkRXJyb3JzLnB1c2guYXBwbHkobm9uRmllbGRFcnJvcnMsIHRoaXMuZXJyb3JMaXN0KVxuICB9XG4gIHJldHVybiBlcnJvck9ialxufVxuXG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAoJ1ZhbGlkYXRpb25FcnJvcignICsgSlNPTi5zdHJpbmdpZnkodGhpcy5fX2l0ZXJfXygpKSArICcpJylcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFZhbGlkYXRpb25FcnJvcjogVmFsaWRhdGlvbkVycm9yXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBvYmplY3QgPSByZXF1aXJlKCdpc29tb3JwaC9vYmplY3QnKVxuXG52YXIgZXJyb3JzID0gcmVxdWlyZSgnLi9lcnJvcnMnKVxuXG52YXIgVmFsaWRhdGlvbkVycm9yID0gZXJyb3JzLlZhbGlkYXRpb25FcnJvclxuXG52YXIgaGV4UkUgPSAvXlswLTlhLWZdKyQvXG5cbi8qKlxuICogQ2xlYW5zIGEgSVB2NiBhZGRyZXNzIHN0cmluZy5cbiAqXG4gKiAgVmFsaWRpdHkgaXMgY2hlY2tlZCBieSBjYWxsaW5nIGlzVmFsaWRJUHY2QWRkcmVzcygpIC0gaWYgYW4gaW52YWxpZCBhZGRyZXNzXG4gKiAgaXMgcGFzc2VkLCBhIFZhbGlkYXRpb25FcnJvciBpcyB0aHJvd24uXG4gKlxuICogUmVwbGFjZXMgdGhlIGxvbmdlc3QgY29udGluaW91cyB6ZXJvLXNlcXVlbmNlIHdpdGggJzo6JyBhbmQgcmVtb3ZlcyBsZWFkaW5nXG4gKiB6ZXJvZXMgYW5kIG1ha2VzIHN1cmUgYWxsIGhleHRldHMgYXJlIGxvd2VyY2FzZS5cbiAqL1xuZnVuY3Rpb24gY2xlYW5JUHY2QWRkcmVzcyhpcFN0ciwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgIHVucGFja0lQdjQ6IGZhbHNlLCBlcnJvck1lc3NhZ2U6ICdUaGlzIGlzIG5vdCBhIHZhbGlkIElQdjYgYWRkcmVzcydcbiAgfSwga3dhcmdzKVxuXG4gIHZhciBiZXN0RG91YmxlY29sb25TdGFydCA9IC0xXG4gICAgLCBiZXN0RG91YmxlY29sb25MZW4gPSAwXG4gICAgLCBkb3VibGVjb2xvblN0YXJ0ID0gLTFcbiAgICAsIGRvdWJsZWNvbG9uTGVuID0gMFxuXG4gIGlmICghaXNWYWxpZElQdjZBZGRyZXNzKGlwU3RyKSkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcihrd2FyZ3MuZXJyb3JNZXNzYWdlKVxuICB9XG5cbiAgLy8gVGhpcyBhbGdvcml0aG0gY2FuIG9ubHkgaGFuZGxlIGZ1bGx5IGV4cGxvZGVkIElQIHN0cmluZ3NcbiAgaXBTdHIgPSBfZXhwbG9kZVNob3J0aGFuZElQc3RyaW5nKGlwU3RyKVxuICBpcFN0ciA9IF9zYW5pdGlzZUlQdjRNYXBwaW5nKGlwU3RyKVxuXG4gIC8vIElmIG5lZWRlZCwgdW5wYWNrIHRoZSBJUHY0IGFuZCByZXR1cm4gc3RyYWlnaHQgYXdheVxuICBpZiAoa3dhcmdzLnVucGFja0lQdjQpIHtcbiAgICB2YXIgaXB2NFVucGFja2VkID0gX3VucGFja0lQdjQoaXBTdHIpXG4gICAgaWYgKGlwdjRVbnBhY2tlZCkge1xuICAgICAgcmV0dXJuIGlwdjRVbnBhY2tlZFxuICAgIH1cbiAgfVxuXG4gIHZhciBoZXh0ZXRzID0gaXBTdHIuc3BsaXQoJzonKVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gaGV4dGV0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAvLyBSZW1vdmUgbGVhZGluZyB6ZXJvZXNcbiAgICBoZXh0ZXRzW2ldID0gaGV4dGV0c1tpXS5yZXBsYWNlKC9eMCsvLCAnJylcbiAgICBpZiAoaGV4dGV0c1tpXSA9PT0gJycpIHtcbiAgICAgIGhleHRldHNbaV0gPSAnMCdcbiAgICB9XG5cbiAgICAvLyBEZXRlcm1pbmUgYmVzdCBoZXh0ZXQgdG8gY29tcHJlc3NcbiAgICBpZiAoaGV4dGV0c1tpXSA9PSAnMCcpIHtcbiAgICAgIGRvdWJsZWNvbG9uTGVuICs9IDFcbiAgICAgIGlmIChkb3VibGVjb2xvblN0YXJ0ID09IC0xKSB7XG4gICAgICAgIC8vIFN0YXJ0IGEgc2VxdWVuY2Ugb2YgemVyb3NcbiAgICAgICAgZG91YmxlY29sb25TdGFydCA9IGlcbiAgICAgIH1cbiAgICAgIGlmIChkb3VibGVjb2xvbkxlbiA+IGJlc3REb3VibGVjb2xvbkxlbikge1xuICAgICAgICAvLyBUaGlzIGlzIHRoZSBsb25nZXN0IHNlcXVlbmNlIHNvIGZhclxuICAgICAgICBiZXN0RG91YmxlY29sb25MZW4gPSBkb3VibGVjb2xvbkxlblxuICAgICAgICBiZXN0RG91YmxlY29sb25TdGFydCA9IGRvdWJsZWNvbG9uU3RhcnRcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBkb3VibGVjb2xvbkxlbiA9IDBcbiAgICAgIGRvdWJsZWNvbG9uU3RhcnQgPSAtMVxuICAgIH1cbiAgfVxuXG4gIC8vIENvbXByZXNzIHRoZSBtb3N0IHN1aXRhYmxlIGhleHRldFxuICBpZiAoYmVzdERvdWJsZWNvbG9uTGVuID4gMSkge1xuICAgIHZhciBiZXN0RG91YmxlY29sb25FbmQgPSBiZXN0RG91YmxlY29sb25TdGFydCArIGJlc3REb3VibGVjb2xvbkxlblxuICAgIC8vIEZvciB6ZXJvcyBhdCB0aGUgZW5kIG9mIHRoZSBhZGRyZXNzXG4gICAgaWYgKGJlc3REb3VibGVjb2xvbkVuZCA9PSBoZXh0ZXRzLmxlbmd0aCkge1xuICAgICAgaGV4dGV0cy5wdXNoKCcnKVxuICAgIH1cbiAgICBoZXh0ZXRzLnNwbGljZShiZXN0RG91YmxlY29sb25TdGFydCwgYmVzdERvdWJsZWNvbG9uTGVuLCAnJylcbiAgICAvLyBGb3IgemVyb3MgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgYWRkcmVzc1xuICAgIGlmIChiZXN0RG91YmxlY29sb25TdGFydCA9PT0gMCkge1xuICAgICAgaGV4dGV0cy51bnNoaWZ0KCcnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBoZXh0ZXRzLmpvaW4oJzonKS50b0xvd2VyQ2FzZSgpXG59XG5cbi8qKlxuICogU2FuaXRpc2VzIElQdjQgbWFwcGluZyBpbiBhIGV4cGFuZGVkIElQdjYgYWRkcmVzcy5cbiAqXG4gKiBUaGlzIGNvbnZlcnRzIDo6ZmZmZjowYTBhOjBhMGEgdG8gOjpmZmZmOjEwLjEwLjEwLjEwLlxuICogSWYgdGhlcmUgaXMgbm90aGluZyB0byBzYW5pdGlzZSwgcmV0dXJucyBhbiB1bmNoYW5nZWQgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBfc2FuaXRpc2VJUHY0TWFwcGluZyhpcFN0cikge1xuICBpZiAoaXBTdHIudG9Mb3dlckNhc2UoKS5pbmRleE9mKCcwMDAwOjAwMDA6MDAwMDowMDAwOjAwMDA6ZmZmZjonKSAhPT0gMCkge1xuICAgIC8vIE5vdCBhbiBpcHY0IG1hcHBpbmdcbiAgICByZXR1cm4gaXBTdHJcbiAgfVxuXG4gIHZhciBoZXh0ZXRzID0gaXBTdHIuc3BsaXQoJzonKVxuXG4gIGlmIChoZXh0ZXRzW2hleHRldHMubGVuZ3RoIC0gMV0uaW5kZXhPZignLicpICE9IC0xKSB7XG4gICAgLy8gQWxyZWFkeSBzYW5pdGl6ZWRcbiAgICByZXR1cm4gaXBTdHJcbiAgfVxuXG4gIHZhciBpcHY0QWRkcmVzcyA9IFtcbiAgICBwYXJzZUludChoZXh0ZXRzWzZdLnN1YnN0cmluZygwLCAyKSwgMTYpXG4gICwgcGFyc2VJbnQoaGV4dGV0c1s2XS5zdWJzdHJpbmcoMiwgNCksIDE2KVxuICAsIHBhcnNlSW50KGhleHRldHNbN10uc3Vic3RyaW5nKDAsIDIpLCAxNilcbiAgLCBwYXJzZUludChoZXh0ZXRzWzddLnN1YnN0cmluZygyLCA0KSwgMTYpXG4gIF0uam9pbignLicpXG5cbiAgcmV0dXJuIGhleHRldHMuc2xpY2UoMCwgNikuam9pbignOicpICsgICc6JyArIGlwdjRBZGRyZXNzXG59XG5cbi8qKlxuICogVW5wYWNrcyBhbiBJUHY0IGFkZHJlc3MgdGhhdCB3YXMgbWFwcGVkIGluIGEgY29tcHJlc3NlZCBJUHY2IGFkZHJlc3MuXG4gKlxuICogVGhpcyBjb252ZXJ0cyAwMDAwOjAwMDA6MDAwMDowMDAwOjAwMDA6ZmZmZjoxMC4xMC4xMC4xMCB0byAxMC4xMC4xMC4xMC5cbiAqIElmIHRoZXJlIGlzIG5vdGhpbmcgdG8gc2FuaXRpemUsIHJldHVybnMgbnVsbC5cbiAqL1xuZnVuY3Rpb24gX3VucGFja0lQdjQoaXBTdHIpIHtcbiAgaWYgKGlwU3RyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZignMDAwMDowMDAwOjAwMDA6MDAwMDowMDAwOmZmZmY6JykgIT09IDApIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgdmFyIGhleHRldHMgPSBpcFN0ci5zcGxpdCgnOicpXG4gIHJldHVybiBoZXh0ZXRzLnBvcCgpXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiB3ZSBoYXZlIGEgdmFsaWQgSVB2NiBhZGRyZXNzLlxuICovXG5mdW5jdGlvbiBpc1ZhbGlkSVB2NkFkZHJlc3MoaXBTdHIpIHtcbiAgdmFyIHZhbGlkYXRlSVB2NEFkZHJlc3MgPSByZXF1aXJlKCcuL3ZhbGlkYXRvcnMnKS52YWxpZGF0ZUlQdjRBZGRyZXNzXG5cbiAgLy8gV2UgbmVlZCB0byBoYXZlIGF0IGxlYXN0IG9uZSAnOidcbiAgaWYgKGlwU3RyLmluZGV4T2YoJzonKSA9PSAtMSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gV2UgY2FuIG9ubHkgaGF2ZSBvbmUgJzo6JyBzaG9ydGVuZXJcbiAgaWYgKFN0cmluZ19jb3VudChpcFN0ciwgJzo6JykgPiAxKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyAnOjonIHNob3VsZCBiZSBlbmNvbXBhc3NlZCBieSBzdGFydCwgZGlnaXRzIG9yIGVuZFxuICBpZiAoaXBTdHIuaW5kZXhPZignOjo6JykgIT0gLTEpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIEEgc2luZ2xlIGNvbG9uIGNhbiBuZWl0aGVyIHN0YXJ0IG5vciBlbmQgYW4gYWRkcmVzc1xuICBpZiAoKGlwU3RyLmNoYXJBdCgwKSA9PSAnOicgJiYgaXBTdHIuY2hhckF0KDEpICE9ICc6JykgfHxcbiAgICAgIChpcFN0ci5jaGFyQXQoaXBTdHIubGVuZ3RoIC0gMSkgPT0gJzonICYmXG4gICAgICAgaXBTdHIuY2hhckF0KGlwU3RyLmxlbmd0aCAtIDIpICE9ICc6JykpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIFdlIGNhbiBuZXZlciBoYXZlIG1vcmUgdGhhbiA3ICc6JyAoMTo6MjozOjQ6NTo2Ojc6OCBpcyBpbnZhbGlkKVxuICBpZiAoU3RyaW5nX2NvdW50KGlwU3RyLCAnOicpID4gNykge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gSWYgd2UgaGF2ZSBubyBjb25jYXRlbmF0aW9uLCB3ZSBuZWVkIHRvIGhhdmUgOCBmaWVsZHMgd2l0aCA3ICc6J1xuICBpZiAoaXBTdHIuaW5kZXhPZignOjonKSA9PSAtMSAmJiBTdHJpbmdfY291bnQoaXBTdHIsICc6JykgIT0gNykge1xuICAgIC8vIFdlIG1pZ2h0IGhhdmUgYW4gSVB2NCBtYXBwZWQgYWRkcmVzc1xuICAgIGlmIChTdHJpbmdfY291bnQoaXBTdHIsICcuJykgIT0gMykge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9XG5cbiAgaXBTdHIgPSBfZXhwbG9kZVNob3J0aGFuZElQc3RyaW5nKGlwU3RyKVxuXG4gIC8vIE5vdyB0aGF0IHdlIGhhdmUgdGhhdCBhbGwgc3F1YXJlZCBhd2F5LCBsZXQncyBjaGVjayB0aGF0IGVhY2ggb2YgdGhlXG4gIC8vIGhleHRldHMgYXJlIGJldHdlZW4gMHgwIGFuZCAweEZGRkYuXG4gIHZhciBoZXh0ZXRzID0gaXBTdHIuc3BsaXQoJzonKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGhleHRldHMubGVuZ3RoLCBoZXh0ZXQ7IGkgPCBsOyBpKyspIHtcbiAgICBoZXh0ZXQgPSBoZXh0ZXRzW2ldXG4gICAgaWYgKFN0cmluZ19jb3VudChoZXh0ZXQsICcuJykgPT0gMykge1xuICAgICAgLy8gSWYgd2UgaGF2ZSBhbiBJUHY0IG1hcHBlZCBhZGRyZXNzLCB0aGUgSVB2NCBwb3J0aW9uIGhhcyB0b1xuICAgICAgLy8gYmUgYXQgdGhlIGVuZCBvZiB0aGUgSVB2NiBwb3J0aW9uLlxuICAgICAgaWYgKGlwU3RyLnNwbGl0KCc6JykucG9wKCkgIT0gaGV4dGV0KSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgdmFsaWRhdGVJUHY0QWRkcmVzcy5fX2NhbGxfXyhoZXh0ZXQpXG4gICAgICB9XG4gICAgICBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoIShlIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSkge1xuICAgICAgICAgIHRocm93IGVcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAoIWhleFJFLnRlc3QoaGV4dGV0KSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICAgIHZhciBpbnRWYWx1ZSA9IHBhcnNlSW50KGhleHRldCwgMTYpXG4gICAgICBpZiAoaXNOYU4oaW50VmFsdWUpIHx8IGludFZhbHVlIDwgMHgwIHx8IGludFZhbHVlID4gMHhGRkZGKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlXG59XG5cbi8qKlxuICogRXhwYW5kcyBhIHNob3J0ZW5lZCBJUHY2IGFkZHJlc3MuXG4gKi9cbmZ1bmN0aW9uIF9leHBsb2RlU2hvcnRoYW5kSVBzdHJpbmcoaXBTdHIpIHtcbiAgaWYgKCFfaXNTaG9ydEhhbmQoaXBTdHIpKSB7XG4gICAgLy8gV2UndmUgYWxyZWFkeSBnb3QgYSBsb25naGFuZCBpcFN0clxuICAgIHJldHVybiBpcFN0clxuICB9XG5cbiAgdmFyIG5ld0lwID0gW11cbiAgICAsIGhleHRldHMgPSBpcFN0ci5zcGxpdCgnOjonKVxuXG4gIC8vIElmIHRoZXJlIGlzIGEgOjosIHdlIG5lZWQgdG8gZXhwYW5kIGl0IHdpdGggemVyb2VzIHRvIGdldCB0byA4IGhleHRldHMgLVxuICAvLyB1bmxlc3MgdGhlcmUgaXMgYSBkb3QgaW4gdGhlIGxhc3QgaGV4dGV0LCBtZWFuaW5nIHdlJ3JlIGRvaW5nIHY0LW1hcHBpbmdcbiAgdmFyIGZpbGxUbyA9IChpcFN0ci5zcGxpdCgnOicpLnBvcCgpLmluZGV4T2YoJy4nKSAhPSAtMSkgPyA3IDogOFxuXG4gIGlmIChoZXh0ZXRzLmxlbmd0aCA+IDEpIHtcbiAgICB2YXIgc2VwID0gaGV4dGV0c1swXS5zcGxpdCgnOicpLmxlbmd0aCArIGhleHRldHNbMV0uc3BsaXQoJzonKS5sZW5ndGhcbiAgICBuZXdJcCA9IGhleHRldHNbMF0uc3BsaXQoJzonKVxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gZmlsbFRvIC0gc2VwOyBpIDwgbDsgaSsrKSB7XG4gICAgICBuZXdJcC5wdXNoKCcwMDAwJylcbiAgICB9XG4gICAgbmV3SXAgPSBuZXdJcC5jb25jYXQoaGV4dGV0c1sxXS5zcGxpdCgnOicpKVxuICB9XG4gIGVsc2Uge1xuICAgIG5ld0lwID0gaXBTdHIuc3BsaXQoJzonKVxuICB9XG5cbiAgLy8gTm93IG5lZWQgdG8gbWFrZSBzdXJlIGV2ZXJ5IGhleHRldCBpcyA0IGxvd2VyIGNhc2UgY2hhcmFjdGVycy5cbiAgLy8gSWYgYSBoZXh0ZXQgaXMgPCA0IGNoYXJhY3RlcnMsIHdlJ3ZlIGdvdCBtaXNzaW5nIGxlYWRpbmcgMCdzLlxuICB2YXIgcmV0SXAgPSBbXVxuICBmb3IgKGkgPSAwLCBsID0gbmV3SXAubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgcmV0SXAucHVzaCh6ZXJvUGFkZGluZyhuZXdJcFtpXSwgNCkgKyBuZXdJcFtpXS50b0xvd2VyQ2FzZSgpKVxuICB9XG4gIHJldHVybiByZXRJcC5qb2luKCc6Jylcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIHRoZSBhZGRyZXNzIGlzIHNob3J0ZW5lZC5cbiAqL1xuZnVuY3Rpb24gX2lzU2hvcnRIYW5kKGlwU3RyKSB7XG4gIGlmIChTdHJpbmdfY291bnQoaXBTdHIsICc6OicpID09IDEpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHZhciBwYXJ0cyA9IGlwU3RyLnNwbGl0KCc6JylcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBwYXJ0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAocGFydHNbaV0ubGVuZ3RoIDwgNCkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8vIFV0aWxpdGllc1xuXG5mdW5jdGlvbiB6ZXJvUGFkZGluZyhzdHIsIGxlbmd0aCkge1xuICBpZiAoc3RyLmxlbmd0aCA+PSBsZW5ndGgpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuICByZXR1cm4gbmV3IEFycmF5KGxlbmd0aCAtIHN0ci5sZW5ndGggKyAxKS5qb2luKCcwJylcbn1cblxuZnVuY3Rpb24gU3RyaW5nX2NvdW50KHN0ciwgc3ViU3RyKSB7XG4gIHJldHVybiBzdHIuc3BsaXQoc3ViU3RyKS5sZW5ndGggLSAxXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjbGVhbklQdjZBZGRyZXNzOiBjbGVhbklQdjZBZGRyZXNzXG4sIGlzVmFsaWRJUHY2QWRkcmVzczogaXNWYWxpZElQdjZBZGRyZXNzXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb25jdXIgPSByZXF1aXJlKCdDb25jdXInKVxuICAsIGlzID0gcmVxdWlyZSgnaXNvbW9ycGgvaXMnKVxuICAsIG9iamVjdCA9IHJlcXVpcmUoJ2lzb21vcnBoL29iamVjdCcpXG4gICwgcHVueWNvZGUgPSByZXF1aXJlKCdwdW55Y29kZScpXG4gICwgdXJsID0gcmVxdWlyZSgnaXNvbW9ycGgvdXJsJylcblxudmFyIGVycm9ycyA9IHJlcXVpcmUoJy4vZXJyb3JzJylcbiAgLCBpcHY2ID0gcmVxdWlyZSgnLi9pcHY2JylcblxudmFyIFZhbGlkYXRpb25FcnJvciA9IGVycm9ycy5WYWxpZGF0aW9uRXJyb3JcbiAgLCBpc1ZhbGlkSVB2NkFkZHJlc3MgPSBpcHY2LmlzVmFsaWRJUHY2QWRkcmVzc1xuXG52YXIgRU1QVFlfVkFMVUVTID0gW251bGwsIHVuZGVmaW5lZCwgJyddXG5cbnZhciBpc0VtcHR5VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IEVNUFRZX1ZBTFVFUy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAodmFsdWUgPT09IEVNUFRZX1ZBTFVFU1tpXSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbmZ1bmN0aW9uIGlzQ2FsbGFibGUobykge1xuICByZXR1cm4gKGlzLkZ1bmN0aW9uKG8pIHx8IGlzLkZ1bmN0aW9uKG8uX19jYWxsX18pKVxufVxuXG4vKipcbiAqIENhbGxzIGEgdmFsaWRhdG9yLCB3aGljaCBtYXkgYmUgYSBmdW5jdGlvbiBvciBhbiBvYmplY3RzIHdpdGggYVxuICogX19jYWxsX18gbWV0aG9kLCB3aXRoIHRoZSBnaXZlbiB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gY2FsbFZhbGlkYXRvcih2LCB2YWx1ZSkge1xuICBpZiAoaXMuRnVuY3Rpb24odikpIHtcbiAgICB2KHZhbHVlKVxuICB9XG4gIGVsc2UgaWYgKGlzLkZ1bmN0aW9uKHYuX19jYWxsX18pKSB7XG4gICAgdi5fX2NhbGxfXyh2YWx1ZSlcbiAgfVxufVxuXG5mdW5jdGlvbiBTdHJpbmdfcnNwbGl0KHN0ciwgc2VwLCBtYXhzcGxpdCkge1xuICB2YXIgc3BsaXQgPSBzdHIuc3BsaXQoc2VwKVxuICByZXR1cm4gbWF4c3BsaXQgPyBbc3BsaXQuc2xpY2UoMCwgLW1heHNwbGl0KS5qb2luKHNlcCldLmNvbmNhdChzcGxpdC5zbGljZSgtbWF4c3BsaXQpKSA6IHNwbGl0XG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaW5wdXQgbWF0Y2hlcyBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqL1xudmFyIFJlZ2V4VmFsaWRhdG9yID0gQ29uY3VyLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmVnZXhWYWxpZGF0b3IpKSB7IHJldHVybiBuZXcgUmVnZXhWYWxpZGF0b3Ioa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7XG4gICAgICByZWdleDogbnVsbCwgbWVzc2FnZTogbnVsbCwgY29kZTogbnVsbCwgaW52ZXJzZU1hdGNoOiBudWxsXG4gICAgfSwga3dhcmdzKVxuICAgIGlmIChrd2FyZ3MucmVnZXgpIHtcbiAgICAgIHRoaXMucmVnZXggPSBrd2FyZ3MucmVnZXhcbiAgICB9XG4gICAgaWYgKGt3YXJncy5tZXNzYWdlKSB7XG4gICAgICB0aGlzLm1lc3NhZ2UgPWt3YXJncy5tZXNzYWdlXG4gICAgfVxuICAgIGlmIChrd2FyZ3MuY29kZSkge1xuICAgICAgdGhpcy5jb2RlID0ga3dhcmdzLmNvZGVcbiAgICB9XG4gICAgaWYgKGt3YXJncy5pbnZlcnNlTWF0Y2gpIHtcbiAgICAgIHRoaXMuaW52ZXJzZU1hdGNoID0ga3dhcmdzLmludmVyc2VNYXRjaFxuICAgIH1cbiAgICAvLyBDb21waWxlIHRoZSByZWdleCBpZiBpdCB3YXMgbm90IHBhc3NlZCBwcmUtY29tcGlsZWRcbiAgICBpZiAoaXMuU3RyaW5nKHRoaXMucmVnZXgpKSB7XG4gICAgICB0aGlzLnJlZ2V4ID0gbmV3IFJlZ0V4cCh0aGlzLnJlZ2V4KVxuICAgIH1cbiAgfVxuLCByZWdleDogJydcbiwgbWVzc2FnZTogJ0VudGVyIGEgdmFsaWQgdmFsdWUuJ1xuLCBjb2RlOiAnaW52YWxpZCdcbiwgaW52ZXJzZU1hdGNoOiBmYWxzZVxuLCBfX2NhbGxfXzogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodGhpcy5pbnZlcnNlTWF0Y2ggPT09IHRoaXMucmVnZXgudGVzdCgnJyt2YWx1ZSkpIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLm1lc3NhZ2UsIHtjb2RlOiB0aGlzLmNvZGV9KVxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBsb29rcyBsaWtlIGEgdmFsaWQgVVJMLlxuICovXG52YXIgVVJMVmFsaWRhdG9yID0gUmVnZXhWYWxpZGF0b3IuZXh0ZW5kKHtcbiAgcmVnZXg6IG5ldyBSZWdFeHAoXG4gICAgJ14oPzpbYS16MC05XFxcXC5cXFxcLV0qKTovLycgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2NoZW1hIGlzIHZhbGlkYXRlZCBzZXBhcmF0ZWx5XG4gICsgJyg/Oig/OltBLVowLTldKD86W0EtWjAtOS1dezAsNjF9W0EtWjAtOV0pP1xcXFwuKSsoPzpbQS1aXXsyLDZ9XFxcXC4/fFtBLVowLTktXXsyLH1cXFxcLj8pfCcgLy8gRG9tYWluLi4uXG4gICsgJ2xvY2FsaG9zdHwnICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsb2NhbGhvc3QuLi5cbiAgKyAnXFxcXGR7MSwzfVxcXFwuXFxcXGR7MSwzfVxcXFwuXFxcXGR7MSwzfVxcXFwuXFxcXGR7MSwzfXwnICAgICAgLy8gLi4ub3IgSVB2NFxuICArICdcXFxcWz9bQS1GMC05XSo6W0EtRjAtOTpdK1xcXFxdPyknICAgICAgICAgICAgICAgICAgIC8vIC4uLm9yIElQdjZcbiAgKyAnKD86OlxcXFxkKyk/JyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT3B0aW9uYWwgcG9ydFxuICArICcoPzovP3xbLz9dXFxcXFMrKSQnXG4gICwgJ2knXG4gIClcbiwgbWVzc2FnZTogJ0VudGVyIGEgdmFsaWQgVVJMLidcbiwgc2NoZW1lczogWydodHRwJywgJ2h0dHBzJywgJ2Z0cCcsICdmdHBzJ11cblxuLCBjb25zdHJ1Y3RvcjpmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgVVJMVmFsaWRhdG9yKSkgeyByZXR1cm4gbmV3IFVSTFZhbGlkYXRvcihrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtzY2hlbWVzOiBudWxsfSwga3dhcmdzKVxuICAgIFJlZ2V4VmFsaWRhdG9yLmNhbGwodGhpcywga3dhcmdzKVxuICAgIGlmIChrd2FyZ3Muc2NoZW1lcyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5zY2hlbWVzID0ga3dhcmdzLnNjaGVtZXNcbiAgICB9XG4gIH1cblxuLCBfX2NhbGxfXzogZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YWx1ZSA9ICcnK3ZhbHVlXG4gICAgLy8gQ2hlY2sgaWYgdGhlIHNjaGVtZSBpcyB2YWxpZCBmaXJzdFxuICAgIHZhciBzY2hlbWUgPSB2YWx1ZS5zcGxpdCgnOi8vJylbMF0udG9Mb3dlckNhc2UoKVxuICAgIGlmICh0aGlzLnNjaGVtZXMuaW5kZXhPZihzY2hlbWUpID09PSAtMSkge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMubWVzc2FnZSwge2NvZGU6IHRoaXMuY29kZX0pXG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgdGhlIGZ1bGwgVVJMXG4gICAgdHJ5IHtcbiAgICAgIFJlZ2V4VmFsaWRhdG9yLnByb3RvdHlwZS5fX2NhbGxfXy5jYWxsKHRoaXMsIHZhbHVlKVxuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHsgdGhyb3cgZSB9XG5cbiAgICAgIC8vIFRyaXZpYWwgY2FzZSBmYWlsZWQgLSB0cnkgZm9yIHBvc3NpYmxlIElETiBkb21haW5cbiAgICAgIHZhciB1cmxGaWVsZHMgPSB1cmwucGFyc2VVcmkodmFsdWUpXG4gICAgICB0cnkge1xuICAgICAgICB1cmxGaWVsZHMuaG9zdCA9IHB1bnljb2RlLnRvQVNDSUkodXJsRmllbGRzLmhvc3QpXG4gICAgICB9XG4gICAgICBjYXRjaCAodW5pY29kZUVycm9yKSB7XG4gICAgICAgIHRocm93IGVcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gdXJsLm1ha2VVcmkodXJsRmllbGRzKVxuICAgICAgUmVnZXhWYWxpZGF0b3IucHJvdG90eXBlLl9fY2FsbF9fLmNhbGwodGhpcywgdmFsdWUpXG4gICAgfVxuICB9XG59KVxuXG4vKiogVmFsaWRhdGVzIHRoYXQgaW5wdXQgbG9va3MgbGlrZSBhIHZhbGlkIGUtbWFpbCBhZGRyZXNzLiAqL1xudmFyIEVtYWlsVmFsaWRhdG9yID0gQ29uY3VyLmV4dGVuZCh7XG4gIG1lc3NhZ2U6ICdFbnRlciBhIHZhbGlkIGVtYWlsIGFkZHJlc3MuJ1xuLCBjb2RlOiAnaW52YWxpZCdcbiwgdXNlclJlZ2V4OiBuZXcgUmVnRXhwKFxuICAgIFwiKF5bLSEjJCUmJyorLz0/Xl9ge318fjAtOUEtWl0rKFxcXFwuWy0hIyQlJicqKy89P15fYHt9fH4wLTlBLVpdKykqJFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG90LWF0b21cbiAgKyAnfF5cIihbXFxcXDAwMS1cXFxcMDEwXFxcXDAxM1xcXFwwMTRcXFxcMDE2LVxcXFwwMzchIy1cXFxcW1xcXFxdLVxcXFwxNzddfFxcXFxcXFxcW1xcXFwwMDEtXFxcXDAxMVxcXFwwMTNcXFxcMDE0XFxcXDAxNi1cXFxcMTc3XSkqXCIkKScgLy8gUXVvdGVkLXN0cmluZ1xuICAsICdpJylcbiwgZG9tYWluUmVnZXg6IG5ldyBSZWdFeHAoXG4gICAgJ14oPzpbQS1aMC05XSg/OltBLVowLTktXXswLDYxfVtBLVowLTldKT9cXFxcLikrKD86W0EtWl17Miw2fXxbQS1aMC05LV17Mix9KSQnICAgICAgICAgIC8vIERvbWFpblxuICArICd8XlxcXFxbKDI1WzAtNV18MlswLTRdXFxcXGR8WzAtMV0/XFxcXGQ/XFxcXGQpKFxcXFwuKDI1WzAtNV18MlswLTRdXFxcXGR8WzAtMV0/XFxcXGQ/XFxcXGQpKXszfVxcXFxdJCcgLy8gTGl0ZXJhbCBmb3JtLCBpcHY0IGFkZHJlc3MgKFNNVFAgNC4xLjMpXG4gICwgJ2knKVxuLCBkb21haW5XaGl0ZWxpc3Q6IFsnbG9jYWxob3N0J11cblxuLCBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEVtYWlsVmFsaWRhdG9yKSkgeyByZXR1cm4gbmV3IEVtYWlsVmFsaWRhdG9yKGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe21lc3NhZ2U6IG51bGwsIGNvZGU6IG51bGwsIHdoaXRlbGlzdDogbnVsbH0sIGt3YXJncylcbiAgICBpZiAoa3dhcmdzLm1lc3NhZ2UgIT09IG51bGwpIHtcbiAgICAgIHRoaXMubWVzc2FnZSA9IGt3YXJncy5tZXNzYWdlXG4gICAgfVxuICAgIGlmIChrd2FyZ3MuY29kZSAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jb2RlID0ga3dhcmdzLmNvZGVcbiAgICB9XG4gICAgaWYgKGt3YXJncy53aGl0ZWxpc3QgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuZG9tYWluV2hpdGVsaXN0ID0ga3dhcmdzLndoaXRlbGlzdFxuICAgIH1cbiAgfVxuXG4sIF9fY2FsbF9fIDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YWx1ZSA9ICcnK3ZhbHVlXG5cbiAgICBpZiAoIXZhbHVlIHx8IHZhbHVlLmluZGV4T2YoJ0AnKSA9PSAtMSkge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMubWVzc2FnZSwge2NvZGU6IHRoaXMuY29kZX0pXG4gICAgfVxuXG4gICAgdmFyIHBhcnRzID0gU3RyaW5nX3JzcGxpdCh2YWx1ZSwgJ0AnLCAxKVxuICAgIHZhciB1c2VyUGFydCA9IHBhcnRzWzBdXG4gICAgdmFyIGRvbWFpblBhcnQgPSBwYXJ0c1sxXVxuXG4gICAgaWYgKCF0aGlzLnVzZXJSZWdleC50ZXN0KHVzZXJQYXJ0KSkge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMubWVzc2FnZSwge2NvZGU6IHRoaXMuY29kZX0pXG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZG9tYWluV2hpdGVsaXN0LmluZGV4T2YoZG9tYWluUGFydCkgPT0gLTEgJiZcbiAgICAgICAgIXRoaXMuZG9tYWluUmVnZXgudGVzdChkb21haW5QYXJ0KSkge1xuICAgICAgLy8gVHJ5IGZvciBwb3NzaWJsZSBJRE4gZG9tYWluLXBhcnRcbiAgICAgIHRyeSB7XG4gICAgICAgIGRvbWFpblBhcnQgPSBwdW55Y29kZS50b0FTQ0lJKGRvbWFpblBhcnQpXG4gICAgICAgIGlmICh0aGlzLmRvbWFpblJlZ2V4LnRlc3QoZG9tYWluUGFydCkpIHtcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2F0Y2ggKHVuaWNvZGVFcnJvcikge1xuICAgICAgICAvLyBQYXNzIHRocm91Z2ggdG8gdGhyb3cgdGhlIFZhbGlkYXRpb25FcnJvclxuICAgICAgfVxuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMubWVzc2FnZSwge2NvZGU6IHRoaXMuY29kZX0pXG4gICAgfVxuICB9XG59KVxuXG52YXIgdmFsaWRhdGVFbWFpbCA9IEVtYWlsVmFsaWRhdG9yKClcblxudmFyIFNMVUdfUkUgPSAvXlstYS16QS1aMC05X10rJC9cbi8qKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBpcyBhIHZhbGlkIHNsdWcuICovXG52YXIgdmFsaWRhdGVTbHVnID0gUmVnZXhWYWxpZGF0b3Ioe1xuICByZWdleDogU0xVR19SRVxuLCBtZXNzYWdlOiAnRW50ZXIgYSB2YWxpZCBcInNsdWdcIiBjb25zaXN0aW5nIG9mIGxldHRlcnMsIG51bWJlcnMsIHVuZGVyc2NvcmVzIG9yIGh5cGhlbnMuJ1xuLCBjb2RlOiAnaW52YWxpZCdcbn0pXG5cbnZhciBJUFY0X1JFID0gL14oMjVbMC01XXwyWzAtNF1cXGR8WzAtMV0/XFxkP1xcZCkoXFwuKDI1WzAtNV18MlswLTRdXFxkfFswLTFdP1xcZD9cXGQpKXszfSQvXG4vKiogVmFsaWRhdGVzIHRoYXQgaW5wdXQgaXMgYSB2YWxpZCBJUHY0IGFkZHJlc3MuICovXG52YXIgdmFsaWRhdGVJUHY0QWRkcmVzcyA9IFJlZ2V4VmFsaWRhdG9yKHtcbiAgcmVnZXg6IElQVjRfUkVcbiwgbWVzc2FnZTogJ0VudGVyIGEgdmFsaWQgSVB2NCBhZGRyZXNzLidcbiwgY29kZTogJ2ludmFsaWQnXG59KVxuXG4vKiogVmFsaWRhdGVzIHRoYXQgaW5wdXQgaXMgYSB2YWxpZCBJUHY2IGFkZHJlc3MuICovXG5mdW5jdGlvbiB2YWxpZGF0ZUlQdjZBZGRyZXNzKHZhbHVlKSB7XG4gIGlmICghaXNWYWxpZElQdjZBZGRyZXNzKHZhbHVlKSkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcignRW50ZXIgYSB2YWxpZCBJUHY2IGFkZHJlc3MuJywge2NvZGU6ICdpbnZhbGlkJ30pXG4gIH1cbn1cblxuLyoqIFZhbGlkYXRlcyB0aGF0IGlucHV0IGlzIGEgdmFsaWQgSVB2NCBvciBJUHY2IGFkZHJlc3MuICovXG5mdW5jdGlvbiB2YWxpZGF0ZUlQdjQ2QWRkcmVzcyh2YWx1ZSkge1xuICB0cnkge1xuICAgIHZhbGlkYXRlSVB2NEFkZHJlc3MuX19jYWxsX18odmFsdWUpXG4gIH1cbiAgY2F0Y2ggKGUpIHtcbiAgICBpZiAoIShlIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSkge1xuICAgICAgdGhyb3cgZVxuICAgIH1cblxuICAgIGlmICghaXNWYWxpZElQdjZBZGRyZXNzKHZhbHVlKSkge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKCdFbnRlciBhIHZhbGlkIElQdjQgb3IgSVB2NiBhZGRyZXNzLicsIHtjb2RlOiAnaW52YWxpZCd9KVxuICAgIH1cbiAgfVxufVxuXG52YXIgaXBBZGRyZXNzVmFsaWRhdG9yTG9va3VwID0ge1xuICBib3RoOiB7dmFsaWRhdG9yczogW3ZhbGlkYXRlSVB2NDZBZGRyZXNzXSwgbWVzc2FnZTogJ0VudGVyIGEgdmFsaWQgSVB2NCBvciBJUHY2IGFkZHJlc3MuJ31cbiwgaXB2NDoge3ZhbGlkYXRvcnM6IFt2YWxpZGF0ZUlQdjRBZGRyZXNzXSwgbWVzc2FnZTogJ0VudGVyIGEgdmFsaWQgSVB2NCBhZGRyZXNzLid9XG4sIGlwdjY6IHt2YWxpZGF0b3JzOiBbdmFsaWRhdGVJUHY2QWRkcmVzc10sIG1lc3NhZ2U6ICdFbnRlciBhIHZhbGlkIElQdjYgYWRkcmVzcy4nfVxufVxuXG4vKipcbiAqIERlcGVuZGluZyBvbiB0aGUgZ2l2ZW4gcGFyYW1ldGVycyByZXR1cm5zIHRoZSBhcHByb3ByaWF0ZSB2YWxpZGF0b3JzIGZvclxuICogYSBHZW5lcmljSVBBZGRyZXNzRmllbGQuXG4gKi9cbmZ1bmN0aW9uIGlwQWRkcmVzc1ZhbGlkYXRvcnMocHJvdG9jb2wsIHVucGFja0lQdjQpIHtcbiAgaWYgKHByb3RvY29sICE9ICdib3RoJyAmJiB1bnBhY2tJUHY0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgY2FuIG9ubHkgdXNlIHVucGFja0lQdjQgaWYgcHJvdG9jb2wgaXMgc2V0IHRvIFwiYm90aFwiJylcbiAgfVxuICBwcm90b2NvbCA9IHByb3RvY29sLnRvTG93ZXJDYXNlKClcbiAgaWYgKHR5cGVvZiBpcEFkZHJlc3NWYWxpZGF0b3JMb29rdXBbcHJvdG9jb2xdID09ICd1bmRlZmluZWQnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgcHJvdG9jb2wgXCInICsgcHJvdG9jb2wgKydcIiBpcyB1bmtub3duJylcbiAgfVxuICByZXR1cm4gaXBBZGRyZXNzVmFsaWRhdG9yTG9va3VwW3Byb3RvY29sXVxufVxuXG52YXIgQ09NTUFfU0VQQVJBVEVEX0lOVF9MSVNUX1JFID0gL15bXFxkLF0rJC9cbi8qKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBpcyBhIGNvbW1hLXNlcGFyYXRlZCBsaXN0IG9mIGludGVnZXJzLiAqL1xudmFyIHZhbGlkYXRlQ29tbWFTZXBhcmF0ZWRJbnRlZ2VyTGlzdCA9IFJlZ2V4VmFsaWRhdG9yKHtcbiAgcmVnZXg6IENPTU1BX1NFUEFSQVRFRF9JTlRfTElTVF9SRVxuLCBtZXNzYWdlOiAnRW50ZXIgb25seSBkaWdpdHMgc2VwYXJhdGVkIGJ5IGNvbW1hcy4nXG4sIGNvZGU6ICdpbnZhbGlkJ1xufSlcblxuLyoqXG4gKiBCYXNlIGZvciB2YWxpZGF0b3JzIHdoaWNoIGNvbXBhcmUgaW5wdXQgYWdhaW5zdCBhIGdpdmVuIHZhbHVlLlxuICovXG52YXIgQmFzZVZhbGlkYXRvciA9IENvbmN1ci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24obGltaXRWYWx1ZSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCYXNlVmFsaWRhdG9yKSkgeyByZXR1cm4gbmV3IEJhc2VWYWxpZGF0b3IobGltaXRWYWx1ZSkgfVxuICAgIHRoaXMubGltaXRWYWx1ZSA9IGxpbWl0VmFsdWVcbiAgfVxuLCBjb21wYXJlOiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhICE9PSBiIH1cbiwgY2xlYW46IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggfVxuLCBtZXNzYWdlOiAnRW5zdXJlIHRoaXMgdmFsdWUgaXMge2xpbWl0VmFsdWV9IChpdCBpcyB7c2hvd1ZhbHVlfSkuJ1xuLCBjb2RlOiAnbGltaXRWYWx1ZSdcbiwgX19jYWxsX186IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIGNsZWFuZWQgPSB0aGlzLmNsZWFuKHZhbHVlKVxuICAgIHZhciBwYXJhbXMgPSB7bGltaXRWYWx1ZTogdGhpcy5saW1pdFZhbHVlLCBzaG93VmFsdWU6IGNsZWFuZWR9XG4gICAgaWYgKHRoaXMuY29tcGFyZShjbGVhbmVkLCB0aGlzLmxpbWl0VmFsdWUpKSB7XG4gICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5tZXNzYWdlLCB7Y29kZTogdGhpcy5jb2RlLCBwYXJhbXM6IHBhcmFtc30pXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGlucHV0IGlzIGxlc3MgdGhhbiBvciBlcXVhbCB0byBhIGdpdmVuIHZhbHVlLlxuICovXG52YXIgTWF4VmFsdWVWYWxpZGF0b3IgPSBCYXNlVmFsaWRhdG9yLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihsaW1pdFZhbHVlKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1heFZhbHVlVmFsaWRhdG9yKSkgeyByZXR1cm4gbmV3IE1heFZhbHVlVmFsaWRhdG9yKGxpbWl0VmFsdWUpIH1cbiAgICBCYXNlVmFsaWRhdG9yLmNhbGwodGhpcywgbGltaXRWYWx1ZSlcbiAgfVxuLCBjb21wYXJlOiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhID4gYiB9XG4sIG1lc3NhZ2U6ICdFbnN1cmUgdGhpcyB2YWx1ZSBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8ge2xpbWl0VmFsdWV9LidcbiwgY29kZTogJ21heFZhbHVlJ1xufSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gYSBnaXZlbiB2YWx1ZS5cbiAqL1xudmFyIE1pblZhbHVlVmFsaWRhdG9yID0gQmFzZVZhbGlkYXRvci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24obGltaXRWYWx1ZSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNaW5WYWx1ZVZhbGlkYXRvcikpIHsgcmV0dXJuIG5ldyBNaW5WYWx1ZVZhbGlkYXRvcihsaW1pdFZhbHVlKSB9XG4gICAgQmFzZVZhbGlkYXRvci5jYWxsKHRoaXMsIGxpbWl0VmFsdWUpXG4gIH1cbiwgY29tcGFyZTogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gYSA8IGIgfVxuLCBtZXNzYWdlOiAnRW5zdXJlIHRoaXMgdmFsdWUgaXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvIHtsaW1pdFZhbHVlfS4nXG4sIGNvZGU6ICdtaW5WYWx1ZSdcbn0pXG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaW5wdXQgaXMgYXQgbGVhc3QgYSBnaXZlbiBsZW5ndGguXG4gKi9cbnZhciBNaW5MZW5ndGhWYWxpZGF0b3IgPSBCYXNlVmFsaWRhdG9yLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihsaW1pdFZhbHVlKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1pbkxlbmd0aFZhbGlkYXRvcikpIHsgcmV0dXJuIG5ldyBNaW5MZW5ndGhWYWxpZGF0b3IobGltaXRWYWx1ZSkgfVxuICAgIEJhc2VWYWxpZGF0b3IuY2FsbCh0aGlzLCBsaW1pdFZhbHVlKVxuICB9XG4sIGNvbXBhcmU6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPCBiIH1cbiwgY2xlYW46IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubGVuZ3RoIH1cbiwgbWVzc2FnZTogJ0Vuc3VyZSB0aGlzIHZhbHVlIGhhcyBhdCBsZWFzdCB7bGltaXRWYWx1ZX0gY2hhcmFjdGVycyAoaXQgaGFzIHtzaG93VmFsdWV9KS4nXG4sIGNvZGU6ICdtaW5MZW5ndGgnXG59KVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGlucHV0IGlzIGF0IG1vc3QgYSBnaXZlbiBsZW5ndGguXG4gKi9cbnZhciBNYXhMZW5ndGhWYWxpZGF0b3IgPSBCYXNlVmFsaWRhdG9yLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihsaW1pdFZhbHVlKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1heExlbmd0aFZhbGlkYXRvcikpIHsgcmV0dXJuIG5ldyBNYXhMZW5ndGhWYWxpZGF0b3IobGltaXRWYWx1ZSkgfVxuICAgIEJhc2VWYWxpZGF0b3IuY2FsbCh0aGlzLCBsaW1pdFZhbHVlKVxuICB9XG4sIGNvbXBhcmU6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPiBiIH1cbiwgY2xlYW46IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubGVuZ3RoIH1cbiwgbWVzc2FnZTogJ0Vuc3VyZSB0aGlzIHZhbHVlIGhhcyBhdCBtb3N0IHtsaW1pdFZhbHVlfSBjaGFyYWN0ZXJzIChpdCBoYXMge3Nob3dWYWx1ZX0pLidcbiwgY29kZTogJ21heExlbmd0aCdcbn0pXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBFTVBUWV9WQUxVRVM6IEVNUFRZX1ZBTFVFU1xuLCBpc0VtcHR5VmFsdWU6IGlzRW1wdHlWYWx1ZVxuLCBpc0NhbGxhYmxlOiBpc0NhbGxhYmxlXG4sIGNhbGxWYWxpZGF0b3I6IGNhbGxWYWxpZGF0b3JcbiwgUmVnZXhWYWxpZGF0b3I6IFJlZ2V4VmFsaWRhdG9yXG4sIFVSTFZhbGlkYXRvcjogVVJMVmFsaWRhdG9yXG4sIEVtYWlsVmFsaWRhdG9yOiBFbWFpbFZhbGlkYXRvclxuLCB2YWxpZGF0ZUVtYWlsOiB2YWxpZGF0ZUVtYWlsXG4sIHZhbGlkYXRlU2x1ZzogdmFsaWRhdGVTbHVnXG4sIHZhbGlkYXRlSVB2NEFkZHJlc3M6IHZhbGlkYXRlSVB2NEFkZHJlc3NcbiwgdmFsaWRhdGVJUHY2QWRkcmVzczogdmFsaWRhdGVJUHY2QWRkcmVzc1xuLCB2YWxpZGF0ZUlQdjQ2QWRkcmVzczogdmFsaWRhdGVJUHY0NkFkZHJlc3NcbiwgaXBBZGRyZXNzVmFsaWRhdG9yczogaXBBZGRyZXNzVmFsaWRhdG9yc1xuLCB2YWxpZGF0ZUNvbW1hU2VwYXJhdGVkSW50ZWdlckxpc3Q6IHZhbGlkYXRlQ29tbWFTZXBhcmF0ZWRJbnRlZ2VyTGlzdFxuLCBCYXNlVmFsaWRhdG9yOiBCYXNlVmFsaWRhdG9yXG4sIE1heFZhbHVlVmFsaWRhdG9yOiBNYXhWYWx1ZVZhbGlkYXRvclxuLCBNaW5WYWx1ZVZhbGlkYXRvcjogTWluVmFsdWVWYWxpZGF0b3JcbiwgTWF4TGVuZ3RoVmFsaWRhdG9yOiBNYXhMZW5ndGhWYWxpZGF0b3JcbiwgTWluTGVuZ3RoVmFsaWRhdG9yOiBNaW5MZW5ndGhWYWxpZGF0b3JcbiwgVmFsaWRhdGlvbkVycm9yOiBWYWxpZGF0aW9uRXJyb3JcbiwgaXB2NjogaXB2NlxufVxuIl19
(5)
});
