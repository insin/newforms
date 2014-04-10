/**
 * newforms 0.6.0-alpha (dev build at Wed, 09 Apr 2014 01:34:31 GMT) - https://github.com/insin/newforms
 * MIT Licensed
 */
!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.forms=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

module.exports = {
  browser: typeof process == 'undefined'
}
},{}],2:[function(_dereq_,module,exports){
'use strict';

var Concur = _dereq_('Concur')
var is = _dereq_('isomorph/is')
var object = _dereq_('isomorph/object')
var time = _dereq_('isomorph/time')
var url = _dereq_('isomorph/url')
var validators = _dereq_('validators')

var env = _dereq_('./env')
var formats = _dereq_('./formats')
var util = _dereq_('./util')
var widgets = _dereq_('./widgets')

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
      validators: [], cssClass: null, validation: null, controlled: null,
      custom: null
    }, kwargs)
    this.required = kwargs.required
    this.label = kwargs.label
    this.initial = kwargs.initial
    this.showHiddenInitial = kwargs.showHiddenInitial
    this.helpText = kwargs.helpText || ''
    this.cssClass = kwargs.cssClass
    this.validation = kwargs.validation
    // Normalise validation config to an object if it's not set to manual
    if (is.String(this.validation) && this.validation != 'manual') {
      this.validation = (this.validation == 'auto'
                         ? {event: 'onChange', delay: 250}
                         : {event: this.validation})
    }
    this.controlled = kwargs.controlled
    this.custom = kwargs.custom

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
  , maxDigits: 'Ensure that there are no more than {max} digits in total.'
  , maxDecimalPlaces: 'Ensure that there are no more than {max} decimal places.'
  , maxWholeDigits: 'Ensure that there are no more than {max} digits before the decimal point.'
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
    , params: {max: this.maxDigits}
    })
  }
  if (this.decimalPlaces !== null && decimals > this.decimalPlaces) {
    throw ValidationError(this.errorMessages.maxDecimalPlaces, {
      code: 'maxDecimalPlaces'
    , params: {max: this.decimalPlaces}
    })
  }
  if (this.maxDigits !== null &&
      this.decimalPlaces !== null &&
      wholeDigits > (this.maxDigits - this.decimalPlaces)) {
    throw ValidationError(this.errorMessages.maxWholeDigits, {
      code: 'maxWholeDigits'
    , params: {max: (this.maxDigits - this.decimalPlaces)}
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
, inputFormats: formats.DEFAULT_DATE_INPUT_FORMATS
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
, inputFormats: formats.DEFAULT_TIME_INPUT_FORMATS
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
, inputFormats: formats.DEFAULT_DATETIME_INPUT_FORMATS
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

ImageField.prototype.widgetAttrs = function(widget) {
  var attrs = FileField.prototype.widgetAttrs.call(this, widget)
  attrs.accept = 'image/*'
  return attrs
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
  this._choices = this.widget.choices = util.normaliseChoices(choices)
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
      for (var j = 0, m = optgroupChoices.length; j < m; j++) {
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
  if (this.isEmptyValue(value)) {
    return []
  }
  else if (!is.Array(value)) {
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
      label: null, initial: null, helpText: null,
      allowFiles: true, allowFolders: false
    }, kwargs)

    this.path = path
    this.match = object.pop(kwargs, 'match')
    this.recursive = object.pop(kwargs, 'recursive')
    this.allowFiles = object.pop(kwargs, 'allowFiles')
    this.allowFolders = object.pop(kwargs, 'allowFolders')
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

},{"./env":1,"./formats":3,"./util":7,"./widgets":8,"Concur":9,"isomorph/is":13,"isomorph/object":14,"isomorph/time":15,"isomorph/url":16,"validators":19}],3:[function(_dereq_,module,exports){
'use strict';

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

module.exports = {
  DEFAULT_DATE_INPUT_FORMATS: DEFAULT_DATE_INPUT_FORMATS
, DEFAULT_TIME_INPUT_FORMATS: DEFAULT_TIME_INPUT_FORMATS
, DEFAULT_DATETIME_INPUT_FORMATS: DEFAULT_DATETIME_INPUT_FORMATS
}

},{}],4:[function(_dereq_,module,exports){
'use strict';

var Concur = _dereq_('Concur')
var is = _dereq_('isomorph/is')
var format = _dereq_('isomorph/format').formatObj
var object = _dereq_('isomorph/object')
var copy = _dereq_('isomorph/copy')
var validators = _dereq_('validators')
var React = (window.React)

var env = _dereq_('./env')
var util = _dereq_('./util')
var fields = _dereq_('./fields')
var widgets = _dereq_('./widgets')

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
 * This really is only useful for RadioSelect and CheckboxSelectMultiple
 * widgets, so that you can iterate over individual inputs when rendering.
 */
BoundField.prototype.subWidgets = function() {
  var id = this.field.widget.attrs.id || this.autoId()
  var kwargs = {attrs: {}}
  if (id) {
    kwargs.attrs.id = id
  }
  return this.field.widget.subWidgets(this.htmlName, this.value(), kwargs)
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
  if (typeof attrs.key == 'undefined') {
    attrs.key = name
  }
  var controlled = this.controlled(widget)
  var validation = this.validation(widget)

  // Add an onChange event handler to update form.data when the field is changed
  // if it's controlled or uses interactive validation.
  if (controlled || validation != 'manual') {
    attrs.onChange =
      util.bindRight(this.form._handleFieldChange, this.form, validation)
  }

  // If validation should happen on an event other than onChange, also add an
  // event handler for it.
  if (validation != 'manual' && validation.event != 'onChange') {
    attrs[validation.event] =
      util.bindRight(this.form._handleFieldValidation, this.form, validation)
  }

  var renderKwargs = {attrs: attrs, controlled: controlled}
  if (widget.needsInitialValue) {
    renderKwargs.initialValue = this.initialValue()
  }
  return widget.render(name, this.value(), renderKwargs)
}

/**
 * Determines if the widget should be a controlled or uncontrolled React
 * component.
 */
BoundField.prototype.controlled = function(widget) {
  if (arguments.length === 0) {
    widget = this.field.widget
  }
  var controlled = false
  if (widget.isValueSettable) {
    // If the field has any controlled config set, it should take precedence,
    // otherwise use the form's as it has a default.
    controlled = (this.field.controlled !== null
                  ? this.field.controlled
                  : this.form.controlled)
  }
  return controlled
}

/**
 * Gets the configured validation for the field or form, allowing the widget
 * which is going to be rendered to override it if necessary.
 */
BoundField.prototype.validation = function(widget) {
  if (arguments.length === 0) {
    widget = this.field.widget
  }
  // If the field has any validation config set, it should take precedence,
  // otherwise use the form's as it has a default.
  var validation = this.field.validation || this.form.validation
  // Allow widgets to override the type of validation that's used for them -
  // primarily for inputs which can only be changed by click/selection.
  if (validation != 'manual' && widget.validation !== null) {
    validation = widget.validation
  }
  return validation
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
 * Returns the value to be displayed for this BoundField, using the initia
 * value if the form is not bound or the data otherwise.
 */
BoundField.prototype.value = function() {
  var data
  if (!this.form.isBound) {
    data = this.initialValue()
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
 * Returns the initial value for this BoundField from the form or field's
 * configured initial values - the field's default initial value of null will
 * be returned if none was configured.
 */
BoundField.prototype.initialValue = function() {
  var value = object.get(this.form.initial, this.name, this.field.initial)
  if (is.Function(value)) {
    value = value()
  }
  return value
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
      emptyPermitted: false, validation: 'manual', controlled: false,
      onStateChange: null
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
    this.validation = kwargs.validation
    // Normalise validation config to an object if it's not set to manual
    if (is.String(this.validation) && this.validation != 'manual') {
      this.validation = (this.validation == 'auto'
                         ? {event: 'onChange', delay: 250}
                         : {event: this.validation})
    }
    this.controlled = kwargs.controlled
    this.onStateChange = kwargs.onStateChange
    this._errors = null // Stores errors after clean() has been called
    this._changedData = null
    this._pendingFieldValidation = {} // Pending field validation functions

    // The baseFields attribute is the *prototype-wide* definition of fields.
    // Because a particular *instance* might want to alter this.fields, we
    // create this.fields here by deep copying baseFields. Instances should
    // always modify this.fields; they should not modify baseFields.
    this.fields = copy.deepCopy(this.baseFields)

    // Now that form.fields exists, we can check if there's any configuration
    // which needs onStateChange on the form or its fields.
    if (this._needsOnStateChange()) {
      if (!is.Function(kwargs.onStateChange)) {
        throw new Error(
          'Forms must be given an onStateChange callback when they, or any of ' +
          'their fields, are controlled or use interactive validation.')
      }
      // isBound will flip to true as soon as the first field is validated. At
      // that point, rendering will flip to using form.data as its source, so
      // ensure data has a copy of any initial data that's been configured.
      if (!this.isBound) {
        var initialData = object.extend(this._fieldInitialData(), this.initial)
        var initialFields = Object.keys(initialData)
        for (var i = 0, l = initialFields.length; i < l; i++) {
          var fieldName = initialFields[i]
          if (typeof this.fields[fieldName] == 'undefined') { continue }
          // Don't copy initial to input data for fields which can't have the
          // initial data set as their current value.
          if (!this.fields[fieldName].widget.isValueSettable) { continue }
          this.data[this.addPrefix(fieldName)] = initialData[fieldName]
        }
      }
    }
  }
})

/**
 * This will always be hooked up to a wiget's onChange to ensure form.data is
 * kept up-to-date. Since we're here anyway, we can deal with onChange
 * validation too.
 */
BaseForm.prototype._handleFieldChange = function(e, validation) {
  // Get the data from the form element(s) in the DOM
  var htmlName = e.target.name
  var data = util.fieldData(e.target.form, htmlName)

  // Keep data up-to-date
  if (!this.isBound) {
    this.isBound = true
  }
  this.data[htmlName] = data
  this.onStateChange()

  // If we should be validating now, do so
  if (validation.event == 'onChange') {
    this._handleFieldValidation(e, validation)
  }
}

/**
 * Handles validating the field which is the target of the given event based
 * on its validation config. This will be hooked up to the appropriate event
 * as per the field's validation config. React special cases onChange to ensure
 * the controlled value is kept up to date, so we should be sure that the date
 * we'll be validating against is current.
 */
BaseForm.prototype._handleFieldValidation = function(e, validation) {
  // Special case for fields whose widget names aren't the same as their form
  // field name.
  var field = this.removePrefix(e.target.getAttribute('data-newforms-field') ||
                                e.target.name)
  if (validation.delay) {
    this._delayedFieldValidation(field, validation.delay)
  }
  else {
    this._immediateFieldValidation(field)
  }
}

/**
 * Validates a single field and notifies the React component that state has
 * changed.
 */
BaseForm.prototype._immediateFieldValidation = function(field) {
  this.partialClean([field])
  this.onStateChange()
}

/**
 * Sets up delayed validation of a single field with a debounced function and
 * calls it, or just calls the function again if it already exists to reset the
 * delay.
 */
BaseForm.prototype._delayedFieldValidation = function(field, delay) {
  if (!is.Function(this._pendingFieldValidation[field])) {
    this._pendingFieldValidation[field] = util.debounce(function() {
      delete this._pendingFieldValidation[field]
      this._immediateFieldValidation(field)
    }.bind(this), delay)
  }
  this._pendingFieldValidation[field]()
}

/**
 * Validates the given HTML form's data.
 * @param {HTMLFormElement} form the <form> containing this Form's rendered
 *   widgets.
 * @return {boolean} true if the form's data is valid.
 */
BaseForm.prototype.validate = function(form) {
  if (form && typeof form.getDOMNode == 'function') {
    form = form.getDOMNode()
  }
  var data = util.formData(form)
  return this.setData(data)
}

/**
 * Resets validation state, replaces the form's input data (and flips its bound
 * flag if necessary) and revalidates, returning the result of isValid().
 * @param {Object.<string,*>} data new input data for the form.
 * @retun {boolean} true if the new data is valid.
 */
BaseForm.prototype.setData = function(data) {
  this._errors = null
  this._changedData = null
  this.data = data
  if (!this.isBound) {
    this.isBound = true
  }
  // This call ultimately triggers a fullClean() because _errors isn't set
  var isValid = this.isValid()
  if (typeof this.onStateChange == 'function') {
    this.onStateChange()
  }
  return isValid
}

/**
 * Updates some of the form's input data, then triggers validation of fields
 * which had their input data updated as well as form-wide cleaning.
 * @param {Object.<string,*>} data updated input data for the form.
 */
BaseForm.prototype.updateData = function(data) {
  this._changedData = null
  object.extend(this.data, data)
  if (!this.isBound) {
    this.isBound = true
  }

  var fields = Object.keys(data)
  if (this.prefix !== null) {
    for (var i = 0, l = fields.length; i < l; i++) {
      fields[i] = this.removePrefix(fields[i])
    }
  }
  this.partialClean(fields)
  if (typeof this.onStateChange == 'function') {
    this.onStateChange()
  }
}

/**
 * Getter for errors, which first cleans the form if there are no errors
 * defined yet.
 * @param {string=} name if given, errors for this field name will be returned
 *   instead of the full error object.
 * @return {(ErrorObject|ErrorList)} form or field errors
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
  if (!env.browser && this._changedData != null) { return this._changedData }
  var changedData = []
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
    var dataValue = field.widget.valueFromData(this.data, this.files, prefixedName)
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
        changedData.push(name)
        continue
      }
    }
    if (field._hasChanged(initialValue, dataValue)) {
      changedData.push(name)
    }
  }
  if (!env.browser) { this._changedData = changedData }
  return changedData
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
      return this.prefix + '-' + fieldName
  }
  return fieldName
}

/**
 * Adds an initial prefix for checking dynamic initial values.
 */
BaseForm.prototype.addInitialPrefix = function(fieldName) {
  return 'initial-' + this.addPrefix(fieldName)
}

/**
 * Returns the field with a prefix-size chunk chopped off the start if this
 * Form has a prefix set.
 */
BaseForm.prototype.removePrefix = function(fieldName) {
  if (this.prefix !== null) {
      return fieldName.substring(this.prefix.length + 1)
  }
  return fieldName
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
    var contents = []
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
    , React.DOM.td(null, contents)
    )
  }

  function errorRow(key, errors, extraContent, cssClasses) {
    var contents = []
    if (errors) { contents.push(errors) }
    if (extraContent) { contents.push.apply(contents, extraContent) }
    var rowAttrs = {key: key}
    if (cssClasses) { rowAttrs.className = cssClasses }
    return React.DOM.tr(rowAttrs
    , React.DOM.td({colSpan: 2}, contents)
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
        throw new Error(this._formName() + " has no field named '" + field + "'")
      }
      this._errors.set(field, new this.errorConstructor())
    }
    this._errors.get(field).extend(errorList)
    if (object.hasOwn(this.cleanedData, field)) {
      delete this.cleanedData[field]
    }
  }
}

BaseForm.prototype._formName = function() {
  return (this.constructor.name ? "'" + this.constructor.name + "'" : 'Form')
}

/**
 * Cleans data for all fields and triggers cross-form cleaning.
 */
BaseForm.prototype.fullClean = function() {
  this._errors = ErrorObject()
  if (!this.isBound) {
    return // Stop further processing
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

/**
 * Cleans data for the given field names and triggers cross-form cleaning in
 * case any cleanedData it uses has changed.
 * @param {Array.<string>} fields field names.
 */
BaseForm.prototype.partialClean = function(fields) {
  if (this._errors === null) {
    this._errors = ErrorObject()
  }
  else {
    this._errors.remove(NON_FIELD_ERRORS)
    this._errors.removeAll(fields)
  }

  if (typeof this.cleanedData == 'undefined') {
    this.cleanedData = {}
  }

  // If the form is permitted to be empty, and none of the form data has
  // changed from the initial data, short circuit any validation.
  if (this.emptyPermitted && !this.hasChanged()) {
    return
  }

  for (var i = 0, l = fields.length; i < l; i++) {
    this._cleanField(fields[i])
  }
  this._cleanForm()
}

BaseForm.prototype._cleanFields = function() {
  for (var name in this.fields) {
    if (object.hasOwn(this.fields, name)) {
      this._cleanField(name)
    }
  }
}

BaseForm.prototype._cleanField = function(name) {
  if (!object.hasOwn(this.fields, name)) {
    throw new Error(this._formName() + " has no field named '" + name + "'")
  }

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
 * @return validated, cleaned data (optionally)
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
 * @return {boolean} true if the form needs to be multipart-encoded, in other
 *   words, if it has a FileInput.
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
 * @return {boolean} true if the form or any of its fields have active
 *   validation configured or are configured to be controlled.
 */
BaseForm.prototype._needsOnStateChange = function() {
  if (this.validation !== 'manual' || this.controlled === true) { return true }
  for (var name in this.fields) {
    if (!object.hasOwn(this.fields, name)) { continue }
    var field = this.fields[name]
    if (field.controlled === true || (field.validation !== null &&
                                      field.validation !== 'manual')) {
      return true
    }
  }
  return false
}

/**
 * Gets initial data configured in this form's fields as a field -> initial
 * value object.
 */
BaseForm.prototype._fieldInitialData = function() {
  var fieldInitial = {}
  var fieldNames = Object.keys(this.fields)
  for (var i = 0, l = fieldNames.length; i < l; i++) {
    var fieldName = fieldNames[i]
    var initial = this.fields[fieldName].initial
    if (initial !== null) {
      fieldInitial[fieldName] = initial
    }
  }
  return fieldInitial
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
    // Process mixins from left-to-right, the same precedence they'll get for
    // having their prototype properties mixed in.
    for (var i = 0, l = mixins.length; i < l; i++) {
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
        // To avoid overwriting the new form's baseFields, declaredFields or
        // constructor when the rest of the mixin's prototype is mixed-in by
        // Concur, replace the mixin with an object containing only its other
        // prototype properties.
        var mixinPrototype = object.extend({}, mixin.prototype)
        delete mixinPrototype.baseFields
        delete mixinPrototype.declaredFields
        delete mixinPrototype.constructor
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

},{"./env":1,"./fields":2,"./util":7,"./widgets":8,"Concur":9,"isomorph/copy":11,"isomorph/format":12,"isomorph/is":13,"isomorph/object":14,"validators":19}],5:[function(_dereq_,module,exports){
'use strict';

var Concur = _dereq_('Concur')
var object = _dereq_('isomorph/object')
var validators = _dereq_('validators')

var env = _dereq_('./env')
var util = _dereq_('./util')
var widgets = _dereq_('./widgets')
var fields = _dereq_('./fields')
var forms = _dereq_('./forms')

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
      initial: null, errorConstructor: ErrorList, managementFormCssClass: null,
      validation: 'manual', controlled: false, onStateChange: null
    }, kwargs)
    this.isBound = kwargs.data !== null || kwargs.files !== null
    this.prefix = kwargs.prefix || this.getDefaultPrefix()
    this.autoId = kwargs.autoId
    this.data = kwargs.data || {}
    this.files = kwargs.files || {}
    this.initial = kwargs.initial
    this.errorConstructor = kwargs.errorConstructor
    this.managementFormCssClass = kwargs.managementFormCssClass
    this.validation = kwargs.validation
    this.controlled = kwargs.controlled
    this.onStateChange = kwargs.onStateChange
    this._forms = null
    this._errors = null
    this._nonFormErrors = null
  }
})

/**
 * Resets validation state, updates the formset's input data (and bound status
 * if necessary) and revalidates, returning the result of isValid().
 * @param {Object.<string, *} data new input data for the formset.
 * @retun {boolean} true if the new data is valid.
 */
BaseFormSet.prototype.setData = function(data) {
  this._errors = null
  this.data = data
  if (!this.isBound) {
    this.isBound = true
  }
  this.forms().map(function(form) { form.setData(data) })
  return this.isValid()
}

/**
 * Returns the ManagementForm instance for this FormSet.
 * @browser the form is unbound and uses initial data from this FormSet.
 * @server the form is bound to submitted data.
 */
BaseFormSet.prototype.managementForm = function() {
  var form
  if (!env.browser && this.isBound) {
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
  if (!env.browser && this.isBound) {
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
  if (!env.browser && this.isBound) {
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
  if (this._forms !== null) { return this._forms }
  var forms = []
  var totalFormCount = this.totalFormCount()
  for (var i = 0; i < totalFormCount; i++) {
    forms.push(this._constructForm(i))
  }
  this._forms = forms
  return forms
}

/**
 * Adds another form and increments extra.
 */
BaseFormSet.prototype.addAnother = function() {
  var currentFormCount = this.totalFormCount()
  this.extra++
  if (this._forms !== null) {
    this._forms[currentFormCount] = this._constructForm(currentFormCount)
  }
}

/**
 * Instantiates and returns the ith form instance in the formset.
 */
BaseFormSet.prototype._constructForm = function(i) {
  var defaults = {
    autoId: this.autoId
  , prefix: this.addPrefix(i)
  , errorConstructor: this.errorConstructor
  , validation: this.validation
  , controlled: this.controlled
  , onStateChange: this.onStateChange
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
        (!env.browser && this.managementForm().cleanedData[TOTAL_FORM_COUNT] > this.absoluteMax)) {
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

},{"./env":1,"./fields":2,"./forms":4,"./util":7,"./widgets":8,"Concur":9,"isomorph/object":14,"validators":19}],6:[function(_dereq_,module,exports){
'use strict';

var object = _dereq_('isomorph/object')
var validators = _dereq_('validators')

var env = _dereq_('./env')
var util = _dereq_('./util')
var formats = _dereq_('./formats')
var widgets = _dereq_('./widgets')
var fields = _dereq_('./fields')
var forms = _dereq_('./forms')
var formsets = _dereq_('./formsets')

object.extend(
  module.exports
, { env: env
  , ValidationError: validators.ValidationError
  , ErrorObject: util.ErrorObject
  , ErrorList: util.ErrorList
  , formData: util.formData
  , util: {
      fieldData: util.fieldData
    , formatToArray: util.formatToArray
    , makeChoices: util.makeChoices
    , prettyName: util.prettyName
    }
  , formats: formats
  , validators: validators
  }
, widgets
, fields
, forms
, formsets
)

},{"./env":1,"./fields":2,"./formats":3,"./forms":4,"./formsets":5,"./util":7,"./widgets":8,"isomorph/object":14,"validators":19}],7:[function(_dereq_,module,exports){
'use strict';

var Concur = _dereq_('Concur')
var is = _dereq_('isomorph/is')
var object = _dereq_('isomorph/object')
var validators = _dereq_('validators')
var React = (window.React)

var ValidationError = validators.ValidationError

var slice = Array.prototype.slice

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
 * Get a named property from an object, calling it and returning its result if
 * it's a function.
 */
function maybeCall(obj, prop) {
  var value = obj[prop]
  if (is.Function(value)) {
    value = value.call(obj)
  }
  return value
}

/**
 * Creates a list of choice pairs from a list of objects using the given named
 * properties for the value and label.
 */
function makeChoices(list, valueProp, labelProp) {
  return list.map(function(item) {
    return [maybeCall(item, valueProp), maybeCall(item, labelProp)]
  })
}

/**
 * A version of bind which passes any extra arguments *after* the eventual
 * function call's own arguments.
 */
function bindRight(func, context) {
  var partials = slice.call(arguments, 2)
  return function() {
    return func.apply(context, slice.call(arguments).concat(partials))
  }
}

/**
 * Validates choice input and normalises lazy, non-Array choices to be
 * [value, label] pairs
 * @returning {Array} a normalised version of the given choices.
 * @throws if an Array with length != 2 was found where a choice pair was expected.
 */
function normaliseChoices(choices) {
  if (!choices.length) { return choices }

  var normalisedChoices = []
  for (var i = 0, l = choices.length, choice; i < l; i++) {
    choice = choices[i]
    if (!is.Array(choice)) {
      // TODO In the development build, emit a warning about a choice being
      //      autmatically converted from 'blah' to ['blah', 'blah'] in case it
      //      wasn't intentional
      choice = [choice, choice]
    }
    if (choice.length != 2) {
      throw new Error('Choices in a choice list must contain exactly 2 values, ' +
                      'but got ' + JSON.stringify(choice))
    }
    if (is.Array(choice[1])) {
      var normalisedOptgroupChoices = []
      // This is an optgroup, so look inside the group for options
      var optgroupChoices = choice[1]
      for (var j = 0, m = optgroupChoices.length, optgroupChoice; j < m; j++) {
        optgroupChoice = optgroupChoices[j]
        if (!is.Array(optgroupChoice)) {
          // TODO In the development build, emit a warning about an optgroup
          //      choice being autmatically converted from 'blah' to
          //      ['blah', 'blah'] in case it wasn't intentional.
          optgroupChoice = [optgroupChoice, optgroupChoice]
        }
        if (optgroupChoice.length != 2) {
          throw new Error('Choices in an optgroup choice list must contain ' +
                          'exactly 2 values, but got ' +
                          JSON.stringify(optgroupChoice))
        }
        normalisedOptgroupChoices.push(optgroupChoice)
      }
      normalisedChoices.push([choice[0], normalisedOptgroupChoices])
    }
    else {
      normalisedChoices.push(choice)
    }
  }
  return normalisedChoices
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
 * @param {HTMLFormElement} form a form element.
 * @return {Object.<string,(string|Array.<string>)>} an object containing the
 *   submittable value(s) held in each of the form's elements.
 */
function formData(form) {
  if (!form) {
    throw new Error('formData was given form=' + form)
  }
  var data = {}

  for (var i = 0, l = form.elements.length; i < l; i++) {
    var element = form.elements[i]
    var value = getFormElementValue(element)
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
 * @param {HTMLFormElement} form a form element.
 * @field {string} a field name.
 * @return {(string|Array.<string>)} the named field's submittable value(s),
 */
function fieldData(form, field) {
  /* global NodeList */
  if (!form) {
    throw new Error('fieldData was given form=' + form)
  }
  var data = null
  var element = form.elements[field]
  // Check if we've got a NodeList
  if (element instanceof NodeList) {
    for (var i = 0, l = element.length; i < l; i++) {
      var value = getFormElementValue(element[i])
      if (value !== null) {
        if (data !== null) {
          if (is.Array(data)) {
            data= data.concat(value)
          }
          else {
            data = [data, value]
          }
        }
        else {
          data = value
        }
      }
    }
  }
  else {
    data = getFormElementValue(element)
  }

  return data
}

/**
 * Lookup for <input>s whose value can be accessed with .value.
 */
var textInputTypes = object.lookup([
  'hidden', 'password', 'text', 'email', 'url', 'number', 'file', 'textarea'
])

/**
 * Lookup for <inputs> which have a .checked property.
 */
var checkedInputTypes = object.lookup(['checkbox', 'radio'])

/**
 * @param {HTMLElement} element a form element.
 * @return {(string|Array.<string>)} the element's submittable value(s),
 */
function getFormElementValue(element) {
  var value = null
  var type = element.type

  if (textInputTypes[type] || checkedInputTypes[type] && element.checked) {
    value = element.value
  }
  else if (type == 'select-one') {
    if (element.options.length) {
      value = element.options[element.selectedIndex].value
    }
  }
  else if (type == 'select-multiple') {
    value = []
    for (var i = 0, l = element.options.length; i < l; i++) {
      if (element.options[i].selected) {
        value.push(element.options[i].value)
      }
    }
  }

  return value
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
 * From Underscore.js 1.5.2
 * http://underscorejs.org
 * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 */
function debounce(func, wait, immediate) {
  var timeout, args, context, timestamp, result
  return function() {
    context = this
    args = arguments
    timestamp = new Date()
    var later = function() {
      var last = (new Date()) - timestamp
      if (last < wait) {
        timeout = setTimeout(later, wait - last)
      } else {
        timeout = null
        if (!immediate) { result = func.apply(context, args) }
      }
    };
    var callNow = immediate && !timeout
    if (!timeout) {
      timeout = setTimeout(later, wait)
    }
    if (callNow) { result = func.apply(context, args) }
    return result
  }
}

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

ErrorObject.prototype.remove = function(fields) {
  return delete this.errors[fields]
}

ErrorObject.prototype.removeAll = function(fields) {
  for (var i = 0, l = fields.length; i < l; i++) {
    delete this.errors[fields[i]]
  }
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
  if (items.length === 0) { return }
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
    return
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
  ErrorObject: ErrorObject
, ErrorList: ErrorList
, formData: formData
, fieldData: fieldData
, formatToArray: formatToArray
, makeChoices: makeChoices
, normaliseChoices: normaliseChoices
, prettyName: prettyName
, strip: strip
, debounce: debounce
, bindRight: bindRight
}

},{"Concur":9,"isomorph/is":13,"isomorph/object":14,"validators":19}],8:[function(_dereq_,module,exports){
'use strict';

var Concur = _dereq_('Concur')
var is = _dereq_('isomorph/is')
var object = _dereq_('isomorph/object')
var time = _dereq_('isomorph/time')
var React = (window.React)

var env = _dereq_('./env')
var formats = _dereq_('./formats')
var util = _dereq_('./util')

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
  /** Determines whether this widget is for a required field. */
, isRequired: false
  /** Override for active validation config a partcular widget needs to use. */
, validation: null
  /** Determines whether this widget's render logic always needs to use the initial value. */
, needsInitialValue: false
  /** Determines wherther this widget's value can be set. */
, isValueSettable: true
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
Widget.prototype.buildAttrs = function(kwargAttrs, renderAttrs) {
  var attrs = object.extend({}, this.attrs, renderAttrs, kwargAttrs)
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
  // Hidden inputs can be made controlled inputs by default, as the user
  // can't directly interact with them.
  var valueAttr = (kwargs.controlled || this.isHidden ? 'value' : 'defaultValue')
  if (!(valueAttr == 'defaultValue' && value === '')) {
    finalAttrs[valueAttr] = (value !== '' ? ''+this._formatValue(value) : value)
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
  if (!env.browser && !this.renderValue) {
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
  var key = object.get(finalAttrs, 'key', null)
  var inputs = []
  for (var i = 0, l = value.length; i < l; i++) {
    var inputAttrs = object.extend({}, finalAttrs, {value: value[i]})
    // Add numeric index suffixes to attributes which should be unique
    if (id) {
      inputAttrs.id = id + '_' + i
    }
    if (key) {
      inputAttrs.key = id + '_' + i
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
, validation: {event: 'onChange'}
, isValueSettable: false
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
  needsInitialValue: true
, isValueSettable: false
, constructor: function ClearableFileInput(kwargs) {
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
  kwargs = object.extend({attrs: {}}, kwargs)
  kwargs.attrs.key = 'input'
  var input = FileInput.prototype.render.call(this, name, value, kwargs)
  var initialValue = kwargs.initialValue
  if (!initialValue && value && typeof value.url != 'undefined') {
    initialValue = value
  }
  if (initialValue && typeof initialValue.url != 'undefined') {
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
    , initial: this.urlMarkupTemplate(initialValue.url, ''+initialValue)
    , clearTemplate: clearTemplate
    , inputText: this.inputText
    , input: input
    })
    return React.DOM.span(null, contents)
  }
  else {
    return React.DOM.span(null, input)
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
  kwargs = object.extend({}, kwargs)
  if (value === null) {
    value = ''
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name})
  var valueAttr = (kwargs.controlled ? 'value' : 'defaultValue')
  finalAttrs[valueAttr] = value
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
, defaultFormat: formats.DEFAULT_DATE_INPUT_FORMATS[0]
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
, defaultFormat: formats.DEFAULT_DATETIME_INPUT_FORMATS[0]
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
, defaultFormat: formats.DEFAULT_TIME_INPUT_FORMATS[0]
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
, validation: {event: 'onChange'}
})

CheckboxInput.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({}, kwargs)
  var finalAttrs = this.buildAttrs(kwargs.attrs, {type: 'checkbox',
                                                  name: name})
  if (value !== '' && value !== true && value !== false && value !== null &&
      value !== undefined) {
    // Only add the value attribute if value is non-empty
    finalAttrs.value = value
  }
  var checkedAttr = (kwargs.controlled ? 'checked' : 'defaultChecked')
  finalAttrs[checkedAttr] = this.checkTest(value)
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
    this.choices = util.normaliseChoices(kwargs.choices)
  }
, allowMultipleSelected: false
, validation: {event: 'onChange'}
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
  kwargs = object.extend({choices: []}, kwargs)
  if (selectedValue === null) {
    selectedValue = ''
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name})
  var options = this.renderOptions(kwargs.choices, [selectedValue])
  var valueAttr = (kwargs.controlled ? 'value' : 'defaultValue')
  finalAttrs[valueAttr] = selectedValue
  return React.DOM.select(finalAttrs, options)
}

Select.prototype.renderOptions = function(additionalChoices, selectedValues) {
  var selectedValuesLookup = object.lookup(selectedValues)
  var options = []
  var choices = this.choices.concat(util.normaliseChoices(additionalChoices))
  for (var i = 0, l = choices.length, choice; i < l; i++) {
    choice = choices[i]
    if (is.Array(choice[1])) {
      var optgroupOptions = []
      var optgroupChoices = choice[1]
      for (var j = 0, m = optgroupChoices.length; j < m; j++) {
        optgroupOptions.push(this.renderOption(selectedValuesLookup,
                                               optgroupChoices[j][0],
                                               optgroupChoices[j][1]))
      }
      options.push(React.DOM.optgroup({label: choice[0]}, optgroupOptions))
    }
    else {
      options.push(this.renderOption(selectedValuesLookup,
                                     choice[0],
                                     choice[1]))
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
, validation: {event: 'onChange'}
})

/**
 * Renders the widget.
 * @param {String} name the field name.
 * @param {Array} selectedValues the values of options which should be marked as
 *   selected, or null if no values are selected - these will be normalised to
 *   Strings for comparison with choice values.
 * @param {Object} [kwargs] additional rendering options.
 * @return a <select> element which allows multiple selections.
 */
SelectMultiple.prototype.render = function(name, selectedValues, kwargs) {
  kwargs = object.extend({choices: []}, kwargs)
  if (selectedValues === null) {
    selectedValues = []
  }
  if (!is.Array(selectedValues)) {
    selectedValues = [selectedValues]
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {name: name,
                                                  multiple: 'multiple'})
  var options = this.renderOptions(kwargs.choices, selectedValues)
  var valueAttr = (kwargs.controlled ? 'value' : 'defaultValue')
  finalAttrs[valueAttr] = selectedValues
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
  if (object.hasOwn(data, name) && data[name] != null) {
    return [].concat(data[name])
  }
  return null
}

/**
 * An object used by ChoiceFieldRenderer that represents a single
 * <input>.
 */
var ChoiceInput = SubWidget.extend({
  constructor: function ChoiceInput(name, value, attrs, controlled, choice, index) {
    this.name = name
    this.value = value
    this.attrs = attrs
    this.controlled = controlled
    this.choiceValue = ''+choice[0]
    this.choiceLabel = ''+choice[1]
    this.index = index
    if (typeof this.attrs.id != 'undefined') {
      this.attrs.id += '_' + this.index
    }
    if (typeof this.attrs.key != 'undefined') {
      this.attrs.key += '_' + this.index
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
  var finalAttrs = Widget.prototype.buildAttrs.call(this, {}, {
    type: this.inputType, name: this.name, value: this.choiceValue
  })
  var checkedAttr = (this.controlled ? 'checked' : 'defaultChecked')
  finalAttrs[checkedAttr] = this.isChecked()
  return React.DOM.input(finalAttrs)
}

ChoiceInput.prototype.idForLabel = function() {
  return object.get(this.attrs, 'id', '')
}

var RadioChoiceInput = ChoiceInput.extend({
  constructor: function RadioChoiceInput(name, value, attrs, controlled, choice, index) {
    if (!(this instanceof RadioChoiceInput)) {
      return new RadioChoiceInput(name, value, attrs, controlled, choice, index)
    }
    ChoiceInput.call(this, name, value, attrs, controlled, choice, index)
    this.value = ''+this.value
  }
, inputType: 'radio'
})

var CheckboxChoiceInput = ChoiceInput.extend({
  constructor: function CheckboxChoiceInput(name, value, attrs, controlled, choice, index) {
    if (!(this instanceof CheckboxChoiceInput)) {
      return new CheckboxChoiceInput(name, value, attrs, controlled, choice, index)
    }
    if (!is.Array(value)) {
      value = [value]
    }
    ChoiceInput.call(this, name, value, attrs, controlled, choice, index)
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
 * @param {boolean} controlled
 * @param {Array} choices
 */
var ChoiceFieldRenderer = Concur.extend({
  constructor: function ChoiceFieldRenderer(name, value, attrs, controlled, choices) {
    if (!(this instanceof ChoiceFieldRenderer)) {
      return new ChoiceFieldRenderer(name, value, attrs, controlled, choices)
    }
    this.name = name
    this.value = value
    this.attrs = attrs
    this.controlled = controlled
    this.choices = choices
  }
, choiceInputConstructor: null
})

ChoiceFieldRenderer.prototype.choiceInputs = function() {
  var inputs = []
  for (var i = 0, l = this.choices.length; i < l; i++) {
    inputs.push(this.choiceInputConstructor(this.name, this.value,
                                            object.extend({}, this.attrs),
                                            this.controlled,
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
                                     this.controlled,
                                     this.choices[i], i)
  }

/**
 * Outputs a <ul> for this set of choice fields.
 * If an id was given to the field, it is applied to the <ul> (each item in the
 * list will get an id of `$id_$i`).
 */
ChoiceFieldRenderer.prototype.render = function() {
  var id = object.get(this.attrs, 'id', null)
  var key = object.pop(this.attrs, 'key', null)
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
      if (key) {
        attrsPlus.key += '_' + i
      }
      var subRenderer = ChoiceFieldRenderer(this.name, this.value,
                                            attrsPlus,
                                            this.controlled,
                                            choiceLabel)
      subRenderer.choiceInputConstructor = this.choiceInputConstructor
      items.push(React.DOM.li(null, choiceValue, subRenderer.render()))
    }
    else {
      var w = this.choiceInputConstructor(this.name, this.value,
                                          object.extend({}, this.attrs),
                                          this.controlled,
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
  constructor: function RadioFieldRenderer(name, value, attrs, controlled, choices) {
    if (!(this instanceof RadioFieldRenderer)) {
      return new RadioFieldRenderer(name, value, attrs, controlled, choices)
    }
    ChoiceFieldRenderer.apply(this, arguments)
  }
, choiceInputConstructor: RadioChoiceInput
})

var CheckboxFieldRenderer = ChoiceFieldRenderer.extend({
  constructor: function CheckboxFieldRenderer(name, value, attrs, controlled, choices) {
    if (!(this instanceof CheckboxFieldRenderer)) {
      return new CheckboxFieldRenderer(name, value, attrs, controlled, choices)
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
, validation: {event: 'onChange'}
})

RendererMixin.prototype.subWidgets = function(name, value, kwargs) {
  return this.getRenderer(name, value, kwargs).choiceInputs()
}

/**
 * @return an instance of the renderer to be used to render this widget.
 */
RendererMixin.prototype.getRenderer = function(name, value, kwargs) {
  kwargs = object.extend({choices: [], controlled: false}, kwargs)
  if (value === null) {
    value = this._emptyValue
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs)
  var choices = this.choices.concat(kwargs.choices)
  return new this.renderer(name, value, finalAttrs, kwargs.controlled, choices)
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
 * @param {(Array.<*>|*)} value a list of values, or a normal value (e.g., a String that has
 *   been "compressed" from a list of values).
 * @param {Object=} kwargs]additional rendering options
 * @return a rendered collection of widgets.
 */
MultiWidget.prototype.render = function(name, value, kwargs) {
  kwargs = object.extend({}, kwargs)
  if (!(is.Array(value))) {
    value = this.decompress(value)
  }
  var finalAttrs = this.buildAttrs(kwargs.attrs, {'data-newforms-field': name})
  var id = object.get(finalAttrs, 'id', null)
  var key = object.get(finalAttrs, 'key', null)
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
    if (key) {
      finalAttrs.key = key + '_' + i
    }
    renderedWidgets.push(
        widget.render(name + '_' + i, widgetValue, {attrs: finalAttrs,
                                                    controlled: kwargs.controlled}))
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

},{"./env":1,"./formats":3,"./util":7,"Concur":9,"isomorph/is":13,"isomorph/object":14,"isomorph/time":15}],9:[function(_dereq_,module,exports){
'use strict';

var is = _dereq_('isomorph/is')
var object = _dereq_('isomorph/object')

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
function inheritFrom(parentConstructor, childConstructor, prototypeProps, constructorProps) {
  // Create a child constructor if one wasn't given
  if (childConstructor == null) {
    childConstructor = function() {
      parentConstructor.apply(this, arguments)
    }
  }

  // Make sure the new prototype has the correct constructor set up
  prototypeProps.constructor = childConstructor

  // Base constructors should only have the properties they're defined with
  if (parentConstructor !== Concur) {
    // Inherit the parent's prototype
    object.inherits(childConstructor, parentConstructor)
    childConstructor.__super__ = parentConstructor.prototype
  }

  // Add prototype properties - this is why we took a copy of the child
  // constructor reference in extend() - if a .constructor had been passed as a
  // __mixin__ and overitten prototypeProps.constructor, these properties would
  // be getting set on the mixed-in constructor's prototype.
  object.extend(childConstructor.prototype, prototypeProps)

  // Add constructor properties
  object.extend(childConstructor, constructorProps)

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
  // Ensure we have prop objects to work with
  prototypeProps = prototypeProps || {}
  constructorProps = constructorProps || {}

  // If the constructor being inherited from has a __meta__ function somewhere
  // in its prototype chain, call it to customise prototype and constructor
  // properties before they're used to set up the new constructor's prototype.
  if (typeof this.prototype.__meta__ != 'undefined') {
    this.prototype.__meta__(prototypeProps, constructorProps)
  }

  // Any child constructor passed in should take precedence - grab a reference
  // to it befoer we apply any mixins.
  var childConstructor = object.get(prototypeProps, 'constructor', null)

  // If any mixins are specified, mix them into the property objects
  if (object.hasOwn(prototypeProps, '__mixin__')) {
    prototypeProps = applyMixins(prototypeProps)
  }
  if (object.hasOwn(constructorProps, '__mixin__')) {
    constructorProps = applyMixins(constructorProps)
  }

  // Set up the new child constructor and its prototype
  childConstructor = inheritFrom(this,
                                 childConstructor,
                                 prototypeProps,
                                 constructorProps)

  // Pass on the extend function for extension in turn
  childConstructor.extend = this.extend

  // Expose the inheritance chain for programmatic access
  childConstructor.__mro__ = [childConstructor].concat(this.__mro__)

  return childConstructor
}

},{"isomorph/is":13,"isomorph/object":14}],10:[function(_dereq_,module,exports){
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

},{}],11:[function(_dereq_,module,exports){
'use strict';

var is = _dereq_('./is')

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

},{"./is":13}],12:[function(_dereq_,module,exports){
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

},{}],13:[function(_dereq_,module,exports){
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

},{}],14:[function(_dereq_,module,exports){
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

},{}],15:[function(_dereq_,module,exports){
'use strict';

var is = _dereq_('./is')

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

},{"./is":13}],16:[function(_dereq_,module,exports){
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

},{}],17:[function(_dereq_,module,exports){
'use strict';

var Concur = _dereq_('Concur')
var format = _dereq_('isomorph/format').formatObj
var is = _dereq_('isomorph/is')
var object = _dereq_('isomorph/object')

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

},{"Concur":9,"isomorph/format":12,"isomorph/is":13,"isomorph/object":14}],18:[function(_dereq_,module,exports){
'use strict';

var object = _dereq_('isomorph/object')

var errors = _dereq_('./errors')

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
  var validateIPv4Address = _dereq_('./validators').validateIPv4Address

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

},{"./errors":17,"./validators":19,"isomorph/object":14}],19:[function(_dereq_,module,exports){
'use strict';

var Concur = _dereq_('Concur')
var is = _dereq_('isomorph/is')
var object = _dereq_('isomorph/object')
var punycode = _dereq_('punycode')
var url = _dereq_('isomorph/url')

var errors = _dereq_('./errors')
var ipv6 = _dereq_('./ipv6')

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

},{"./errors":17,"./ipv6":18,"Concur":9,"isomorph/is":13,"isomorph/object":14,"isomorph/url":16,"punycode":10}]},{},[6])
(6)
});