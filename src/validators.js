var Concur = require('Concur')
  , is = require('isomorph/lib/is')
  , format = require('isomorph/lib/format').formatObj

var util = require('./util')
  , ValidationError = util.ValidationError

var EMPTY_VALUES = [null, undefined, '']

var isEmptyValue = function(value) {
  for (var i = 0, l = EMPTY_VALUES.length; i < l; i++) {
    if (value === EMPTY_VALUES[i]) {
      return true
    }
  }
  return false
}

var EMAIL_RE = new RegExp(
      "(^[-!#$%&'*+/=?^_`{}|~0-9A-Z]+(\\.[-!#$%&'*+/=?^_`{}|~0-9A-Z]+)*"                              // Dot-atom
    + '|^"([\\001-\\010\\013\\014\\016-\\037!#-\\[\\]-\\177]|\\\\[\\001-011\\013\\014\\016-\\177])*"' // Quoted-string
    + ')@((?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\\.)+[A-Z]{2,6}\\.?$)'                               // Domain
    + '|\\[(25[0-5]|2[0-4]\\d|[0-1]?\\d?\\d)(\\.(25[0-5]|2[0-4]\\d|[0-1]?\\d?\\d)){3}\\]$'            // Literal form, ipv4 address (SMTP 4.1.3)
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
, __call__: function(value) {
    var url = value
    try {
      RegexValidator.prototype.__call__.call(this, url)
    }
    catch (e) {
      if (!(e instanceof ValidationError) || !value) {
        throw e
      }
      // TODO Implement retrying validation after IDNA encoding
      throw e
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
          value.indexOf("@") == -1) {
        throw e
      }
      // TODO Implement retrying validation after IDNA encoding
      throw e
    }
  }
})

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
var validateIPV4Address =
    RegexValidator(IPV4_RE,
      'Enter a valid IPv4 address.',
      'invalid')

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
, RegexValidator: RegexValidator
, URLValidator: URLValidator
, EmailValidator: EmailValidator
, validateEmail: validateEmail
, validateSlug: validateSlug
, validateIPV4Address: validateIPV4Address
, validateCommaSeparatedIntegerList: validateCommaSeparatedIntegerList
, BaseValidator: BaseValidator
, MaxValueValidator: MaxValueValidator
, MinValueValidator: MinValueValidator
, MaxLengthValidator: MaxLengthValidator
, MinLengthValidator: MinLengthValidator
}
