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
    if (!(this instanceof Field)) return new CharField(kwargs)
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
 * <code>maxlength</code> attribute to text input fields.
 *
 * @param {Widget} widget the widget being used to render this field's value.
 *
 * @return additional attributes which should be added to the given widget.
 */
CharField.prototype.widgetAttrs = function(widget) {
  var attrs = {}
  if (this.maxLength !== null && (widget instanceof widgets.TextInput ||
                                  widget instanceof widgets.PasswordInput)) {
    attrs.maxlength = this.maxLength.toString()
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
    if (!(this instanceof Field)) return new IntegerField(kwargs)
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
    if (!(this instanceof Field)) return new FloatField(kwargs)
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
    if (!(this instanceof Field)) return new DecimalField(kwargs)
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
    if (!(this instanceof Field)) return new DateField(kwargs)
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
    if (!(this instanceof Field)) return new TimeField(kwargs)
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
    if (!(this instanceof Field)) return new DateTimeField(kwargs)
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
    if (!(this instanceof Field)) return new RegexField(regex, kwargs)
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
    if (!(this instanceof Field)) return new EmailField(kwargs)
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
    if (!(this instanceof Field)) return new FileField(kwargs)
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
    if (!(this instanceof Field)) return new ImageField(kwargs)
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
    if (!(this instanceof Field)) return new URLField(kwargs)
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
    if (!(this instanceof Field)) return new BooleanField(kwargs)
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
    if (!(this instanceof Field)) return new NullBooleanField(kwargs)
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
    if (!(this instanceof Field)) return new ChoiceField(kwargs)
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
    if (!(this instanceof Field)) return new TypedChoiceField(kwargs)
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
    if (!(this instanceof Field)) return new MultipleChoiceField(kwargs)
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
    if (!(this instanceof Field)) return new TypedMultipleChoiceField(kwargs)
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
    if (!(this instanceof Field)) return new FilePathField(path, kwargs)
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
    if (!(this instanceof Field)) return new ComboField(kwargs)
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
    if (!(this instanceof Field)) return new MultiValueField(kwargs)
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

  for (var i = 0, l = this.fields.length; i < l; i++) {
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
    if (!(this instanceof Field)) return new SplitDateTimeField(kwargs)
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
    if (!(this instanceof Field)) return new IPAddressField(kwargs)
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
    if (!(this instanceof Field)) return new GenericIPAddressField(kwargs)
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
    if (!(this instanceof Field)) return new SlugField(kwargs)
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
