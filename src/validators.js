var EMPTY_VALUES = [null, undefined, ""],
    URL_VALIDATOR_USER_AGENT = "newforms (https://github.com/insin/newforms/)";

/**
 * Validates that input matches a regular expression.
 */
function RegexValidator(regex, message, code)
{
    if (regex)
        this.regex = regex;
    if (message)
        this.message = message;
    if (code)
        this.code = code;

    if (isString(this.regex))
        this.regex = new RegExp(this.regex);
}
RegexValidator.prototype.regex = "";
RegexValidator.prototype.message = "Enter a valid value.";
RegexValidator.prototype.code = "invalid";

RegexValidator.prototype.__call__ = function(value)
{
    if (!this.regex.test(value))
        throw new ValidationError(this.message, {code: this.code});
};

/**
 * Validates that input looks like a valid URL.
 */
function URLValidator(kwargs)
{
    RegexValidator.call(this);
    kwargs = extend({
        verifyExists: false, validatorUserAgent: URL_VALIDATOR_USER_AGENT
    }, kwargs || {});
    this.verifyExists = kwargs.verifyExists;
    this.userAgent = kwargs.validatorUserAgent;
}
inheritFrom(URLValidator, RegexValidator);
URLValidator.prototype.regex = new RegExp(
    // http:// or https://
    '^(?:http|ftp)s?://' +
    // Domain...
    '(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\\.)+' +
        '(?:[A-Z]{2,6}\\.?|[A-Z0-9-]{2,}\\.?)|' +
    // localhost...
    'localhost|' + // localhost...
    // ...or IP
    '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})' +
    // Optional port
    '(?::\\d+)?' +
    '(?:/?|[/?]\\S+)$',
    "i");

URLValidator.prototype.__call__ = function(value)
{
    var url = value;
    try
    {
        RegexValidator.prototype.__call__.call(this, url);
    }
    catch (e)
    {
        if (!(e instanceof ValidationError) || !value)
            throw e;

        // TODO Implement retrying validation after IDNA encoding
        throw e;
    }

    // TODO Plug in URL verification when newforms can run on the backend
    //if (this.verifyExists === true) {}
};

function EmailValidator(regex, message, code)
{
    RegexValidator.call(this, regex, message, code);
}
inheritFrom(EmailValidator, RegexValidator);

EmailValidator.prototype.__call__ = function(value)
{
    try
    {
        RegexValidator.prototype.__call__.call(this, value);
    }
    catch (e)
    {
        if (!(e instanceof ValidationError) || !value ||
            value.indexOf("@") == -1)
            throw e;

        // TODO Implement retrying validation after IDNA encoding
        throw e;
    }
};

var EMAIL_RE = new RegExp(
    // Dot-atom
    "(^[-!#$%&'*+/=?^_`{}|~0-9A-Z]+(\\.[-!#$%&'*+/=?^_`{}|~0-9A-Z]+)*" +
     // Quoted-string
    "|^\"([\\001-\\010\\013\\014\\016-\\037!#-\\[\\]-\\177]|" +
        "\\\\[\\001-011\\013\\014\\016-\\177])*\"" +
    // Domain
    ")@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\\.)+[A-Z]{2,6}\\.?$",
    "i"),
    /**
     * Validates that input looks like a valid e-mail address.
    */
    validateEmail = new EmailValidator(EMAIL_RE,
                                       "Enter a valid e-mail address.",
                                       "invalid");

var SLUG_RE = /^[-\w]+$/,
    /**
     * Validates that input is a valid slug.
     */
    validateSlug = new RegexValidator(SLUG_RE,
        "Enter a valid 'slug' consisting of letters, numbers, underscores or " +
        "hyphens.",
        "invalid");

var IPV4_RE =
    /^(25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3}$/,
    /**
     * Validates that input is a valid IPv4 address.
     */
    validateIPV4Address = new RegexValidator(IPV4_RE,
                                            "Enter a valid IPv4 address.",
                                            "invalid");

var COMMA_SEPARATED_INT_LIST_RE = /^[\d,]+$/,
    /**
     * Validates that input is a comma-separated list of integers.
     */
    validateCommaSeparatedIntegerList =
        new RegexValidator(COMMA_SEPARATED_INT_LIST_RE,
                           "Enter only digits separated by commas.",
                           "invalid");

/**
 * Base for validators which compare input against a given value.
 */
function BaseValidator(limitValue)
{
    this.limitValue = limitValue;
}
BaseValidator.prototype.compare = function(a, b) { return a !== b; };
BaseValidator.prototype.clean = function(x) { return x };
BaseValidator.prototype.message =
    "Ensure this value is %(limitValue)s (it is %(showValue)s).";
BaseValidator.prototype.code = "limitValue";

BaseValidator.prototype.__call__ = function(value)
{
    var cleaned = this.clean(value),
        params = {"limitValue": this.limitValue, "showValue": cleaned};
    if (this.compare(cleaned, this.limitValue))
        throw new ValidationError(format(this.message, params),
                                  {code: this.code, params: params});
};

/**
 * Validates that input is less than or equal to a given value.
 */
function MaxValueValidator(limitValue)
{
    BaseValidator.call(this, limitValue);
}
inheritFrom(MaxValueValidator, BaseValidator);
extend(MaxValueValidator.prototype, {
    compare: function(a, b) { return a > b; },
    message: "Ensure this value is less than or equal to %(limitValue)s.",
    code: "maxValue"
});

/**
 * Validates that input is greater than or equal to a given value.
 */
function MinValueValidator(limitValue)
{
BaseValidator.call(this, limitValue);
}
inheritFrom(MinValueValidator, BaseValidator);
extend(MinValueValidator.prototype, {
    compare: function(a, b) { return a < b; },
    message: "Ensure this value is greater than or equal to %(limitValue)s.",
    code: "minValue"
});

/**
 * Validates that input is at least a given length.
 */
function MinLengthValidator(limitValue)
{
    BaseValidator.call(this, limitValue);
}
inheritFrom(MinLengthValidator, BaseValidator);
extend(MinLengthValidator.prototype, {
    compare: function(a, b) { return a < b; },
    clean: function(x) { return x.length; },
    message:
        "Ensure this value has at least %(limitValue)d characters (it has " +
        "%(showValue)d).",
    code: "minLength"
});

/**
 * Validates that input is at most a given length;
 */
function MaxLengthValidator(limitValue)
{
    BaseValidator.call(this, limitValue);
}
inheritFrom(MaxLengthValidator, BaseValidator);
extend(MaxLengthValidator.prototype, {
    compare: function(a, b) { return a > b; },
    clean: function(x) { return x.length; },
    message:
        "Ensure this value has at most %(limitValue)d characters (it has " +
        "%(showValue)d).",
    code: "maxLength"
});
