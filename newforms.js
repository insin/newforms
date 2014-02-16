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
  constructor: function(kwargs) {
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
        errors = errors.concat(e.messages)
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
 * Django has dropped this method, but we still need to it perform the change
 * check for certain Field types.
 */
Field.prototype._hasChanged = function(initial, data) {
  return this.widget._hasChanged(initial, data)
}

/**
 * Validates that its input is a valid String.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var CharField = Field.extend({
  constructor: function(kwargs) {
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
 * <code>maxLength</code> attribute to text input fields.
 *
 * @param {Widget} widget the widget being used to render this field's value.
 *
 * @return additional attributes which should be added to the given widget.
 */
CharField.prototype.widgetAttrs = function(widget) {
  var attrs = {}
  if (this.maxLength !== null && (widget instanceof widgets.TextInput ||
                                  widget instanceof widgets.PasswordInput)) {
    attrs.maxLength = this.maxLength.toString()
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
  constructor: function(kwargs) {
    if (!(this instanceof Field)) { return new IntegerField(kwargs) }
    kwargs = object.extend({
      maxValue: null, minValue: null
    }, kwargs)
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
    , maxValue: 'Ensure this value is less than or equal to {limitValue}.'
    , minValue: 'Ensure this value is greater than or equal to {limitValue}.'
    })

/**
 * Validates that Number() can be called on the input with a result that isn't
 * NaN and doesn't contain any decimal points.
 *
 * @param value the value to be val idated.
 * @return the result of Number(), or <code>null</code> for empty values.
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

/**
 * Validates that its input is a valid float.
 * @constructor
 * @extends {IntegerField}
 * @param {Object=} kwargs
 */
var FloatField = IntegerField.extend({
  constructor: function(kwargs) {
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
 * @return a Number obtained from parseFloat(), or <code>null</code> for empty
 *         values.
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

/**
 * Validates that its input is a decimal number.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var DecimalField = Field.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Field)) { return new DecimalField(kwargs) }
    kwargs = object.extend({
      maxValue: null, minValue: null, maxDigits: null, decimalPlaces: null
    }, kwargs)
    this.maxValue = kwargs.maxValue
    this.minValue = kwargs.minValue
    this.maxDigits = kwargs.maxDigits
    this.decimalPlaces = kwargs.decimalPlaces
    Field.call(this, kwargs)

    if (this.minValue !== null) {
      this.validators.push(validators.MinValueValidator(this.minValue))
    }
    if (this.maxValue !== null) {
      this.validators.push(validators.MaxValueValidator(this.maxValue))
    }
  }
})
/** Decimal validation regular expression, in lieu of a Decimal type. */
DecimalField.DECIMAL_REGEXP = /^[-+]?(?:\d+(?:\.\d+)?|(?:\d+)?\.\d+)$/
DecimalField.prototype.defaultErrorMessages =
    object.extend({}, DecimalField.prototype.defaultErrorMessages, {
      invalid: 'Enter a number.'
    , maxValue: 'Ensure this value is less than or equal to {limitValue}.'
    , minValue: 'Ensure this value is greater than or equal to {limitValue}.'
    , maxDigits: 'Ensure that there are no more than {maxDigits} digits in total.'
    , maxDecimalPlaces: 'Ensure that there are no more than {maxDecimalPlaces} decimal places.'
    , maxWholeDigits: 'Ensure that there are no more than {maxWholeDigits} digits before the decimal point.'
    })

/**
 * DecimalField overrides the clean() method as it performs its own validation
 * against a different value than that given to any defined validators, due to
 * JavaScript lacking a built-in Decimal type. Decimal format and component size
 * checks will be performed against a normalised string representation of the
 * input, whereas Validators will be passed a float version of teh value for
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

/**
 * Base field for fields which validate that their input is a date or time.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var BaseTemporalField = Field.extend({
  constructor: function(kwargs) {
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

/**
 * Validates that its input is a date.
 * @constructor
 * @extends {BaseTemporalField}
 * @param {Object=} kwargs
 */
var DateField = BaseTemporalField.extend({
  constructor: function(kwargs) {
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
  constructor: function(kwargs) {
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
  constructor: function(kwargs) {
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
  constructor: function(regex, kwargs) {
    if (!(this instanceof Field)) { return new RegexField(regex, kwargs) }
    CharField.call(this, kwargs)
    if (is.String(regex)) {
      regex = new RegExp(regex)
    }
    this.regex = regex
    this.validators.push(validators.RegexValidator(this.regex))
  }
})

/**
 * Validates that its input appears to be a valid e-mail address.
 * @constructor
 * @extends {CharField}
 * @param {Object=} kwargs
 */
var EmailField = CharField.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Field)) { return new EmailField(kwargs) }
    CharField.call(this, kwargs)
  }
, defaultValidators: [validators.validateEmail]
})
EmailField.prototype.defaultErrorMessages =
    object.extend({}, EmailField.prototype.defaultErrorMessages, {
      invalid: 'Enter a valid e-mail address.'
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
  constructor: function(kwargs) {
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

/**
 * Validates that its input is a valid uploaded image.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var ImageField = FileField.extend({
constructor: function(kwargs) {
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
  constructor: function(kwargs) {
    if (!(this instanceof Field)) { return new URLField(kwargs) }
    CharField.call(this, kwargs)
    this.validators.push(validators.URLValidator())
  }
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

/**
 * Normalises its input to a <code>Boolean</code> primitive.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var BooleanField = Field.extend({
  constructor: function(kwargs) {
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

/**
 * A field whose valid values are <code>null</code>, <code>true</code> and
 * <code>false</code>. Invalid values are cleaned to <code>null</code>.
 * @constructor
 * @extends {BooleanField}
 * @param {Object=} kwargs
 */
var NullBooleanField = BooleanField.extend({
  constructor: function(kwargs) {
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

/**
 * Validates that its input is one of a valid list of choices.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var ChoiceField = Field.extend({
  constructor: function(kwargs) {
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
  constructor: function(kwargs) {
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
  constructor: function(kwargs) {
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

/**
 * AMultipleChoiceField which returns values coerced by some provided function.
 * @constructor
 * @extends {MultipleChoiceField}
 * @param {Object=} kwargs
 */
var TypedMultipleChoiceField = MultipleChoiceField.extend({
  constructor: function(kwargs) {
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
  constructor: function(path, kwargs) {
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
 * A Field whose <code>clean()</code> method calls multiple Field
 * <code>clean()</code> methods.
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var ComboField = Field.extend({
  constructor: function(kwargs) {
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
 * @constructor
 * @extends {Field}
 * @param {Object=} kwargs
 */
var MultiValueField = Field.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Field)) { return new MultiValueField(kwargs) }
    kwargs = object.extend({fields: []}, kwargs)
    Field.call(this, kwargs)
    // Set required to false on the individual fields, because the required
    // validation will be handled by MultiValueField, not by those individual
    // fields.
    for (var i = 0, l = kwargs.fields.length; i < l; i++) {
      kwargs.fields[i].required = false
    }
    this.fields = kwargs.fields
  }
})
MultiValueField.prototype.defaultErrorMessages =
    object.extend({}, MultiValueField.prototype.defaultErrorMessages, {
      invalid: 'Enter a list of values.'
    })

MultiValueField.prototype.validate = function() {}

/**
 * Validates every value in the given list. A value is validated against the
 * corresponding Field in <code>this.fields</code>.
 *
 * For example, if this MultiValueField was instantiated with
 * <code>{fields: [forms.DateField(), forms.TimeField()]}, <code>clean()</code>
 * would call <code>DateField.clean(value[0])</code> and
 * <code>TimeField.clean(value[1])<code>.
 *
 * @param {Array} value the input to be validated.
 *
 * @return the result of calling <code>compress()</code> on the cleaned input.
 */
MultiValueField.prototype.clean = function(value) {
  var cleanData = []
    , errors = []
    , i
    , l

  if (!value || is.Array(value)) {
    var allValuesEmpty = true
    if (is.Array(value)) {
      for (i = 0, l = value.length; i < l; i++) {
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
      , fieldValue = value[i]
    if (fieldValue === undefined) {
      fieldValue = null
    }
    if (this.required && isEmptyValue(fieldValue)) {
      throw ValidationError(this.errorMessages.required)
    }
    try {
      cleanData.push(field.clean(fieldValue))
    }
    catch (e) {
      if (!(e instanceof ValidationError)) {
        throw e
      }
      errors = errors.concat(e.messages)
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
 * <code>{fields: [forms.DateField(), forms.TimeField()]}</code>, this might
 * return a <code>Date</code> object created by combining the date and time in
 * <code>dataList</code>.
 *
 * @param {Array} dataList
 */
MultiValueField.prototype.compress = function(dataList) {
  throw new Error('Subclasses must implement this method.')
}

/**
 * A MultiValueField consisting of a DateField and a TimeField.
 * @constructor
 * @extends {MultiValueField}
 * @param {Object=} kwargs
 */
var SplitDateTimeField = MultiValueField.extend({
  constructor: function(kwargs) {
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
    , TimeField({inputFormats: kwargs.inputDateFormats,
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
 * @param {Array} [dataList] a two-item list consisting of two <code>Date</code>
 *                           objects, the first of which represents a date, the
 *                           second a time.
 *
 * @return a <code>Date</code> object representing the given date and time, or
 *         <code>null</code> for empty values.
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
 */
var IPAddressField = CharField.extend({
  constructor: function(kwargs) {
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
  constructor: function(kwargs) {
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
  constructor: function(kwargs) {
    if (!(this instanceof Field)) { return new SlugField(kwargs) }
    CharField.call(this, kwargs)
  }
})
SlugField.prototype.defaultValidators = [validators.validateSlug]
SlugField.prototype.defaultErrorMessages =
    object.extend({}, SlugField.prototype.defaultErrorMessages, {
      invalid: "Enter a valid 'slug' consisting of letters, numbers, underscores or hyphens."
    })

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
 *
 * @param {Form} form a form.
 * @param {Field} field one of the form's fields.
 * @param {String} name the name under which the field is held in the form.
 * @constructor
 */
var BoundField = Concur.extend({
  constructor: function(form, field, name) {
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
 * Calculates and returns the <code>id</code> attribute for this BoundFIeld
 * if the associated form has an autoId. Returns an empty string otherwise.
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
   * Returns the data for this BoundFIeld, or <code>null</code> if it wasn't
   * given.
   */
BoundField.prototype.data = function() {
  return this.field.widget.valueFromData(this.form.data,
                                         this.form.files,
                                         this.htmlName)
}

  /**
   * Wrapper around the field widget's <code>idForLabel</code> method.
   * Useful, for example, for focusing on this field regardless of whether
   * it has a single widget or a MutiWidget.
   */
BoundField.prototype.idForLabel = function() {
  var widget = this.field.widget
    , id = object.get(widget.attrs, 'id', this.autoId())
  return widget.idForLabel(id)
}

BoundField.prototype.render = function() {
  if (this.field.showHiddenInitial) {
    return React.DOM.div(null, this.asWidget(),
                         this.asHidden({onlyInitial: true}))
  }
  return this.asWidget()
}

/**
 * Yields SubWidgets that comprise all widgets in this BoundField.  This really
 * is only useful for RadioSelect widgets, so that you can iterate over
 * individual radio buttons when rendering.
 */
BoundField.prototype.__iter__ = function() {
  return this.field.widget.subWidgets(this.htmlName, this.value())
}

/**
 * Renders a widget for the field.
 *
 * @param {Object} [kwargs] configuration options
 * @config {Widget} [widget] an override for the widget used to render the field
 *                           - if not provided, the field's configured widget
 *                           will be used
 * @config {Object} [attrs] additional attributes to be added to the field's
 *                          widget.
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
 *
 * @param {Object} [kwargs] widget options.
 */
BoundField.prototype.asText = function(kwargs) {
  kwargs = object.extend({}, kwargs, {widget: TextInput()})
  return this.asWidget(kwargs)
}

/**
 * Renders the field as a textarea.
 *
 * @param {Object} [kwargs] widget options.
 */
BoundField.prototype.asTextarea = function(kwargs) {
  kwargs = object.extend({}, kwargs, {widget: Textarea()})
  return this.asWidget(kwargs)
}

/**
 * Renders the field as a hidden field.
 *
 * @param {Object} [attrs] additional attributes to be added to the field's
 *                         widget.
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
  var label = ''+this.label
  // Only add the suffix if the label does not end in punctuation
  if (this.form.labelSuffix &&
      ':?.!'.indexOf(label.charAt(label.length - 1)) == -1) {
    label += this.form.labelSuffix
  }
  return label
}

/**
 * Wraps the given contents in a &lt;label&gt;, if the field has an ID
 * attribute. Does not HTML-escape the contents. If contents aren't given, uses
 * the field's HTML-escaped label.
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
    , widget = this.field.widget
    , id
    , attrs
  if (kwargs.contents !== null) {
    contents = kwargs.contents
  }
  else {
    contents = this.getLabel()
  }

  id = object.get(widget.attrs, 'id', this.autoId())
  if (id) {
    attrs = object.extend(kwargs.attrs || {}, {htmlFor: widget.idForLabel(id)})
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
  constructor: function(kwargs) {
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
 *
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
      if (!object.hasOwn(this.fields, name)) {
        continue
      }

      var field = this.fields[name]
      var prefixedName = this.addPrefix(name)
      var dataValue = field.widget.valueFromData(this.data,
                                                 this.files,
                                                 prefixedName)
      initialValue = object.get(this.initial, name, field.initial)

      if (field.showHiddenInitial) {
        var initialPrefixedName = this.addInitialPrefix(name)
        var hiddenWidget = new field.hiddenWidget()
        initialValue = hiddenWidget.valueFromData(
                this.data, this.files, initialPrefixedName)
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
 * In lieu of __iter__, creates a {@link BoundField} for each field in the form,
 * in the order in which the fields were created.
 *
 * @param {Function} [test] if provided, this function will be called with
 *                          <var>field</var> and <var>name</var> arguments -
 *                          BoundFields will only be generated for fields for
 *                          which <code>true</code> is returned.
 *
 * @return a list of <code>BoundField</code> objects - one for each field in
 *         the form, in the order in which the fields were created.
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
 * In lieu of __getitem__, creates a {@link BoundField} for the field with the
 * given name.
 *
 * @param {String} name a field name.
 *
 * @return a <code>BoundField</code> for the field with the given name, if one
 *         exists.
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
 *
 * @param {String} fieldName a field name.
 *
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
 * Add an initial prefix for checking dynamic initial values.
 */
BaseForm.prototype.addInitialPrefix = function(fieldName) {
  return format('initial-{fieldName}',
                {fieldName: this.addPrefix(fieldName)})
}

/**
 * Helper function for outputting HTML.
 *
 * @param {Function} normalRow a function which produces a normal row.
 * @param {Function} errorRow a function which produces an error row.
 * @param {Boolean} errorsOnSeparateRow determines if errors are placed in their
 *                                      own row, or in the row for the field
 *                                      they are related to.
 *
 * @return if we're operating in DOM mode returns a list of DOM elements
 *         representing rows, otherwise returns an HTML string, with rows
 *         separated by linebreaks.
 */
BaseForm.prototype._htmlOutput = function(normalRow,
                                          errorRow,
                                          errorsOnSeparateRow) {
  // Errors that should be displayed above all fields
  var topErrors = this.nonFieldErrors()
    , rows = []
    , hiddenFields = []
    , htmlClassAttr = null
    , cssClasses = null
    , hiddenBoundFields = this.hiddenFields()
    , visibleBoundFields = this.visibleFields()
    , bf, bfErrors, i, l, j, m

  for (i = 0, l = hiddenBoundFields.length; i < l; i++) {
    bf = hiddenBoundFields[i]
    bfErrors = bf.errors()
    if (bfErrors.isPopulated()) {
      for (j = 0, m = bfErrors.errors.length; j < m; j++) {
        topErrors.errors.push('(Hidden field ' + bf.name + ') ' +
                              bfErrors.errors[j])
      }
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
      , label = null
      , helpText = null
      , extraContent = null

    bfErrors = bf.errors()
    if (bfErrors.isPopulated()) {
      errors = new this.errorConstructor()
      for (j = 0, m = bfErrors.errors.length; j < m; j++) {
        errors.errors.push(bfErrors.errors[j])
      }

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
    rows.push(normalRow(label, bf.render(), helpText, errors,
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
 * Returns this form rendered as HTML &lt;tr&gt;s - excluding the
 * &lt;table&gt;&lt;/table&gt;.
 */
BaseForm.prototype.asTable = (function() {
  var normalRow = function(label, field, helpText, errors, htmlClassAttr,
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

    var rowAttrs = {}
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
 * Returns this form rendered as HTML &lt;li&gt;s - excluding the
 * &lt;ul&gt;&lt;/ul&gt;.
 */
BaseForm.prototype.asUL = (function() {
  var normalRow = function(label, field, helpText, errors, htmlClassAttr,
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

    var rowAttrs = {}
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
 * Returns this form rendered as HTML &lt;p&gt;s.
 */
BaseForm.prototype.asP = (function() {
  var normalRow = function(label, field, helpText, errors, htmlClassAttr,
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

    var rowAttrs = {}
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
 *
 * @return errors that aren't associated with a particular field - i.e., errors
 *         generated by <code>clean()</code>. Will be empty if there are none.
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
 * Cleans all of <code>data</code> and populates <code>_errors</code> and
 * <code>cleanedData</code>.
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

  if (this._errors.isPopulated()) {
    delete this.cleanedData
  }
}

BaseForm.prototype._cleanFields = function() {
  for (var name in this.fields)
  {
    if (!object.hasOwn(this.fields, name)) {
      continue
    }

    var field = this.fields[name]
        // valueFromData() gets the data from the data objects.
        // Each widget type knows how to retrieve its own data, because some
        // widgets split data over several HTML fields.
      , value = field.widget.valueFromData(this.data, this.files,
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
         this.cleanedData[name] = this[customClean]()
         continue
      }

      // Try cleanName
      customClean = 'clean' + name.charAt(0).toUpperCase() +
                    name.substr(1)
      if (typeof this[customClean] != 'undefined' &&
          is.Function(this[customClean])) {
        this.cleanedData[name] = this[customClean]()
      }
    }
    catch (e) {
      if (!(e instanceof ValidationError)) {
        throw e
      }
      this._errors.set(name, new this.errorConstructor(e.messages))
      if (typeof this.cleanedData[name] != 'undefined') {
        delete this.cleanedData[name]
      }
    }
  }
}

BaseForm.prototype._cleanForm = function() {
  try {
    this.cleanedData = this.clean()
  }
  catch (e) {
    if (!(e instanceof ValidationError)) {
      throw e
    }
    this._errors.set(NON_FIELD_ERRORS,
                     new this.errorConstructor(e.messages))
  }
}

/**
 * An internal hook for performing additional cleaning after form cleaning is
 * complete.
 */
BaseForm.prototype._postClean = function() {}

/**
 * Hook for doing any extra form-wide cleaning after each Field's
 * <code>clean()</code> has been called. Any {@link ValidationError} raised by
 * this method will not be associated with a particular field; it will have a
 * special-case association with the field named <code>__all__</code>.
 *
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
 * Determines if the form needs to be multipart-encrypted, in other words, if it
 * has a {@link FileInput}.
 *
 * @return <code>true</code> if the form needs to be multipart-encrypted,
 *         <code>false</code> otherwise.
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
 * Returns a list of all the {@link BoundField} objects that correspond to
 * hidden fields. Useful for manual form layout.
 */
BaseForm.prototype.hiddenFields = function() {
  return this.boundFields(function(field) {
    return field.widget.isHidden
  })
}

/**
 * Returns a list of {@link BoundField} objects that do not correspond to
 * hidden fields. The opposite of the hiddenFields() method.
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
  , MAX_NUM_FORM_COUNT = 'MAX_NUM_FORMS'
  , ORDERING_FIELD_NAME = 'ORDER'
  , DELETION_FIELD_NAME = 'DELETE'

/**
 * ManagementForm is used to keep track of how many form instances are displayed
 * on the page. If adding new forms via javascript, you should increment the
 * count field of this form as well.
 * @constructor
 */
var ManagementForm = (function() {
  var fields = {}
  fields[TOTAL_FORM_COUNT] = IntegerField({widget: HiddenInput})
  fields[INITIAL_FORM_COUNT] = IntegerField({widget: HiddenInput})
  fields[MAX_NUM_FORM_COUNT] = IntegerField({required: false, widget: HiddenInput})
  return forms.Form.extend(fields)
})()

/**
 * A collection of instances of the same Form.
 * @constructor
 * @param {Object=} kwargs
 */
var BaseFormSet = Concur.extend({
  constructor: function(kwargs) {
    kwargs = object.extend({
      data: null, files: null, autoId: 'id_{name}', prefix: null,
      initial: null, errorConstructor: ErrorList, managementFormCssClass: null
    }, kwargs)
    this.isBound = kwargs.data !== null || kwargs.files !== null
    this.prefix = kwargs.prefix || BaseFormSet.getDefaultPrefix()
    this.autoId = kwargs.autoId
    this.data = kwargs.data || {}
    this.files = kwargs.files || {}
    this.initial = kwargs.initial
    this.errorConstructor = kwargs.errorConstructor
    this.managementFormCssClass = kwargs.managementFormCssClass
    this._errors = null
    this._nonFormErrors = null

    // Construct the forms in the formset
    this._constructForms()
  }
})
BaseFormSet.getDefaultPrefix = function() {
  return 'form'
}

/**
 * Returns the ManagementForm instance for this FormSet.
 */
BaseFormSet.prototype.managementForm = function() {
  var form
  if (this.isBound) {
    form = new ManagementForm({data: this.data, autoId: this.autoId,
                               prefix: this.prefix})
    if (!form.isValid()) {
      throw ValidationError('ManagementForm data is missing or has been tampered with')
    }
  }
  else {
    var initial = {}
    initial[TOTAL_FORM_COUNT] = this.totalFormCount()
    initial[INITIAL_FORM_COUNT] = this.initialFormCount()
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

BaseFormSet.prototype.initialForms = function() {
  return this.forms.slice(0, this.initialFormCount())
}

BaseFormSet.prototype.extraForms = function() {
  return this.forms.slice(this.initialFormCount())
}

BaseFormSet.prototype.emptyForm = function(kwargs) {
  var defaults = {
    autoId: this.autoId,
    prefix: this.addPrefix('__prefix__'),
    emptyPermitted: true
  }
  var formKwargs = object.extend(defaults, kwargs)
  var form = new this.form(formKwargs)
  this.addFields(form, null)
  return form
}

/**
 * Returns a list of form.cleanedData objects for every form in this.forms,
 * except for those in forms marked for deletion.
 */
BaseFormSet.prototype.cleanedData = function() {
  if (!this.isValid()) {
    throw new Error(this.constructor.name +
                    " object has no attribute 'cleanedData'")
  }
  var cleaned = []
  for (var i = 0, l = this.forms.length; i < l; i++) {
    var form = this.forms[i]
    if (this.canDelete) {
      // Don't add cleanedData from forms marked for deletion
      if (!this._shouldDeleteForm(form)) {
        // Remove the deletion field we added to the form from its cleanedData
        var cleanedData = form.cleanedData
        delete cleanedData[DELETION_FIELD_NAME]
        cleaned.push(cleanedData)
      }
    }
    else {
      cleaned.push(form.cleanedData)
    }
  }
  return cleaned
}

/**
 * Returns a list of forms that have been marked for deletion. Throws an
 * error if deletion is not allowed.
 */
BaseFormSet.prototype.deletedForms = function() {
  if (!this.isValid() || !this.canDelete) {
    throw new Error(this.constructor.name +
                    " object has no attribute 'deletedForms'")
  }

  var i, l

  // Construct _deletedFormIndexes, which is just a list of form indexes
  // that have had their deletion widget set to true.
  if (typeof this._deletedFormIndexes == 'undefined') {
    this._deletedFormIndexes = []
    var totalFormCount = this.totalFormCount()
    for (i = 0; i < totalFormCount; i++) {
      var form = this.forms[i]
      // If this is an extra form and hasn't changed, ignore it
      if (i >= this.initialFormCount() && !form.hasChanged()) {
        continue
      }
      if (this._shouldDeleteForm(form)) {
        this._deletedFormIndexes.push(i)
      }
    }
  }

  var deletedForms = []
  for (i = 0, l = this._deletedFormIndexes.length; i < l; i++) {
    deletedForms.push(this.forms[this._deletedFormIndexes[i]])
  }
  return deletedForms
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

  var i, l
  // Construct _ordering, which is a list of [form index, orderFieldValue]
  // pairs. After constructing this list, we'll sort it by orderFieldValue
  // so we have a way to get to the form indexes in the order specified by
  // the form data.
  if (typeof this._ordering == 'undefined') {
    this._ordering = []
    var totalFormCount = this.totalFormCount()
    for (i = 0; i < totalFormCount; i++) {
      var form = this.forms[i]
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

  var orderedForms = []
  for (i = 0, l = this._ordering.length; i < l; i++) {
    orderedForms.push(this.forms[this._ordering[i][0]])
  }
  return orderedForms
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

BaseFormSet.prototype.render = function() {
  return this.asTable()
}

/**
 * Determines the number of form instances this formset contains, based on
 * either submitted management data or initial configuration, as appropriate.
 */
BaseFormSet.prototype.totalFormCount = function() {
  if (this.isBound) {
    return this.managementForm().cleanedData[TOTAL_FORM_COUNT]
  }
  else {
    var initialForms = this.initialFormCount()
      , totalForms = this.initialFormCount() + this.extra
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
    if (this.maxNum !== null &&
        initialForms > this.maxNum &&
        this.maxNum >= 0) {
      initialForms = this.maxNum
    }
    return initialForms
  }
}

/**
 * Instantiates all the forms and put them in <code>this.forms</code>.
 */
BaseFormSet.prototype._constructForms = function() {
  this.forms = []
  var totalFormCount = this.totalFormCount()
  for (var i = 0; i < totalFormCount; i++) {
    this.forms.push(this._constructForm(i))
  }
}

/**
 * Instantiates and returns the <code>i</code>th form instance in the formset.
 */
BaseFormSet.prototype._constructForm = function(i, kwargs) {
  var defaults = {autoId: this.autoId, prefix: this.addPrefix(i)}

  if (this.isBound) {
    defaults['data'] = this.data
    defaults['files'] = this.files
  }

  if (this.initial !== null && this.initial.length > 0) {
    if (typeof this.initial[i] != 'undefined') {
      defaults['initial'] = this.initial[i]
    }
  }

  // Allow extra forms to be empty
  if (i >= this.initialFormCount()) {
    defaults['emptyPermitted'] = true
  }

  var formKwargs = object.extend(defaults, kwargs)
  var form = new this.form(formKwargs)
  this.addFields(form, i)
  return form
}

/**
 * Returns an ErrorList of errors that aren't associated with a particular
 * form -- i.e., from <code>formset.clean()</code>. Returns an empty ErrorList
 * if there are none.
 */
BaseFormSet.prototype.nonFormErrors = function() {
  if (this._nonFormErrors !== null) {
    return this._nonFormErrors
  }
  return new this.errorConstructor()
}

BaseFormSet.prototype._shouldDeleteForm = function(form) {
  if (!object.hasOwn(form.fields, DELETION_FIELD_NAME)) {
    return false
  }
  // The way we lookup the value of the deletion field here takes
  // more code than we'd like, but the form's cleanedData will not
  // exist if the form is invalid.
  var field = form.fields[DELETION_FIELD_NAME]
    , rawValue = form._rawValue(DELETION_FIELD_NAME)
    , shouldDelete = field.clean(rawValue)
  return shouldDelete
}

/**
 * Returns <code>true</code> if <code>form.errors</code> is empty for every form
 * in <code>this.forms</code>
 */
BaseFormSet.prototype.isValid = function() {
  if (!this.isBound) {
    return false
  }

  // We loop over every form.errors here rather than short circuiting on the
  // first failure to make sure validation gets triggered for every form.
  var formsValid = true
    , errors = this.errors() // Triggers fullClean()
    , totalFormCount = this.totalFormCount()
  for (var i = 0; i < totalFormCount; i++) {
    var form = this.forms[i]
    if (this.canDelete && this._shouldDeleteForm(form)) {
      // This form is going to be deleted so any of its errors should
      // not cause the entire formset to be invalid.
      continue
    }
    if (errors[i].isPopulated()) {
      formsValid = false
    }
  }

  return (formsValid && !this.nonFormErrors().isPopulated())
}

/**
 * Cleans all of <code>this.data</code> and populates <code>this._errors</code>.
 */
BaseFormSet.prototype.fullClean = function() {
  this._errors = []
  if (!this.isBound) {
    return; // Stop further processing
  }

  var totalFormCount = this.totalFormCount()
  for (var i = 0; i < totalFormCount; i++) {
    var form = this.forms[i]
    this._errors.push(form.errors())
  }

  // Give this.clean() a chance to do cross-form validation.
  try {
    this.clean()
  }
  catch (e) {
    if (!(e instanceof ValidationError)) {
      throw e
    }
    this._nonFormErrors = new this.errorConstructor(e.messages)
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
  for (var i = 0, l = this.forms.length; i < l; i++) {
    if (this.forms[i].hasChanged()) {
      return true
    }
  }
  return false
}

/**
 * A hook for adding extra fields on to each form instance.
 *
 * @param {Form} form the form fields are to be added to.
 * @param {Number} index the index of the given form in the formset.
 */
BaseFormSet.prototype.addFields = function(form, index) {
  if (this.canOrder) {
    // Only pre-fill the ordering field for initial forms
    if (index !== null && index < this.initialFormCount()) {
      form.fields[ORDERING_FIELD_NAME] =
          IntegerField({label: 'Order', initial: index + 1,
                        required: false})
    }
    else {
      form.fields[ORDERING_FIELD_NAME] =
          IntegerField({label: 'Order', required: false})
    }
  }

  if (this.canDelete && index < this.initialFormCount()) {
    form.fields[DELETION_FIELD_NAME] =
        BooleanField({label: 'Delete', required: false})
  }
}

/**
 * Returns the formset prefix with the form index appended.
 *
 * @param {Number} index the index of a form in the formset.
 */
BaseFormSet.prototype.addPrefix = function(index) {
  return this.prefix + '-' + index
}

/**
 * Returns <code>true</code> if the formset needs to be multipart-encrypted,
 * i.e. it has FileInput. Otherwise, <code>false</code>.
 */
BaseFormSet.prototype.isMultipart = function() {
  return (this.forms.length > 0 && this.forms[0].isMultipart())
}

/**
 * Returns this formset rendered as HTML &lt;tr&gt;s - excluding the
 * &lt;table&gt;&lt;/table&gt;.
 */
BaseFormSet.prototype.asTable = function() {
  // XXX: there is no semantic division between forms here, there probably
  // should be. It might make sense to render each form as a table row with
  // each field as a td.
  var rows = this.managementForm().asTable(true)
  for (var i = 0, l = this.forms.length; i < l; i++) {
    rows = rows.concat(this.forms[i].asTable(true))
  }
  return rows
}

BaseFormSet.prototype.asP = function() {
  var rows = this.managementForm().asP(true)
  for (var i = 0, l = this.forms.length; i < l; i++) {
    rows = rows.concat(this.forms[i].asP(true))
  }
  return rows
}

BaseFormSet.prototype.asUL = function() {
  var rows = this.managementForm().asUL(true)
  for (var i = 0, l = this.forms.length; i < l; i++) {
    rows = rows.concat(this.forms[i].asUL(true))
  }
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
    maxNum: null
  }, kwargs)

  var formset = kwargs.formset
    , extra = kwargs.extra
    , canOrder = kwargs.canOrder
    , canDelete = kwargs.canDelete
    , maxNum = kwargs.maxNum

  // Remove special properties from kwargs, as they will now be used to add
  // properties to the prototype.
  delete kwargs.formset
  delete kwargs.extra
  delete kwargs.canOrder
  delete kwargs.canDelete
  delete kwargs.maxNum

  kwargs.constructor = function(kwargs) {
    this.form = form
    this.extra = extra
    this.canOrder = canOrder
    this.canDelete = canDelete
    this.maxNum = maxNum
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
  TOTAL_FORM_COUNT: TOTAL_FORM_COUNT
, INITIAL_FORM_COUNT: INITIAL_FORM_COUNT
, MAX_NUM_FORM_COUNT: MAX_NUM_FORM_COUNT
, ORDERING_FIELD_NAME: ORDERING_FIELD_NAME
, DELETION_FIELD_NAME: DELETION_FIELD_NAME
, ManagementForm: ManagementForm
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
  constructor: function(modelQuery, kwargs) {
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

var DEFAULT_DATE_INPUT_FORMATS = [
      '%Y-%m-%d'              // '2006-10-25'
    , '%m/%d/%Y', '%m/%d/%y'  // '10/25/2006', '10/25/06'
    , '%b %d %Y', '%b %d, %Y' // 'Oct 25 2006', 'Oct 25, 2006'
    , '%d %b %Y', '%d %b, %Y' // '25 Oct 2006', '25 Oct, 2006'
    , '%B %d %Y', '%B %d, %Y' // 'October 25 2006', 'October 25, 2006'
    , '%d %B %Y', '%d %B, %Y' // '25 October 2006', '25 October, 2006'
    ]
  , DEFAULT_TIME_INPUT_FORMATS = [
      '%H:%M:%S' // '14:30:59'
    , '%H:%M'    // '14:30'
    ]
  , DEFAULT_DATETIME_INPUT_FORMATS = [
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
 * returns one be used when ultimately expecting an Array.
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
    , splitRE = /[ _]+/
    , allCapsRE = /^[A-Z][A-Z0-9]+$/

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
 * Creates an object representing the data held in a form.
 *
 * @param form a form object or a <code>String</code> specifying a form's
 *        <code>name</code> or <code>id</code> attribute. If a
 *        <code>String</code> is given, name is tried before id when attempting
 *        to find the form.
 *
 * @return an object representing the data present in the form. If the form
 *         could not be found, this object will be empty.
 */
function formData(form) {
  var data = {}
  if (is.String(form)) {
    form = document.forms[form] || document.getElementById(form)
  }
  if (!form) {
    return data
  }

  for (var i = 0, l = form.elements.length; i < l; i++) {
    var element = form.elements[i]
      , type = element.type
      , value = null

    // Retrieve the element's value (or values)
    if (type == 'hidden' || type == 'password' || type == 'text' ||
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
          value[value.length] = element.options[j].value
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
function strip(s) {
  return (''+s).replace(/(^\s+|\s+$)/g, '')
}

/**
 * A collection of errors that knows how to display itself in various formats.
 *
 * This object's properties are the field names, and corresponding values are
 * the errors.
 *
 * @constructor
 */
var ErrorObject = Concur.extend({
  constructor: function(errors) {
    if (!(this instanceof ErrorObject)) { return new ErrorObject(errors) }
    this.errors = errors || {}
  }
})

ErrorObject.prototype.set = function(name, error) {
  this.errors[name] = error
}

ErrorObject.prototype.get = function(name) {
  return this.errors[name]
}

ErrorObject.prototype.render = function() {
  return this.asUL()
}

/**
 * Determines if any errors are present.
 *
 * @return {Boolean} <code>true</code> if this object has had any properties
 *                   set, <code>false</code> otherwise.
 */
ErrorObject.prototype.isPopulated = function() {
  for (var name in this.errors) {
    if (object.hasOwn(this.errors, name)) {
      return true
    }
  }
  return false
}

/**
 * Displays error details as a list.
 */
ErrorObject.prototype.asUL = function() {
  var items = []
  for (var name in this.errors) {
    if (object.hasOwn(this.errors, name)) {
      items.push(React.DOM.li(null, name, this.errors[name].render()))
    }
  }
  if (!items.length) {
    return ''
  }
  return React.DOM.ul({className: 'errorlist'}, items)
}

/**
 * Displays error details as text.
 */
ErrorObject.prototype.asText = function() {
  var items = []
  for (var name in this.errors) {
    if (object.hasOwn(this.errors, name)) {
      items.push('* ' + name)
      var errorList = this.errors[name]
      for (var i = 0, l = errorList.errors.length; i < l; i++) {
        items.push('  * ' + errorList.errors[i])
      }
    }
  }
  return items.join('\n')
}

/**
 * A list of errors which knows how to display itself in various formats.
 *
 * @param {Array} [errors] a list of errors.
 * @constructor
 */
var ErrorList = Concur.extend({
  constructor: function(errors) {
    if (!(this instanceof ErrorList)) { return new ErrorList(errors) }
    this.errors = errors || []
  }
})

ErrorList.prototype.render = function() {
  return this.asUL()
}

/**
 * Adds errors from another ErrorList.
 *
 * @param {ErrorList} errorList an ErrorList whose errors should be added.
 */
ErrorList.prototype.extend = function(errorList) {
  this.errors = this.errors.concat(errorList.errors)
}

/**
 * Displays errors as a list.
 */
ErrorList.prototype.asUL = function() {
  return React.DOM.ul({className: 'errorlist'}
  , this.errors.map(function(error) {
      return React.DOM.li(null, error)
    })
  )
}

/**
 * Displays errors as text.
 */
ErrorList.prototype.asText = function() {
  var items = []
  for (var i = 0, l = this.errors.length; i < l; i++) {
    items.push('* ' + this.errors[i])
  }
  return items.join('\n')
}

/**
 * Determines if any errors are present.
 *
 * @return {Boolean} <code>true</code> if this object contains any errors
 *                   <code>false</code> otherwise.
 */
ErrorList.prototype.isPopulated = function() {
  return this.errors.length > 0
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

},{"Concur":8,"isomorph/is":12,"isomorph/object":13}],7:[function(require,module,exports){
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
  constructor: function(parentWidget, name, value, kwargs) {
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
  constructor: function(kwargs) {
    kwargs = object.extend({attrs: null}, kwargs)
    this.attrs = object.extend({}, kwargs.attrs)
  }
  /** Determines whether this corresponds to an <input type="hidden">. */
, isHidden: false
  /** Determines whether this widget needs a multipart-encoded form. */
, needsMultipartForm: false
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
 * The 'value' given is not guaranteed to be valid input, so subclass
 * implementations should program defensively.
 */
Widget.prototype.render = function(name, value, kwargs) {
  throw new Error('Constructors extending must implement a render() method.')
}

/**
 * Helper function for building an attribute dictionary.
 */
Widget.prototype.buildAttrs = function(extraAttrs, kwargs) {
  var attrs = object.extend({}, this.attrs, kwargs, extraAttrs)
  return attrs
}

/**
 * Retrieves a value for this widget from the given data.
 *
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {String} name the field name to be used to retrieve data.
 *
 * @return a value for this widget, or <code>null</code> if no value was
 *         provided.
 */
Widget.prototype.valueFromData = function(data, files, name) {
  return object.get(data, name, null)
}

/**
 * Determines if data has changed from initial.
 */
Widget.prototype._hasChanged = function(initial, data) {
  // For purposes of seeing whether something has changed, null is the same
  // as an empty string, if the data or inital value we get is null, replace
  // it with ''.
  var dataValue = (data === null ? '' : data)
  var initialValue = (initial === null ? '' : initial)
  return (''+initialValue != ''+dataValue)
}

/**
 * Determines the HTML <code>id</code> attribute of this Widget for use by a
 * <code>&lt;label&gt;</code>, given the id of the field.
 *
 * This hook is necessary because some widgets have multiple HTML elements and,
 * thus, multiple ids. In that case, this method should return an ID value that
 * corresponds to the first id in the widget's tags.
 *
 * @param {String} id a field id.
 *
 * @return the id which should be used by a <code>&lt;label&gt;</code> for this
 *         Widget.
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
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) { return new Input(kwargs) }
    Widget.call(this, kwargs)
  }
  /** The type attribute of this input. */
, inputType: null
})

Input.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  if (value === null) {
    value = ''
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: this.inputType,
                                                  name: name})
  if (value !== '') {
    // Only add the value attribute if value is non-empty
    finalAttrs.defaultValue = value
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
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) { return new TextInput(kwargs) }
    Input.call(this, kwargs)
  }
, inputType: 'text'
})

/**
 * An HTML <input type="password"> widget.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var PasswordInput = Input.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) { return new PasswordInput(kwargs) }
    kwargs = object.extend({renderValue: false}, kwargs)
    Input.call(this, kwargs)
    this.renderValue = kwargs.renderValue
  }
, inputType: 'password'
})

PasswordInput.prototype.render = function(name, value, kwargs) {
  if (!this.renderValue) {
    value = ''
  }
  return Input.prototype.render.call(this, name, value, kwargs)
}

/**
 * An HTML <input type="hidden"> widget.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var HiddenInput = Input.extend({
  constructor: function(kwargs) {
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
  constructor: function(kwargs) {
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
  constructor: function(kwargs) {
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
 * File widgets take data from <code>files</code>, not <code>data</code>.
 */
FileInput.prototype.valueFromData = function(data, files, name) {
  return object.get(files, name, null)
}

FileInput.prototype._hasChanged = function(initial, data) {
  if (data === null) {
    return false
  }
  return true
}

var FILE_INPUT_CONTRADICTION = {}

/**
 * @constructor
 * @extends {FileInput}
 * @param {Object=} kwargs
 */
var ClearableFileInput = FileInput.extend({
  constructor: function(kwargs) {
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
 * A <input type="text"> which, if given a Date object to display, formats it as
 * an appropriate date String.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var DateInput = Input.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) { return new DateInput(kwargs) }
    kwargs = object.extend({format: null}, kwargs)
    Input.call(this, kwargs)
    if (kwargs.format !== null) {
      this.format = kwargs.format
    }
    else {
      this.format = util.DEFAULT_DATE_INPUT_FORMATS[0]
    }
  }
, inputType: 'text'
})

DateInput.prototype._formatValue = function(value) {
  if (is.Date(value)) {
    return time.strftime(value, this.format)
  }
  return value
}

DateInput.prototype.render = function(name, value, kwargs) {
  value = this._formatValue(value)
  return Input.prototype.render.call(this, name, value, kwargs)
}

DateInput.prototype._hasChanged = function(initial, data) {
  return Input.prototype._hasChanged.call(this, this._formatValue(initial), data)
}

/**
 * A <input type="text"> which, if given a Date object to display, formats it as
 * an appropriate datetime String.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var DateTimeInput = Input.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) { return new DateTimeInput(kwargs) }
    kwargs = object.extend({format: null}, kwargs)
    Input.call(this, kwargs)
    if (kwargs.format !== null) {
      this.format = kwargs.format
    }
    else {
      this.format = util.DEFAULT_DATETIME_INPUT_FORMATS[0]
    }
  }
, inputType: 'text'
})

DateTimeInput.prototype._formatValue = function(value) {
  if (is.Date(value)) {
    return time.strftime(value, this.format)
  }
  return value
}

DateTimeInput.prototype.render = function(name, value, kwargs) {
  value = this._formatValue(value)
  return Input.prototype.render.call(this, name, value, kwargs)
}

DateTimeInput.prototype._hasChanged = function(initial, data) {
  return Input.prototype._hasChanged.call(this, this._formatValue(initial), data)
}

/**
 * A <input type="text"> which, if given a Date object to display, formats it as
 * an appropriate time String.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var TimeInput = Input.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) { return new TimeInput(kwargs) }
    kwargs = object.extend({format: null}, kwargs)
    Input.call(this, kwargs)
    if (kwargs.format !== null) {
      this.format = kwargs.format
    }
    else {
      this.format = util.DEFAULT_TIME_INPUT_FORMATS[0]
    }
  }
, inputType: 'text'
})

TimeInput.prototype._formatValue = function(value) {
  if (is.Date(value)) {
    return time.strftime(value, this.format)
  }
  return value
}

TimeInput.prototype.render = function(name, value, kwargs) {
  value = this._formatValue(value)
  return Input.prototype.render.call(this, name, value, kwargs)
}

TimeInput.prototype._hasChanged = function(initial, data) {
  return Input.prototype._hasChanged.call(this, this._formatValue(initial), data)
}

/**
 * An HTML <textarea> widget.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Widget}.
 * @config {Object} [attrs] HTML attributes for the rendered widget. Default
 *                          rows and cols attributes will be used if not
 *                          provided.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var Textarea = Widget.extend({
  constructor: function(kwargs) {
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
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) { return new CheckboxInput(kwargs) }
    kwargs = object.extend({checkTest: defaultCheckTest}, kwargs)
    Widget.call(this, kwargs)
    this.checkTest = kwargs.checkTest
  }
})

CheckboxInput.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null}, kwargs)
  var checked
  try {
    checked = this.checkTest(value)
  }
  catch (e) {
    // Silently catch exceptions
    checked = false
  }

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
  return value
}

CheckboxInput.prototype._hasChanged = function(initial, data) {
  // Sometimes data or initial could be null or '' which should be the same
  // thing as false.
  return (Boolean(initial) != Boolean(data))
}

/**
 * An HTML <select> widget.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var Select = Widget.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) { return new Select(kwargs) }
    kwargs = object.extend({choices: []}, kwargs)
    Widget.call(this, kwargs)
    this.choices = kwargs.choices || []
  }
, allowMultipleSelected: false
})

/**
 * Renders the widget.
 *
 * @param {String} name the field name.
 * @param selectedValue the value of an option which should be marked as
 *                      selected, or <code>null</code> if no value is selected -
 *                      will be normalised to a <code>String</code> for
 *                      comparison with choice values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 * @param {Array} [choices] choices to be used when rendering the widget, in
 *                          addition to those already held by the widget itself.
 *
 * @return a <code>&lt;select&gt;</code> element.
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

Select.prototype.renderOption = function(optValue, optLabel) {
  optValue = ''+optValue
  var attrs = {value: optValue}
  return React.DOM.option(attrs, optLabel)
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
  constructor: function(kwargs) {
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

NullBooleanSelect.prototype._hasChanged = function(initial, data) {
  // For a NullBooleanSelect, null (unknown) and false (No)
  //are not the same
  if (initial !== null) {
      initial = Boolean(initial)
  }
  if (data !== null) {
      data = Boolean(data)
  }
  return initial != data
}

/**
 * An HTML <select> widget which allows multiple selections.
 * @constructor
 * @extends {Select}
 * @param {Object=} kwargs
 */
var SelectMultiple = Select.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) { return new SelectMultiple(kwargs) }
    Select.call(this, kwargs)
  }
, allowMultipleSelected: true
})

/**
 * Renders the widget.
 *
 * @param {String} name the field name.
 * @param {Array} selectedValues the values of options which should be marked as
 *                               selected, or <code>null</code> if no values
 *                               are selected - these will be normalised to
 *                               <code>String</code>s for comparison with choice
 *                               values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 * @param {Array} [choices] choices to be used when rendering the widget, in
 *                          addition to those already held by the widget itself.
 *
 * @return a <code>&lt;select&gt;</code> element which allows multiple
 *         selections.
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
 *
 * @param {Object} data form data.
 * @param {Object} files file data.
 * @param {String} name the field name to be used to retrieve data.
 *
 * @return {Array} values for this widget, or <code>null</code> if no values
 *                 were provided.
 */
SelectMultiple.prototype.valueFromData = function(data, files, name) {
  if (typeof data[name] != 'undefined') {
    return [].concat(data[name])
  }
  return null
}

SelectMultiple.prototype._hasChanged = function(initial, data) {
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
 * An object used by RadioFieldRenderer that represents a single
 * <input type="radio">.
 * @constructor
 * @param {string} name
 * @param {string} value
 * @param {Object} attrs
 * @param {Array} choice
 * @param {number} index
 */
var RadioInput = SubWidget.extend({
  constructor: function(name, value, attrs, choice, index) {
    if (!(this instanceof RadioInput)) { return new RadioInput(name, value, attrs, choice, index) }
    this.name = name
    this.value = value
    this.attrs = attrs
    this.choiceValue = ''+choice[0]
    this.choiceLabel = choice[1]
    this.index = index
  }
})

/**
 * Renders a <label> enclosing the radio widget and its label text.
 */
RadioInput.prototype.render = function(name, value, kwargs) {
  name = name || this.name
  value = value || this.value
  var attrs = object.extend({attrs: this.attrs}, kwargs).attrs
  var labelAttrs = {}
  if (typeof attrs.id != 'undefined') {
    labelAttrs.htmlFor = attrs.id + '_' + this.index
  }
  return React.DOM.label(labelAttrs, this.tag(), ' ', this.choiceLabel)
}

RadioInput.prototype.isChecked = function() {
  return this.value === this.choiceValue
}

/**
 * Renders the <input type="radio"> portion of the widget.
 */
RadioInput.prototype.tag = function() {
  var finalAttrs = object.extend({}, this.attrs, {
    type: 'radio', name: this.name, value: this.choiceValue
  })
  if (typeof finalAttrs.id != 'undefined') {
    finalAttrs.id = finalAttrs.id + '_' + this.index
  }
  if (this.isChecked()) {
    finalAttrs.defaultChecked = 'checked'
  }
  return React.DOM.input(finalAttrs)
}

/**
 * An object used by {@link RadioSelect} to enable customisation of radio
 * widgets.
 * @constructor
 * @param {string} name
 * @param {string} value
 * @param {Object} attrs
 * @param {Array} choices
 */
var RadioFieldRenderer = Concur.extend({
  constructor: function(name, value, attrs, choices) {
    if (!(this instanceof RadioFieldRenderer)) { return RadioFieldRenderer(name, value, attrs, choices) }
    this.name = name
    this.value = value
    this.attrs = attrs
    this.choices = choices
  }
})

RadioFieldRenderer.prototype.__iter__ = function() {
  return this.radioInputs()
}

RadioFieldRenderer.prototype.radioInputs = function() {
  var inputs = []
  for (var i = 0, l = this.choices.length; i < l; i++) {
    inputs.push(RadioInput(this.name, this.value,
                           object.extend({}, this.attrs),
                           this.choices[i], i))
  }
  return inputs
}

RadioFieldRenderer.prototype.radioInput = function(i) {
  if (i >= this.choices.length) {
    throw new Error('Index out of bounds')
  }
  return RadioInput(this.name, this.value, object.extend({}, this.attrs),
                    this.choices[i], i)
}

/**
 * Outputs a &lt;ul&gt; for this set of radio fields.
 */
RadioFieldRenderer.prototype.render = function() {
  var inputs = this.radioInputs()
  var items = []
  for (var i = 0, l = inputs.length; i < l; i++) {
      items.push(React.DOM.li(null, inputs[i].render()))
  }
  return React.DOM.ul(null, items)
}

/**
 * Renders a single select as a list of <input type="radio"> elements.
 * @constructor
 * @extends {Select}
 * @param {Object=} kwargs
 */
var RadioSelect = Select.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) { return new RadioSelect(kwargs) }
    kwargs = object.extend({renderer: null}, kwargs)
    // Override the default renderer if we were passed one
    if (kwargs.renderer !== null) {
      this.renderer = kwargs.renderer
    }
    Select.call(this, kwargs)
  }
, renderer: RadioFieldRenderer
})

RadioSelect.prototype.subWidgets = function(name, value, kwargs) {
  return util.iterate(this.getRenderer(name, value, kwargs))
}

/**
 * @return an instance of the renderer to be used to render this widget.
 */
RadioSelect.prototype.getRenderer = function(name, value, kwargs) {
  kwargs = object.extend({attrs: null, choices: []}, kwargs)
  value = (value === null ? '' : ''+value)
  var finalAttrs = this.buildAttrs(kwargs.attrs)
    , choices = util.iterate(this.choices).concat(kwargs.choices || [])
  return new this.renderer(name, value, finalAttrs, choices)
}

RadioSelect.prototype.render = function(name, value, kwargs) {
  return this.getRenderer(name, value, kwargs).render()
}

/**
 * RadioSelect is represented by multiple <input type="radio"> fields,
 * each of which has a distinct ID. The IDs are made distinct by a '_X'
 * suffix, where X is the zero-based index of the radio field. Thus, the
 * label for a RadioSelect should reference the first one ('_0').
 */
RadioSelect.prototype.idForLabel = function(id) {
  if (id) {
      id += '_0'
  }
  return id
}

/**
 * Multiple selections represented as a list of <input type="checkbox"> widgets.
 * @constructor
 * @extends {SelectMultiple}
 * @param {Object=} kwargs
 */
var CheckboxSelectMultiple = SelectMultiple.extend({
  constructor: function(kwargs) {
    if (!(this instanceof Widget)) { return new CheckboxSelectMultiple(kwargs) }
    SelectMultiple.call(this, kwargs)
  }
})

CheckboxSelectMultiple.prototype.render = function(name, selectedValues, kwargs) {
  kwargs = object.extend({attrs: null, choices: []}, kwargs)
  if (selectedValues === null) {
    selectedValues = []
  }
  var hasId = (kwargs.attrs !== null && typeof kwargs.attrs.id != 'undefined')
    , finalAttrs = this.buildAttrs(kwargs.attrs)
    , selectedValuesLookup = object.lookup(selectedValues)
    , checkTest = function(value) {
        return (typeof selectedValuesLookup[''+value] != 'undefined')
      }
    , items = []
    , finalChoices = util.iterate(this.choices).concat(kwargs.choices)
  for (var i = 0, l = finalChoices.length; i < l; i++) {
    var optValue = '' + finalChoices[i][0]
      , optLabel = finalChoices[i][1]
      , checkboxAttrs = object.extend({}, finalAttrs)
      , labelAttrs = {}
    // If an ID attribute was given, add a numeric index as a suffix, so
    // that the checkboxes don't all have the same ID attribute.
    if (hasId) {
      object.extend(checkboxAttrs, {id: kwargs.attrs.id + '_' + i})
      labelAttrs.htmlFor = checkboxAttrs.id
    }

    var cb = CheckboxInput({attrs: checkboxAttrs, checkTest: checkTest})
    items.push(
      React.DOM.li(null
      , React.DOM.label(labelAttrs, cb.render(name, optValue), ' ', optLabel)
      )
    )
  }
  return React.DOM.ul(null, items)
}

CheckboxSelectMultiple.prototype.idForLabel = function(id) {
  if (id) {
    id += '_0'
  }
  return id
}

/**
 * A widget that is composed of multiple widgets.
 * @constructor
 * @extends {Widget}
 * @param {Object=} kwargs
 */
var MultiWidget = Widget.extend({
  constructor: function(widgets, kwargs) {
    if (!(this instanceof Widget)) { return new MultiWidget(widgets, kwargs) }
    this.widgets = []
    for (var i = 0, l = widgets.length; i < l; i++) {
      this.widgets.push(widgets[i] instanceof Widget
                        ? widgets[i]
                        : new widgets[i]())
    }
    Widget.call(this, kwargs)
  }
})

/**
 * This method is different than other widgets', because it has to figure out
 * how to split a single value for display in multiple widgets.
 *
 * If the given value is NOT a list, it will first be "decompressed" into a list
 * before it is rendered by calling the {@link MultiWidget#decompress} method.
 *
 * Each value in the list is rendered  with the corresponding widget -- the
 * first value is rendered in the first widget, the second value is rendered in
 * the second widget, and so on.
 *
 * @param {String} name the field name.
 * @param value a list of values, or a normal value (e.g., a <code>String</code>
 *              that has been "compressed" from a list of values.
 * @param {Object} [attrs] additional HTML attributes for the rendered widget.
 *
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

MultiWidget.prototype._hasChanged = function(initial, data) {
  var i, l

  if (initial === null) {
    initial = []
    for (i = 0, l = data.length; i < l; i++) {
      initial.push('')
    }
  }
  else if (!(is.Array(initial))) {
    initial = this.decompress(initial)
  }

  for (i = 0, l = this.widgets.length; i < l; i++) {
    if (this.widgets[i]._hasChanged(initial[i], data[i])) {
      return true
    }
  }
  return false
}

/**
 * Creates an element containing a given list of rendered widgets.
 *
 * This hook allows you to format the HTML design of the widgets, if needed.
 *
 * @param {Array} renderedWidgets a list of rendered widgets.
 * @return a fragment containing the rendered widgets.
 */
MultiWidget.prototype.formatOutput = function(renderedWidgets) {
  return React.DOM.div(null, renderedWidgets)
}

/**
 * Creates a list of decompressed values for the given compressed value.
 *
 * @param value a compressed value, which can be assumed to be valid, but not
 *              necessarily non-empty.
 *
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
  constructor: function(kwargs) {
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
  constructor: function(kwargs) {
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
, RadioInput: RadioInput
, RadioFieldRenderer: RadioFieldRenderer
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
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/*! http://mths.be/punycode v1.2.3 by @mathias */
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
		    length,
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
		'version': '1.2.3',
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
		define(function() {
			return punycode;
		});
	}	else if (freeExports && !freeExports.nodeType) {
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
      // We have a normal object. If possible, we'll clone the original's
      // prototype (not the original) to get an empty object with the same
      // prototype chain as the original. If just copy the instance properties.
      // Otherwise, we have to copy the whole thing, property-by-property.
      if (target instanceof target.constructor && target.constructor !== Object) {
        var c = clone(target.constructor.prototype)

        // Give the copy all the instance properties of target. It has the same
        // prototype as target, so inherited properties are already there.
        for (var property in target) {
          if (target.hasOwnProperty(property)) {
            c[property] = target[property]
          }
        }
      }
      else {
        var c = {}
        for (var property in target) {
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
    if (source === null) return null

    // All non-objects use value semantics and don't need explict copying
    if (typeof source != 'object') return source

    var cachedResult = this.getCachedResult(source)

    // We've already seen this object during this deep copy operation so can
    // immediately return the result. This preserves the cyclic reference
    // structure and protects us from infinite recursion.
    if (cachedResult) return cachedResult

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
var is = require('./is')
  , slice = Array.prototype.slice
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

},{"./is":12}],12:[function(require,module,exports){
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
  for (var prop in o) {
    return false
  }
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
/**
 * Callbound version of Object.prototype.hasOwnProperty(), ready to be called
 * with an object and property name.
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
  var items = []
  for (var prop in obj) {
    if (hasOwn(obj, prop)) {
      items.push([prop, obj[prop]])
    }
  }
  return items
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

module.exports = {
  hasOwn: hasOwn
, extend: extend
, inherits: inherits
, items: items
, fromItems: fromItems
, lookup: lookup
, get: get
}

},{}],14:[function(require,module,exports){
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
  if (data.hasOwnProperty('H')) {
    var hour = parseInt(data.H, 10)
    if (hour > 23) {
      throw new Error('Hour is out of range: ' + hour)
    }
    time[3] = hour
  }
  else if (data.hasOwnProperty('I')) {
    var hour = parseInt(data.I, 10)
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
  var day = time[2], month = time[1], year = time[0]
  if (((month == 4 || month == 6 || month == 9 || month == 11) &&
      day > 30) ||
      (month == 2 && day > ((year % 4 == 0 && year % 100 != 0 ||
                             year % 400 == 0) ? 29 : 28))) {
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
// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
function parseUri (str) {
  var o = parseUri.options
    , m = o.parser[o.strictMode ? "strict" : "loose"].exec(str)
    , uri = {}
    , i = 14

  while (i--) uri[o.key[i]] = m[i] || ""

  uri[o.q.name] = {};
  uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
    if ($1) uri[o.q.name][$1] = $2
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
var Concur = require('Concur')
  , is = require('isomorph/is')
  , object = require('isomorph/object')

/**
 * A validation error, containing a list of messages. Single messages
 * (e.g. those produced by validators may have an associated error code
 * and parameters to allow customisation by fields.
 */
var ValidationError = Concur.extend({
  constructor: function(message, kwargs) {
    if (!(this instanceof ValidationError)) return new ValidationError(message, kwargs)
    kwargs = object.extend({code: null, params: null}, kwargs)
    if (is.Array(message)) {
      this.messages = message
    }
    else {
      this.code = kwargs.code
      this.params = kwargs.params
      this.messages = [message]
    }
  }
})

ValidationError.prototype.toString = function() {
  return ('ValidationError: ' + this.messages.join('; '))
}

module.exports = {
  ValidationError: ValidationError
}

},{"Concur":8,"isomorph/is":12,"isomorph/object":13}],17:[function(require,module,exports){
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
    if (hextets[i] == '') {
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
    if (bestDoublecolonStart == 0) {
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
  if (ipStr.toLowerCase().indexOf('0000:0000:0000:0000:0000:ffff:') != 0) {
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
  if (ipStr.toLowerCase().indexOf('0000:0000:0000:0000:0000:ffff:') != 0) {
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
  for (var i = 0, l = newIp.length; i < l; i++) {
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
var Concur = require('Concur')
  , is = require('isomorph/is')
  , format = require('isomorph/format').formatObj
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

// See also http://tools.ietf.org/html/rfc2822#section-3.2.5
var EMAIL_RE = new RegExp(
      "(^[-!#$%&'*+/=?^_`{}|~0-9A-Z]+(\\.[-!#$%&'*+/=?^_`{}|~0-9A-Z]+)*"                                // Dot-atom
    + '|^"([\\001-\\010\\013\\014\\016-\\037!#-\\[\\]-\\177]|\\\\[\\001-\\011\\013\\014\\016-\\177])*"' // Quoted-string
    + ')@((?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\\.)+[A-Z]{2,6}\\.?$)'                                 // Domain
    + '|\\[(25[0-5]|2[0-4]\\d|[0-1]?\\d?\\d)(\\.(25[0-5]|2[0-4]\\d|[0-1]?\\d?\\d)){3}\\]$'              // Literal form, ipv4 address (SMTP 4.1.3)
    , 'i'
    )
  , SLUG_RE = /^[-\w]+$/
  , IPV4_RE = /^(25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3}$/
  , COMMA_SEPARATED_INT_LIST_RE = /^[\d,]+$/

/**
 * Validates that input matches a regular expression.
 */
var RegexValidator = Concur.extend({
  constructor: function(regex, message, code) {
    if (!(this instanceof RegexValidator)) return new RegexValidator(regex, message, code)
    if (regex) {
      this.regex = regex
    }
    if (message) {
      this.message = message
    }
    if (code) {
      this.code = code
    }
    if (is.String(this.regex)) {
      this.regex = new RegExp(this.regex)
    }
  }
, regex: ''
, message: 'Enter a valid value.'
, code: 'invalid'
, __call__: function(value) {
    if (!this.regex.test(value)) {
      throw ValidationError(this.message, {code: this.code})
    }
  }
})

/**
 * Validates that input looks like a valid URL.
 */
var URLValidator = RegexValidator.extend({
  constructor:function() {
    if (!(this instanceof URLValidator)) return new URLValidator()
    RegexValidator.call(this)
  }
, regex: new RegExp(
    '^(?:http|ftp)s?://'                              // http:// or https://
  + '(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\\.)+' // Domain...
  + '(?:[A-Z]{2,6}\\.?|[A-Z0-9-]{2,}\\.?)|'
  + 'localhost|'                                      // localhost...
  + '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})'      // ...or IP
  + '(?::\\d+)?'                                      // Optional port
  + '(?:/?|[/?]\\S+)$'
  , 'i'
  )
, message: 'Enter a valid URL.'
, __call__: function(value) {
    try {
      RegexValidator.prototype.__call__.call(this, value)
    }
    catch (e) {
      if (!(e instanceof ValidationError) || !value) {
        throw e
      }

      // Trivial case failed - try for possible IDN domain
      var urlFields = url.parseUri(value)
      try {
        urlFields.host = punycode.toASCII(urlFields.host)
      }
      catch (ue) {
        throw e
      }
      value = url.makeUri(urlFields)
      RegexValidator.prototype.__call__.call(this, value)
    }
  }
})

var EmailValidator = RegexValidator.extend({
  constructor: function(regex, message, code) {
    if (!(this instanceof EmailValidator)) return new EmailValidator(regex, message, code)
    RegexValidator.call(this, regex, message, code)
  }
, __call__ : function(value) {
    try {
      RegexValidator.prototype.__call__.call(this, value)
    }
    catch (e) {
      if (!(e instanceof ValidationError) ||
          !value ||
          value.indexOf('@') == -1) {
        throw e
      }

      // Trivial case failed - try for possible IDN domain-part
      var parts = value.split('@')
      try {
        parts[parts.length - 1] = punycode.toASCII(parts[parts.length - 1])
      }
      catch (ue) {
        throw e
      }
      RegexValidator.prototype.__call__.call(this, parts.join('@'))
    }
  }
})

/** Validates that input looks like a valid URL. */
var validateURL = URLValidator()

/** Validates that input looks like a valid e-mail address. */
var validateEmail =
    EmailValidator(EMAIL_RE,
      'Enter a valid e-mail address.',
      'invalid')

/** Validates that input is a valid slug. */
var validateSlug =
    RegexValidator(SLUG_RE,
      'Enter a valid "slug" consisting of letters, numbers, underscores or hyphens.',
      'invalid')

/** Validates that input is a valid IPv4 address. */
var validateIPv4Address =
    RegexValidator(IPV4_RE,
      'Enter a valid IPv4 address.',
      'invalid')

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

var ipAddressValidatorMap = {
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
  if (typeof ipAddressValidatorMap[protocol] == 'undefined') {
    throw new Error('The protocol "' + protocol +'" is unknown')
  }
  return ipAddressValidatorMap[protocol]
}

/** Validates that input is a comma-separated list of integers. */
var validateCommaSeparatedIntegerList =
    RegexValidator(COMMA_SEPARATED_INT_LIST_RE,
      'Enter only digits separated by commas.',
      'invalid')

/**
 * Base for validators which compare input against a given value.
 */
var BaseValidator = Concur.extend({
  constructor: function(limitValue) {
    if (!(this instanceof BaseValidator)) return new BaseValidator(limitValue)
    this.limitValue = limitValue
  }
, compare: function(a, b) { return a !== b }
, clean: function(x) { return x }
, message: 'Ensure this value is {limitValue} (it is {showValue}).'
, code: 'limitValue'
, __call__: function(value) {
    var cleaned = this.clean(value)
      , params = {limitValue: this.limitValue, showValue: cleaned}
    if (this.compare(cleaned, this.limitValue)) {
      throw ValidationError(format(this.message, params),
                            {code: this.code, params: params})
    }
  }
})

/**
 * Validates that input is less than or equal to a given value.
 */
var MaxValueValidator = BaseValidator.extend({
  constructor: function(limitValue) {
    if (!(this instanceof MaxValueValidator)) return new MaxValueValidator(limitValue)
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
    if (!(this instanceof MinValueValidator)) return new MinValueValidator(limitValue)
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
    if (!(this instanceof MinLengthValidator)) return new MinLengthValidator(limitValue)
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
    if (!(this instanceof MaxLengthValidator)) return new MaxLengthValidator(limitValue)
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
, validateURL: validateURL
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

},{"./errors":16,"./ipv6":17,"Concur":8,"isomorph/format":11,"isomorph/is":12,"isomorph/url":15,"punycode":9}]},{},[5])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOlxccmVwb3NcXG5ld2Zvcm1zXFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL2xpYi9maWVsZHMuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9saWIvZm9ybXMuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9saWIvZm9ybXNldHMuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9saWIvbW9kZWxzLmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbGliL25ld2Zvcm1zLmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbGliL3V0aWwuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9saWIvd2lkZ2V0cy5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9Db25jdXIvbGliL2NvbmN1ci5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wdW55Y29kZS9wdW55Y29kZS5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9pc29tb3JwaC9jb3B5LmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbm9kZV9tb2R1bGVzL2lzb21vcnBoL2Zvcm1hdC5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9pc29tb3JwaC9pcy5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9pc29tb3JwaC9vYmplY3QuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9ub2RlX21vZHVsZXMvaXNvbW9ycGgvdGltZS5qcyIsIkM6L3JlcG9zL25ld2Zvcm1zL25vZGVfbW9kdWxlcy9pc29tb3JwaC91cmwuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9ub2RlX21vZHVsZXMvdmFsaWRhdG9ycy9saWIvZXJyb3JzLmpzIiwiQzovcmVwb3MvbmV3Zm9ybXMvbm9kZV9tb2R1bGVzL3ZhbGlkYXRvcnMvbGliL2lwdjYuanMiLCJDOi9yZXBvcy9uZXdmb3Jtcy9ub2RlX21vZHVsZXMvdmFsaWRhdG9ycy9saWIvdmFsaWRhdG9ycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3I0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDLzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29uY3VyID0gcmVxdWlyZSgnQ29uY3VyJylcbiAgLCBpcyA9IHJlcXVpcmUoJ2lzb21vcnBoL2lzJylcbiAgLCBmb3JtYXQgPSByZXF1aXJlKCdpc29tb3JwaC9mb3JtYXQnKS5mb3JtYXRPYmpcbiAgLCBvYmplY3QgPSByZXF1aXJlKCdpc29tb3JwaC9vYmplY3QnKVxuICAsIHRpbWUgPSByZXF1aXJlKCdpc29tb3JwaC90aW1lJylcbiAgLCB1cmwgPSByZXF1aXJlKCdpc29tb3JwaC91cmwnKVxuICAsIHZhbGlkYXRvcnMgPSByZXF1aXJlKCd2YWxpZGF0b3JzJylcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuICAsIHdpZGdldHMgPSByZXF1aXJlKCcuL3dpZGdldHMnKVxuXG52YXIgVmFsaWRhdGlvbkVycm9yID0gdmFsaWRhdG9ycy5WYWxpZGF0aW9uRXJyb3JcbiAgLCBpc0VtcHR5VmFsdWUgPSB2YWxpZGF0b3JzLmlzRW1wdHlWYWx1ZVxuICAsIFdpZGdldCA9IHdpZGdldHMuV2lkZ2V0XG4gICwgY2xlYW5JUHY2QWRkcmVzcyA9IHZhbGlkYXRvcnMuaXB2Ni5jbGVhbklQdjZBZGRyZXNzXG5cbi8qKlxuICogQW4gb2JqZWN0IHRoYXQgaXMgcmVzcG9uc2libGUgZm9yIGRvaW5nIHZhbGlkYXRpb24gYW5kIG5vcm1hbGlzYXRpb24sIG9yXG4gKiBcImNsZWFuaW5nXCIsIGZvciBleGFtcGxlOiBhbiBFbWFpbEZpZWxkIG1ha2VzIHN1cmUgaXRzIGRhdGEgaXMgYSB2YWxpZFxuICogZS1tYWlsIGFkZHJlc3MgYW5kIG1ha2VzIHN1cmUgdGhhdCBhY2NlcHRhYmxlIFwiYmxhbmtcIiB2YWx1ZXMgYWxsIGhhdmUgdGhlXG4gKiBzYW1lIHJlcHJlc2VudGF0aW9uLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgRmllbGQgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgICAgcmVxdWlyZWQ6IHRydWUsIHdpZGdldDogbnVsbCwgbGFiZWw6IG51bGwsIGluaXRpYWw6IG51bGwsXG4gICAgICBoZWxwVGV4dDogbnVsbCwgZXJyb3JNZXNzYWdlczogbnVsbCwgc2hvd0hpZGRlbkluaXRpYWw6IGZhbHNlLFxuICAgICAgdmFsaWRhdG9yczogW10sIGV4dHJhQ2xhc3NlczogbnVsbFxuICAgIH0sIGt3YXJncylcbiAgICB0aGlzLnJlcXVpcmVkID0ga3dhcmdzLnJlcXVpcmVkXG4gICAgdGhpcy5sYWJlbCA9IGt3YXJncy5sYWJlbFxuICAgIHRoaXMuaW5pdGlhbCA9IGt3YXJncy5pbml0aWFsXG4gICAgdGhpcy5zaG93SGlkZGVuSW5pdGlhbCA9IGt3YXJncy5zaG93SGlkZGVuSW5pdGlhbFxuICAgIHRoaXMuaGVscFRleHQgPSBrd2FyZ3MuaGVscFRleHQgfHwgJydcbiAgICB0aGlzLmV4dHJhQ2xhc3NlcyA9IGt3YXJncy5leHRyYUNsYXNzZXNcblxuICAgIHZhciB3aWRnZXQgPSBrd2FyZ3Mud2lkZ2V0IHx8IHRoaXMud2lkZ2V0XG4gICAgaWYgKCEod2lkZ2V0IGluc3RhbmNlb2YgV2lkZ2V0KSkge1xuICAgICAgLy8gV2UgbXVzdCBoYXZlIGEgV2lkZ2V0IGNvbnN0cnVjdG9yLCBzbyBjb25zdHJ1Y3Qgd2l0aCBpdFxuICAgICAgd2lkZ2V0ID0gbmV3IHdpZGdldCgpXG4gICAgfVxuICAgIC8vIExldCB0aGUgd2lkZ2V0IGtub3cgd2hldGhlciBpdCBzaG91bGQgZGlzcGxheSBhcyByZXF1aXJlZFxuICAgIHdpZGdldC5pc1JlcXVpcmVkID0gdGhpcy5yZXF1aXJlZFxuICAgIC8vIEhvb2sgaW50byB0aGlzLndpZGdldEF0dHJzKCkgZm9yIGFueSBGaWVsZC1zcGVjaWZpYyBIVE1MIGF0dHJpYnV0ZXNcbiAgICBvYmplY3QuZXh0ZW5kKHdpZGdldC5hdHRycywgdGhpcy53aWRnZXRBdHRycyh3aWRnZXQpKVxuICAgIHRoaXMud2lkZ2V0ID0gd2lkZ2V0XG5cbiAgICAvLyBJbmNyZW1lbnQgdGhlIGNyZWF0aW9uIGNvdW50ZXIgYW5kIHNhdmUgb3VyIGxvY2FsIGNvcHlcbiAgICB0aGlzLmNyZWF0aW9uQ291bnRlciA9IEZpZWxkLmNyZWF0aW9uQ291bnRlcisrXG5cbiAgICAvLyBDb3B5IGVycm9yIG1lc3NhZ2VzIGZvciB0aGlzIGluc3RhbmNlIGludG8gYSBuZXcgb2JqZWN0IGFuZCBvdmVycmlkZVxuICAgIC8vIHdpdGggYW55IHByb3ZpZGVkIGVycm9yIG1lc3NhZ2VzLlxuICAgIHRoaXMuZXJyb3JNZXNzYWdlcyA9XG4gICAgICAgIG9iamVjdC5leHRlbmQoe30sIHRoaXMuZGVmYXVsdEVycm9yTWVzc2FnZXMsIGt3YXJncy5lcnJvck1lc3NhZ2VzIHx8IHt9KVxuXG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy5kZWZhdWx0VmFsaWRhdG9ycy5jb25jYXQoa3dhcmdzLnZhbGlkYXRvcnMpXG4gIH1cbiAgLyoqIERlZmF1bHQgd2lkZ2V0IHRvIHVzZSB3aGVuIHJlbmRlcmluZyB0aGlzIHR5cGUgb2YgRmllbGQuICovXG4sIHdpZGdldDogd2lkZ2V0cy5UZXh0SW5wdXRcbiAgLyoqIERlZmF1bHQgd2lkZ2V0IHRvIHVzZSB3aGVuIHJlbmRlcmluZyB0aGlzIHR5cGUgb2YgZmllbGQgYXMgaGlkZGVuLiAqL1xuLCBoaWRkZW5XaWRnZXQ6IHdpZGdldHMuSGlkZGVuSW5wdXRcbiAgLyoqIERlZmF1bHQgc2V0IG9mIHZhbGlkYXRvcnMuICovXG4sIGRlZmF1bHRWYWxpZGF0b3JzOiBbXVxuICAvKiogRGVmYXVsdCBlcnJvciBtZXNzYWdlcy4gKi9cbiwgZGVmYXVsdEVycm9yTWVzc2FnZXM6IHtcbiAgICByZXF1aXJlZDogJ1RoaXMgZmllbGQgaXMgcmVxdWlyZWQuJ1xuICAsIGludmFsaWQ6ICdFbnRlciBhIHZhbGlkIHZhbHVlLidcbiAgfVxufSlcblxuLyoqXG4gKiBUcmFja3MgZWFjaCB0aW1lIGEgRmllbGQgaW5zdGFuY2UgaXMgY3JlYXRlZDsgdXNlZCB0byByZXRhaW4gb3JkZXIuXG4gKi9cbkZpZWxkLmNyZWF0aW9uQ291bnRlciA9IDBcblxuRmllbGQucHJvdG90eXBlLnByZXBhcmVWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZVxufVxuXG5GaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlXG59XG5cbkZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh0aGlzLnJlcXVpcmVkICYmIGlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLnJlcXVpcmVkKVxuICB9XG59XG5cbkZpZWxkLnByb3RvdHlwZS5ydW5WYWxpZGF0b3JzID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKGlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm5cbiAgfVxuICB2YXIgZXJyb3JzID0gW11cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLnZhbGlkYXRvcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhbGlkYXRvcnMuY2FsbFZhbGlkYXRvcih0aGlzLnZhbGlkYXRvcnNbaV0sIHZhbHVlKVxuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHtcbiAgICAgICAgdGhyb3cgZVxuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGUuY29kZSAhPSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAgIHR5cGVvZiB0aGlzLmVycm9yTWVzc2FnZXNbZS5jb2RlXSAhPSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAgIHRoaXMuZXJyb3JNZXNzYWdlc1tlLmNvZGVdICE9PSB0aGlzLmRlZmF1bHRFcnJvck1lc3NhZ2VzW2UuY29kZV0pIHtcbiAgICAgICAgdmFyIG1lc3NhZ2UgPSB0aGlzLmVycm9yTWVzc2FnZXNbZS5jb2RlXVxuICAgICAgICBpZiAodHlwZW9mIGUucGFyYW1zICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgbWVzc2FnZSA9IGZvcm1hdChtZXNzYWdlLCBlLnBhcmFtcylcbiAgICAgICAgfVxuICAgICAgICBlcnJvcnMucHVzaChtZXNzYWdlKVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGVycm9ycyA9IGVycm9ycy5jb25jYXQoZS5tZXNzYWdlcylcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKGVycm9ycylcbiAgfVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGUgZ2l2ZW4gdmFsdWUgYW5kIHJldHVybnMgaXRzIFwiY2xlYW5lZFwiIHZhbHVlIGFzIGFuIGFwcHJvcHJpYXRlXG4gKiBKYXZhU2NyaXB0IG9iamVjdC5cbiAqXG4gKiBSYWlzZXMgVmFsaWRhdGlvbkVycm9yIGZvciBhbnkgZXJyb3JzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSB0aGUgdmFsdWUgdG8gYmUgdmFsaWRhdGVkLlxuICovXG5GaWVsZC5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IHRoaXMudG9KYXZhU2NyaXB0KHZhbHVlKVxuICB0aGlzLnZhbGlkYXRlKHZhbHVlKVxuICB0aGlzLnJ1blZhbGlkYXRvcnModmFsdWUpXG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIFJldHVybiB0aGUgdmFsdWUgdGhhdCBzaG91bGQgYmUgc2hvd24gZm9yIHRoaXMgZmllbGQgb24gcmVuZGVyIG9mIGEgYm91bmRcbiAqIGZvcm0sIGdpdmVuIHRoZSBzdWJtaXR0ZWQgUE9TVCBkYXRhIGZvciB0aGUgZmllbGQgYW5kIHRoZSBpbml0aWFsIGRhdGEsIGlmXG4gKiBhbnkuXG4gKlxuICogRm9yIG1vc3QgZmllbGRzLCB0aGlzIHdpbGwgc2ltcGx5IGJlIGRhdGE7IEZpbGVGaWVsZHMgbmVlZCB0byBoYW5kbGUgaXQgYSBiaXRcbiAqIGRpZmZlcmVudGx5LlxuICovXG5GaWVsZC5wcm90b3R5cGUuYm91bmREYXRhID0gZnVuY3Rpb24oZGF0YSwgaW5pdGlhbCkge1xuICByZXR1cm4gZGF0YVxufVxuXG4vKipcbiAqIFNwZWNpZmllcyBIVE1MIGF0dHJpYnV0ZXMgd2hpY2ggc2hvdWxkIGJlIGFkZGVkIHRvIGEgZ2l2ZW4gd2lkZ2V0IGZvciB0aGlzXG4gKiBmaWVsZC5cbiAqXG4gKiBAcGFyYW0ge1dpZGdldH0gd2lkZ2V0IGEgd2lkZ2V0LlxuICogQHJldHVybiBhbiBvYmplY3Qgc3BlY2lmeWluZyBIVE1MIGF0dHJpYnV0ZXMgdGhhdCBzaG91bGQgYmUgYWRkZWQgdG8gdGhlXG4gKiAgICAgICAgIGdpdmVuIHdpZGdldCwgYmFzZWQgb24gdGhpcyBmaWVsZC5cbiAqL1xuRmllbGQucHJvdG90eXBlLndpZGdldEF0dHJzID0gZnVuY3Rpb24od2lkZ2V0KSB7XG4gIHJldHVybiB7fVxufVxuXG4vKipcbiAqIERqYW5nbyBoYXMgZHJvcHBlZCB0aGlzIG1ldGhvZCwgYnV0IHdlIHN0aWxsIG5lZWQgdG8gaXQgcGVyZm9ybSB0aGUgY2hhbmdlXG4gKiBjaGVjayBmb3IgY2VydGFpbiBGaWVsZCB0eXBlcy5cbiAqL1xuRmllbGQucHJvdG90eXBlLl9oYXNDaGFuZ2VkID0gZnVuY3Rpb24oaW5pdGlhbCwgZGF0YSkge1xuICByZXR1cm4gdGhpcy53aWRnZXQuX2hhc0NoYW5nZWQoaW5pdGlhbCwgZGF0YSlcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSB2YWxpZCBTdHJpbmcuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBDaGFyRmllbGQgPSBGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IENoYXJGaWVsZChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtcbiAgICAgIG1heExlbmd0aDogbnVsbCwgbWluTGVuZ3RoOiBudWxsXG4gICAgfSwga3dhcmdzKVxuICAgIHRoaXMubWF4TGVuZ3RoID0ga3dhcmdzLm1heExlbmd0aFxuICAgIHRoaXMubWluTGVuZ3RoID0ga3dhcmdzLm1pbkxlbmd0aFxuICAgIEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICAgIGlmICh0aGlzLm1pbkxlbmd0aCAhPT0gbnVsbCkge1xuICAgICAgdGhpcy52YWxpZGF0b3JzLnB1c2godmFsaWRhdG9ycy5NaW5MZW5ndGhWYWxpZGF0b3IodGhpcy5taW5MZW5ndGgpKVxuICAgIH1cbiAgICBpZiAodGhpcy5tYXhMZW5ndGggIT09IG51bGwpIHtcbiAgICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKHZhbGlkYXRvcnMuTWF4TGVuZ3RoVmFsaWRhdG9yKHRoaXMubWF4TGVuZ3RoKSlcbiAgICB9XG4gIH1cbn0pXG5cbkNoYXJGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKGlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuICByZXR1cm4gJycrdmFsdWVcbn1cblxuLyoqXG4gKiBJZiB0aGlzIGZpZWxkIGlzIGNvbmZpZ3VyZWQgdG8gZW5mb3JjZSBhIG1heGltdW0gbGVuZ3RoLCBhZGRzIGEgc3VpdGFibGVcbiAqIDxjb2RlPm1heExlbmd0aDwvY29kZT4gYXR0cmlidXRlIHRvIHRleHQgaW5wdXQgZmllbGRzLlxuICpcbiAqIEBwYXJhbSB7V2lkZ2V0fSB3aWRnZXQgdGhlIHdpZGdldCBiZWluZyB1c2VkIHRvIHJlbmRlciB0aGlzIGZpZWxkJ3MgdmFsdWUuXG4gKlxuICogQHJldHVybiBhZGRpdGlvbmFsIGF0dHJpYnV0ZXMgd2hpY2ggc2hvdWxkIGJlIGFkZGVkIHRvIHRoZSBnaXZlbiB3aWRnZXQuXG4gKi9cbkNoYXJGaWVsZC5wcm90b3R5cGUud2lkZ2V0QXR0cnMgPSBmdW5jdGlvbih3aWRnZXQpIHtcbiAgdmFyIGF0dHJzID0ge31cbiAgaWYgKHRoaXMubWF4TGVuZ3RoICE9PSBudWxsICYmICh3aWRnZXQgaW5zdGFuY2VvZiB3aWRnZXRzLlRleHRJbnB1dCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZGdldCBpbnN0YW5jZW9mIHdpZGdldHMuUGFzc3dvcmRJbnB1dCkpIHtcbiAgICBhdHRycy5tYXhMZW5ndGggPSB0aGlzLm1heExlbmd0aC50b1N0cmluZygpXG4gIH1cbiAgcmV0dXJuIGF0dHJzXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGlzIGEgdmFsaWQgaW50ZWdlci5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEludGVnZXJGaWVsZCA9IEZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgSW50ZWdlckZpZWxkKGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgICAgbWF4VmFsdWU6IG51bGwsIG1pblZhbHVlOiBudWxsXG4gICAgfSwga3dhcmdzKVxuICAgIHRoaXMubWF4VmFsdWUgPSBrd2FyZ3MubWF4VmFsdWVcbiAgICB0aGlzLm1pblZhbHVlID0ga3dhcmdzLm1pblZhbHVlXG4gICAgRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG5cbiAgICBpZiAodGhpcy5taW5WYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgdGhpcy52YWxpZGF0b3JzLnB1c2godmFsaWRhdG9ycy5NaW5WYWx1ZVZhbGlkYXRvcih0aGlzLm1pblZhbHVlKSlcbiAgICB9XG4gICAgaWYgKHRoaXMubWF4VmFsdWUgIT09IG51bGwpIHtcbiAgICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKHZhbGlkYXRvcnMuTWF4VmFsdWVWYWxpZGF0b3IodGhpcy5tYXhWYWx1ZSkpXG4gICAgfVxuICB9XG59KVxuSW50ZWdlckZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcyA9XG4gICAgb2JqZWN0LmV4dGVuZCh7fSwgSW50ZWdlckZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcywge1xuICAgICAgaW52YWxpZDogJ0VudGVyIGEgd2hvbGUgbnVtYmVyLidcbiAgICAsIG1heFZhbHVlOiAnRW5zdXJlIHRoaXMgdmFsdWUgaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvIHtsaW1pdFZhbHVlfS4nXG4gICAgLCBtaW5WYWx1ZTogJ0Vuc3VyZSB0aGlzIHZhbHVlIGlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byB7bGltaXRWYWx1ZX0uJ1xuICAgIH0pXG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgTnVtYmVyKCkgY2FuIGJlIGNhbGxlZCBvbiB0aGUgaW5wdXQgd2l0aCBhIHJlc3VsdCB0aGF0IGlzbid0XG4gKiBOYU4gYW5kIGRvZXNuJ3QgY29udGFpbiBhbnkgZGVjaW1hbCBwb2ludHMuXG4gKlxuICogQHBhcmFtIHZhbHVlIHRoZSB2YWx1ZSB0byBiZSB2YWwgaWRhdGVkLlxuICogQHJldHVybiB0aGUgcmVzdWx0IG9mIE51bWJlcigpLCBvciA8Y29kZT5udWxsPC9jb2RlPiBmb3IgZW1wdHkgdmFsdWVzLlxuICovXG5JbnRlZ2VyRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhbHVlID0gRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdC5jYWxsKHRoaXMsIHZhbHVlKVxuICBpZiAoaXNFbXB0eVZhbHVlKHZhbHVlKSkge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgdmFsdWUgPSBOdW1iZXIodmFsdWUpXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUudG9TdHJpbmcoKS5pbmRleE9mKCcuJykgIT0gLTEpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWQpXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGlzIGEgdmFsaWQgZmxvYXQuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtJbnRlZ2VyRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgRmxvYXRGaWVsZCA9IEludGVnZXJGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IEZsb2F0RmllbGQoa3dhcmdzKSB9XG4gICAgSW50ZWdlckZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuLyoqIEZsb2F0IHZhbGlkYXRpb24gcmVndWxhciBleHByZXNzaW9uLCBhcyBwYXJzZUZsb2F0KCkgaXMgdG9vIGZvcmdpdmluZy4gKi9cbkZsb2F0RmllbGQuRkxPQVRfUkVHRVhQID0gL15bLStdPyg/OlxcZCsoPzpcXC5cXGQrKT98KD86XFxkKyk/XFwuXFxkKykkL1xuRmxvYXRGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMgPVxuICAgIG9iamVjdC5leHRlbmQoe30sIEZsb2F0RmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7XG4gICAgICBpbnZhbGlkOiAnRW50ZXIgYSBudW1iZXIuJ1xuICAgIH0pXG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgdGhlIGlucHV0IGxvb2tzIGxpa2UgdmFsaWQgaW5wdXQgZm9yIHBhcnNlRmxvYXQoKSBhbmQgdGhlXG4gKiByZXN1bHQgb2YgY2FsbGluZyBpdCBpc24ndCBOYU4uXG4gKlxuICogQHBhcmFtIHZhbHVlIHRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKlxuICogQHJldHVybiBhIE51bWJlciBvYnRhaW5lZCBmcm9tIHBhcnNlRmxvYXQoKSwgb3IgPGNvZGU+bnVsbDwvY29kZT4gZm9yIGVtcHR5XG4gKiAgICAgICAgIHZhbHVlcy5cbiAqL1xuRmxvYXRGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFsdWUgPSBGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0LmNhbGwodGhpcywgdmFsdWUpXG4gIGlmIChpc0VtcHR5VmFsdWUodmFsdWUpKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuICB2YWx1ZSA9IHV0aWwuc3RyaXAodmFsdWUpXG4gIGlmICghRmxvYXRGaWVsZC5GTE9BVF9SRUdFWFAudGVzdCh2YWx1ZSkpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWQpXG4gIH1cbiAgdmFsdWUgPSBwYXJzZUZsb2F0KHZhbHVlKVxuICBpZiAoaXNOYU4odmFsdWUpKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5pbnZhbGlkKVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgZGF0YSBoYXMgY2hhbmdlZCBmcm9tIGluaXRpYWwuIEluIEphdmFTY3JpcHQsIHRyYWlsaW5nIHplcm9lc1xuICogaW4gZmxvYXRzIGFyZSBkcm9wcGVkIHdoZW4gYSBmbG9hdCBpcyBjb2VyY2VkIHRvIGEgU3RyaW5nLCBzbyBlLmcuLCBhblxuICogaW5pdGlhbCB2YWx1ZSBvZiAxLjAgd291bGQgbm90IG1hdGNoIGEgZGF0YSB2YWx1ZSBvZiAnMS4wJyBpZiB3ZSB3ZXJlIHRvIHVzZVxuICogdGhlIFdpZGdldCBvYmplY3QncyBfaGFzQ2hhbmdlZCwgd2hpY2ggY2hlY2tzIGNvZXJjZWQgU3RyaW5nIHZhbHVlcy5cbiAqIEB0eXBlIEJvb2xlYW5cbiAqL1xuRmxvYXRGaWVsZC5wcm90b3R5cGUuX2hhc0NoYW5nZWQgPSBmdW5jdGlvbihpbml0aWFsLCBkYXRhKSB7XG4gIC8vIEZvciBwdXJwb3NlcyBvZiBzZWVpbmcgd2hldGhlciBzb21ldGhpbmcgaGFzIGNoYW5nZWQsIG51bGwgaXMgdGhlIHNhbWVcbiAgLy8gYXMgYW4gZW1wdHkgc3RyaW5nLCBpZiB0aGUgZGF0YSBvciBpbml0YWwgdmFsdWUgd2UgZ2V0IGlzIG51bGwsIHJlcGxhY2VcbiAgLy8gaXQgd2l0aCAnJy5cbiAgdmFyIGRhdGFWYWx1ZSA9IChkYXRhID09PSBudWxsID8gJycgOiBkYXRhKVxuICB2YXIgaW5pdGlhbFZhbHVlID0gKGluaXRpYWwgPT09IG51bGwgPyAnJyA6IGluaXRpYWwpXG4gIGlmIChpbml0aWFsVmFsdWUgPT09IGRhdGFWYWx1ZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIGVsc2UgaWYgKGluaXRpYWxWYWx1ZSA9PT0gJycgfHwgZGF0YVZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIChwYXJzZUZsb2F0KCcnK2luaXRpYWxWYWx1ZSkgIT0gcGFyc2VGbG9hdCgnJytkYXRhVmFsdWUpKVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBpcyBhIGRlY2ltYWwgbnVtYmVyLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7RmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgRGVjaW1hbEZpZWxkID0gRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBEZWNpbWFsRmllbGQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7XG4gICAgICBtYXhWYWx1ZTogbnVsbCwgbWluVmFsdWU6IG51bGwsIG1heERpZ2l0czogbnVsbCwgZGVjaW1hbFBsYWNlczogbnVsbFxuICAgIH0sIGt3YXJncylcbiAgICB0aGlzLm1heFZhbHVlID0ga3dhcmdzLm1heFZhbHVlXG4gICAgdGhpcy5taW5WYWx1ZSA9IGt3YXJncy5taW5WYWx1ZVxuICAgIHRoaXMubWF4RGlnaXRzID0ga3dhcmdzLm1heERpZ2l0c1xuICAgIHRoaXMuZGVjaW1hbFBsYWNlcyA9IGt3YXJncy5kZWNpbWFsUGxhY2VzXG4gICAgRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG5cbiAgICBpZiAodGhpcy5taW5WYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgdGhpcy52YWxpZGF0b3JzLnB1c2godmFsaWRhdG9ycy5NaW5WYWx1ZVZhbGlkYXRvcih0aGlzLm1pblZhbHVlKSlcbiAgICB9XG4gICAgaWYgKHRoaXMubWF4VmFsdWUgIT09IG51bGwpIHtcbiAgICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKHZhbGlkYXRvcnMuTWF4VmFsdWVWYWxpZGF0b3IodGhpcy5tYXhWYWx1ZSkpXG4gICAgfVxuICB9XG59KVxuLyoqIERlY2ltYWwgdmFsaWRhdGlvbiByZWd1bGFyIGV4cHJlc3Npb24sIGluIGxpZXUgb2YgYSBEZWNpbWFsIHR5cGUuICovXG5EZWNpbWFsRmllbGQuREVDSU1BTF9SRUdFWFAgPSAvXlstK10/KD86XFxkKyg/OlxcLlxcZCspP3woPzpcXGQrKT9cXC5cXGQrKSQvXG5EZWNpbWFsRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBEZWNpbWFsRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7XG4gICAgICBpbnZhbGlkOiAnRW50ZXIgYSBudW1iZXIuJ1xuICAgICwgbWF4VmFsdWU6ICdFbnN1cmUgdGhpcyB2YWx1ZSBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8ge2xpbWl0VmFsdWV9LidcbiAgICAsIG1pblZhbHVlOiAnRW5zdXJlIHRoaXMgdmFsdWUgaXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvIHtsaW1pdFZhbHVlfS4nXG4gICAgLCBtYXhEaWdpdHM6ICdFbnN1cmUgdGhhdCB0aGVyZSBhcmUgbm8gbW9yZSB0aGFuIHttYXhEaWdpdHN9IGRpZ2l0cyBpbiB0b3RhbC4nXG4gICAgLCBtYXhEZWNpbWFsUGxhY2VzOiAnRW5zdXJlIHRoYXQgdGhlcmUgYXJlIG5vIG1vcmUgdGhhbiB7bWF4RGVjaW1hbFBsYWNlc30gZGVjaW1hbCBwbGFjZXMuJ1xuICAgICwgbWF4V2hvbGVEaWdpdHM6ICdFbnN1cmUgdGhhdCB0aGVyZSBhcmUgbm8gbW9yZSB0aGFuIHttYXhXaG9sZURpZ2l0c30gZGlnaXRzIGJlZm9yZSB0aGUgZGVjaW1hbCBwb2ludC4nXG4gICAgfSlcblxuLyoqXG4gKiBEZWNpbWFsRmllbGQgb3ZlcnJpZGVzIHRoZSBjbGVhbigpIG1ldGhvZCBhcyBpdCBwZXJmb3JtcyBpdHMgb3duIHZhbGlkYXRpb25cbiAqIGFnYWluc3QgYSBkaWZmZXJlbnQgdmFsdWUgdGhhbiB0aGF0IGdpdmVuIHRvIGFueSBkZWZpbmVkIHZhbGlkYXRvcnMsIGR1ZSB0b1xuICogSmF2YVNjcmlwdCBsYWNraW5nIGEgYnVpbHQtaW4gRGVjaW1hbCB0eXBlLiBEZWNpbWFsIGZvcm1hdCBhbmQgY29tcG9uZW50IHNpemVcbiAqIGNoZWNrcyB3aWxsIGJlIHBlcmZvcm1lZCBhZ2FpbnN0IGEgbm9ybWFsaXNlZCBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlXG4gKiBpbnB1dCwgd2hlcmVhcyBWYWxpZGF0b3JzIHdpbGwgYmUgcGFzc2VkIGEgZmxvYXQgdmVyc2lvbiBvZiB0ZWggdmFsdWUgZm9yXG4gKiBtaW4vbWF4IGNoZWNraW5nLlxuICogQHBhcmFtIHtzdHJpbmd8TnVtYmVyfSB2YWx1ZVxuICogQHJldHVybiB7c3RyaW5nfSBhIG5vcm1hbGlzZWQgdmVyc2lvbiBvZiB0aGUgaW5wdXQuXG4gKi9cbkRlY2ltYWxGaWVsZC5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAvLyBUYWtlIGNhcmUgb2YgZW1wdHksIHJlcXVpcmVkIHZhbGlkYXRpb25cbiAgRmllbGQucHJvdG90eXBlLnZhbGlkYXRlLmNhbGwodGhpcywgdmFsdWUpXG4gIGlmIChpc0VtcHR5VmFsdWUodmFsdWUpKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIC8vIENvZXJjZSB0byBzdHJpbmcgYW5kIHZhbGlkYXRlIHRoYXQgaXQgbG9va3MgRGVjaW1hbC1saWtlXG4gIHZhbHVlID0gdXRpbC5zdHJpcCgnJyt2YWx1ZSlcbiAgaWYgKCFEZWNpbWFsRmllbGQuREVDSU1BTF9SRUdFWFAudGVzdCh2YWx1ZSkpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWQpXG4gIH1cblxuICAvLyBJbiBsaWV1IG9mIGEgRGVjaW1hbCB0eXBlLCBEZWNpbWFsRmllbGQgdmFsaWRhdGVzIGFnYWluc3QgYSBzdHJpbmdcbiAgLy8gcmVwcmVzZW50YXRpb24gb2YgYSBEZWNpbWFsLCBpbiB3aGljaDpcbiAgLy8gKiBBbnkgbGVhZGluZyBzaWduIGhhcyBiZWVuIHN0cmlwcGVkXG4gIHZhciBuZWdhdGl2ZSA9IGZhbHNlXG4gIGlmICh2YWx1ZS5jaGFyQXQoMCkgPT0gJysnIHx8IHZhbHVlLmNoYXJBdCgwKSA9PSAnLScpIHtcbiAgICBuZWdhdGl2ZSA9ICh2YWx1ZS5jaGFyQXQoMCkgPT0gJy0nKVxuICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyKDEpXG4gIH1cbiAgLy8gKiBMZWFkaW5nIHplcm9zIGhhdmUgYmVlbiBzdHJpcHBlZCBmcm9tIGRpZ2l0cyBiZWZvcmUgdGhlIGRlY2ltYWwgcG9pbnQsXG4gIC8vICAgYnV0IHRyYWlsaW5nIGRpZ2l0cyBhcmUgcmV0YWluZWQgYWZ0ZXIgdGhlIGRlY2ltYWwgcG9pbnQuXG4gIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvXjArLywgJycpXG5cbiAgLy8gUGVyZm9ybSBvd24gdmFsaWRhdGlvblxuICB2YXIgcGllY2VzID0gdmFsdWUuc3BsaXQoJy4nKVxuICAgICwgd2hvbGVEaWdpdHMgPSBwaWVjZXNbMF0ubGVuZ3RoXG4gICAgLCBkZWNpbWFscyA9IChwaWVjZXMubGVuZ3RoID09IDIgPyBwaWVjZXNbMV0ubGVuZ3RoIDogMClcbiAgICAsIGRpZ2l0cyA9IHdob2xlRGlnaXRzICsgZGVjaW1hbHNcbiAgaWYgKHRoaXMubWF4RGlnaXRzICE9PSBudWxsICYmIGRpZ2l0cyA+IHRoaXMubWF4RGlnaXRzKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKGZvcm1hdCh0aGlzLmVycm9yTWVzc2FnZXMubWF4RGlnaXRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21heERpZ2l0czogdGhpcy5tYXhEaWdpdHN9KSlcbiAgfVxuICBpZiAodGhpcy5kZWNpbWFsUGxhY2VzICE9PSBudWxsICYmIGRlY2ltYWxzID4gdGhpcy5kZWNpbWFsUGxhY2VzKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKGZvcm1hdCh0aGlzLmVycm9yTWVzc2FnZXMubWF4RGVjaW1hbFBsYWNlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXhEZWNpbWFsUGxhY2VzOiB0aGlzLmRlY2ltYWxQbGFjZXN9KSlcbiAgfVxuICBpZiAodGhpcy5tYXhEaWdpdHMgIT09IG51bGwgJiZcbiAgICAgIHRoaXMuZGVjaW1hbFBsYWNlcyAhPT0gbnVsbCAmJlxuICAgICAgd2hvbGVEaWdpdHMgPiAodGhpcy5tYXhEaWdpdHMgLSB0aGlzLmRlY2ltYWxQbGFjZXMpKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKGZvcm1hdCh0aGlzLmVycm9yTWVzc2FnZXMubWF4V2hvbGVEaWdpdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWF4V2hvbGVEaWdpdHM6IChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1heERpZ2l0cyAtIHRoaXMuZGVjaW1hbFBsYWNlcyl9KSlcbiAgfVxuXG4gIC8vICogVmFsdWVzIHdoaWNoIGRpZCBub3QgaGF2ZSBhIGxlYWRpbmcgemVybyBnYWluIGEgc2luZ2xlIGxlYWRpbmcgemVyb1xuICBpZiAodmFsdWUuY2hhckF0KDApID09ICcuJykge1xuICAgIHZhbHVlID0gJzAnICsgdmFsdWVcbiAgfVxuICAvLyBSZXN0b3JlIHNpZ24gaWYgbmVjZXNzYXJ5XG4gIGlmIChuZWdhdGl2ZSkge1xuICAgIHZhbHVlID0gJy0nICsgdmFsdWVcbiAgfVxuXG4gIC8vIFZhbGlkYXRlIGFnYWluc3QgYSBmbG9hdCB2YWx1ZSAtIGJlc3Qgd2UgY2FuIGRvIGluIHRoZSBtZWFudGltZVxuICB0aGlzLnJ1blZhbGlkYXRvcnMocGFyc2VGbG9hdCh2YWx1ZSkpXG5cbiAgLy8gUmV0dXJuIHRoZSBub3JtYWxpdGVkIFN0cmluZyByZXByZXNlbnRhdGlvblxuICByZXR1cm4gdmFsdWVcbn1cblxuLyoqXG4gKiBCYXNlIGZpZWxkIGZvciBmaWVsZHMgd2hpY2ggdmFsaWRhdGUgdGhhdCB0aGVpciBpbnB1dCBpcyBhIGRhdGUgb3IgdGltZS5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEJhc2VUZW1wb3JhbEZpZWxkID0gRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2lucHV0Rm9ybWF0czogbnVsbH0sIGt3YXJncylcbiAgICBGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgICBpZiAoa3dhcmdzLmlucHV0Rm9ybWF0cyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5pbnB1dEZvcm1hdHMgPSBrd2FyZ3MuaW5wdXRGb3JtYXRzXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBpcyBhIHZhbGlkIGRhdGUgb3IgdGltZS5cbiAqIEBwYXJhbSB7U3RyaW5nfERhdGV9XG4gKiBAcmV0dXJuIHtEYXRlfVxuICovXG5CYXNlVGVtcG9yYWxGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKCFpcy5EYXRlKHZhbHVlKSkge1xuICAgIHZhbHVlID0gdXRpbC5zdHJpcCh2YWx1ZSlcbiAgfVxuICBpZiAoaXMuU3RyaW5nKHZhbHVlKSkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5pbnB1dEZvcm1hdHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gdGhpcy5zdHJwZGF0ZSh2YWx1ZSwgdGhpcy5pbnB1dEZvcm1hdHNbaV0pXG4gICAgICB9XG4gICAgICBjYXRjaCAoZSkge1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgIH1cbiAgfVxuICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWQpXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIERhdGUgZnJvbSB0aGUgZ2l2ZW4gaW5wdXQgaWYgaXQncyB2YWxpZCBiYXNlZCBvbiBhIGZvcm1hdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZVxuICogQHBhcmFtIHtTdHJpbmd9IGZvcm1hdFxuICogQHJldHVybiB7RGF0ZX1cbiAqL1xuQmFzZVRlbXBvcmFsRmllbGQucHJvdG90eXBlLnN0cnBkYXRlID0gZnVuY3Rpb24odmFsdWUsIGZvcm1hdCkge1xuICByZXR1cm4gdGltZS5zdHJwZGF0ZSh2YWx1ZSwgZm9ybWF0KVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBpcyBhIGRhdGUuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtCYXNlVGVtcG9yYWxGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBEYXRlRmllbGQgPSBCYXNlVGVtcG9yYWxGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IERhdGVGaWVsZChrd2FyZ3MpIH1cbiAgICBCYXNlVGVtcG9yYWxGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuLCB3aWRnZXQ6IHdpZGdldHMuRGF0ZUlucHV0XG4sIGlucHV0Rm9ybWF0czogdXRpbC5ERUZBVUxUX0RBVEVfSU5QVVRfRk9STUFUU1xufSlcbkRhdGVGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMgPVxuICAgIG9iamVjdC5leHRlbmQoe30sIERhdGVGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMsIHtcbiAgICAgIGludmFsaWQ6ICdFbnRlciBhIHZhbGlkIGRhdGUuJ1xuICAgIH0pXG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgdGhlIGlucHV0IGNhbiBiZSBjb252ZXJ0ZWQgdG8gYSBkYXRlLlxuICogQHBhcmFtIHtTdHJpbmd8RGF0ZX0gdmFsdWUgdGhlIHZhbHVlIHRvIGJlIHZhbGlkYXRlZC5cbiAqIEByZXR1cm4gez9EYXRlfSBhIHdpdGggaXRzIHllYXIsIG1vbnRoIGFuZCBkYXkgYXR0cmlidXRlcyBzZXQsIG9yIG51bGwgZm9yXG4gKiAgICAgZW1wdHkgdmFsdWVzIHdoZW4gdGhleSBhcmUgYWxsb3dlZC5cbiAqL1xuRGF0ZUZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAoaXNFbXB0eVZhbHVlKHZhbHVlKSkge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgIHJldHVybiBuZXcgRGF0ZSh2YWx1ZS5nZXRGdWxsWWVhcigpLCB2YWx1ZS5nZXRNb250aCgpLCB2YWx1ZS5nZXREYXRlKCkpXG4gIH1cbiAgcmV0dXJuIEJhc2VUZW1wb3JhbEZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQuY2FsbCh0aGlzLCB2YWx1ZSlcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSB0aW1lLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7QmFzZVRlbXBvcmFsRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgVGltZUZpZWxkID0gQmFzZVRlbXBvcmFsRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBUaW1lRmllbGQoa3dhcmdzKSB9XG4gICAgQmFzZVRlbXBvcmFsRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbiwgd2lkZ2V0OiB3aWRnZXRzLlRpbWVJbnB1dFxuLCBpbnB1dEZvcm1hdHM6IHV0aWwuREVGQVVMVF9USU1FX0lOUFVUX0ZPUk1BVFNcbn0pXG5UaW1lRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBUaW1lRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7XG4gICAgICBpbnZhbGlkOiAnRW50ZXIgYSB2YWxpZCB0aW1lLidcbiAgICB9KVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IHRoZSBpbnB1dCBjYW4gYmUgY29udmVydGVkIHRvIGEgdGltZS5cbiAqIEBwYXJhbSB7U3RyaW5nfERhdGV9IHZhbHVlIHRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKiBAcmV0dXJuIHs/RGF0ZX0gYSBEYXRlIHdpdGggaXRzIGhvdXIsIG1pbnV0ZSBhbmQgc2Vjb25kIGF0dHJpYnV0ZXMgc2V0LCBvclxuICogICAgIG51bGwgZm9yIGVtcHR5IHZhbHVlcyB3aGVuIHRoZXkgYXJlIGFsbG93ZWQuXG4gKi9cblRpbWVGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKGlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoMTkwMCwgMCwgMSwgdmFsdWUuZ2V0SG91cnMoKSwgdmFsdWUuZ2V0TWludXRlcygpLCB2YWx1ZS5nZXRTZWNvbmRzKCkpXG4gIH1cbiAgcmV0dXJuIEJhc2VUZW1wb3JhbEZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQuY2FsbCh0aGlzLCB2YWx1ZSlcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgRGF0ZSByZXByZXNlbnRpbmcgYSB0aW1lIGZyb20gdGhlIGdpdmVuIGlucHV0IGlmIGl0J3MgdmFsaWQgYmFzZWRcbiAqIG9uIHRoZSBmb3JtYXQuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBmb3JtYXRcbiAqIEByZXR1cm4ge0RhdGV9XG4gKi9cblRpbWVGaWVsZC5wcm90b3R5cGUuc3RycGRhdGUgPSBmdW5jdGlvbih2YWx1ZSwgZm9ybWF0KSB7XG4gIHZhciB0ID0gdGltZS5zdHJwdGltZSh2YWx1ZSwgZm9ybWF0KVxuICByZXR1cm4gbmV3IERhdGUoMTkwMCwgMCwgMSwgdFszXSwgdFs0XSwgdFs1XSlcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSBkYXRlL3RpbWUuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtCYXNlVGVtcG9yYWxGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBEYXRlVGltZUZpZWxkID0gQmFzZVRlbXBvcmFsRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBEYXRlVGltZUZpZWxkKGt3YXJncykgfVxuICAgIEJhc2VUZW1wb3JhbEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIHdpZGdldDogd2lkZ2V0cy5EYXRlVGltZUlucHV0XG4sIGlucHV0Rm9ybWF0czogdXRpbC5ERUZBVUxUX0RBVEVUSU1FX0lOUFVUX0ZPUk1BVFNcbn0pXG5EYXRlVGltZUZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcyA9XG4gICAgb2JqZWN0LmV4dGVuZCh7fSwgRGF0ZVRpbWVGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMsIHtcbiAgICAgIGludmFsaWQ6ICdFbnRlciBhIHZhbGlkIGRhdGUvdGltZS4nXG4gICAgfSlcblxuLyoqXG4gKiBAcGFyYW0ge1N0cmluZ3xEYXRlfEFycmF5LjxEYXRlPn1cbiAqIEByZXR1cm4gez9EYXRlfVxuICovXG5EYXRlVGltZUZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAoaXNFbXB0eVZhbHVlKHZhbHVlKSkge1xuICAgIHJldHVybiBudWxsXG4gIH1cbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgIHJldHVybiB2YWx1ZVxuICB9XG4gIGlmIChpcy5BcnJheSh2YWx1ZSkpIHtcbiAgICAvLyBJbnB1dCBjb21lcyBmcm9tIGEgU3BsaXREYXRlVGltZVdpZGdldCwgZm9yIGV4YW1wbGUsIHNvIGl0J3MgdHdvXG4gICAgLy8gY29tcG9uZW50czogZGF0ZSBhbmQgdGltZS5cbiAgICBpZiAodmFsdWUubGVuZ3RoICE9IDIpIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZClcbiAgICB9XG4gICAgaWYgKGlzRW1wdHlWYWx1ZSh2YWx1ZVswXSkgJiZcbiAgICAgICAgaXNFbXB0eVZhbHVlKHZhbHVlWzFdKSkge1xuICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG4gICAgdmFsdWUgPSB2YWx1ZS5qb2luKCcgJylcbiAgfVxuICByZXR1cm4gQmFzZVRlbXBvcmFsRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdC5jYWxsKHRoaXMsIHZhbHVlKVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGl0cyBpbnB1dCBtYXRjaGVzIGEgZ2l2ZW4gcmVndWxhciBleHByZXNzaW9uLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7Q2hhckZpZWxkfVxuICogQHBhcmFtIHt7cmVnZXhwfHN0cmluZ319IHJlZ2V4XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgUmVnZXhGaWVsZCA9IENoYXJGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24ocmVnZXgsIGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBSZWdleEZpZWxkKHJlZ2V4LCBrd2FyZ3MpIH1cbiAgICBDaGFyRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgaWYgKGlzLlN0cmluZyhyZWdleCkpIHtcbiAgICAgIHJlZ2V4ID0gbmV3IFJlZ0V4cChyZWdleClcbiAgICB9XG4gICAgdGhpcy5yZWdleCA9IHJlZ2V4XG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2godmFsaWRhdG9ycy5SZWdleFZhbGlkYXRvcih0aGlzLnJlZ2V4KSlcbiAgfVxufSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgYXBwZWFycyB0byBiZSBhIHZhbGlkIGUtbWFpbCBhZGRyZXNzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7Q2hhckZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEVtYWlsRmllbGQgPSBDaGFyRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBFbWFpbEZpZWxkKGt3YXJncykgfVxuICAgIENoYXJGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuLCBkZWZhdWx0VmFsaWRhdG9yczogW3ZhbGlkYXRvcnMudmFsaWRhdGVFbWFpbF1cbn0pXG5FbWFpbEZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcyA9XG4gICAgb2JqZWN0LmV4dGVuZCh7fSwgRW1haWxGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMsIHtcbiAgICAgIGludmFsaWQ6ICdFbnRlciBhIHZhbGlkIGUtbWFpbCBhZGRyZXNzLidcbiAgICB9KVxuXG5FbWFpbEZpZWxkLnByb3RvdHlwZS5jbGVhbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhbHVlID0gdXRpbC5zdHJpcCh0aGlzLnRvSmF2YVNjcmlwdCh2YWx1ZSkpXG4gIHJldHVybiBDaGFyRmllbGQucHJvdG90eXBlLmNsZWFuLmNhbGwodGhpcywgdmFsdWUpXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGlzIGEgdmFsaWQgdXBsb2FkZWQgZmlsZS5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEZpbGVGaWVsZCA9IEZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgRmlsZUZpZWxkKGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe21heExlbmd0aDogbnVsbCwgYWxsb3dFbXB0eUZpbGU6IGZhbHNlfSwga3dhcmdzKVxuICAgIHRoaXMubWF4TGVuZ3RoID0ga3dhcmdzLm1heExlbmd0aFxuICAgIHRoaXMuYWxsb3dFbXB0eUZpbGUgPSBrd2FyZ3MuYWxsb3dFbXB0eUZpbGVcbiAgICBkZWxldGUga3dhcmdzLm1heExlbmd0aFxuICAgIEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIHdpZGdldDogd2lkZ2V0cy5DbGVhcmFibGVGaWxlSW5wdXRcbn0pXG5GaWxlRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBGaWxlRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7XG4gICAgICBpbnZhbGlkOiAnTm8gZmlsZSB3YXMgc3VibWl0dGVkLiBDaGVjayB0aGUgZW5jb2RpbmcgdHlwZSBvbiB0aGUgZm9ybS4nXG4gICAgLCBtaXNzaW5nOiAnTm8gZmlsZSB3YXMgc3VibWl0dGVkLidcbiAgICAsIGVtcHR5OiAnVGhlIHN1Ym1pdHRlZCBmaWxlIGlzIGVtcHR5LidcbiAgICAsIG1heExlbmd0aDogJ0Vuc3VyZSB0aGlzIGZpbGVuYW1lIGhhcyBhdCBtb3N0IHttYXh9IGNoYXJhY3RlcnMgKGl0IGhhcyB7bGVuZ3RofSkuJ1xuICAgICwgY29udHJhZGljdG9uOiAnUGxlYXNlIGVpdGhlciBzdWJtaXQgYSBmaWxlIG9yIGNoZWNrIHRoZSBjbGVhciBjaGVja2JveCwgbm90IGJvdGguJ1xuICAgIH0pXG5cbkZpbGVGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24oZGF0YSwgaW5pdGlhbCkge1xuICBpZiAoaXNFbXB0eVZhbHVlKGRhdGEpKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuICAvLyBVcGxvYWRlZEZpbGUgb2JqZWN0cyBzaG91bGQgaGF2ZSBuYW1lIGFuZCBzaXplIGF0dHJpYnV0ZXNcbiAgaWYgKHR5cGVvZiBkYXRhLm5hbWUgPT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIGRhdGEuc2l6ZSA9PSAndW5kZWZpbmVkJykge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZClcbiAgfVxuXG4gIHZhciBmaWxlTmFtZSA9IGRhdGEubmFtZVxuICAgICwgZmlsZVNpemUgPSBkYXRhLnNpemVcblxuICBpZiAodGhpcy5tYXhMZW5ndGggIT09IG51bGwgJiYgZmlsZU5hbWUubGVuZ3RoID4gdGhpcy5tYXhMZW5ndGgpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IoZm9ybWF0KHRoaXMuZXJyb3JNZXNzYWdlcy5tYXhMZW5ndGgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXg6IHRoaXMubWF4TGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICwgbGVuZ3RoOiBmaWxlTmFtZS5sZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpXG4gIH1cbiAgaWYgKCFmaWxlTmFtZSkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZClcbiAgfVxuICBpZiAoIXRoaXMuYWxsb3dFbXB0eUZpbGUgJiYgIWZpbGVTaXplKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5lbXB0eSlcbiAgfVxuICByZXR1cm4gZGF0YVxufVxuXG5GaWxlRmllbGQucHJvdG90eXBlLmNsZWFuID0gZnVuY3Rpb24oZGF0YSwgaW5pdGlhbCkge1xuICAvLyBJZiB0aGUgd2lkZ2V0IGdvdCBjb250cmFkaWN0b3J5IGlucHV0cywgd2UgcmFpc2UgYSB2YWxpZGF0aW9uIGVycm9yXG4gIGlmIChkYXRhID09PSB3aWRnZXRzLkZJTEVfSU5QVVRfQ09OVFJBRElDVElPTikge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuY29udHJhZGljdGlvbilcbiAgfVxuICAvLyBmYWxzZSBtZWFucyB0aGUgZmllbGQgdmFsdWUgc2hvdWxkIGJlIGNsZWFyZWQ7IGZ1cnRoZXIgdmFsaWRhdGlvbiBpc1xuICAvLyBub3QgbmVlZGVkLlxuICBpZiAoZGF0YSA9PT0gZmFsc2UpIHtcbiAgICBpZiAoIXRoaXMucmVxdWlyZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICAvLyBJZiB0aGUgZmllbGQgaXMgcmVxdWlyZWQsIGNsZWFyaW5nIGlzIG5vdCBwb3NzaWJsZSAodGhlIHdpZGdldFxuICAgIC8vIHNob3VsZG4ndCByZXR1cm4gZmFsc2UgZGF0YSBpbiB0aGF0IGNhc2UgYW55d2F5KS4gRmFsc2UgaXMgbm90XG4gICAgLy8gaW4gRU1QVFlfVkFMVUVTOyBpZiBhIEZhbHNlIHZhbHVlIG1ha2VzIGl0IHRoaXMgZmFyIGl0IHNob3VsZCBiZVxuICAgIC8vIHZhbGlkYXRlZCBmcm9tIGhlcmUgb24gb3V0IGFzIG51bGwgKHNvIGl0IHdpbGwgYmUgY2F1Z2h0IGJ5IHRoZVxuICAgIC8vIHJlcXVpcmVkIGNoZWNrKS5cbiAgICBkYXRhID0gbnVsbFxuICB9XG4gIGlmICghZGF0YSAmJiBpbml0aWFsKSB7XG4gICAgcmV0dXJuIGluaXRpYWxcbiAgfVxuICByZXR1cm4gQ2hhckZpZWxkLnByb3RvdHlwZS5jbGVhbi5jYWxsKHRoaXMsIGRhdGEpXG59XG5cbkZpbGVGaWVsZC5wcm90b3R5cGUuYm91bmREYXRhID0gZnVuY3Rpb24oZGF0YSwgaW5pdGlhbCkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCB8fCBkYXRhID09PSB3aWRnZXRzLkZJTEVfSU5QVVRfQ09OVFJBRElDVElPTikge1xuICAgIHJldHVybiBpbml0aWFsXG4gIH1cbiAgcmV0dXJuIGRhdGFcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSB2YWxpZCB1cGxvYWRlZCBpbWFnZS5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEltYWdlRmllbGQgPSBGaWxlRmllbGQuZXh0ZW5kKHtcbmNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgSW1hZ2VGaWVsZChrd2FyZ3MpIH1cbiAgICBGaWxlRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5JbWFnZUZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcyA9XG4gICAgb2JqZWN0LmV4dGVuZCh7fSwgSW1hZ2VGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMsIHtcbiAgICAgIGludmFsaWRJbWFnZTogJ1VwbG9hZCBhIHZhbGlkIGltYWdlLiBUaGUgZmlsZSB5b3UgdXBsb2FkZWQgd2FzIGVpdGhlciBub3QgYW4gaW1hZ2Ugb3IgYSBjb3JydXB0ZWQgaW1hZ2UuJ1xuICAgIH0pXG5cbi8qKlxuICogQ2hlY2tzIHRoYXQgdGhlIGZpbGUtdXBsb2FkIGZpZWxkIGRhdGEgY29udGFpbnMgYSB2YWxpZCBpbWFnZS5cbiAqL1xuSW1hZ2VGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24oZGF0YSwgaW5pdGlhbCkge1xuICB2YXIgZiA9IEZpbGVGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0LmNhbGwodGhpcywgZGF0YSwgaW5pdGlhbClcbiAgaWYgKGYgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgLy8gVE9ETyBQbHVnIGluIGltYWdlIHByb2Nlc3NpbmcgY29kZSB3aGVuIHJ1bm5pbmcgb24gdGhlIHNlcnZlclxuXG4gIHJldHVybiBmXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGFwcGVhcnMgdG8gYmUgYSB2YWxpZCBVUkwuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtDaGFyRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgVVJMRmllbGQgPSBDaGFyRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBVUkxGaWVsZChrd2FyZ3MpIH1cbiAgICBDaGFyRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2godmFsaWRhdG9ycy5VUkxWYWxpZGF0b3IoKSlcbiAgfVxufSlcblVSTEZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcyA9XG4gICAgb2JqZWN0LmV4dGVuZCh7fSwgVVJMRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7XG4gICAgICBpbnZhbGlkOiAnRW50ZXIgYSB2YWxpZCBVUkwuJ1xuICAgICwgaW52YWxpZExpbms6ICdUaGlzIFVSTCBhcHBlYXJzIHRvIGJlIGEgYnJva2VuIGxpbmsuJ1xuICAgIH0pXG5cblVSTEZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAodmFsdWUpIHtcbiAgICB2YXIgdXJsRmllbGRzID0gdXJsLnBhcnNlVXJpKHZhbHVlKVxuICAgIGlmICghdXJsRmllbGRzLnByb3RvY29sKSB7XG4gICAgICAvLyBJZiBubyBVUkwgcHJvdG9jb2wgZ2l2ZW4sIGFzc3VtZSBodHRwOi8vXG4gICAgICB1cmxGaWVsZHMucHJvdG9jb2wgPSAnaHR0cCdcbiAgICB9XG4gICAgaWYgKCF1cmxGaWVsZHMucGF0aCkge1xuICAgICAgLy8gVGhlIHBhdGggcG9ydGlvbiBtYXkgbmVlZCB0byBiZSBhZGRlZCBiZWZvcmUgcXVlcnkgcGFyYW1zXG4gICAgICB1cmxGaWVsZHMucGF0aCA9ICcvJ1xuICAgIH1cbiAgICB2YWx1ZSA9IHVybC5tYWtlVXJpKHVybEZpZWxkcylcbiAgfVxuICByZXR1cm4gQ2hhckZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQuY2FsbCh0aGlzLCB2YWx1ZSlcbn1cblxuLyoqXG4gKiBOb3JtYWxpc2VzIGl0cyBpbnB1dCB0byBhIDxjb2RlPkJvb2xlYW48L2NvZGU+IHByaW1pdGl2ZS5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEJvb2xlYW5GaWVsZCA9IEZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgQm9vbGVhbkZpZWxkKGt3YXJncykgfVxuICAgIEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIHdpZGdldDogd2lkZ2V0cy5DaGVja2JveElucHV0XG59KVxuXG5Cb29sZWFuRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIC8vIEV4cGxpY2l0bHkgY2hlY2sgZm9yIGEgJ2ZhbHNlJyBzdHJpbmcsIHdoaWNoIGlzIHdoYXQgYSBoaWRkZW4gZmllbGQgd2lsbFxuICAvLyBzdWJtaXQgZm9yIGZhbHNlLiBBbHNvIGNoZWNrIGZvciAnMCcsIHNpbmNlIHRoaXMgaXMgd2hhdCBSYWRpb1NlbGVjdCB3aWxsXG4gIC8vIHByb3ZpZGUuIEJlY2F1c2UgQm9vbGVhbignYW55dGhpbmcnKSA9PSB0cnVlLCB3ZSBkb24ndCBuZWVkIHRvIGhhbmRsZSB0aGF0XG4gIC8vIGV4cGxpY2l0bHkuXG4gIGlmIChpcy5TdHJpbmcodmFsdWUpICYmICh2YWx1ZS50b0xvd2VyQ2FzZSgpID09ICdmYWxzZScgfHwgdmFsdWUgPT0gJzAnKSkge1xuICAgIHZhbHVlID0gZmFsc2VcbiAgfVxuICBlbHNlIHtcbiAgICB2YWx1ZSA9IEJvb2xlYW4odmFsdWUpXG4gIH1cbiAgdmFsdWUgPSBGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0LmNhbGwodGhpcywgdmFsdWUpXG4gIGlmICghdmFsdWUgJiYgdGhpcy5yZXF1aXJlZCkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMucmVxdWlyZWQpXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbi8qKlxuICogQSBmaWVsZCB3aG9zZSB2YWxpZCB2YWx1ZXMgYXJlIDxjb2RlPm51bGw8L2NvZGU+LCA8Y29kZT50cnVlPC9jb2RlPiBhbmRcbiAqIDxjb2RlPmZhbHNlPC9jb2RlPi4gSW52YWxpZCB2YWx1ZXMgYXJlIGNsZWFuZWQgdG8gPGNvZGU+bnVsbDwvY29kZT4uXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtCb29sZWFuRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgTnVsbEJvb2xlYW5GaWVsZCA9IEJvb2xlYW5GaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IE51bGxCb29sZWFuRmllbGQoa3dhcmdzKSB9XG4gICAgQm9vbGVhbkZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIHdpZGdldDogd2lkZ2V0cy5OdWxsQm9vbGVhblNlbGVjdFxufSlcblxuTnVsbEJvb2xlYW5GaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgLy8gRXhwbGljaXRseSBjaGVja3MgZm9yIHRoZSBzdHJpbmcgJ1RydWUnIGFuZCAnRmFsc2UnLCB3aGljaCBpcyB3aGF0IGFcbiAgLy8gaGlkZGVuIGZpZWxkIHdpbGwgc3VibWl0IGZvciB0cnVlIGFuZCBmYWxzZSwgYW5kIGZvciAnMScgYW5kICcwJywgd2hpY2hcbiAgLy8gaXMgd2hhdCBhIFJhZGlvRmllbGQgd2lsbCBzdWJtaXQuIFVubGlrZSB0aGUgQm9vbGVhbmZpZWxkIHdlIGFsc28gbmVlZFxuICAvLyB0byBjaGVjayBmb3IgdHJ1ZSwgYmVjYXVzZSB3ZSBhcmUgbm90IHVzaW5nIEJvb2xlYW4oKSBmdW5jdGlvbi5cbiAgaWYgKHZhbHVlID09PSB0cnVlIHx8IHZhbHVlID09ICdUcnVlJyB8fCB2YWx1ZSA9PSAndHJ1ZScgfHwgdmFsdWUgPT0gJzEnKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICBlbHNlIGlmICh2YWx1ZSA9PT0gZmFsc2UgfHwgdmFsdWUgPT0gJ0ZhbHNlJyB8fCB2YWx1ZSA9PSAnZmFsc2UnIHx8IHZhbHVlID09ICcwJykge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIHJldHVybiBudWxsXG59XG5cbk51bGxCb29sZWFuRmllbGQucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24odmFsdWUpIHt9XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGlzIG9uZSBvZiBhIHZhbGlkIGxpc3Qgb2YgY2hvaWNlcy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIENob2ljZUZpZWxkID0gRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBDaG9pY2VGaWVsZChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtjaG9pY2VzOiBbXX0sIGt3YXJncylcbiAgICBGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcbiAgICB0aGlzLnNldENob2ljZXMoa3dhcmdzLmNob2ljZXMpXG4gIH1cbiwgd2lkZ2V0OiB3aWRnZXRzLlNlbGVjdFxufSlcbkNob2ljZUZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcyA9XG4gICAgb2JqZWN0LmV4dGVuZCh7fSwgQ2hvaWNlRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7XG4gICAgICBpbnZhbGlkQ2hvaWNlOiAnU2VsZWN0IGEgdmFsaWQgY2hvaWNlLiB7dmFsdWV9IGlzIG5vdCBvbmUgb2YgdGhlIGF2YWlsYWJsZSBjaG9pY2VzLidcbiAgICB9KVxuQ2hvaWNlRmllbGQucHJvdG90eXBlLmNob2ljZXMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2Nob2ljZXMgfVxuQ2hvaWNlRmllbGQucHJvdG90eXBlLnNldENob2ljZXMgPSBmdW5jdGlvbihjaG9pY2VzKSB7XG4gIC8vIFNldHRpbmcgY2hvaWNlcyBhbHNvIHNldHMgdGhlIGNob2ljZXMgb24gdGhlIHdpZGdldFxuICB0aGlzLl9jaG9pY2VzID0gdGhpcy53aWRnZXQuY2hvaWNlcyA9IGNob2ljZXNcbn1cblxuQ2hvaWNlRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmIChpc0VtcHR5VmFsdWUodmFsdWUpKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cbiAgcmV0dXJuICcnK3ZhbHVlXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgdGhlIGdpdmVuIHZhbHVlIGlzIGluIHRoaXMgZmllbGQncyBjaG9pY2VzLlxuICovXG5DaG9pY2VGaWVsZC5wcm90b3R5cGUudmFsaWRhdGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBGaWVsZC5wcm90b3R5cGUudmFsaWRhdGUuY2FsbCh0aGlzLCB2YWx1ZSlcbiAgaWYgKHZhbHVlICYmICF0aGlzLnZhbGlkVmFsdWUodmFsdWUpKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKFxuICAgICAgICBmb3JtYXQodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWRDaG9pY2UsIHt2YWx1ZTogdmFsdWV9KSlcbiAgfVxufVxuXG4vKipcbiAqIENoZWNrcyB0byBzZWUgaWYgdGhlIHByb3ZpZGVkIHZhbHVlIGlzIGEgdmFsaWQgY2hvaWNlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSB0aGUgdmFsdWUgdG8gYmUgdmFsaWRhdGVkLlxuICovXG5DaG9pY2VGaWVsZC5wcm90b3R5cGUudmFsaWRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciBjaG9pY2VzID0gdGhpcy5jaG9pY2VzKClcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBjaG9pY2VzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChpcy5BcnJheShjaG9pY2VzW2ldWzFdKSkge1xuICAgICAgLy8gVGhpcyBpcyBhbiBvcHRncm91cCwgc28gbG9vayBpbnNpZGUgdGhlIGdyb3VwIGZvciBvcHRpb25zXG4gICAgICB2YXIgb3B0Z3JvdXBDaG9pY2VzID0gY2hvaWNlc1tpXVsxXVxuICAgICAgZm9yICh2YXIgaiA9IDAsIGsgPSBvcHRncm91cENob2ljZXMubGVuZ3RoOyBqIDwgazsgaisrKSB7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gJycrb3B0Z3JvdXBDaG9pY2VzW2pdWzBdKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh2YWx1ZSA9PT0gJycrY2hvaWNlc1tpXVswXSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogQSBDaG9pY2VGaWVsZCB3aGljaCByZXR1cm5zIGEgdmFsdWUgY29lcmNlZCBieSBzb21lIHByb3ZpZGVkIGZ1bmN0aW9uLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7Q2hvaWNlRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgVHlwZWRDaG9pY2VGaWVsZCA9IENob2ljZUZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgVHlwZWRDaG9pY2VGaWVsZChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtcbiAgICAgIGNvZXJjZTogZnVuY3Rpb24odmFsKSB7IHJldHVybiB2YWwgfSwgZW1wdHlWYWx1ZTogJydcbiAgICB9LCBrd2FyZ3MpXG4gICAgdGhpcy5jb2VyY2UgPSBrd2FyZ3MuY29lcmNlXG4gICAgdGhpcy5lbXB0eVZhbHVlID0ga3dhcmdzLmVtcHR5VmFsdWVcbiAgICBkZWxldGUga3dhcmdzLmNvZXJjZVxuICAgIGRlbGV0ZSBrd2FyZ3MuZW1wdHlWYWx1ZVxuICAgIENob2ljZUZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuXG5UeXBlZENob2ljZUZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IENob2ljZUZpZWxkLnByb3RvdHlwZS50b0phdmFTY3JpcHQuY2FsbCh0aGlzLCB2YWx1ZSlcbiAgQ2hvaWNlRmllbGQucHJvdG90eXBlLnZhbGlkYXRlLmNhbGwodGhpcywgdmFsdWUpXG4gIGlmICh2YWx1ZSA9PT0gdGhpcy5lbXB0eVZhbHVlIHx8IGlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdGhpcy5lbXB0eVZhbHVlXG4gIH1cbiAgdHJ5IHtcbiAgICB2YWx1ZSA9IHRoaXMuY29lcmNlKHZhbHVlKVxuICB9XG4gIGNhdGNoIChlKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKFxuICAgICAgICBmb3JtYXQodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWRDaG9pY2UsIHt2YWx1ZTogdmFsdWV9KSlcbiAgfVxuICByZXR1cm4gdmFsdWVcbn1cblxuVHlwZWRDaG9pY2VGaWVsZC5wcm90b3R5cGUudmFsaWRhdGUgPSBmdW5jdGlvbih2YWx1ZSkge31cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgb25lIG9yIG1vcmUgb2YgYSB2YWxpZCBsaXN0IG9mIGNob2ljZXMuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtDaG9pY2VGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBNdWx0aXBsZUNob2ljZUZpZWxkID0gQ2hvaWNlRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBNdWx0aXBsZUNob2ljZUZpZWxkKGt3YXJncykgfVxuICAgIENob2ljZUZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIHdpZGdldDogd2lkZ2V0cy5TZWxlY3RNdWx0aXBsZVxuLCBoaWRkZW5XaWRnZXQ6IHdpZGdldHMuTXVsdGlwbGVIaWRkZW5JbnB1dFxufSlcbk11bHRpcGxlQ2hvaWNlRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBNdWx0aXBsZUNob2ljZUZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcywge1xuICAgICAgaW52YWxpZENob2ljZTogJ1NlbGVjdCBhIHZhbGlkIGNob2ljZS4ge3ZhbHVlfSBpcyBub3Qgb25lIG9mIHRoZSBhdmFpbGFibGUgY2hvaWNlcy4nXG4gICAgLCBpbnZhbGlkTGlzdDogJ0VudGVyIGEgbGlzdCBvZiB2YWx1ZXMuJ1xuICAgIH0pXG5cbk11bHRpcGxlQ2hvaWNlRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICghdmFsdWUpIHtcbiAgICByZXR1cm4gW11cbiAgfVxuICBlbHNlIGlmICghKGlzLkFycmF5KHZhbHVlKSkpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWRMaXN0KVxuICB9XG4gIHZhciBzdHJpbmdWYWx1ZXMgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHN0cmluZ1ZhbHVlcy5wdXNoKCcnK3ZhbHVlW2ldKVxuICB9XG4gIHJldHVybiBzdHJpbmdWYWx1ZXNcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCB0aGUgaW5wdXQgaXMgYSBsaXN0IGFuZCB0aGF0IGVhY2ggaXRlbSBpcyBpbiB0aGlzIGZpZWxkJ3NcbiAqIGNob2ljZXMuXG4gKi9cbk11bHRpcGxlQ2hvaWNlRmllbGQucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKHRoaXMucmVxdWlyZWQgJiYgIXZhbHVlLmxlbmd0aCkge1xuICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMucmVxdWlyZWQpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoIXRoaXMudmFsaWRWYWx1ZSh2YWx1ZVtpXSkpIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcihcbiAgICAgICAgICBmb3JtYXQodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWRDaG9pY2UsIHt2YWx1ZTogdmFsdWVbaV19KSlcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBTXVsdGlwbGVDaG9pY2VGaWVsZCB3aGljaCByZXR1cm5zIHZhbHVlcyBjb2VyY2VkIGJ5IHNvbWUgcHJvdmlkZWQgZnVuY3Rpb24uXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtNdWx0aXBsZUNob2ljZUZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFR5cGVkTXVsdGlwbGVDaG9pY2VGaWVsZCA9IE11bHRpcGxlQ2hvaWNlRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBUeXBlZE11bHRpcGxlQ2hvaWNlRmllbGQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7XG4gICAgICBjb2VyY2U6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gdmFsIH0sIGVtcHR5VmFsdWU6IFtdXG4gICAgfSwga3dhcmdzKVxuICAgIHRoaXMuY29lcmNlID0ga3dhcmdzLmNvZXJjZVxuICAgIHRoaXMuZW1wdHlWYWx1ZSA9IGt3YXJncy5lbXB0eVZhbHVlXG4gICAgZGVsZXRlIGt3YXJncy5jb2VyY2VcbiAgICBkZWxldGUga3dhcmdzLmVtcHR5VmFsdWVcbiAgICBNdWx0aXBsZUNob2ljZUZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuXG5UeXBlZE11bHRpcGxlQ2hvaWNlRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhbHVlID0gTXVsdGlwbGVDaG9pY2VGaWVsZC5wcm90b3R5cGUudG9KYXZhU2NyaXB0LmNhbGwodGhpcywgdmFsdWUpXG4gIE11bHRpcGxlQ2hvaWNlRmllbGQucHJvdG90eXBlLnZhbGlkYXRlLmNhbGwodGhpcywgdmFsdWUpXG4gIGlmICh2YWx1ZSA9PT0gdGhpcy5lbXB0eVZhbHVlIHx8IGlzRW1wdHlWYWx1ZSh2YWx1ZSkgfHxcbiAgICAgIChpcy5BcnJheSh2YWx1ZSkgJiYgIXZhbHVlLmxlbmd0aCkpIHtcbiAgICByZXR1cm4gdGhpcy5lbXB0eVZhbHVlXG4gIH1cbiAgdmFyIG5ld1ZhbHVlID0gW11cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB0cnkge1xuICAgICAgbmV3VmFsdWUucHVzaCh0aGlzLmNvZXJjZSh2YWx1ZVtpXSkpXG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IoXG4gICAgICAgICAgZm9ybWF0KHRoaXMuZXJyb3JNZXNzYWdlcy5pbnZhbGlkQ2hvaWNlLCB7dmFsdWU6IHZhbHVlW2ldfSkpXG4gICAgfVxuICB9XG4gIHJldHVybiBuZXdWYWx1ZVxufVxuXG5UeXBlZE11bHRpcGxlQ2hvaWNlRmllbGQucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24odmFsdWUpIHt9XG5cbi8qKlxuICogQWxsb3dzIGNob29zaW5nIGZyb20gZmlsZXMgaW5zaWRlIGEgY2VydGFpbiBkaXJlY3RvcnkuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtDaG9pY2VGaWVsZH1cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgRmlsZVBhdGhGaWVsZCA9IENob2ljZUZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihwYXRoLCBrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgRmlsZVBhdGhGaWVsZChwYXRoLCBrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtcbiAgICAgIG1hdGNoOiBudWxsLCByZWN1cnNpdmU6IGZhbHNlLCByZXF1aXJlZDogdHJ1ZSwgd2lkZ2V0OiBudWxsLFxuICAgICAgbGFiZWw6IG51bGwsIGluaXRpYWw6IG51bGwsIGhlbHBUZXh0OiBudWxsXG4gICAgfSwga3dhcmdzKVxuXG4gICAgdGhpcy5wYXRoID0gcGF0aFxuICAgIHRoaXMubWF0Y2ggPSBrd2FyZ3MubWF0Y2hcbiAgICB0aGlzLnJlY3Vyc2l2ZSA9IGt3YXJncy5yZWN1cnNpdmVcbiAgICBkZWxldGUga3dhcmdzLm1hdGNoXG4gICAgZGVsZXRlIGt3YXJncy5yZWN1cnNpdmVcblxuICAgIGt3YXJncy5jaG9pY2VzID0gW11cbiAgICBDaG9pY2VGaWVsZC5jYWxsKHRoaXMsIGt3YXJncylcblxuICAgIGlmICh0aGlzLnJlcXVpcmVkKSB7XG4gICAgICB0aGlzLnNldENob2ljZXMoW10pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5zZXRDaG9pY2VzKFtbJycsICctLS0tLS0tLS0nXV0pXG4gICAgfVxuICAgIGlmICh0aGlzLm1hdGNoICE9PSBudWxsKSB7XG4gICAgICB0aGlzLm1hdGNoUkUgPSBuZXcgUmVnRXhwKHRoaXMubWF0Y2gpXG4gICAgfVxuXG4gICAgLy8gVE9ETyBQbHVnIGluIGZpbGUgcGF0aHMgd2hlbiBydW5uaW5nIG9uIHRoZSBzZXJ2ZXJcblxuICAgIHRoaXMud2lkZ2V0LmNob2ljZXMgPSB0aGlzLmNob2ljZXMoKVxuICB9XG59KVxuXG4vKipcbiAqIEEgRmllbGQgd2hvc2UgPGNvZGU+Y2xlYW4oKTwvY29kZT4gbWV0aG9kIGNhbGxzIG11bHRpcGxlIEZpZWxkXG4gKiA8Y29kZT5jbGVhbigpPC9jb2RlPiBtZXRob2RzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7RmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgQ29tYm9GaWVsZCA9IEZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgQ29tYm9GaWVsZChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtmaWVsZHM6IFtdfSwga3dhcmdzKVxuICAgIEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICAgIC8vIFNldCByZXF1aXJlZCB0byBGYWxzZSBvbiB0aGUgaW5kaXZpZHVhbCBmaWVsZHMsIGJlY2F1c2UgdGhlIHJlcXVpcmVkXG4gICAgLy8gdmFsaWRhdGlvbiB3aWxsIGJlIGhhbmRsZWQgYnkgQ29tYm9GaWVsZCwgbm90IGJ5IHRob3NlIGluZGl2aWR1YWwgZmllbGRzLlxuICAgIGZvciAodmFyIGkgPSAwLCBsID0ga3dhcmdzLmZpZWxkcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGt3YXJncy5maWVsZHNbaV0ucmVxdWlyZWQgPSBmYWxzZVxuICAgIH1cbiAgICB0aGlzLmZpZWxkcyA9IGt3YXJncy5maWVsZHNcbiAgfVxufSlcblxuQ29tYm9GaWVsZC5wcm90b3R5cGUuY2xlYW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICBGaWVsZC5wcm90b3R5cGUuY2xlYW4uY2FsbCh0aGlzLCB2YWx1ZSlcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmZpZWxkcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YWx1ZSA9IHRoaXMuZmllbGRzW2ldLmNsZWFuKHZhbHVlKVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIEEgRmllbGQgdGhhdCBhZ2dyZWdhdGVzIHRoZSBsb2dpYyBvZiBtdWx0aXBsZSBGaWVsZHMuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBNdWx0aVZhbHVlRmllbGQgPSBGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IE11bHRpVmFsdWVGaWVsZChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtmaWVsZHM6IFtdfSwga3dhcmdzKVxuICAgIEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICAgIC8vIFNldCByZXF1aXJlZCB0byBmYWxzZSBvbiB0aGUgaW5kaXZpZHVhbCBmaWVsZHMsIGJlY2F1c2UgdGhlIHJlcXVpcmVkXG4gICAgLy8gdmFsaWRhdGlvbiB3aWxsIGJlIGhhbmRsZWQgYnkgTXVsdGlWYWx1ZUZpZWxkLCBub3QgYnkgdGhvc2UgaW5kaXZpZHVhbFxuICAgIC8vIGZpZWxkcy5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGt3YXJncy5maWVsZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBrd2FyZ3MuZmllbGRzW2ldLnJlcXVpcmVkID0gZmFsc2VcbiAgICB9XG4gICAgdGhpcy5maWVsZHMgPSBrd2FyZ3MuZmllbGRzXG4gIH1cbn0pXG5NdWx0aVZhbHVlRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBNdWx0aVZhbHVlRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7XG4gICAgICBpbnZhbGlkOiAnRW50ZXIgYSBsaXN0IG9mIHZhbHVlcy4nXG4gICAgfSlcblxuTXVsdGlWYWx1ZUZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uKCkge31cblxuLyoqXG4gKiBWYWxpZGF0ZXMgZXZlcnkgdmFsdWUgaW4gdGhlIGdpdmVuIGxpc3QuIEEgdmFsdWUgaXMgdmFsaWRhdGVkIGFnYWluc3QgdGhlXG4gKiBjb3JyZXNwb25kaW5nIEZpZWxkIGluIDxjb2RlPnRoaXMuZmllbGRzPC9jb2RlPi5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgaWYgdGhpcyBNdWx0aVZhbHVlRmllbGQgd2FzIGluc3RhbnRpYXRlZCB3aXRoXG4gKiA8Y29kZT57ZmllbGRzOiBbZm9ybXMuRGF0ZUZpZWxkKCksIGZvcm1zLlRpbWVGaWVsZCgpXX0sIDxjb2RlPmNsZWFuKCk8L2NvZGU+XG4gKiB3b3VsZCBjYWxsIDxjb2RlPkRhdGVGaWVsZC5jbGVhbih2YWx1ZVswXSk8L2NvZGU+IGFuZFxuICogPGNvZGU+VGltZUZpZWxkLmNsZWFuKHZhbHVlWzFdKTxjb2RlPi5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2YWx1ZSB0aGUgaW5wdXQgdG8gYmUgdmFsaWRhdGVkLlxuICpcbiAqIEByZXR1cm4gdGhlIHJlc3VsdCBvZiBjYWxsaW5nIDxjb2RlPmNvbXByZXNzKCk8L2NvZGU+IG9uIHRoZSBjbGVhbmVkIGlucHV0LlxuICovXG5NdWx0aVZhbHVlRmllbGQucHJvdG90eXBlLmNsZWFuID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIGNsZWFuRGF0YSA9IFtdXG4gICAgLCBlcnJvcnMgPSBbXVxuICAgICwgaVxuICAgICwgbFxuXG4gIGlmICghdmFsdWUgfHwgaXMuQXJyYXkodmFsdWUpKSB7XG4gICAgdmFyIGFsbFZhbHVlc0VtcHR5ID0gdHJ1ZVxuICAgIGlmIChpcy5BcnJheSh2YWx1ZSkpIHtcbiAgICAgIGZvciAoaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYgKHZhbHVlW2ldKSB7XG4gICAgICAgICAgYWxsVmFsdWVzRW1wdHkgPSBmYWxzZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXZhbHVlIHx8IGFsbFZhbHVlc0VtcHR5KSB7XG4gICAgICBpZiAodGhpcy5yZXF1aXJlZCkge1xuICAgICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLnJlcXVpcmVkKVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbXByZXNzKFtdKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBlbHNlIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWQpXG4gIH1cblxuICBmb3IgKGkgPSAwLCBsID0gdGhpcy5maWVsZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIGZpZWxkID0gdGhpcy5maWVsZHNbaV1cbiAgICAgICwgZmllbGRWYWx1ZSA9IHZhbHVlW2ldXG4gICAgaWYgKGZpZWxkVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZmllbGRWYWx1ZSA9IG51bGxcbiAgICB9XG4gICAgaWYgKHRoaXMucmVxdWlyZWQgJiYgaXNFbXB0eVZhbHVlKGZpZWxkVmFsdWUpKSB7XG4gICAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLnJlcXVpcmVkKVxuICAgIH1cbiAgICB0cnkge1xuICAgICAgY2xlYW5EYXRhLnB1c2goZmllbGQuY2xlYW4oZmllbGRWYWx1ZSkpXG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBpZiAoIShlIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSkge1xuICAgICAgICB0aHJvdyBlXG4gICAgICB9XG4gICAgICBlcnJvcnMgPSBlcnJvcnMuY29uY2F0KGUubWVzc2FnZXMpXG4gICAgfVxuICB9XG5cbiAgaWYgKGVycm9ycy5sZW5ndGggIT09IDApIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IoZXJyb3JzKVxuICB9XG5cbiAgdmFyIG91dCA9IHRoaXMuY29tcHJlc3MoY2xlYW5EYXRhKVxuICB0aGlzLnZhbGlkYXRlKG91dClcbiAgdGhpcy5ydW5WYWxpZGF0b3JzKG91dClcbiAgcmV0dXJuIG91dFxufVxuXG4vKipcbiAqIFJldHVybnMgYSBzaW5nbGUgdmFsdWUgZm9yIHRoZSBnaXZlbiBsaXN0IG9mIHZhbHVlcy4gVGhlIHZhbHVlcyBjYW4gYmVcbiAqIGFzc3VtZWQgdG8gYmUgdmFsaWQuXG4gKlxuICogRm9yIGV4YW1wbGUsIGlmIHRoaXMgTXVsdGlWYWx1ZUZpZWxkIHdhcyBpbnN0YW50aWF0ZWQgd2l0aFxuICogPGNvZGU+e2ZpZWxkczogW2Zvcm1zLkRhdGVGaWVsZCgpLCBmb3Jtcy5UaW1lRmllbGQoKV19PC9jb2RlPiwgdGhpcyBtaWdodFxuICogcmV0dXJuIGEgPGNvZGU+RGF0ZTwvY29kZT4gb2JqZWN0IGNyZWF0ZWQgYnkgY29tYmluaW5nIHRoZSBkYXRlIGFuZCB0aW1lIGluXG4gKiA8Y29kZT5kYXRhTGlzdDwvY29kZT4uXG4gKlxuICogQHBhcmFtIHtBcnJheX0gZGF0YUxpc3RcbiAqL1xuTXVsdGlWYWx1ZUZpZWxkLnByb3RvdHlwZS5jb21wcmVzcyA9IGZ1bmN0aW9uKGRhdGFMaXN0KSB7XG4gIHRocm93IG5ldyBFcnJvcignU3ViY2xhc3NlcyBtdXN0IGltcGxlbWVudCB0aGlzIG1ldGhvZC4nKVxufVxuXG4vKipcbiAqIEEgTXVsdGlWYWx1ZUZpZWxkIGNvbnNpc3Rpbmcgb2YgYSBEYXRlRmllbGQgYW5kIGEgVGltZUZpZWxkLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7TXVsdGlWYWx1ZUZpZWxkfVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFNwbGl0RGF0ZVRpbWVGaWVsZCA9IE11bHRpVmFsdWVGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IFNwbGl0RGF0ZVRpbWVGaWVsZChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtcbiAgICAgIGlucHV0RGF0ZUZvcm1hdHM6IG51bGwsIGlucHV0VGltZUZvcm1hdHM6IG51bGxcbiAgICB9LCBrd2FyZ3MpXG4gICAgdmFyIGVycm9ycyA9IG9iamVjdC5leHRlbmQoe30sIHRoaXMuZGVmYXVsdEVycm9yTWVzc2FnZXMpXG4gICAgaWYgKHR5cGVvZiBrd2FyZ3MuZXJyb3JNZXNzYWdlcyAhPSAndW5kZWZpbmVkJykge1xuICAgICAgb2JqZWN0LmV4dGVuZChlcnJvcnMsIGt3YXJncy5lcnJvck1lc3NhZ2VzKVxuICAgIH1cbiAgICBrd2FyZ3MuZmllbGRzID0gW1xuICAgICAgRGF0ZUZpZWxkKHtpbnB1dEZvcm1hdHM6IGt3YXJncy5pbnB1dERhdGVGb3JtYXRzLFxuICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2VzOiB7aW52YWxpZDogZXJyb3JzLmludmFsaWREYXRlfX0pXG4gICAgLCBUaW1lRmllbGQoe2lucHV0Rm9ybWF0czoga3dhcmdzLmlucHV0RGF0ZUZvcm1hdHMsXG4gICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZXM6IHtpbnZhbGlkOiBlcnJvcnMuaW52YWxpZFRpbWV9fSlcbiAgICBdXG4gICAgTXVsdGlWYWx1ZUZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIHdpZGdldDogd2lkZ2V0cy5TcGxpdERhdGVUaW1lV2lkZ2V0XG4sIGhpZGRlbldpZGdldDogd2lkZ2V0cy5TcGxpdEhpZGRlbkRhdGVUaW1lV2lkZ2V0XG59KVxuU3BsaXREYXRlVGltZUZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcyA9XG4gICAgb2JqZWN0LmV4dGVuZCh7fSwgU3BsaXREYXRlVGltZUZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcywge1xuICAgICAgaW52YWxpZERhdGU6ICdFbnRlciBhIHZhbGlkIGRhdGUuJ1xuICAgICwgaW52YWxpZFRpbWU6ICdFbnRlciBhIHZhbGlkIHRpbWUuJ1xuICAgIH0pXG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQsIGlmIGdpdmVuLCBpdHMgaW5wdXQgZG9lcyBub3QgY29udGFpbiBlbXB0eSB2YWx1ZXMuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gW2RhdGFMaXN0XSBhIHR3by1pdGVtIGxpc3QgY29uc2lzdGluZyBvZiB0d28gPGNvZGU+RGF0ZTwvY29kZT5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0cywgdGhlIGZpcnN0IG9mIHdoaWNoIHJlcHJlc2VudHMgYSBkYXRlLCB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vjb25kIGEgdGltZS5cbiAqXG4gKiBAcmV0dXJuIGEgPGNvZGU+RGF0ZTwvY29kZT4gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgZ2l2ZW4gZGF0ZSBhbmQgdGltZSwgb3JcbiAqICAgICAgICAgPGNvZGU+bnVsbDwvY29kZT4gZm9yIGVtcHR5IHZhbHVlcy5cbiAqL1xuU3BsaXREYXRlVGltZUZpZWxkLnByb3RvdHlwZS5jb21wcmVzcyA9IGZ1bmN0aW9uKGRhdGFMaXN0KSB7XG4gIGlmIChpcy5BcnJheShkYXRhTGlzdCkgJiYgZGF0YUxpc3QubGVuZ3RoID4gMCkge1xuICAgIHZhciBkID0gZGF0YUxpc3RbMF0sIHQgPSBkYXRhTGlzdFsxXVxuICAgIC8vIFJhaXNlIGEgdmFsaWRhdGlvbiBlcnJvciBpZiBkYXRlIG9yIHRpbWUgaXMgZW1wdHkgKHBvc3NpYmxlIGlmXG4gICAgLy8gU3BsaXREYXRlVGltZUZpZWxkIGhhcyByZXF1aXJlZCA9PSBmYWxzZSkuXG4gICAgaWYgKGlzRW1wdHlWYWx1ZShkKSkge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5pbnZhbGlkRGF0ZSlcbiAgICB9XG4gICAgaWYgKGlzRW1wdHlWYWx1ZSh0KSkge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKHRoaXMuZXJyb3JNZXNzYWdlcy5pbnZhbGlkVGltZSlcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBEYXRlKGQuZ2V0RnVsbFllYXIoKSwgZC5nZXRNb250aCgpLCBkLmdldERhdGUoKSxcbiAgICAgICAgICAgICAgICAgICAgdC5nZXRIb3VycygpLCB0LmdldE1pbnV0ZXMoKSwgdC5nZXRTZWNvbmRzKCkpXG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpdHMgaW5wdXQgaXMgYSB2YWxpZCBJUHY0IGFkZHJlc3MuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtDaGFyRmllbGR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgSVBBZGRyZXNzRmllbGQgPSBDaGFyRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBJUEFkZHJlc3NGaWVsZChrd2FyZ3MpIH1cbiAgICBDaGFyRmllbGQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5JUEFkZHJlc3NGaWVsZC5wcm90b3R5cGUuZGVmYXVsdFZhbGlkYXRvcnMgPSBbdmFsaWRhdG9ycy52YWxpZGF0ZUlQdjRBZGRyZXNzXVxuSVBBZGRyZXNzRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBJUEFkZHJlc3NGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMsIHtcbiAgICAgIGludmFsaWQ6ICdFbnRlciBhIHZhbGlkIElQdjQgYWRkcmVzcy4nXG4gICAgfSlcblxudmFyIEdlbmVyaWNJUEFkZHJlc3NGaWVsZCA9IENoYXJGaWVsZC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZpZWxkKSkgeyByZXR1cm4gbmV3IEdlbmVyaWNJUEFkZHJlc3NGaWVsZChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtcbiAgICAgIHByb3RvY29sOiAnYm90aCcsIHVucGFja0lQdjQ6IGZhbHNlXG4gICAgfSwga3dhcmdzKVxuICAgIHRoaXMudW5wYWNrSVB2NCA9IGt3YXJncy51bnBhY2tJUHY0XG4gICAgdmFyIGlwVmFsaWRhdG9yID0gdmFsaWRhdG9ycy5pcEFkZHJlc3NWYWxpZGF0b3JzKGt3YXJncy5wcm90b2NvbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga3dhcmdzLnVucGFja0lQdjQpXG4gICAgdGhpcy5kZWZhdWx0VmFsaWRhdG9ycyA9IGlwVmFsaWRhdG9yLnZhbGlkYXRvcnNcbiAgICB0aGlzLmRlZmF1bHRFcnJvck1lc3NhZ2VzID0gb2JqZWN0LmV4dGVuZChcbiAgICAgIHt9LCB0aGlzLmRlZmF1bHRFcnJvck1lc3NhZ2VzLCB7aW52YWxpZDogaXBWYWxpZGF0b3IubWVzc2FnZX1cbiAgICApXG4gICAgQ2hhckZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuXG5HZW5lcmljSVBBZGRyZXNzRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICghdmFsdWUpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuICBpZiAodmFsdWUgJiYgdmFsdWUuaW5kZXhPZignOicpICE9IC0xKSB7XG4gICAgcmV0dXJuIGNsZWFuSVB2NkFkZHJlc3ModmFsdWUsIHtcbiAgICAgIHVucGFja0lQdjQ6IHRoaXMudW5wYWNrSVB2NFxuICAgICwgZXJyb3JNZXNzYWdlOiB0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZFxuICAgIH0pXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoYXQgaXRzIGlucHV0IGlzIGEgdmFsaWQgc2x1Zy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0NoYXJGaWVsZH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBTbHVnRmllbGQgPSBDaGFyRmllbGQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaWVsZCkpIHsgcmV0dXJuIG5ldyBTbHVnRmllbGQoa3dhcmdzKSB9XG4gICAgQ2hhckZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuU2x1Z0ZpZWxkLnByb3RvdHlwZS5kZWZhdWx0VmFsaWRhdG9ycyA9IFt2YWxpZGF0b3JzLnZhbGlkYXRlU2x1Z11cblNsdWdGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMgPVxuICAgIG9iamVjdC5leHRlbmQoe30sIFNsdWdGaWVsZC5wcm90b3R5cGUuZGVmYXVsdEVycm9yTWVzc2FnZXMsIHtcbiAgICAgIGludmFsaWQ6IFwiRW50ZXIgYSB2YWxpZCAnc2x1ZycgY29uc2lzdGluZyBvZiBsZXR0ZXJzLCBudW1iZXJzLCB1bmRlcnNjb3JlcyBvciBoeXBoZW5zLlwiXG4gICAgfSlcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIEZpZWxkOiBGaWVsZFxuLCBDaGFyRmllbGQ6IENoYXJGaWVsZFxuLCBJbnRlZ2VyRmllbGQ6IEludGVnZXJGaWVsZFxuLCBGbG9hdEZpZWxkOiBGbG9hdEZpZWxkXG4sIERlY2ltYWxGaWVsZDogRGVjaW1hbEZpZWxkXG4sIEJhc2VUZW1wb3JhbEZpZWxkOiBCYXNlVGVtcG9yYWxGaWVsZFxuLCBEYXRlRmllbGQ6IERhdGVGaWVsZFxuLCBUaW1lRmllbGQ6IFRpbWVGaWVsZFxuLCBEYXRlVGltZUZpZWxkOiBEYXRlVGltZUZpZWxkXG4sIFJlZ2V4RmllbGQ6IFJlZ2V4RmllbGRcbiwgRW1haWxGaWVsZDogRW1haWxGaWVsZFxuLCBGaWxlRmllbGQ6IEZpbGVGaWVsZFxuLCBJbWFnZUZpZWxkOiBJbWFnZUZpZWxkXG4sIFVSTEZpZWxkOiBVUkxGaWVsZFxuLCBCb29sZWFuRmllbGQ6IEJvb2xlYW5GaWVsZFxuLCBOdWxsQm9vbGVhbkZpZWxkOiBOdWxsQm9vbGVhbkZpZWxkXG4sIENob2ljZUZpZWxkOiBDaG9pY2VGaWVsZFxuLCBUeXBlZENob2ljZUZpZWxkOiBUeXBlZENob2ljZUZpZWxkXG4sIE11bHRpcGxlQ2hvaWNlRmllbGQ6IE11bHRpcGxlQ2hvaWNlRmllbGRcbiwgVHlwZWRNdWx0aXBsZUNob2ljZUZpZWxkOiBUeXBlZE11bHRpcGxlQ2hvaWNlRmllbGRcbiwgRmlsZVBhdGhGaWVsZDogRmlsZVBhdGhGaWVsZFxuLCBDb21ib0ZpZWxkOiBDb21ib0ZpZWxkXG4sIE11bHRpVmFsdWVGaWVsZDogTXVsdGlWYWx1ZUZpZWxkXG4sIFNwbGl0RGF0ZVRpbWVGaWVsZDogU3BsaXREYXRlVGltZUZpZWxkXG4sIElQQWRkcmVzc0ZpZWxkOiBJUEFkZHJlc3NGaWVsZFxuLCBHZW5lcmljSVBBZGRyZXNzRmllbGQ6IEdlbmVyaWNJUEFkZHJlc3NGaWVsZFxuLCBTbHVnRmllbGQ6IFNsdWdGaWVsZFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29uY3VyID0gcmVxdWlyZSgnQ29uY3VyJylcbiAgLCBpcyA9IHJlcXVpcmUoJ2lzb21vcnBoL2lzJylcbiAgLCBmb3JtYXQgPSByZXF1aXJlKCdpc29tb3JwaC9mb3JtYXQnKS5mb3JtYXRPYmpcbiAgLCBvYmplY3QgPSByZXF1aXJlKCdpc29tb3JwaC9vYmplY3QnKVxuICAsIGNvcHkgPSByZXF1aXJlKCdpc29tb3JwaC9jb3B5JylcbiAgLCB2YWxpZGF0b3JzID0gcmVxdWlyZSgndmFsaWRhdG9ycycpXG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJylcbiAgLCBmaWVsZHMgPSByZXF1aXJlKCcuL2ZpZWxkcycpXG4gICwgd2lkZ2V0cyA9IHJlcXVpcmUoJy4vd2lkZ2V0cycpXG5cbnZhciBFcnJvckxpc3QgPSB1dGlsLkVycm9yTGlzdFxuICAsIEVycm9yT2JqZWN0ID0gdXRpbC5FcnJvck9iamVjdFxuICAsIFZhbGlkYXRpb25FcnJvciA9IHZhbGlkYXRvcnMuVmFsaWRhdGlvbkVycm9yXG4gICwgRmllbGQgPSBmaWVsZHMuRmllbGRcbiAgLCBGaWxlRmllbGQgPSBmaWVsZHMuRmlsZUZpZWxkXG4gICwgVGV4dGFyZWEgPSB3aWRnZXRzLlRleHRhcmVhXG4gICwgVGV4dElucHV0ID0gd2lkZ2V0cy5UZXh0SW5wdXRcblxuLyoqIFByb3BlcnR5IHVuZGVyIHdoaWNoIG5vbi1maWVsZC1zcGVjaWZpYyBlcnJvcnMgYXJlIHN0b3JlZC4gKi9cbnZhciBOT05fRklFTERfRVJST1JTID0gJ19fYWxsX18nXG5cbi8qKlxuICogQSBmaWVsZCBhbmQgaXRzIGFzc29jaWF0ZWQgZGF0YS5cbiAqXG4gKiBAcGFyYW0ge0Zvcm19IGZvcm0gYSBmb3JtLlxuICogQHBhcmFtIHtGaWVsZH0gZmllbGQgb25lIG9mIHRoZSBmb3JtJ3MgZmllbGRzLlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgdGhlIG5hbWUgdW5kZXIgd2hpY2ggdGhlIGZpZWxkIGlzIGhlbGQgaW4gdGhlIGZvcm0uXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEJvdW5kRmllbGQgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGZvcm0sIGZpZWxkLCBuYW1lKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJvdW5kRmllbGQpKSB7IHJldHVybiBuZXcgQm91bmRGaWVsZChmb3JtLCBmaWVsZCwgbmFtZSkgfVxuICAgIHRoaXMuZm9ybSA9IGZvcm1cbiAgICB0aGlzLmZpZWxkID0gZmllbGRcbiAgICB0aGlzLm5hbWUgPSBuYW1lXG4gICAgdGhpcy5odG1sTmFtZSA9IGZvcm0uYWRkUHJlZml4KG5hbWUpXG4gICAgdGhpcy5odG1sSW5pdGlhbE5hbWUgPSBmb3JtLmFkZEluaXRpYWxQcmVmaXgobmFtZSlcbiAgICB0aGlzLmh0bWxJbml0aWFsSWQgPSBmb3JtLmFkZEluaXRpYWxQcmVmaXgodGhpcy5hdXRvSWQoKSlcbiAgICB0aGlzLmxhYmVsID0gdGhpcy5maWVsZC5sYWJlbCAhPT0gbnVsbCA/IHRoaXMuZmllbGQubGFiZWwgOiB1dGlsLnByZXR0eU5hbWUobmFtZSlcbiAgICB0aGlzLmhlbHBUZXh0ID0gZmllbGQuaGVscFRleHQgfHwgJydcbiAgfVxufSlcblxuQm91bmRGaWVsZC5wcm90b3R5cGUuZXJyb3JzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmZvcm0uZXJyb3JzKHRoaXMubmFtZSkgfHwgbmV3IHRoaXMuZm9ybS5lcnJvckNvbnN0cnVjdG9yKClcbn1cblxuQm91bmRGaWVsZC5wcm90b3R5cGUuaXNIaWRkZW4gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZmllbGQud2lkZ2V0LmlzSGlkZGVuXG59XG5cbi8qKlxuICogQ2FsY3VsYXRlcyBhbmQgcmV0dXJucyB0aGUgPGNvZGU+aWQ8L2NvZGU+IGF0dHJpYnV0ZSBmb3IgdGhpcyBCb3VuZEZJZWxkXG4gKiBpZiB0aGUgYXNzb2NpYXRlZCBmb3JtIGhhcyBhbiBhdXRvSWQuIFJldHVybnMgYW4gZW1wdHkgc3RyaW5nIG90aGVyd2lzZS5cbiAqL1xuQm91bmRGaWVsZC5wcm90b3R5cGUuYXV0b0lkID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhdXRvSWQgPSB0aGlzLmZvcm0uYXV0b0lkXG4gIGlmIChhdXRvSWQpIHtcbiAgICBhdXRvSWQgPSAnJythdXRvSWRcbiAgICBpZiAoYXV0b0lkLmluZGV4T2YoJ3tuYW1lfScpICE9IC0xKSB7XG4gICAgICByZXR1cm4gZm9ybWF0KGF1dG9JZCwge25hbWU6IHRoaXMuaHRtbE5hbWV9KVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5odG1sTmFtZVxuICB9XG4gIHJldHVybiAnJ1xufVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBkYXRhIGZvciB0aGlzIEJvdW5kRkllbGQsIG9yIDxjb2RlPm51bGw8L2NvZGU+IGlmIGl0IHdhc24ndFxuICAgKiBnaXZlbi5cbiAgICovXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS5kYXRhID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmZpZWxkLndpZGdldC52YWx1ZUZyb21EYXRhKHRoaXMuZm9ybS5kYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZvcm0uZmlsZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaHRtbE5hbWUpXG59XG5cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIHRoZSBmaWVsZCB3aWRnZXQncyA8Y29kZT5pZEZvckxhYmVsPC9jb2RlPiBtZXRob2QuXG4gICAqIFVzZWZ1bCwgZm9yIGV4YW1wbGUsIGZvciBmb2N1c2luZyBvbiB0aGlzIGZpZWxkIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlclxuICAgKiBpdCBoYXMgYSBzaW5nbGUgd2lkZ2V0IG9yIGEgTXV0aVdpZGdldC5cbiAgICovXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS5pZEZvckxhYmVsID0gZnVuY3Rpb24oKSB7XG4gIHZhciB3aWRnZXQgPSB0aGlzLmZpZWxkLndpZGdldFxuICAgICwgaWQgPSBvYmplY3QuZ2V0KHdpZGdldC5hdHRycywgJ2lkJywgdGhpcy5hdXRvSWQoKSlcbiAgcmV0dXJuIHdpZGdldC5pZEZvckxhYmVsKGlkKVxufVxuXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuZmllbGQuc2hvd0hpZGRlbkluaXRpYWwpIHtcbiAgICByZXR1cm4gUmVhY3QuRE9NLmRpdihudWxsLCB0aGlzLmFzV2lkZ2V0KCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hc0hpZGRlbih7b25seUluaXRpYWw6IHRydWV9KSlcbiAgfVxuICByZXR1cm4gdGhpcy5hc1dpZGdldCgpXG59XG5cbi8qKlxuICogWWllbGRzIFN1YldpZGdldHMgdGhhdCBjb21wcmlzZSBhbGwgd2lkZ2V0cyBpbiB0aGlzIEJvdW5kRmllbGQuICBUaGlzIHJlYWxseVxuICogaXMgb25seSB1c2VmdWwgZm9yIFJhZGlvU2VsZWN0IHdpZGdldHMsIHNvIHRoYXQgeW91IGNhbiBpdGVyYXRlIG92ZXJcbiAqIGluZGl2aWR1YWwgcmFkaW8gYnV0dG9ucyB3aGVuIHJlbmRlcmluZy5cbiAqL1xuQm91bmRGaWVsZC5wcm90b3R5cGUuX19pdGVyX18gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZmllbGQud2lkZ2V0LnN1YldpZGdldHModGhpcy5odG1sTmFtZSwgdGhpcy52YWx1ZSgpKVxufVxuXG4vKipcbiAqIFJlbmRlcnMgYSB3aWRnZXQgZm9yIHRoZSBmaWVsZC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW2t3YXJnc10gY29uZmlndXJhdGlvbiBvcHRpb25zXG4gKiBAY29uZmlnIHtXaWRnZXR9IFt3aWRnZXRdIGFuIG92ZXJyaWRlIGZvciB0aGUgd2lkZ2V0IHVzZWQgdG8gcmVuZGVyIHRoZSBmaWVsZFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAtIGlmIG5vdCBwcm92aWRlZCwgdGhlIGZpZWxkJ3MgY29uZmlndXJlZCB3aWRnZXRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lsbCBiZSB1c2VkXG4gKiBAY29uZmlnIHtPYmplY3R9IFthdHRyc10gYWRkaXRpb25hbCBhdHRyaWJ1dGVzIHRvIGJlIGFkZGVkIHRvIHRoZSBmaWVsZCdzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkZ2V0LlxuICovXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS5hc1dpZGdldCA9IGZ1bmN0aW9uKGt3YXJncykge1xuICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtcbiAgICB3aWRnZXQ6IG51bGwsIGF0dHJzOiBudWxsLCBvbmx5SW5pdGlhbDogZmFsc2VcbiAgfSwga3dhcmdzKVxuICB2YXIgd2lkZ2V0ID0gKGt3YXJncy53aWRnZXQgIT09IG51bGwgPyBrd2FyZ3Mud2lkZ2V0IDogdGhpcy5maWVsZC53aWRnZXQpXG4gICAgLCBhdHRycyA9IChrd2FyZ3MuYXR0cnMgIT09IG51bGwgPyBrd2FyZ3MuYXR0cnMgOiB7fSlcbiAgICAsIGF1dG9JZCA9IHRoaXMuYXV0b0lkKClcbiAgICAsIG5hbWUgPSAha3dhcmdzLm9ubHlJbml0aWFsID8gdGhpcy5odG1sTmFtZSA6IHRoaXMuaHRtbEluaXRpYWxOYW1lXG4gIGlmIChhdXRvSWQgJiZcbiAgICAgIHR5cGVvZiBhdHRycy5pZCA9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgdHlwZW9mIHdpZGdldC5hdHRycy5pZCA9PSAndW5kZWZpbmVkJykge1xuICAgIGF0dHJzLmlkID0gKCFrd2FyZ3Mub25seUluaXRpYWwgPyBhdXRvSWQgOiB0aGlzLmh0bWxJbml0aWFsSWQpXG4gIH1cblxuICByZXR1cm4gd2lkZ2V0LnJlbmRlcihuYW1lLCB0aGlzLnZhbHVlKCksIHthdHRyczogYXR0cnN9KVxufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIGZpZWxkIGFzIGEgdGV4dCBpbnB1dC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW2t3YXJnc10gd2lkZ2V0IG9wdGlvbnMuXG4gKi9cbkJvdW5kRmllbGQucHJvdG90eXBlLmFzVGV4dCA9IGZ1bmN0aW9uKGt3YXJncykge1xuICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHt9LCBrd2FyZ3MsIHt3aWRnZXQ6IFRleHRJbnB1dCgpfSlcbiAgcmV0dXJuIHRoaXMuYXNXaWRnZXQoa3dhcmdzKVxufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIGZpZWxkIGFzIGEgdGV4dGFyZWEuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IFtrd2FyZ3NdIHdpZGdldCBvcHRpb25zLlxuICovXG5Cb3VuZEZpZWxkLnByb3RvdHlwZS5hc1RleHRhcmVhID0gZnVuY3Rpb24oa3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe30sIGt3YXJncywge3dpZGdldDogVGV4dGFyZWEoKX0pXG4gIHJldHVybiB0aGlzLmFzV2lkZ2V0KGt3YXJncylcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSBmaWVsZCBhcyBhIGhpZGRlbiBmaWVsZC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW2F0dHJzXSBhZGRpdGlvbmFsIGF0dHJpYnV0ZXMgdG8gYmUgYWRkZWQgdG8gdGhlIGZpZWxkJ3NcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIHdpZGdldC5cbiAqL1xuQm91bmRGaWVsZC5wcm90b3R5cGUuYXNIaWRkZW4gPSBmdW5jdGlvbihrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7fSwga3dhcmdzLCB7d2lkZ2V0OiBuZXcgdGhpcy5maWVsZC5oaWRkZW5XaWRnZXQoKX0pXG4gIHJldHVybiB0aGlzLmFzV2lkZ2V0KGt3YXJncylcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB2YWx1ZSBmb3IgdGhpcyBCb3VuZEZpZWxkLCB1c2luZyB0aGUgaW5pdGlhbCB2YWx1ZSBpZiB0aGUgZm9ybVxuICogaXMgbm90IGJvdW5kIG9yIHRoZSBkYXRhIG90aGVyd2lzZS5cbiAqL1xuQm91bmRGaWVsZC5wcm90b3R5cGUudmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGRhdGFcbiAgaWYgKCF0aGlzLmZvcm0uaXNCb3VuZCkge1xuICAgIGRhdGEgPSBvYmplY3QuZ2V0KHRoaXMuZm9ybS5pbml0aWFsLCB0aGlzLm5hbWUsIHRoaXMuZmllbGQuaW5pdGlhbClcbiAgICBpZiAoaXMuRnVuY3Rpb24oZGF0YSkpIHtcbiAgICAgIGRhdGEgPSBkYXRhKClcbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgZGF0YSA9IHRoaXMuZmllbGQuYm91bmREYXRhKHRoaXMuZGF0YSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QuZ2V0KHRoaXMuZm9ybS5pbml0aWFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpZWxkLmluaXRpYWwpKVxuICB9XG4gIHJldHVybiB0aGlzLmZpZWxkLnByZXBhcmVWYWx1ZShkYXRhKVxufVxuXG4vKipcbiAqIENyZWF0ZXMgdGhlIGxhYmVsIHZhbHVlIHRvIGJlIGRpc3BsYXllZCwgYWRkaW5nIHRoZSBmb3JtIHN1ZmZpeCBpZiB0aGVyZSBpc1xuICogb25lIGFuZCB0aGUgbGFiZWwgZG9lc24ndCBlbmQgaW4gcHVuY3R1YXRpb24uXG4gKi9cbkJvdW5kRmllbGQucHJvdG90eXBlLmdldExhYmVsID0gZnVuY3Rpb24oKSB7XG4gIHZhciBsYWJlbCA9ICcnK3RoaXMubGFiZWxcbiAgLy8gT25seSBhZGQgdGhlIHN1ZmZpeCBpZiB0aGUgbGFiZWwgZG9lcyBub3QgZW5kIGluIHB1bmN0dWF0aW9uXG4gIGlmICh0aGlzLmZvcm0ubGFiZWxTdWZmaXggJiZcbiAgICAgICc6Py4hJy5pbmRleE9mKGxhYmVsLmNoYXJBdChsYWJlbC5sZW5ndGggLSAxKSkgPT0gLTEpIHtcbiAgICBsYWJlbCArPSB0aGlzLmZvcm0ubGFiZWxTdWZmaXhcbiAgfVxuICByZXR1cm4gbGFiZWxcbn1cblxuLyoqXG4gKiBXcmFwcyB0aGUgZ2l2ZW4gY29udGVudHMgaW4gYSAmbHQ7bGFiZWwmZ3Q7LCBpZiB0aGUgZmllbGQgaGFzIGFuIElEXG4gKiBhdHRyaWJ1dGUuIERvZXMgbm90IEhUTUwtZXNjYXBlIHRoZSBjb250ZW50cy4gSWYgY29udGVudHMgYXJlbid0IGdpdmVuLCB1c2VzXG4gKiB0aGUgZmllbGQncyBIVE1MLWVzY2FwZWQgbGFiZWwuXG4gKlxuICogSWYgYXR0cnMgYXJlIGdpdmVuLCB0aGV5J3JlIHVzZWQgYXMgSFRNTCBhdHRyaWJ1dGVzIG9uIHRoZSA8bGFiZWw+IHRhZy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW2t3YXJnc10gY29uZmlndXJhdGlvbiBvcHRpb25zLlxuICogQGNvbmZpZyB7U3RyaW5nfSBbY29udGVudHNdIGNvbnRlbnRzIGZvciB0aGUgbGFiZWwgLSBpZiBub3QgcHJvdmlkZWQsIGxhYmVsXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudHMgd2lsbCBiZSBnZW5lcmF0ZWQgZnJvbSB0aGUgZmllbGQgaXRzZWxmLlxuICogQGNvbmZpZyB7T2JqZWN0fSBbYXR0cnNdIGFkZGl0aW9uYWwgYXR0cmlidXRlcyB0byBiZSBhZGRlZCB0byB0aGUgbGFiZWwuXG4gKi9cbkJvdW5kRmllbGQucHJvdG90eXBlLmxhYmVsVGFnID0gZnVuY3Rpb24oa3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2NvbnRlbnRzOiBudWxsLCBhdHRyczogbnVsbH0sIGt3YXJncylcbiAgdmFyIGNvbnRlbnRzXG4gICAgLCB3aWRnZXQgPSB0aGlzLmZpZWxkLndpZGdldFxuICAgICwgaWRcbiAgICAsIGF0dHJzXG4gIGlmIChrd2FyZ3MuY29udGVudHMgIT09IG51bGwpIHtcbiAgICBjb250ZW50cyA9IGt3YXJncy5jb250ZW50c1xuICB9XG4gIGVsc2Uge1xuICAgIGNvbnRlbnRzID0gdGhpcy5nZXRMYWJlbCgpXG4gIH1cblxuICBpZCA9IG9iamVjdC5nZXQod2lkZ2V0LmF0dHJzLCAnaWQnLCB0aGlzLmF1dG9JZCgpKVxuICBpZiAoaWQpIHtcbiAgICBhdHRycyA9IG9iamVjdC5leHRlbmQoa3dhcmdzLmF0dHJzIHx8IHt9LCB7aHRtbEZvcjogd2lkZ2V0LmlkRm9yTGFiZWwoaWQpfSlcbiAgICBjb250ZW50cyA9IFJlYWN0LkRPTS5sYWJlbChhdHRycywgY29udGVudHMpXG4gIH1cbiAgcmV0dXJuIGNvbnRlbnRzXG59XG5cbi8qKlxuICogUmV0dXJucyBhIHN0cmluZyBvZiBzcGFjZS1zZXBhcmF0ZWQgQ1NTIGNsYXNzZXMgZm9yIHRoaXMgZmllbGQuXG4gKi9cbkJvdW5kRmllbGQucHJvdG90eXBlLmNzc0NsYXNzZXMgPSBmdW5jdGlvbihleHRyYUNsYXNzZXMpIHtcbiAgZXh0cmFDbGFzc2VzID0gZXh0cmFDbGFzc2VzIHx8IHRoaXMuZmllbGQuZXh0cmFDbGFzc2VzXG4gIGlmIChleHRyYUNsYXNzZXMgIT09IG51bGwgJiYgaXMuRnVuY3Rpb24oZXh0cmFDbGFzc2VzLnNwbGl0KSkge1xuICAgIGV4dHJhQ2xhc3NlcyA9IGV4dHJhQ2xhc3Nlcy5zcGxpdCgpXG4gIH1cbiAgZXh0cmFDbGFzc2VzID0gZXh0cmFDbGFzc2VzIHx8IFtdXG4gIGlmICh0eXBlb2YgdGhpcy5mb3JtLnJvd0Nzc0NsYXNzICE9ICd1bmRlZmluZWQnKSB7XG4gICAgZXh0cmFDbGFzc2VzLnB1c2godGhpcy5mb3JtLnJvd0Nzc0NsYXNzKVxuICB9XG4gIGlmICh0aGlzLmVycm9ycygpLmlzUG9wdWxhdGVkKCkgJiZcbiAgICAgIHR5cGVvZiB0aGlzLmZvcm0uZXJyb3JDc3NDbGFzcyAhPSAndW5kZWZpbmVkJykge1xuICAgIGV4dHJhQ2xhc3Nlcy5wdXNoKHRoaXMuZm9ybS5lcnJvckNzc0NsYXNzKVxuICB9XG4gIGlmICh0aGlzLmZpZWxkLnJlcXVpcmVkICYmIHR5cGVvZiB0aGlzLmZvcm0ucmVxdWlyZWRDc3NDbGFzcyAhPSAndW5kZWZpbmVkJykge1xuICAgIGV4dHJhQ2xhc3Nlcy5wdXNoKHRoaXMuZm9ybS5yZXF1aXJlZENzc0NsYXNzKVxuICB9XG4gIHJldHVybiBleHRyYUNsYXNzZXMuam9pbignICcpXG59XG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIEZpZWxkcyB0aGF0IGtub3dzIGhvdyB0byB2YWxpZGF0ZSBhbmQgZGlzcGxheSBpdHNlbGYuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7T2JqZWN0fVxuICovXG52YXIgQmFzZUZvcm0gPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgICAgZGF0YTogbnVsbCwgZmlsZXM6IG51bGwsIGF1dG9JZDogJ2lkX3tuYW1lfScsIHByZWZpeDogbnVsbCxcbiAgICAgIGluaXRpYWw6IG51bGwsIGVycm9yQ29uc3RydWN0b3I6IEVycm9yTGlzdCwgbGFiZWxTdWZmaXg6ICc6JyxcbiAgICAgIGVtcHR5UGVybWl0dGVkOiBmYWxzZVxuICAgIH0sIGt3YXJncylcbiAgICB0aGlzLmlzQm91bmQgPSBrd2FyZ3MuZGF0YSAhPT0gbnVsbCB8fCBrd2FyZ3MuZmlsZXMgIT09IG51bGxcbiAgICB0aGlzLmRhdGEgPSBrd2FyZ3MuZGF0YSB8fCB7fVxuICAgIHRoaXMuZmlsZXMgPSBrd2FyZ3MuZmlsZXMgfHwge31cbiAgICB0aGlzLmF1dG9JZCA9IGt3YXJncy5hdXRvSWRcbiAgICB0aGlzLnByZWZpeCA9IGt3YXJncy5wcmVmaXhcbiAgICB0aGlzLmluaXRpYWwgPSBrd2FyZ3MuaW5pdGlhbCB8fCB7fVxuICAgIHRoaXMuZXJyb3JDb25zdHJ1Y3RvciA9IGt3YXJncy5lcnJvckNvbnN0cnVjdG9yXG4gICAgdGhpcy5sYWJlbFN1ZmZpeCA9IGt3YXJncy5sYWJlbFN1ZmZpeFxuICAgIHRoaXMuZW1wdHlQZXJtaXR0ZWQgPSBrd2FyZ3MuZW1wdHlQZXJtaXR0ZWRcbiAgICB0aGlzLl9lcnJvcnMgPSBudWxsOyAvLyBTdG9yZXMgZXJyb3JzIGFmdGVyIGNsZWFuKCkgaGFzIGJlZW4gY2FsbGVkXG4gICAgdGhpcy5fY2hhbmdlZERhdGEgPSBudWxsXG5cbiAgICAvLyBUaGUgYmFzZUZpZWxkcyBhdHRyaWJ1dGUgaXMgdGhlICpwcm90b3R5cGUtd2lkZSogZGVmaW5pdGlvbiBvZiBmaWVsZHMuXG4gICAgLy8gQmVjYXVzZSBhIHBhcnRpY3VsYXIgKmluc3RhbmNlKiBtaWdodCB3YW50IHRvIGFsdGVyIHRoaXMuZmllbGRzLCB3ZVxuICAgIC8vIGNyZWF0ZSB0aGlzLmZpZWxkcyBoZXJlIGJ5IGRlZXAgY29weWluZyBiYXNlRmllbGRzLiBJbnN0YW5jZXMgc2hvdWxkXG4gICAgLy8gYWx3YXlzIG1vZGlmeSB0aGlzLmZpZWxkczsgdGhleSBzaG91bGQgbm90IG1vZGlmeSBiYXNlRmllbGRzLlxuICAgIHRoaXMuZmllbGRzID0gY29weS5kZWVwQ29weSh0aGlzLmJhc2VGaWVsZHMpXG4gIH1cbn0pXG5cbi8qKlxuICogR2V0dGVyIGZvciBlcnJvcnMsIHdoaWNoIGZpcnN0IGNsZWFucyB0aGUgZm9ybSBpZiB0aGVyZSBhcmUgbm8gZXJyb3JzXG4gKiBkZWZpbmVkIHlldC5cbiAqXG4gKiBAcmV0dXJuIGVycm9ycyBmb3IgdGhlIGRhdGEgcHJvdmlkZWQgZm9yIHRoZSBmb3JtLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuZXJyb3JzID0gZnVuY3Rpb24obmFtZSkge1xuICBpZiAodGhpcy5fZXJyb3JzID09PSBudWxsKSB7XG4gICAgdGhpcy5mdWxsQ2xlYW4oKVxuICB9XG4gIGlmIChuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX2Vycm9ycy5nZXQobmFtZSlcbiAgfVxuICByZXR1cm4gdGhpcy5fZXJyb3JzXG59XG5cbkJhc2VGb3JtLnByb3RvdHlwZS5jaGFuZ2VkRGF0YSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fY2hhbmdlZERhdGEgPT09IG51bGwpIHtcbiAgICB0aGlzLl9jaGFuZ2VkRGF0YSA9IFtdXG4gICAgdmFyIGluaXRpYWxWYWx1ZVxuICAgIC8vIFhYWDogRm9yIG5vdyB3ZSdyZSBhc2tpbmcgdGhlIGluZGl2aWR1YWwgZmllbGRzIHdoZXRoZXIgb3Igbm90XG4gICAgLy8gdGhlIGRhdGEgaGFzIGNoYW5nZWQuIEl0IHdvdWxkIHByb2JhYmx5IGJlIG1vcmUgZWZmaWNpZW50IHRvIGhhc2hcbiAgICAvLyB0aGUgaW5pdGlhbCBkYXRhLCBzdG9yZSBpdCBpbiBhIGhpZGRlbiBmaWVsZCwgYW5kIGNvbXBhcmUgYSBoYXNoXG4gICAgLy8gb2YgdGhlIHN1Ym1pdHRlZCBkYXRhLCBidXQgd2UnZCBuZWVkIGEgd2F5IHRvIGVhc2lseSBnZXQgdGhlXG4gICAgLy8gc3RyaW5nIHZhbHVlIGZvciBhIGdpdmVuIGZpZWxkLiBSaWdodCBub3csIHRoYXQgbG9naWMgaXMgZW1iZWRkZWRcbiAgICAvLyBpbiB0aGUgcmVuZGVyIG1ldGhvZCBvZiBlYWNoIGZpZWxkJ3Mgd2lkZ2V0LlxuICAgIGZvciAodmFyIG5hbWUgaW4gdGhpcy5maWVsZHMpIHtcbiAgICAgIGlmICghb2JqZWN0Lmhhc093bih0aGlzLmZpZWxkcywgbmFtZSkpIHtcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgdmFyIGZpZWxkID0gdGhpcy5maWVsZHNbbmFtZV1cbiAgICAgIHZhciBwcmVmaXhlZE5hbWUgPSB0aGlzLmFkZFByZWZpeChuYW1lKVxuICAgICAgdmFyIGRhdGFWYWx1ZSA9IGZpZWxkLndpZGdldC52YWx1ZUZyb21EYXRhKHRoaXMuZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbGVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZWZpeGVkTmFtZSlcbiAgICAgIGluaXRpYWxWYWx1ZSA9IG9iamVjdC5nZXQodGhpcy5pbml0aWFsLCBuYW1lLCBmaWVsZC5pbml0aWFsKVxuXG4gICAgICBpZiAoZmllbGQuc2hvd0hpZGRlbkluaXRpYWwpIHtcbiAgICAgICAgdmFyIGluaXRpYWxQcmVmaXhlZE5hbWUgPSB0aGlzLmFkZEluaXRpYWxQcmVmaXgobmFtZSlcbiAgICAgICAgdmFyIGhpZGRlbldpZGdldCA9IG5ldyBmaWVsZC5oaWRkZW5XaWRnZXQoKVxuICAgICAgICBpbml0aWFsVmFsdWUgPSBoaWRkZW5XaWRnZXQudmFsdWVGcm9tRGF0YShcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGEsIHRoaXMuZmlsZXMsIGluaXRpYWxQcmVmaXhlZE5hbWUpXG4gICAgICB9XG5cbiAgICAgIGlmIChmaWVsZC5faGFzQ2hhbmdlZChpbml0aWFsVmFsdWUsIGRhdGFWYWx1ZSkpIHtcbiAgICAgICAgdGhpcy5fY2hhbmdlZERhdGEucHVzaChuYW1lKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcy5fY2hhbmdlZERhdGFcbn1cblxuQmFzZUZvcm0ucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5hc1RhYmxlKClcbn1cblxuLyoqXG4gKiBJbiBsaWV1IG9mIF9faXRlcl9fLCBjcmVhdGVzIGEge0BsaW5rIEJvdW5kRmllbGR9IGZvciBlYWNoIGZpZWxkIGluIHRoZSBmb3JtLFxuICogaW4gdGhlIG9yZGVyIGluIHdoaWNoIHRoZSBmaWVsZHMgd2VyZSBjcmVhdGVkLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFt0ZXN0XSBpZiBwcm92aWRlZCwgdGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB3aXRoXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgPHZhcj5maWVsZDwvdmFyPiBhbmQgPHZhcj5uYW1lPC92YXI+IGFyZ3VtZW50cyAtXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgQm91bmRGaWVsZHMgd2lsbCBvbmx5IGJlIGdlbmVyYXRlZCBmb3IgZmllbGRzIGZvclxuICogICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWNoIDxjb2RlPnRydWU8L2NvZGU+IGlzIHJldHVybmVkLlxuICpcbiAqIEByZXR1cm4gYSBsaXN0IG9mIDxjb2RlPkJvdW5kRmllbGQ8L2NvZGU+IG9iamVjdHMgLSBvbmUgZm9yIGVhY2ggZmllbGQgaW5cbiAqICAgICAgICAgdGhlIGZvcm0sIGluIHRoZSBvcmRlciBpbiB3aGljaCB0aGUgZmllbGRzIHdlcmUgY3JlYXRlZC5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmJvdW5kRmllbGRzID0gZnVuY3Rpb24odGVzdCkge1xuICB0ZXN0ID0gdGVzdCB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIHRydWUgfVxuXG4gIHZhciBmaWVsZHMgPSBbXVxuICBmb3IgKHZhciBuYW1lIGluIHRoaXMuZmllbGRzKSB7XG4gICAgaWYgKG9iamVjdC5oYXNPd24odGhpcy5maWVsZHMsIG5hbWUpICYmXG4gICAgICAgIHRlc3QodGhpcy5maWVsZHNbbmFtZV0sIG5hbWUpID09PSB0cnVlKSB7XG4gICAgICBmaWVsZHMucHVzaChCb3VuZEZpZWxkKHRoaXMsIHRoaXMuZmllbGRzW25hbWVdLCBuYW1lKSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZpZWxkc1xufVxuXG4vKipcbiAqIHtuYW1lIC0+IEJvdW5kRmllbGR9IHZlcnNpb24gb2YgYm91bmRGaWVsZHNcbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmJvdW5kRmllbGRzT2JqID0gZnVuY3Rpb24odGVzdCkge1xuICB0ZXN0ID0gdGVzdCB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIHRydWUgfVxuXG4gIHZhciBmaWVsZHMgPSB7fVxuICBmb3IgKHZhciBuYW1lIGluIHRoaXMuZmllbGRzKSB7XG4gICAgaWYgKG9iamVjdC5oYXNPd24odGhpcy5maWVsZHMsIG5hbWUpICYmXG4gICAgICAgIHRlc3QodGhpcy5maWVsZHNbbmFtZV0sIG5hbWUpID09PSB0cnVlKSB7XG4gICAgICBmaWVsZHNbbmFtZV0gPSBCb3VuZEZpZWxkKHRoaXMsIHRoaXMuZmllbGRzW25hbWVdLCBuYW1lKVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmllbGRzXG59XG5cbi8qKlxuICogSW4gbGlldSBvZiBfX2dldGl0ZW1fXywgY3JlYXRlcyBhIHtAbGluayBCb3VuZEZpZWxkfSBmb3IgdGhlIGZpZWxkIHdpdGggdGhlXG4gKiBnaXZlbiBuYW1lLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIGEgZmllbGQgbmFtZS5cbiAqXG4gKiBAcmV0dXJuIGEgPGNvZGU+Qm91bmRGaWVsZDwvY29kZT4gZm9yIHRoZSBmaWVsZCB3aXRoIHRoZSBnaXZlbiBuYW1lLCBpZiBvbmVcbiAqICAgICAgICAgZXhpc3RzLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuYm91bmRGaWVsZCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgaWYgKCFvYmplY3QuaGFzT3duKHRoaXMuZmllbGRzLCBuYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkZvcm0gZG9lcyBub3QgaGF2ZSBhICdcIiArIG5hbWUgKyBcIicgZmllbGQuXCIpXG4gIH1cbiAgcmV0dXJuIEJvdW5kRmllbGQodGhpcywgdGhpcy5maWVsZHNbbmFtZV0sIG5hbWUpXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIG5vdCB0aGUgZm9ybSBoYXMgZXJyb3JzLlxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmlzVmFsaWQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLmlzQm91bmQpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICByZXR1cm4gIXRoaXMuZXJyb3JzKCkuaXNQb3B1bGF0ZWQoKVxufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGZpZWxkIG5hbWUgd2l0aCBhIHByZWZpeCBhcHBlbmRlZCwgaWYgdGhpcyBGb3JtIGhhcyBhIHByZWZpeCBzZXQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkTmFtZSBhIGZpZWxkIG5hbWUuXG4gKlxuICogQHJldHVybiBhIGZpZWxkIG5hbWUgd2l0aCBhIHByZWZpeCBhcHBlbmRlZCwgaWYgdGhpcyBGb3JtIGhhcyBhIHByZWZpeCBzZXQsXG4gKiAgICAgICAgIG90aGVyd2lzZSA8Y29kZT5maWVsZE5hbWU8L2NvZGU+IGlzIHJldHVybmVkIGFzLWlzLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuYWRkUHJlZml4ID0gZnVuY3Rpb24oZmllbGROYW1lKSB7XG4gIGlmICh0aGlzLnByZWZpeCAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZvcm1hdCgne3ByZWZpeH0te2ZpZWxkTmFtZX0nLFxuICAgICAgICAgICAgICAgICAgICB7cHJlZml4OiB0aGlzLnByZWZpeCwgZmllbGROYW1lOiBmaWVsZE5hbWV9KVxuICB9XG4gIHJldHVybiBmaWVsZE5hbWVcbn1cblxuLyoqXG4gKiBBZGQgYW4gaW5pdGlhbCBwcmVmaXggZm9yIGNoZWNraW5nIGR5bmFtaWMgaW5pdGlhbCB2YWx1ZXMuXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5hZGRJbml0aWFsUHJlZml4ID0gZnVuY3Rpb24oZmllbGROYW1lKSB7XG4gIHJldHVybiBmb3JtYXQoJ2luaXRpYWwte2ZpZWxkTmFtZX0nLFxuICAgICAgICAgICAgICAgIHtmaWVsZE5hbWU6IHRoaXMuYWRkUHJlZml4KGZpZWxkTmFtZSl9KVxufVxuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiBmb3Igb3V0cHV0dGluZyBIVE1MLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG5vcm1hbFJvdyBhIGZ1bmN0aW9uIHdoaWNoIHByb2R1Y2VzIGEgbm9ybWFsIHJvdy5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGVycm9yUm93IGEgZnVuY3Rpb24gd2hpY2ggcHJvZHVjZXMgYW4gZXJyb3Igcm93LlxuICogQHBhcmFtIHtCb29sZWFufSBlcnJvcnNPblNlcGFyYXRlUm93IGRldGVybWluZXMgaWYgZXJyb3JzIGFyZSBwbGFjZWQgaW4gdGhlaXJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvd24gcm93LCBvciBpbiB0aGUgcm93IGZvciB0aGUgZmllbGRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGV5IGFyZSByZWxhdGVkIHRvLlxuICpcbiAqIEByZXR1cm4gaWYgd2UncmUgb3BlcmF0aW5nIGluIERPTSBtb2RlIHJldHVybnMgYSBsaXN0IG9mIERPTSBlbGVtZW50c1xuICogICAgICAgICByZXByZXNlbnRpbmcgcm93cywgb3RoZXJ3aXNlIHJldHVybnMgYW4gSFRNTCBzdHJpbmcsIHdpdGggcm93c1xuICogICAgICAgICBzZXBhcmF0ZWQgYnkgbGluZWJyZWFrcy5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLl9odG1sT3V0cHV0ID0gZnVuY3Rpb24obm9ybWFsUm93LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JSb3csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcnNPblNlcGFyYXRlUm93KSB7XG4gIC8vIEVycm9ycyB0aGF0IHNob3VsZCBiZSBkaXNwbGF5ZWQgYWJvdmUgYWxsIGZpZWxkc1xuICB2YXIgdG9wRXJyb3JzID0gdGhpcy5ub25GaWVsZEVycm9ycygpXG4gICAgLCByb3dzID0gW11cbiAgICAsIGhpZGRlbkZpZWxkcyA9IFtdXG4gICAgLCBodG1sQ2xhc3NBdHRyID0gbnVsbFxuICAgICwgY3NzQ2xhc3NlcyA9IG51bGxcbiAgICAsIGhpZGRlbkJvdW5kRmllbGRzID0gdGhpcy5oaWRkZW5GaWVsZHMoKVxuICAgICwgdmlzaWJsZUJvdW5kRmllbGRzID0gdGhpcy52aXNpYmxlRmllbGRzKClcbiAgICAsIGJmLCBiZkVycm9ycywgaSwgbCwgaiwgbVxuXG4gIGZvciAoaSA9IDAsIGwgPSBoaWRkZW5Cb3VuZEZpZWxkcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBiZiA9IGhpZGRlbkJvdW5kRmllbGRzW2ldXG4gICAgYmZFcnJvcnMgPSBiZi5lcnJvcnMoKVxuICAgIGlmIChiZkVycm9ycy5pc1BvcHVsYXRlZCgpKSB7XG4gICAgICBmb3IgKGogPSAwLCBtID0gYmZFcnJvcnMuZXJyb3JzLmxlbmd0aDsgaiA8IG07IGorKykge1xuICAgICAgICB0b3BFcnJvcnMuZXJyb3JzLnB1c2goJyhIaWRkZW4gZmllbGQgJyArIGJmLm5hbWUgKyAnKSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJmRXJyb3JzLmVycm9yc1tqXSlcbiAgICAgIH1cbiAgICB9XG4gICAgaGlkZGVuRmllbGRzLnB1c2goYmYucmVuZGVyKCkpXG4gIH1cblxuICBmb3IgKGkgPSAwLCBsID0gdmlzaWJsZUJvdW5kRmllbGRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGJmID0gdmlzaWJsZUJvdW5kRmllbGRzW2ldXG4gICAgaHRtbENsYXNzQXR0ciA9ICcnXG4gICAgY3NzQ2xhc3NlcyA9IGJmLmNzc0NsYXNzZXMoKVxuICAgIGlmIChjc3NDbGFzc2VzKSB7XG4gICAgICBodG1sQ2xhc3NBdHRyID0gY3NzQ2xhc3Nlc1xuICAgIH1cblxuICAgIC8vIFZhcmlhYmxlcyB3aGljaCBjYW4gYmUgb3B0aW9uYWwgaW4gZWFjaCByb3dcbiAgICB2YXIgZXJyb3JzID0gbnVsbFxuICAgICAgLCBsYWJlbCA9IG51bGxcbiAgICAgICwgaGVscFRleHQgPSBudWxsXG4gICAgICAsIGV4dHJhQ29udGVudCA9IG51bGxcblxuICAgIGJmRXJyb3JzID0gYmYuZXJyb3JzKClcbiAgICBpZiAoYmZFcnJvcnMuaXNQb3B1bGF0ZWQoKSkge1xuICAgICAgZXJyb3JzID0gbmV3IHRoaXMuZXJyb3JDb25zdHJ1Y3RvcigpXG4gICAgICBmb3IgKGogPSAwLCBtID0gYmZFcnJvcnMuZXJyb3JzLmxlbmd0aDsgaiA8IG07IGorKykge1xuICAgICAgICBlcnJvcnMuZXJyb3JzLnB1c2goYmZFcnJvcnMuZXJyb3JzW2pdKVxuICAgICAgfVxuXG4gICAgICBpZiAoZXJyb3JzT25TZXBhcmF0ZVJvdyA9PT0gdHJ1ZSkge1xuICAgICAgICByb3dzLnB1c2goZXJyb3JSb3coZXJyb3JzLnJlbmRlcigpKSlcbiAgICAgICAgZXJyb3JzID0gbnVsbFxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChiZi5sYWJlbCkge1xuICAgICAgbGFiZWwgPSBiZi5sYWJlbFRhZygpIHx8ICcnXG4gICAgfVxuXG4gICAgaWYgKGJmLmZpZWxkLmhlbHBUZXh0KSB7XG4gICAgICBoZWxwVGV4dCA9IGJmLmZpZWxkLmhlbHBUZXh0XG4gICAgfVxuXG4gICAgLy8gSWYgdGhpcyBpcyB0aGUgbGFzdCByb3csIGl0IHNob3VsZCBpbmNsdWRlIGFueSBoaWRkZW4gZmllbGRzXG4gICAgaWYgKGkgPT0gbCAtIDEgJiYgaGlkZGVuRmllbGRzLmxlbmd0aCA+IDApIHtcbiAgICAgIGV4dHJhQ29udGVudCA9IGhpZGRlbkZpZWxkc1xuICAgIH1cbiAgICBpZiAoZXJyb3JzICE9PSBudWxsKSB7XG4gICAgICBlcnJvcnMgPSBlcnJvcnMucmVuZGVyKClcbiAgICB9XG4gICAgcm93cy5wdXNoKG5vcm1hbFJvdyhsYWJlbCwgYmYucmVuZGVyKCksIGhlbHBUZXh0LCBlcnJvcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sQ2xhc3NBdHRyLCBleHRyYUNvbnRlbnQpKVxuICB9XG5cbiAgaWYgKHRvcEVycm9ycy5pc1BvcHVsYXRlZCgpKSB7XG4gICAgLy8gQWRkIGhpZGRlbiBmaWVsZHMgdG8gdGhlIHRvcCBlcnJvciByb3cgaWYgaXQncyBiZWluZyBkaXNwbGF5ZWQgYW5kXG4gICAgLy8gdGhlcmUgYXJlIG5vIG90aGVyIHJvd3MuXG4gICAgZXh0cmFDb250ZW50ID0gbnVsbFxuICAgIGlmIChoaWRkZW5GaWVsZHMubGVuZ3RoID4gMCAmJiByb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZXh0cmFDb250ZW50ID0gaGlkZGVuRmllbGRzXG4gICAgfVxuICAgIHJvd3Muc3BsaWNlKDAsIDAsIGVycm9yUm93KHRvcEVycm9ycy5yZW5kZXIoKSwgZXh0cmFDb250ZW50KSlcbiAgfVxuXG4gIC8vIFB1dCBoaWRkZW4gZmllbGRzIGluIHRoZWlyIG93biBlcnJvciByb3cgaWYgdGhlcmUgd2VyZSBubyByb3dzIHRvXG4gIC8vIGRpc3BsYXkuXG4gIGlmIChoaWRkZW5GaWVsZHMubGVuZ3RoID4gMCAmJiByb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJvd3MucHVzaChlcnJvclJvdygnJywgaGlkZGVuRmllbGRzLCB0aGlzLmhpZGRlbkZpZWxkUm93Q3NzQ2xhc3MpKVxuICB9XG4gIHJldHVybiByb3dzXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGZvcm0gcmVuZGVyZWQgYXMgSFRNTCAmbHQ7dHImZ3Q7cyAtIGV4Y2x1ZGluZyB0aGVcbiAqICZsdDt0YWJsZSZndDsmbHQ7L3RhYmxlJmd0Oy5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmFzVGFibGUgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBub3JtYWxSb3cgPSBmdW5jdGlvbihsYWJlbCwgZmllbGQsIGhlbHBUZXh0LCBlcnJvcnMsIGh0bWxDbGFzc0F0dHIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYUNvbnRlbnQpIHtcbiAgICB2YXIgY29udGVudHMgPSBbXVxuICAgIGlmIChlcnJvcnMpIHtcbiAgICAgIGNvbnRlbnRzLnB1c2goZXJyb3JzKVxuICAgIH1cbiAgICBjb250ZW50cy5wdXNoKGZpZWxkKVxuICAgIGlmIChoZWxwVGV4dCkge1xuICAgICAgY29udGVudHMucHVzaChSZWFjdC5ET00uYnIobnVsbCkpXG4gICAgICBjb250ZW50cy5wdXNoKGhlbHBUZXh0KVxuICAgIH1cbiAgICBpZiAoZXh0cmFDb250ZW50KSB7XG4gICAgICBjb250ZW50cyA9IGNvbnRlbnRzLmNvbmNhdChleHRyYUNvbnRlbnQpXG4gICAgfVxuXG4gICAgdmFyIHJvd0F0dHJzID0ge31cbiAgICBpZiAoaHRtbENsYXNzQXR0cikge1xuICAgICAgcm93QXR0cnNbJ2NsYXNzTmFtZSddID0gaHRtbENsYXNzQXR0clxuICAgIH1cbiAgICByZXR1cm4gUmVhY3QuRE9NLnRyKHJvd0F0dHJzXG4gICAgLCBSZWFjdC5ET00udGgobnVsbCwgbGFiZWwpXG4gICAgLCBSZWFjdC5ET00udGQobnVsbCwgY29udGVudHMpXG4gICAgKVxuICB9XG5cbiAgdmFyIGVycm9yUm93ID0gZnVuY3Rpb24oZXJyb3JzLCBleHRyYUNvbnRlbnQsIGh0bWxDbGFzc0F0dHIpIHtcbiAgICB2YXIgY29udGVudHMgPSBbXVxuICAgIGlmIChlcnJvcnMpIHtcbiAgICAgIGNvbnRlbnRzLnB1c2goZXJyb3JzKVxuICAgIH1cbiAgICBpZiAoZXh0cmFDb250ZW50KSB7XG4gICAgICBjb250ZW50cyA9IGNvbnRlbnRzLmNvbmNhdChleHRyYUNvbnRlbnQpXG4gICAgfVxuICAgIHZhciByb3dBdHRycyA9IHt9XG4gICAgaWYgKGh0bWxDbGFzc0F0dHIpIHtcbiAgICAgIHJvd0F0dHJzLmNsYXNzTmFtZSA9IGh0bWxDbGFzc0F0dHJcbiAgICB9XG4gICAgcmV0dXJuIFJlYWN0LkRPTS50cihyb3dBdHRyc1xuICAgICwgUmVhY3QuRE9NLnRkKHtjb2xTcGFuOiAyfSwgY29udGVudHMpXG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9odG1sT3V0cHV0KG5vcm1hbFJvdywgZXJyb3JSb3csIGZhbHNlKVxuICB9XG59KSgpXG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGZvcm0gcmVuZGVyZWQgYXMgSFRNTCAmbHQ7bGkmZ3Q7cyAtIGV4Y2x1ZGluZyB0aGVcbiAqICZsdDt1bCZndDsmbHQ7L3VsJmd0Oy5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmFzVUwgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBub3JtYWxSb3cgPSBmdW5jdGlvbihsYWJlbCwgZmllbGQsIGhlbHBUZXh0LCBlcnJvcnMsIGh0bWxDbGFzc0F0dHIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYUNvbnRlbnQpIHtcbiAgICB2YXIgY29udGVudHMgPSBbXVxuICAgIGlmIChlcnJvcnMpIHtcbiAgICAgIGNvbnRlbnRzLnB1c2goZXJyb3JzKVxuICAgIH1cbiAgICBpZiAobGFiZWwpIHtcbiAgICAgIGNvbnRlbnRzLnB1c2gobGFiZWwpXG4gICAgfVxuICAgIGNvbnRlbnRzLnB1c2goJyAnKVxuICAgIGNvbnRlbnRzLnB1c2goZmllbGQpXG4gICAgaWYgKGhlbHBUZXh0KSB7XG4gICAgICBjb250ZW50cy5wdXNoKCcgJylcbiAgICAgIGNvbnRlbnRzLnB1c2goaGVscFRleHQpXG4gICAgfVxuICAgIGlmIChleHRyYUNvbnRlbnQpIHtcbiAgICAgIGNvbnRlbnRzID0gY29udGVudHMuY29uY2F0KGV4dHJhQ29udGVudClcbiAgICB9XG5cbiAgICB2YXIgcm93QXR0cnMgPSB7fVxuICAgIGlmIChodG1sQ2xhc3NBdHRyKSB7XG4gICAgICByb3dBdHRycy5jbGFzc05hbWUgPSBodG1sQ2xhc3NBdHRyXG4gICAgfVxuICAgIHJldHVybiBSZWFjdC5ET00ubGkocm93QXR0cnMsIGNvbnRlbnRzKVxuICB9XG5cbiAgdmFyIGVycm9yUm93ID0gZnVuY3Rpb24oZXJyb3JzLCBleHRyYUNvbnRlbnQsIGh0bWxDbGFzc0F0dHIpIHtcbiAgICB2YXIgY29udGVudHMgPSBbXVxuICAgIGlmIChlcnJvcnMpIHtcbiAgICAgIGNvbnRlbnRzLnB1c2goZXJyb3JzKVxuICAgIH1cbiAgICBpZiAoZXh0cmFDb250ZW50KSB7XG4gICAgICBjb250ZW50cyA9IGNvbnRlbnRzLmNvbmNhdChleHRyYUNvbnRlbnQpXG4gICAgfVxuICAgIHZhciByb3dBdHRycyA9IHt9XG4gICAgaWYgKGh0bWxDbGFzc0F0dHIpIHtcbiAgICAgIHJvd0F0dHJzLmNsYXNzTmFtZT0gaHRtbENsYXNzQXR0clxuICAgIH1cbiAgICByZXR1cm4gUmVhY3QuRE9NLmxpKHJvd0F0dHJzLCBjb250ZW50cylcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5faHRtbE91dHB1dChub3JtYWxSb3csIGVycm9yUm93LCBmYWxzZSlcbiAgfVxufSkoKVxuXG4vKipcbiAqIFJldHVybnMgdGhpcyBmb3JtIHJlbmRlcmVkIGFzIEhUTUwgJmx0O3AmZ3Q7cy5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmFzUCA9IChmdW5jdGlvbigpIHtcbiAgdmFyIG5vcm1hbFJvdyA9IGZ1bmN0aW9uKGxhYmVsLCBmaWVsZCwgaGVscFRleHQsIGVycm9ycywgaHRtbENsYXNzQXR0cixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhQ29udGVudCkge1xuICAgIHZhciBjb250ZW50cyA9IFtdXG4gICAgaWYgKGxhYmVsKSB7XG4gICAgICBjb250ZW50cy5wdXNoKGxhYmVsKVxuICAgIH1cbiAgICBjb250ZW50cy5wdXNoKCcgJylcbiAgICBjb250ZW50cy5wdXNoKGZpZWxkKVxuICAgIGlmIChoZWxwVGV4dCkge1xuICAgICAgY29udGVudHMucHVzaCgnICcpXG4gICAgICBjb250ZW50cy5wdXNoKGhlbHBUZXh0KVxuICAgIH1cbiAgICBpZiAoZXh0cmFDb250ZW50KSB7XG4gICAgICBjb250ZW50cyA9IGNvbnRlbnRzLmNvbmNhdChleHRyYUNvbnRlbnQpXG4gICAgfVxuXG4gICAgdmFyIHJvd0F0dHJzID0ge31cbiAgICBpZiAoaHRtbENsYXNzQXR0cikge1xuICAgICAgcm93QXR0cnMuY2xhc3NOYW1lPSBodG1sQ2xhc3NBdHRyXG4gICAgfVxuICAgIHJldHVybiBSZWFjdC5ET00ucChyb3dBdHRycywgY29udGVudHMpXG4gIH1cblxuICB2YXIgZXJyb3JSb3cgPSBmdW5jdGlvbihlcnJvcnMsIGV4dHJhQ29udGVudCwgaHRtbENsYXNzQXR0cikge1xuICAgIGlmIChleHRyYUNvbnRlbnQpIHtcbiAgICAgIHZhciBjb250ZW50cyA9IFtdXG4gICAgICBpZiAoZXJyb3JzKSB7XG4gICAgICAgIGNvbnRlbnRzLnB1c2goZXJyb3JzKVxuICAgICAgfVxuICAgICAgY29udGVudHMgPSBjb250ZW50cy5jb25jYXQoZXh0cmFDb250ZW50KVxuICAgICAgdmFyIHJvd0F0dHJzID0ge31cbiAgICAgIGlmIChodG1sQ2xhc3NBdHRyKSB7XG4gICAgICAgIHJvd0F0dHJzWydjbGFzc05hbWUnXSA9IGh0bWxDbGFzc0F0dHJcbiAgICAgIH1cbiAgICAgIC8vIFdoZW4gcHJvdmlkZWQgZXh0cmFDb250ZW50IGlzIHVzdWFsbHkgaGlkZGVuIGZpZWxkcywgc28gd2UgbmVlZFxuICAgICAgLy8gdG8gZ2l2ZSBpdCBhIGJsb2NrIHNjb3BlIHdyYXBwZXIgaW4gdGhpcyBjYXNlIGZvciBIVE1MIHZhbGlkaXR5LlxuICAgICAgcmV0dXJuIFJlYWN0LkRPTS5kaXYocm93QXR0cnMsIGNvbnRlbnRzKVxuICAgIH1cbiAgICAvLyBPdGhlcndpc2UsIGp1c3QgZGlzcGxheSBlcnJvcnMgYXMgdGhleSBhcmVcbiAgICByZXR1cm4gZXJyb3JzXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2h0bWxPdXRwdXQobm9ybWFsUm93LCBlcnJvclJvdywgdHJ1ZSlcbiAgfVxufSkoKVxuXG4vKipcbiAqIFJldHVybnMgZXJyb3JzIHRoYXQgYXJlbid0IGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY3VsYXIgZmllbGQuXG4gKlxuICogQHJldHVybiBlcnJvcnMgdGhhdCBhcmVuJ3QgYXNzb2NpYXRlZCB3aXRoIGEgcGFydGljdWxhciBmaWVsZCAtIGkuZS4sIGVycm9yc1xuICogICAgICAgICBnZW5lcmF0ZWQgYnkgPGNvZGU+Y2xlYW4oKTwvY29kZT4uIFdpbGwgYmUgZW1wdHkgaWYgdGhlcmUgYXJlIG5vbmUuXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5ub25GaWVsZEVycm9ycyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gKHRoaXMuZXJyb3JzKE5PTl9GSUVMRF9FUlJPUlMpIHx8IG5ldyB0aGlzLmVycm9yQ29uc3RydWN0b3IoKSlcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSByYXcgdmFsdWUgZm9yIGEgcGFydGljdWxhciBmaWVsZCBuYW1lLiBUaGlzIGlzIGp1c3QgYSBjb252ZW5pZW50XG4gKiB3cmFwcGVyIGFyb3VuZCB3aWRnZXQudmFsdWVGcm9tRGF0YS5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLl9yYXdWYWx1ZSA9IGZ1bmN0aW9uKGZpZWxkbmFtZSkge1xuICB2YXIgZmllbGQgPSB0aGlzLmZpZWxkc1tmaWVsZG5hbWVdXG4gICAgLCBwcmVmaXggPSB0aGlzLmFkZFByZWZpeChmaWVsZG5hbWUpXG4gIHJldHVybiBmaWVsZC53aWRnZXQudmFsdWVGcm9tRGF0YSh0aGlzLmRhdGEsIHRoaXMuZmlsZXMsIHByZWZpeClcbn1cblxuLyoqXG4gKiBDbGVhbnMgYWxsIG9mIDxjb2RlPmRhdGE8L2NvZGU+IGFuZCBwb3B1bGF0ZXMgPGNvZGU+X2Vycm9yczwvY29kZT4gYW5kXG4gKiA8Y29kZT5jbGVhbmVkRGF0YTwvY29kZT4uXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5mdWxsQ2xlYW4gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fZXJyb3JzID0gRXJyb3JPYmplY3QoKVxuICBpZiAoIXRoaXMuaXNCb3VuZCkge1xuICAgIHJldHVybjsgLy8gU3RvcCBmdXJ0aGVyIHByb2Nlc3NpbmdcbiAgfVxuXG4gIHRoaXMuY2xlYW5lZERhdGEgPSB7fVxuXG4gIC8vIElmIHRoZSBmb3JtIGlzIHBlcm1pdHRlZCB0byBiZSBlbXB0eSwgYW5kIG5vbmUgb2YgdGhlIGZvcm0gZGF0YSBoYXNcbiAgLy8gY2hhbmdlZCBmcm9tIHRoZSBpbml0aWFsIGRhdGEsIHNob3J0IGNpcmN1aXQgYW55IHZhbGlkYXRpb24uXG4gIGlmICh0aGlzLmVtcHR5UGVybWl0dGVkICYmICF0aGlzLmhhc0NoYW5nZWQoKSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdGhpcy5fY2xlYW5GaWVsZHMoKVxuICB0aGlzLl9jbGVhbkZvcm0oKVxuICB0aGlzLl9wb3N0Q2xlYW4oKVxuXG4gIGlmICh0aGlzLl9lcnJvcnMuaXNQb3B1bGF0ZWQoKSkge1xuICAgIGRlbGV0ZSB0aGlzLmNsZWFuZWREYXRhXG4gIH1cbn1cblxuQmFzZUZvcm0ucHJvdG90eXBlLl9jbGVhbkZpZWxkcyA9IGZ1bmN0aW9uKCkge1xuICBmb3IgKHZhciBuYW1lIGluIHRoaXMuZmllbGRzKVxuICB7XG4gICAgaWYgKCFvYmplY3QuaGFzT3duKHRoaXMuZmllbGRzLCBuYW1lKSkge1xuICAgICAgY29udGludWVcbiAgICB9XG5cbiAgICB2YXIgZmllbGQgPSB0aGlzLmZpZWxkc1tuYW1lXVxuICAgICAgICAvLyB2YWx1ZUZyb21EYXRhKCkgZ2V0cyB0aGUgZGF0YSBmcm9tIHRoZSBkYXRhIG9iamVjdHMuXG4gICAgICAgIC8vIEVhY2ggd2lkZ2V0IHR5cGUga25vd3MgaG93IHRvIHJldHJpZXZlIGl0cyBvd24gZGF0YSwgYmVjYXVzZSBzb21lXG4gICAgICAgIC8vIHdpZGdldHMgc3BsaXQgZGF0YSBvdmVyIHNldmVyYWwgSFRNTCBmaWVsZHMuXG4gICAgICAsIHZhbHVlID0gZmllbGQud2lkZ2V0LnZhbHVlRnJvbURhdGEodGhpcy5kYXRhLCB0aGlzLmZpbGVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkUHJlZml4KG5hbWUpKVxuICAgIHRyeSB7XG4gICAgICBpZiAoZmllbGQgaW5zdGFuY2VvZiBGaWxlRmllbGQpIHtcbiAgICAgICAgdmFyIGluaXRpYWwgPSBvYmplY3QuZ2V0KHRoaXMuaW5pdGlhbCwgbmFtZSwgZmllbGQuaW5pdGlhbClcbiAgICAgICAgdmFsdWUgPSBmaWVsZC5jbGVhbih2YWx1ZSwgaW5pdGlhbClcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGZpZWxkLmNsZWFuKHZhbHVlKVxuICAgICAgfVxuICAgICAgdGhpcy5jbGVhbmVkRGF0YVtuYW1lXSA9IHZhbHVlXG5cbiAgICAgIC8vIFRyeSBjbGVhbl9uYW1lXG4gICAgICB2YXIgY3VzdG9tQ2xlYW4gPSAnY2xlYW5fJyArIG5hbWVcbiAgICAgIGlmICh0eXBlb2YgdGhpc1tjdXN0b21DbGVhbl0gIT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgICBpcy5GdW5jdGlvbih0aGlzW2N1c3RvbUNsZWFuXSkpIHtcbiAgICAgICAgIHRoaXMuY2xlYW5lZERhdGFbbmFtZV0gPSB0aGlzW2N1c3RvbUNsZWFuXSgpXG4gICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyBUcnkgY2xlYW5OYW1lXG4gICAgICBjdXN0b21DbGVhbiA9ICdjbGVhbicgKyBuYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICtcbiAgICAgICAgICAgICAgICAgICAgbmFtZS5zdWJzdHIoMSlcbiAgICAgIGlmICh0eXBlb2YgdGhpc1tjdXN0b21DbGVhbl0gIT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgICBpcy5GdW5jdGlvbih0aGlzW2N1c3RvbUNsZWFuXSkpIHtcbiAgICAgICAgdGhpcy5jbGVhbmVkRGF0YVtuYW1lXSA9IHRoaXNbY3VzdG9tQ2xlYW5dKClcbiAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7XG4gICAgICAgIHRocm93IGVcbiAgICAgIH1cbiAgICAgIHRoaXMuX2Vycm9ycy5zZXQobmFtZSwgbmV3IHRoaXMuZXJyb3JDb25zdHJ1Y3RvcihlLm1lc3NhZ2VzKSlcbiAgICAgIGlmICh0eXBlb2YgdGhpcy5jbGVhbmVkRGF0YVtuYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICBkZWxldGUgdGhpcy5jbGVhbmVkRGF0YVtuYW1lXVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5CYXNlRm9ybS5wcm90b3R5cGUuX2NsZWFuRm9ybSA9IGZ1bmN0aW9uKCkge1xuICB0cnkge1xuICAgIHRoaXMuY2xlYW5lZERhdGEgPSB0aGlzLmNsZWFuKClcbiAgfVxuICBjYXRjaCAoZSkge1xuICAgIGlmICghKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7XG4gICAgICB0aHJvdyBlXG4gICAgfVxuICAgIHRoaXMuX2Vycm9ycy5zZXQoTk9OX0ZJRUxEX0VSUk9SUyxcbiAgICAgICAgICAgICAgICAgICAgIG5ldyB0aGlzLmVycm9yQ29uc3RydWN0b3IoZS5tZXNzYWdlcykpXG4gIH1cbn1cblxuLyoqXG4gKiBBbiBpbnRlcm5hbCBob29rIGZvciBwZXJmb3JtaW5nIGFkZGl0aW9uYWwgY2xlYW5pbmcgYWZ0ZXIgZm9ybSBjbGVhbmluZyBpc1xuICogY29tcGxldGUuXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5fcG9zdENsZWFuID0gZnVuY3Rpb24oKSB7fVxuXG4vKipcbiAqIEhvb2sgZm9yIGRvaW5nIGFueSBleHRyYSBmb3JtLXdpZGUgY2xlYW5pbmcgYWZ0ZXIgZWFjaCBGaWVsZCdzXG4gKiA8Y29kZT5jbGVhbigpPC9jb2RlPiBoYXMgYmVlbiBjYWxsZWQuIEFueSB7QGxpbmsgVmFsaWRhdGlvbkVycm9yfSByYWlzZWQgYnlcbiAqIHRoaXMgbWV0aG9kIHdpbGwgbm90IGJlIGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY3VsYXIgZmllbGQ7IGl0IHdpbGwgaGF2ZSBhXG4gKiBzcGVjaWFsLWNhc2UgYXNzb2NpYXRpb24gd2l0aCB0aGUgZmllbGQgbmFtZWQgPGNvZGU+X19hbGxfXzwvY29kZT4uXG4gKlxuICogQHJldHVybiB2YWxpZGF0ZWQsIGNsZWFuZWQgZGF0YS5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmNsZWFuID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmNsZWFuZWREYXRhXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiBkYXRhIGRpZmZlcnMgZnJvbSBpbml0aWFsLlxuICovXG5CYXNlRm9ybS5wcm90b3R5cGUuaGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gKHRoaXMuY2hhbmdlZERhdGEoKS5sZW5ndGggPiAwKVxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhlIGZvcm0gbmVlZHMgdG8gYmUgbXVsdGlwYXJ0LWVuY3J5cHRlZCwgaW4gb3RoZXIgd29yZHMsIGlmIGl0XG4gKiBoYXMgYSB7QGxpbmsgRmlsZUlucHV0fS5cbiAqXG4gKiBAcmV0dXJuIDxjb2RlPnRydWU8L2NvZGU+IGlmIHRoZSBmb3JtIG5lZWRzIHRvIGJlIG11bHRpcGFydC1lbmNyeXB0ZWQsXG4gKiAgICAgICAgIDxjb2RlPmZhbHNlPC9jb2RlPiBvdGhlcndpc2UuXG4gKi9cbkJhc2VGb3JtLnByb3RvdHlwZS5pc011bHRpcGFydCA9IGZ1bmN0aW9uKCkge1xuICBmb3IgKHZhciBuYW1lIGluIHRoaXMuZmllbGRzKSB7XG4gICAgaWYgKG9iamVjdC5oYXNPd24odGhpcy5maWVsZHMsIG5hbWUpICYmXG4gICAgICAgIHRoaXMuZmllbGRzW25hbWVdLndpZGdldC5uZWVkc011bHRpcGFydEZvcm0pIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZVxufVxuXG4vKipcbiAqIFJldHVybnMgYSBsaXN0IG9mIGFsbCB0aGUge0BsaW5rIEJvdW5kRmllbGR9IG9iamVjdHMgdGhhdCBjb3JyZXNwb25kIHRvXG4gKiBoaWRkZW4gZmllbGRzLiBVc2VmdWwgZm9yIG1hbnVhbCBmb3JtIGxheW91dC5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLmhpZGRlbkZpZWxkcyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5ib3VuZEZpZWxkcyhmdW5jdGlvbihmaWVsZCkge1xuICAgIHJldHVybiBmaWVsZC53aWRnZXQuaXNIaWRkZW5cbiAgfSlcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbGlzdCBvZiB7QGxpbmsgQm91bmRGaWVsZH0gb2JqZWN0cyB0aGF0IGRvIG5vdCBjb3JyZXNwb25kIHRvXG4gKiBoaWRkZW4gZmllbGRzLiBUaGUgb3Bwb3NpdGUgb2YgdGhlIGhpZGRlbkZpZWxkcygpIG1ldGhvZC5cbiAqL1xuQmFzZUZvcm0ucHJvdG90eXBlLnZpc2libGVGaWVsZHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuYm91bmRGaWVsZHMoZnVuY3Rpb24oZmllbGQpIHtcbiAgICByZXR1cm4gIWZpZWxkLndpZGdldC5pc0hpZGRlblxuICB9KVxufVxuXG5mdW5jdGlvbiBEZWNsYXJhdGl2ZUZpZWxkc01ldGEocHJvdG90eXBlUHJvcHMsIGNvbnN0cnVjdG9yUHJvcHMpIHtcbiAgLy8gUG9wIGZpZWxkcyBmcm9tIHByb3RvdHlwZVByb3BzIHRvIGNvbnRyaWJ1dGUgdG93YXJkcyBiYXNlRmllbGRzXG4gIHZhciBmaWVsZHMgPSBbXVxuICBmb3IgKHZhciBuYW1lIGluIHByb3RvdHlwZVByb3BzKSB7XG4gICAgaWYgKG9iamVjdC5oYXNPd24ocHJvdG90eXBlUHJvcHMsIG5hbWUpICYmXG4gICAgICAgIHByb3RvdHlwZVByb3BzW25hbWVdIGluc3RhbmNlb2YgRmllbGQpIHtcbiAgICAgIGZpZWxkcy5wdXNoKFtuYW1lLCBwcm90b3R5cGVQcm9wc1tuYW1lXV0pXG4gICAgICBkZWxldGUgcHJvdG90eXBlUHJvcHNbbmFtZV1cbiAgICB9XG4gIH1cbiAgZmllbGRzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhWzFdLmNyZWF0aW9uQ291bnRlciAtIGJbMV0uY3JlYXRpb25Db3VudGVyXG4gIH0pXG5cbiAgLy8gSWYgYW55IG1peGlucyB3aGljaCBsb29rIGxpa2UgZm9ybSBjb25zdHJ1Y3RvcnMgd2VyZSBnaXZlbiwgaW5oZXJpdCB0aGVpclxuICAvLyBmaWVsZHMuXG4gIGlmIChvYmplY3QuaGFzT3duKHByb3RvdHlwZVByb3BzLCAnX19taXhpbl9fJykpIHtcbiAgICB2YXIgbWl4aW5zID0gcHJvdG90eXBlUHJvcHMuX19taXhpbl9fXG4gICAgaWYgKCFpcy5BcnJheShtaXhpbnMpKSB7XG4gICAgICBtaXhpbnMgPSBbbWl4aW5zXVxuICAgIH1cbiAgICAvLyBOb3RlIHRoYXQgd2UgbG9vcCBvdmVyIG1peGVkIGluIGZvcm1zIGluICpyZXZlcnNlKiB0byBwcmVzZXJ2ZSB0aGVcbiAgICAvLyBjb3JyZWN0IG9yZGVyIG9mIGZpZWxkcy5cbiAgICBmb3IgKHZhciBpID0gbWl4aW5zLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgbWl4aW4gPSBtaXhpbnNbaV1cbiAgICAgIGlmIChpcy5GdW5jdGlvbihtaXhpbikgJiZcbiAgICAgICAgICB0eXBlb2YgbWl4aW4ucHJvdG90eXBlLmJhc2VGaWVsZHMgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZmllbGRzID0gb2JqZWN0Lml0ZW1zKG1peGluLnByb3RvdHlwZS5iYXNlRmllbGRzKS5jb25jYXQoZmllbGRzKVxuICAgICAgICAvLyBSZXBsYWNlIHRoZSBtaXhpbiB3aXRoIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBvdGhlciBwcm90b3R5cGVcbiAgICAgICAgLy8gcHJvcGVydGllcywgdG8gYXZvaWQgb3ZlcndyaXRpbmcgYmFzZUZpZWxkcyB3aGVuIHRoZSBtaXhpbiBpc1xuICAgICAgICAvLyBhcHBsaWVkLlxuICAgICAgICB2YXIgZm9ybU1peGluID0gb2JqZWN0LmV4dGVuZCh7fSwgbWl4aW4ucHJvdG90eXBlKVxuICAgICAgICBkZWxldGUgZm9ybU1peGluLmJhc2VGaWVsZHNcbiAgICAgICAgbWl4aW5zW2ldID0gZm9ybU1peGluXG4gICAgICB9XG4gICAgfVxuICAgIHByb3RvdHlwZVByb3BzLl9fbWl4aW5fXyA9IG1peGluc1xuICB9XG5cbiAgLy8gSWYgd2UncmUgZXh0ZW5kaW5nIGZyb20gYSBmb3JtIHdoaWNoIGFscmVhZHkgaGFzIHNvbWUgYmFzZUZpZWxkcywgdGhleVxuICAvLyBzaG91bGQgYmUgZmlyc3QuXG4gIGlmICh0eXBlb2YgdGhpcy5iYXNlRmllbGRzICE9ICd1bmRlZmluZWQnKSB7XG4gICAgZmllbGRzID0gb2JqZWN0Lml0ZW1zKHRoaXMuYmFzZUZpZWxkcykuY29uY2F0KGZpZWxkcylcbiAgfVxuXG4gIC8vIFdoZXJlIC0+IGlzIFwib3ZlcnJpZGRlbiBieVwiOlxuICAvLyBwYXJlbnQgZmllbGRzIC0+IG1peGluIGZvcm0gZmllbGRzIC0+IGdpdmVuIGZpZWxkc1xuICBwcm90b3R5cGVQcm9wcy5iYXNlRmllbGRzID0gb2JqZWN0LmZyb21JdGVtcyhmaWVsZHMpXG59XG5cbnZhciBGb3JtID0gQmFzZUZvcm0uZXh0ZW5kKHtcbiAgX19tZXRhX186IERlY2xhcmF0aXZlRmllbGRzTWV0YVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIE5PTl9GSUVMRF9FUlJPUlM6IE5PTl9GSUVMRF9FUlJPUlNcbiwgQm91bmRGaWVsZDogQm91bmRGaWVsZFxuLCBCYXNlRm9ybTogQmFzZUZvcm1cbiwgRGVjbGFyYXRpdmVGaWVsZHNNZXRhOiBEZWNsYXJhdGl2ZUZpZWxkc01ldGFcbiwgRm9ybTogRm9ybVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29uY3VyID0gcmVxdWlyZSgnQ29uY3VyJylcbiAgLCBvYmplY3QgPSByZXF1aXJlKCdpc29tb3JwaC9vYmplY3QnKVxuICAsIHZhbGlkYXRvcnMgPSByZXF1aXJlKCd2YWxpZGF0b3JzJylcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuICAsIHdpZGdldHMgPSByZXF1aXJlKCcuL3dpZGdldHMnKVxuICAsIGZpZWxkcyA9IHJlcXVpcmUoJy4vZmllbGRzJylcbiAgLCBmb3JtcyA9IHJlcXVpcmUoJy4vZm9ybXMnKVxuXG52YXIgRXJyb3JMaXN0ID0gdXRpbC5FcnJvckxpc3RcbiAgLCBWYWxpZGF0aW9uRXJyb3IgPSB2YWxpZGF0b3JzLlZhbGlkYXRpb25FcnJvclxuICAsIEludGVnZXJGaWVsZCA9IGZpZWxkcy5JbnRlZ2VyRmllbGRcbiAgLCBCb29sZWFuRmllbGQgPSBmaWVsZHMuQm9vbGVhbkZpZWxkXG4gICwgSGlkZGVuSW5wdXQgPSB3aWRnZXRzLkhpZGRlbklucHV0XG5cbi8vIFNwZWNpYWwgZmllbGQgbmFtZXNcbnZhciBUT1RBTF9GT1JNX0NPVU5UID0gJ1RPVEFMX0ZPUk1TJ1xuICAsIElOSVRJQUxfRk9STV9DT1VOVCA9ICdJTklUSUFMX0ZPUk1TJ1xuICAsIE1BWF9OVU1fRk9STV9DT1VOVCA9ICdNQVhfTlVNX0ZPUk1TJ1xuICAsIE9SREVSSU5HX0ZJRUxEX05BTUUgPSAnT1JERVInXG4gICwgREVMRVRJT05fRklFTERfTkFNRSA9ICdERUxFVEUnXG5cbi8qKlxuICogTWFuYWdlbWVudEZvcm0gaXMgdXNlZCB0byBrZWVwIHRyYWNrIG9mIGhvdyBtYW55IGZvcm0gaW5zdGFuY2VzIGFyZSBkaXNwbGF5ZWRcbiAqIG9uIHRoZSBwYWdlLiBJZiBhZGRpbmcgbmV3IGZvcm1zIHZpYSBqYXZhc2NyaXB0LCB5b3Ugc2hvdWxkIGluY3JlbWVudCB0aGVcbiAqIGNvdW50IGZpZWxkIG9mIHRoaXMgZm9ybSBhcyB3ZWxsLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBNYW5hZ2VtZW50Rm9ybSA9IChmdW5jdGlvbigpIHtcbiAgdmFyIGZpZWxkcyA9IHt9XG4gIGZpZWxkc1tUT1RBTF9GT1JNX0NPVU5UXSA9IEludGVnZXJGaWVsZCh7d2lkZ2V0OiBIaWRkZW5JbnB1dH0pXG4gIGZpZWxkc1tJTklUSUFMX0ZPUk1fQ09VTlRdID0gSW50ZWdlckZpZWxkKHt3aWRnZXQ6IEhpZGRlbklucHV0fSlcbiAgZmllbGRzW01BWF9OVU1fRk9STV9DT1VOVF0gPSBJbnRlZ2VyRmllbGQoe3JlcXVpcmVkOiBmYWxzZSwgd2lkZ2V0OiBIaWRkZW5JbnB1dH0pXG4gIHJldHVybiBmb3Jtcy5Gb3JtLmV4dGVuZChmaWVsZHMpXG59KSgpXG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIGluc3RhbmNlcyBvZiB0aGUgc2FtZSBGb3JtLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgQmFzZUZvcm1TZXQgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgICAgZGF0YTogbnVsbCwgZmlsZXM6IG51bGwsIGF1dG9JZDogJ2lkX3tuYW1lfScsIHByZWZpeDogbnVsbCxcbiAgICAgIGluaXRpYWw6IG51bGwsIGVycm9yQ29uc3RydWN0b3I6IEVycm9yTGlzdCwgbWFuYWdlbWVudEZvcm1Dc3NDbGFzczogbnVsbFxuICAgIH0sIGt3YXJncylcbiAgICB0aGlzLmlzQm91bmQgPSBrd2FyZ3MuZGF0YSAhPT0gbnVsbCB8fCBrd2FyZ3MuZmlsZXMgIT09IG51bGxcbiAgICB0aGlzLnByZWZpeCA9IGt3YXJncy5wcmVmaXggfHwgQmFzZUZvcm1TZXQuZ2V0RGVmYXVsdFByZWZpeCgpXG4gICAgdGhpcy5hdXRvSWQgPSBrd2FyZ3MuYXV0b0lkXG4gICAgdGhpcy5kYXRhID0ga3dhcmdzLmRhdGEgfHwge31cbiAgICB0aGlzLmZpbGVzID0ga3dhcmdzLmZpbGVzIHx8IHt9XG4gICAgdGhpcy5pbml0aWFsID0ga3dhcmdzLmluaXRpYWxcbiAgICB0aGlzLmVycm9yQ29uc3RydWN0b3IgPSBrd2FyZ3MuZXJyb3JDb25zdHJ1Y3RvclxuICAgIHRoaXMubWFuYWdlbWVudEZvcm1Dc3NDbGFzcyA9IGt3YXJncy5tYW5hZ2VtZW50Rm9ybUNzc0NsYXNzXG4gICAgdGhpcy5fZXJyb3JzID0gbnVsbFxuICAgIHRoaXMuX25vbkZvcm1FcnJvcnMgPSBudWxsXG5cbiAgICAvLyBDb25zdHJ1Y3QgdGhlIGZvcm1zIGluIHRoZSBmb3Jtc2V0XG4gICAgdGhpcy5fY29uc3RydWN0Rm9ybXMoKVxuICB9XG59KVxuQmFzZUZvcm1TZXQuZ2V0RGVmYXVsdFByZWZpeCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ2Zvcm0nXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgTWFuYWdlbWVudEZvcm0gaW5zdGFuY2UgZm9yIHRoaXMgRm9ybVNldC5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLm1hbmFnZW1lbnRGb3JtID0gZnVuY3Rpb24oKSB7XG4gIHZhciBmb3JtXG4gIGlmICh0aGlzLmlzQm91bmQpIHtcbiAgICBmb3JtID0gbmV3IE1hbmFnZW1lbnRGb3JtKHtkYXRhOiB0aGlzLmRhdGEsIGF1dG9JZDogdGhpcy5hdXRvSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlZml4OiB0aGlzLnByZWZpeH0pXG4gICAgaWYgKCFmb3JtLmlzVmFsaWQoKSkge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKCdNYW5hZ2VtZW50Rm9ybSBkYXRhIGlzIG1pc3Npbmcgb3IgaGFzIGJlZW4gdGFtcGVyZWQgd2l0aCcpXG4gICAgfVxuICB9XG4gIGVsc2Uge1xuICAgIHZhciBpbml0aWFsID0ge31cbiAgICBpbml0aWFsW1RPVEFMX0ZPUk1fQ09VTlRdID0gdGhpcy50b3RhbEZvcm1Db3VudCgpXG4gICAgaW5pdGlhbFtJTklUSUFMX0ZPUk1fQ09VTlRdID0gdGhpcy5pbml0aWFsRm9ybUNvdW50KClcbiAgICBpbml0aWFsW01BWF9OVU1fRk9STV9DT1VOVF0gPSB0aGlzLm1heE51bVxuICAgIGZvcm0gPSBuZXcgTWFuYWdlbWVudEZvcm0oe2F1dG9JZDogdGhpcy5hdXRvSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlZml4OiB0aGlzLnByZWZpeCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0aWFsOiBpbml0aWFsfSlcbiAgfVxuICBpZiAodGhpcy5tYW5hZ2VtZW50Rm9ybUNzc0NsYXNzICE9PSBudWxsKSB7XG4gICAgZm9ybS5oaWRkZW5GaWVsZFJvd0Nzc0NsYXNzID0gdGhpcy5tYW5hZ2VtZW50Rm9ybUNzc0NsYXNzXG4gIH1cbiAgcmV0dXJuIGZvcm1cbn1cblxuQmFzZUZvcm1TZXQucHJvdG90eXBlLmluaXRpYWxGb3JtcyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5mb3Jtcy5zbGljZSgwLCB0aGlzLmluaXRpYWxGb3JtQ291bnQoKSlcbn1cblxuQmFzZUZvcm1TZXQucHJvdG90eXBlLmV4dHJhRm9ybXMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZm9ybXMuc2xpY2UodGhpcy5pbml0aWFsRm9ybUNvdW50KCkpXG59XG5cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5lbXB0eUZvcm0gPSBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgIGF1dG9JZDogdGhpcy5hdXRvSWQsXG4gICAgcHJlZml4OiB0aGlzLmFkZFByZWZpeCgnX19wcmVmaXhfXycpLFxuICAgIGVtcHR5UGVybWl0dGVkOiB0cnVlXG4gIH1cbiAgdmFyIGZvcm1Ld2FyZ3MgPSBvYmplY3QuZXh0ZW5kKGRlZmF1bHRzLCBrd2FyZ3MpXG4gIHZhciBmb3JtID0gbmV3IHRoaXMuZm9ybShmb3JtS3dhcmdzKVxuICB0aGlzLmFkZEZpZWxkcyhmb3JtLCBudWxsKVxuICByZXR1cm4gZm9ybVxufVxuXG4vKipcbiAqIFJldHVybnMgYSBsaXN0IG9mIGZvcm0uY2xlYW5lZERhdGEgb2JqZWN0cyBmb3IgZXZlcnkgZm9ybSBpbiB0aGlzLmZvcm1zLFxuICogZXhjZXB0IGZvciB0aG9zZSBpbiBmb3JtcyBtYXJrZWQgZm9yIGRlbGV0aW9uLlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUuY2xlYW5lZERhdGEgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLmlzVmFsaWQoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcih0aGlzLmNvbnN0cnVjdG9yLm5hbWUgK1xuICAgICAgICAgICAgICAgICAgICBcIiBvYmplY3QgaGFzIG5vIGF0dHJpYnV0ZSAnY2xlYW5lZERhdGEnXCIpXG4gIH1cbiAgdmFyIGNsZWFuZWQgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuZm9ybXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIGZvcm0gPSB0aGlzLmZvcm1zW2ldXG4gICAgaWYgKHRoaXMuY2FuRGVsZXRlKSB7XG4gICAgICAvLyBEb24ndCBhZGQgY2xlYW5lZERhdGEgZnJvbSBmb3JtcyBtYXJrZWQgZm9yIGRlbGV0aW9uXG4gICAgICBpZiAoIXRoaXMuX3Nob3VsZERlbGV0ZUZvcm0oZm9ybSkpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBkZWxldGlvbiBmaWVsZCB3ZSBhZGRlZCB0byB0aGUgZm9ybSBmcm9tIGl0cyBjbGVhbmVkRGF0YVxuICAgICAgICB2YXIgY2xlYW5lZERhdGEgPSBmb3JtLmNsZWFuZWREYXRhXG4gICAgICAgIGRlbGV0ZSBjbGVhbmVkRGF0YVtERUxFVElPTl9GSUVMRF9OQU1FXVxuICAgICAgICBjbGVhbmVkLnB1c2goY2xlYW5lZERhdGEpXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY2xlYW5lZC5wdXNoKGZvcm0uY2xlYW5lZERhdGEpXG4gICAgfVxuICB9XG4gIHJldHVybiBjbGVhbmVkXG59XG5cbi8qKlxuICogUmV0dXJucyBhIGxpc3Qgb2YgZm9ybXMgdGhhdCBoYXZlIGJlZW4gbWFya2VkIGZvciBkZWxldGlvbi4gVGhyb3dzIGFuXG4gKiBlcnJvciBpZiBkZWxldGlvbiBpcyBub3QgYWxsb3dlZC5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmRlbGV0ZWRGb3JtcyA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXRoaXMuaXNWYWxpZCgpIHx8ICF0aGlzLmNhbkRlbGV0ZSkge1xuICAgIHRocm93IG5ldyBFcnJvcih0aGlzLmNvbnN0cnVjdG9yLm5hbWUgK1xuICAgICAgICAgICAgICAgICAgICBcIiBvYmplY3QgaGFzIG5vIGF0dHJpYnV0ZSAnZGVsZXRlZEZvcm1zJ1wiKVxuICB9XG5cbiAgdmFyIGksIGxcblxuICAvLyBDb25zdHJ1Y3QgX2RlbGV0ZWRGb3JtSW5kZXhlcywgd2hpY2ggaXMganVzdCBhIGxpc3Qgb2YgZm9ybSBpbmRleGVzXG4gIC8vIHRoYXQgaGF2ZSBoYWQgdGhlaXIgZGVsZXRpb24gd2lkZ2V0IHNldCB0byB0cnVlLlxuICBpZiAodHlwZW9mIHRoaXMuX2RlbGV0ZWRGb3JtSW5kZXhlcyA9PSAndW5kZWZpbmVkJykge1xuICAgIHRoaXMuX2RlbGV0ZWRGb3JtSW5kZXhlcyA9IFtdXG4gICAgdmFyIHRvdGFsRm9ybUNvdW50ID0gdGhpcy50b3RhbEZvcm1Db3VudCgpXG4gICAgZm9yIChpID0gMDsgaSA8IHRvdGFsRm9ybUNvdW50OyBpKyspIHtcbiAgICAgIHZhciBmb3JtID0gdGhpcy5mb3Jtc1tpXVxuICAgICAgLy8gSWYgdGhpcyBpcyBhbiBleHRyYSBmb3JtIGFuZCBoYXNuJ3QgY2hhbmdlZCwgaWdub3JlIGl0XG4gICAgICBpZiAoaSA+PSB0aGlzLmluaXRpYWxGb3JtQ291bnQoKSAmJiAhZm9ybS5oYXNDaGFuZ2VkKCkpIHtcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl9zaG91bGREZWxldGVGb3JtKGZvcm0pKSB7XG4gICAgICAgIHRoaXMuX2RlbGV0ZWRGb3JtSW5kZXhlcy5wdXNoKGkpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdmFyIGRlbGV0ZWRGb3JtcyA9IFtdXG4gIGZvciAoaSA9IDAsIGwgPSB0aGlzLl9kZWxldGVkRm9ybUluZGV4ZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgZGVsZXRlZEZvcm1zLnB1c2godGhpcy5mb3Jtc1t0aGlzLl9kZWxldGVkRm9ybUluZGV4ZXNbaV1dKVxuICB9XG4gIHJldHVybiBkZWxldGVkRm9ybXNcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbGlzdCBvZiBmb3JtcyBpbiB0aGUgb3JkZXIgc3BlY2lmaWVkIGJ5IHRoZSBpbmNvbWluZyBkYXRhLlxuICogVGhyb3dzIGFuIEVycm9yIGlmIG9yZGVyaW5nIGlzIG5vdCBhbGxvd2VkLlxuICovXG5CYXNlRm9ybVNldC5wcm90b3R5cGUub3JkZXJlZEZvcm1zID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5pc1ZhbGlkKCkgfHwgIXRoaXMuY2FuT3JkZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5jb25zdHJ1Y3Rvci5uYW1lICtcbiAgICAgICAgICAgICAgICAgICAgXCIgb2JqZWN0IGhhcyBubyBhdHRyaWJ1dGUgJ29yZGVyZWRGb3JtcydcIilcbiAgfVxuXG4gIHZhciBpLCBsXG4gIC8vIENvbnN0cnVjdCBfb3JkZXJpbmcsIHdoaWNoIGlzIGEgbGlzdCBvZiBbZm9ybSBpbmRleCwgb3JkZXJGaWVsZFZhbHVlXVxuICAvLyBwYWlycy4gQWZ0ZXIgY29uc3RydWN0aW5nIHRoaXMgbGlzdCwgd2UnbGwgc29ydCBpdCBieSBvcmRlckZpZWxkVmFsdWVcbiAgLy8gc28gd2UgaGF2ZSBhIHdheSB0byBnZXQgdG8gdGhlIGZvcm0gaW5kZXhlcyBpbiB0aGUgb3JkZXIgc3BlY2lmaWVkIGJ5XG4gIC8vIHRoZSBmb3JtIGRhdGEuXG4gIGlmICh0eXBlb2YgdGhpcy5fb3JkZXJpbmcgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB0aGlzLl9vcmRlcmluZyA9IFtdXG4gICAgdmFyIHRvdGFsRm9ybUNvdW50ID0gdGhpcy50b3RhbEZvcm1Db3VudCgpXG4gICAgZm9yIChpID0gMDsgaSA8IHRvdGFsRm9ybUNvdW50OyBpKyspIHtcbiAgICAgIHZhciBmb3JtID0gdGhpcy5mb3Jtc1tpXVxuICAgICAgLy8gSWYgdGhpcyBpcyBhbiBleHRyYSBmb3JtIGFuZCBoYXNuJ3QgY2hhbmdlZCwgaWdub3JlIGl0XG4gICAgICBpZiAoaSA+PSB0aGlzLmluaXRpYWxGb3JtQ291bnQoKSAmJiAhZm9ybS5oYXNDaGFuZ2VkKCkpIHtcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIC8vIERvbid0IGFkZCBkYXRhIG1hcmtlZCBmb3IgZGVsZXRpb25cbiAgICAgIGlmICh0aGlzLmNhbkRlbGV0ZSAmJiB0aGlzLl9zaG91bGREZWxldGVGb3JtKGZvcm0pKSB7XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICB0aGlzLl9vcmRlcmluZy5wdXNoKFtpLCBmb3JtLmNsZWFuZWREYXRhW09SREVSSU5HX0ZJRUxEX05BTUVdXSlcbiAgICB9XG5cbiAgICAvLyBOdWxsIHNob3VsZCBiZSBzb3J0ZWQgYmVsb3cgYW55dGhpbmcgZWxzZS4gQWxsb3dpbmcgbnVsbCBhcyBhXG4gICAgLy8gY29tcGFyaXNvbiB2YWx1ZSBtYWtlcyBpdCBzbyB3ZSBjYW4gbGVhdmUgb3JkZXJpbmcgZmllbGRzIGJsYW5rLlxuICAgIHRoaXMuX29yZGVyaW5nLnNvcnQoZnVuY3Rpb24oeCwgeSkge1xuICAgICAgaWYgKHhbMV0gPT09IG51bGwgJiYgeVsxXSA9PT0gbnVsbCkge1xuICAgICAgICAvLyBTb3J0IGJ5IGZvcm0gaW5kZXggaWYgYm90aCBvcmRlciBmaWVsZCB2YWx1ZXMgYXJlIG51bGxcbiAgICAgICAgcmV0dXJuIHhbMF0gLSB5WzBdXG4gICAgICB9XG4gICAgICBpZiAoeFsxXSA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gMVxuICAgICAgfVxuICAgICAgaWYgKHlbMV0gPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIC0xXG4gICAgICB9XG4gICAgICByZXR1cm4geFsxXSAtIHlbMV1cbiAgICB9KVxuICB9XG5cbiAgdmFyIG9yZGVyZWRGb3JtcyA9IFtdXG4gIGZvciAoaSA9IDAsIGwgPSB0aGlzLl9vcmRlcmluZy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBvcmRlcmVkRm9ybXMucHVzaCh0aGlzLmZvcm1zW3RoaXMuX29yZGVyaW5nW2ldWzBdXSlcbiAgfVxuICByZXR1cm4gb3JkZXJlZEZvcm1zXG59XG5cbi8qKlxuICogUmV0dXJucyBhIGxpc3Qgb2YgZm9ybS5lcnJvcnMgZm9yIGV2ZXJ5IGZvcm0gaW4gdGhpcy5mb3Jtcy5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmVycm9ycyA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fZXJyb3JzID09PSBudWxsKSB7XG4gICAgdGhpcy5mdWxsQ2xlYW4oKVxuICB9XG4gIHJldHVybiB0aGlzLl9lcnJvcnNcbn1cblxuQmFzZUZvcm1TZXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5hc1RhYmxlKClcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBudW1iZXIgb2YgZm9ybSBpbnN0YW5jZXMgdGhpcyBmb3Jtc2V0IGNvbnRhaW5zLCBiYXNlZCBvblxuICogZWl0aGVyIHN1Ym1pdHRlZCBtYW5hZ2VtZW50IGRhdGEgb3IgaW5pdGlhbCBjb25maWd1cmF0aW9uLCBhcyBhcHByb3ByaWF0ZS5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLnRvdGFsRm9ybUNvdW50ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmlzQm91bmQpIHtcbiAgICByZXR1cm4gdGhpcy5tYW5hZ2VtZW50Rm9ybSgpLmNsZWFuZWREYXRhW1RPVEFMX0ZPUk1fQ09VTlRdXG4gIH1cbiAgZWxzZSB7XG4gICAgdmFyIGluaXRpYWxGb3JtcyA9IHRoaXMuaW5pdGlhbEZvcm1Db3VudCgpXG4gICAgICAsIHRvdGFsRm9ybXMgPSB0aGlzLmluaXRpYWxGb3JtQ291bnQoKSArIHRoaXMuZXh0cmFcbiAgICAvLyBBbGxvdyBhbGwgZXhpc3RpbmcgcmVsYXRlZCBvYmplY3RzL2lubGluZXMgdG8gYmUgZGlzcGxheWVkLCBidXQgZG9uJ3RcbiAgICAvLyBhbGxvdyBleHRyYSBiZXlvbmQgbWF4X251bS5cbiAgICBpZiAodGhpcy5tYXhOdW0gIT09IG51bGwgJiZcbiAgICAgICAgaW5pdGlhbEZvcm1zID4gdGhpcy5tYXhOdW0gJiZcbiAgICAgICAgdGhpcy5tYXhOdW0gPj0gMCkge1xuICAgICAgdG90YWxGb3JtcyA9IGluaXRpYWxGb3Jtc1xuICAgIH1cbiAgICBpZiAodGhpcy5tYXhOdW0gIT09IG51bGwgJiZcbiAgICAgICAgdG90YWxGb3JtcyA+IHRoaXMubWF4TnVtICYmXG4gICAgICAgIHRoaXMubWF4TnVtID49IDApIHtcbiAgICAgIHRvdGFsRm9ybXMgPSB0aGlzLm1heE51bVxuICAgIH1cbiAgICByZXR1cm4gdG90YWxGb3Jtc1xuICB9XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB0aGUgbnVtYmVyIG9mIGluaXRpYWwgZm9ybSBpbnN0YW5jZXMgdGhpcyBmb3Jtc2V0IGNvbnRhaW5zLCBiYXNlZFxuICogb24gZWl0aGVyIHN1Ym1pdHRlZCBtYW5hZ2VtZW50IGRhdGEgb3IgaW5pdGlhbCBjb25maWd1cmF0aW9uLCBhcyBhcHByb3ByaWF0ZS5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmluaXRpYWxGb3JtQ291bnQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuaXNCb3VuZCkge1xuICAgIHJldHVybiB0aGlzLm1hbmFnZW1lbnRGb3JtKCkuY2xlYW5lZERhdGFbSU5JVElBTF9GT1JNX0NPVU5UXVxuICB9XG4gIGVsc2Uge1xuICAgIC8vIFVzZSB0aGUgbGVuZ3RoIG9mIHRoZSBpbml0YWwgZGF0YSBpZiBpdCdzIHRoZXJlLCAwIG90aGVyd2lzZS5cbiAgICB2YXIgaW5pdGlhbEZvcm1zID0gKHRoaXMuaW5pdGlhbCAhPT0gbnVsbCAmJiB0aGlzLmluaXRpYWwubGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgICAgICAgICAgPyB0aGlzLmluaXRpYWwubGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgICAgICA6IDApXG4gICAgaWYgKHRoaXMubWF4TnVtICE9PSBudWxsICYmXG4gICAgICAgIGluaXRpYWxGb3JtcyA+IHRoaXMubWF4TnVtICYmXG4gICAgICAgIHRoaXMubWF4TnVtID49IDApIHtcbiAgICAgIGluaXRpYWxGb3JtcyA9IHRoaXMubWF4TnVtXG4gICAgfVxuICAgIHJldHVybiBpbml0aWFsRm9ybXNcbiAgfVxufVxuXG4vKipcbiAqIEluc3RhbnRpYXRlcyBhbGwgdGhlIGZvcm1zIGFuZCBwdXQgdGhlbSBpbiA8Y29kZT50aGlzLmZvcm1zPC9jb2RlPi5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLl9jb25zdHJ1Y3RGb3JtcyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmZvcm1zID0gW11cbiAgdmFyIHRvdGFsRm9ybUNvdW50ID0gdGhpcy50b3RhbEZvcm1Db3VudCgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdG90YWxGb3JtQ291bnQ7IGkrKykge1xuICAgIHRoaXMuZm9ybXMucHVzaCh0aGlzLl9jb25zdHJ1Y3RGb3JtKGkpKVxuICB9XG59XG5cbi8qKlxuICogSW5zdGFudGlhdGVzIGFuZCByZXR1cm5zIHRoZSA8Y29kZT5pPC9jb2RlPnRoIGZvcm0gaW5zdGFuY2UgaW4gdGhlIGZvcm1zZXQuXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5fY29uc3RydWN0Rm9ybSA9IGZ1bmN0aW9uKGksIGt3YXJncykge1xuICB2YXIgZGVmYXVsdHMgPSB7YXV0b0lkOiB0aGlzLmF1dG9JZCwgcHJlZml4OiB0aGlzLmFkZFByZWZpeChpKX1cblxuICBpZiAodGhpcy5pc0JvdW5kKSB7XG4gICAgZGVmYXVsdHNbJ2RhdGEnXSA9IHRoaXMuZGF0YVxuICAgIGRlZmF1bHRzWydmaWxlcyddID0gdGhpcy5maWxlc1xuICB9XG5cbiAgaWYgKHRoaXMuaW5pdGlhbCAhPT0gbnVsbCAmJiB0aGlzLmluaXRpYWwubGVuZ3RoID4gMCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5pbml0aWFsW2ldICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICBkZWZhdWx0c1snaW5pdGlhbCddID0gdGhpcy5pbml0aWFsW2ldXG4gICAgfVxuICB9XG5cbiAgLy8gQWxsb3cgZXh0cmEgZm9ybXMgdG8gYmUgZW1wdHlcbiAgaWYgKGkgPj0gdGhpcy5pbml0aWFsRm9ybUNvdW50KCkpIHtcbiAgICBkZWZhdWx0c1snZW1wdHlQZXJtaXR0ZWQnXSA9IHRydWVcbiAgfVxuXG4gIHZhciBmb3JtS3dhcmdzID0gb2JqZWN0LmV4dGVuZChkZWZhdWx0cywga3dhcmdzKVxuICB2YXIgZm9ybSA9IG5ldyB0aGlzLmZvcm0oZm9ybUt3YXJncylcbiAgdGhpcy5hZGRGaWVsZHMoZm9ybSwgaSlcbiAgcmV0dXJuIGZvcm1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIEVycm9yTGlzdCBvZiBlcnJvcnMgdGhhdCBhcmVuJ3QgYXNzb2NpYXRlZCB3aXRoIGEgcGFydGljdWxhclxuICogZm9ybSAtLSBpLmUuLCBmcm9tIDxjb2RlPmZvcm1zZXQuY2xlYW4oKTwvY29kZT4uIFJldHVybnMgYW4gZW1wdHkgRXJyb3JMaXN0XG4gKiBpZiB0aGVyZSBhcmUgbm9uZS5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLm5vbkZvcm1FcnJvcnMgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX25vbkZvcm1FcnJvcnMgIT09IG51bGwpIHtcbiAgICByZXR1cm4gdGhpcy5fbm9uRm9ybUVycm9yc1xuICB9XG4gIHJldHVybiBuZXcgdGhpcy5lcnJvckNvbnN0cnVjdG9yKClcbn1cblxuQmFzZUZvcm1TZXQucHJvdG90eXBlLl9zaG91bGREZWxldGVGb3JtID0gZnVuY3Rpb24oZm9ybSkge1xuICBpZiAoIW9iamVjdC5oYXNPd24oZm9ybS5maWVsZHMsIERFTEVUSU9OX0ZJRUxEX05BTUUpKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgLy8gVGhlIHdheSB3ZSBsb29rdXAgdGhlIHZhbHVlIG9mIHRoZSBkZWxldGlvbiBmaWVsZCBoZXJlIHRha2VzXG4gIC8vIG1vcmUgY29kZSB0aGFuIHdlJ2QgbGlrZSwgYnV0IHRoZSBmb3JtJ3MgY2xlYW5lZERhdGEgd2lsbCBub3RcbiAgLy8gZXhpc3QgaWYgdGhlIGZvcm0gaXMgaW52YWxpZC5cbiAgdmFyIGZpZWxkID0gZm9ybS5maWVsZHNbREVMRVRJT05fRklFTERfTkFNRV1cbiAgICAsIHJhd1ZhbHVlID0gZm9ybS5fcmF3VmFsdWUoREVMRVRJT05fRklFTERfTkFNRSlcbiAgICAsIHNob3VsZERlbGV0ZSA9IGZpZWxkLmNsZWFuKHJhd1ZhbHVlKVxuICByZXR1cm4gc2hvdWxkRGVsZXRlXG59XG5cbi8qKlxuICogUmV0dXJucyA8Y29kZT50cnVlPC9jb2RlPiBpZiA8Y29kZT5mb3JtLmVycm9yczwvY29kZT4gaXMgZW1wdHkgZm9yIGV2ZXJ5IGZvcm1cbiAqIGluIDxjb2RlPnRoaXMuZm9ybXM8L2NvZGU+XG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5pc1ZhbGlkID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5pc0JvdW5kKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBXZSBsb29wIG92ZXIgZXZlcnkgZm9ybS5lcnJvcnMgaGVyZSByYXRoZXIgdGhhbiBzaG9ydCBjaXJjdWl0aW5nIG9uIHRoZVxuICAvLyBmaXJzdCBmYWlsdXJlIHRvIG1ha2Ugc3VyZSB2YWxpZGF0aW9uIGdldHMgdHJpZ2dlcmVkIGZvciBldmVyeSBmb3JtLlxuICB2YXIgZm9ybXNWYWxpZCA9IHRydWVcbiAgICAsIGVycm9ycyA9IHRoaXMuZXJyb3JzKCkgLy8gVHJpZ2dlcnMgZnVsbENsZWFuKClcbiAgICAsIHRvdGFsRm9ybUNvdW50ID0gdGhpcy50b3RhbEZvcm1Db3VudCgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdG90YWxGb3JtQ291bnQ7IGkrKykge1xuICAgIHZhciBmb3JtID0gdGhpcy5mb3Jtc1tpXVxuICAgIGlmICh0aGlzLmNhbkRlbGV0ZSAmJiB0aGlzLl9zaG91bGREZWxldGVGb3JtKGZvcm0pKSB7XG4gICAgICAvLyBUaGlzIGZvcm0gaXMgZ29pbmcgdG8gYmUgZGVsZXRlZCBzbyBhbnkgb2YgaXRzIGVycm9ycyBzaG91bGRcbiAgICAgIC8vIG5vdCBjYXVzZSB0aGUgZW50aXJlIGZvcm1zZXQgdG8gYmUgaW52YWxpZC5cbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIGlmIChlcnJvcnNbaV0uaXNQb3B1bGF0ZWQoKSkge1xuICAgICAgZm9ybXNWYWxpZCA9IGZhbHNlXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIChmb3Jtc1ZhbGlkICYmICF0aGlzLm5vbkZvcm1FcnJvcnMoKS5pc1BvcHVsYXRlZCgpKVxufVxuXG4vKipcbiAqIENsZWFucyBhbGwgb2YgPGNvZGU+dGhpcy5kYXRhPC9jb2RlPiBhbmQgcG9wdWxhdGVzIDxjb2RlPnRoaXMuX2Vycm9yczwvY29kZT4uXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5mdWxsQ2xlYW4gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fZXJyb3JzID0gW11cbiAgaWYgKCF0aGlzLmlzQm91bmQpIHtcbiAgICByZXR1cm47IC8vIFN0b3AgZnVydGhlciBwcm9jZXNzaW5nXG4gIH1cblxuICB2YXIgdG90YWxGb3JtQ291bnQgPSB0aGlzLnRvdGFsRm9ybUNvdW50KClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b3RhbEZvcm1Db3VudDsgaSsrKSB7XG4gICAgdmFyIGZvcm0gPSB0aGlzLmZvcm1zW2ldXG4gICAgdGhpcy5fZXJyb3JzLnB1c2goZm9ybS5lcnJvcnMoKSlcbiAgfVxuXG4gIC8vIEdpdmUgdGhpcy5jbGVhbigpIGEgY2hhbmNlIHRvIGRvIGNyb3NzLWZvcm0gdmFsaWRhdGlvbi5cbiAgdHJ5IHtcbiAgICB0aGlzLmNsZWFuKClcbiAgfVxuICBjYXRjaCAoZSkge1xuICAgIGlmICghKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpKSB7XG4gICAgICB0aHJvdyBlXG4gICAgfVxuICAgIHRoaXMuX25vbkZvcm1FcnJvcnMgPSBuZXcgdGhpcy5lcnJvckNvbnN0cnVjdG9yKGUubWVzc2FnZXMpXG4gIH1cbn1cblxuLyoqXG4gKiBIb29rIGZvciBkb2luZyBhbnkgZXh0cmEgZm9ybXNldC13aWRlIGNsZWFuaW5nIGFmdGVyIEZvcm0uY2xlYW4oKSBoYXMgYmVlblxuICogY2FsbGVkIG9uIGV2ZXJ5IGZvcm0uIEFueSBWYWxpZGF0aW9uRXJyb3IgcmFpc2VkIGJ5IHRoaXMgbWV0aG9kIHdpbGwgbm90IGJlXG4gKiBhc3NvY2lhdGVkIHdpdGggYSBwYXJ0aWN1bGFyIGZvcm07IGl0IHdpbGwgYmUgYWNjZXNpYmxlIHZpYVxuICogZm9ybXNldC5ub25Gb3JtRXJyb3JzKClcbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmNsZWFuID0gZnVuY3Rpb24oKSB7fVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgZm9ybSBkaWZmZXJzIGZyb20gaW5pdGlhbC5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmhhc0NoYW5nZWQgPSBmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmZvcm1zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmICh0aGlzLmZvcm1zW2ldLmhhc0NoYW5nZWQoKSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogQSBob29rIGZvciBhZGRpbmcgZXh0cmEgZmllbGRzIG9uIHRvIGVhY2ggZm9ybSBpbnN0YW5jZS5cbiAqXG4gKiBAcGFyYW0ge0Zvcm19IGZvcm0gdGhlIGZvcm0gZmllbGRzIGFyZSB0byBiZSBhZGRlZCB0by5cbiAqIEBwYXJhbSB7TnVtYmVyfSBpbmRleCB0aGUgaW5kZXggb2YgdGhlIGdpdmVuIGZvcm0gaW4gdGhlIGZvcm1zZXQuXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5hZGRGaWVsZHMgPSBmdW5jdGlvbihmb3JtLCBpbmRleCkge1xuICBpZiAodGhpcy5jYW5PcmRlcikge1xuICAgIC8vIE9ubHkgcHJlLWZpbGwgdGhlIG9yZGVyaW5nIGZpZWxkIGZvciBpbml0aWFsIGZvcm1zXG4gICAgaWYgKGluZGV4ICE9PSBudWxsICYmIGluZGV4IDwgdGhpcy5pbml0aWFsRm9ybUNvdW50KCkpIHtcbiAgICAgIGZvcm0uZmllbGRzW09SREVSSU5HX0ZJRUxEX05BTUVdID1cbiAgICAgICAgICBJbnRlZ2VyRmllbGQoe2xhYmVsOiAnT3JkZXInLCBpbml0aWFsOiBpbmRleCArIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogZmFsc2V9KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGZvcm0uZmllbGRzW09SREVSSU5HX0ZJRUxEX05BTUVdID1cbiAgICAgICAgICBJbnRlZ2VyRmllbGQoe2xhYmVsOiAnT3JkZXInLCByZXF1aXJlZDogZmFsc2V9KVxuICAgIH1cbiAgfVxuXG4gIGlmICh0aGlzLmNhbkRlbGV0ZSAmJiBpbmRleCA8IHRoaXMuaW5pdGlhbEZvcm1Db3VudCgpKSB7XG4gICAgZm9ybS5maWVsZHNbREVMRVRJT05fRklFTERfTkFNRV0gPVxuICAgICAgICBCb29sZWFuRmllbGQoe2xhYmVsOiAnRGVsZXRlJywgcmVxdWlyZWQ6IGZhbHNlfSlcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGZvcm1zZXQgcHJlZml4IHdpdGggdGhlIGZvcm0gaW5kZXggYXBwZW5kZWQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4IHRoZSBpbmRleCBvZiBhIGZvcm0gaW4gdGhlIGZvcm1zZXQuXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5hZGRQcmVmaXggPSBmdW5jdGlvbihpbmRleCkge1xuICByZXR1cm4gdGhpcy5wcmVmaXggKyAnLScgKyBpbmRleFxufVxuXG4vKipcbiAqIFJldHVybnMgPGNvZGU+dHJ1ZTwvY29kZT4gaWYgdGhlIGZvcm1zZXQgbmVlZHMgdG8gYmUgbXVsdGlwYXJ0LWVuY3J5cHRlZCxcbiAqIGkuZS4gaXQgaGFzIEZpbGVJbnB1dC4gT3RoZXJ3aXNlLCA8Y29kZT5mYWxzZTwvY29kZT4uXG4gKi9cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5pc011bHRpcGFydCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gKHRoaXMuZm9ybXMubGVuZ3RoID4gMCAmJiB0aGlzLmZvcm1zWzBdLmlzTXVsdGlwYXJ0KCkpXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGZvcm1zZXQgcmVuZGVyZWQgYXMgSFRNTCAmbHQ7dHImZ3Q7cyAtIGV4Y2x1ZGluZyB0aGVcbiAqICZsdDt0YWJsZSZndDsmbHQ7L3RhYmxlJmd0Oy5cbiAqL1xuQmFzZUZvcm1TZXQucHJvdG90eXBlLmFzVGFibGUgPSBmdW5jdGlvbigpIHtcbiAgLy8gWFhYOiB0aGVyZSBpcyBubyBzZW1hbnRpYyBkaXZpc2lvbiBiZXR3ZWVuIGZvcm1zIGhlcmUsIHRoZXJlIHByb2JhYmx5XG4gIC8vIHNob3VsZCBiZS4gSXQgbWlnaHQgbWFrZSBzZW5zZSB0byByZW5kZXIgZWFjaCBmb3JtIGFzIGEgdGFibGUgcm93IHdpdGhcbiAgLy8gZWFjaCBmaWVsZCBhcyBhIHRkLlxuICB2YXIgcm93cyA9IHRoaXMubWFuYWdlbWVudEZvcm0oKS5hc1RhYmxlKHRydWUpXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5mb3Jtcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICByb3dzID0gcm93cy5jb25jYXQodGhpcy5mb3Jtc1tpXS5hc1RhYmxlKHRydWUpKVxuICB9XG4gIHJldHVybiByb3dzXG59XG5cbkJhc2VGb3JtU2V0LnByb3RvdHlwZS5hc1AgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJvd3MgPSB0aGlzLm1hbmFnZW1lbnRGb3JtKCkuYXNQKHRydWUpXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5mb3Jtcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICByb3dzID0gcm93cy5jb25jYXQodGhpcy5mb3Jtc1tpXS5hc1AodHJ1ZSkpXG4gIH1cbiAgcmV0dXJuIHJvd3Ncbn1cblxuQmFzZUZvcm1TZXQucHJvdG90eXBlLmFzVUwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJvd3MgPSB0aGlzLm1hbmFnZW1lbnRGb3JtKCkuYXNVTCh0cnVlKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuZm9ybXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgcm93cyA9IHJvd3MuY29uY2F0KHRoaXMuZm9ybXNbaV0uYXNVTCh0cnVlKSlcbiAgfVxuICByZXR1cm4gcm93c1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBGb3JtU2V0IGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gRm9ybSBjb25zdHJ1Y3Rvci5cbiAqIEBwYXJhbSB7Rm9ybX0gZm9ybVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xuZnVuY3Rpb24gZm9ybXNldEZhY3RvcnkoZm9ybSwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe1xuICAgIGZvcm1zZXQ6IEJhc2VGb3JtU2V0LCBleHRyYTogMSwgY2FuT3JkZXI6IGZhbHNlLCBjYW5EZWxldGU6IGZhbHNlLFxuICAgIG1heE51bTogbnVsbFxuICB9LCBrd2FyZ3MpXG5cbiAgdmFyIGZvcm1zZXQgPSBrd2FyZ3MuZm9ybXNldFxuICAgICwgZXh0cmEgPSBrd2FyZ3MuZXh0cmFcbiAgICAsIGNhbk9yZGVyID0ga3dhcmdzLmNhbk9yZGVyXG4gICAgLCBjYW5EZWxldGUgPSBrd2FyZ3MuY2FuRGVsZXRlXG4gICAgLCBtYXhOdW0gPSBrd2FyZ3MubWF4TnVtXG5cbiAgLy8gUmVtb3ZlIHNwZWNpYWwgcHJvcGVydGllcyBmcm9tIGt3YXJncywgYXMgdGhleSB3aWxsIG5vdyBiZSB1c2VkIHRvIGFkZFxuICAvLyBwcm9wZXJ0aWVzIHRvIHRoZSBwcm90b3R5cGUuXG4gIGRlbGV0ZSBrd2FyZ3MuZm9ybXNldFxuICBkZWxldGUga3dhcmdzLmV4dHJhXG4gIGRlbGV0ZSBrd2FyZ3MuY2FuT3JkZXJcbiAgZGVsZXRlIGt3YXJncy5jYW5EZWxldGVcbiAgZGVsZXRlIGt3YXJncy5tYXhOdW1cblxuICBrd2FyZ3MuY29uc3RydWN0b3IgPSBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICB0aGlzLmZvcm0gPSBmb3JtXG4gICAgdGhpcy5leHRyYSA9IGV4dHJhXG4gICAgdGhpcy5jYW5PcmRlciA9IGNhbk9yZGVyXG4gICAgdGhpcy5jYW5EZWxldGUgPSBjYW5EZWxldGVcbiAgICB0aGlzLm1heE51bSA9IG1heE51bVxuICAgIGZvcm1zZXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cblxuICB2YXIgZm9ybXNldENvbnN0cnVjdG9yID0gZm9ybXNldC5leHRlbmQoa3dhcmdzKVxuXG4gIHJldHVybiBmb3Jtc2V0Q29uc3RydWN0b3Jcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgZXZlcnkgZm9ybXNldCBpbiBmb3Jtc2V0cyBpcyB2YWxpZC5cbiAqL1xuZnVuY3Rpb24gYWxsVmFsaWQoZm9ybXNldHMpIHtcbiAgdmFyIHZhbGlkID0gdHJ1ZVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGZvcm1zZXRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmICghZm9ybXNldHNbaV0uaXNWYWxpZCgpKSB7XG4gICAgICAgIHZhbGlkID0gZmFsc2VcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbGlkXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBUT1RBTF9GT1JNX0NPVU5UOiBUT1RBTF9GT1JNX0NPVU5UXG4sIElOSVRJQUxfRk9STV9DT1VOVDogSU5JVElBTF9GT1JNX0NPVU5UXG4sIE1BWF9OVU1fRk9STV9DT1VOVDogTUFYX05VTV9GT1JNX0NPVU5UXG4sIE9SREVSSU5HX0ZJRUxEX05BTUU6IE9SREVSSU5HX0ZJRUxEX05BTUVcbiwgREVMRVRJT05fRklFTERfTkFNRTogREVMRVRJT05fRklFTERfTkFNRVxuLCBNYW5hZ2VtZW50Rm9ybTogTWFuYWdlbWVudEZvcm1cbiwgQmFzZUZvcm1TZXQ6IEJhc2VGb3JtU2V0XG4sIGZvcm1zZXRGYWN0b3J5OiBmb3Jtc2V0RmFjdG9yeVxuLCBhbGxWYWxpZDogYWxsVmFsaWRcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG9iamVjdCA9IHJlcXVpcmUoJ2lzb21vcnBoL29iamVjdCcpXG4gICwgdmFsaWRhdG9ycyA9IHJlcXVpcmUoJ3ZhbGlkYXRvcnMnKVxuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpXG4gICwgZmllbGRzID0gcmVxdWlyZSgnLi9maWVsZHMnKVxuXG52YXIgRmllbGQgPSBmaWVsZHMuRmllbGRcbiAgLCBWYWxpZGF0aW9uRXJyb3IgPSB2YWxpZGF0b3JzLlZhbGlkYXRpb25FcnJvclxuXG4vKipcbiAqIEEgbWVhbnMgb2YgaG9va2luZyBuZXdmb3JtcyB1cCB3aXRoIGluZm9ybWF0aW9uIGFib3V0IHlvdXIgbW9kZWwgbGF5ZXIuXG4gKi9cbnZhciBNb2RlbEludGVyZmFjZSA9IHtcbiAgLyoqXG4gICAqIFNldCB0byB0cnVlIGlmIGFuIGV4Y2VwdGlvbiBpcyB0aHJvd24gd2hlbiBhIG1vZGVsIGNhbid0IGJlIGZvdW5kLlxuICAgKi9cbiAgdGhyb3dzSWZOb3RGb3VuZDogdHJ1ZVxuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RvciBvZiBlcnJvciB0aHJvd24gd2hlbiBhIG1vZGVsIGNhbid0IGJlIGZvdW5kLiBBbnkgZXhjZXB0aW9uc1xuICAgKiB3aGljaCBkbyBub3QgaGF2ZSB0aGlzIGNvbnN0cnVjdG9yIHdpbGwgYmUgcmV0aHJvd24uXG4gICAqL1xuLCBub3RGb3VuZEVycm9yQ29uc3RydWN0b3I6IEVycm9yXG5cbiAgLyoqXG4gICAqIFZhbHVlIHJldHVybmVkIHRvIGluZGljYXRlIG5vdCBmb3VuZCwgaW5zdGVhZCBvZiB0aHJvd2luZyBhbiBleGNlcHRpb24uXG4gICAqL1xuLCBub3RGb3VuZFZhbHVlOiBudWxsXG5cbiAgLyoqXG4gICAqIEdpdmVuIGEgbW9kZWwgaW5zdGFuY2UsIHNob3VsZCByZXR1cm4gdGhlIGlkIHdoaWNoIHdpbGwgYmUgdXNlZCB0byBzZWFyY2hcbiAgICogZm9yIHZhbGlkIGNob2ljZXMgb24gc3VibWlzc2lvbi5cbiAgICovXG4sIHByZXBhcmVWYWx1ZTogZnVuY3Rpb24ob2JqKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgbXVzdCBpbXBsZW1lbnQgdGhlIGZvcm1zLk1vZGVsSW50ZXJmYWNlIG1ldGhvZHMgdG8gdXNlIE1vZGVsIGZpZWxkcycpXG4gIH1cblxuICAvKipcbiAgICogRmluZHMgYSBtb2RlbCBpbnN0YW5jZSBieSBpZCwgZ2l2ZW4gdGhlIG1vZGVsIHF1ZXJ5IHdoaWNoIHdhcyBwYXNzZWQgdG9cbiAgICogbmV3Zm9ybXMgYW5kIHRoZSBpZCBvZiB0aGUgc2VsZWN0ZWQgbW9kZWwuXG4gICAqL1xuLCBmaW5kQnlJZDogZnVuY3Rpb24obW9kZWxRdWVyeSwgaWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBtdXN0IGltcGxlbWVudCB0aGUgZm9ybXMuTW9kZWxJbnRlcmZhY2UgbWV0aG9kcyB0byB1c2UgTW9kZWwgZmllbGRzJylcbiAgfVxufVxuXG5mdW5jdGlvbiBNb2RlbFF1ZXJ5SXRlcmF0b3IoZmllbGQpIHtcbiAgdGhpcy5maWVsZCA9IGZpZWxkXG4gIHRoaXMubW9kZWxRdWVyeSA9IGZpZWxkLm1vZGVsUXVlcnlcbn1cblxuTW9kZWxRdWVyeUl0ZXJhdG9yLnByb3RvdHlwZS5fX2l0ZXJfXyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY2hvaWNlcyA9IFtdXG4gIGlmICh0aGlzLmZpZWxkLmVtcHR5TGFiZWwgIT09IG51bGwpIHtcbiAgICBjaG9pY2VzLnB1c2goWycnLCB0aGlzLmZpZWxkLmVtcHR5TGFiZWxdKVxuICB9XG4gIGlmICh0aGlzLmZpZWxkLmNhY2hlQ2hvaWNlcykge1xuICAgIGlmICh0aGlzLmZpZWxkLmNob2ljZUNhY2hlID09PSBudWxsKSB7XG4gICAgICB0aGlzLmZpZWxkLmNob2ljZUNhY2hlID0gY2hvaWNlcy5jb25jYXQodGhpcy5tb2RlbENob2ljZXMoKSlcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmllbGQuY2hvaWNlQ2FjaGVcbiAgfVxuICBlbHNlIHtcbiAgICByZXR1cm4gY2hvaWNlcy5jb25jYXQodGhpcy5tb2RlbENob2ljZXMoKSlcbiAgfVxufVxuXG4vKipcbiAqIENhbGxzIHRoZSBtb2RlbCBxdWVyeSBmdW5jdGlvbiBhbmQgY3JlYXRlcyBjaG9pY2VzIGZyb20gaXRzIHJlc3VsdHMuXG4gKi9cbk1vZGVsUXVlcnlJdGVyYXRvci5wcm90b3R5cGUubW9kZWxDaG9pY2VzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBpbnN0YW5jZXMgPSB1dGlsLml0ZXJhdGUodGhpcy5tb2RlbFF1ZXJ5KVxuICAgICwgY2hvaWNlcyA9IFtdXG4gIGZvciAodmFyIGkgPSAwLCBsID0gaW5zdGFuY2VzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGNob2ljZXMucHVzaCh0aGlzLmNob2ljZShpbnN0YW5jZXNbaV0pKVxuICB9XG4gIHJldHVybiBjaG9pY2VzXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGNob2ljZSBmcm9tIGEgc2luZ2xlIG1vZGVsIGluc3RhbmNlLlxuICovXG5Nb2RlbFF1ZXJ5SXRlcmF0b3IucHJvdG90eXBlLmNob2ljZSA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gW3RoaXMuZmllbGQucHJlcGFyZVZhbHVlKG9iaiksIHRoaXMuZmllbGQubGFiZWxGcm9tSW5zdGFuY2Uob2JqKV1cbn1cblxuLyoqXG4gKiBBIENob2ljZUZpZWxkIHdoaWNoIHJldHJpZXZlcyBpdHMgY2hvaWNlcyBhcyBvYmplY3RzIHJldHVybmVkIGJ5IGEgZ2l2ZW5cbiAqIGZ1bmN0aW9uLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7Q2hvaWNlRmllbGR9XG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBtb2RlbFF1ZXJ5XG4gKiBAcGFyYW0ge09iamVjdH0ga3dhcmdzXG4gKi9cbnZhciBNb2RlbENob2ljZUZpZWxkID0gZmllbGRzLkNob2ljZUZpZWxkLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihtb2RlbFF1ZXJ5LCBrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmllbGQpKSB7IHJldHVybiBuZXcgTW9kZWxDaG9pY2VGaWVsZChtb2RlbFF1ZXJ5LCBrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtcbiAgICAgIHJlcXVpcmVkOiB0cnVlLCBpbml0aWFsOiBudWxsLCBjYWNoZUNob2ljZXM6IGZhbHNlLCBlbXB0eUxhYmVsOiAnLS0tLS0tLS0tJyxcbiAgICAgIG1vZGVsSW50ZXJmYWNlOiBNb2RlbEludGVyZmFjZVxuICAgIH0sIGt3YXJncylcbiAgICBpZiAoa3dhcmdzLnJlcXVpcmVkID09PSB0cnVlICYmIGt3YXJncy5pbml0aWFsICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmVtcHR5TGFiZWwgPSBudWxsXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5lbXB0eUxhYmVsID0ga3dhcmdzLmVtcHR5TGFiZWxcbiAgICB9XG4gICAgdGhpcy5lbXB0eUxhYmVsID0ga3dhcmdzLmVtcHR5TGFiZWxcbiAgICB0aGlzLmNhY2hlQ2hvaWNlcyA9IGt3YXJncy5jYWNoZUNob2ljZXNcbiAgICB0aGlzLm1vZGVsSW50ZXJmYWNlID0ga3dhcmdzLm1vZGVsSW50ZXJmYWNlXG5cbiAgICAvLyBXZSBkb24ndCBuZWVkIHRoZSBDaG9pY2VGaWVsZCBjb25zdHJ1Y3RvciwgYXMgd2UndmUgYWxyZWFkeSBoYW5kbGVkIHNldHRpbmdcbiAgICAvLyBvZiBjaG9pY2VzLlxuICAgIEZpZWxkLmNhbGwodGhpcywga3dhcmdzKVxuXG4gICAgdGhpcy5zZXRNb2RlbFF1ZXJ5KG1vZGVsUXVlcnkpXG4gICAgdGhpcy5jaG9pY2VDYWNoZSA9IG51bGxcbiAgfVxufSlcbk1vZGVsQ2hvaWNlRmllbGQucHJvdG90eXBlLmRlZmF1bHRFcnJvck1lc3NhZ2VzID1cbiAgICBvYmplY3QuZXh0ZW5kKHt9LCBNb2RlbENob2ljZUZpZWxkLnByb3RvdHlwZS5kZWZhdWx0RXJyb3JNZXNzYWdlcywge1xuICAgICAgaW52YWxpZENob2ljZTogJ1NlbGVjdCBhIHZhbGlkIGNob2ljZS4gVGhhdCBjaG9pY2UgaXMgbm90IG9uZSBvZiB0aGUgYXZhaWxhYmxlIGNob2ljZXMuJ1xuICAgIH0pXG5cbk1vZGVsQ2hvaWNlRmllbGQucHJvdG90eXBlLmdldE1vZGVsUXVlcnkgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMubW9kZWxRdWVyeVxufVxuXG5Nb2RlbENob2ljZUZpZWxkLnByb3RvdHlwZS5zZXRNb2RlbFF1ZXJ5ID0gZnVuY3Rpb24obW9kZWxRdWVyeSkge1xuICB0aGlzLm1vZGVsUXVlcnkgPSBtb2RlbFF1ZXJ5XG4gIHRoaXMud2lkZ2V0LmNob2ljZXMgPSB0aGlzLmdldENob2ljZXMoKVxufVxuXG5Nb2RlbENob2ljZUZpZWxkLnByb3RvdHlwZS5nZXRDaG9pY2VzID0gZnVuY3Rpb24oKSB7XG4gIC8vIElmIHRoaXMuX2Nob2ljZXMgaXMgc2V0LCB0aGVuIHNvbWVib2R5IG11c3QgaGF2ZSBtYW51YWxseSBzZXQgdGhlbSB3aXRoXG4gIC8vIHRoZSBpbmhlcml0ZWQgc2V0Q2hvaWNlcyBtZXRob2QuXG4gIGlmICh0eXBlb2YgdGhpcy5fY2hvaWNlcyAhPSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiB0aGlzLl9jaG9pY2VzXG4gIH1cblxuICAvLyBPdGhlcndpc2UsIHJldHVybiBhbiBvYmplY3Qgd2hpY2ggY2FuIGJlIHVzZWQgd2l0aCBpdGVyYXRlKCkgdG8gZ2V0XG4gIC8vIGNob2ljZXMuXG4gIHJldHVybiBuZXcgTW9kZWxRdWVyeUl0ZXJhdG9yKHRoaXMpXG59XG5cbk1vZGVsQ2hvaWNlRmllbGQucHJvdG90eXBlLnByZXBhcmVWYWx1ZSA9IGZ1bmN0aW9uKG9iaikge1xuICB2YXIgdmFsdWUgPSBudWxsXG4gIGlmIChvYmogIT0gbnVsbCkge1xuICAgIHZhbHVlID0gdGhpcy5tb2RlbEludGVyZmFjZS5wcmVwYXJlVmFsdWUob2JqKVxuICB9XG4gIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgdmFsdWUgPSBGaWVsZC5wcm90b3R5cGUucHJlcGFyZVZhbHVlLmNhbGwodGhpcywgb2JqKVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBjaG9pY2UgbGFiZWwgZnJvbSBhIG1vZGVsIGluc3RhbmNlLlxuICovXG5Nb2RlbENob2ljZUZpZWxkLnByb3RvdHlwZS5sYWJlbEZyb21JbnN0YW5jZSA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gJycrb2JqXG59XG5cbk1vZGVsQ2hvaWNlRmllbGQucHJvdG90eXBlLnRvSmF2YVNjcmlwdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh2YWxpZGF0b3JzLmlzRW1wdHlWYWx1ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG4gIGlmICh0aGlzLm1vZGVsSW50ZXJmYWNlLnRocm93c0lmTm90Rm91bmQpIHtcbiAgICB0cnkge1xuICAgICAgdmFsdWUgPSB0aGlzLm1vZGVsSW50ZXJmYWNlLmZpbmRCeUlkKHRoaXMubW9kZWxRdWVyeSwgdmFsdWUpXG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBpZiAodGhpcy5tb2RlbEludGVyZmFjZS5ub3RGb3VuZEVycm9yQ29uc3RydWN0b3IgIT09IG51bGwgJiZcbiAgICAgICAgICAhKGUgaW5zdGFuY2VvZiB0aGlzLm1vZGVsSW50ZXJmYWNlLm5vdEZvdW5kRXJyb3JDb25zdHJ1Y3RvcikpIHtcbiAgICAgICAgdGhyb3cgZVxuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcih0aGlzLmVycm9yTWVzc2FnZXMuaW52YWxpZENob2ljZSlcbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgdmFsdWUgPSB0aGlzLm1vZGVsSW50ZXJmYWNlLmZpbmRCeUlkKHRoaXMubW9kZWxRdWVyeSwgdmFsdWUpXG4gICAgaWYgKHZhbHVlID09PSB0aGlzLm1vZGVsSW50ZXJmYWNlLm5vdEZvdW5kVmFsdWUpIHtcbiAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IodGhpcy5lcnJvck1lc3NhZ2VzLmludmFsaWRDaG9pY2UpXG4gICAgfVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG5Nb2RlbENob2ljZUZpZWxkLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBGaWVsZC5wcm90b3R5cGUudmFsaWRhdGUuY2FsbCh0aGlzLCB2YWx1ZSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIE1vZGVsSW50ZXJmYWNlOiBNb2RlbEludGVyZmFjZVxuLCBNb2RlbENob2ljZUZpZWxkOiBNb2RlbENob2ljZUZpZWxkXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBvYmplY3QgPSByZXF1aXJlKCdpc29tb3JwaC9vYmplY3QnKVxuICAsIHZhbGlkYXRvcnMgPSByZXF1aXJlKCd2YWxpZGF0b3JzJylcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuICAsIHdpZGdldHMgPSByZXF1aXJlKCcuL3dpZGdldHMnKVxuICAsIGZpZWxkcyA9IHJlcXVpcmUoJy4vZmllbGRzJylcbiAgLCBmb3JtcyA9IHJlcXVpcmUoJy4vZm9ybXMnKVxuICAsIGZvcm1zZXRzID0gcmVxdWlyZSgnLi9mb3Jtc2V0cycpXG4gICwgbW9kZWxzID0gcmVxdWlyZSgnLi9tb2RlbHMnKVxuXG5vYmplY3QuZXh0ZW5kKFxuICBtb2R1bGUuZXhwb3J0c1xuLCB7IFZhbGlkYXRpb25FcnJvcjogdmFsaWRhdG9ycy5WYWxpZGF0aW9uRXJyb3JcbiAgLCBFcnJvck9iamVjdDogdXRpbC5FcnJvck9iamVjdFxuICAsIEVycm9yTGlzdDogdXRpbC5FcnJvckxpc3RcbiAgLCBmb3JtRGF0YTogdXRpbC5mb3JtRGF0YVxuICAsIHV0aWw6IHtcbiAgICAgIGl0ZXJhdGU6IHV0aWwuaXRlcmF0ZVxuICAgICwgcHJldHR5TmFtZTogdXRpbC5wcmV0dHlOYW1lXG4gICAgfVxuICB9XG4sIHZhbGlkYXRvcnNcbiwgd2lkZ2V0c1xuLCBmaWVsZHNcbiwgZm9ybXNcbiwgZm9ybXNldHNcbiwgbW9kZWxzXG4pXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb25jdXIgPSByZXF1aXJlKCdDb25jdXInKVxuICAsIGlzID0gcmVxdWlyZSgnaXNvbW9ycGgvaXMnKVxuICAsIG9iamVjdCA9IHJlcXVpcmUoJ2lzb21vcnBoL29iamVjdCcpXG5cbnZhciBERUZBVUxUX0RBVEVfSU5QVVRfRk9STUFUUyA9IFtcbiAgICAgICclWS0lbS0lZCcgICAgICAgICAgICAgIC8vICcyMDA2LTEwLTI1J1xuICAgICwgJyVtLyVkLyVZJywgJyVtLyVkLyV5JyAgLy8gJzEwLzI1LzIwMDYnLCAnMTAvMjUvMDYnXG4gICAgLCAnJWIgJWQgJVknLCAnJWIgJWQsICVZJyAvLyAnT2N0IDI1IDIwMDYnLCAnT2N0IDI1LCAyMDA2J1xuICAgICwgJyVkICViICVZJywgJyVkICViLCAlWScgLy8gJzI1IE9jdCAyMDA2JywgJzI1IE9jdCwgMjAwNidcbiAgICAsICclQiAlZCAlWScsICclQiAlZCwgJVknIC8vICdPY3RvYmVyIDI1IDIwMDYnLCAnT2N0b2JlciAyNSwgMjAwNidcbiAgICAsICclZCAlQiAlWScsICclZCAlQiwgJVknIC8vICcyNSBPY3RvYmVyIDIwMDYnLCAnMjUgT2N0b2JlciwgMjAwNidcbiAgICBdXG4gICwgREVGQVVMVF9USU1FX0lOUFVUX0ZPUk1BVFMgPSBbXG4gICAgICAnJUg6JU06JVMnIC8vICcxNDozMDo1OSdcbiAgICAsICclSDolTScgICAgLy8gJzE0OjMwJ1xuICAgIF1cbiAgLCBERUZBVUxUX0RBVEVUSU1FX0lOUFVUX0ZPUk1BVFMgPSBbXG4gICAgICAnJVktJW0tJWQgJUg6JU06JVMnIC8vICcyMDA2LTEwLTI1IDE0OjMwOjU5J1xuICAgICwgJyVZLSVtLSVkICVIOiVNJyAgICAvLyAnMjAwNi0xMC0yNSAxNDozMCdcbiAgICAsICclWS0lbS0lZCcgICAgICAgICAgLy8gJzIwMDYtMTAtMjUnXG4gICAgLCAnJW0vJWQvJVkgJUg6JU06JVMnIC8vICcxMC8yNS8yMDA2IDE0OjMwOjU5J1xuICAgICwgJyVtLyVkLyVZICVIOiVNJyAgICAvLyAnMTAvMjUvMjAwNiAxNDozMCdcbiAgICAsICclbS8lZC8lWScgICAgICAgICAgLy8gJzEwLzI1LzIwMDYnXG4gICAgLCAnJW0vJWQvJXkgJUg6JU06JVMnIC8vICcxMC8yNS8wNiAxNDozMDo1OSdcbiAgICAsICclbS8lZC8leSAlSDolTScgICAgLy8gJzEwLzI1LzA2IDE0OjMwJ1xuICAgICwgJyVtLyVkLyV5JyAgICAgICAgICAvLyAnMTAvMjUvMDYnXG4gICAgXVxuXG4vKipcbiAqIEFsbG93cyBhbiBBcnJheSwgYW4gb2JqZWN0IHdpdGggYW4gX19pdGVyX18gbWV0aG9kIG9yIGEgZnVuY3Rpb24gd2hpY2hcbiAqIHJldHVybnMgb25lIGJlIHVzZWQgd2hlbiB1bHRpbWF0ZWx5IGV4cGVjdGluZyBhbiBBcnJheS5cbiAqL1xuZnVuY3Rpb24gaXRlcmF0ZShvKSB7XG4gIGlmIChpcy5BcnJheShvKSkge1xuICAgIHJldHVybiBvXG4gIH1cbiAgaWYgKGlzLkZ1bmN0aW9uKG8pKSB7XG4gICAgbyA9IG8oKVxuICB9XG4gIGlmIChvICE9IG51bGwgJiYgaXMuRnVuY3Rpb24oby5fX2l0ZXJfXykpIHtcbiAgICBvID0gby5fX2l0ZXJfXygpXG4gIH1cbiAgcmV0dXJuIG8gfHwgW11cbn1cblxuLyoqXG4gKiBDb252ZXJ0cyAnZmlyc3ROYW1lJyBhbmQgJ2ZpcnN0X25hbWUnIHRvICdGaXJzdCBuYW1lJywgYW5kXG4gKiAnU0hPVVRJTkdfTElLRV9USElTJyB0byAnU0hPVVRJTkcgTElLRSBUSElTJy5cbiAqL1xudmFyIHByZXR0eU5hbWUgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBjYXBzUkUgPSAvKFtBLVpdKykvZ1xuICAgICwgc3BsaXRSRSA9IC9bIF9dKy9cbiAgICAsIGFsbENhcHNSRSA9IC9eW0EtWl1bQS1aMC05XSskL1xuXG4gIHJldHVybiBmdW5jdGlvbihuYW1lKSB7XG4gICAgLy8gUHJlZml4IHNlcXVlbmNlcyBvZiBjYXBzIHdpdGggc3BhY2VzIGFuZCBzcGxpdCBvbiBhbGwgc3BhY2VcbiAgICAvLyBjaGFyYWN0ZXJzLlxuICAgIHZhciBwYXJ0cyA9IG5hbWUucmVwbGFjZShjYXBzUkUsICcgJDEnKS5zcGxpdChzcGxpdFJFKVxuXG4gICAgLy8gSWYgd2UgaGFkIGFuIGluaXRpYWwgY2FwLi4uXG4gICAgaWYgKHBhcnRzWzBdID09PSAnJykge1xuICAgICAgcGFydHMuc3BsaWNlKDAsIDEpXG4gICAgfVxuXG4gICAgLy8gR2l2ZSB0aGUgZmlyc3Qgd29yZCBhbiBpbml0aWFsIGNhcCBhbmQgYWxsIHN1YnNlcXVlbnQgd29yZHMgYW5cbiAgICAvLyBpbml0aWFsIGxvd2VyY2FzZSBpZiBub3QgYWxsIGNhcHMuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBwYXJ0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgIHBhcnRzWzBdID0gcGFydHNbMF0uY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgK1xuICAgICAgICAgICAgICAgICAgIHBhcnRzWzBdLnN1YnN0cigxKVxuICAgICAgfVxuICAgICAgZWxzZSBpZiAoIWFsbENhcHNSRS50ZXN0KHBhcnRzW2ldKSkge1xuICAgICAgICBwYXJ0c1tpXSA9IHBhcnRzW2ldLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICtcbiAgICAgICAgICAgICAgICAgICBwYXJ0c1tpXS5zdWJzdHIoMSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcGFydHMuam9pbignICcpXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDcmVhdGVzIGFuIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIGRhdGEgaGVsZCBpbiBhIGZvcm0uXG4gKlxuICogQHBhcmFtIGZvcm0gYSBmb3JtIG9iamVjdCBvciBhIDxjb2RlPlN0cmluZzwvY29kZT4gc3BlY2lmeWluZyBhIGZvcm0nc1xuICogICAgICAgIDxjb2RlPm5hbWU8L2NvZGU+IG9yIDxjb2RlPmlkPC9jb2RlPiBhdHRyaWJ1dGUuIElmIGFcbiAqICAgICAgICA8Y29kZT5TdHJpbmc8L2NvZGU+IGlzIGdpdmVuLCBuYW1lIGlzIHRyaWVkIGJlZm9yZSBpZCB3aGVuIGF0dGVtcHRpbmdcbiAqICAgICAgICB0byBmaW5kIHRoZSBmb3JtLlxuICpcbiAqIEByZXR1cm4gYW4gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgZGF0YSBwcmVzZW50IGluIHRoZSBmb3JtLiBJZiB0aGUgZm9ybVxuICogICAgICAgICBjb3VsZCBub3QgYmUgZm91bmQsIHRoaXMgb2JqZWN0IHdpbGwgYmUgZW1wdHkuXG4gKi9cbmZ1bmN0aW9uIGZvcm1EYXRhKGZvcm0pIHtcbiAgdmFyIGRhdGEgPSB7fVxuICBpZiAoaXMuU3RyaW5nKGZvcm0pKSB7XG4gICAgZm9ybSA9IGRvY3VtZW50LmZvcm1zW2Zvcm1dIHx8IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGZvcm0pXG4gIH1cbiAgaWYgKCFmb3JtKSB7XG4gICAgcmV0dXJuIGRhdGFcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gZm9ybS5lbGVtZW50cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgZWxlbWVudCA9IGZvcm0uZWxlbWVudHNbaV1cbiAgICAgICwgdHlwZSA9IGVsZW1lbnQudHlwZVxuICAgICAgLCB2YWx1ZSA9IG51bGxcblxuICAgIC8vIFJldHJpZXZlIHRoZSBlbGVtZW50J3MgdmFsdWUgKG9yIHZhbHVlcylcbiAgICBpZiAodHlwZSA9PSAnaGlkZGVuJyB8fCB0eXBlID09ICdwYXNzd29yZCcgfHwgdHlwZSA9PSAndGV4dCcgfHxcbiAgICAgICAgdHlwZSA9PSAndGV4dGFyZWEnIHx8ICgodHlwZSA9PSAnY2hlY2tib3gnIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgPT0gJ3JhZGlvJykgJiYgZWxlbWVudC5jaGVja2VkKSkge1xuICAgICAgdmFsdWUgPSBlbGVtZW50LnZhbHVlXG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgPT0gJ3NlbGVjdC1vbmUnKSB7XG4gICAgICB2YWx1ZSA9IGVsZW1lbnQub3B0aW9uc1tlbGVtZW50LnNlbGVjdGVkSW5kZXhdLnZhbHVlXG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgPT0gJ3NlbGVjdC1tdWx0aXBsZScpIHtcbiAgICAgIHZhbHVlID0gW11cbiAgICAgIGZvciAodmFyIGogPSAwLCBtID0gZWxlbWVudC5vcHRpb25zLmxlbmd0aDsgaiA8IG07IGorKykge1xuICAgICAgICBpZiAoZWxlbWVudC5vcHRpb25zW2pdLnNlbGVjdGVkKSB7XG4gICAgICAgICAgdmFsdWVbdmFsdWUubGVuZ3RoXSA9IGVsZW1lbnQub3B0aW9uc1tqXS52YWx1ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhbHVlID0gbnVsbFxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBhbnkgdmFsdWUgb2J0YWluZWQgdG8gdGhlIGRhdGEgb2JqZWN0XG4gICAgaWYgKHZhbHVlICE9PSBudWxsKSB7XG4gICAgICBpZiAob2JqZWN0Lmhhc093bihkYXRhLCBlbGVtZW50Lm5hbWUpKSB7XG4gICAgICAgIGlmIChpcy5BcnJheShkYXRhW2VsZW1lbnQubmFtZV0pKSB7XG4gICAgICAgICAgZGF0YVtlbGVtZW50Lm5hbWVdID0gZGF0YVtlbGVtZW50Lm5hbWVdLmNvbmNhdCh2YWx1ZSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkYXRhW2VsZW1lbnQubmFtZV0gPSBbZGF0YVtlbGVtZW50Lm5hbWVdLCB2YWx1ZV1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRhdGFbZWxlbWVudC5uYW1lXSA9IHZhbHVlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRhdGFcbn1cblxuLyoqXG4gKiBDb2VyY2VzIHRvIHN0cmluZyBhbmQgc3RyaXBzIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNwYWNlcy5cbiAqL1xuZnVuY3Rpb24gc3RyaXAocykge1xuICByZXR1cm4gKCcnK3MpLnJlcGxhY2UoLyheXFxzK3xcXHMrJCkvZywgJycpXG59XG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIGVycm9ycyB0aGF0IGtub3dzIGhvdyB0byBkaXNwbGF5IGl0c2VsZiBpbiB2YXJpb3VzIGZvcm1hdHMuXG4gKlxuICogVGhpcyBvYmplY3QncyBwcm9wZXJ0aWVzIGFyZSB0aGUgZmllbGQgbmFtZXMsIGFuZCBjb3JyZXNwb25kaW5nIHZhbHVlcyBhcmVcbiAqIHRoZSBlcnJvcnMuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBFcnJvck9iamVjdCA9IENvbmN1ci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oZXJyb3JzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEVycm9yT2JqZWN0KSkgeyByZXR1cm4gbmV3IEVycm9yT2JqZWN0KGVycm9ycykgfVxuICAgIHRoaXMuZXJyb3JzID0gZXJyb3JzIHx8IHt9XG4gIH1cbn0pXG5cbkVycm9yT2JqZWN0LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCBlcnJvcikge1xuICB0aGlzLmVycm9yc1tuYW1lXSA9IGVycm9yXG59XG5cbkVycm9yT2JqZWN0LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHJldHVybiB0aGlzLmVycm9yc1tuYW1lXVxufVxuXG5FcnJvck9iamVjdC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmFzVUwoKVxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgYW55IGVycm9ycyBhcmUgcHJlc2VudC5cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSA8Y29kZT50cnVlPC9jb2RlPiBpZiB0aGlzIG9iamVjdCBoYXMgaGFkIGFueSBwcm9wZXJ0aWVzXG4gKiAgICAgICAgICAgICAgICAgICBzZXQsIDxjb2RlPmZhbHNlPC9jb2RlPiBvdGhlcndpc2UuXG4gKi9cbkVycm9yT2JqZWN0LnByb3RvdHlwZS5pc1BvcHVsYXRlZCA9IGZ1bmN0aW9uKCkge1xuICBmb3IgKHZhciBuYW1lIGluIHRoaXMuZXJyb3JzKSB7XG4gICAgaWYgKG9iamVjdC5oYXNPd24odGhpcy5lcnJvcnMsIG5hbWUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBEaXNwbGF5cyBlcnJvciBkZXRhaWxzIGFzIGEgbGlzdC5cbiAqL1xuRXJyb3JPYmplY3QucHJvdG90eXBlLmFzVUwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGl0ZW1zID0gW11cbiAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLmVycm9ycykge1xuICAgIGlmIChvYmplY3QuaGFzT3duKHRoaXMuZXJyb3JzLCBuYW1lKSkge1xuICAgICAgaXRlbXMucHVzaChSZWFjdC5ET00ubGkobnVsbCwgbmFtZSwgdGhpcy5lcnJvcnNbbmFtZV0ucmVuZGVyKCkpKVxuICAgIH1cbiAgfVxuICBpZiAoIWl0ZW1zLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG4gIHJldHVybiBSZWFjdC5ET00udWwoe2NsYXNzTmFtZTogJ2Vycm9ybGlzdCd9LCBpdGVtcylcbn1cblxuLyoqXG4gKiBEaXNwbGF5cyBlcnJvciBkZXRhaWxzIGFzIHRleHQuXG4gKi9cbkVycm9yT2JqZWN0LnByb3RvdHlwZS5hc1RleHQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGl0ZW1zID0gW11cbiAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLmVycm9ycykge1xuICAgIGlmIChvYmplY3QuaGFzT3duKHRoaXMuZXJyb3JzLCBuYW1lKSkge1xuICAgICAgaXRlbXMucHVzaCgnKiAnICsgbmFtZSlcbiAgICAgIHZhciBlcnJvckxpc3QgPSB0aGlzLmVycm9yc1tuYW1lXVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBlcnJvckxpc3QuZXJyb3JzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpdGVtcy5wdXNoKCcgICogJyArIGVycm9yTGlzdC5lcnJvcnNbaV0pXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBpdGVtcy5qb2luKCdcXG4nKVxufVxuXG4vKipcbiAqIEEgbGlzdCBvZiBlcnJvcnMgd2hpY2gga25vd3MgaG93IHRvIGRpc3BsYXkgaXRzZWxmIGluIHZhcmlvdXMgZm9ybWF0cy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBbZXJyb3JzXSBhIGxpc3Qgb2YgZXJyb3JzLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBFcnJvckxpc3QgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGVycm9ycykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBFcnJvckxpc3QpKSB7IHJldHVybiBuZXcgRXJyb3JMaXN0KGVycm9ycykgfVxuICAgIHRoaXMuZXJyb3JzID0gZXJyb3JzIHx8IFtdXG4gIH1cbn0pXG5cbkVycm9yTGlzdC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmFzVUwoKVxufVxuXG4vKipcbiAqIEFkZHMgZXJyb3JzIGZyb20gYW5vdGhlciBFcnJvckxpc3QuXG4gKlxuICogQHBhcmFtIHtFcnJvckxpc3R9IGVycm9yTGlzdCBhbiBFcnJvckxpc3Qgd2hvc2UgZXJyb3JzIHNob3VsZCBiZSBhZGRlZC5cbiAqL1xuRXJyb3JMaXN0LnByb3RvdHlwZS5leHRlbmQgPSBmdW5jdGlvbihlcnJvckxpc3QpIHtcbiAgdGhpcy5lcnJvcnMgPSB0aGlzLmVycm9ycy5jb25jYXQoZXJyb3JMaXN0LmVycm9ycylcbn1cblxuLyoqXG4gKiBEaXNwbGF5cyBlcnJvcnMgYXMgYSBsaXN0LlxuICovXG5FcnJvckxpc3QucHJvdG90eXBlLmFzVUwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFJlYWN0LkRPTS51bCh7Y2xhc3NOYW1lOiAnZXJyb3JsaXN0J31cbiAgLCB0aGlzLmVycm9ycy5tYXAoZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgIHJldHVybiBSZWFjdC5ET00ubGkobnVsbCwgZXJyb3IpXG4gICAgfSlcbiAgKVxufVxuXG4vKipcbiAqIERpc3BsYXlzIGVycm9ycyBhcyB0ZXh0LlxuICovXG5FcnJvckxpc3QucHJvdG90eXBlLmFzVGV4dCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaXRlbXMgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuZXJyb3JzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGl0ZW1zLnB1c2goJyogJyArIHRoaXMuZXJyb3JzW2ldKVxuICB9XG4gIHJldHVybiBpdGVtcy5qb2luKCdcXG4nKVxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgYW55IGVycm9ycyBhcmUgcHJlc2VudC5cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSA8Y29kZT50cnVlPC9jb2RlPiBpZiB0aGlzIG9iamVjdCBjb250YWlucyBhbnkgZXJyb3JzXG4gKiAgICAgICAgICAgICAgICAgICA8Y29kZT5mYWxzZTwvY29kZT4gb3RoZXJ3aXNlLlxuICovXG5FcnJvckxpc3QucHJvdG90eXBlLmlzUG9wdWxhdGVkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmVycm9ycy5sZW5ndGggPiAwXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBERUZBVUxUX0RBVEVfSU5QVVRfRk9STUFUUzogREVGQVVMVF9EQVRFX0lOUFVUX0ZPUk1BVFNcbiwgREVGQVVMVF9USU1FX0lOUFVUX0ZPUk1BVFM6IERFRkFVTFRfVElNRV9JTlBVVF9GT1JNQVRTXG4sIERFRkFVTFRfREFURVRJTUVfSU5QVVRfRk9STUFUUzogREVGQVVMVF9EQVRFVElNRV9JTlBVVF9GT1JNQVRTXG4sIEVycm9yT2JqZWN0OiBFcnJvck9iamVjdFxuLCBFcnJvckxpc3Q6IEVycm9yTGlzdFxuLCBmb3JtRGF0YTogZm9ybURhdGFcbiwgaXRlcmF0ZTogaXRlcmF0ZVxuLCBwcmV0dHlOYW1lOiBwcmV0dHlOYW1lXG4sIHN0cmlwOiBzdHJpcFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29uY3VyID0gcmVxdWlyZSgnQ29uY3VyJylcbiAgLCBpcyA9IHJlcXVpcmUoJ2lzb21vcnBoL2lzJylcbiAgLCBmb3JtYXQgPSByZXF1aXJlKCdpc29tb3JwaC9mb3JtYXQnKS5mb3JtYXRPYmpcbiAgLCBvYmplY3QgPSByZXF1aXJlKCdpc29tb3JwaC9vYmplY3QnKVxuICAsIHRpbWUgPSByZXF1aXJlKCdpc29tb3JwaC90aW1lJylcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuXG4vKipcbiAqIFNvbWUgd2lkZ2V0cyBhcmUgbWFkZSBvZiBtdWx0aXBsZSBIVE1MIGVsZW1lbnRzIC0tIG5hbWVseSwgUmFkaW9TZWxlY3QuXG4gKiBUaGlzIHJlcHJlc2VudHMgdGhlIFwiaW5uZXJcIiBIVE1MIGVsZW1lbnQgb2YgYSB3aWRnZXQuXG4gKi9cbnZhciBTdWJXaWRnZXQgPSBDb25jdXIuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKHBhcmVudFdpZGdldCwgbmFtZSwgdmFsdWUsIGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTdWJXaWRnZXQpKSB7XG4gICAgICByZXR1cm4gbmV3IFN1YldpZGdldChwYXJlbnRXaWRnZXQsIG5hbWUsIHZhbHVlLCBrd2FyZ3MpXG4gICAgfVxuICAgIHRoaXMucGFyZW50V2lkZ2V0ID0gcGFyZW50V2lkZ2V0XG4gICAgdGhpcy5uYW1lID0gbmFtZVxuICAgIHRoaXMudmFsdWUgPSB2YWx1ZVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiBudWxsLCBjaG9pY2VzOiBbXX0sIGt3YXJncylcbiAgICB0aGlzLmF0dHJzID0ga3dhcmdzLmF0dHJzXG4gICAgdGhpcy5jaG9pY2VzID0ga3dhcmdzLmNob2ljZXNcbiAgfVxufSlcblxuU3ViV2lkZ2V0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGt3YXJncyA9IHthdHRyczogdGhpcy5hdHRyc31cbiAgaWYgKHRoaXMuY2hvaWNlcy5sZW5ndGgpIHtcbiAgICBrd2FyZ3MuY2hvaWNlcyA9IHRoaXMuY2hvaWNlc1xuICB9XG4gIHJldHVybiB0aGlzLnBhcmVudFdpZGdldC5yZW5kZXIodGhpcy5uYW1lLCB0aGlzLnZhbHVlLCBrd2FyZ3MpXG59XG5cbi8qKlxuICogQW4gSFRNTCBmb3JtIHdpZGdldC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFdpZGdldCA9IENvbmN1ci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7YXR0cnM6IG51bGx9LCBrd2FyZ3MpXG4gICAgdGhpcy5hdHRycyA9IG9iamVjdC5leHRlbmQoe30sIGt3YXJncy5hdHRycylcbiAgfVxuICAvKiogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoaXMgY29ycmVzcG9uZHMgdG8gYW4gPGlucHV0IHR5cGU9XCJoaWRkZW5cIj4uICovXG4sIGlzSGlkZGVuOiBmYWxzZVxuICAvKiogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoaXMgd2lkZ2V0IG5lZWRzIGEgbXVsdGlwYXJ0LWVuY29kZWQgZm9ybS4gKi9cbiwgbmVlZHNNdWx0aXBhcnRGb3JtOiBmYWxzZVxuLCBpc1JlcXVpcmVkOiBmYWxzZVxufSlcblxuLyoqXG4gKiBZaWVsZHMgYWxsIFwic3Vid2lkZ2V0c1wiIG9mIHRoaXMgd2lkZ2V0LiBVc2VkIG9ubHkgYnkgUmFkaW9TZWxlY3QgdG9cbiAqIGFsbG93IGFjY2VzcyB0byBpbmRpdmlkdWFsIDxpbnB1dCB0eXBlPVwicmFkaW9cIj4gYnV0dG9ucy5cbiAqXG4gKiBBcmd1bWVudHMgYXJlIHRoZSBzYW1lIGFzIGZvciByZW5kZXIoKS5cbiAqL1xuV2lkZ2V0LnByb3RvdHlwZS5zdWJXaWRnZXRzID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICByZXR1cm4gW1N1YldpZGdldCh0aGlzLCBuYW1lLCB2YWx1ZSwga3dhcmdzKV1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgV2lkZ2V0IHJlbmRlcmVkIGFzIEhUTUwuXG4gKlxuICogVGhlICd2YWx1ZScgZ2l2ZW4gaXMgbm90IGd1YXJhbnRlZWQgdG8gYmUgdmFsaWQgaW5wdXQsIHNvIHN1YmNsYXNzXG4gKiBpbXBsZW1lbnRhdGlvbnMgc2hvdWxkIHByb2dyYW0gZGVmZW5zaXZlbHkuXG4gKi9cbldpZGdldC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICB0aHJvdyBuZXcgRXJyb3IoJ0NvbnN0cnVjdG9ycyBleHRlbmRpbmcgbXVzdCBpbXBsZW1lbnQgYSByZW5kZXIoKSBtZXRob2QuJylcbn1cblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gZm9yIGJ1aWxkaW5nIGFuIGF0dHJpYnV0ZSBkaWN0aW9uYXJ5LlxuICovXG5XaWRnZXQucHJvdG90eXBlLmJ1aWxkQXR0cnMgPSBmdW5jdGlvbihleHRyYUF0dHJzLCBrd2FyZ3MpIHtcbiAgdmFyIGF0dHJzID0gb2JqZWN0LmV4dGVuZCh7fSwgdGhpcy5hdHRycywga3dhcmdzLCBleHRyYUF0dHJzKVxuICByZXR1cm4gYXR0cnNcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgYSB2YWx1ZSBmb3IgdGhpcyB3aWRnZXQgZnJvbSB0aGUgZ2l2ZW4gZGF0YS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSBmb3JtIGRhdGEuXG4gKiBAcGFyYW0ge09iamVjdH0gZmlsZXMgZmlsZSBkYXRhLlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgdGhlIGZpZWxkIG5hbWUgdG8gYmUgdXNlZCB0byByZXRyaWV2ZSBkYXRhLlxuICpcbiAqIEByZXR1cm4gYSB2YWx1ZSBmb3IgdGhpcyB3aWRnZXQsIG9yIDxjb2RlPm51bGw8L2NvZGU+IGlmIG5vIHZhbHVlIHdhc1xuICogICAgICAgICBwcm92aWRlZC5cbiAqL1xuV2lkZ2V0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhID0gZnVuY3Rpb24oZGF0YSwgZmlsZXMsIG5hbWUpIHtcbiAgcmV0dXJuIG9iamVjdC5nZXQoZGF0YSwgbmFtZSwgbnVsbClcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIGRhdGEgaGFzIGNoYW5nZWQgZnJvbSBpbml0aWFsLlxuICovXG5XaWRnZXQucHJvdG90eXBlLl9oYXNDaGFuZ2VkID0gZnVuY3Rpb24oaW5pdGlhbCwgZGF0YSkge1xuICAvLyBGb3IgcHVycG9zZXMgb2Ygc2VlaW5nIHdoZXRoZXIgc29tZXRoaW5nIGhhcyBjaGFuZ2VkLCBudWxsIGlzIHRoZSBzYW1lXG4gIC8vIGFzIGFuIGVtcHR5IHN0cmluZywgaWYgdGhlIGRhdGEgb3IgaW5pdGFsIHZhbHVlIHdlIGdldCBpcyBudWxsLCByZXBsYWNlXG4gIC8vIGl0IHdpdGggJycuXG4gIHZhciBkYXRhVmFsdWUgPSAoZGF0YSA9PT0gbnVsbCA/ICcnIDogZGF0YSlcbiAgdmFyIGluaXRpYWxWYWx1ZSA9IChpbml0aWFsID09PSBudWxsID8gJycgOiBpbml0aWFsKVxuICByZXR1cm4gKCcnK2luaXRpYWxWYWx1ZSAhPSAnJytkYXRhVmFsdWUpXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB0aGUgSFRNTCA8Y29kZT5pZDwvY29kZT4gYXR0cmlidXRlIG9mIHRoaXMgV2lkZ2V0IGZvciB1c2UgYnkgYVxuICogPGNvZGU+Jmx0O2xhYmVsJmd0OzwvY29kZT4sIGdpdmVuIHRoZSBpZCBvZiB0aGUgZmllbGQuXG4gKlxuICogVGhpcyBob29rIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIHNvbWUgd2lkZ2V0cyBoYXZlIG11bHRpcGxlIEhUTUwgZWxlbWVudHMgYW5kLFxuICogdGh1cywgbXVsdGlwbGUgaWRzLiBJbiB0aGF0IGNhc2UsIHRoaXMgbWV0aG9kIHNob3VsZCByZXR1cm4gYW4gSUQgdmFsdWUgdGhhdFxuICogY29ycmVzcG9uZHMgdG8gdGhlIGZpcnN0IGlkIGluIHRoZSB3aWRnZXQncyB0YWdzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBpZCBhIGZpZWxkIGlkLlxuICpcbiAqIEByZXR1cm4gdGhlIGlkIHdoaWNoIHNob3VsZCBiZSB1c2VkIGJ5IGEgPGNvZGU+Jmx0O2xhYmVsJmd0OzwvY29kZT4gZm9yIHRoaXNcbiAqICAgICAgICAgV2lkZ2V0LlxuICovXG5XaWRnZXQucHJvdG90eXBlLmlkRm9yTGFiZWwgPSBmdW5jdGlvbihpZCkge1xuICByZXR1cm4gaWRcbn1cblxuLyoqXG4gKiBBbiBIVE1MIDxpbnB1dD4gd2lkZ2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7V2lkZ2V0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIElucHV0ID0gV2lkZ2V0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IElucHV0KGt3YXJncykgfVxuICAgIFdpZGdldC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuICAvKiogVGhlIHR5cGUgYXR0cmlidXRlIG9mIHRoaXMgaW5wdXQuICovXG4sIGlucHV0VHlwZTogbnVsbFxufSlcblxuSW5wdXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7YXR0cnM6IG51bGx9LCBrd2FyZ3MpXG4gIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgIHZhbHVlID0gJydcbiAgfVxuICB2YXIgZmluYWxBdHRycyA9IHRoaXMuYnVpbGRBdHRycyhrd2FyZ3MuYXR0cnMsIHt0eXBlOiB0aGlzLmlucHV0VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZX0pXG4gIGlmICh2YWx1ZSAhPT0gJycpIHtcbiAgICAvLyBPbmx5IGFkZCB0aGUgdmFsdWUgYXR0cmlidXRlIGlmIHZhbHVlIGlzIG5vbi1lbXB0eVxuICAgIGZpbmFsQXR0cnMuZGVmYXVsdFZhbHVlID0gdmFsdWVcbiAgfVxuICByZXR1cm4gUmVhY3QuRE9NLmlucHV0KGZpbmFsQXR0cnMpXG59XG5cbi8qKlxuICogQW4gSFRNTCA8aW5wdXQgdHlwZT1cInRleHRcIj4gd2lkZ2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7SW5wdXR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgVGV4dElucHV0ID0gSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXaWRnZXQpKSB7IHJldHVybiBuZXcgVGV4dElucHV0KGt3YXJncykgfVxuICAgIElucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIGlucHV0VHlwZTogJ3RleHQnXG59KVxuXG4vKipcbiAqIEFuIEhUTUwgPGlucHV0IHR5cGU9XCJwYXNzd29yZFwiPiB3aWRnZXQuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtJbnB1dH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBQYXNzd29yZElucHV0ID0gSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXaWRnZXQpKSB7IHJldHVybiBuZXcgUGFzc3dvcmRJbnB1dChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtyZW5kZXJWYWx1ZTogZmFsc2V9LCBrd2FyZ3MpXG4gICAgSW5wdXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgdGhpcy5yZW5kZXJWYWx1ZSA9IGt3YXJncy5yZW5kZXJWYWx1ZVxuICB9XG4sIGlucHV0VHlwZTogJ3Bhc3N3b3JkJ1xufSlcblxuUGFzc3dvcmRJbnB1dC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICBpZiAoIXRoaXMucmVuZGVyVmFsdWUpIHtcbiAgICB2YWx1ZSA9ICcnXG4gIH1cbiAgcmV0dXJuIElucHV0LnByb3RvdHlwZS5yZW5kZXIuY2FsbCh0aGlzLCBuYW1lLCB2YWx1ZSwga3dhcmdzKVxufVxuXG4vKipcbiAqIEFuIEhUTUwgPGlucHV0IHR5cGU9XCJoaWRkZW5cIj4gd2lkZ2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7SW5wdXR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgSGlkZGVuSW5wdXQgPSBJbnB1dC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBIaWRkZW5JbnB1dChrd2FyZ3MpIH1cbiAgICBJbnB1dC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuLCBpbnB1dFR5cGU6ICdoaWRkZW4nXG4sIGlzSGlkZGVuOiB0cnVlXG59KVxuXG4vKipcbiAqIEEgd2lkZ2V0IHRoYXQgaGFuZGxlcyA8aW5wdXQgdHlwZT1cImhpZGRlblwiPiBmb3IgZmllbGRzIHRoYXQgaGF2ZSBhIGxpc3Qgb2ZcbiAqIHZhbHVlcy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0hpZGRlbklucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIE11bHRpcGxlSGlkZGVuSW5wdXQgPSBIaWRkZW5JbnB1dC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBNdWx0aXBsZUhpZGRlbklucHV0KGt3YXJncykgfVxuICAgIEhpZGRlbklucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuXG5NdWx0aXBsZUhpZGRlbklucHV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiBudWxsfSwga3dhcmdzKVxuICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICB2YWx1ZSA9IFtdXG4gIH1cbiAgdmFyIGZpbmFsQXR0cnMgPSB0aGlzLmJ1aWxkQXR0cnMoa3dhcmdzLmF0dHJzLCB7dHlwZTogdGhpcy5pbnB1dFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWV9KVxuICAgICwgaWQgPSBvYmplY3QuZ2V0KGZpbmFsQXR0cnMsICdpZCcsIG51bGwpXG4gICAgLCBpbnB1dHMgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBpbnB1dEF0dHJzID0gb2JqZWN0LmV4dGVuZCh7fSwgZmluYWxBdHRycywge3ZhbHVlOiB2YWx1ZVtpXX0pXG4gICAgaWYgKGlkKSB7XG4gICAgICAvLyBBbiBJRCBhdHRyaWJ1dGUgd2FzIGdpdmVuLiBBZGQgYSBudW1lcmljIGluZGV4IGFzIGEgc3VmZml4XG4gICAgICAvLyBzbyB0aGF0IHRoZSBpbnB1dHMgZG9uJ3QgYWxsIGhhdmUgdGhlIHNhbWUgSUQgYXR0cmlidXRlLlxuICAgICAgaW5wdXRBdHRycy5pZCA9IGZvcm1hdCgne2lkfV97aX0nLCB7aWQ6IGlkLCBpOiBpfSlcbiAgICB9XG4gICAgaW5wdXRzLnB1c2goUmVhY3QuRE9NLmlucHV0KGlucHV0QXR0cnMpKVxuICB9XG4gIHJldHVybiBSZWFjdC5ET00uZGl2KG51bGwsIGlucHV0cylcbn1cblxuTXVsdGlwbGVIaWRkZW5JbnB1dC5wcm90b3R5cGUudmFsdWVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGEsIGZpbGVzLCBuYW1lKSB7XG4gIGlmICh0eXBlb2YgZGF0YVtuYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBbXS5jb25jYXQoZGF0YVtuYW1lXSlcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG4vKipcbiAqIEFuIEhUTUwgPGlucHV0IHR5cGU9XCJmaWxlXCI+IHdpZGdldC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0lucHV0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIEZpbGVJbnB1dCA9IElucHV0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IEZpbGVJbnB1dChrd2FyZ3MpIH1cbiAgICBJbnB1dC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuLCBpbnB1dFR5cGU6ICdmaWxlJ1xuLCBuZWVkc011bHRpcGFydEZvcm06IHRydWVcbn0pXG5cbkZpbGVJbnB1dC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICByZXR1cm4gSW5wdXQucHJvdG90eXBlLnJlbmRlci5jYWxsKHRoaXMsIG5hbWUsIG51bGwsIGt3YXJncylcbn1cblxuLyoqXG4gKiBGaWxlIHdpZGdldHMgdGFrZSBkYXRhIGZyb20gPGNvZGU+ZmlsZXM8L2NvZGU+LCBub3QgPGNvZGU+ZGF0YTwvY29kZT4uXG4gKi9cbkZpbGVJbnB1dC5wcm90b3R5cGUudmFsdWVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGEsIGZpbGVzLCBuYW1lKSB7XG4gIHJldHVybiBvYmplY3QuZ2V0KGZpbGVzLCBuYW1lLCBudWxsKVxufVxuXG5GaWxlSW5wdXQucHJvdG90eXBlLl9oYXNDaGFuZ2VkID0gZnVuY3Rpb24oaW5pdGlhbCwgZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIHJldHVybiB0cnVlXG59XG5cbnZhciBGSUxFX0lOUFVUX0NPTlRSQURJQ1RJT04gPSB7fVxuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0ZpbGVJbnB1dH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBDbGVhcmFibGVGaWxlSW5wdXQgPSBGaWxlSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXaWRnZXQpKSB7IHJldHVybiBuZXcgQ2xlYXJhYmxlRmlsZUlucHV0KGt3YXJncykgfVxuICAgIEZpbGVJbnB1dC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxuLCBpbml0aWFsVGV4dDogJ0N1cnJlbnRseSdcbiwgaW5wdXRUZXh0OiAnQ2hhbmdlJ1xuLCBjbGVhckNoZWNrYm94TGFiZWw6ICdDbGVhcidcbn0pXG5cbi8qKlxuICogR2l2ZW4gdGhlIG5hbWUgb2YgdGhlIGZpbGUgaW5wdXQsIHJldHVybiB0aGUgbmFtZSBvZiB0aGUgY2xlYXIgY2hlY2tib3hcbiAqIGlucHV0LlxuICovXG5DbGVhcmFibGVGaWxlSW5wdXQucHJvdG90eXBlLmNsZWFyQ2hlY2tib3hOYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICByZXR1cm4gbmFtZSArICctY2xlYXInXG59XG5cbi8qKlxuICogR2l2ZW4gdGhlIG5hbWUgb2YgdGhlIGNsZWFyIGNoZWNrYm94IGlucHV0LCByZXR1cm4gdGhlIEhUTUwgaWQgZm9yIGl0LlxuICovXG5DbGVhcmFibGVGaWxlSW5wdXQucHJvdG90eXBlLmNsZWFyQ2hlY2tib3hJZCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuIG5hbWUgKyAnX2lkJ1xufVxuXG5DbGVhcmFibGVGaWxlSW5wdXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAgdmFyIGlucHV0ID0gRmlsZUlucHV0LnByb3RvdHlwZS5yZW5kZXIuY2FsbCh0aGlzLCBuYW1lLCB2YWx1ZSwga3dhcmdzKVxuICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlLnVybCAhPSAndW5kZWZpbmVkJykge1xuICAgIHZhciBjb250ZW50cyA9IFtcbiAgICAgIHRoaXMuaW5pdGlhbFRleHQsICc6ICdcbiAgICAsIFJlYWN0LkRPTS5hKHtocmVmOiB2YWx1ZS51cmx9LCAnJyt2YWx1ZSksICcgJ1xuICAgIF1cbiAgICBpZiAoIXRoaXMuaXNSZXF1aXJlZCkge1xuICAgICAgdmFyIGNsZWFyQ2hlY2tib3hOYW1lID0gdGhpcy5jbGVhckNoZWNrYm94TmFtZShuYW1lKVxuICAgICAgdmFyIGNsZWFyQ2hlY2tib3hJZCA9IHRoaXMuY2xlYXJDaGVja2JveElkKGNsZWFyQ2hlY2tib3hOYW1lKVxuICAgICAgY29udGVudHMgPSBjb250ZW50cy5jb25jYXQoW1xuICAgICAgICBDaGVja2JveElucHV0KCkucmVuZGVyKFxuICAgICAgICAgICAgY2xlYXJDaGVja2JveE5hbWUsIGZhbHNlLCB7YXR0cnM6IHsnaWQnOiBjbGVhckNoZWNrYm94SWR9fSlcbiAgICAgICwgJyAnXG4gICAgICAsIFJlYWN0LkRPTS5sYWJlbCh7aHRtbEZvcjogY2xlYXJDaGVja2JveElkfSwgdGhpcy5jbGVhckNoZWNrYm94TGFiZWwpXG4gICAgICBdKVxuICAgIH1cbiAgICBjb250ZW50cyA9IGNvbnRlbnRzLmNvbmNhdChbXG4gICAgICBSZWFjdC5ET00uYnIobnVsbClcbiAgICAsIHRoaXMuaW5wdXRUZXh0LCAnOiAnXG4gICAgLCBpbnB1dFxuICAgIF0pXG4gICAgcmV0dXJuIFJlYWN0LkRPTS5kaXYobnVsbCwgY29udGVudHMpXG4gIH1cbiAgZWxzZSB7XG4gICAgICByZXR1cm4gaW5wdXRcbiAgfVxufVxuXG5DbGVhcmFibGVGaWxlSW5wdXQucHJvdG90eXBlLnZhbHVlRnJvbURhdGEgPSBmdW5jdGlvbihkYXRhLCBmaWxlcywgbmFtZSkge1xuICB2YXIgdXBsb2FkID0gRmlsZUlucHV0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhKGRhdGEsIGZpbGVzLCBuYW1lKVxuICBpZiAoIXRoaXMuaXNSZXF1aXJlZCAmJlxuICAgICAgQ2hlY2tib3hJbnB1dCgpLnZhbHVlRnJvbURhdGEoZGF0YSwgZmlsZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyQ2hlY2tib3hOYW1lKG5hbWUpKSkge1xuICAgIGlmICh1cGxvYWQpIHtcbiAgICAgIC8vIElmIHRoZSB1c2VyIGNvbnRyYWRpY3RzIHRoZW1zZWx2ZXMgKHVwbG9hZHMgYSBuZXcgZmlsZSBBTkRcbiAgICAgIC8vIGNoZWNrcyB0aGUgXCJjbGVhclwiIGNoZWNrYm94KSwgd2UgcmV0dXJuIGEgdW5pcXVlIG1hcmtlclxuICAgICAgLy8gb2JqZWN0IHRoYXQgRmlsZUZpZWxkIHdpbGwgdHVybiBpbnRvIGEgVmFsaWRhdGlvbkVycm9yLlxuICAgICAgcmV0dXJuIEZJTEVfSU5QVVRfQ09OVFJBRElDVElPTlxuICAgIH1cbiAgICAvLyBmYWxzZSBzaWduYWxzIHRvIGNsZWFyIGFueSBleGlzdGluZyB2YWx1ZSwgYXMgb3Bwb3NlZCB0byBqdXN0IG51bGxcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICByZXR1cm4gdXBsb2FkXG59XG5cbi8qKlxuICogQSA8aW5wdXQgdHlwZT1cInRleHRcIj4gd2hpY2gsIGlmIGdpdmVuIGEgRGF0ZSBvYmplY3QgdG8gZGlzcGxheSwgZm9ybWF0cyBpdCBhc1xuICogYW4gYXBwcm9wcmlhdGUgZGF0ZSBTdHJpbmcuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtJbnB1dH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBEYXRlSW5wdXQgPSBJbnB1dC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBEYXRlSW5wdXQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7Zm9ybWF0OiBudWxsfSwga3dhcmdzKVxuICAgIElucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICAgIGlmIChrd2FyZ3MuZm9ybWF0ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmZvcm1hdCA9IGt3YXJncy5mb3JtYXRcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLmZvcm1hdCA9IHV0aWwuREVGQVVMVF9EQVRFX0lOUFVUX0ZPUk1BVFNbMF1cbiAgICB9XG4gIH1cbiwgaW5wdXRUeXBlOiAndGV4dCdcbn0pXG5cbkRhdGVJbnB1dC5wcm90b3R5cGUuX2Zvcm1hdFZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKGlzLkRhdGUodmFsdWUpKSB7XG4gICAgcmV0dXJuIHRpbWUuc3RyZnRpbWUodmFsdWUsIHRoaXMuZm9ybWF0KVxuICB9XG4gIHJldHVybiB2YWx1ZVxufVxuXG5EYXRlSW5wdXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAgdmFsdWUgPSB0aGlzLl9mb3JtYXRWYWx1ZSh2YWx1ZSlcbiAgcmV0dXJuIElucHV0LnByb3RvdHlwZS5yZW5kZXIuY2FsbCh0aGlzLCBuYW1lLCB2YWx1ZSwga3dhcmdzKVxufVxuXG5EYXRlSW5wdXQucHJvdG90eXBlLl9oYXNDaGFuZ2VkID0gZnVuY3Rpb24oaW5pdGlhbCwgZGF0YSkge1xuICByZXR1cm4gSW5wdXQucHJvdG90eXBlLl9oYXNDaGFuZ2VkLmNhbGwodGhpcywgdGhpcy5fZm9ybWF0VmFsdWUoaW5pdGlhbCksIGRhdGEpXG59XG5cbi8qKlxuICogQSA8aW5wdXQgdHlwZT1cInRleHRcIj4gd2hpY2gsIGlmIGdpdmVuIGEgRGF0ZSBvYmplY3QgdG8gZGlzcGxheSwgZm9ybWF0cyBpdCBhc1xuICogYW4gYXBwcm9wcmlhdGUgZGF0ZXRpbWUgU3RyaW5nLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7SW5wdXR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgRGF0ZVRpbWVJbnB1dCA9IElucHV0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IERhdGVUaW1lSW5wdXQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7Zm9ybWF0OiBudWxsfSwga3dhcmdzKVxuICAgIElucHV0LmNhbGwodGhpcywga3dhcmdzKVxuICAgIGlmIChrd2FyZ3MuZm9ybWF0ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmZvcm1hdCA9IGt3YXJncy5mb3JtYXRcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLmZvcm1hdCA9IHV0aWwuREVGQVVMVF9EQVRFVElNRV9JTlBVVF9GT1JNQVRTWzBdXG4gICAgfVxuICB9XG4sIGlucHV0VHlwZTogJ3RleHQnXG59KVxuXG5EYXRlVGltZUlucHV0LnByb3RvdHlwZS5fZm9ybWF0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAoaXMuRGF0ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdGltZS5zdHJmdGltZSh2YWx1ZSwgdGhpcy5mb3JtYXQpXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbkRhdGVUaW1lSW5wdXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAgdmFsdWUgPSB0aGlzLl9mb3JtYXRWYWx1ZSh2YWx1ZSlcbiAgcmV0dXJuIElucHV0LnByb3RvdHlwZS5yZW5kZXIuY2FsbCh0aGlzLCBuYW1lLCB2YWx1ZSwga3dhcmdzKVxufVxuXG5EYXRlVGltZUlucHV0LnByb3RvdHlwZS5faGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKGluaXRpYWwsIGRhdGEpIHtcbiAgcmV0dXJuIElucHV0LnByb3RvdHlwZS5faGFzQ2hhbmdlZC5jYWxsKHRoaXMsIHRoaXMuX2Zvcm1hdFZhbHVlKGluaXRpYWwpLCBkYXRhKVxufVxuXG4vKipcbiAqIEEgPGlucHV0IHR5cGU9XCJ0ZXh0XCI+IHdoaWNoLCBpZiBnaXZlbiBhIERhdGUgb2JqZWN0IHRvIGRpc3BsYXksIGZvcm1hdHMgaXQgYXNcbiAqIGFuIGFwcHJvcHJpYXRlIHRpbWUgU3RyaW5nLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7SW5wdXR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgVGltZUlucHV0ID0gSW5wdXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXaWRnZXQpKSB7IHJldHVybiBuZXcgVGltZUlucHV0KGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2Zvcm1hdDogbnVsbH0sIGt3YXJncylcbiAgICBJbnB1dC5jYWxsKHRoaXMsIGt3YXJncylcbiAgICBpZiAoa3dhcmdzLmZvcm1hdCAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5mb3JtYXQgPSBrd2FyZ3MuZm9ybWF0XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5mb3JtYXQgPSB1dGlsLkRFRkFVTFRfVElNRV9JTlBVVF9GT1JNQVRTWzBdXG4gICAgfVxuICB9XG4sIGlucHV0VHlwZTogJ3RleHQnXG59KVxuXG5UaW1lSW5wdXQucHJvdG90eXBlLl9mb3JtYXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmIChpcy5EYXRlKHZhbHVlKSkge1xuICAgIHJldHVybiB0aW1lLnN0cmZ0aW1lKHZhbHVlLCB0aGlzLmZvcm1hdClcbiAgfVxuICByZXR1cm4gdmFsdWVcbn1cblxuVGltZUlucHV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIHZhbHVlID0gdGhpcy5fZm9ybWF0VmFsdWUodmFsdWUpXG4gIHJldHVybiBJbnB1dC5wcm90b3R5cGUucmVuZGVyLmNhbGwodGhpcywgbmFtZSwgdmFsdWUsIGt3YXJncylcbn1cblxuVGltZUlucHV0LnByb3RvdHlwZS5faGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKGluaXRpYWwsIGRhdGEpIHtcbiAgcmV0dXJuIElucHV0LnByb3RvdHlwZS5faGFzQ2hhbmdlZC5jYWxsKHRoaXMsIHRoaXMuX2Zvcm1hdFZhbHVlKGluaXRpYWwpLCBkYXRhKVxufVxuXG4vKipcbiAqIEFuIEhUTUwgPHRleHRhcmVhPiB3aWRnZXQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IFtrd2FyZ3NdIGNvbmZpZ3VyYXRpb24gb3B0aW9ucywgYXMgc3BlY2lmaWVkIGluXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAge0BsaW5rIFdpZGdldH0uXG4gKiBAY29uZmlnIHtPYmplY3R9IFthdHRyc10gSFRNTCBhdHRyaWJ1dGVzIGZvciB0aGUgcmVuZGVyZWQgd2lkZ2V0LiBEZWZhdWx0XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgcm93cyBhbmQgY29scyBhdHRyaWJ1dGVzIHdpbGwgYmUgdXNlZCBpZiBub3RcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBwcm92aWRlZC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1dpZGdldH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBUZXh0YXJlYSA9IFdpZGdldC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBUZXh0YXJlYShrd2FyZ3MpIH1cbiAgICAvLyBFbnN1cmUgd2UgaGF2ZSBzb21ldGhpbmcgaW4gYXR0cnNcbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbH0sIGt3YXJncylcbiAgICAvLyBQcm92aWRlIGRlZmF1bHQgJ2NvbHMnIGFuZCAncm93cycgYXR0cmlidXRlc1xuICAgIGt3YXJncy5hdHRycyA9IG9iamVjdC5leHRlbmQoe3Jvd3M6ICcxMCcsIGNvbHM6ICc0MCd9LCBrd2FyZ3MuYXR0cnMpXG4gICAgV2lkZ2V0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG59KVxuXG5UZXh0YXJlYS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbH0sIGt3YXJncylcbiAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgdmFsdWUgPSAnJ1xuICB9XG4gIHZhciBmaW5hbEF0dHJzID0gdGhpcy5idWlsZEF0dHJzKGt3YXJncy5hdHRycywge25hbWU6IG5hbWUsIGRlZmF1bHRWYWx1ZTogdmFsdWV9KVxuICByZXR1cm4gUmVhY3QuRE9NLnRleHRhcmVhKGZpbmFsQXR0cnMpXG59XG5cbnZhciBkZWZhdWx0Q2hlY2tUZXN0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSAhPT0gZmFsc2UgJiZcbiAgICAgICAgICB2YWx1ZSAhPT0gbnVsbCAmJlxuICAgICAgICAgIHZhbHVlICE9PSAnJylcbn1cblxuLyoqXG4gKiBBbiBIVE1MIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIj4gd2lkZ2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7V2lkZ2V0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIENoZWNrYm94SW5wdXQgPSBXaWRnZXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXaWRnZXQpKSB7IHJldHVybiBuZXcgQ2hlY2tib3hJbnB1dChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHtjaGVja1Rlc3Q6IGRlZmF1bHRDaGVja1Rlc3R9LCBrd2FyZ3MpXG4gICAgV2lkZ2V0LmNhbGwodGhpcywga3dhcmdzKVxuICAgIHRoaXMuY2hlY2tUZXN0ID0ga3dhcmdzLmNoZWNrVGVzdFxuICB9XG59KVxuXG5DaGVja2JveElucHV0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwga3dhcmdzKSB7XG4gIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiBudWxsfSwga3dhcmdzKVxuICB2YXIgY2hlY2tlZFxuICB0cnkge1xuICAgIGNoZWNrZWQgPSB0aGlzLmNoZWNrVGVzdCh2YWx1ZSlcbiAgfVxuICBjYXRjaCAoZSkge1xuICAgIC8vIFNpbGVudGx5IGNhdGNoIGV4Y2VwdGlvbnNcbiAgICBjaGVja2VkID0gZmFsc2VcbiAgfVxuXG4gIHZhciBmaW5hbEF0dHJzID0gdGhpcy5idWlsZEF0dHJzKGt3YXJncy5hdHRycywge3R5cGU6ICdjaGVja2JveCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWV9KVxuICBpZiAodmFsdWUgIT09ICcnICYmIHZhbHVlICE9PSB0cnVlICYmIHZhbHVlICE9PSBmYWxzZSAmJiB2YWx1ZSAhPT0gbnVsbCAmJlxuICAgICAgdmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9ubHkgYWRkIHRoZSB2YWx1ZSBhdHRyaWJ1dGUgaWYgdmFsdWUgaXMgbm9uLWVtcHR5XG4gICAgZmluYWxBdHRycy52YWx1ZSA9IHZhbHVlXG4gIH1cbiAgaWYgKGNoZWNrZWQpIHtcbiAgICBmaW5hbEF0dHJzLmRlZmF1bHRDaGVja2VkID0gJ2NoZWNrZWQnXG4gIH1cbiAgcmV0dXJuIFJlYWN0LkRPTS5pbnB1dChmaW5hbEF0dHJzKVxufVxuXG5DaGVja2JveElucHV0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhID0gZnVuY3Rpb24oZGF0YSwgZmlsZXMsIG5hbWUpIHtcbiAgaWYgKHR5cGVvZiBkYXRhW25hbWVdID09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gIEEgbWlzc2luZyB2YWx1ZSBtZWFucyBGYWxzZSBiZWNhdXNlIEhUTUwgZm9ybSBzdWJtaXNzaW9uIGRvZXMgbm90XG4gICAgLy8gc2VuZCByZXN1bHRzIGZvciB1bnNlbGVjdGVkIGNoZWNrYm94ZXMuXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgdmFyIHZhbHVlID0gZGF0YVtuYW1lXVxuICAgICwgdmFsdWVzID0geyd0cnVlJzogdHJ1ZSwgJ2ZhbHNlJzogZmFsc2V9XG4gIC8vIFRyYW5zbGF0ZSB0cnVlIGFuZCBmYWxzZSBzdHJpbmdzIHRvIGJvb2xlYW4gdmFsdWVzXG4gIGlmIChpcy5TdHJpbmcodmFsdWUpKSB7XG4gICAgdmFsdWUgPSBvYmplY3QuZ2V0KHZhbHVlcywgdmFsdWUudG9Mb3dlckNhc2UoKSwgdmFsdWUpXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbkNoZWNrYm94SW5wdXQucHJvdG90eXBlLl9oYXNDaGFuZ2VkID0gZnVuY3Rpb24oaW5pdGlhbCwgZGF0YSkge1xuICAvLyBTb21ldGltZXMgZGF0YSBvciBpbml0aWFsIGNvdWxkIGJlIG51bGwgb3IgJycgd2hpY2ggc2hvdWxkIGJlIHRoZSBzYW1lXG4gIC8vIHRoaW5nIGFzIGZhbHNlLlxuICByZXR1cm4gKEJvb2xlYW4oaW5pdGlhbCkgIT0gQm9vbGVhbihkYXRhKSlcbn1cblxuLyoqXG4gKiBBbiBIVE1MIDxzZWxlY3Q+IHdpZGdldC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1dpZGdldH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBTZWxlY3QgPSBXaWRnZXQuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXaWRnZXQpKSB7IHJldHVybiBuZXcgU2VsZWN0KGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2Nob2ljZXM6IFtdfSwga3dhcmdzKVxuICAgIFdpZGdldC5jYWxsKHRoaXMsIGt3YXJncylcbiAgICB0aGlzLmNob2ljZXMgPSBrd2FyZ3MuY2hvaWNlcyB8fCBbXVxuICB9XG4sIGFsbG93TXVsdGlwbGVTZWxlY3RlZDogZmFsc2Vcbn0pXG5cbi8qKlxuICogUmVuZGVycyB0aGUgd2lkZ2V0LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIHRoZSBmaWVsZCBuYW1lLlxuICogQHBhcmFtIHNlbGVjdGVkVmFsdWUgdGhlIHZhbHVlIG9mIGFuIG9wdGlvbiB3aGljaCBzaG91bGQgYmUgbWFya2VkIGFzXG4gKiAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZCwgb3IgPGNvZGU+bnVsbDwvY29kZT4gaWYgbm8gdmFsdWUgaXMgc2VsZWN0ZWQgLVxuICogICAgICAgICAgICAgICAgICAgICAgd2lsbCBiZSBub3JtYWxpc2VkIHRvIGEgPGNvZGU+U3RyaW5nPC9jb2RlPiBmb3JcbiAqICAgICAgICAgICAgICAgICAgICAgIGNvbXBhcmlzb24gd2l0aCBjaG9pY2UgdmFsdWVzLlxuICogQHBhcmFtIHtPYmplY3R9IFthdHRyc10gYWRkaXRpb25hbCBIVE1MIGF0dHJpYnV0ZXMgZm9yIHRoZSByZW5kZXJlZCB3aWRnZXQuXG4gKiBAcGFyYW0ge0FycmF5fSBbY2hvaWNlc10gY2hvaWNlcyB0byBiZSB1c2VkIHdoZW4gcmVuZGVyaW5nIHRoZSB3aWRnZXQsIGluXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkaXRpb24gdG8gdGhvc2UgYWxyZWFkeSBoZWxkIGJ5IHRoZSB3aWRnZXQgaXRzZWxmLlxuICpcbiAqIEByZXR1cm4gYSA8Y29kZT4mbHQ7c2VsZWN0Jmd0OzwvY29kZT4gZWxlbWVudC5cbiAqL1xuU2VsZWN0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihuYW1lLCBzZWxlY3RlZFZhbHVlLCBrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7YXR0cnM6IG51bGwsIGNob2ljZXM6IFtdfSwga3dhcmdzKVxuICBpZiAoc2VsZWN0ZWRWYWx1ZSA9PT0gbnVsbCkge1xuICAgIHNlbGVjdGVkVmFsdWUgPSAnJ1xuICB9XG4gIHZhciBmaW5hbEF0dHJzID0gdGhpcy5idWlsZEF0dHJzKGt3YXJncy5hdHRycywge25hbWU6IG5hbWV9KVxuICB2YXIgb3B0aW9ucyA9IHRoaXMucmVuZGVyT3B0aW9ucyhrd2FyZ3MuY2hvaWNlcywgW3NlbGVjdGVkVmFsdWVdKVxuICByZXR1cm4gUmVhY3QuRE9NLnNlbGVjdChmaW5hbEF0dHJzLCBvcHRpb25zKVxufVxuXG5TZWxlY3QucHJvdG90eXBlLnJlbmRlck9wdGlvbnMgPSBmdW5jdGlvbihjaG9pY2VzLCBzZWxlY3RlZFZhbHVlcykge1xuICAvLyBOb3JtYWxpc2UgdG8gc3RyaW5nc1xuICB2YXIgc2VsZWN0ZWRWYWx1ZXNMb29rdXAgPSB7fVxuICAvLyBXZSBkb24ndCBkdWNrIHR5cGUgcGFzc2luZyBvZiBhIFN0cmluZywgYXMgaW5kZXggYWNjZXNzIHRvIGNoYXJhY3RlcnMgaXNuJ3RcbiAgLy8gcGFydCBvZiB0aGUgc3BlYy5cbiAgdmFyIHNlbGVjdGVkVmFsdWVTdHJpbmcgPSAoaXMuU3RyaW5nKHNlbGVjdGVkVmFsdWVzKSlcbiAgdmFyIGksIGxcbiAgZm9yIChpID0gMCwgbCA9IHNlbGVjdGVkVmFsdWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHNlbGVjdGVkVmFsdWVzTG9va3VwWycnKyhzZWxlY3RlZFZhbHVlU3RyaW5nID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRWYWx1ZXMuY2hhckF0KGkpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRWYWx1ZXNbaV0pXSA9IHRydWVcbiAgfVxuXG4gIHZhciBvcHRpb25zID0gW11cbiAgICAsIGZpbmFsQ2hvaWNlcyA9IHV0aWwuaXRlcmF0ZSh0aGlzLmNob2ljZXMpLmNvbmNhdChjaG9pY2VzIHx8IFtdKVxuICBmb3IgKGkgPSAwLCBsID0gZmluYWxDaG9pY2VzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChpcy5BcnJheShmaW5hbENob2ljZXNbaV1bMV0pKSB7XG4gICAgICB2YXIgb3B0Z3JvdXBPcHRpb25zID0gW11cbiAgICAgICAgLCBvcHRncm91cENob2ljZXMgPSBmaW5hbENob2ljZXNbaV1bMV1cbiAgICAgIGZvciAodmFyIGogPSAwLCBrID0gb3B0Z3JvdXBDaG9pY2VzLmxlbmd0aDsgaiA8IGs7IGorKykge1xuICAgICAgICBvcHRncm91cE9wdGlvbnMucHVzaCh0aGlzLnJlbmRlck9wdGlvbihzZWxlY3RlZFZhbHVlc0xvb2t1cCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0Z3JvdXBDaG9pY2VzW2pdWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRncm91cENob2ljZXNbal1bMV0pKVxuICAgICAgfVxuICAgICAgb3B0aW9ucy5wdXNoKFJlYWN0LkRPTS5vcHRncm91cCh7bGFiZWw6IGZpbmFsQ2hvaWNlc1tpXVswXX0sIG9wdGdyb3VwT3B0aW9ucykpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgb3B0aW9ucy5wdXNoKHRoaXMucmVuZGVyT3B0aW9uKHNlbGVjdGVkVmFsdWVzTG9va3VwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsQ2hvaWNlc1tpXVswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbENob2ljZXNbaV1bMV0pKVxuICAgIH1cbiAgfVxuICByZXR1cm4gb3B0aW9uc1xufVxuXG5TZWxlY3QucHJvdG90eXBlLnJlbmRlck9wdGlvbiA9IGZ1bmN0aW9uKG9wdFZhbHVlLCBvcHRMYWJlbCkge1xuICBvcHRWYWx1ZSA9ICcnK29wdFZhbHVlXG4gIHZhciBhdHRycyA9IHt2YWx1ZTogb3B0VmFsdWV9XG4gIHJldHVybiBSZWFjdC5ET00ub3B0aW9uKGF0dHJzLCBvcHRMYWJlbClcbn1cblxuU2VsZWN0LnByb3RvdHlwZS5yZW5kZXJPcHRpb24gPSBmdW5jdGlvbihzZWxlY3RlZFZhbHVlc0xvb2t1cCwgb3B0VmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdExhYmVsKSB7XG4gIG9wdFZhbHVlID0gJycrb3B0VmFsdWVcbiAgdmFyIGF0dHJzID0ge3ZhbHVlOiBvcHRWYWx1ZX1cbiAgaWYgKHR5cGVvZiBzZWxlY3RlZFZhbHVlc0xvb2t1cFtvcHRWYWx1ZV0gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBhdHRyc1snc2VsZWN0ZWQnXSA9ICdzZWxlY3RlZCdcbiAgICBpZiAoIXRoaXMuYWxsb3dNdWx0aXBsZVNlbGVjdGVkKSB7XG4gICAgICAvLyBPbmx5IGFsbG93IGZvciBhIHNpbmdsZSBzZWxlY3Rpb24gd2l0aCB0aGlzIHZhbHVlXG4gICAgICBkZWxldGUgc2VsZWN0ZWRWYWx1ZXNMb29rdXBbb3B0VmFsdWVdXG4gICAgfVxuICB9XG4gIHJldHVybiBSZWFjdC5ET00ub3B0aW9uKGF0dHJzLCBvcHRMYWJlbClcbn1cblxuLyoqXG4gKiBBIDxzZWxlY3Q+IHdpZGdldCBpbnRlbmRlZCB0byBiZSB1c2VkIHdpdGggTnVsbEJvb2xlYW5GaWVsZC5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1NlbGVjdH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBOdWxsQm9vbGVhblNlbGVjdCA9IFNlbGVjdC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBOdWxsQm9vbGVhblNlbGVjdChrd2FyZ3MpIH1cbiAgICBrd2FyZ3MgPSBrd2FyZ3MgfHwge31cbiAgICAvLyBTZXQgb3Igb3ZlcnJyaWRlIGNob2ljZXNcbiAgICBrd2FyZ3MuY2hvaWNlcyA9IFtbJzEnLCAnVW5rbm93biddLCBbJzInLCAnWWVzJ10sIFsnMycsICdObyddXVxuICAgIFNlbGVjdC5jYWxsKHRoaXMsIGt3YXJncylcbiAgfVxufSlcblxuTnVsbEJvb2xlYW5TZWxlY3QucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAgaWYgKHZhbHVlID09PSB0cnVlIHx8IHZhbHVlID09ICcyJykge1xuICAgICAgdmFsdWUgPSAnMidcbiAgfVxuICBlbHNlIGlmICh2YWx1ZSA9PT0gZmFsc2UgfHwgdmFsdWUgPT0gJzMnKSB7XG4gICAgICB2YWx1ZSA9ICczJ1xuICB9XG4gIGVsc2Uge1xuICAgICAgdmFsdWUgPSAnMSdcbiAgfVxuICByZXR1cm4gU2VsZWN0LnByb3RvdHlwZS5yZW5kZXIuY2FsbCh0aGlzLCBuYW1lLCB2YWx1ZSwga3dhcmdzKVxufVxuXG5OdWxsQm9vbGVhblNlbGVjdC5wcm90b3R5cGUudmFsdWVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGEsIGZpbGVzLCBuYW1lKSB7XG4gIHZhciB2YWx1ZSA9IG51bGxcbiAgaWYgKHR5cGVvZiBkYXRhW25hbWVdICE9ICd1bmRlZmluZWQnKSB7XG4gICAgdmFyIGRhdGFWYWx1ZSA9IGRhdGFbbmFtZV1cbiAgICBpZiAoZGF0YVZhbHVlID09PSB0cnVlIHx8IGRhdGFWYWx1ZSA9PSAnVHJ1ZScgfHwgZGF0YVZhbHVlID09ICd0cnVlJyB8fFxuICAgICAgICBkYXRhVmFsdWUgPT0gJzInKSB7XG4gICAgICB2YWx1ZSA9IHRydWVcbiAgICB9XG4gICAgZWxzZSBpZiAoZGF0YVZhbHVlID09PSBmYWxzZSB8fCBkYXRhVmFsdWUgPT0gJ0ZhbHNlJyB8fFxuICAgICAgICAgICAgIGRhdGFWYWx1ZSA9PSAnZmFsc2UnIHx8IGRhdGFWYWx1ZSA9PSAnMycpIHtcbiAgICAgIHZhbHVlID0gZmFsc2VcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbk51bGxCb29sZWFuU2VsZWN0LnByb3RvdHlwZS5faGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKGluaXRpYWwsIGRhdGEpIHtcbiAgLy8gRm9yIGEgTnVsbEJvb2xlYW5TZWxlY3QsIG51bGwgKHVua25vd24pIGFuZCBmYWxzZSAoTm8pXG4gIC8vYXJlIG5vdCB0aGUgc2FtZVxuICBpZiAoaW5pdGlhbCAhPT0gbnVsbCkge1xuICAgICAgaW5pdGlhbCA9IEJvb2xlYW4oaW5pdGlhbClcbiAgfVxuICBpZiAoZGF0YSAhPT0gbnVsbCkge1xuICAgICAgZGF0YSA9IEJvb2xlYW4oZGF0YSlcbiAgfVxuICByZXR1cm4gaW5pdGlhbCAhPSBkYXRhXG59XG5cbi8qKlxuICogQW4gSFRNTCA8c2VsZWN0PiB3aWRnZXQgd2hpY2ggYWxsb3dzIG11bHRpcGxlIHNlbGVjdGlvbnMuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIHtTZWxlY3R9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgU2VsZWN0TXVsdGlwbGUgPSBTZWxlY3QuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGt3YXJncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXaWRnZXQpKSB7IHJldHVybiBuZXcgU2VsZWN0TXVsdGlwbGUoa3dhcmdzKSB9XG4gICAgU2VsZWN0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIGFsbG93TXVsdGlwbGVTZWxlY3RlZDogdHJ1ZVxufSlcblxuLyoqXG4gKiBSZW5kZXJzIHRoZSB3aWRnZXQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgdGhlIGZpZWxkIG5hbWUuXG4gKiBAcGFyYW0ge0FycmF5fSBzZWxlY3RlZFZhbHVlcyB0aGUgdmFsdWVzIG9mIG9wdGlvbnMgd2hpY2ggc2hvdWxkIGJlIG1hcmtlZCBhc1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQsIG9yIDxjb2RlPm51bGw8L2NvZGU+IGlmIG5vIHZhbHVlc1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJlIHNlbGVjdGVkIC0gdGhlc2Ugd2lsbCBiZSBub3JtYWxpc2VkIHRvXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Y29kZT5TdHJpbmc8L2NvZGU+cyBmb3IgY29tcGFyaXNvbiB3aXRoIGNob2ljZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzLlxuICogQHBhcmFtIHtPYmplY3R9IFthdHRyc10gYWRkaXRpb25hbCBIVE1MIGF0dHJpYnV0ZXMgZm9yIHRoZSByZW5kZXJlZCB3aWRnZXQuXG4gKiBAcGFyYW0ge0FycmF5fSBbY2hvaWNlc10gY2hvaWNlcyB0byBiZSB1c2VkIHdoZW4gcmVuZGVyaW5nIHRoZSB3aWRnZXQsIGluXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkaXRpb24gdG8gdGhvc2UgYWxyZWFkeSBoZWxkIGJ5IHRoZSB3aWRnZXQgaXRzZWxmLlxuICpcbiAqIEByZXR1cm4gYSA8Y29kZT4mbHQ7c2VsZWN0Jmd0OzwvY29kZT4gZWxlbWVudCB3aGljaCBhbGxvd3MgbXVsdGlwbGVcbiAqICAgICAgICAgc2VsZWN0aW9ucy5cbiAqL1xuU2VsZWN0TXVsdGlwbGUucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHNlbGVjdGVkVmFsdWVzLCBrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7YXR0cnM6IG51bGwsIGNob2ljZXM6IFtdfSwga3dhcmdzKVxuICBpZiAoc2VsZWN0ZWRWYWx1ZXMgPT09IG51bGwpIHtcbiAgICBzZWxlY3RlZFZhbHVlcyA9IFtdXG4gIH1cbiAgaWYgKCFpcy5BcnJheShzZWxlY3RlZFZhbHVlcykpIHtcbiAgICAvLyBUT0RPIE91dHB1dCB3YXJuaW5nIGluIGRldmVsb3BtZW50XG4gICAgc2VsZWN0ZWRWYWx1ZXMgPSBbc2VsZWN0ZWRWYWx1ZXNdXG4gIH1cbiAgdmFyIGZpbmFsQXR0cnMgPSB0aGlzLmJ1aWxkQXR0cnMoa3dhcmdzLmF0dHJzLCB7bmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGU6ICdtdWx0aXBsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRWYWx1ZTogc2VsZWN0ZWRWYWx1ZXN9KVxuICAgICwgb3B0aW9ucyA9IHRoaXMucmVuZGVyT3B0aW9ucyhrd2FyZ3MuY2hvaWNlcywgc2VsZWN0ZWRWYWx1ZXMpXG4gIHJldHVybiBSZWFjdC5ET00uc2VsZWN0KGZpbmFsQXR0cnMsIG9wdGlvbnMpXG59XG5cbi8qKlxuICogUmV0cmlldmVzIHZhbHVlcyBmb3IgdGhpcyB3aWRnZXQgZnJvbSB0aGUgZ2l2ZW4gZGF0YS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSBmb3JtIGRhdGEuXG4gKiBAcGFyYW0ge09iamVjdH0gZmlsZXMgZmlsZSBkYXRhLlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgdGhlIGZpZWxkIG5hbWUgdG8gYmUgdXNlZCB0byByZXRyaWV2ZSBkYXRhLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fSB2YWx1ZXMgZm9yIHRoaXMgd2lkZ2V0LCBvciA8Y29kZT5udWxsPC9jb2RlPiBpZiBubyB2YWx1ZXNcbiAqICAgICAgICAgICAgICAgICB3ZXJlIHByb3ZpZGVkLlxuICovXG5TZWxlY3RNdWx0aXBsZS5wcm90b3R5cGUudmFsdWVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGEsIGZpbGVzLCBuYW1lKSB7XG4gIGlmICh0eXBlb2YgZGF0YVtuYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBbXS5jb25jYXQoZGF0YVtuYW1lXSlcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG5TZWxlY3RNdWx0aXBsZS5wcm90b3R5cGUuX2hhc0NoYW5nZWQgPSBmdW5jdGlvbihpbml0aWFsLCBkYXRhKSB7XG4gIGlmIChpbml0aWFsID09PSBudWxsKSB7XG4gICAgaW5pdGlhbCA9IFtdXG4gIH1cbiAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICBkYXRhID0gW11cbiAgfVxuICBpZiAoaW5pdGlhbC5sZW5ndGggIT0gZGF0YS5sZW5ndGgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHZhciBkYXRhTG9va3VwID0gb2JqZWN0Lmxvb2t1cChkYXRhKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGluaXRpYWwubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHR5cGVvZiBkYXRhTG9va3VwWycnK2luaXRpYWxbaV1dID09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBBbiBvYmplY3QgdXNlZCBieSBSYWRpb0ZpZWxkUmVuZGVyZXIgdGhhdCByZXByZXNlbnRzIGEgc2luZ2xlXG4gKiA8aW5wdXQgdHlwZT1cInJhZGlvXCI+LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gYXR0cnNcbiAqIEBwYXJhbSB7QXJyYXl9IGNob2ljZVxuICogQHBhcmFtIHtudW1iZXJ9IGluZGV4XG4gKi9cbnZhciBSYWRpb0lucHV0ID0gU3ViV2lkZ2V0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihuYW1lLCB2YWx1ZSwgYXR0cnMsIGNob2ljZSwgaW5kZXgpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmFkaW9JbnB1dCkpIHsgcmV0dXJuIG5ldyBSYWRpb0lucHV0KG5hbWUsIHZhbHVlLCBhdHRycywgY2hvaWNlLCBpbmRleCkgfVxuICAgIHRoaXMubmFtZSA9IG5hbWVcbiAgICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgICB0aGlzLmF0dHJzID0gYXR0cnNcbiAgICB0aGlzLmNob2ljZVZhbHVlID0gJycrY2hvaWNlWzBdXG4gICAgdGhpcy5jaG9pY2VMYWJlbCA9IGNob2ljZVsxXVxuICAgIHRoaXMuaW5kZXggPSBpbmRleFxuICB9XG59KVxuXG4vKipcbiAqIFJlbmRlcnMgYSA8bGFiZWw+IGVuY2xvc2luZyB0aGUgcmFkaW8gd2lkZ2V0IGFuZCBpdHMgbGFiZWwgdGV4dC5cbiAqL1xuUmFkaW9JbnB1dC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICBuYW1lID0gbmFtZSB8fCB0aGlzLm5hbWVcbiAgdmFsdWUgPSB2YWx1ZSB8fCB0aGlzLnZhbHVlXG4gIHZhciBhdHRycyA9IG9iamVjdC5leHRlbmQoe2F0dHJzOiB0aGlzLmF0dHJzfSwga3dhcmdzKS5hdHRyc1xuICB2YXIgbGFiZWxBdHRycyA9IHt9XG4gIGlmICh0eXBlb2YgYXR0cnMuaWQgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBsYWJlbEF0dHJzLmh0bWxGb3IgPSBhdHRycy5pZCArICdfJyArIHRoaXMuaW5kZXhcbiAgfVxuICByZXR1cm4gUmVhY3QuRE9NLmxhYmVsKGxhYmVsQXR0cnMsIHRoaXMudGFnKCksICcgJywgdGhpcy5jaG9pY2VMYWJlbClcbn1cblxuUmFkaW9JbnB1dC5wcm90b3R5cGUuaXNDaGVja2VkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnZhbHVlID09PSB0aGlzLmNob2ljZVZhbHVlXG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgPGlucHV0IHR5cGU9XCJyYWRpb1wiPiBwb3J0aW9uIG9mIHRoZSB3aWRnZXQuXG4gKi9cblJhZGlvSW5wdXQucHJvdG90eXBlLnRhZyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZmluYWxBdHRycyA9IG9iamVjdC5leHRlbmQoe30sIHRoaXMuYXR0cnMsIHtcbiAgICB0eXBlOiAncmFkaW8nLCBuYW1lOiB0aGlzLm5hbWUsIHZhbHVlOiB0aGlzLmNob2ljZVZhbHVlXG4gIH0pXG4gIGlmICh0eXBlb2YgZmluYWxBdHRycy5pZCAhPSAndW5kZWZpbmVkJykge1xuICAgIGZpbmFsQXR0cnMuaWQgPSBmaW5hbEF0dHJzLmlkICsgJ18nICsgdGhpcy5pbmRleFxuICB9XG4gIGlmICh0aGlzLmlzQ2hlY2tlZCgpKSB7XG4gICAgZmluYWxBdHRycy5kZWZhdWx0Q2hlY2tlZCA9ICdjaGVja2VkJ1xuICB9XG4gIHJldHVybiBSZWFjdC5ET00uaW5wdXQoZmluYWxBdHRycylcbn1cblxuLyoqXG4gKiBBbiBvYmplY3QgdXNlZCBieSB7QGxpbmsgUmFkaW9TZWxlY3R9IHRvIGVuYWJsZSBjdXN0b21pc2F0aW9uIG9mIHJhZGlvXG4gKiB3aWRnZXRzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gYXR0cnNcbiAqIEBwYXJhbSB7QXJyYXl9IGNob2ljZXNcbiAqL1xudmFyIFJhZGlvRmllbGRSZW5kZXJlciA9IENvbmN1ci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24obmFtZSwgdmFsdWUsIGF0dHJzLCBjaG9pY2VzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJhZGlvRmllbGRSZW5kZXJlcikpIHsgcmV0dXJuIFJhZGlvRmllbGRSZW5kZXJlcihuYW1lLCB2YWx1ZSwgYXR0cnMsIGNob2ljZXMpIH1cbiAgICB0aGlzLm5hbWUgPSBuYW1lXG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlXG4gICAgdGhpcy5hdHRycyA9IGF0dHJzXG4gICAgdGhpcy5jaG9pY2VzID0gY2hvaWNlc1xuICB9XG59KVxuXG5SYWRpb0ZpZWxkUmVuZGVyZXIucHJvdG90eXBlLl9faXRlcl9fID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnJhZGlvSW5wdXRzKClcbn1cblxuUmFkaW9GaWVsZFJlbmRlcmVyLnByb3RvdHlwZS5yYWRpb0lucHV0cyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaW5wdXRzID0gW11cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmNob2ljZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaW5wdXRzLnB1c2goUmFkaW9JbnB1dCh0aGlzLm5hbWUsIHRoaXMudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QuZXh0ZW5kKHt9LCB0aGlzLmF0dHJzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2hvaWNlc1tpXSwgaSkpXG4gIH1cbiAgcmV0dXJuIGlucHV0c1xufVxuXG5SYWRpb0ZpZWxkUmVuZGVyZXIucHJvdG90eXBlLnJhZGlvSW5wdXQgPSBmdW5jdGlvbihpKSB7XG4gIGlmIChpID49IHRoaXMuY2hvaWNlcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0luZGV4IG91dCBvZiBib3VuZHMnKVxuICB9XG4gIHJldHVybiBSYWRpb0lucHV0KHRoaXMubmFtZSwgdGhpcy52YWx1ZSwgb2JqZWN0LmV4dGVuZCh7fSwgdGhpcy5hdHRycyksXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hvaWNlc1tpXSwgaSlcbn1cblxuLyoqXG4gKiBPdXRwdXRzIGEgJmx0O3VsJmd0OyBmb3IgdGhpcyBzZXQgb2YgcmFkaW8gZmllbGRzLlxuICovXG5SYWRpb0ZpZWxkUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaW5wdXRzID0gdGhpcy5yYWRpb0lucHV0cygpXG4gIHZhciBpdGVtcyA9IFtdXG4gIGZvciAodmFyIGkgPSAwLCBsID0gaW5wdXRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgaXRlbXMucHVzaChSZWFjdC5ET00ubGkobnVsbCwgaW5wdXRzW2ldLnJlbmRlcigpKSlcbiAgfVxuICByZXR1cm4gUmVhY3QuRE9NLnVsKG51bGwsIGl0ZW1zKVxufVxuXG4vKipcbiAqIFJlbmRlcnMgYSBzaW5nbGUgc2VsZWN0IGFzIGEgbGlzdCBvZiA8aW5wdXQgdHlwZT1cInJhZGlvXCI+IGVsZW1lbnRzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7U2VsZWN0fVxuICogQHBhcmFtIHtPYmplY3Q9fSBrd2FyZ3NcbiAqL1xudmFyIFJhZGlvU2VsZWN0ID0gU2VsZWN0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IFJhZGlvU2VsZWN0KGt3YXJncykgfVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe3JlbmRlcmVyOiBudWxsfSwga3dhcmdzKVxuICAgIC8vIE92ZXJyaWRlIHRoZSBkZWZhdWx0IHJlbmRlcmVyIGlmIHdlIHdlcmUgcGFzc2VkIG9uZVxuICAgIGlmIChrd2FyZ3MucmVuZGVyZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMucmVuZGVyZXIgPSBrd2FyZ3MucmVuZGVyZXJcbiAgICB9XG4gICAgU2VsZWN0LmNhbGwodGhpcywga3dhcmdzKVxuICB9XG4sIHJlbmRlcmVyOiBSYWRpb0ZpZWxkUmVuZGVyZXJcbn0pXG5cblJhZGlvU2VsZWN0LnByb3RvdHlwZS5zdWJXaWRnZXRzID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICByZXR1cm4gdXRpbC5pdGVyYXRlKHRoaXMuZ2V0UmVuZGVyZXIobmFtZSwgdmFsdWUsIGt3YXJncykpXG59XG5cbi8qKlxuICogQHJldHVybiBhbiBpbnN0YW5jZSBvZiB0aGUgcmVuZGVyZXIgdG8gYmUgdXNlZCB0byByZW5kZXIgdGhpcyB3aWRnZXQuXG4gKi9cblJhZGlvU2VsZWN0LnByb3RvdHlwZS5nZXRSZW5kZXJlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7YXR0cnM6IG51bGwsIGNob2ljZXM6IFtdfSwga3dhcmdzKVxuICB2YWx1ZSA9ICh2YWx1ZSA9PT0gbnVsbCA/ICcnIDogJycrdmFsdWUpXG4gIHZhciBmaW5hbEF0dHJzID0gdGhpcy5idWlsZEF0dHJzKGt3YXJncy5hdHRycylcbiAgICAsIGNob2ljZXMgPSB1dGlsLml0ZXJhdGUodGhpcy5jaG9pY2VzKS5jb25jYXQoa3dhcmdzLmNob2ljZXMgfHwgW10pXG4gIHJldHVybiBuZXcgdGhpcy5yZW5kZXJlcihuYW1lLCB2YWx1ZSwgZmluYWxBdHRycywgY2hvaWNlcylcbn1cblxuUmFkaW9TZWxlY3QucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBrd2FyZ3MpIHtcbiAgcmV0dXJuIHRoaXMuZ2V0UmVuZGVyZXIobmFtZSwgdmFsdWUsIGt3YXJncykucmVuZGVyKClcbn1cblxuLyoqXG4gKiBSYWRpb1NlbGVjdCBpcyByZXByZXNlbnRlZCBieSBtdWx0aXBsZSA8aW5wdXQgdHlwZT1cInJhZGlvXCI+IGZpZWxkcyxcbiAqIGVhY2ggb2Ygd2hpY2ggaGFzIGEgZGlzdGluY3QgSUQuIFRoZSBJRHMgYXJlIG1hZGUgZGlzdGluY3QgYnkgYSAnX1gnXG4gKiBzdWZmaXgsIHdoZXJlIFggaXMgdGhlIHplcm8tYmFzZWQgaW5kZXggb2YgdGhlIHJhZGlvIGZpZWxkLiBUaHVzLCB0aGVcbiAqIGxhYmVsIGZvciBhIFJhZGlvU2VsZWN0IHNob3VsZCByZWZlcmVuY2UgdGhlIGZpcnN0IG9uZSAoJ18wJykuXG4gKi9cblJhZGlvU2VsZWN0LnByb3RvdHlwZS5pZEZvckxhYmVsID0gZnVuY3Rpb24oaWQpIHtcbiAgaWYgKGlkKSB7XG4gICAgICBpZCArPSAnXzAnXG4gIH1cbiAgcmV0dXJuIGlkXG59XG5cbi8qKlxuICogTXVsdGlwbGUgc2VsZWN0aW9ucyByZXByZXNlbnRlZCBhcyBhIGxpc3Qgb2YgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiPiB3aWRnZXRzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7U2VsZWN0TXVsdGlwbGV9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgQ2hlY2tib3hTZWxlY3RNdWx0aXBsZSA9IFNlbGVjdE11bHRpcGxlLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IENoZWNrYm94U2VsZWN0TXVsdGlwbGUoa3dhcmdzKSB9XG4gICAgU2VsZWN0TXVsdGlwbGUuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5cbkNoZWNrYm94U2VsZWN0TXVsdGlwbGUucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKG5hbWUsIHNlbGVjdGVkVmFsdWVzLCBrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7YXR0cnM6IG51bGwsIGNob2ljZXM6IFtdfSwga3dhcmdzKVxuICBpZiAoc2VsZWN0ZWRWYWx1ZXMgPT09IG51bGwpIHtcbiAgICBzZWxlY3RlZFZhbHVlcyA9IFtdXG4gIH1cbiAgdmFyIGhhc0lkID0gKGt3YXJncy5hdHRycyAhPT0gbnVsbCAmJiB0eXBlb2Yga3dhcmdzLmF0dHJzLmlkICE9ICd1bmRlZmluZWQnKVxuICAgICwgZmluYWxBdHRycyA9IHRoaXMuYnVpbGRBdHRycyhrd2FyZ3MuYXR0cnMpXG4gICAgLCBzZWxlY3RlZFZhbHVlc0xvb2t1cCA9IG9iamVjdC5sb29rdXAoc2VsZWN0ZWRWYWx1ZXMpXG4gICAgLCBjaGVja1Rlc3QgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICByZXR1cm4gKHR5cGVvZiBzZWxlY3RlZFZhbHVlc0xvb2t1cFsnJyt2YWx1ZV0gIT0gJ3VuZGVmaW5lZCcpXG4gICAgICB9XG4gICAgLCBpdGVtcyA9IFtdXG4gICAgLCBmaW5hbENob2ljZXMgPSB1dGlsLml0ZXJhdGUodGhpcy5jaG9pY2VzKS5jb25jYXQoa3dhcmdzLmNob2ljZXMpXG4gIGZvciAodmFyIGkgPSAwLCBsID0gZmluYWxDaG9pY2VzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBvcHRWYWx1ZSA9ICcnICsgZmluYWxDaG9pY2VzW2ldWzBdXG4gICAgICAsIG9wdExhYmVsID0gZmluYWxDaG9pY2VzW2ldWzFdXG4gICAgICAsIGNoZWNrYm94QXR0cnMgPSBvYmplY3QuZXh0ZW5kKHt9LCBmaW5hbEF0dHJzKVxuICAgICAgLCBsYWJlbEF0dHJzID0ge31cbiAgICAvLyBJZiBhbiBJRCBhdHRyaWJ1dGUgd2FzIGdpdmVuLCBhZGQgYSBudW1lcmljIGluZGV4IGFzIGEgc3VmZml4LCBzb1xuICAgIC8vIHRoYXQgdGhlIGNoZWNrYm94ZXMgZG9uJ3QgYWxsIGhhdmUgdGhlIHNhbWUgSUQgYXR0cmlidXRlLlxuICAgIGlmIChoYXNJZCkge1xuICAgICAgb2JqZWN0LmV4dGVuZChjaGVja2JveEF0dHJzLCB7aWQ6IGt3YXJncy5hdHRycy5pZCArICdfJyArIGl9KVxuICAgICAgbGFiZWxBdHRycy5odG1sRm9yID0gY2hlY2tib3hBdHRycy5pZFxuICAgIH1cblxuICAgIHZhciBjYiA9IENoZWNrYm94SW5wdXQoe2F0dHJzOiBjaGVja2JveEF0dHJzLCBjaGVja1Rlc3Q6IGNoZWNrVGVzdH0pXG4gICAgaXRlbXMucHVzaChcbiAgICAgIFJlYWN0LkRPTS5saShudWxsXG4gICAgICAsIFJlYWN0LkRPTS5sYWJlbChsYWJlbEF0dHJzLCBjYi5yZW5kZXIobmFtZSwgb3B0VmFsdWUpLCAnICcsIG9wdExhYmVsKVxuICAgICAgKVxuICAgIClcbiAgfVxuICByZXR1cm4gUmVhY3QuRE9NLnVsKG51bGwsIGl0ZW1zKVxufVxuXG5DaGVja2JveFNlbGVjdE11bHRpcGxlLnByb3RvdHlwZS5pZEZvckxhYmVsID0gZnVuY3Rpb24oaWQpIHtcbiAgaWYgKGlkKSB7XG4gICAgaWQgKz0gJ18wJ1xuICB9XG4gIHJldHVybiBpZFxufVxuXG4vKipcbiAqIEEgd2lkZ2V0IHRoYXQgaXMgY29tcG9zZWQgb2YgbXVsdGlwbGUgd2lkZ2V0cy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1dpZGdldH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBNdWx0aVdpZGdldCA9IFdpZGdldC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24od2lkZ2V0cywga3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBNdWx0aVdpZGdldCh3aWRnZXRzLCBrd2FyZ3MpIH1cbiAgICB0aGlzLndpZGdldHMgPSBbXVxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gd2lkZ2V0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRoaXMud2lkZ2V0cy5wdXNoKHdpZGdldHNbaV0gaW5zdGFuY2VvZiBXaWRnZXRcbiAgICAgICAgICAgICAgICAgICAgICAgID8gd2lkZ2V0c1tpXVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBuZXcgd2lkZ2V0c1tpXSgpKVxuICAgIH1cbiAgICBXaWRnZXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gIH1cbn0pXG5cbi8qKlxuICogVGhpcyBtZXRob2QgaXMgZGlmZmVyZW50IHRoYW4gb3RoZXIgd2lkZ2V0cycsIGJlY2F1c2UgaXQgaGFzIHRvIGZpZ3VyZSBvdXRcbiAqIGhvdyB0byBzcGxpdCBhIHNpbmdsZSB2YWx1ZSBmb3IgZGlzcGxheSBpbiBtdWx0aXBsZSB3aWRnZXRzLlxuICpcbiAqIElmIHRoZSBnaXZlbiB2YWx1ZSBpcyBOT1QgYSBsaXN0LCBpdCB3aWxsIGZpcnN0IGJlIFwiZGVjb21wcmVzc2VkXCIgaW50byBhIGxpc3RcbiAqIGJlZm9yZSBpdCBpcyByZW5kZXJlZCBieSBjYWxsaW5nIHRoZSB7QGxpbmsgTXVsdGlXaWRnZXQjZGVjb21wcmVzc30gbWV0aG9kLlxuICpcbiAqIEVhY2ggdmFsdWUgaW4gdGhlIGxpc3QgaXMgcmVuZGVyZWQgIHdpdGggdGhlIGNvcnJlc3BvbmRpbmcgd2lkZ2V0IC0tIHRoZVxuICogZmlyc3QgdmFsdWUgaXMgcmVuZGVyZWQgaW4gdGhlIGZpcnN0IHdpZGdldCwgdGhlIHNlY29uZCB2YWx1ZSBpcyByZW5kZXJlZCBpblxuICogdGhlIHNlY29uZCB3aWRnZXQsIGFuZCBzbyBvbi5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSB0aGUgZmllbGQgbmFtZS5cbiAqIEBwYXJhbSB2YWx1ZSBhIGxpc3Qgb2YgdmFsdWVzLCBvciBhIG5vcm1hbCB2YWx1ZSAoZS5nLiwgYSA8Y29kZT5TdHJpbmc8L2NvZGU+XG4gKiAgICAgICAgICAgICAgdGhhdCBoYXMgYmVlbiBcImNvbXByZXNzZWRcIiBmcm9tIGEgbGlzdCBvZiB2YWx1ZXMuXG4gKiBAcGFyYW0ge09iamVjdH0gW2F0dHJzXSBhZGRpdGlvbmFsIEhUTUwgYXR0cmlidXRlcyBmb3IgdGhlIHJlbmRlcmVkIHdpZGdldC5cbiAqXG4gKiBAcmV0dXJuIGEgcmVuZGVyZWQgY29sbGVjdGlvbiBvZiB3aWRnZXRzLlxuICovXG5NdWx0aVdpZGdldC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUsIGt3YXJncykge1xuICBrd2FyZ3MgPSBvYmplY3QuZXh0ZW5kKHthdHRyczogbnVsbH0sIGt3YXJncylcbiAgaWYgKCEoaXMuQXJyYXkodmFsdWUpKSkge1xuICAgIHZhbHVlID0gdGhpcy5kZWNvbXByZXNzKHZhbHVlKVxuICB9XG4gIHZhciBmaW5hbEF0dHJzID0gdGhpcy5idWlsZEF0dHJzKGt3YXJncy5hdHRycylcbiAgICAsIGlkID0gKHR5cGVvZiBmaW5hbEF0dHJzLmlkICE9ICd1bmRlZmluZWQnID8gZmluYWxBdHRycy5pZCA6IG51bGwpXG4gICAgLCByZW5kZXJlZFdpZGdldHMgPSBbXVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMud2lkZ2V0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgd2lkZ2V0ID0gdGhpcy53aWRnZXRzW2ldXG4gICAgICAsIHdpZGdldFZhbHVlID0gbnVsbFxuICAgIGlmICh0eXBlb2YgdmFsdWVbaV0gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHdpZGdldFZhbHVlID0gdmFsdWVbaV1cbiAgICB9XG4gICAgaWYgKGlkKSB7XG4gICAgICBmaW5hbEF0dHJzLmlkID0gaWQgKyAnXycgKyBpXG4gICAgfVxuICAgIHJlbmRlcmVkV2lkZ2V0cy5wdXNoKFxuICAgICAgICB3aWRnZXQucmVuZGVyKG5hbWUgKyAnXycgKyBpLCB3aWRnZXRWYWx1ZSwge2F0dHJzOiBmaW5hbEF0dHJzfSkpXG4gIH1cbiAgcmV0dXJuIHRoaXMuZm9ybWF0T3V0cHV0KHJlbmRlcmVkV2lkZ2V0cylcbn1cblxuTXVsdGlXaWRnZXQucHJvdG90eXBlLmlkRm9yTGFiZWwgPSBmdW5jdGlvbihpZCkge1xuICBpZiAoaWQpIHtcbiAgICBpZCArPSAnXzAnXG4gIH1cbiAgcmV0dXJuIGlkXG59XG5cbk11bHRpV2lkZ2V0LnByb3RvdHlwZS52YWx1ZUZyb21EYXRhID0gZnVuY3Rpb24oZGF0YSwgZmlsZXMsIG5hbWUpIHtcbiAgdmFyIHZhbHVlcyA9IFtdXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy53aWRnZXRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhbHVlc1tpXSA9IHRoaXMud2lkZ2V0c1tpXS52YWx1ZUZyb21EYXRhKGRhdGEsIGZpbGVzLCBuYW1lICsgJ18nICsgaSlcbiAgfVxuICByZXR1cm4gdmFsdWVzXG59XG5cbk11bHRpV2lkZ2V0LnByb3RvdHlwZS5faGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKGluaXRpYWwsIGRhdGEpIHtcbiAgdmFyIGksIGxcblxuICBpZiAoaW5pdGlhbCA9PT0gbnVsbCkge1xuICAgIGluaXRpYWwgPSBbXVxuICAgIGZvciAoaSA9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgaW5pdGlhbC5wdXNoKCcnKVxuICAgIH1cbiAgfVxuICBlbHNlIGlmICghKGlzLkFycmF5KGluaXRpYWwpKSkge1xuICAgIGluaXRpYWwgPSB0aGlzLmRlY29tcHJlc3MoaW5pdGlhbClcbiAgfVxuXG4gIGZvciAoaSA9IDAsIGwgPSB0aGlzLndpZGdldHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHRoaXMud2lkZ2V0c1tpXS5faGFzQ2hhbmdlZChpbml0aWFsW2ldLCBkYXRhW2ldKSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBlbGVtZW50IGNvbnRhaW5pbmcgYSBnaXZlbiBsaXN0IG9mIHJlbmRlcmVkIHdpZGdldHMuXG4gKlxuICogVGhpcyBob29rIGFsbG93cyB5b3UgdG8gZm9ybWF0IHRoZSBIVE1MIGRlc2lnbiBvZiB0aGUgd2lkZ2V0cywgaWYgbmVlZGVkLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHJlbmRlcmVkV2lkZ2V0cyBhIGxpc3Qgb2YgcmVuZGVyZWQgd2lkZ2V0cy5cbiAqIEByZXR1cm4gYSBmcmFnbWVudCBjb250YWluaW5nIHRoZSByZW5kZXJlZCB3aWRnZXRzLlxuICovXG5NdWx0aVdpZGdldC5wcm90b3R5cGUuZm9ybWF0T3V0cHV0ID0gZnVuY3Rpb24ocmVuZGVyZWRXaWRnZXRzKSB7XG4gIHJldHVybiBSZWFjdC5ET00uZGl2KG51bGwsIHJlbmRlcmVkV2lkZ2V0cylcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbGlzdCBvZiBkZWNvbXByZXNzZWQgdmFsdWVzIGZvciB0aGUgZ2l2ZW4gY29tcHJlc3NlZCB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgYSBjb21wcmVzc2VkIHZhbHVlLCB3aGljaCBjYW4gYmUgYXNzdW1lZCB0byBiZSB2YWxpZCwgYnV0IG5vdFxuICogICAgICAgICAgICAgIG5lY2Vzc2FyaWx5IG5vbi1lbXB0eS5cbiAqXG4gKiBAcmV0dXJuIGEgbGlzdCBvZiBkZWNvbXByZXNzZWQgdmFsdWVzIGZvciB0aGUgZ2l2ZW4gY29tcHJlc3NlZCB2YWx1ZS5cbiAqL1xuTXVsdGlXaWRnZXQucHJvdG90eXBlLmRlY29tcHJlc3MgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB0aHJvdyBuZXcgRXJyb3IoJ011bHRpV2lkZ2V0IHN1YmNsYXNzZXMgbXVzdCBpbXBsZW1lbnQgYSBkZWNvbXByZXNzKCkgbWV0aG9kLicpXG59XG5cbi8qKlxuICogU3BsaXRzIERhdGUgaW5wdXQgaW50byB0d28gPGlucHV0IHR5cGU9XCJ0ZXh0XCI+IGVsZW1lbnRzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7TXVsdGlXaWRnZXR9XG4gKiBAcGFyYW0ge09iamVjdD19IGt3YXJnc1xuICovXG52YXIgU3BsaXREYXRlVGltZVdpZGdldCA9IE11bHRpV2lkZ2V0LmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2lkZ2V0KSkgeyByZXR1cm4gbmV3IFNwbGl0RGF0ZVRpbWVXaWRnZXQoa3dhcmdzKSB9XG4gICAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7ZGF0ZUZvcm1hdDogbnVsbCwgdGltZUZvcm1hdDogbnVsbH0sIGt3YXJncylcbiAgICB2YXIgd2lkZ2V0cyA9IFtcbiAgICAgIERhdGVJbnB1dCh7YXR0cnM6IGt3YXJncy5hdHRycywgZm9ybWF0OiBrd2FyZ3MuZGF0ZUZvcm1hdH0pXG4gICAgLCBUaW1lSW5wdXQoe2F0dHJzOiBrd2FyZ3MuYXR0cnMsIGZvcm1hdDoga3dhcmdzLnRpbWVGb3JtYXR9KVxuICAgIF1cbiAgICBNdWx0aVdpZGdldC5jYWxsKHRoaXMsIHdpZGdldHMsIGt3YXJncy5hdHRycylcbiAgfVxufSlcblxuU3BsaXREYXRlVGltZVdpZGdldC5wcm90b3R5cGUuZGVjb21wcmVzcyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSkge1xuICAgIHJldHVybiBbXG4gICAgICBuZXcgRGF0ZSh2YWx1ZS5nZXRGdWxsWWVhcigpLCB2YWx1ZS5nZXRNb250aCgpLCB2YWx1ZS5nZXREYXRlKCkpXG4gICAgLCBuZXcgRGF0ZSgxOTAwLCAwLCAxLCB2YWx1ZS5nZXRIb3VycygpLCB2YWx1ZS5nZXRNaW51dGVzKCksIHZhbHVlLmdldFNlY29uZHMoKSlcbiAgICBdXG4gIH1cbiAgcmV0dXJuIFtudWxsLCBudWxsXVxufVxuXG4vKipcbiAqIFNwbGl0cyBEYXRlIGlucHV0IGludG8gdHdvIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCI+IGVsZW1lbnRzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7U3BsaXREYXRlVGltZVdpZGdldH1cbiAqIEBwYXJhbSB7T2JqZWN0PX0ga3dhcmdzXG4gKi9cbnZhciBTcGxpdEhpZGRlbkRhdGVUaW1lV2lkZ2V0ID0gU3BsaXREYXRlVGltZVdpZGdldC5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oa3dhcmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdpZGdldCkpIHsgcmV0dXJuIG5ldyBTcGxpdEhpZGRlbkRhdGVUaW1lV2lkZ2V0KGt3YXJncykgfVxuICAgIFNwbGl0RGF0ZVRpbWVXaWRnZXQuY2FsbCh0aGlzLCBrd2FyZ3MpXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLndpZGdldHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB0aGlzLndpZGdldHNbaV0uaW5wdXRUeXBlID0gJ2hpZGRlbidcbiAgICAgIHRoaXMud2lkZ2V0c1tpXS5pc0hpZGRlbiA9IHRydWVcbiAgICB9XG4gIH1cbiwgaXNIaWRkZW46IHRydWVcbn0pXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBXaWRnZXQ6IFdpZGdldFxuLCBJbnB1dDogSW5wdXRcbiwgVGV4dElucHV0OiBUZXh0SW5wdXRcbiwgUGFzc3dvcmRJbnB1dDogUGFzc3dvcmRJbnB1dFxuLCBIaWRkZW5JbnB1dDogSGlkZGVuSW5wdXRcbiwgTXVsdGlwbGVIaWRkZW5JbnB1dDogTXVsdGlwbGVIaWRkZW5JbnB1dFxuLCBGaWxlSW5wdXQ6IEZpbGVJbnB1dFxuLCBGSUxFX0lOUFVUX0NPTlRSQURJQ1RJT046IEZJTEVfSU5QVVRfQ09OVFJBRElDVElPTlxuLCBDbGVhcmFibGVGaWxlSW5wdXQ6IENsZWFyYWJsZUZpbGVJbnB1dFxuLCBUZXh0YXJlYTogVGV4dGFyZWFcbiwgRGF0ZUlucHV0OiBEYXRlSW5wdXRcbiwgRGF0ZVRpbWVJbnB1dDogRGF0ZVRpbWVJbnB1dFxuLCBUaW1lSW5wdXQ6IFRpbWVJbnB1dFxuLCBDaGVja2JveElucHV0OiBDaGVja2JveElucHV0XG4sIFNlbGVjdDogU2VsZWN0XG4sIE51bGxCb29sZWFuU2VsZWN0OiBOdWxsQm9vbGVhblNlbGVjdFxuLCBTZWxlY3RNdWx0aXBsZTogU2VsZWN0TXVsdGlwbGVcbiwgUmFkaW9JbnB1dDogUmFkaW9JbnB1dFxuLCBSYWRpb0ZpZWxkUmVuZGVyZXI6IFJhZGlvRmllbGRSZW5kZXJlclxuLCBSYWRpb1NlbGVjdDogUmFkaW9TZWxlY3RcbiwgQ2hlY2tib3hTZWxlY3RNdWx0aXBsZTogQ2hlY2tib3hTZWxlY3RNdWx0aXBsZVxuLCBNdWx0aVdpZGdldDogTXVsdGlXaWRnZXRcbiwgU3BsaXREYXRlVGltZVdpZGdldDogU3BsaXREYXRlVGltZVdpZGdldFxuLCBTcGxpdEhpZGRlbkRhdGVUaW1lV2lkZ2V0OiBTcGxpdEhpZGRlbkRhdGVUaW1lV2lkZ2V0XG59XG4iLCJ2YXIgaXMgPSByZXF1aXJlKCdpc29tb3JwaC9pcycpXG4gICwgb2JqZWN0ID0gcmVxdWlyZSgnaXNvbW9ycGgvb2JqZWN0JylcblxuLyoqXG4gKiBNaXhlcyBpbiBwcm9wZXJ0aWVzIGZyb20gb25lIG9iamVjdCB0byBhbm90aGVyLiBJZiB0aGUgc291cmNlIG9iamVjdCBpcyBhXG4gKiBGdW5jdGlvbiwgaXRzIHByb3RvdHlwZSBpcyBtaXhlZCBpbiBpbnN0ZWFkLlxuICovXG5mdW5jdGlvbiBtaXhpbihkZXN0LCBzcmMpIHtcbiAgaWYgKGlzLkZ1bmN0aW9uKHNyYykpIHtcbiAgICBvYmplY3QuZXh0ZW5kKGRlc3QsIHNyYy5wcm90b3R5cGUpXG4gIH1cbiAgZWxzZSB7XG4gICAgb2JqZWN0LmV4dGVuZChkZXN0LCBzcmMpXG4gIH1cbn1cblxuLyoqXG4gKiBBcHBsaWVzIG1peGlucyBzcGVjaWZpZWQgYXMgYSBfX21peGluX18gcHJvcGVydHkgb24gdGhlIGdpdmVuIHByb3BlcnRpZXNcbiAqIG9iamVjdCwgcmV0dXJuaW5nIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBtaXhlZCBpbiBwcm9wZXJ0aWVzLlxuICovXG5mdW5jdGlvbiBhcHBseU1peGlucyhwcm9wZXJ0aWVzKSB7XG4gIHZhciBtaXhpbnMgPSBwcm9wZXJ0aWVzLl9fbWl4aW5fX1xuICBpZiAoIWlzLkFycmF5KG1peGlucykpIHtcbiAgICBtaXhpbnMgPSBbbWl4aW5zXVxuICB9XG4gIHZhciBtaXhlZFByb3BlcnRpZXMgPSB7fVxuICBmb3IgKHZhciBpID0gMCwgbCA9IG1peGlucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBtaXhpbihtaXhlZFByb3BlcnRpZXMsIG1peGluc1tpXSlcbiAgfVxuICBkZWxldGUgcHJvcGVydGllcy5fX21peGluX19cbiAgcmV0dXJuIG9iamVjdC5leHRlbmQobWl4ZWRQcm9wZXJ0aWVzLCBwcm9wZXJ0aWVzKVxufVxuXG4vKipcbiAqIEluaGVyaXRzIGFub3RoZXIgY29uc3RydWN0b3IncyBwcm90b3R5cGUgYW5kIHNldHMgaXRzIHByb3RvdHlwZSBhbmRcbiAqIGNvbnN0cnVjdG9yIHByb3BlcnRpZXMgaW4gb25lIGZlbGwgc3dvb3AuXG4gKlxuICogSWYgYSBjaGlsZCBjb25zdHJ1Y3RvciBpcyBub3QgcHJvdmlkZWQgdmlhIHByb3RvdHlwZVByb3BzLmNvbnN0cnVjdG9yLFxuICogYSBuZXcgY29uc3RydWN0b3Igd2lsbCBiZSBjcmVhdGVkLlxuICovXG5mdW5jdGlvbiBpbmhlcml0RnJvbShwYXJlbnRDb25zdHJ1Y3RvciwgcHJvdG90eXBlUHJvcHMsIGNvbnN0cnVjdG9yUHJvcHMpIHtcbiAgLy8gR2V0IG9yIGNyZWF0ZSBhIGNoaWxkIGNvbnN0cnVjdG9yXG4gIHZhciBjaGlsZENvbnN0cnVjdG9yXG4gIGlmIChwcm90b3R5cGVQcm9wcyAmJiBvYmplY3QuaGFzT3duKHByb3RvdHlwZVByb3BzLCAnY29uc3RydWN0b3InKSkge1xuICAgIGNoaWxkQ29uc3RydWN0b3IgPSBwcm90b3R5cGVQcm9wcy5jb25zdHJ1Y3RvclxuICB9XG4gIGVsc2Uge1xuICAgIGNoaWxkQ29uc3RydWN0b3IgPSBmdW5jdGlvbigpIHtcbiAgICAgIHBhcmVudENvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICB9XG4gIH1cblxuICAvLyBCYXNlIGNvbnN0cnVjdG9ycyBzaG91bGQgb25seSBoYXZlIHRoZSBwcm9wZXJ0aWVzIHRoZXkncmUgZGVmaW5lZCB3aXRoXG4gIGlmIChwYXJlbnRDb25zdHJ1Y3RvciAhPT0gQ29uY3VyKSB7XG4gICAgLy8gSW5oZXJpdCB0aGUgcGFyZW50J3MgcHJvdG90eXBlXG4gICAgb2JqZWN0LmluaGVyaXRzKGNoaWxkQ29uc3RydWN0b3IsIHBhcmVudENvbnN0cnVjdG9yKVxuICAgIGNoaWxkQ29uc3RydWN0b3IuX19zdXBlcl9fID0gcGFyZW50Q29uc3RydWN0b3IucHJvdG90eXBlXG4gIH1cblxuICAvLyBBZGQgcHJvdG90eXBlIHByb3BlcnRpZXMsIGlmIGdpdmVuXG4gIGlmIChwcm90b3R5cGVQcm9wcykge1xuICAgIG9iamVjdC5leHRlbmQoY2hpbGRDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvdHlwZVByb3BzKVxuICB9XG5cbiAgLy8gQWRkIGNvbnN0cnVjdG9yIHByb3BlcnRpZXMsIGlmIGdpdmVuXG4gIGlmIChjb25zdHJ1Y3RvclByb3BzKSB7XG4gICAgb2JqZWN0LmV4dGVuZChjaGlsZENvbnN0cnVjdG9yLCBjb25zdHJ1Y3RvclByb3BzKVxuICB9XG5cbiAgcmV0dXJuIGNoaWxkQ29uc3RydWN0b3Jcbn1cblxuLyoqXG4gKiBOYW1lc3BhY2UgYW5kIGR1bW15IGNvbnN0cnVjdG9yIGZvciBpbml0aWFsIGV4dGVuc2lvbi5cbiAqL1xudmFyIENvbmN1ciA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7fVxuXG4vKipcbiAqIENyZWF0ZXMgb3IgdXNlcyBhIGNoaWxkIGNvbnN0cnVjdG9yIHRvIGluaGVyaXQgZnJvbSB0aGUgdGhlIGNhbGxcbiAqIGNvbnRleHQsIHdoaWNoIGlzIGV4cGVjdGVkIHRvIGJlIGEgY29uc3RydWN0b3IuXG4gKi9cbkNvbmN1ci5leHRlbmQgPSBmdW5jdGlvbihwcm90b3R5cGVQcm9wcywgY29uc3RydWN0b3JQcm9wcykge1xuICAvLyBJZiB0aGUgY29uc3RydWN0b3IgYmVpbmcgaW5oZXJpdGVkIGZyb20gaGFzIGEgX19tZXRhX18gZnVuY3Rpb24gc29tZXdoZXJlXG4gIC8vIGluIGl0cyBwcm90b3R5cGUgY2hhaW4sIGNhbGwgaXQgdG8gY3VzdG9taXNlIHByb3RvdHlwZSBhbmQgY29uc3RydWN0b3JcbiAgLy8gcHJvcGVydGllcyBiZWZvcmUgdGhleSdyZSB1c2VkIHRvIHNldCB1cCB0aGUgbmV3IGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlLlxuICBpZiAodHlwZW9mIHRoaXMucHJvdG90eXBlLl9fbWV0YV9fICE9ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gUHJvcGVydHkgb2JqZWN0cyBtdXN0IGFsd2F5cyBleGlzdCBzbyBwcm9wZXJ0aWVzIGNhbiBiZSBhZGRlZCB0b1xuICAgIC8vIGFuZCByZW1vdmVkIGZyb20gdGhlbS5cbiAgICBwcm90b3R5cGVQcm9wcyA9IHByb3RvdHlwZVByb3BzIHx8IHt9XG4gICAgY29uc3RydWN0b3JQcm9wcyA9IGNvbnN0cnVjdG9yUHJvcHMgfHwge31cbiAgICB0aGlzLnByb3RvdHlwZS5fX21ldGFfXyhwcm90b3R5cGVQcm9wcywgY29uc3RydWN0b3JQcm9wcylcbiAgfVxuXG4gIC8vIElmIGFueSBtaXhpbnMgYXJlIHNwZWNpZmllZCwgbWl4IHRoZW0gaW50byB0aGUgcHJvcGVydHkgb2JqZWN0c1xuICBpZiAocHJvdG90eXBlUHJvcHMgJiYgb2JqZWN0Lmhhc093bihwcm90b3R5cGVQcm9wcywgJ19fbWl4aW5fXycpKSB7XG4gICAgcHJvdG90eXBlUHJvcHMgPSBhcHBseU1peGlucyhwcm90b3R5cGVQcm9wcylcbiAgfVxuICBpZiAoY29uc3RydWN0b3JQcm9wcyAmJiBvYmplY3QuaGFzT3duKGNvbnN0cnVjdG9yUHJvcHMsICdfX21peGluX18nKSkge1xuICAgIGNvbnN0cnVjdG9yUHJvcHMgPSBhcHBseU1peGlucyhjb25zdHJ1Y3RvclByb3BzKVxuICB9XG5cbiAgLy8gU2V0IHVwIGFuZCByZXR1cm4gdGhlIG5ldyBjaGlsZCBjb25zdHJ1Y3RvclxuICB2YXIgY2hpbGRDb25zdHJ1Y3RvciA9IGluaGVyaXRGcm9tKHRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG90eXBlUHJvcHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JQcm9wcylcbiAgY2hpbGRDb25zdHJ1Y3Rvci5leHRlbmQgPSB0aGlzLmV4dGVuZFxuICByZXR1cm4gY2hpbGRDb25zdHJ1Y3RvclxufVxuIiwidmFyIGdsb2JhbD10eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge307LyohIGh0dHA6Ly9tdGhzLmJlL3B1bnljb2RlIHYxLjIuMyBieSBAbWF0aGlhcyAqL1xuOyhmdW5jdGlvbihyb290KSB7XG5cblx0LyoqIERldGVjdCBmcmVlIHZhcmlhYmxlcyAqL1xuXHR2YXIgZnJlZUV4cG9ydHMgPSB0eXBlb2YgZXhwb3J0cyA9PSAnb2JqZWN0JyAmJiBleHBvcnRzO1xuXHR2YXIgZnJlZU1vZHVsZSA9IHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlICYmXG5cdFx0bW9kdWxlLmV4cG9ydHMgPT0gZnJlZUV4cG9ydHMgJiYgbW9kdWxlO1xuXHR2YXIgZnJlZUdsb2JhbCA9IHR5cGVvZiBnbG9iYWwgPT0gJ29iamVjdCcgJiYgZ2xvYmFsO1xuXHRpZiAoZnJlZUdsb2JhbC5nbG9iYWwgPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbC53aW5kb3cgPT09IGZyZWVHbG9iYWwpIHtcblx0XHRyb290ID0gZnJlZUdsb2JhbDtcblx0fVxuXG5cdC8qKlxuXHQgKiBUaGUgYHB1bnljb2RlYCBvYmplY3QuXG5cdCAqIEBuYW1lIHB1bnljb2RlXG5cdCAqIEB0eXBlIE9iamVjdFxuXHQgKi9cblx0dmFyIHB1bnljb2RlLFxuXG5cdC8qKiBIaWdoZXN0IHBvc2l0aXZlIHNpZ25lZCAzMi1iaXQgZmxvYXQgdmFsdWUgKi9cblx0bWF4SW50ID0gMjE0NzQ4MzY0NywgLy8gYWthLiAweDdGRkZGRkZGIG9yIDJeMzEtMVxuXG5cdC8qKiBCb290c3RyaW5nIHBhcmFtZXRlcnMgKi9cblx0YmFzZSA9IDM2LFxuXHR0TWluID0gMSxcblx0dE1heCA9IDI2LFxuXHRza2V3ID0gMzgsXG5cdGRhbXAgPSA3MDAsXG5cdGluaXRpYWxCaWFzID0gNzIsXG5cdGluaXRpYWxOID0gMTI4LCAvLyAweDgwXG5cdGRlbGltaXRlciA9ICctJywgLy8gJ1xceDJEJ1xuXG5cdC8qKiBSZWd1bGFyIGV4cHJlc3Npb25zICovXG5cdHJlZ2V4UHVueWNvZGUgPSAvXnhuLS0vLFxuXHRyZWdleE5vbkFTQ0lJID0gL1teIC1+XS8sIC8vIHVucHJpbnRhYmxlIEFTQ0lJIGNoYXJzICsgbm9uLUFTQ0lJIGNoYXJzXG5cdHJlZ2V4U2VwYXJhdG9ycyA9IC9cXHgyRXxcXHUzMDAyfFxcdUZGMEV8XFx1RkY2MS9nLCAvLyBSRkMgMzQ5MCBzZXBhcmF0b3JzXG5cblx0LyoqIEVycm9yIG1lc3NhZ2VzICovXG5cdGVycm9ycyA9IHtcblx0XHQnb3ZlcmZsb3cnOiAnT3ZlcmZsb3c6IGlucHV0IG5lZWRzIHdpZGVyIGludGVnZXJzIHRvIHByb2Nlc3MnLFxuXHRcdCdub3QtYmFzaWMnOiAnSWxsZWdhbCBpbnB1dCA+PSAweDgwIChub3QgYSBiYXNpYyBjb2RlIHBvaW50KScsXG5cdFx0J2ludmFsaWQtaW5wdXQnOiAnSW52YWxpZCBpbnB1dCdcblx0fSxcblxuXHQvKiogQ29udmVuaWVuY2Ugc2hvcnRjdXRzICovXG5cdGJhc2VNaW51c1RNaW4gPSBiYXNlIC0gdE1pbixcblx0Zmxvb3IgPSBNYXRoLmZsb29yLFxuXHRzdHJpbmdGcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlLFxuXG5cdC8qKiBUZW1wb3JhcnkgdmFyaWFibGUgKi9cblx0a2V5O1xuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKlxuXHQgKiBBIGdlbmVyaWMgZXJyb3IgdXRpbGl0eSBmdW5jdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgVGhlIGVycm9yIHR5cGUuXG5cdCAqIEByZXR1cm5zIHtFcnJvcn0gVGhyb3dzIGEgYFJhbmdlRXJyb3JgIHdpdGggdGhlIGFwcGxpY2FibGUgZXJyb3IgbWVzc2FnZS5cblx0ICovXG5cdGZ1bmN0aW9uIGVycm9yKHR5cGUpIHtcblx0XHR0aHJvdyBSYW5nZUVycm9yKGVycm9yc1t0eXBlXSk7XG5cdH1cblxuXHQvKipcblx0ICogQSBnZW5lcmljIGBBcnJheSNtYXBgIHV0aWxpdHkgZnVuY3Rpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpdGVyYXRlIG92ZXIuXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGZvciBldmVyeSBhcnJheVxuXHQgKiBpdGVtLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IGFycmF5IG9mIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXAoYXJyYXksIGZuKSB7XG5cdFx0dmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblx0XHR3aGlsZSAobGVuZ3RoLS0pIHtcblx0XHRcdGFycmF5W2xlbmd0aF0gPSBmbihhcnJheVtsZW5ndGhdKTtcblx0XHR9XG5cdFx0cmV0dXJuIGFycmF5O1xuXHR9XG5cblx0LyoqXG5cdCAqIEEgc2ltcGxlIGBBcnJheSNtYXBgLWxpa2Ugd3JhcHBlciB0byB3b3JrIHdpdGggZG9tYWluIG5hbWUgc3RyaW5ncy5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgZG9tYWluIG5hbWUuXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGZvciBldmVyeVxuXHQgKiBjaGFyYWN0ZXIuXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgc3RyaW5nIG9mIGNoYXJhY3RlcnMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrXG5cdCAqIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZnVuY3Rpb24gbWFwRG9tYWluKHN0cmluZywgZm4pIHtcblx0XHRyZXR1cm4gbWFwKHN0cmluZy5zcGxpdChyZWdleFNlcGFyYXRvcnMpLCBmbikuam9pbignLicpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgbnVtZXJpYyBjb2RlIHBvaW50cyBvZiBlYWNoIFVuaWNvZGVcblx0ICogY2hhcmFjdGVyIGluIHRoZSBzdHJpbmcuIFdoaWxlIEphdmFTY3JpcHQgdXNlcyBVQ1MtMiBpbnRlcm5hbGx5LFxuXHQgKiB0aGlzIGZ1bmN0aW9uIHdpbGwgY29udmVydCBhIHBhaXIgb2Ygc3Vycm9nYXRlIGhhbHZlcyAoZWFjaCBvZiB3aGljaFxuXHQgKiBVQ1MtMiBleHBvc2VzIGFzIHNlcGFyYXRlIGNoYXJhY3RlcnMpIGludG8gYSBzaW5nbGUgY29kZSBwb2ludCxcblx0ICogbWF0Y2hpbmcgVVRGLTE2LlxuXHQgKiBAc2VlIGBwdW55Y29kZS51Y3MyLmVuY29kZWBcblx0ICogQHNlZSA8aHR0cDovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcblx0ICogQG5hbWUgZGVjb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgVGhlIFVuaWNvZGUgaW5wdXQgc3RyaW5nIChVQ1MtMikuXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gVGhlIG5ldyBhcnJheSBvZiBjb2RlIHBvaW50cy5cblx0ICovXG5cdGZ1bmN0aW9uIHVjczJkZWNvZGUoc3RyaW5nKSB7XG5cdFx0dmFyIG91dHB1dCA9IFtdLFxuXHRcdCAgICBjb3VudGVyID0gMCxcblx0XHQgICAgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aCxcblx0XHQgICAgdmFsdWUsXG5cdFx0ICAgIGV4dHJhO1xuXHRcdHdoaWxlIChjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0XHR2YWx1ZSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRpZiAodmFsdWUgPj0gMHhEODAwICYmIHZhbHVlIDw9IDB4REJGRiAmJiBjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0XHRcdC8vIGhpZ2ggc3Vycm9nYXRlLCBhbmQgdGhlcmUgaXMgYSBuZXh0IGNoYXJhY3RlclxuXHRcdFx0XHRleHRyYSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRcdGlmICgoZXh0cmEgJiAweEZDMDApID09IDB4REMwMCkgeyAvLyBsb3cgc3Vycm9nYXRlXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goKCh2YWx1ZSAmIDB4M0ZGKSA8PCAxMCkgKyAoZXh0cmEgJiAweDNGRikgKyAweDEwMDAwKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyB1bm1hdGNoZWQgc3Vycm9nYXRlOyBvbmx5IGFwcGVuZCB0aGlzIGNvZGUgdW5pdCwgaW4gY2FzZSB0aGUgbmV4dFxuXHRcdFx0XHRcdC8vIGNvZGUgdW5pdCBpcyB0aGUgaGlnaCBzdXJyb2dhdGUgb2YgYSBzdXJyb2dhdGUgcGFpclxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHRcdFx0XHRjb3VudGVyLS07XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgc3RyaW5nIGJhc2VkIG9uIGFuIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZGVjb2RlYFxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuXHQgKiBAbmFtZSBlbmNvZGVcblx0ICogQHBhcmFtIHtBcnJheX0gY29kZVBvaW50cyBUaGUgYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIG5ldyBVbmljb2RlIHN0cmluZyAoVUNTLTIpLlxuXHQgKi9cblx0ZnVuY3Rpb24gdWNzMmVuY29kZShhcnJheSkge1xuXHRcdHJldHVybiBtYXAoYXJyYXksIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHR2YXIgb3V0cHV0ID0gJyc7XG5cdFx0XHRpZiAodmFsdWUgPiAweEZGRkYpIHtcblx0XHRcdFx0dmFsdWUgLT0gMHgxMDAwMDtcblx0XHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMCk7XG5cdFx0XHRcdHZhbHVlID0gMHhEQzAwIHwgdmFsdWUgJiAweDNGRjtcblx0XHRcdH1cblx0XHRcdG91dHB1dCArPSBzdHJpbmdGcm9tQ2hhckNvZGUodmFsdWUpO1xuXHRcdFx0cmV0dXJuIG91dHB1dDtcblx0XHR9KS5qb2luKCcnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIGJhc2ljIGNvZGUgcG9pbnQgaW50byBhIGRpZ2l0L2ludGVnZXIuXG5cdCAqIEBzZWUgYGRpZ2l0VG9CYXNpYygpYFxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0gY29kZVBvaW50IFRoZSBiYXNpYyBudW1lcmljIGNvZGUgcG9pbnQgdmFsdWUuXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludCAoZm9yIHVzZSBpblxuXHQgKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGluIHRoZSByYW5nZSBgMGAgdG8gYGJhc2UgLSAxYCwgb3IgYGJhc2VgIGlmXG5cdCAqIHRoZSBjb2RlIHBvaW50IGRvZXMgbm90IHJlcHJlc2VudCBhIHZhbHVlLlxuXHQgKi9cblx0ZnVuY3Rpb24gYmFzaWNUb0RpZ2l0KGNvZGVQb2ludCkge1xuXHRcdGlmIChjb2RlUG9pbnQgLSA0OCA8IDEwKSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gMjI7XG5cdFx0fVxuXHRcdGlmIChjb2RlUG9pbnQgLSA2NSA8IDI2KSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gNjU7XG5cdFx0fVxuXHRcdGlmIChjb2RlUG9pbnQgLSA5NyA8IDI2KSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gOTc7XG5cdFx0fVxuXHRcdHJldHVybiBiYXNlO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgZGlnaXQvaW50ZWdlciBpbnRvIGEgYmFzaWMgY29kZSBwb2ludC5cblx0ICogQHNlZSBgYmFzaWNUb0RpZ2l0KClgXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBkaWdpdCBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQuXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBiYXNpYyBjb2RlIHBvaW50IHdob3NlIHZhbHVlICh3aGVuIHVzZWQgZm9yXG5cdCAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaXMgYGRpZ2l0YCwgd2hpY2ggbmVlZHMgdG8gYmUgaW4gdGhlIHJhbmdlXG5cdCAqIGAwYCB0byBgYmFzZSAtIDFgLiBJZiBgZmxhZ2AgaXMgbm9uLXplcm8sIHRoZSB1cHBlcmNhc2UgZm9ybSBpc1xuXHQgKiB1c2VkOyBlbHNlLCB0aGUgbG93ZXJjYXNlIGZvcm0gaXMgdXNlZC4gVGhlIGJlaGF2aW9yIGlzIHVuZGVmaW5lZFxuXHQgKiBpZiBgZmxhZ2AgaXMgbm9uLXplcm8gYW5kIGBkaWdpdGAgaGFzIG5vIHVwcGVyY2FzZSBmb3JtLlxuXHQgKi9cblx0ZnVuY3Rpb24gZGlnaXRUb0Jhc2ljKGRpZ2l0LCBmbGFnKSB7XG5cdFx0Ly8gIDAuLjI1IG1hcCB0byBBU0NJSSBhLi56IG9yIEEuLlpcblx0XHQvLyAyNi4uMzUgbWFwIHRvIEFTQ0lJIDAuLjlcblx0XHRyZXR1cm4gZGlnaXQgKyAyMiArIDc1ICogKGRpZ2l0IDwgMjYpIC0gKChmbGFnICE9IDApIDw8IDUpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEJpYXMgYWRhcHRhdGlvbiBmdW5jdGlvbiBhcyBwZXIgc2VjdGlvbiAzLjQgb2YgUkZDIDM0OTIuXG5cdCAqIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM0OTIjc2VjdGlvbi0zLjRcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGZ1bmN0aW9uIGFkYXB0KGRlbHRhLCBudW1Qb2ludHMsIGZpcnN0VGltZSkge1xuXHRcdHZhciBrID0gMDtcblx0XHRkZWx0YSA9IGZpcnN0VGltZSA/IGZsb29yKGRlbHRhIC8gZGFtcCkgOiBkZWx0YSA+PiAxO1xuXHRcdGRlbHRhICs9IGZsb29yKGRlbHRhIC8gbnVtUG9pbnRzKTtcblx0XHRmb3IgKC8qIG5vIGluaXRpYWxpemF0aW9uICovOyBkZWx0YSA+IGJhc2VNaW51c1RNaW4gKiB0TWF4ID4+IDE7IGsgKz0gYmFzZSkge1xuXHRcdFx0ZGVsdGEgPSBmbG9vcihkZWx0YSAvIGJhc2VNaW51c1RNaW4pO1xuXHRcdH1cblx0XHRyZXR1cm4gZmxvb3IoayArIChiYXNlTWludXNUTWluICsgMSkgKiBkZWx0YSAvIChkZWx0YSArIHNrZXcpKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMgdG8gYSBzdHJpbmcgb2YgVW5pY29kZVxuXHQgKiBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBkZWNvZGUoaW5wdXQpIHtcblx0XHQvLyBEb24ndCB1c2UgVUNTLTJcblx0XHR2YXIgb3V0cHV0ID0gW10sXG5cdFx0ICAgIGlucHV0TGVuZ3RoID0gaW5wdXQubGVuZ3RoLFxuXHRcdCAgICBvdXQsXG5cdFx0ICAgIGkgPSAwLFxuXHRcdCAgICBuID0gaW5pdGlhbE4sXG5cdFx0ICAgIGJpYXMgPSBpbml0aWFsQmlhcyxcblx0XHQgICAgYmFzaWMsXG5cdFx0ICAgIGosXG5cdFx0ICAgIGluZGV4LFxuXHRcdCAgICBvbGRpLFxuXHRcdCAgICB3LFxuXHRcdCAgICBrLFxuXHRcdCAgICBkaWdpdCxcblx0XHQgICAgdCxcblx0XHQgICAgbGVuZ3RoLFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgYmFzZU1pbnVzVDtcblxuXHRcdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHM6IGxldCBgYmFzaWNgIGJlIHRoZSBudW1iZXIgb2YgaW5wdXQgY29kZVxuXHRcdC8vIHBvaW50cyBiZWZvcmUgdGhlIGxhc3QgZGVsaW1pdGVyLCBvciBgMGAgaWYgdGhlcmUgaXMgbm9uZSwgdGhlbiBjb3B5XG5cdFx0Ly8gdGhlIGZpcnN0IGJhc2ljIGNvZGUgcG9pbnRzIHRvIHRoZSBvdXRwdXQuXG5cblx0XHRiYXNpYyA9IGlucHV0Lmxhc3RJbmRleE9mKGRlbGltaXRlcik7XG5cdFx0aWYgKGJhc2ljIDwgMCkge1xuXHRcdFx0YmFzaWMgPSAwO1xuXHRcdH1cblxuXHRcdGZvciAoaiA9IDA7IGogPCBiYXNpYzsgKytqKSB7XG5cdFx0XHQvLyBpZiBpdCdzIG5vdCBhIGJhc2ljIGNvZGUgcG9pbnRcblx0XHRcdGlmIChpbnB1dC5jaGFyQ29kZUF0KGopID49IDB4ODApIHtcblx0XHRcdFx0ZXJyb3IoJ25vdC1iYXNpYycpO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0LnB1c2goaW5wdXQuY2hhckNvZGVBdChqKSk7XG5cdFx0fVxuXG5cdFx0Ly8gTWFpbiBkZWNvZGluZyBsb29wOiBzdGFydCBqdXN0IGFmdGVyIHRoZSBsYXN0IGRlbGltaXRlciBpZiBhbnkgYmFzaWMgY29kZVxuXHRcdC8vIHBvaW50cyB3ZXJlIGNvcGllZDsgc3RhcnQgYXQgdGhlIGJlZ2lubmluZyBvdGhlcndpc2UuXG5cblx0XHRmb3IgKGluZGV4ID0gYmFzaWMgPiAwID8gYmFzaWMgKyAxIDogMDsgaW5kZXggPCBpbnB1dExlbmd0aDsgLyogbm8gZmluYWwgZXhwcmVzc2lvbiAqLykge1xuXG5cdFx0XHQvLyBgaW5kZXhgIGlzIHRoZSBpbmRleCBvZiB0aGUgbmV4dCBjaGFyYWN0ZXIgdG8gYmUgY29uc3VtZWQuXG5cdFx0XHQvLyBEZWNvZGUgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlciBpbnRvIGBkZWx0YWAsXG5cdFx0XHQvLyB3aGljaCBnZXRzIGFkZGVkIHRvIGBpYC4gVGhlIG92ZXJmbG93IGNoZWNraW5nIGlzIGVhc2llclxuXHRcdFx0Ly8gaWYgd2UgaW5jcmVhc2UgYGlgIGFzIHdlIGdvLCB0aGVuIHN1YnRyYWN0IG9mZiBpdHMgc3RhcnRpbmdcblx0XHRcdC8vIHZhbHVlIGF0IHRoZSBlbmQgdG8gb2J0YWluIGBkZWx0YWAuXG5cdFx0XHRmb3IgKG9sZGkgPSBpLCB3ID0gMSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cblx0XHRcdFx0aWYgKGluZGV4ID49IGlucHV0TGVuZ3RoKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ2ludmFsaWQtaW5wdXQnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRpZ2l0ID0gYmFzaWNUb0RpZ2l0KGlucHV0LmNoYXJDb2RlQXQoaW5kZXgrKykpO1xuXG5cdFx0XHRcdGlmIChkaWdpdCA+PSBiYXNlIHx8IGRpZ2l0ID4gZmxvb3IoKG1heEludCAtIGkpIC8gdykpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGkgKz0gZGlnaXQgKiB3O1xuXHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPCB0KSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdGlmICh3ID4gZmxvb3IobWF4SW50IC8gYmFzZU1pbnVzVCkpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHcgKj0gYmFzZU1pbnVzVDtcblxuXHRcdFx0fVxuXG5cdFx0XHRvdXQgPSBvdXRwdXQubGVuZ3RoICsgMTtcblx0XHRcdGJpYXMgPSBhZGFwdChpIC0gb2xkaSwgb3V0LCBvbGRpID09IDApO1xuXG5cdFx0XHQvLyBgaWAgd2FzIHN1cHBvc2VkIHRvIHdyYXAgYXJvdW5kIGZyb20gYG91dGAgdG8gYDBgLFxuXHRcdFx0Ly8gaW5jcmVtZW50aW5nIGBuYCBlYWNoIHRpbWUsIHNvIHdlJ2xsIGZpeCB0aGF0IG5vdzpcblx0XHRcdGlmIChmbG9vcihpIC8gb3V0KSA+IG1heEludCAtIG4pIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdG4gKz0gZmxvb3IoaSAvIG91dCk7XG5cdFx0XHRpICU9IG91dDtcblxuXHRcdFx0Ly8gSW5zZXJ0IGBuYCBhdCBwb3NpdGlvbiBgaWAgb2YgdGhlIG91dHB1dFxuXHRcdFx0b3V0cHV0LnNwbGljZShpKyssIDAsIG4pO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHVjczJlbmNvZGUob3V0cHV0KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMgdG8gYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seVxuXHQgKiBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBlbmNvZGUoaW5wdXQpIHtcblx0XHR2YXIgbixcblx0XHQgICAgZGVsdGEsXG5cdFx0ICAgIGhhbmRsZWRDUENvdW50LFxuXHRcdCAgICBiYXNpY0xlbmd0aCxcblx0XHQgICAgYmlhcyxcblx0XHQgICAgaixcblx0XHQgICAgbSxcblx0XHQgICAgcSxcblx0XHQgICAgayxcblx0XHQgICAgdCxcblx0XHQgICAgY3VycmVudFZhbHVlLFxuXHRcdCAgICBvdXRwdXQgPSBbXSxcblx0XHQgICAgLyoqIGBpbnB1dExlbmd0aGAgd2lsbCBob2xkIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgaW4gYGlucHV0YC4gKi9cblx0XHQgICAgaW5wdXRMZW5ndGgsXG5cdFx0ICAgIC8qKiBDYWNoZWQgY2FsY3VsYXRpb24gcmVzdWx0cyAqL1xuXHRcdCAgICBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsXG5cdFx0ICAgIGJhc2VNaW51c1QsXG5cdFx0ICAgIHFNaW51c1Q7XG5cblx0XHQvLyBDb252ZXJ0IHRoZSBpbnB1dCBpbiBVQ1MtMiB0byBVbmljb2RlXG5cdFx0aW5wdXQgPSB1Y3MyZGVjb2RlKGlucHV0KTtcblxuXHRcdC8vIENhY2hlIHRoZSBsZW5ndGhcblx0XHRpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aDtcblxuXHRcdC8vIEluaXRpYWxpemUgdGhlIHN0YXRlXG5cdFx0biA9IGluaXRpYWxOO1xuXHRcdGRlbHRhID0gMDtcblx0XHRiaWFzID0gaW5pdGlhbEJpYXM7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzXG5cdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IDB4ODApIHtcblx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGN1cnJlbnRWYWx1ZSkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGhhbmRsZWRDUENvdW50ID0gYmFzaWNMZW5ndGggPSBvdXRwdXQubGVuZ3RoO1xuXG5cdFx0Ly8gYGhhbmRsZWRDUENvdW50YCBpcyB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIHRoYXQgaGF2ZSBiZWVuIGhhbmRsZWQ7XG5cdFx0Ly8gYGJhc2ljTGVuZ3RoYCBpcyB0aGUgbnVtYmVyIG9mIGJhc2ljIGNvZGUgcG9pbnRzLlxuXG5cdFx0Ly8gRmluaXNoIHRoZSBiYXNpYyBzdHJpbmcgLSBpZiBpdCBpcyBub3QgZW1wdHkgLSB3aXRoIGEgZGVsaW1pdGVyXG5cdFx0aWYgKGJhc2ljTGVuZ3RoKSB7XG5cdFx0XHRvdXRwdXQucHVzaChkZWxpbWl0ZXIpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZW5jb2RpbmcgbG9vcDpcblx0XHR3aGlsZSAoaGFuZGxlZENQQ291bnQgPCBpbnB1dExlbmd0aCkge1xuXG5cdFx0XHQvLyBBbGwgbm9uLWJhc2ljIGNvZGUgcG9pbnRzIDwgbiBoYXZlIGJlZW4gaGFuZGxlZCBhbHJlYWR5LiBGaW5kIHRoZSBuZXh0XG5cdFx0XHQvLyBsYXJnZXIgb25lOlxuXHRcdFx0Zm9yIChtID0gbWF4SW50LCBqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPj0gbiAmJiBjdXJyZW50VmFsdWUgPCBtKSB7XG5cdFx0XHRcdFx0bSA9IGN1cnJlbnRWYWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbmNyZWFzZSBgZGVsdGFgIGVub3VnaCB0byBhZHZhbmNlIHRoZSBkZWNvZGVyJ3MgPG4saT4gc3RhdGUgdG8gPG0sMD4sXG5cdFx0XHQvLyBidXQgZ3VhcmQgYWdhaW5zdCBvdmVyZmxvd1xuXHRcdFx0aGFuZGxlZENQQ291bnRQbHVzT25lID0gaGFuZGxlZENQQ291bnQgKyAxO1xuXHRcdFx0aWYgKG0gLSBuID4gZmxvb3IoKG1heEludCAtIGRlbHRhKSAvIGhhbmRsZWRDUENvdW50UGx1c09uZSkpIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdGRlbHRhICs9IChtIC0gbikgKiBoYW5kbGVkQ1BDb3VudFBsdXNPbmU7XG5cdFx0XHRuID0gbTtcblxuXHRcdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IG4gJiYgKytkZWx0YSA+IG1heEludCkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA9PSBuKSB7XG5cdFx0XHRcdFx0Ly8gUmVwcmVzZW50IGRlbHRhIGFzIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXJcblx0XHRcdFx0XHRmb3IgKHEgPSBkZWx0YSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cdFx0XHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblx0XHRcdFx0XHRcdGlmIChxIDwgdCkge1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHFNaW51c1QgPSBxIC0gdDtcblx0XHRcdFx0XHRcdGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0XHRcdG91dHB1dC5wdXNoKFxuXHRcdFx0XHRcdFx0XHRzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHQgKyBxTWludXNUICUgYmFzZU1pbnVzVCwgMCkpXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0cSA9IGZsb29yKHFNaW51c1QgLyBiYXNlTWludXNUKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHEsIDApKSk7XG5cdFx0XHRcdFx0YmlhcyA9IGFkYXB0KGRlbHRhLCBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsIGhhbmRsZWRDUENvdW50ID09IGJhc2ljTGVuZ3RoKTtcblx0XHRcdFx0XHRkZWx0YSA9IDA7XG5cdFx0XHRcdFx0KytoYW5kbGVkQ1BDb3VudDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQrK2RlbHRhO1xuXHRcdFx0KytuO1xuXG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgdG8gVW5pY29kZS4gT25seSB0aGVcblx0ICogUHVueWNvZGVkIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLiBpdCBkb2Vzbid0XG5cdCAqIG1hdHRlciBpZiB5b3UgY2FsbCBpdCBvbiBhIHN0cmluZyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gY29udmVydGVkIHRvXG5cdCAqIFVuaWNvZGUuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBQdW55Y29kZSBkb21haW4gbmFtZSB0byBjb252ZXJ0IHRvIFVuaWNvZGUuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBVbmljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBQdW55Y29kZVxuXHQgKiBzdHJpbmcuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b1VuaWNvZGUoZG9tYWluKSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihkb21haW4sIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4UHVueWNvZGUudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gZGVjb2RlKHN0cmluZy5zbGljZSg0KS50b0xvd2VyQ2FzZSgpKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFVuaWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIHRvIFB1bnljb2RlLiBPbmx5IHRoZVxuXHQgKiBub24tQVNDSUkgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLCBpLmUuIGl0IGRvZXNuJ3Rcblx0ICogbWF0dGVyIGlmIHlvdSBjYWxsIGl0IHdpdGggYSBkb21haW4gdGhhdCdzIGFscmVhZHkgaW4gQVNDSUkuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZSB0byBjb252ZXJ0LCBhcyBhIFVuaWNvZGUgc3RyaW5nLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgUHVueWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIGRvbWFpbiBuYW1lLlxuXHQgKi9cblx0ZnVuY3Rpb24gdG9BU0NJSShkb21haW4pIHtcblx0XHRyZXR1cm4gbWFwRG9tYWluKGRvbWFpbiwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhOb25BU0NJSS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyAneG4tLScgKyBlbmNvZGUoc3RyaW5nKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKiBEZWZpbmUgdGhlIHB1YmxpYyBBUEkgKi9cblx0cHVueWNvZGUgPSB7XG5cdFx0LyoqXG5cdFx0ICogQSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IFB1bnljb2RlLmpzIHZlcnNpb24gbnVtYmVyLlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIFN0cmluZ1xuXHRcdCAqL1xuXHRcdCd2ZXJzaW9uJzogJzEuMi4zJyxcblx0XHQvKipcblx0XHQgKiBBbiBvYmplY3Qgb2YgbWV0aG9kcyB0byBjb252ZXJ0IGZyb20gSmF2YVNjcmlwdCdzIGludGVybmFsIGNoYXJhY3RlclxuXHRcdCAqIHJlcHJlc2VudGF0aW9uIChVQ1MtMikgdG8gVW5pY29kZSBjb2RlIHBvaW50cywgYW5kIGJhY2suXG5cdFx0ICogQHNlZSA8aHR0cDovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0XHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0XHQgKiBAdHlwZSBPYmplY3Rcblx0XHQgKi9cblx0XHQndWNzMic6IHtcblx0XHRcdCdkZWNvZGUnOiB1Y3MyZGVjb2RlLFxuXHRcdFx0J2VuY29kZSc6IHVjczJlbmNvZGVcblx0XHR9LFxuXHRcdCdkZWNvZGUnOiBkZWNvZGUsXG5cdFx0J2VuY29kZSc6IGVuY29kZSxcblx0XHQndG9BU0NJSSc6IHRvQVNDSUksXG5cdFx0J3RvVW5pY29kZSc6IHRvVW5pY29kZVxuXHR9O1xuXG5cdC8qKiBFeHBvc2UgYHB1bnljb2RlYCAqL1xuXHQvLyBTb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBzcGVjaWZpYyBjb25kaXRpb24gcGF0dGVybnNcblx0Ly8gbGlrZSB0aGUgZm9sbG93aW5nOlxuXHRpZiAoXG5cdFx0dHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmXG5cdFx0dHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiZcblx0XHRkZWZpbmUuYW1kXG5cdCkge1xuXHRcdGRlZmluZShmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwdW55Y29kZTtcblx0XHR9KTtcblx0fVx0ZWxzZSBpZiAoZnJlZUV4cG9ydHMgJiYgIWZyZWVFeHBvcnRzLm5vZGVUeXBlKSB7XG5cdFx0aWYgKGZyZWVNb2R1bGUpIHsgLy8gaW4gTm9kZS5qcyBvciBSaW5nb0pTIHYwLjguMCtcblx0XHRcdGZyZWVNb2R1bGUuZXhwb3J0cyA9IHB1bnljb2RlO1xuXHRcdH0gZWxzZSB7IC8vIGluIE5hcndoYWwgb3IgUmluZ29KUyB2MC43LjAtXG5cdFx0XHRmb3IgKGtleSBpbiBwdW55Y29kZSkge1xuXHRcdFx0XHRwdW55Y29kZS5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIChmcmVlRXhwb3J0c1trZXldID0gcHVueWNvZGVba2V5XSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2UgeyAvLyBpbiBSaGlubyBvciBhIHdlYiBicm93c2VyXG5cdFx0cm9vdC5wdW55Y29kZSA9IHB1bnljb2RlO1xuXHR9XG5cbn0odGhpcykpO1xuIiwidmFyIGlzID0gcmVxdWlyZSgnLi9pcycpXG5cbi8qIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIE9XTCBKYXZhU2NyaXB0IFV0aWxpdGllcy5cblxuT1dMIEphdmFTY3JpcHQgVXRpbGl0aWVzIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vclxubW9kaWZ5IGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG5hcyBwdWJsaXNoZWQgYnkgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZlxudGhlIExpY2Vuc2UsIG9yIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG5cbk9XTCBKYXZhU2NyaXB0IFV0aWxpdGllcyBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2Zcbk1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbkdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuXG5Zb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG5MaWNlbnNlIGFsb25nIHdpdGggT1dMIEphdmFTY3JpcHQgVXRpbGl0aWVzLiAgSWYgbm90LCBzZWVcbjxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiovXG5cbi8vIFJlLXVzYWJsZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiB1c2VkIGJ5IGNsb25lKClcbmZ1bmN0aW9uIENsb25lKCkge31cblxuLy8gQ2xvbmUgb2JqZWN0cywgc2tpcCBvdGhlciB0eXBlc1xuZnVuY3Rpb24gY2xvbmUodGFyZ2V0KSB7XG4gIGlmICh0eXBlb2YgdGFyZ2V0ID09ICdvYmplY3QnKSB7XG4gICAgQ2xvbmUucHJvdG90eXBlID0gdGFyZ2V0XG4gICAgcmV0dXJuIG5ldyBDbG9uZSgpXG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIHRhcmdldFxuICB9XG59XG5cbi8vIFNoYWxsb3cgQ29weVxuZnVuY3Rpb24gY29weSh0YXJnZXQpIHtcbiAgaWYgKHR5cGVvZiB0YXJnZXQgIT0gJ29iamVjdCcpIHtcbiAgICAvLyBOb24tb2JqZWN0cyBoYXZlIHZhbHVlIHNlbWFudGljcywgc28gdGFyZ2V0IGlzIGFscmVhZHkgYSBjb3B5XG4gICAgcmV0dXJuIHRhcmdldFxuICB9XG4gIGVsc2Uge1xuICAgIHZhciB2YWx1ZSA9IHRhcmdldC52YWx1ZU9mKClcbiAgICBpZiAodGFyZ2V0ICE9IHZhbHVlKSB7XG4gICAgICAvLyB0aGUgb2JqZWN0IGlzIGEgc3RhbmRhcmQgb2JqZWN0IHdyYXBwZXIgZm9yIGEgbmF0aXZlIHR5cGUsIHNheSBTdHJpbmcuXG4gICAgICAvLyB3ZSBjYW4gbWFrZSBhIGNvcHkgYnkgaW5zdGFudGlhdGluZyBhIG5ldyBvYmplY3QgYXJvdW5kIHRoZSB2YWx1ZS5cbiAgICAgIHJldHVybiBuZXcgdGFyZ2V0LmNvbnN0cnVjdG9yKHZhbHVlKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIFdlIGhhdmUgYSBub3JtYWwgb2JqZWN0LiBJZiBwb3NzaWJsZSwgd2UnbGwgY2xvbmUgdGhlIG9yaWdpbmFsJ3NcbiAgICAgIC8vIHByb3RvdHlwZSAobm90IHRoZSBvcmlnaW5hbCkgdG8gZ2V0IGFuIGVtcHR5IG9iamVjdCB3aXRoIHRoZSBzYW1lXG4gICAgICAvLyBwcm90b3R5cGUgY2hhaW4gYXMgdGhlIG9yaWdpbmFsLiBJZiBqdXN0IGNvcHkgdGhlIGluc3RhbmNlIHByb3BlcnRpZXMuXG4gICAgICAvLyBPdGhlcndpc2UsIHdlIGhhdmUgdG8gY29weSB0aGUgd2hvbGUgdGhpbmcsIHByb3BlcnR5LWJ5LXByb3BlcnR5LlxuICAgICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIHRhcmdldC5jb25zdHJ1Y3RvciAmJiB0YXJnZXQuY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuICAgICAgICB2YXIgYyA9IGNsb25lKHRhcmdldC5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpXG5cbiAgICAgICAgLy8gR2l2ZSB0aGUgY29weSBhbGwgdGhlIGluc3RhbmNlIHByb3BlcnRpZXMgb2YgdGFyZ2V0LiBJdCBoYXMgdGhlIHNhbWVcbiAgICAgICAgLy8gcHJvdG90eXBlIGFzIHRhcmdldCwgc28gaW5oZXJpdGVkIHByb3BlcnRpZXMgYXJlIGFscmVhZHkgdGhlcmUuXG4gICAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRhcmdldCkge1xuICAgICAgICAgIGlmICh0YXJnZXQuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG4gICAgICAgICAgICBjW3Byb3BlcnR5XSA9IHRhcmdldFtwcm9wZXJ0eV1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgYyA9IHt9XG4gICAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRhcmdldCkge1xuICAgICAgICAgIGNbcHJvcGVydHldID0gdGFyZ2V0W3Byb3BlcnR5XVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjXG4gICAgfVxuICB9XG59XG5cbi8vIERlZXAgQ29weVxudmFyIGRlZXBDb3BpZXJzID0gW11cblxuZnVuY3Rpb24gRGVlcENvcGllcihjb25maWcpIHtcbiAgZm9yICh2YXIga2V5IGluIGNvbmZpZykge1xuICAgIHRoaXNba2V5XSA9IGNvbmZpZ1trZXldXG4gIH1cbn1cblxuRGVlcENvcGllci5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBEZWVwQ29waWVyXG5cbiAgLy8gRGV0ZXJtaW5lcyBpZiB0aGlzIERlZXBDb3BpZXIgY2FuIGhhbmRsZSB0aGUgZ2l2ZW4gb2JqZWN0LlxuLCBjYW5Db3B5OiBmdW5jdGlvbihzb3VyY2UpIHsgcmV0dXJuIGZhbHNlIH1cblxuICAvLyBTdGFydHMgdGhlIGRlZXAgY29weWluZyBwcm9jZXNzIGJ5IGNyZWF0aW5nIHRoZSBjb3B5IG9iamVjdC4gWW91IGNhblxuICAvLyBpbml0aWFsaXplIGFueSBwcm9wZXJ0aWVzIHlvdSB3YW50LCBidXQgeW91IGNhbid0IGNhbGwgcmVjdXJzaXZlbHkgaW50byB0aGVcbiAgLy8gRGVlcENvcHlBbGdvcml0aG0uXG4sIGNyZWF0ZTogZnVuY3Rpb24oc291cmNlKSB7fVxuXG4gIC8vIENvbXBsZXRlcyB0aGUgZGVlcCBjb3B5IG9mIHRoZSBzb3VyY2Ugb2JqZWN0IGJ5IHBvcHVsYXRpbmcgYW55IHByb3BlcnRpZXNcbiAgLy8gdGhhdCBuZWVkIHRvIGJlIHJlY3Vyc2l2ZWx5IGRlZXAgY29waWVkLiBZb3UgY2FuIGRvIHRoaXMgYnkgdXNpbmcgdGhlXG4gIC8vIHByb3ZpZGVkIGRlZXBDb3B5QWxnb3JpdGhtIGluc3RhbmNlJ3MgZGVlcENvcHkoKSBtZXRob2QuIFRoaXMgd2lsbCBoYW5kbGVcbiAgLy8gY3ljbGljIHJlZmVyZW5jZXMgZm9yIG9iamVjdHMgYWxyZWFkeSBkZWVwQ29waWVkLCBpbmNsdWRpbmcgdGhlIHNvdXJjZVxuICAvLyBvYmplY3QgaXRzZWxmLiBUaGUgXCJyZXN1bHRcIiBwYXNzZWQgaW4gaXMgdGhlIG9iamVjdCByZXR1cm5lZCBmcm9tIGNyZWF0ZSgpLlxuLCBwb3B1bGF0ZTogZnVuY3Rpb24oZGVlcENvcHlBbGdvcml0aG0sIHNvdXJjZSwgcmVzdWx0KSB7fVxufVxuXG5mdW5jdGlvbiBEZWVwQ29weUFsZ29yaXRobSgpIHtcbiAgLy8gY29waWVkT2JqZWN0cyBrZWVwcyB0cmFjayBvZiBvYmplY3RzIGFscmVhZHkgY29waWVkIGJ5IHRoaXMgZGVlcENvcHlcbiAgLy8gb3BlcmF0aW9uLCBzbyB3ZSBjYW4gY29ycmVjdGx5IGhhbmRsZSBjeWNsaWMgcmVmZXJlbmNlcy5cbiAgdGhpcy5jb3BpZWRPYmplY3RzID0gW11cbiAgdmFyIHRoaXNQYXNzID0gdGhpc1xuICB0aGlzLnJlY3Vyc2l2ZURlZXBDb3B5ID0gZnVuY3Rpb24oc291cmNlKSB7XG4gICAgcmV0dXJuIHRoaXNQYXNzLmRlZXBDb3B5KHNvdXJjZSlcbiAgfVxuICB0aGlzLmRlcHRoID0gMFxufVxuRGVlcENvcHlBbGdvcml0aG0ucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogRGVlcENvcHlBbGdvcml0aG1cblxuLCBtYXhEZXB0aDogMjU2XG5cbiAgLy8gQWRkIGFuIG9iamVjdCB0byB0aGUgY2FjaGUuICBObyBhdHRlbXB0IGlzIG1hZGUgdG8gZmlsdGVyIGR1cGxpY2F0ZXM7IHdlXG4gIC8vIGFsd2F5cyBjaGVjayBnZXRDYWNoZWRSZXN1bHQoKSBiZWZvcmUgY2FsbGluZyBpdC5cbiwgY2FjaGVSZXN1bHQ6IGZ1bmN0aW9uKHNvdXJjZSwgcmVzdWx0KSB7XG4gICAgdGhpcy5jb3BpZWRPYmplY3RzLnB1c2goW3NvdXJjZSwgcmVzdWx0XSlcbiAgfVxuXG4gIC8vIFJldHVybnMgdGhlIGNhY2hlZCBjb3B5IG9mIGEgZ2l2ZW4gb2JqZWN0LCBvciB1bmRlZmluZWQgaWYgaXQncyBhbiBvYmplY3RcbiAgLy8gd2UgaGF2ZW4ndCBzZWVuIGJlZm9yZS5cbiwgZ2V0Q2FjaGVkUmVzdWx0OiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICB2YXIgY29waWVkT2JqZWN0cyA9IHRoaXMuY29waWVkT2JqZWN0c1xuICAgIHZhciBsZW5ndGggPSBjb3BpZWRPYmplY3RzLmxlbmd0aFxuICAgIGZvciAoIHZhciBpPTA7IGk8bGVuZ3RoOyBpKysgKSB7XG4gICAgICBpZiAoIGNvcGllZE9iamVjdHNbaV1bMF0gPT09IHNvdXJjZSApIHtcbiAgICAgICAgcmV0dXJuIGNvcGllZE9iamVjdHNbaV1bMV1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgLy8gZGVlcENvcHkgaGFuZGxlcyB0aGUgc2ltcGxlIGNhc2VzIGl0c2VsZjogbm9uLW9iamVjdHMgYW5kIG9iamVjdCdzIHdlJ3ZlXG4gIC8vIHNlZW4gYmVmb3JlLiBGb3IgY29tcGxleCBjYXNlcywgaXQgZmlyc3QgaWRlbnRpZmllcyBhbiBhcHByb3ByaWF0ZVxuICAvLyBEZWVwQ29waWVyLCB0aGVuIGNhbGxzIGFwcGx5RGVlcENvcGllcigpIHRvIGRlbGVnYXRlIHRoZSBkZXRhaWxzIG9mIGNvcHlpbmdcbiAgLy8gdGhlIG9iamVjdCB0byB0aGF0IERlZXBDb3BpZXIuXG4sIGRlZXBDb3B5OiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAvLyBudWxsIGlzIGEgc3BlY2lhbCBjYXNlOiBpdCdzIHRoZSBvbmx5IHZhbHVlIG9mIHR5cGUgJ29iamVjdCcgd2l0aG91dFxuICAgIC8vIHByb3BlcnRpZXMuXG4gICAgaWYgKHNvdXJjZSA9PT0gbnVsbCkgcmV0dXJuIG51bGxcblxuICAgIC8vIEFsbCBub24tb2JqZWN0cyB1c2UgdmFsdWUgc2VtYW50aWNzIGFuZCBkb24ndCBuZWVkIGV4cGxpY3QgY29weWluZ1xuICAgIGlmICh0eXBlb2Ygc291cmNlICE9ICdvYmplY3QnKSByZXR1cm4gc291cmNlXG5cbiAgICB2YXIgY2FjaGVkUmVzdWx0ID0gdGhpcy5nZXRDYWNoZWRSZXN1bHQoc291cmNlKVxuXG4gICAgLy8gV2UndmUgYWxyZWFkeSBzZWVuIHRoaXMgb2JqZWN0IGR1cmluZyB0aGlzIGRlZXAgY29weSBvcGVyYXRpb24gc28gY2FuXG4gICAgLy8gaW1tZWRpYXRlbHkgcmV0dXJuIHRoZSByZXN1bHQuIFRoaXMgcHJlc2VydmVzIHRoZSBjeWNsaWMgcmVmZXJlbmNlXG4gICAgLy8gc3RydWN0dXJlIGFuZCBwcm90ZWN0cyB1cyBmcm9tIGluZmluaXRlIHJlY3Vyc2lvbi5cbiAgICBpZiAoY2FjaGVkUmVzdWx0KSByZXR1cm4gY2FjaGVkUmVzdWx0XG5cbiAgICAvLyBPYmplY3RzIG1heSBuZWVkIHNwZWNpYWwgaGFuZGxpbmcgZGVwZW5kaW5nIG9uIHRoZWlyIGNsYXNzLiBUaGVyZSBpcyBhXG4gICAgLy8gY2xhc3Mgb2YgaGFuZGxlcnMgY2FsbCBcIkRlZXBDb3BpZXJzXCIgdGhhdCBrbm93IGhvdyB0byBjb3B5IGNlcnRhaW5cbiAgICAvLyBvYmplY3RzLiBUaGVyZSBpcyBhbHNvIGEgZmluYWwsIGdlbmVyaWMgZGVlcCBjb3BpZXIgdGhhdCBjYW4gaGFuZGxlIGFueVxuICAgIC8vIG9iamVjdC5cbiAgICBmb3IgKHZhciBpPTA7IGk8ZGVlcENvcGllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBkZWVwQ29waWVyID0gZGVlcENvcGllcnNbaV1cbiAgICAgIGlmIChkZWVwQ29waWVyLmNhbkNvcHkoc291cmNlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5hcHBseURlZXBDb3BpZXIoZGVlcENvcGllciwgc291cmNlKVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBUaGUgZ2VuZXJpYyBjb3BpZXIgY2FuIGhhbmRsZSBhbnl0aGluZywgc28gd2Ugc2hvdWxkIG5ldmVyIHJlYWNoIHRoaXNcbiAgICAvLyBsaW5lLlxuICAgIHRocm93IG5ldyBFcnJvcignbm8gRGVlcENvcGllciBpcyBhYmxlIHRvIGNvcHkgJyArIHNvdXJjZSlcbiAgfVxuXG4gIC8vIE9uY2Ugd2UndmUgaWRlbnRpZmllZCB3aGljaCBEZWVwQ29waWVyIHRvIHVzZSwgd2UgbmVlZCB0byBjYWxsIGl0IGluIGFcbiAgLy8gdmVyeSBwYXJ0aWN1bGFyIG9yZGVyOiBjcmVhdGUsIGNhY2hlLCBwb3B1bGF0ZS5UaGlzIGlzIHRoZSBrZXkgdG8gZGV0ZWN0aW5nXG4gIC8vIGN5Y2xlcy4gV2UgYWxzbyBrZWVwIHRyYWNrIG9mIHJlY3Vyc2lvbiBkZXB0aCB3aGVuIGNhbGxpbmcgdGhlIHBvdGVudGlhbGx5XG4gIC8vIHJlY3Vyc2l2ZSBwb3B1bGF0ZSgpOiB0aGlzIGlzIGEgZmFpbC1mYXN0IHRvIHByZXZlbnQgYW4gaW5maW5pdGUgbG9vcCBmcm9tXG4gIC8vIGNvbnN1bWluZyBhbGwgYXZhaWxhYmxlIG1lbW9yeSBhbmQgY3Jhc2hpbmcgb3Igc2xvd2luZyBkb3duIHRoZSBicm93c2VyLlxuLCBhcHBseURlZXBDb3BpZXI6IGZ1bmN0aW9uKGRlZXBDb3BpZXIsIHNvdXJjZSkge1xuICAgIC8vIFN0YXJ0IGJ5IGNyZWF0aW5nIGEgc3R1YiBvYmplY3QgdGhhdCByZXByZXNlbnRzIHRoZSBjb3B5LlxuICAgIHZhciByZXN1bHQgPSBkZWVwQ29waWVyLmNyZWF0ZShzb3VyY2UpXG5cbiAgICAvLyBXZSBub3cga25vdyB0aGUgZGVlcCBjb3B5IG9mIHNvdXJjZSBzaG91bGQgYWx3YXlzIGJlIHJlc3VsdCwgc28gaWYgd2VcbiAgICAvLyBlbmNvdW50ZXIgc291cmNlIGFnYWluIGR1cmluZyB0aGlzIGRlZXAgY29weSB3ZSBjYW4gaW1tZWRpYXRlbHkgdXNlXG4gICAgLy8gcmVzdWx0IGluc3RlYWQgb2YgZGVzY2VuZGluZyBpbnRvIGl0IHJlY3Vyc2l2ZWx5LlxuICAgIHRoaXMuY2FjaGVSZXN1bHQoc291cmNlLCByZXN1bHQpXG5cbiAgICAvLyBPbmx5IERlZXBDb3BpZXIucG9wdWxhdGUoKSBjYW4gcmVjdXJzaXZlbHkgZGVlcCBjb3B5LiAgbywgdG8ga2VlcCB0cmFja1xuICAgIC8vIG9mIHJlY3Vyc2lvbiBkZXB0aCwgd2UgaW5jcmVtZW50IHRoaXMgc2hhcmVkIGNvdW50ZXIgYmVmb3JlIGNhbGxpbmcgaXQsXG4gICAgLy8gYW5kIGRlY3JlbWVudCBpdCBhZnRlcndhcmRzLlxuICAgIHRoaXMuZGVwdGgrK1xuICAgIGlmICh0aGlzLmRlcHRoID4gdGhpcy5tYXhEZXB0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhjZWVkZWQgbWF4IHJlY3Vyc2lvbiBkZXB0aCBpbiBkZWVwIGNvcHkuXCIpXG4gICAgfVxuXG4gICAgLy8gSXQncyBub3cgc2FmZSB0byBsZXQgdGhlIGRlZXBDb3BpZXIgcmVjdXJzaXZlbHkgZGVlcCBjb3B5IGl0cyBwcm9wZXJ0aWVzXG4gICAgZGVlcENvcGllci5wb3B1bGF0ZSh0aGlzLnJlY3Vyc2l2ZURlZXBDb3B5LCBzb3VyY2UsIHJlc3VsdClcblxuICAgIHRoaXMuZGVwdGgtLVxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG59XG5cbi8vIEVudHJ5IHBvaW50IGZvciBkZWVwIGNvcHkuXG4vLyAgIHNvdXJjZSBpcyB0aGUgb2JqZWN0IHRvIGJlIGRlZXAgY29waWVkLlxuLy8gICBtYXhEZXB0aCBpcyBhbiBvcHRpb25hbCByZWN1cnNpb24gbGltaXQuIERlZmF1bHRzIHRvIDI1Ni5cbmZ1bmN0aW9uIGRlZXBDb3B5KHNvdXJjZSwgbWF4RGVwdGgpIHtcbiAgdmFyIGRlZXBDb3B5QWxnb3JpdGhtID0gbmV3IERlZXBDb3B5QWxnb3JpdGhtKClcbiAgaWYgKG1heERlcHRoKSB7XG4gICAgZGVlcENvcHlBbGdvcml0aG0ubWF4RGVwdGggPSBtYXhEZXB0aFxuICB9XG4gIHJldHVybiBkZWVwQ29weUFsZ29yaXRobS5kZWVwQ29weShzb3VyY2UpXG59XG5cbi8vIFB1YmxpY2x5IGV4cG9zZSB0aGUgRGVlcENvcGllciBjbGFzc1xuZGVlcENvcHkuRGVlcENvcGllciA9IERlZXBDb3BpZXJcblxuLy8gUHVibGljbHkgZXhwb3NlIHRoZSBsaXN0IG9mIGRlZXBDb3BpZXJzXG5kZWVwQ29weS5kZWVwQ29waWVycyA9IGRlZXBDb3BpZXJzXG5cbi8vIE1ha2UgZGVlcENvcHkoKSBleHRlbnNpYmxlIGJ5IGFsbG93aW5nIG90aGVycyB0byByZWdpc3RlciB0aGVpciBvd24gY3VzdG9tXG4vLyBEZWVwQ29waWVycy5cbmRlZXBDb3B5LnJlZ2lzdGVyID0gZnVuY3Rpb24oZGVlcENvcGllcikge1xuICBpZiAoIShkZWVwQ29waWVyIGluc3RhbmNlb2YgRGVlcENvcGllcikpIHtcbiAgICBkZWVwQ29waWVyID0gbmV3IERlZXBDb3BpZXIoZGVlcENvcGllcilcbiAgfVxuICBkZWVwQ29waWVycy51bnNoaWZ0KGRlZXBDb3BpZXIpXG59XG5cbi8vIEdlbmVyaWMgT2JqZWN0IGNvcGllclxuLy8gVGhlIHVsdGltYXRlIGZhbGxiYWNrIERlZXBDb3BpZXIsIHdoaWNoIHRyaWVzIHRvIGhhbmRsZSB0aGUgZ2VuZXJpYyBjYXNlLlxuLy8gVGhpcyBzaG91bGQgd29yayBmb3IgYmFzZSBPYmplY3RzIGFuZCBtYW55IHVzZXItZGVmaW5lZCBjbGFzc2VzLlxuZGVlcENvcHkucmVnaXN0ZXIoe1xuICBjYW5Db3B5OiBmdW5jdGlvbihzb3VyY2UpIHsgcmV0dXJuIHRydWUgfVxuXG4sIGNyZWF0ZTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIHNvdXJjZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgcmV0dXJuIGNsb25lKHNvdXJjZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIHt9XG4gICAgfVxuICB9XG5cbiwgcG9wdWxhdGU6IGZ1bmN0aW9uKGRlZXBDb3B5LCBzb3VyY2UsIHJlc3VsdCkge1xuICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICByZXN1bHRba2V5XSA9IGRlZXBDb3B5KHNvdXJjZVtrZXldKVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cbn0pXG5cbi8vIEFycmF5IGNvcGllclxuZGVlcENvcHkucmVnaXN0ZXIoe1xuICBjYW5Db3B5OiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICByZXR1cm4gaXMuQXJyYXkoc291cmNlKVxuICB9XG5cbiwgY3JlYXRlOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICByZXR1cm4gbmV3IHNvdXJjZS5jb25zdHJ1Y3RvcigpXG4gIH1cblxuLCBwb3B1bGF0ZTogZnVuY3Rpb24oZGVlcENvcHksIHNvdXJjZSwgcmVzdWx0KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzb3VyY2UubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdC5wdXNoKGRlZXBDb3B5KHNvdXJjZVtpXSkpXG4gICAgfVxuICAgIHJldHVybiByZXN1bHRcbiAgfVxufSlcblxuLy8gRGF0ZSBjb3BpZXJcbmRlZXBDb3B5LnJlZ2lzdGVyKHtcbiAgY2FuQ29weTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgcmV0dXJuIGlzLkRhdGUoc291cmNlKVxuICB9XG5cbiwgY3JlYXRlOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoc291cmNlKVxuICB9XG59KVxuXG4vLyBSZWdFeHAgY29waWVyXG5kZWVwQ29weS5yZWdpc3Rlcih7XG4gIGNhbkNvcHk6IGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgIHJldHVybiBpcy5SZWdFeHAoc291cmNlKVxuICB9XG5cbiwgY3JlYXRlOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICByZXR1cm4gc291cmNlXG4gIH1cbn0pXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBEZWVwQ29weUFsZ29yaXRobTogRGVlcENvcHlBbGdvcml0aG1cbiwgY29weTogY29weVxuLCBjbG9uZTogY2xvbmVcbiwgZGVlcENvcHk6IGRlZXBDb3B5XG59XG4iLCJ2YXIgaXMgPSByZXF1aXJlKCcuL2lzJylcbiAgLCBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZVxuICAsIGZvcm1hdFJlZ0V4cCA9IC8lWyVzXS9nXG4gICwgZm9ybWF0T2JqUmVnRXhwID0gLyh7ez8pKFxcdyspfS9nXG5cbi8qKlxuICogUmVwbGFjZXMgJXMgcGxhY2Vob2xkZXJzIGluIGEgc3RyaW5nIHdpdGggcG9zaXRpb25hbCBhcmd1bWVudHMuXG4gKi9cbmZ1bmN0aW9uIGZvcm1hdChzKSB7XG4gIHJldHVybiBmb3JtYXRBcnIocywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKVxufVxuXG4vKipcbiAqIFJlcGxhY2VzICVzIHBsYWNlaG9sZGVycyBpbiBhIHN0cmluZyB3aXRoIGFycmF5IGNvbnRlbnRzLlxuICovXG5mdW5jdGlvbiBmb3JtYXRBcnIocywgYSkge1xuICB2YXIgaSA9IDBcbiAgcmV0dXJuIHMucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKG0pIHsgcmV0dXJuIG0gPT0gJyUlJyA/ICclJyA6IGFbaSsrXSB9KVxufVxuXG4vKipcbiAqIFJlcGxhY2VzIHtwcm9wZXJ0eU5hbWV9IHBsYWNlaG9sZGVycyBpbiBhIHN0cmluZyB3aXRoIG9iamVjdCBwcm9wZXJ0aWVzLlxuICovXG5mdW5jdGlvbiBmb3JtYXRPYmoocywgbykge1xuICByZXR1cm4gcy5yZXBsYWNlKGZvcm1hdE9ialJlZ0V4cCwgZnVuY3Rpb24obSwgYiwgcCkgeyByZXR1cm4gYi5sZW5ndGggPT0gMiA/IG0uc2xpY2UoMSkgOiBvW3BdIH0pXG59XG5cbnZhciB1bml0cyA9ICdrTUdUUEVaWSdcbiAgLCBzdHJpcERlY2ltYWxzID0gL1xcLjAwJHwwJC9cblxuLyoqXG4gKiBGb3JtYXRzIGJ5dGVzIGFzIGEgZmlsZSBzaXplIHdpdGggdGhlIGFwcHJvcHJpYXRlbHkgc2NhbGVkIHVuaXRzLlxuICovXG5mdW5jdGlvbiBmaWxlU2l6ZShieXRlcywgdGhyZXNob2xkKSB7XG4gIHRocmVzaG9sZCA9IE1hdGgubWluKHRocmVzaG9sZCB8fCA3NjgsIDEwMjQpXG4gIHZhciBpID0gLTFcbiAgICAsIHVuaXQgPSAnYnl0ZXMnXG4gICAgLCBzaXplID0gYnl0ZXNcbiAgd2hpbGUgKHNpemUgPiB0aHJlc2hvbGQgJiYgaSA8IHVuaXRzLmxlbmd0aCkge1xuICAgIHNpemUgPSBzaXplIC8gMTAyNFxuICAgIGkrK1xuICB9XG4gIGlmIChpID4gLTEpIHtcbiAgICB1bml0ID0gdW5pdHMuY2hhckF0KGkpICsgJ0InXG4gIH1cbiAgcmV0dXJuIHNpemUudG9GaXhlZCgyKS5yZXBsYWNlKHN0cmlwRGVjaW1hbHMsICcnKSArICcgJyArIHVuaXRcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGZvcm1hdDogZm9ybWF0XG4sIGZvcm1hdEFycjogZm9ybWF0QXJyXG4sIGZvcm1hdE9iajogZm9ybWF0T2JqXG4sIGZpbGVTaXplOiBmaWxlU2l6ZVxufVxuIiwidmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuXG4vLyBUeXBlIGNoZWNrc1xuXG5mdW5jdGlvbiBpc0FycmF5KG8pIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwobykgPT0gJ1tvYmplY3QgQXJyYXldJ1xufVxuXG5mdW5jdGlvbiBpc0Jvb2xlYW4obykge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvKSA9PSAnW29iamVjdCBCb29sZWFuXSdcbn1cblxuZnVuY3Rpb24gaXNEYXRlKG8pIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwobykgPT0gJ1tvYmplY3QgRGF0ZV0nXG59XG5cbmZ1bmN0aW9uIGlzRXJyb3Iobykge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvKSA9PSAnW29iamVjdCBFcnJvcl0nXG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24obykge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvKSA9PSAnW29iamVjdCBGdW5jdGlvbl0nXG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKG8pIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwobykgPT0gJ1tvYmplY3QgTnVtYmVyXSdcbn1cblxuZnVuY3Rpb24gaXNPYmplY3Qobykge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvKSA9PSAnW29iamVjdCBPYmplY3RdJ1xufVxuXG5mdW5jdGlvbiBpc1JlZ0V4cChvKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKG8pID09ICdbb2JqZWN0IFJlZ0V4cF0nXG59XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKG8pIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwobykgPT0gJ1tvYmplY3QgU3RyaW5nXSdcbn1cblxuLy8gQ29udGVudCBjaGVja3NcblxuZnVuY3Rpb24gaXNFbXB0eShvKSB7XG4gIGZvciAodmFyIHByb3AgaW4gbykge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIHJldHVybiB0cnVlXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBBcnJheTogaXNBcnJheVxuLCBCb29sZWFuOiBpc0Jvb2xlYW5cbiwgRGF0ZTogaXNEYXRlXG4sIEVtcHR5OiBpc0VtcHR5XG4sIEVycm9yOiBpc0Vycm9yXG4sIEZ1bmN0aW9uOiBpc0Z1bmN0aW9uXG4sIE5hTjogaXNOYU5cbiwgTnVtYmVyOiBpc051bWJlclxuLCBPYmplY3Q6IGlzT2JqZWN0XG4sIFJlZ0V4cDogaXNSZWdFeHBcbiwgU3RyaW5nOiBpc1N0cmluZ1xufVxuIiwiLyoqXG4gKiBDYWxsYm91bmQgdmVyc2lvbiBvZiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KCksIHJlYWR5IHRvIGJlIGNhbGxlZFxuICogd2l0aCBhbiBvYmplY3QgYW5kIHByb3BlcnR5IG5hbWUuXG4gKi9cbnZhciBoYXNPd24gPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHlcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgcHJvcCkgeyByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApIH1cbn0pKClcblxuLyoqXG4gKiBDb3BpZXMgb3duIHByb3BlcnRpZXMgZnJvbSBhbnkgZ2l2ZW4gb2JqZWN0cyB0byBhIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gZXh0ZW5kKGRlc3QpIHtcbiAgZm9yICh2YXIgaSA9IDEsIGwgPSBhcmd1bWVudHMubGVuZ3RoLCBzcmM7IGkgPCBsOyBpKyspIHtcbiAgICBzcmMgPSBhcmd1bWVudHNbaV1cbiAgICBpZiAoc3JjKSB7XG4gICAgICBmb3IgKHZhciBwcm9wIGluIHNyYykge1xuICAgICAgICBpZiAoaGFzT3duKHNyYywgcHJvcCkpIHtcbiAgICAgICAgICBkZXN0W3Byb3BdID0gc3JjW3Byb3BdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlc3Rcbn1cblxuLyoqXG4gKiBNYWtlcyBhIGNvbnN0cnVjdG9yIGluaGVyaXQgYW5vdGhlciBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZSB3aXRob3V0XG4gKiBoYXZpbmcgdG8gYWN0dWFsbHkgdXNlIHRoZSBjb25zdHJ1Y3Rvci5cbiAqL1xuZnVuY3Rpb24gaW5oZXJpdHMoY2hpbGRDb25zdHJ1Y3RvciwgcGFyZW50Q29uc3RydWN0b3IpIHtcbiAgdmFyIEYgPSBmdW5jdGlvbigpIHt9XG4gIEYucHJvdG90eXBlID0gcGFyZW50Q29uc3RydWN0b3IucHJvdG90eXBlXG4gIGNoaWxkQ29uc3RydWN0b3IucHJvdG90eXBlID0gbmV3IEYoKVxuICBjaGlsZENvbnN0cnVjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGNoaWxkQ29uc3RydWN0b3JcbiAgcmV0dXJuIGNoaWxkQ29uc3RydWN0b3Jcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIEFycmF5IG9mIFtwcm9wZXJ0eSwgdmFsdWVdIHBhaXJzIGZyb20gYW4gT2JqZWN0LlxuICovXG5mdW5jdGlvbiBpdGVtcyhvYmopIHtcbiAgdmFyIGl0ZW1zID0gW11cbiAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICBpZiAoaGFzT3duKG9iaiwgcHJvcCkpIHtcbiAgICAgIGl0ZW1zLnB1c2goW3Byb3AsIG9ialtwcm9wXV0pXG4gICAgfVxuICB9XG4gIHJldHVybiBpdGVtc1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0IGZyb20gYW4gQXJyYXkgb2YgW3Byb3BlcnR5LCB2YWx1ZV0gcGFpcnMuXG4gKi9cbmZ1bmN0aW9uIGZyb21JdGVtcyhpdGVtcykge1xuICB2YXIgb2JqID0ge31cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBpdGVtcy5sZW5ndGgsIGl0ZW07IGkgPCBsOyBpKyspIHtcbiAgICBpdGVtID0gaXRlbXNbaV1cbiAgICBvYmpbaXRlbVswXV0gPSBpdGVtWzFdXG4gIH1cbiAgcmV0dXJuIG9ialxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBsb29rdXAgT2JqZWN0IGZyb20gYW4gQXJyYXksIGNvZXJjaW5nIGVhY2ggaXRlbSB0byBhIFN0cmluZy5cbiAqL1xuZnVuY3Rpb24gbG9va3VwKGFycikge1xuICB2YXIgb2JqID0ge31cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcnIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgb2JqWycnK2FycltpXV0gPSB0cnVlXG4gIH1cbiAgcmV0dXJuIG9ialxufVxuXG4vKipcbiAqIElmIHRoZSBnaXZlbiBvYmplY3QgaGFzIHRoZSBnaXZlbiBwcm9wZXJ0eSwgcmV0dXJucyBpdHMgdmFsdWUsIG90aGVyd2lzZVxuICogcmV0dXJucyB0aGUgZ2l2ZW4gZGVmYXVsdCB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gZ2V0KG9iaiwgcHJvcCwgZGVmYXVsdFZhbHVlKSB7XG4gIHJldHVybiAoaGFzT3duKG9iaiwgcHJvcCkgPyBvYmpbcHJvcF0gOiBkZWZhdWx0VmFsdWUpXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBoYXNPd246IGhhc093blxuLCBleHRlbmQ6IGV4dGVuZFxuLCBpbmhlcml0czogaW5oZXJpdHNcbiwgaXRlbXM6IGl0ZW1zXG4sIGZyb21JdGVtczogZnJvbUl0ZW1zXG4sIGxvb2t1cDogbG9va3VwXG4sIGdldDogZ2V0XG59XG4iLCJ2YXIgaXMgPSByZXF1aXJlKCcuL2lzJylcblxuLyoqXG4gKiBQYWRzIGEgbnVtYmVyIHdpdGggYSBsZWFkaW5nIHplcm8gaWYgbmVjZXNzYXJ5LlxuICovXG5mdW5jdGlvbiBwYWQobnVtYmVyKSB7XG4gIHJldHVybiAobnVtYmVyIDwgMTAgPyAnMCcgKyBudW1iZXIgOiBudW1iZXIpXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgaW5kZXggb2YgaXRlbSBpbiBsaXN0LCBvciAtMSBpZiBpdCdzIG5vdCBpbiBsaXN0LlxuICovXG5mdW5jdGlvbiBpbmRleE9mKGl0ZW0sIGxpc3QpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChpdGVtID09PSBsaXN0W2ldKSB7XG4gICAgICByZXR1cm4gaVxuICAgIH1cbiAgfVxuICByZXR1cm4gLTFcbn1cblxuLyoqXG4gKiBNYXBzIGRpcmVjdGl2ZSBjb2RlcyB0byByZWd1bGFyIGV4cHJlc3Npb24gcGF0dGVybnMgd2hpY2ggd2lsbCBjYXB0dXJlIHRoZVxuICogZGF0YSB0aGUgZGlyZWN0aXZlIGNvcnJlc3BvbmRzIHRvLCBvciBpbiB0aGUgY2FzZSBvZiBsb2NhbGUtZGVwZW5kZW50XG4gKiBkaXJlY3RpdmVzLCBhIGZ1bmN0aW9uIHdoaWNoIHRha2VzIGEgbG9jYWxlIGFuZCBnZW5lcmF0ZXMgYSByZWd1bGFyXG4gKiBleHByZXNzaW9uIHBhdHRlcm4uXG4gKi9cbnZhciBwYXJzZXJEaXJlY3RpdmVzID0ge1xuICAvLyBMb2NhbGUncyBhYmJyZXZpYXRlZCBtb250aCBuYW1lXG4gICdiJzogZnVuY3Rpb24obCkgeyByZXR1cm4gJygnICsgbC5iLmpvaW4oJ3wnKSArICcpJyB9XG4gIC8vIExvY2FsZSdzIGZ1bGwgbW9udGggbmFtZVxuLCAnQic6IGZ1bmN0aW9uKGwpIHsgcmV0dXJuICcoJyArIGwuQi5qb2luKCd8JykgKyAnKScgfVxuICAvLyBMb2NhbGUncyBlcXVpdmFsZW50IG9mIGVpdGhlciBBTSBvciBQTS5cbiwgJ3AnOiBmdW5jdGlvbihsKSB7IHJldHVybiAnKCcgKyBsLkFNICsgJ3wnICsgbC5QTSArICcpJyB9XG4sICdkJzogJyhcXFxcZFxcXFxkPyknIC8vIERheSBvZiB0aGUgbW9udGggYXMgYSBkZWNpbWFsIG51bWJlciBbMDEsMzFdXG4sICdIJzogJyhcXFxcZFxcXFxkPyknIC8vIEhvdXIgKDI0LWhvdXIgY2xvY2spIGFzIGEgZGVjaW1hbCBudW1iZXIgWzAwLDIzXVxuLCAnSSc6ICcoXFxcXGRcXFxcZD8pJyAvLyBIb3VyICgxMi1ob3VyIGNsb2NrKSBhcyBhIGRlY2ltYWwgbnVtYmVyIFswMSwxMl1cbiwgJ20nOiAnKFxcXFxkXFxcXGQ/KScgLy8gTW9udGggYXMgYSBkZWNpbWFsIG51bWJlciBbMDEsMTJdXG4sICdNJzogJyhcXFxcZFxcXFxkPyknIC8vIE1pbnV0ZSBhcyBhIGRlY2ltYWwgbnVtYmVyIFswMCw1OV1cbiwgJ1MnOiAnKFxcXFxkXFxcXGQ/KScgLy8gU2Vjb25kIGFzIGEgZGVjaW1hbCBudW1iZXIgWzAwLDU5XVxuLCAneSc6ICcoXFxcXGRcXFxcZD8pJyAvLyBZZWFyIHdpdGhvdXQgY2VudHVyeSBhcyBhIGRlY2ltYWwgbnVtYmVyIFswMCw5OV1cbiwgJ1knOiAnKFxcXFxkezR9KScgIC8vIFllYXIgd2l0aCBjZW50dXJ5IGFzIGEgZGVjaW1hbCBudW1iZXJcbiwgJyUnOiAnJScgICAgICAgICAvLyBBIGxpdGVyYWwgJyUnIGNoYXJhY3RlclxufVxuXG4vKipcbiAqIE1hcHMgZGlyZWN0aXZlIGNvZGVzIHRvIGZ1bmN0aW9ucyB3aGljaCB0YWtlIHRoZSBkYXRlIHRvIGJlIGZvcm1hdHRlZCBhbmRcbiAqIGxvY2FsZSBkZXRhaWxzIChpZiByZXF1aXJlZCksIHJldHVybmluZyBhbiBhcHByb3ByaWF0ZSBmb3JtYXR0ZWQgdmFsdWUuXG4gKi9cbnZhciBmb3JtYXR0ZXJEaXJlY3RpdmVzID0ge1xuICAnYSc6IGZ1bmN0aW9uKGQsIGwpIHsgcmV0dXJuIGwuYVtkLmdldERheSgpXSB9XG4sICdBJzogZnVuY3Rpb24oZCwgbCkgeyByZXR1cm4gbC5BW2QuZ2V0RGF5KCldIH1cbiwgJ2InOiBmdW5jdGlvbihkLCBsKSB7IHJldHVybiBsLmJbZC5nZXRNb250aCgpXSB9XG4sICdCJzogZnVuY3Rpb24oZCwgbCkgeyByZXR1cm4gbC5CW2QuZ2V0TW9udGgoKV0gfVxuLCAnZCc6IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHBhZChkLmdldERhdGUoKSwgMikgfVxuLCAnSCc6IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHBhZChkLmdldEhvdXJzKCksIDIpIH1cbiwgJ00nOiBmdW5jdGlvbihkKSB7IHJldHVybiBwYWQoZC5nZXRNaW51dGVzKCksIDIpIH1cbiwgJ20nOiBmdW5jdGlvbihkKSB7IHJldHVybiBwYWQoZC5nZXRNb250aCgpICsgMSwgMikgfVxuLCAnUyc6IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHBhZChkLmdldFNlY29uZHMoKSwgMikgfVxuLCAndyc6IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuZ2V0RGF5KCkgfVxuLCAnWSc6IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuZ2V0RnVsbFllYXIoKSB9XG4sICclJzogZnVuY3Rpb24oZCkgeyByZXR1cm4gJyUnIH1cbn1cblxuLyoqIFRlc3QgZm9yIGhhbmdpbmcgcGVyY2VudGFnZSBzeW1ib2xzLiAqL1xudmFyIHN0cmZ0aW1lRm9ybWF0Q2hlY2sgPSAvW14lXSUkL1xuXG4vKipcbiAqIEEgcGFydGlhbCBpbXBsZW1lbnRhdGlvbiBvZiBzdHJwdGltZSB3aGljaCBwYXJzZXMgdGltZSBkZXRhaWxzIGZyb20gYSBzdHJpbmcsXG4gKiBiYXNlZCBvbiBhIGZvcm1hdCBzdHJpbmcuXG4gKiBAcGFyYW0ge1N0cmluZ30gZm9ybWF0XG4gKiBAcGFyYW0ge09iamVjdH0gbG9jYWxlXG4gKi9cbmZ1bmN0aW9uIFRpbWVQYXJzZXIoZm9ybWF0LCBsb2NhbGUpIHtcbiAgdGhpcy5mb3JtYXQgPSBmb3JtYXRcbiAgdGhpcy5sb2NhbGUgPSBsb2NhbGVcbiAgdmFyIGNhY2hlZFBhdHRlcm4gPSBUaW1lUGFyc2VyLl9jYWNoZVtsb2NhbGUubmFtZSArICd8JyArIGZvcm1hdF1cbiAgaWYgKGNhY2hlZFBhdHRlcm4gIT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMucmUgPSBjYWNoZWRQYXR0ZXJuWzBdXG4gICAgdGhpcy5tYXRjaE9yZGVyID0gY2FjaGVkUGF0dGVyblsxXVxuICB9XG4gIGVsc2Uge1xuICAgIHRoaXMuY29tcGlsZVBhdHRlcm4oKVxuICB9XG59XG5cbi8qKlxuICogQ2FjaGVzIFJlZ0V4cHMgYW5kIG1hdGNoIG9yZGVycyBnZW5lcmF0ZWQgcGVyIGxvY2FsZS9mb3JtYXQgc3RyaW5nIGNvbWJvLlxuICovXG5UaW1lUGFyc2VyLl9jYWNoZSA9IHt9XG5cblRpbWVQYXJzZXIucHJvdG90eXBlLmNvbXBpbGVQYXR0ZXJuID0gZnVuY3Rpb24oKSB7XG4gIC8vIE5vcm1hbGlzZSB3aGl0ZXNwYWNlIGJlZm9yZSBmdXJ0aGVyIHByb2Nlc3NpbmdcbiAgdmFyIGZvcm1hdCA9IHRoaXMuZm9ybWF0LnNwbGl0KC8oPzpcXHN8XFx0fFxcbikrLykuam9pbignICcpXG4gICAgLCBwYXR0ZXJuID0gW11cbiAgICAsIG1hdGNoT3JkZXIgPSBbXVxuICAgICwgY1xuICAgICwgZGlyZWN0aXZlXG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBmb3JtYXQubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgYyA9IGZvcm1hdC5jaGFyQXQoaSlcbiAgICBpZiAoYyAhPSAnJScpIHtcbiAgICAgIGlmIChjID09PSAnICcpIHtcbiAgICAgICAgcGF0dGVybi5wdXNoKCcgKycpXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcGF0dGVybi5wdXNoKGMpXG4gICAgICB9XG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIGlmIChpID09IGwgLSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0cnB0aW1lIGZvcm1hdCBlbmRzIHdpdGggcmF3ICUnKVxuICAgIH1cblxuICAgIGMgPSBmb3JtYXQuY2hhckF0KCsraSlcbiAgICBkaXJlY3RpdmUgPSBwYXJzZXJEaXJlY3RpdmVzW2NdXG4gICAgaWYgKGRpcmVjdGl2ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0cnB0aW1lIGZvcm1hdCBjb250YWlucyBhbiB1bmtub3duIGRpcmVjdGl2ZTogJScgKyBjKVxuICAgIH1cbiAgICBlbHNlIGlmIChpcy5GdW5jdGlvbihkaXJlY3RpdmUpKSB7XG4gICAgICBwYXR0ZXJuLnB1c2goZGlyZWN0aXZlKHRoaXMubG9jYWxlKSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBwYXR0ZXJuLnB1c2goZGlyZWN0aXZlKVxuICAgIH1cblxuICAgIGlmIChjICE9ICclJykge1xuICAgICAgIG1hdGNoT3JkZXIucHVzaChjKVxuICAgIH1cbiAgfVxuXG4gIHRoaXMucmUgPSBuZXcgUmVnRXhwKCdeJyArIHBhdHRlcm4uam9pbignJykgKyAnJCcpXG4gIHRoaXMubWF0Y2hPcmRlciA9IG1hdGNoT3JkZXJcbiAgVGltZVBhcnNlci5fY2FjaGVbdGhpcy5sb2NhbGUubmFtZSArICd8JyArIHRoaXMuZm9ybWF0XSA9IFt0aGlzLnJlLCBtYXRjaE9yZGVyXVxufVxuXG4vKipcbiAqIEF0dGVtcHRzIHRvIGV4dHJhY3QgZGF0ZSBhbmQgdGltZSBkZXRhaWxzIGZyb20gdGhlIGdpdmVuIGlucHV0LlxuICogQHBhcmFtIHtzdHJpbmd9IGlucHV0XG4gKiBAcmV0dXJuIHtBcnJheS48bnVtYmVyPn1cbiAqL1xuVGltZVBhcnNlci5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbihpbnB1dCkge1xuICB2YXIgbWF0Y2hlcyA9IHRoaXMucmUuZXhlYyhpbnB1dClcbiAgaWYgKG1hdGNoZXMgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1RpbWUgZGF0YSBkaWQgbm90IG1hdGNoIGZvcm1hdDogZGF0YT0nICsgaW5wdXQgK1xuICAgICAgICAgICAgICAgICAgICAnLCBmb3JtYXQ9JyArIHRoaXMuZm9ybWF0KVxuICB9XG5cbiAgICAvLyBEZWZhdWx0IHZhbHVlcyBmb3Igd2hlbiBtb3JlIGFjY3VyYXRlIHZhbHVlcyBjYW5ub3QgYmUgaW5mZXJyZWRcbiAgdmFyIHRpbWUgPSBbMTkwMCwgMSwgMSwgMCwgMCwgMF1cbiAgICAvLyBNYXRjaGVkIHRpbWUgZGF0YSwga2V5ZWQgYnkgZGlyZWN0aXZlIGNvZGVcbiAgICAsIGRhdGEgPSB7fVxuXG4gIGZvciAodmFyIGkgPSAxLCBsID0gbWF0Y2hlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBkYXRhW3RoaXMubWF0Y2hPcmRlcltpIC0gMV1dID0gbWF0Y2hlc1tpXVxuICB9XG5cbiAgLy8gRXh0cmFjdCB5ZWFyXG4gIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdZJykpIHtcbiAgICB0aW1lWzBdID0gcGFyc2VJbnQoZGF0YS5ZLCAxMClcbiAgfVxuICBlbHNlIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd5JykpIHtcbiAgICB2YXIgeWVhciA9IHBhcnNlSW50KGRhdGEueSwgMTApXG4gICAgaWYgKHllYXIgPCA2OCkge1xuICAgICAgICB5ZWFyID0gMjAwMCArIHllYXJcbiAgICB9XG4gICAgZWxzZSBpZiAoeWVhciA8IDEwMCkge1xuICAgICAgICB5ZWFyID0gMTkwMCArIHllYXJcbiAgICB9XG4gICAgdGltZVswXSA9IHllYXJcbiAgfVxuXG4gIC8vIEV4dHJhY3QgbW9udGhcbiAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ20nKSkge1xuICAgIHZhciBtb250aCA9IHBhcnNlSW50KGRhdGEubSwgMTApXG4gICAgaWYgKG1vbnRoIDwgMSB8fCBtb250aCA+IDEyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vbnRoIGlzIG91dCBvZiByYW5nZTogJyArIG1vbnRoKVxuICAgIH1cbiAgICB0aW1lWzFdID0gbW9udGhcbiAgfVxuICBlbHNlIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdCJykpIHtcbiAgICB0aW1lWzFdID0gaW5kZXhPZihkYXRhLkIsIHRoaXMubG9jYWxlLkIpICsgMVxuICB9XG4gIGVsc2UgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2InKSkge1xuICAgIHRpbWVbMV0gPSBpbmRleE9mKGRhdGEuYiwgdGhpcy5sb2NhbGUuYikgKyAxXG4gIH1cblxuICAvLyBFeHRyYWN0IGRheSBvZiBtb250aFxuICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnZCcpKSB7XG4gICAgdmFyIGRheSA9IHBhcnNlSW50KGRhdGEuZCwgMTApXG4gICAgaWYgKGRheSA8IDEgfHwgZGF5ID4gMzEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRGF5IGlzIG91dCBvZiByYW5nZTogJyArIGRheSlcbiAgICB9XG4gICAgdGltZVsyXSA9IGRheVxuICB9XG5cbiAgLy8gRXh0cmFjdCBob3VyXG4gIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdIJykpIHtcbiAgICB2YXIgaG91ciA9IHBhcnNlSW50KGRhdGEuSCwgMTApXG4gICAgaWYgKGhvdXIgPiAyMykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdIb3VyIGlzIG91dCBvZiByYW5nZTogJyArIGhvdXIpXG4gICAgfVxuICAgIHRpbWVbM10gPSBob3VyXG4gIH1cbiAgZWxzZSBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnSScpKSB7XG4gICAgdmFyIGhvdXIgPSBwYXJzZUludChkYXRhLkksIDEwKVxuICAgIGlmIChob3VyIDwgMSB8fCBob3VyID4gMTIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSG91ciBpcyBvdXQgb2YgcmFuZ2U6ICcgKyBob3VyKVxuICAgIH1cblxuICAgIC8vIElmIHdlIGRvbid0IGdldCBhbnkgbW9yZSBpbmZvcm1hdGlvbiwgd2UnbGwgYXNzdW1lIHRoaXMgdGltZSBpc1xuICAgIC8vIGEubS4gLSAxMiBhLm0uIGlzIG1pZG5pZ2h0LlxuICAgIGlmIChob3VyID09IDEyKSB7XG4gICAgICAgIGhvdXIgPSAwXG4gICAgfVxuXG4gICAgdGltZVszXSA9IGhvdXJcblxuICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdwJykpIHtcbiAgICAgIGlmIChkYXRhLnAgPT0gdGhpcy5sb2NhbGUuUE0pIHtcbiAgICAgICAgLy8gV2UndmUgYWxyZWFkeSBoYW5kbGVkIHRoZSBtaWRuaWdodCBzcGVjaWFsIGNhc2UsIHNvIGl0J3NcbiAgICAgICAgLy8gc2FmZSB0byBidW1wIHRoZSB0aW1lIGJ5IDEyIGhvdXJzIHdpdGhvdXQgZnVydGhlciBjaGVja3MuXG4gICAgICAgIHRpbWVbM10gPSB0aW1lWzNdICsgMTJcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBFeHRyYWN0IG1pbnV0ZVxuICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnTScpKSB7XG4gICAgdmFyIG1pbnV0ZSA9IHBhcnNlSW50KGRhdGEuTSwgMTApXG4gICAgaWYgKG1pbnV0ZSA+IDU5KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTWludXRlIGlzIG91dCBvZiByYW5nZTogJyArIG1pbnV0ZSlcbiAgICB9XG4gICAgdGltZVs0XSA9IG1pbnV0ZVxuICB9XG5cbiAgLy8gRXh0cmFjdCBzZWNvbmRzXG4gIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdTJykpIHtcbiAgICB2YXIgc2Vjb25kID0gcGFyc2VJbnQoZGF0YS5TLCAxMClcbiAgICBpZiAoc2Vjb25kID4gNTkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU2Vjb25kIGlzIG91dCBvZiByYW5nZTogJyArIHNlY29uZClcbiAgICB9XG4gICAgdGltZVs1XSA9IHNlY29uZFxuICB9XG5cbiAgLy8gVmFsaWRhdGUgZGF5IG9mIG1vbnRoXG4gIHZhciBkYXkgPSB0aW1lWzJdLCBtb250aCA9IHRpbWVbMV0sIHllYXIgPSB0aW1lWzBdXG4gIGlmICgoKG1vbnRoID09IDQgfHwgbW9udGggPT0gNiB8fCBtb250aCA9PSA5IHx8IG1vbnRoID09IDExKSAmJlxuICAgICAgZGF5ID4gMzApIHx8XG4gICAgICAobW9udGggPT0gMiAmJiBkYXkgPiAoKHllYXIgJSA0ID09IDAgJiYgeWVhciAlIDEwMCAhPSAwIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHllYXIgJSA0MDAgPT0gMCkgPyAyOSA6IDI4KSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0RheSBpcyBvdXQgb2YgcmFuZ2U6ICcgKyBkYXkpXG4gIH1cblxuICByZXR1cm4gdGltZVxufVxuXG52YXIgdGltZSAgPSB7XG4gIC8qKiBEZWZhdWx0IGxvY2FsZSBuYW1lLiAqL1xuICBkZWZhdWx0TG9jYWxlOiAnZW4nXG5cbiAgLyoqIExvY2FsZSBkZXRhaWxzLiAqL1xuLCBsb2NhbGVzOiB7XG4gICAgZW46IHtcbiAgICAgIG5hbWU6ICdlbidcbiAgICAsIGE6IFsnU3VuJywgJ01vbicsICdUdWUnLCAnV2VkJywgJ1RodScsICdGcmknLCAnU2F0J11cbiAgICAsIEE6IFsnU3VuZGF5JywgJ01vbmRheScsICdUdWVzZGF5JywgJ1dlZG5lc2RheScsICdUaHVyc2RheScsXG4gICAgICAgICAgJ0ZyaWRheScsICdTYXR1cmRheSddXG4gICAgLCBBTTogJ0FNJ1xuICAgICwgYjogWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ11cbiAgICAsIEI6IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsICdKdWx5JyxcbiAgICAgICAgICAnQXVndXN0JywgJ1NlcHRlbWJlcicsICdPY3RvYmVyJywgJ05vdmVtYmVyJywgJ0RlY2VtYmVyJ11cbiAgICAsIFBNOiAnUE0nXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSBsb2NhbGUgd2l0aCB0aGUgZ2l2ZW4gY29kZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBjb2RlXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbnZhciBnZXRMb2NhbGUgPSB0aW1lLmdldExvY2FsZSA9IGZ1bmN0aW9uKGNvZGUpIHtcbiAgaWYgKGNvZGUpIHtcbiAgICBpZiAodGltZS5sb2NhbGVzLmhhc093blByb3BlcnR5KGNvZGUpKSB7XG4gICAgICByZXR1cm4gdGltZS5sb2NhbGVzW2NvZGVdXG4gICAgfVxuICAgIGVsc2UgaWYgKGNvZGUubGVuZ3RoID4gMikge1xuICAgICAgLy8gSWYgd2UgYXBwZWFyIHRvIGhhdmUgbW9yZSB0aGFuIGEgbGFuZ3VhZ2UgY29kZSwgdHJ5IHRoZVxuICAgICAgLy8gbGFuZ3VhZ2UgY29kZSBvbiBpdHMgb3duLlxuICAgICAgdmFyIGxhbmd1YWdlQ29kZSA9IGNvZGUuc3Vic3RyaW5nKDAsIDIpXG4gICAgICBpZiAodGltZS5sb2NhbGVzLmhhc093blByb3BlcnR5KGxhbmd1YWdlQ29kZSkpIHtcbiAgICAgICAgcmV0dXJuIHRpbWUubG9jYWxlc1tsYW5ndWFnZUNvZGVdXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0aW1lLmxvY2FsZXNbdGltZS5kZWZhdWx0TG9jYWxlXVxufVxuXG4vKipcbiAqIFBhcnNlcyB0aW1lIGRldGFpbHMgZnJvbSBhIHN0cmluZywgYmFzZWQgb24gYSBmb3JtYXQgc3RyaW5nLlxuICogQHBhcmFtIHtzdHJpbmd9IGlucHV0XG4gKiBAcGFyYW0ge3N0cmluZ30gZm9ybWF0XG4gKiBAcGFyYW0ge3N0cmluZz19IGxvY2FsZVxuICogQHJldHVybiB7QXJyYXkuPG51bWJlcj59XG4gKi9cbnZhciBzdHJwdGltZSA9IHRpbWUuc3RycHRpbWUgPSBmdW5jdGlvbihpbnB1dCwgZm9ybWF0LCBsb2NhbGUpIHtcbiAgcmV0dXJuIG5ldyBUaW1lUGFyc2VyKGZvcm1hdCwgZ2V0TG9jYWxlKGxvY2FsZSkpLnBhcnNlKGlucHV0KVxufVxuXG4vKipcbiAqIENvbnZlbmllbmNlIHdyYXBwZXIgYXJvdW5kIHRpbWUuc3RycHRpbWUgd2hpY2ggcmV0dXJucyBhIEphdmFTY3JpcHQgRGF0ZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBpbnB1dFxuICogQHBhcmFtIHtzdHJpbmd9IGZvcm1hdFxuICogQHBhcmFtIHtzdHJpbmc9fSBsb2NhbGVcbiAqIEByZXR1cm4ge2RhdGV9XG4gKi9cbnRpbWUuc3RycGRhdGUgPSBmdW5jdGlvbihpbnB1dCwgZm9ybWF0LCBsb2NhbGUpIHtcbiAgdmFyIHQgPSBzdHJwdGltZShpbnB1dCwgZm9ybWF0LCBsb2NhbGUpXG4gIHJldHVybiBuZXcgRGF0ZSh0WzBdLCB0WzFdIC0gMSwgdFsyXSwgdFszXSwgdFs0XSwgdFs1XSlcbn1cblxuLyoqXG4gKiBBIHBhcnRpYWwgaW1wbGVtZW50YXRpb24gb2YgPGNvZGU+c3RyZnRpbWU8L2NvZGU+LCB3aGljaCBmb3JtYXRzIGEgZGF0ZVxuICogYWNjb3JkaW5nIHRvIGEgZm9ybWF0IHN0cmluZy4gQW4gRXJyb3Igd2lsbCBiZSB0aHJvd24gaWYgYW4gaW52YWxpZFxuICogZm9ybWF0IHN0cmluZyBpcyBnaXZlbi5cbiAqIEBwYXJhbSB7ZGF0ZX0gZGF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IGZvcm1hdFxuICogQHBhcmFtIHtzdHJpbmc9fSBsb2NhbGVcbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqL1xudGltZS5zdHJmdGltZSA9IGZ1bmN0aW9uKGRhdGUsIGZvcm1hdCwgbG9jYWxlKSB7XG4gIGlmIChzdHJmdGltZUZvcm1hdENoZWNrLnRlc3QoZm9ybWF0KSkge1xuICAgIHRocm93IG5ldyBFcnJvcignc3RyZnRpbWUgZm9ybWF0IGVuZHMgd2l0aCByYXcgJScpXG4gIH1cbiAgbG9jYWxlID0gZ2V0TG9jYWxlKGxvY2FsZSlcbiAgcmV0dXJuIGZvcm1hdC5yZXBsYWNlKC8oJS4pL2csIGZ1bmN0aW9uKHMsIGYpIHtcbiAgICB2YXIgY29kZSA9IGYuY2hhckF0KDEpXG4gICAgaWYgKHR5cGVvZiBmb3JtYXR0ZXJEaXJlY3RpdmVzW2NvZGVdID09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0cmZ0aW1lIGZvcm1hdCBjb250YWlucyBhbiB1bmtub3duIGRpcmVjdGl2ZTogJyArIGYpXG4gICAgfVxuICAgIHJldHVybiBmb3JtYXR0ZXJEaXJlY3RpdmVzW2NvZGVdKGRhdGUsIGxvY2FsZSlcbiAgfSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0aW1lXG4iLCIvLyBwYXJzZVVyaSAxLjIuMlxuLy8gKGMpIFN0ZXZlbiBMZXZpdGhhbiA8c3RldmVubGV2aXRoYW4uY29tPlxuLy8gTUlUIExpY2Vuc2VcbmZ1bmN0aW9uIHBhcnNlVXJpIChzdHIpIHtcbiAgdmFyIG8gPSBwYXJzZVVyaS5vcHRpb25zXG4gICAgLCBtID0gby5wYXJzZXJbby5zdHJpY3RNb2RlID8gXCJzdHJpY3RcIiA6IFwibG9vc2VcIl0uZXhlYyhzdHIpXG4gICAgLCB1cmkgPSB7fVxuICAgICwgaSA9IDE0XG5cbiAgd2hpbGUgKGktLSkgdXJpW28ua2V5W2ldXSA9IG1baV0gfHwgXCJcIlxuXG4gIHVyaVtvLnEubmFtZV0gPSB7fTtcbiAgdXJpW28ua2V5WzEyXV0ucmVwbGFjZShvLnEucGFyc2VyLCBmdW5jdGlvbiAoJDAsICQxLCAkMikge1xuICAgIGlmICgkMSkgdXJpW28ucS5uYW1lXVskMV0gPSAkMlxuICB9KVxuXG4gIHJldHVybiB1cmlcbn1cblxucGFyc2VVcmkub3B0aW9ucyA9IHtcbiAgc3RyaWN0TW9kZTogZmFsc2Vcbiwga2V5OiBbJ3NvdXJjZScsJ3Byb3RvY29sJywnYXV0aG9yaXR5JywndXNlckluZm8nLCd1c2VyJywncGFzc3dvcmQnLCdob3N0JywncG9ydCcsJ3JlbGF0aXZlJywncGF0aCcsJ2RpcmVjdG9yeScsJ2ZpbGUnLCdxdWVyeScsJ2FuY2hvciddXG4sIHE6IHtcbiAgICBuYW1lOiAncXVlcnlLZXknXG4gICwgcGFyc2VyOiAvKD86XnwmKShbXiY9XSopPT8oW14mXSopL2dcbiAgfVxuLCBwYXJzZXI6IHtcbiAgICBzdHJpY3Q6IC9eKD86KFteOlxcLz8jXSspOik/KD86XFwvXFwvKCg/OigoW146QF0qKSg/OjooW146QF0qKSk/KT9AKT8oW146XFwvPyNdKikoPzo6KFxcZCopKT8pKT8oKCgoPzpbXj8jXFwvXSpcXC8pKikoW14/I10qKSkoPzpcXD8oW14jXSopKT8oPzojKC4qKSk/KS9cbiAgLCBsb29zZTogL14oPzooPyFbXjpAXSs6W146QFxcL10qQCkoW146XFwvPyMuXSspOik/KD86XFwvXFwvKT8oKD86KChbXjpAXSopKD86OihbXjpAXSopKT8pP0ApPyhbXjpcXC8/I10qKSg/OjooXFxkKikpPykoKChcXC8oPzpbXj8jXSg/IVtePyNcXC9dKlxcLltePyNcXC8uXSsoPzpbPyNdfCQpKSkqXFwvPyk/KFtePyNcXC9dKikpKD86XFw/KFteI10qKSk/KD86IyguKikpPykvXG4gIH1cbn1cblxuLy8gbWFrZVVSSSAxLjIuMiAtIGNyZWF0ZSBhIFVSSSBmcm9tIGFuIG9iamVjdCBzcGVjaWZpY2F0aW9uOyBjb21wYXRpYmxlIHdpdGhcbi8vIHBhcnNlVVJJIChodHRwOi8vYmxvZy5zdGV2ZW5sZXZpdGhhbi5jb20vYXJjaGl2ZXMvcGFyc2V1cmkpXG4vLyAoYykgTmlhbGwgU21hcnQgPG5pYWxsc21hcnQuY29tPlxuLy8gTUlUIExpY2Vuc2VcbmZ1bmN0aW9uIG1ha2VVcmkodSkge1xuICB2YXIgdXJpID0gJydcbiAgaWYgKHUucHJvdG9jb2wpIHtcbiAgICB1cmkgKz0gdS5wcm90b2NvbCArICc6Ly8nXG4gIH1cbiAgaWYgKHUudXNlcikge1xuICAgIHVyaSArPSB1LnVzZXJcbiAgfVxuICBpZiAodS5wYXNzd29yZCkge1xuICAgIHVyaSArPSAnOicgKyB1LnBhc3N3b3JkXG4gIH1cbiAgaWYgKHUudXNlciB8fCB1LnBhc3N3b3JkKSB7XG4gICAgdXJpICs9ICdAJ1xuICB9XG4gIGlmICh1Lmhvc3QpIHtcbiAgICB1cmkgKz0gdS5ob3N0XG4gIH1cbiAgaWYgKHUucG9ydCkge1xuICAgIHVyaSArPSAnOicgKyB1LnBvcnRcbiAgfVxuICBpZiAodS5wYXRoKSB7XG4gICAgdXJpICs9IHUucGF0aFxuICB9XG4gIHZhciBxayA9IHUucXVlcnlLZXlcbiAgdmFyIHFzID0gW11cbiAgZm9yICh2YXIgayBpbiBxaykge1xuICAgIGlmICghcWsuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIHZhciB2ID0gZW5jb2RlVVJJQ29tcG9uZW50KHFrW2tdKVxuICAgIGsgPSBlbmNvZGVVUklDb21wb25lbnQoaylcbiAgICBpZiAodikge1xuICAgICAgcXMucHVzaChrICsgJz0nICsgdilcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBxcy5wdXNoKGspXG4gICAgfVxuICB9XG4gIGlmIChxcy5sZW5ndGggPiAwKSB7XG4gICAgdXJpICs9ICc/JyArIHFzLmpvaW4oJyYnKVxuICB9XG4gIGlmICh1LmFuY2hvcikge1xuICAgIHVyaSArPSAnIycgKyB1LmFuY2hvclxuICB9XG4gIHJldHVybiB1cmlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHBhcnNlVXJpOiBwYXJzZVVyaVxuLCBtYWtlVXJpOiBtYWtlVXJpXG59XG4iLCJ2YXIgQ29uY3VyID0gcmVxdWlyZSgnQ29uY3VyJylcbiAgLCBpcyA9IHJlcXVpcmUoJ2lzb21vcnBoL2lzJylcbiAgLCBvYmplY3QgPSByZXF1aXJlKCdpc29tb3JwaC9vYmplY3QnKVxuXG4vKipcbiAqIEEgdmFsaWRhdGlvbiBlcnJvciwgY29udGFpbmluZyBhIGxpc3Qgb2YgbWVzc2FnZXMuIFNpbmdsZSBtZXNzYWdlc1xuICogKGUuZy4gdGhvc2UgcHJvZHVjZWQgYnkgdmFsaWRhdG9ycyBtYXkgaGF2ZSBhbiBhc3NvY2lhdGVkIGVycm9yIGNvZGVcbiAqIGFuZCBwYXJhbWV0ZXJzIHRvIGFsbG93IGN1c3RvbWlzYXRpb24gYnkgZmllbGRzLlxuICovXG52YXIgVmFsaWRhdGlvbkVycm9yID0gQ29uY3VyLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihtZXNzYWdlLCBrd2FyZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSkgcmV0dXJuIG5ldyBWYWxpZGF0aW9uRXJyb3IobWVzc2FnZSwga3dhcmdzKVxuICAgIGt3YXJncyA9IG9iamVjdC5leHRlbmQoe2NvZGU6IG51bGwsIHBhcmFtczogbnVsbH0sIGt3YXJncylcbiAgICBpZiAoaXMuQXJyYXkobWVzc2FnZSkpIHtcbiAgICAgIHRoaXMubWVzc2FnZXMgPSBtZXNzYWdlXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5jb2RlID0ga3dhcmdzLmNvZGVcbiAgICAgIHRoaXMucGFyYW1zID0ga3dhcmdzLnBhcmFtc1xuICAgICAgdGhpcy5tZXNzYWdlcyA9IFttZXNzYWdlXVxuICAgIH1cbiAgfVxufSlcblxuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gKCdWYWxpZGF0aW9uRXJyb3I6ICcgKyB0aGlzLm1lc3NhZ2VzLmpvaW4oJzsgJykpXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBWYWxpZGF0aW9uRXJyb3I6IFZhbGlkYXRpb25FcnJvclxufVxuIiwidmFyIG9iamVjdCA9IHJlcXVpcmUoJ2lzb21vcnBoL29iamVjdCcpXG5cbnZhciBlcnJvcnMgPSByZXF1aXJlKCcuL2Vycm9ycycpXG5cbnZhciBWYWxpZGF0aW9uRXJyb3IgPSBlcnJvcnMuVmFsaWRhdGlvbkVycm9yXG5cbnZhciBoZXhSRSA9IC9eWzAtOWEtZl0rJC9cblxuLyoqXG4gKiBDbGVhbnMgYSBJUHY2IGFkZHJlc3Mgc3RyaW5nLlxuICpcbiAqICBWYWxpZGl0eSBpcyBjaGVja2VkIGJ5IGNhbGxpbmcgaXNWYWxpZElQdjZBZGRyZXNzKCkgLSBpZiBhbiBpbnZhbGlkIGFkZHJlc3NcbiAqICBpcyBwYXNzZWQsIGEgVmFsaWRhdGlvbkVycm9yIGlzIHRocm93bi5cbiAqXG4gKiBSZXBsYWNlcyB0aGUgbG9uZ2VzdCBjb250aW5pb3VzIHplcm8tc2VxdWVuY2Ugd2l0aCAnOjonIGFuZCByZW1vdmVzIGxlYWRpbmdcbiAqIHplcm9lcyBhbmQgbWFrZXMgc3VyZSBhbGwgaGV4dGV0cyBhcmUgbG93ZXJjYXNlLlxuICovXG5mdW5jdGlvbiBjbGVhbklQdjZBZGRyZXNzKGlwU3RyLCBrd2FyZ3MpIHtcbiAga3dhcmdzID0gb2JqZWN0LmV4dGVuZCh7XG4gICAgdW5wYWNrSVB2NDogZmFsc2UsIGVycm9yTWVzc2FnZTogJ1RoaXMgaXMgbm90IGEgdmFsaWQgSVB2NiBhZGRyZXNzJ1xuICB9LCBrd2FyZ3MpXG5cbiAgdmFyIGJlc3REb3VibGVjb2xvblN0YXJ0ID0gLTFcbiAgICAsIGJlc3REb3VibGVjb2xvbkxlbiA9IDBcbiAgICAsIGRvdWJsZWNvbG9uU3RhcnQgPSAtMVxuICAgICwgZG91YmxlY29sb25MZW4gPSAwXG5cbiAgaWYgKCFpc1ZhbGlkSVB2NkFkZHJlc3MoaXBTdHIpKSB7XG4gICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKGt3YXJncy5lcnJvck1lc3NhZ2UpXG4gIH1cblxuICAvLyBUaGlzIGFsZ29yaXRobSBjYW4gb25seSBoYW5kbGUgZnVsbHkgZXhwbG9kZWQgSVAgc3RyaW5nc1xuICBpcFN0ciA9IF9leHBsb2RlU2hvcnRoYW5kSVBzdHJpbmcoaXBTdHIpXG4gIGlwU3RyID0gX3Nhbml0aXNlSVB2NE1hcHBpbmcoaXBTdHIpXG5cbiAgLy8gSWYgbmVlZGVkLCB1bnBhY2sgdGhlIElQdjQgYW5kIHJldHVybiBzdHJhaWdodCBhd2F5XG4gIGlmIChrd2FyZ3MudW5wYWNrSVB2NCkge1xuICAgIHZhciBpcHY0VW5wYWNrZWQgPSBfdW5wYWNrSVB2NChpcFN0cilcbiAgICBpZiAoaXB2NFVucGFja2VkKSB7XG4gICAgICByZXR1cm4gaXB2NFVucGFja2VkXG4gICAgfVxuICB9XG5cbiAgdmFyIGhleHRldHMgPSBpcFN0ci5zcGxpdCgnOicpXG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBoZXh0ZXRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIC8vIFJlbW92ZSBsZWFkaW5nIHplcm9lc1xuICAgIGhleHRldHNbaV0gPSBoZXh0ZXRzW2ldLnJlcGxhY2UoL14wKy8sICcnKVxuICAgIGlmIChoZXh0ZXRzW2ldID09ICcnKSB7XG4gICAgICBoZXh0ZXRzW2ldID0gJzAnXG4gICAgfVxuXG4gICAgLy8gRGV0ZXJtaW5lIGJlc3QgaGV4dGV0IHRvIGNvbXByZXNzXG4gICAgaWYgKGhleHRldHNbaV0gPT0gJzAnKSB7XG4gICAgICBkb3VibGVjb2xvbkxlbiArPSAxXG4gICAgICBpZiAoZG91YmxlY29sb25TdGFydCA9PSAtMSkge1xuICAgICAgICAvLyBTdGFydCBhIHNlcXVlbmNlIG9mIHplcm9zXG4gICAgICAgIGRvdWJsZWNvbG9uU3RhcnQgPSBpXG4gICAgICB9XG4gICAgICBpZiAoZG91YmxlY29sb25MZW4gPiBiZXN0RG91YmxlY29sb25MZW4pIHtcbiAgICAgICAgLy8gVGhpcyBpcyB0aGUgbG9uZ2VzdCBzZXF1ZW5jZSBzbyBmYXJcbiAgICAgICAgYmVzdERvdWJsZWNvbG9uTGVuID0gZG91YmxlY29sb25MZW5cbiAgICAgICAgYmVzdERvdWJsZWNvbG9uU3RhcnQgPSBkb3VibGVjb2xvblN0YXJ0XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZG91YmxlY29sb25MZW4gPSAwXG4gICAgICBkb3VibGVjb2xvblN0YXJ0ID0gLTFcbiAgICB9XG4gIH1cblxuICAvLyBDb21wcmVzcyB0aGUgbW9zdCBzdWl0YWJsZSBoZXh0ZXRcbiAgaWYgKGJlc3REb3VibGVjb2xvbkxlbiA+IDEpIHtcbiAgICB2YXIgYmVzdERvdWJsZWNvbG9uRW5kID0gYmVzdERvdWJsZWNvbG9uU3RhcnQgKyBiZXN0RG91YmxlY29sb25MZW5cbiAgICAvLyBGb3IgemVyb3MgYXQgdGhlIGVuZCBvZiB0aGUgYWRkcmVzc1xuICAgIGlmIChiZXN0RG91YmxlY29sb25FbmQgPT0gaGV4dGV0cy5sZW5ndGgpIHtcbiAgICAgIGhleHRldHMucHVzaCgnJylcbiAgICB9XG4gICAgaGV4dGV0cy5zcGxpY2UoYmVzdERvdWJsZWNvbG9uU3RhcnQsIGJlc3REb3VibGVjb2xvbkxlbiwgJycpXG4gICAgLy8gRm9yIHplcm9zIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGFkZHJlc3NcbiAgICBpZiAoYmVzdERvdWJsZWNvbG9uU3RhcnQgPT0gMCkge1xuICAgICAgaGV4dGV0cy51bnNoaWZ0KCcnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBoZXh0ZXRzLmpvaW4oJzonKS50b0xvd2VyQ2FzZSgpXG59XG5cbi8qKlxuICogU2FuaXRpc2VzIElQdjQgbWFwcGluZyBpbiBhIGV4cGFuZGVkIElQdjYgYWRkcmVzcy5cbiAqXG4gKiBUaGlzIGNvbnZlcnRzIDo6ZmZmZjowYTBhOjBhMGEgdG8gOjpmZmZmOjEwLjEwLjEwLjEwLlxuICogSWYgdGhlcmUgaXMgbm90aGluZyB0byBzYW5pdGlzZSwgcmV0dXJucyBhbiB1bmNoYW5nZWQgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBfc2FuaXRpc2VJUHY0TWFwcGluZyhpcFN0cikge1xuICBpZiAoaXBTdHIudG9Mb3dlckNhc2UoKS5pbmRleE9mKCcwMDAwOjAwMDA6MDAwMDowMDAwOjAwMDA6ZmZmZjonKSAhPSAwKSB7XG4gICAgLy8gTm90IGFuIGlwdjQgbWFwcGluZ1xuICAgIHJldHVybiBpcFN0clxuICB9XG5cbiAgdmFyIGhleHRldHMgPSBpcFN0ci5zcGxpdCgnOicpXG5cbiAgaWYgKGhleHRldHNbaGV4dGV0cy5sZW5ndGggLSAxXS5pbmRleE9mKCcuJykgIT0gLTEpIHtcbiAgICAvLyBBbHJlYWR5IHNhbml0aXplZFxuICAgIHJldHVybiBpcFN0clxuICB9XG5cbiAgdmFyIGlwdjRBZGRyZXNzID0gW1xuICAgIHBhcnNlSW50KGhleHRldHNbNl0uc3Vic3RyaW5nKDAsIDIpLCAxNilcbiAgLCBwYXJzZUludChoZXh0ZXRzWzZdLnN1YnN0cmluZygyLCA0KSwgMTYpXG4gICwgcGFyc2VJbnQoaGV4dGV0c1s3XS5zdWJzdHJpbmcoMCwgMiksIDE2KVxuICAsIHBhcnNlSW50KGhleHRldHNbN10uc3Vic3RyaW5nKDIsIDQpLCAxNilcbiAgXS5qb2luKCcuJylcblxuICByZXR1cm4gaGV4dGV0cy5zbGljZSgwLCA2KS5qb2luKCc6JykgKyAgJzonICsgaXB2NEFkZHJlc3Ncbn1cblxuLyoqXG4gKiBVbnBhY2tzIGFuIElQdjQgYWRkcmVzcyB0aGF0IHdhcyBtYXBwZWQgaW4gYSBjb21wcmVzc2VkIElQdjYgYWRkcmVzcy5cbiAqXG4gKiBUaGlzIGNvbnZlcnRzIDAwMDA6MDAwMDowMDAwOjAwMDA6MDAwMDpmZmZmOjEwLjEwLjEwLjEwIHRvIDEwLjEwLjEwLjEwLlxuICogSWYgdGhlcmUgaXMgbm90aGluZyB0byBzYW5pdGl6ZSwgcmV0dXJucyBudWxsLlxuICovXG5mdW5jdGlvbiBfdW5wYWNrSVB2NChpcFN0cikge1xuICBpZiAoaXBTdHIudG9Mb3dlckNhc2UoKS5pbmRleE9mKCcwMDAwOjAwMDA6MDAwMDowMDAwOjAwMDA6ZmZmZjonKSAhPSAwKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIHZhciBoZXh0ZXRzID0gaXBTdHIuc3BsaXQoJzonKVxuICByZXR1cm4gaGV4dGV0cy5wb3AoKVxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgd2UgaGF2ZSBhIHZhbGlkIElQdjYgYWRkcmVzcy5cbiAqL1xuZnVuY3Rpb24gaXNWYWxpZElQdjZBZGRyZXNzKGlwU3RyKSB7XG4gIHZhciB2YWxpZGF0ZUlQdjRBZGRyZXNzID0gcmVxdWlyZSgnLi92YWxpZGF0b3JzJykudmFsaWRhdGVJUHY0QWRkcmVzc1xuXG4gIC8vIFdlIG5lZWQgdG8gaGF2ZSBhdCBsZWFzdCBvbmUgJzonXG4gIGlmIChpcFN0ci5pbmRleE9mKCc6JykgPT0gLTEpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIFdlIGNhbiBvbmx5IGhhdmUgb25lICc6Oicgc2hvcnRlbmVyXG4gIGlmIChTdHJpbmdfY291bnQoaXBTdHIsICc6OicpID4gMSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gJzo6JyBzaG91bGQgYmUgZW5jb21wYXNzZWQgYnkgc3RhcnQsIGRpZ2l0cyBvciBlbmRcbiAgaWYgKGlwU3RyLmluZGV4T2YoJzo6OicpICE9IC0xKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBBIHNpbmdsZSBjb2xvbiBjYW4gbmVpdGhlciBzdGFydCBub3IgZW5kIGFuIGFkZHJlc3NcbiAgaWYgKChpcFN0ci5jaGFyQXQoMCkgPT0gJzonICYmIGlwU3RyLmNoYXJBdCgxKSAhPSAnOicpIHx8XG4gICAgICAoaXBTdHIuY2hhckF0KGlwU3RyLmxlbmd0aCAtIDEpID09ICc6JyAmJlxuICAgICAgIGlwU3RyLmNoYXJBdChpcFN0ci5sZW5ndGggLSAyKSAhPSAnOicpKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBXZSBjYW4gbmV2ZXIgaGF2ZSBtb3JlIHRoYW4gNyAnOicgKDE6OjI6Mzo0OjU6Njo3OjggaXMgaW52YWxpZClcbiAgaWYgKFN0cmluZ19jb3VudChpcFN0ciwgJzonKSA+IDcpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIElmIHdlIGhhdmUgbm8gY29uY2F0ZW5hdGlvbiwgd2UgbmVlZCB0byBoYXZlIDggZmllbGRzIHdpdGggNyAnOidcbiAgaWYgKGlwU3RyLmluZGV4T2YoJzo6JykgPT0gLTEgJiYgU3RyaW5nX2NvdW50KGlwU3RyLCAnOicpICE9IDcpIHtcbiAgICAvLyBXZSBtaWdodCBoYXZlIGFuIElQdjQgbWFwcGVkIGFkZHJlc3NcbiAgICBpZiAoU3RyaW5nX2NvdW50KGlwU3RyLCAnLicpICE9IDMpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxuXG4gIGlwU3RyID0gX2V4cGxvZGVTaG9ydGhhbmRJUHN0cmluZyhpcFN0cilcblxuICAvLyBOb3cgdGhhdCB3ZSBoYXZlIHRoYXQgYWxsIHNxdWFyZWQgYXdheSwgbGV0J3MgY2hlY2sgdGhhdCBlYWNoIG9mIHRoZVxuICAvLyBoZXh0ZXRzIGFyZSBiZXR3ZWVuIDB4MCBhbmQgMHhGRkZGLlxuICB2YXIgaGV4dGV0cyA9IGlwU3RyLnNwbGl0KCc6JylcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBoZXh0ZXRzLmxlbmd0aCwgaGV4dGV0OyBpIDwgbDsgaSsrKSB7XG4gICAgaGV4dGV0ID0gaGV4dGV0c1tpXVxuICAgIGlmIChTdHJpbmdfY291bnQoaGV4dGV0LCAnLicpID09IDMpIHtcbiAgICAgIC8vIElmIHdlIGhhdmUgYW4gSVB2NCBtYXBwZWQgYWRkcmVzcywgdGhlIElQdjQgcG9ydGlvbiBoYXMgdG9cbiAgICAgIC8vIGJlIGF0IHRoZSBlbmQgb2YgdGhlIElQdjYgcG9ydGlvbi5cbiAgICAgIGlmIChpcFN0ci5zcGxpdCgnOicpLnBvcCgpICE9IGhleHRldCkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIHZhbGlkYXRlSVB2NEFkZHJlc3MuX19jYWxsX18oaGV4dGV0KVxuICAgICAgfVxuICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHtcbiAgICAgICAgICB0aHJvdyBlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKCFoZXhSRS50ZXN0KGhleHRldCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgICB2YXIgaW50VmFsdWUgPSBwYXJzZUludChoZXh0ZXQsIDE2KVxuICAgICAgaWYgKGlzTmFOKGludFZhbHVlKSB8fCBpbnRWYWx1ZSA8IDB4MCB8fCBpbnRWYWx1ZSA+IDB4RkZGRikge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZVxufVxuXG4vKipcbiAqIEV4cGFuZHMgYSBzaG9ydGVuZWQgSVB2NiBhZGRyZXNzLlxuICovXG5mdW5jdGlvbiBfZXhwbG9kZVNob3J0aGFuZElQc3RyaW5nKGlwU3RyKSB7XG4gIGlmICghX2lzU2hvcnRIYW5kKGlwU3RyKSkge1xuICAgIC8vIFdlJ3ZlIGFscmVhZHkgZ290IGEgbG9uZ2hhbmQgaXBTdHJcbiAgICByZXR1cm4gaXBTdHJcbiAgfVxuXG4gIHZhciBuZXdJcCA9IFtdXG4gICAgLCBoZXh0ZXRzID0gaXBTdHIuc3BsaXQoJzo6JylcblxuICAvLyBJZiB0aGVyZSBpcyBhIDo6LCB3ZSBuZWVkIHRvIGV4cGFuZCBpdCB3aXRoIHplcm9lcyB0byBnZXQgdG8gOCBoZXh0ZXRzIC1cbiAgLy8gdW5sZXNzIHRoZXJlIGlzIGEgZG90IGluIHRoZSBsYXN0IGhleHRldCwgbWVhbmluZyB3ZSdyZSBkb2luZyB2NC1tYXBwaW5nXG4gIHZhciBmaWxsVG8gPSAoaXBTdHIuc3BsaXQoJzonKS5wb3AoKS5pbmRleE9mKCcuJykgIT0gLTEpID8gNyA6IDhcblxuICBpZiAoaGV4dGV0cy5sZW5ndGggPiAxKSB7XG4gICAgdmFyIHNlcCA9IGhleHRldHNbMF0uc3BsaXQoJzonKS5sZW5ndGggKyBoZXh0ZXRzWzFdLnNwbGl0KCc6JykubGVuZ3RoXG4gICAgbmV3SXAgPSBoZXh0ZXRzWzBdLnNwbGl0KCc6JylcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGZpbGxUbyAtIHNlcDsgaSA8IGw7IGkrKykge1xuICAgICAgbmV3SXAucHVzaCgnMDAwMCcpXG4gICAgfVxuICAgIG5ld0lwID0gbmV3SXAuY29uY2F0KGhleHRldHNbMV0uc3BsaXQoJzonKSlcbiAgfVxuICBlbHNlIHtcbiAgICBuZXdJcCA9IGlwU3RyLnNwbGl0KCc6JylcbiAgfVxuXG4gIC8vIE5vdyBuZWVkIHRvIG1ha2Ugc3VyZSBldmVyeSBoZXh0ZXQgaXMgNCBsb3dlciBjYXNlIGNoYXJhY3RlcnMuXG4gIC8vIElmIGEgaGV4dGV0IGlzIDwgNCBjaGFyYWN0ZXJzLCB3ZSd2ZSBnb3QgbWlzc2luZyBsZWFkaW5nIDAncy5cbiAgdmFyIHJldElwID0gW11cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBuZXdJcC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICByZXRJcC5wdXNoKHplcm9QYWRkaW5nKG5ld0lwW2ldLCA0KSArIG5ld0lwW2ldLnRvTG93ZXJDYXNlKCkpXG4gIH1cbiAgcmV0dXJuIHJldElwLmpvaW4oJzonKVxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhlIGFkZHJlc3MgaXMgc2hvcnRlbmVkLlxuICovXG5mdW5jdGlvbiBfaXNTaG9ydEhhbmQoaXBTdHIpIHtcbiAgaWYgKFN0cmluZ19jb3VudChpcFN0ciwgJzo6JykgPT0gMSkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgdmFyIHBhcnRzID0gaXBTdHIuc3BsaXQoJzonKVxuICBmb3IgKHZhciBpID0gMCwgbCA9IHBhcnRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChwYXJ0c1tpXS5sZW5ndGggPCA0KSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLy8gVXRpbGl0aWVzXG5cbmZ1bmN0aW9uIHplcm9QYWRkaW5nKHN0ciwgbGVuZ3RoKSB7XG4gIGlmIChzdHIubGVuZ3RoID49IGxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG4gIHJldHVybiBuZXcgQXJyYXkobGVuZ3RoIC0gc3RyLmxlbmd0aCArIDEpLmpvaW4oJzAnKVxufVxuXG5mdW5jdGlvbiBTdHJpbmdfY291bnQoc3RyLCBzdWJTdHIpIHtcbiAgcmV0dXJuIHN0ci5zcGxpdChzdWJTdHIpLmxlbmd0aCAtIDFcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNsZWFuSVB2NkFkZHJlc3M6IGNsZWFuSVB2NkFkZHJlc3NcbiwgaXNWYWxpZElQdjZBZGRyZXNzOiBpc1ZhbGlkSVB2NkFkZHJlc3Ncbn1cbiIsInZhciBDb25jdXIgPSByZXF1aXJlKCdDb25jdXInKVxuICAsIGlzID0gcmVxdWlyZSgnaXNvbW9ycGgvaXMnKVxuICAsIGZvcm1hdCA9IHJlcXVpcmUoJ2lzb21vcnBoL2Zvcm1hdCcpLmZvcm1hdE9ialxuICAsIHB1bnljb2RlID0gcmVxdWlyZSgncHVueWNvZGUnKVxuICAsIHVybCA9IHJlcXVpcmUoJ2lzb21vcnBoL3VybCcpXG5cbnZhciBlcnJvcnMgPSByZXF1aXJlKCcuL2Vycm9ycycpXG4gICwgaXB2NiA9IHJlcXVpcmUoJy4vaXB2NicpXG5cbnZhciBWYWxpZGF0aW9uRXJyb3IgPSBlcnJvcnMuVmFsaWRhdGlvbkVycm9yXG4gICwgaXNWYWxpZElQdjZBZGRyZXNzID0gaXB2Ni5pc1ZhbGlkSVB2NkFkZHJlc3NcblxudmFyIEVNUFRZX1ZBTFVFUyA9IFtudWxsLCB1bmRlZmluZWQsICcnXVxuXG52YXIgaXNFbXB0eVZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBFTVBUWV9WQUxVRVMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHZhbHVlID09PSBFTVBUWV9WQUxVRVNbaV0pIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZVxufVxuXG5mdW5jdGlvbiBpc0NhbGxhYmxlKG8pIHtcbiAgcmV0dXJuIChpcy5GdW5jdGlvbihvKSB8fCBpcy5GdW5jdGlvbihvLl9fY2FsbF9fKSlcbn1cblxuLyoqXG4gKiBDYWxscyBhIHZhbGlkYXRvciwgd2hpY2ggbWF5IGJlIGEgZnVuY3Rpb24gb3IgYW4gb2JqZWN0cyB3aXRoIGFcbiAqIF9fY2FsbF9fIG1ldGhvZCwgd2l0aCB0aGUgZ2l2ZW4gdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIGNhbGxWYWxpZGF0b3IodiwgdmFsdWUpIHtcbiAgaWYgKGlzLkZ1bmN0aW9uKHYpKSB7XG4gICAgdih2YWx1ZSlcbiAgfVxuICBlbHNlIGlmIChpcy5GdW5jdGlvbih2Ll9fY2FsbF9fKSkge1xuICAgIHYuX19jYWxsX18odmFsdWUpXG4gIH1cbn1cblxuLy8gU2VlIGFsc28gaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjgyMiNzZWN0aW9uLTMuMi41XG52YXIgRU1BSUxfUkUgPSBuZXcgUmVnRXhwKFxuICAgICAgXCIoXlstISMkJSYnKisvPT9eX2B7fXx+MC05QS1aXSsoXFxcXC5bLSEjJCUmJyorLz0/Xl9ge318fjAtOUEtWl0rKSpcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG90LWF0b21cbiAgICArICd8XlwiKFtcXFxcMDAxLVxcXFwwMTBcXFxcMDEzXFxcXDAxNFxcXFwwMTYtXFxcXDAzNyEjLVxcXFxbXFxcXF0tXFxcXDE3N118XFxcXFxcXFxbXFxcXDAwMS1cXFxcMDExXFxcXDAxM1xcXFwwMTRcXFxcMDE2LVxcXFwxNzddKSpcIicgLy8gUXVvdGVkLXN0cmluZ1xuICAgICsgJylAKCg/OltBLVowLTldKD86W0EtWjAtOS1dezAsNjF9W0EtWjAtOV0pP1xcXFwuKStbQS1aXXsyLDZ9XFxcXC4/JCknICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG9tYWluXG4gICAgKyAnfFxcXFxbKDI1WzAtNV18MlswLTRdXFxcXGR8WzAtMV0/XFxcXGQ/XFxcXGQpKFxcXFwuKDI1WzAtNV18MlswLTRdXFxcXGR8WzAtMV0/XFxcXGQ/XFxcXGQpKXszfVxcXFxdJCcgICAgICAgICAgICAgIC8vIExpdGVyYWwgZm9ybSwgaXB2NCBhZGRyZXNzIChTTVRQIDQuMS4zKVxuICAgICwgJ2knXG4gICAgKVxuICAsIFNMVUdfUkUgPSAvXlstXFx3XSskL1xuICAsIElQVjRfUkUgPSAvXigyNVswLTVdfDJbMC00XVxcZHxbMC0xXT9cXGQ/XFxkKShcXC4oMjVbMC01XXwyWzAtNF1cXGR8WzAtMV0/XFxkP1xcZCkpezN9JC9cbiAgLCBDT01NQV9TRVBBUkFURURfSU5UX0xJU1RfUkUgPSAvXltcXGQsXSskL1xuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGlucHV0IG1hdGNoZXMgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKi9cbnZhciBSZWdleFZhbGlkYXRvciA9IENvbmN1ci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24ocmVnZXgsIG1lc3NhZ2UsIGNvZGUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmVnZXhWYWxpZGF0b3IpKSByZXR1cm4gbmV3IFJlZ2V4VmFsaWRhdG9yKHJlZ2V4LCBtZXNzYWdlLCBjb2RlKVxuICAgIGlmIChyZWdleCkge1xuICAgICAgdGhpcy5yZWdleCA9IHJlZ2V4XG4gICAgfVxuICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlXG4gICAgfVxuICAgIGlmIChjb2RlKSB7XG4gICAgICB0aGlzLmNvZGUgPSBjb2RlXG4gICAgfVxuICAgIGlmIChpcy5TdHJpbmcodGhpcy5yZWdleCkpIHtcbiAgICAgIHRoaXMucmVnZXggPSBuZXcgUmVnRXhwKHRoaXMucmVnZXgpXG4gICAgfVxuICB9XG4sIHJlZ2V4OiAnJ1xuLCBtZXNzYWdlOiAnRW50ZXIgYSB2YWxpZCB2YWx1ZS4nXG4sIGNvZGU6ICdpbnZhbGlkJ1xuLCBfX2NhbGxfXzogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoIXRoaXMucmVnZXgudGVzdCh2YWx1ZSkpIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcih0aGlzLm1lc3NhZ2UsIHtjb2RlOiB0aGlzLmNvZGV9KVxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBsb29rcyBsaWtlIGEgdmFsaWQgVVJMLlxuICovXG52YXIgVVJMVmFsaWRhdG9yID0gUmVnZXhWYWxpZGF0b3IuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6ZnVuY3Rpb24oKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFVSTFZhbGlkYXRvcikpIHJldHVybiBuZXcgVVJMVmFsaWRhdG9yKClcbiAgICBSZWdleFZhbGlkYXRvci5jYWxsKHRoaXMpXG4gIH1cbiwgcmVnZXg6IG5ldyBSZWdFeHAoXG4gICAgJ14oPzpodHRwfGZ0cClzPzovLycgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBodHRwOi8vIG9yIGh0dHBzOi8vXG4gICsgJyg/Oig/OltBLVowLTldKD86W0EtWjAtOS1dezAsNjF9W0EtWjAtOV0pP1xcXFwuKSsnIC8vIERvbWFpbi4uLlxuICArICcoPzpbQS1aXXsyLDZ9XFxcXC4/fFtBLVowLTktXXsyLH1cXFxcLj8pfCdcbiAgKyAnbG9jYWxob3N0fCcgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxvY2FsaG9zdC4uLlxuICArICdcXFxcZHsxLDN9XFxcXC5cXFxcZHsxLDN9XFxcXC5cXFxcZHsxLDN9XFxcXC5cXFxcZHsxLDN9KScgICAgICAvLyAuLi5vciBJUFxuICArICcoPzo6XFxcXGQrKT8nICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPcHRpb25hbCBwb3J0XG4gICsgJyg/Oi8/fFsvP11cXFxcUyspJCdcbiAgLCAnaSdcbiAgKVxuLCBtZXNzYWdlOiAnRW50ZXIgYSB2YWxpZCBVUkwuJ1xuLCBfX2NhbGxfXzogZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0cnkge1xuICAgICAgUmVnZXhWYWxpZGF0b3IucHJvdG90eXBlLl9fY2FsbF9fLmNhbGwodGhpcywgdmFsdWUpXG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBpZiAoIShlIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSB8fCAhdmFsdWUpIHtcbiAgICAgICAgdGhyb3cgZVxuICAgICAgfVxuXG4gICAgICAvLyBUcml2aWFsIGNhc2UgZmFpbGVkIC0gdHJ5IGZvciBwb3NzaWJsZSBJRE4gZG9tYWluXG4gICAgICB2YXIgdXJsRmllbGRzID0gdXJsLnBhcnNlVXJpKHZhbHVlKVxuICAgICAgdHJ5IHtcbiAgICAgICAgdXJsRmllbGRzLmhvc3QgPSBwdW55Y29kZS50b0FTQ0lJKHVybEZpZWxkcy5ob3N0KVxuICAgICAgfVxuICAgICAgY2F0Y2ggKHVlKSB7XG4gICAgICAgIHRocm93IGVcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gdXJsLm1ha2VVcmkodXJsRmllbGRzKVxuICAgICAgUmVnZXhWYWxpZGF0b3IucHJvdG90eXBlLl9fY2FsbF9fLmNhbGwodGhpcywgdmFsdWUpXG4gICAgfVxuICB9XG59KVxuXG52YXIgRW1haWxWYWxpZGF0b3IgPSBSZWdleFZhbGlkYXRvci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24ocmVnZXgsIG1lc3NhZ2UsIGNvZGUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRW1haWxWYWxpZGF0b3IpKSByZXR1cm4gbmV3IEVtYWlsVmFsaWRhdG9yKHJlZ2V4LCBtZXNzYWdlLCBjb2RlKVxuICAgIFJlZ2V4VmFsaWRhdG9yLmNhbGwodGhpcywgcmVnZXgsIG1lc3NhZ2UsIGNvZGUpXG4gIH1cbiwgX19jYWxsX18gOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRyeSB7XG4gICAgICBSZWdleFZhbGlkYXRvci5wcm90b3R5cGUuX19jYWxsX18uY2FsbCh0aGlzLCB2YWx1ZSlcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpIHx8XG4gICAgICAgICAgIXZhbHVlIHx8XG4gICAgICAgICAgdmFsdWUuaW5kZXhPZignQCcpID09IC0xKSB7XG4gICAgICAgIHRocm93IGVcbiAgICAgIH1cblxuICAgICAgLy8gVHJpdmlhbCBjYXNlIGZhaWxlZCAtIHRyeSBmb3IgcG9zc2libGUgSUROIGRvbWFpbi1wYXJ0XG4gICAgICB2YXIgcGFydHMgPSB2YWx1ZS5zcGxpdCgnQCcpXG4gICAgICB0cnkge1xuICAgICAgICBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSA9IHB1bnljb2RlLnRvQVNDSUkocGFydHNbcGFydHMubGVuZ3RoIC0gMV0pXG4gICAgICB9XG4gICAgICBjYXRjaCAodWUpIHtcbiAgICAgICAgdGhyb3cgZVxuICAgICAgfVxuICAgICAgUmVnZXhWYWxpZGF0b3IucHJvdG90eXBlLl9fY2FsbF9fLmNhbGwodGhpcywgcGFydHMuam9pbignQCcpKVxuICAgIH1cbiAgfVxufSlcblxuLyoqIFZhbGlkYXRlcyB0aGF0IGlucHV0IGxvb2tzIGxpa2UgYSB2YWxpZCBVUkwuICovXG52YXIgdmFsaWRhdGVVUkwgPSBVUkxWYWxpZGF0b3IoKVxuXG4vKiogVmFsaWRhdGVzIHRoYXQgaW5wdXQgbG9va3MgbGlrZSBhIHZhbGlkIGUtbWFpbCBhZGRyZXNzLiAqL1xudmFyIHZhbGlkYXRlRW1haWwgPVxuICAgIEVtYWlsVmFsaWRhdG9yKEVNQUlMX1JFLFxuICAgICAgJ0VudGVyIGEgdmFsaWQgZS1tYWlsIGFkZHJlc3MuJyxcbiAgICAgICdpbnZhbGlkJylcblxuLyoqIFZhbGlkYXRlcyB0aGF0IGlucHV0IGlzIGEgdmFsaWQgc2x1Zy4gKi9cbnZhciB2YWxpZGF0ZVNsdWcgPVxuICAgIFJlZ2V4VmFsaWRhdG9yKFNMVUdfUkUsXG4gICAgICAnRW50ZXIgYSB2YWxpZCBcInNsdWdcIiBjb25zaXN0aW5nIG9mIGxldHRlcnMsIG51bWJlcnMsIHVuZGVyc2NvcmVzIG9yIGh5cGhlbnMuJyxcbiAgICAgICdpbnZhbGlkJylcblxuLyoqIFZhbGlkYXRlcyB0aGF0IGlucHV0IGlzIGEgdmFsaWQgSVB2NCBhZGRyZXNzLiAqL1xudmFyIHZhbGlkYXRlSVB2NEFkZHJlc3MgPVxuICAgIFJlZ2V4VmFsaWRhdG9yKElQVjRfUkUsXG4gICAgICAnRW50ZXIgYSB2YWxpZCBJUHY0IGFkZHJlc3MuJyxcbiAgICAgICdpbnZhbGlkJylcblxuLyoqIFZhbGlkYXRlcyB0aGF0IGlucHV0IGlzIGEgdmFsaWQgSVB2NiBhZGRyZXNzLiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVJUHY2QWRkcmVzcyh2YWx1ZSkge1xuICBpZiAoIWlzVmFsaWRJUHY2QWRkcmVzcyh2YWx1ZSkpIHtcbiAgICB0aHJvdyBWYWxpZGF0aW9uRXJyb3IoJ0VudGVyIGEgdmFsaWQgSVB2NiBhZGRyZXNzLicsIHtjb2RlOiAnaW52YWxpZCd9KVxuICB9XG59XG5cbi8qKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBpcyBhIHZhbGlkIElQdjQgb3IgSVB2NiBhZGRyZXNzLiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVJUHY0NkFkZHJlc3ModmFsdWUpIHtcbiAgdHJ5IHtcbiAgICB2YWxpZGF0ZUlQdjRBZGRyZXNzLl9fY2FsbF9fKHZhbHVlKVxuICB9XG4gIGNhdGNoIChlKSB7XG4gICAgaWYgKCEoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHtcbiAgICAgIHRocm93IGVcbiAgICB9XG5cbiAgICBpZiAoIWlzVmFsaWRJUHY2QWRkcmVzcyh2YWx1ZSkpIHtcbiAgICAgIHRocm93IFZhbGlkYXRpb25FcnJvcignRW50ZXIgYSB2YWxpZCBJUHY0IG9yIElQdjYgYWRkcmVzcy4nLCB7Y29kZTogJ2ludmFsaWQnfSlcbiAgICB9XG4gIH1cbn1cblxudmFyIGlwQWRkcmVzc1ZhbGlkYXRvck1hcCA9IHtcbiAgYm90aDoge3ZhbGlkYXRvcnM6IFt2YWxpZGF0ZUlQdjQ2QWRkcmVzc10sIG1lc3NhZ2U6ICdFbnRlciBhIHZhbGlkIElQdjQgb3IgSVB2NiBhZGRyZXNzLid9XG4sIGlwdjQ6IHt2YWxpZGF0b3JzOiBbdmFsaWRhdGVJUHY0QWRkcmVzc10sIG1lc3NhZ2U6ICdFbnRlciBhIHZhbGlkIElQdjQgYWRkcmVzcy4nfVxuLCBpcHY2OiB7dmFsaWRhdG9yczogW3ZhbGlkYXRlSVB2NkFkZHJlc3NdLCBtZXNzYWdlOiAnRW50ZXIgYSB2YWxpZCBJUHY2IGFkZHJlc3MuJ31cbn1cblxuLyoqXG4gKiBEZXBlbmRpbmcgb24gdGhlIGdpdmVuIHBhcmFtZXRlcnMgcmV0dXJucyB0aGUgYXBwcm9wcmlhdGUgdmFsaWRhdG9ycyBmb3JcbiAqIGEgR2VuZXJpY0lQQWRkcmVzc0ZpZWxkLlxuICovXG5mdW5jdGlvbiBpcEFkZHJlc3NWYWxpZGF0b3JzKHByb3RvY29sLCB1bnBhY2tJUHY0KSB7XG4gIGlmIChwcm90b2NvbCAhPSAnYm90aCcgJiYgdW5wYWNrSVB2NCkge1xuICAgIHRocm93IG5ldyBFcnJvcignWW91IGNhbiBvbmx5IHVzZSB1bnBhY2tJUHY0IGlmIHByb3RvY29sIGlzIHNldCB0byBcImJvdGhcIicpXG4gIH1cbiAgcHJvdG9jb2wgPSBwcm90b2NvbC50b0xvd2VyQ2FzZSgpXG4gIGlmICh0eXBlb2YgaXBBZGRyZXNzVmFsaWRhdG9yTWFwW3Byb3RvY29sXSA9PSAndW5kZWZpbmVkJykge1xuICAgIHRocm93IG5ldyBFcnJvcignVGhlIHByb3RvY29sIFwiJyArIHByb3RvY29sICsnXCIgaXMgdW5rbm93bicpXG4gIH1cbiAgcmV0dXJuIGlwQWRkcmVzc1ZhbGlkYXRvck1hcFtwcm90b2NvbF1cbn1cblxuLyoqIFZhbGlkYXRlcyB0aGF0IGlucHV0IGlzIGEgY29tbWEtc2VwYXJhdGVkIGxpc3Qgb2YgaW50ZWdlcnMuICovXG52YXIgdmFsaWRhdGVDb21tYVNlcGFyYXRlZEludGVnZXJMaXN0ID1cbiAgICBSZWdleFZhbGlkYXRvcihDT01NQV9TRVBBUkFURURfSU5UX0xJU1RfUkUsXG4gICAgICAnRW50ZXIgb25seSBkaWdpdHMgc2VwYXJhdGVkIGJ5IGNvbW1hcy4nLFxuICAgICAgJ2ludmFsaWQnKVxuXG4vKipcbiAqIEJhc2UgZm9yIHZhbGlkYXRvcnMgd2hpY2ggY29tcGFyZSBpbnB1dCBhZ2FpbnN0IGEgZ2l2ZW4gdmFsdWUuXG4gKi9cbnZhciBCYXNlVmFsaWRhdG9yID0gQ29uY3VyLmV4dGVuZCh7XG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihsaW1pdFZhbHVlKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJhc2VWYWxpZGF0b3IpKSByZXR1cm4gbmV3IEJhc2VWYWxpZGF0b3IobGltaXRWYWx1ZSlcbiAgICB0aGlzLmxpbWl0VmFsdWUgPSBsaW1pdFZhbHVlXG4gIH1cbiwgY29tcGFyZTogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gYSAhPT0gYiB9XG4sIGNsZWFuOiBmdW5jdGlvbih4KSB7IHJldHVybiB4IH1cbiwgbWVzc2FnZTogJ0Vuc3VyZSB0aGlzIHZhbHVlIGlzIHtsaW1pdFZhbHVlfSAoaXQgaXMge3Nob3dWYWx1ZX0pLidcbiwgY29kZTogJ2xpbWl0VmFsdWUnXG4sIF9fY2FsbF9fOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBjbGVhbmVkID0gdGhpcy5jbGVhbih2YWx1ZSlcbiAgICAgICwgcGFyYW1zID0ge2xpbWl0VmFsdWU6IHRoaXMubGltaXRWYWx1ZSwgc2hvd1ZhbHVlOiBjbGVhbmVkfVxuICAgIGlmICh0aGlzLmNvbXBhcmUoY2xlYW5lZCwgdGhpcy5saW1pdFZhbHVlKSkge1xuICAgICAgdGhyb3cgVmFsaWRhdGlvbkVycm9yKGZvcm1hdCh0aGlzLm1lc3NhZ2UsIHBhcmFtcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge2NvZGU6IHRoaXMuY29kZSwgcGFyYW1zOiBwYXJhbXN9KVxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gYSBnaXZlbiB2YWx1ZS5cbiAqL1xudmFyIE1heFZhbHVlVmFsaWRhdG9yID0gQmFzZVZhbGlkYXRvci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24obGltaXRWYWx1ZSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNYXhWYWx1ZVZhbGlkYXRvcikpIHJldHVybiBuZXcgTWF4VmFsdWVWYWxpZGF0b3IobGltaXRWYWx1ZSlcbiAgICBCYXNlVmFsaWRhdG9yLmNhbGwodGhpcywgbGltaXRWYWx1ZSlcbiAgfVxuLCBjb21wYXJlOiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhID4gYiB9XG4sIG1lc3NhZ2U6ICdFbnN1cmUgdGhpcyB2YWx1ZSBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8ge2xpbWl0VmFsdWV9LidcbiwgY29kZTogJ21heFZhbHVlJ1xufSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gYSBnaXZlbiB2YWx1ZS5cbiAqL1xudmFyIE1pblZhbHVlVmFsaWRhdG9yID0gQmFzZVZhbGlkYXRvci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24obGltaXRWYWx1ZSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNaW5WYWx1ZVZhbGlkYXRvcikpIHJldHVybiBuZXcgTWluVmFsdWVWYWxpZGF0b3IobGltaXRWYWx1ZSlcbiAgICBCYXNlVmFsaWRhdG9yLmNhbGwodGhpcywgbGltaXRWYWx1ZSlcbiAgfVxuLCBjb21wYXJlOiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhIDwgYiB9XG4sIG1lc3NhZ2U6ICdFbnN1cmUgdGhpcyB2YWx1ZSBpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8ge2xpbWl0VmFsdWV9LidcbiwgY29kZTogJ21pblZhbHVlJ1xufSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBpcyBhdCBsZWFzdCBhIGdpdmVuIGxlbmd0aC5cbiAqL1xudmFyIE1pbkxlbmd0aFZhbGlkYXRvciA9IEJhc2VWYWxpZGF0b3IuZXh0ZW5kKHtcbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGxpbWl0VmFsdWUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTWluTGVuZ3RoVmFsaWRhdG9yKSkgcmV0dXJuIG5ldyBNaW5MZW5ndGhWYWxpZGF0b3IobGltaXRWYWx1ZSlcbiAgICBCYXNlVmFsaWRhdG9yLmNhbGwodGhpcywgbGltaXRWYWx1ZSlcbiAgfVxuLCBjb21wYXJlOiBmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhIDwgYiB9XG4sIGNsZWFuOiBmdW5jdGlvbih4KSB7IHJldHVybiB4Lmxlbmd0aCB9XG4sIG1lc3NhZ2U6ICdFbnN1cmUgdGhpcyB2YWx1ZSBoYXMgYXQgbGVhc3Qge2xpbWl0VmFsdWV9IGNoYXJhY3RlcnMgKGl0IGhhcyB7c2hvd1ZhbHVlfSkuJ1xuLCBjb2RlOiAnbWluTGVuZ3RoJ1xufSlcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBpbnB1dCBpcyBhdCBtb3N0IGEgZ2l2ZW4gbGVuZ3RoLlxuICovXG52YXIgTWF4TGVuZ3RoVmFsaWRhdG9yID0gQmFzZVZhbGlkYXRvci5leHRlbmQoe1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24obGltaXRWYWx1ZSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNYXhMZW5ndGhWYWxpZGF0b3IpKSByZXR1cm4gbmV3IE1heExlbmd0aFZhbGlkYXRvcihsaW1pdFZhbHVlKVxuICAgIEJhc2VWYWxpZGF0b3IuY2FsbCh0aGlzLCBsaW1pdFZhbHVlKVxuICB9XG4sIGNvbXBhcmU6IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEgPiBiIH1cbiwgY2xlYW46IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgubGVuZ3RoIH1cbiwgbWVzc2FnZTogJ0Vuc3VyZSB0aGlzIHZhbHVlIGhhcyBhdCBtb3N0IHtsaW1pdFZhbHVlfSBjaGFyYWN0ZXJzIChpdCBoYXMge3Nob3dWYWx1ZX0pLidcbiwgY29kZTogJ21heExlbmd0aCdcbn0pXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBFTVBUWV9WQUxVRVM6IEVNUFRZX1ZBTFVFU1xuLCBpc0VtcHR5VmFsdWU6IGlzRW1wdHlWYWx1ZVxuLCBpc0NhbGxhYmxlOiBpc0NhbGxhYmxlXG4sIGNhbGxWYWxpZGF0b3I6IGNhbGxWYWxpZGF0b3JcbiwgUmVnZXhWYWxpZGF0b3I6IFJlZ2V4VmFsaWRhdG9yXG4sIFVSTFZhbGlkYXRvcjogVVJMVmFsaWRhdG9yXG4sIEVtYWlsVmFsaWRhdG9yOiBFbWFpbFZhbGlkYXRvclxuLCB2YWxpZGF0ZVVSTDogdmFsaWRhdGVVUkxcbiwgdmFsaWRhdGVFbWFpbDogdmFsaWRhdGVFbWFpbFxuLCB2YWxpZGF0ZVNsdWc6IHZhbGlkYXRlU2x1Z1xuLCB2YWxpZGF0ZUlQdjRBZGRyZXNzOiB2YWxpZGF0ZUlQdjRBZGRyZXNzXG4sIHZhbGlkYXRlSVB2NkFkZHJlc3M6IHZhbGlkYXRlSVB2NkFkZHJlc3NcbiwgdmFsaWRhdGVJUHY0NkFkZHJlc3M6IHZhbGlkYXRlSVB2NDZBZGRyZXNzXG4sIGlwQWRkcmVzc1ZhbGlkYXRvcnM6IGlwQWRkcmVzc1ZhbGlkYXRvcnNcbiwgdmFsaWRhdGVDb21tYVNlcGFyYXRlZEludGVnZXJMaXN0OiB2YWxpZGF0ZUNvbW1hU2VwYXJhdGVkSW50ZWdlckxpc3RcbiwgQmFzZVZhbGlkYXRvcjogQmFzZVZhbGlkYXRvclxuLCBNYXhWYWx1ZVZhbGlkYXRvcjogTWF4VmFsdWVWYWxpZGF0b3JcbiwgTWluVmFsdWVWYWxpZGF0b3I6IE1pblZhbHVlVmFsaWRhdG9yXG4sIE1heExlbmd0aFZhbGlkYXRvcjogTWF4TGVuZ3RoVmFsaWRhdG9yXG4sIE1pbkxlbmd0aFZhbGlkYXRvcjogTWluTGVuZ3RoVmFsaWRhdG9yXG4sIFZhbGlkYXRpb25FcnJvcjogVmFsaWRhdGlvbkVycm9yXG4sIGlwdjY6IGlwdjZcbn1cbiJdfQ==
(5)
});
