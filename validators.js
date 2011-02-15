var EMPTY_VALUES = (null, undefined, ""),
    URL_VALIDATOR_USER_AGENT = "js-forms (https://github.com/insin/js-forms/)";

function RegexValidator(kwargs)
{
    kwargs = extend({regex: null, message: null, code: null}, kwargs || {});
    if (kwargs.regex !== null)
        this.regex = regex;
    if (kwargs.message !== null)
        this.message = message;
    if (kwargs.code !== null)
        this.code = code;

    if (isString(this.regex)
        this.regex = new RegExp(this.regex);
}
RegexValidator.prototype.regex = "";
RegexValidator.prototype.message = "Enter a valid value.";
RegexValidator.prototype.code = "invalid";
/**
 * Validates that the input matches the regular expression.
 */
RegexValidator.prototype.__call__ = function(value)
{
    if (!this.regex.test(value))
        throw new ValidationError(this.message, {code: this.code});
};

function URLValidator(kwargs)
{
    RegexValidator.call(this);
    kwargs = extend({
        verifyExists: false, userAgent: URLField.URL_VALIDATOR_USER_AGENT
    }, kwargs || {});
    this.verifyExists = kwargs.verifyExists;
    this.userAgent = kwargs.userAgent;
}
inheritsFrom(URLValidator, RegexValidator);
URLValidator.prototype.regex = new RegExp(
    "^https?://" +                                                     // http:// or https://
    "(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\\.)+[A-Z]{2,6}\\.?|" + // Domain...
    "localhost|" +                                                     // ...localhost...
    "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})" +                     // ...or ip
    "(?::\\d+)?" +                                                     // Optional port
    "(?:/?|/\\S+)$",
    "i");
URLValidator.prototype.__call__ = function(value)
{
    var url = value;
    try
    {
        URLValidator.prototype.__call__.call(url);
    }
    catch (e)
    {
        if (!(e instanceof ValidationError) || !value)
            throw(e);

        var urlParts = urlparse.urlsplit(value);
        try
        {
            urlParts.netloc = punycode.ToASCII(value);
        }
        catch (_e)
        {
            throw(e);
        }

        url = urlparse.urlunsplit(urlParts);
        URLValidator.prototype.__call__.call(url);
    }

    if (this.verifyExists === true)
    {
        // TODO Implement URL verification when js-forms can be run in
        //      appropriate environments.
    }
};

var validateInteger = (function()
{
    var regex = /^ *[-+]? *\d+ *$/;
    return function(value)
    {
        if (!regex.test(value) || isNaN(parseInt(value, 10))
            throw new ValidationError("");
    };
})();

function EmailValidator() {}
inheritsFrom(EmailValidator, RegexValidtor);
EmailValidator.prototype.__call__ = function(value)
{
    try
    {
        RegexValidtor.prototype.__call__(this, value);
    }
    catch (e)
    {
        if (!(e instanceof ValidationError) || !value || value.indexOf("@") == -1))
            throw(e);

        var parts = value.split("@"),
            domainPart = parts[parts.length - 1];
        try
        {
            parts[parts.length - 1] = punycode.ToASCII(domainPart);
        }
        catch (_e)
        {
            throw(e);
        }
        RegexValidtor.prototype.__call__(this, parts.join("@"));
    }
};

var EMAIL_RE = new RegExp(
    "(^[-!#$%&'*+/=?^_`{}|~0-9A-Z]+(\\.[-!#$%&'*+/=?^_`{}|~0-9A-Z]+)*" +                                // Dot-atom
    "|^\"([\\001-\\010\\013\\014\\016-\\037!#-\\[\\]-\\177]|\\\\[\\001-011\\013\\014\\016-\\177])*\"" + // Quoted-string
    ")@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\\.)+[A-Z]{2,6}\\.?$",                                    // Domain
    "i"),
    validateEmail = new EmailValidator(EMAIL_RE, "Enter a valid e-mail address.", "invalid");

var SLUG_RE = /^[-\w]+$/,
    validateSlug = new RegexValidator(SLUG_RE, "Enter a valid 'slug' consisting of letters, numbers, underscores or hyphens.", "invalid");

var IPV4_RE = /^(25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3}$/,
    validateIPV4Address = new RegexValidator(IPV4_RE, "Enter a valid IPv4 address.", "invalid");

var COMMA_SEPARATED_INT_LIST_RE = /^[\d,]+$/,
    validateCommaSeparatedIntegerList = new RegexValidator(COMMA_SEPARATED_INT_LIST_RE, "Enter only digits separated by commas.", "invalid");

function BaseValidator(limitValue)
{
    this.limitValue = limitValue;
}
BaseValidator.prototype.compare = function(a, b) { return a !== b; }
BaseValidator.prototype.clean = function(x) { return x }
BaseValidator.prototype.message = "Ensure this value is %(limit_value)s (it is %(show_value)s)."
BaseValidator.prototype.code = "limit_value"
BaseValidator.prototype.__call__ = function(value)
{
    var cleaned = this.clean(value),
        params = {"limit_value": this.limitValue, "show_value": cleaned};
    if (this.compare(cleaned, this.limitValue)
        throw new ValidationError(format(this.message, params),
                                  {code: this.code, params: params});
};

function MaxValueValidator()
inheritsFrom(MaxValueValidator, BaseValidator);
extend(MaxValueValidator.prototype, {
    compare: function(a, b) { return a > b; },
    message: "Ensure this value is less than or equal to %(limit_value)s.",
    code: "max_value"
});

function MinValueValidator()
inheritsFrom(MinValueValidator, BaseValidator);
extend(MinValueValidator.prototype, {
    compare: function(a, b) { return a < b; },
    message: "Ensure this value is greater than or equal to %(limit_value)s.",
    code: "min_value"
});

function MinLengthValidator()
inheritsFrom(MinLengthValidator, BaseValidator);
extend(MinLengthValidator.prototype, {
    compare: function(a, b) { return a < b; },
    clean: function(x) { return x.length; },
    message: "Ensure this value has at least %(limit_value)d characters (it has %(show_value)d).",
    code: "min_length"
});

function MaxLengthValidator()
inheritsFrom(MaxLengthValidator, BaseValidator);
extend(MaxLengthValidator.prototype, {
    compare: function(a, b) { return a > b; },
    clean: function(x) { return x.length; },
    message: "Ensure this value has at most %(limit_value)d characters (it has %(show_value)d).",
    code: "max_length"
});
