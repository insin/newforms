/**
 * @fileOverview Form Fields, which validate and normalise (or "clean") data.
 */

/**
 * An object that is responsible for doing validation and normalisation, or
 * "cleaning", for example: an {@link EmailField} makes sure its data is a valid
 * e-mail address and makes sure that acceptable "blank" values all have the
 * same representation.
 *
 * @param {Object} [kwargs] configuration options.
 * @config {Boolean} [required] determines if the field is required - defaults
 *                              to <code>true</code>.
 * @config {Widget} [widget] overrides the widget used to render the field - if
 *                           not provided, the field's default will be used.
 * @config {String} [label] the label to be displayed for the field - if not
 *                          provided, will be generated from the field's name.
 * @config [initial] an initial value for the field to be used if none is
 *                   specified by the field's form.
 * @config {String} [helpText] help text for the field.
 * @config {Object} [errorMessages] custom error messages for the field.
 * @constructor
 */
function Field(kwargs)
{
    kwargs = extendObject({
        required: true, widget: null, label: null, initial: null,
        helpText: null, errorMessages: null
    }, kwargs || {});
    this.required = kwargs.required;
    this.label = kwargs.label;
    this.initial = kwargs.initial;
    this.helpText = kwargs.helpText || "";

    var widget = kwargs.widget || new this.defaultWidget();
    // Hook into this.widgetAttrs() for any Field-specific HTML attributes.
    extendObject(widget.attrs, this.widgetAttrs(widget));
    this.widget = widget;

    // Take our version of the creation counter, then increment it
    this.creationCounter = Field.creationCounter;
    Field.creationCounter += 1;

    // Copy error messages for this instance into a new object
    this.errorMessages =
        extendObject({}, this.defaultErrorMessages, kwargs.errorMessages || {});
}

/**
 * Values which will, if given to <code>clean</code>, trigger the
 * <code>this.required</code> check.
 */
Field.EMPTY_VALUES = [null, ''];

/**
 * Tracks each time a Field instance is created; used to retain order.
 */
Field.creationCounter = 0;

/**
 * Default widget to use when rendering this type of Field.
 */
Field.prototype.defaultWidget = TextInput;

/**
 * Default widget to use when rendering this type of field as hidden.
 */
Field.prototype.hiddenWidget = HiddenInput;

/**
 * Default error messages.
 */
Field.prototype.defaultErrorMessages =
{
    required: "This field is required.",
    invalid: "Enter a valid value."
};

/**
 * Validates the given value and returns its "cleaned" value as an appropriate
 * JavaScript object.
 *
 * @param {String} value the value to be validated.
 *
 * @return a valid string.
 * @type String
 */
Field.prototype.clean = function(value)
{
    if (this.required && contains(Field.EMPTY_VALUES, value))
    {
        throw new ValidationError(this.errorMessages.required);
    }
    return value;
};

/**
 * Specifies HTML attributes which should be added to a given widget for this
 * field.
 *
 * @param {Widget} widget a widget
 * @returns an object specifying HTML attributes that should be added to the
 *          given widget, based on this field.
 * @type Object
 */
Field.prototype.widgetAttrs = function(widget)
{
    return {};
};

/**
 * Validates that its input is a valid string.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Number} [maxLength] a maximum valid length for the input string.
 * @config {Number} [minLength] a minimum valid length for the input string.
 * @constructor
 * @augments Field
 */
function CharField(kwargs)
{
    kwargs = extendObject({
        maxLength: null, minLength: null
    }, kwargs || {});
    this.maxLength = kwargs.maxLength;
    this.minLength = kwargs.minLength;
    Field.call(this, kwargs);
}

CharField.prototype = new Field();
CharField.prototype.defaultErrorMessages =
    extendObject({}, CharField.prototype.defaultErrorMessages, {
        maxLength: "Ensure this value has at most %(max)s characters (it has %(length)s).",
        minLength: "Ensure this value has at least %(min)s characters (it has %(length)s)."
    });

/**
 * Validates max length and min length of the input, if configured to do so.
 *
 * @param {String} value the value to be validated.
 *
 * @return a valid string, which will be <code>""</code> for empty values.
 * @type String
 */
CharField.prototype.clean = function(value)
{
    Field.prototype.clean.call(this, value);

    if (contains(Field.EMPTY_VALUES, value))
    {
        return "";
    }

    value = "" + value;

    if (this.maxLength !== null && value.length > this.maxLength)
    {
        throw new ValidationError(
            formatString(this.errorMessages.maxLength,
                         {max: this.maxLength, length: value.length}));
    }

    if (this.minLength !== null && value.length < this.minLength)
    {
        throw new ValidationError(
            formatString(this.errorMessages.minLength,
                         {min: this.minLength, length: value.length}));
    }

    return value;
};

/**
 * If this field is configured to enforce a maximum length, adds a suitable
 * <code>maxlength</code> attribute to text input fields.
 *
 * @param {Widget} widget the widget being used to render this field's value.
 *
 * @return additional attributes which should be added to the given widget.
 * @type Object
 */
CharField.prototype.widgetAttrs = function(widget)
{
    var attrs = {};
    if (this.maxLength !== null && (widget instanceof TextInput ||
                                    widget instanceof PasswordInput))
    {
        attrs.maxlength = this.maxLength.toString();
    }
    return attrs;
};

/**
 * Validates that its input is a valid integer.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Number} [maxValue] a maximum value for the input.
 * @config {Number} [minValue] a minimum value for the input.
 * @constructor
 * @augments Field
 */
function IntegerField(kwargs)
{
    kwargs = extendObject({
        maxValue: null, minValue: null
    }, kwargs || {});
    this.maxValue = kwargs.maxValue;
    this.minValue = kwargs.minValue;
    Field.call(this, kwargs);
}

/**
 * Integer validation regular expression.
 */
IntegerField.INTEGER_REGEXP = /^ *[-+]? *\d+ *$/;

IntegerField.prototype = new Field();
IntegerField.prototype.defaultErrorMessages =
    extendObject({}, IntegerField.prototype.defaultErrorMessages, {
        invalid: "Enter a whole number.",
        maxValue: "Ensure this value is less than or equal to %(maxValue)s.",
        minValue: "Ensure this value is greater than or equal to %(minValue)s."
    });

/**
 * Validates that the given value is a valid integer.
 *
 * @param value the value to be validated.
 *
 * @return a valid integer, or <code>null</code> for empty values.
 * @type Number
 */
IntegerField.prototype.clean = function(value)
{
    Field.prototype.clean.call(this, value);

    if (contains(Field.EMPTY_VALUES, value))
    {
        return null;
    }

    if (!IntegerField.INTEGER_REGEXP.test(value))
    {
        throw new ValidationError(this.errorMessages.invalid);
    }

    value = parseInt(value, 10);
    if (this.maxValue !== null && value > this.maxValue)
    {
        throw new ValidationError(formatString(this.errorMessages.maxValue,
                                               {maxValue: this.maxValue}));
    }
    if (this.minValue !== null && value < this.minValue)
    {
        throw new ValidationError(formatString(this.errorMessages.minValue,
                                               {minValue: this.minValue}));
    }
    return value;
};

/**
 * Validates that its input is a valid float.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Number} [maxValue] a maximum value for the input.
 * @config {Number} [minValue] a minimum value for the input.
 * @constructor
 * @augments Field
 */
function FloatField(kwargs)
{
    kwargs = extendObject({
        maxValue: null, minValue: null
    }, kwargs || {});
    this.maxValue = kwargs.maxValue;
    this.minValue = kwargs.minValue;
    Field.call(this, kwargs);
}

/**
 * Float validation regular expression.
 */
FloatField.FLOAT_REGEXP = /^ *[-+]? *\d+(?:\.\d+)? *$/;

FloatField.prototype = new Field();
FloatField.prototype.defaultErrorMessages =
    extendObject({}, FloatField.prototype.defaultErrorMessages, {
        invalid: "Enter a number.",
        maxValue: "Ensure this value is less than or equal to %(maxValue)s.",
        minValue: "Ensure this value is greater than or equal to %(minValue)s.",
    });

/**
 * Validates that the given value is a valid float.
 *
 * @param value the value to be validated.
 *
 * @return a valid <code>float</code>, or <code>null</code> for empty values.
 * @type Number
 */
FloatField.prototype.clean = function(value)
{
    Field.prototype.clean.call(this, value);

    if (contains(Field.EMPTY_VALUES, value))
    {
        return null;
    }

    if (!FloatField.FLOAT_REGEXP.test(value))
    {
        throw new ValidationError(this.errorMessages.invalid);
    }

    value = parseFloat(value);
    if (this.maxValue !== null && value > this.maxValue)
    {
        throw new ValidationError(formatString(this.errorMessages.maxValue,
                                               {maxValue: this.maxValue}));
    }
    if (this.minValue !== null && value < this.minValue)
    {
        throw new ValidationError(formatString(this.errorMessages.minValue,
                                               {minValue: this.minValue}));
    }
    return value;
};

/**
 * Validates that its input is a decimal number.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Number} maxValue a maximum value for the input.
 * @config {Number} minValue a minimum value for the input.
 * @config {Number} maxDigits the maximum number of digits the input may
 *                            contain.
 * @config {Number} decimalPlaces the maximum number of decimal places the input
 *                                may contain.
 * @constructor
 * @augments Field
 */
function DecimalField(kwargs)
{
    kwargs = extendObject({
      maxValue: null, minValue: null, maxDigits: null, decimalPlaces: null
    }, kwargs || {})
    this.maxValue = kwargs.maxValue;
    this.minValue = kwargs.minValue;
    this.maxDigits = kwargs.maxDigits;
    this.decimalPlaces = kwargs.decimalPlaces;
    Field.call(this, kwargs);
}

/**
 * Decimal validation regular expression.
 */
DecimalField.DECIMAL_REGEXP = /^ *[-+]? *(?:\d+(?:\.\d+)?|(?:\d+)?\.\d+) *$/;

DecimalField.prototype = new Field();
DecimalField.prototype.defaultErrorMessages =
    extendObject({}, DecimalField.prototype.defaultErrorMessages, {
        invalid: "Enter a number.",
        maxValue: "Ensure this value is less than or equal to %(maxValue)s.",
        minValue: "Ensure this value is greater than or equal to %(minValue)s.",
        maxDigits: "Ensure that there are no more than %(maxDigits)s digits in total.",
        maxDecimalPlaces: "Ensure that there are no more than %(maxDecimalPlaces)s decimal places.",
        maxWholeDigits: "Ensure that there are no more than %(maxWholeDigits)s digits before the decimal point."
    });

/**
 * In lieu of a built-in Decimal type for JavaScript, this method casts to a
 * float and uses that for validation. Validation of decimal attributes is
 * performed on a <code>String</code> representation of the input value, with
 * any leading sign trimmed.
 *
 * @param value the value to be validated.
 *
 * @return a valid <code>float</code>, or <code>null</code> for empty values.
 * @type Number
 */
DecimalField.prototype.clean = function(value)
{
    Field.prototype.clean.call(this, value);

    if (contains(Field.EMPTY_VALUES, value))
    {
        return null;
    }

    value = ("" + value).replace(/(^\s+|\s+$)/g, "");

    // TODO We should be attempting to create a Decimal object instead - are
    //      there any JavaScript equivalents?
    if (!DecimalField.DECIMAL_REGEXP.test(value))
    {
        throw new ValidationError(this.errorMessages.invalid);
    }

    var floatValue = parseFloat(value);
    // Django's DecimalField validates against a string representation of a
    // decimal.Decimal, in which:
    // * Any leading sign has been stripped
    if (value.charAt(0) == "+" || value.charAt(0) == "-")
    {
        value = value.substr(1);
    }
    // * Leading zeros have been stripped from digits before the decimal point,
    //   but trailing digits are retained after the decimal point.
    value = value.replace(/^0+/, "");
    // * Values which did not have a leading zero gain a single leading zero.
    if (value.charAt(0) == ".")
    {
        value = "0" + value;
    }
    var pieces = value.split(".");
    var decimals = (pieces.length == 2 ? pieces[1].length : 0);
    var digits = pieces[0].length;
    if (this.maxValue !== null && floatValue > this.maxValue)
    {
        throw new ValidationError(formatString(this.errorMessages.maxValue,
                                               {maxValue: this.maxValue}));
    }
    if (this.minValue !== null && floatValue < this.minValue)
    {
        throw new ValidationError(formatString(this.errorMessages.minValue,
                                               {minValue: this.minValue}));
    }
    if (this.maxDigits !== null && (digits + decimals) > this.maxDigits)
    {
        throw new ValidationError(formatString(this.errorMessages.maxDigits,
                                               {maxDigits: this.maxDigits}));
    }
    if (this.decimalPlaces !== null && decimals > this.decimalPlaces)
    {
        throw new ValidationError(formatString(this.errorMessages.maxDecimalPlaces,
                                               {maxDecimalPlaces: this.decimalPlaces}));
    }
    if (this.maxDigits !== null && this.decimalPlaces !== null && digits > (this.maxDigits - this.decimalPlaces))
    {
        throw new ValidationError(formatString(this.errorMessages.maxWholeDigits,
                                               {maxWholeDigits: (this.maxDigits - this.decimalPlaces)}));
    }
    return floatValue;
};

/**
 * Validates that its input is a date.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Array} [inputFormats] a list of {@link time.strptime} input formats
 *                                which are considered valid - if not provided,
 *                                {@link DateField.DEFAULT_DATE_INPUT_FORMATS}
 *                                will be used.
 * @constructor
 * @augments Field
 */
function DateField(kwargs)
{
    kwargs = extendObject({
        inputFormats: null,
    }, kwargs || {});
    Field.call(this, kwargs);
    this.inputFormats =
        kwargs.inputFormats || DateField.DEFAULT_DATE_INPUT_FORMATS;
}

/**
 * Default {@link time.strptime} input formats which are considered valid.
 */
DateField.DEFAULT_DATE_INPUT_FORMATS = [
    "%Y-%m-%d",              // "2006-10-25"
    "%m/%d/%Y", "%m/%d/%y",  // "10/25/2006", "10/25/06"
    "%b %d %Y", "%b %d, %Y", // "Oct 25 2006", "Oct 25, 2006"
    "%d %b %Y", "%d %b, %Y", // "25 Oct 2006", "25 Oct, 2006"
    "%B %d %Y", "%B %d, %Y", // "October 25 2006", "October 25, 2006"
    "%d %B %Y", "%d %B, %Y"  // "25 October 2006", "25 October, 2006"
];

DateField.prototype = new Field();
DateField.prototype.defaultErrorMessages =
    extendObject({}, DateField.prototype.defaultErrorMessages, {
        invalid: "Enter a valid date."
    });

/**
 * Validates that the input can be converted to a date.
 *
 * @param value the value to be validated.
 *
 * @return a <code>Date</code> object with its year, month and day attributes
 *         set, or <code>null</code> for empty values.
 * @type Date
 */
DateField.prototype.clean = function(value)
{
    Field.prototype.clean.call(this, value);

    if (contains(Field.EMPTY_VALUES, value))
    {
        return null;
    }

    if (value instanceof Date)
    {
        return new Date(value.getFullYear(),
                        value.getMonth(),
                        value.getDate());
    }

    for (var i = 0, l = this.inputFormats.length; i < l; i++)
    {
        try
        {
            var t = time.strptime(value, this.inputFormats[i]);
            return new Date(t[0], t[1] - 1, t[2]);
        }
        catch (e)
        {
            continue;
        }
    }

    throw new ValidationError(this.errorMessages.invalid);
};

/**
 * Validates that its input is a time.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Array} [inputFormats] a list of {@link time.strptime} input formats
 *                                which are considered valid - if not provided,
 *                                {@link TimeField.DEFAULT_TIME_INPUT_FORMATS}
 *                                will be used.
 * @constructor
 * @augments Field
 */
function TimeField(kwargs)
{
    kwargs = extendObject({
        inputFormats: null,
    }, kwargs || {});
    Field.call(this, kwargs);
    this.inputFormats =
        kwargs.inputFormats || TimeField.DEFAULT_TIME_INPUT_FORMATS;
}

/**
 * Default {@link time.strptime} input formats which are considered valid.
 */
TimeField.DEFAULT_TIME_INPUT_FORMATS = [
    "%H:%M:%S", // "14:30:59"
    "%H:%M"     // "14:30"
];

TimeField.prototype = new Field();
TimeField.prototype.defaultErrorMessages =
    extendObject({}, TimeField.prototype.defaultErrorMessages, {
        invalid: "Enter a valid time."
    });

/**
 * Validates that the input can be converted to a time.
 *
 * @param value the value to be validated.
 *
 * @return a <code>Date</code> object with its date set to 1st January, 1900 and
 *         its hour, minute and second attributes set to the given time, or
 *         <code>null</code> for empty values.
 * @type Date
 */
TimeField.prototype.clean = function(value)
{
    Field.prototype.clean.call(this, value);

    if (contains(Field.EMPTY_VALUES, value))
    {
        return null;
    }

    if (value instanceof Date)
    {
        return new Date(1900,
                        0,
                        1,
                        value.getHours(),
                        value.getMinutes(),
                        value.getSeconds());
    }

    for (var i = 0, l = this.inputFormats.length; i < l; i++)
    {
        try
        {
            var t = time.strptime(value, this.inputFormats[i]);
            return new Date(1900, 0, 1, t[3], t[4], t[5]);
        }
        catch (e)
        {
            continue;
        }
    }

    throw new ValidationError(this.errorMessages.invalid);
};

/**
 * Validates that its input is a date/time.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Array} [inputFormats] a list of {@link time.strptime} input formats
 *                                which are considered valid - if not provided,
 *                                {@link DateTimeField.DEFAULT_TIME_INPUT_FORMATS}
 *                                will be used.
 * @constructor
 * @augments Field
 */
function DateTimeField(kwargs)
{
    kwargs = extendObject({
        inputFormats: null,
    }, kwargs || {});
    Field.call(this, kwargs);
    this.inputFormats =
        kwargs.inputFormats || DateTimeField.DEFAULT_DATETIME_INPUT_FORMATS;
}

/**
 * Default {@link time.strptime} input formats which are considered valid.
 */
DateTimeField.DEFAULT_DATETIME_INPUT_FORMATS = [
    "%Y-%m-%d %H:%M:%S", // "2006-10-25 14:30:59"
    "%Y-%m-%d %H:%M",    // "2006-10-25 14:30"
    "%Y-%m-%d",          // "2006-10-25"
    "%m/%d/%Y %H:%M:%S", // "10/25/2006 14:30:59"
    "%m/%d/%Y %H:%M",    // "10/25/2006 14:30"
    "%m/%d/%Y",          // "10/25/2006"
    "%m/%d/%y %H:%M:%S", // "10/25/06 14:30:59"
    "%m/%d/%y %H:%M",    // "10/25/06 14:30"
    "%m/%d/%y"           // "10/25/06"
]

DateTimeField.prototype = new Field();
DateTimeField.prototype.defaultWidget = DateTimeInput;
DateTimeField.prototype.defaultErrorMessages =
    extendObject({}, DateTimeField.prototype.defaultErrorMessages, {
        invalid: "Enter a valid date/time."
    });

/**
 * Validates that the input can be converted to a date/time.
 *
 * @param value the value to be validated.
 *
 * @return a <code>Date</code> object, or <code>null</code> for empty values.
 * @type Date
 */
DateTimeField.prototype.clean = function(value)
{
    Field.prototype.clean.call(this, value);

    if (contains(Field.EMPTY_VALUES, value))
    {
        return null;
    }

    if (value instanceof Date)
    {
        return value;
    }

    if (value instanceof Array)
    {
        // Input comes from a SplitDateTimeWidget, for example, so it's two
        // components: date and time.
        if (value.length != 2)
        {
            throw new ValidationError(this.errorMessages.invalid);
        }
        value = value.join(" ");
    }

    for (var i = 0, l = this.inputFormats.length; i < l; i++)
    {
        try
        {
            var t = time.strptime(value, this.inputFormats[i]);
            return new Date(t[0], t[1] - 1, t[2], t[3], t[4], t[5]);
        }
        catch (e)
        {
            continue;
        }
    }

    throw new ValidationError(this.errorMessages.invalid);
};

/**
 * Validates that its input matches a given regular expression.
 *
 * @param regex a <code>RegExp</code> or a <code>String</code> containing a
 *              pattern. If a <code>String</code> is given, it will be compiled
 *              to a <code>RegExp</code>.
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Field} and {@link CharField}.
 * @constructor
 * @augments CharField
 */
function RegexField(regex, kwargs)
{
    CharField.call(this, kwargs);
    if (typeof regex == "string")
    {
        regex = new RegExp(regex);
    }
    this.regex = regex;
}

RegexField.prototype = new CharField();

/**
 * Validates that the given value matches the regular expression defined for
 * this Field.
 *
 * @param {String} value the value to be validated.
 *
 * @return a string which matches the regular expresson defined for this field.
 * @type String
 */
RegexField.prototype.clean = function(value)
{
    value = CharField.prototype.clean.call(this, value);
    if (value !== "" && !this.regex.test(value))
    {
        throw new ValidationError(this.errorMessages.invalid);
    }
    return value;
};

/**
 * Validates that its input appears to be a valid e-mail address.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link RegexField}.
 * @constructor
 * @augments RegexField
 */
function EmailField(kwargs)
{
    RegexField.call(this, EmailField.EMAIL_REGEXP, kwargs);
}

/**
 * E-mail validation regular expression.
 */
EmailField.EMAIL_REGEXP = new RegExp(
    "(^[-!#$%&'*+/=?^_`{}|~0-9A-Z]+(\\.[-!#$%&'*+/=?^_`{}|~0-9A-Z]+)*" +                                // Dot-atom
    "|^\"([\\001-\\010\\013\\014\\016-\\037!#-\\[\\]-\\177]|\\\\[\\001-011\\013\\014\\016-\\177])*\"" + // Quoted-string
    ")@(?:[A-Z0-9-]+\\.)+[A-Z]{2,6}$",                                                                  // Domain
    "i");

EmailField.prototype = new RegexField();

EmailField.prototype.defaultErrorMessages =
    extendObject({}, EmailField.prototype.defaultErrorMessages, {
        invalid: "Enter a valid e-mail address."
    });

/**
 * A wrapper for files uploaded in a {@link FileField}.
 *
 * @param {String} filename the file's name.
 * @param {String} content the file's contents.
 * @constructor
 */
function UploadedFile(filename, content)
{
    this.filename = filename;
    this.content = content;
}

UploadedFile.prototype.toString = function()
{
    return this.filename;
};

/**
 * Validates that its input is a valid uploaded file.
 * <p>
 * This field is mostly meaningless on the client-side, but is included for
 * future use in any future server-side implementation.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Field}.
 * @constructor
 * @augments Field
 */
function FileField(kwargs)
{
    Field.call(this, kwargs);
}

FileField.prototype = new Field();
FileField.prototype.defaultWidget = FileInput;
FileField.prototype.defaultErrorMessages =
    extendObject({}, FileField.prototype.defaultErrorMessages, {
        invalid: "No file was submitted. Check the encoding type on the form.",
        missing: "No file was submitted.",
        empty: "The submitted file is empty."
    });

/**
 * Validates that the given data appears to be a valid uploaded file.
 *
 * @param {Object} data uploaded file data.
 * @config {String} filename the file's name.
 * @config {String} content the file's content.
 * @param {String} [initial] the path of an existing file.
 *
 * @return an object representing uploaded file data, or <code>null</code> for
 *         empty values.
 * @type UploadedFile
 */
FileField.prototype.clean = function(data, initial)
{
    Field.prototype.clean.call(this, initial || data);
    if (!this.required && contains(Field.EMPTY_VALUES, data))
    {
        return null;
    }

    // Weird return logic owing to the fact that an empty Python dict is falsy
    // but a JavaScript object which has no properties is not.
    if (typeof data != "object")
    {
        if (initial)
        {
            return initial;
        }
        throw new ValidationError(this.errorMessages.invalid);
    }
    else if (typeof data.filename == "undefined" ||
             typeof data.content == "undefined")
    {
        if (initial)
        {
            return initial;
        }
        throw new ValidationError(this.errorMessages.missing);
    }

    var f = new UploadedFile(data.filename, data.content);
    if (!f.content)
    {
        throw new ValidationError(this.errorMessages.empty);
    }

    return f;
};

/**
 * Validates that its input is a valid uploaded image.
 * <p>
 * This field is mostly meaningless on the client-side, but is included for
 * future use in any future server-side implementation.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link FileField}.
 * @constructor
 * @augments FileField
 */
function ImageField(kwargs)
{
    FileField.call(this, kwargs);
}

ImageField.prototype = new FileField();
ImageField.prototype.defaultErrorMessages =
    extendObject({}, ImageField.prototype.defaultErrorMessages, {
        invalidImage: "Upload a valid image. The file you uploaded was either not an image or a corrupted image."
    });

/**
 * Validates that its input appears to be a valid URL.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link RegexField}.
 * @config {Boolean} [verifyExists] should the field attempt to verify if the
 *                                  address exists by accessing it? Defaults to
 *                                  <code>false</code>.
 * @config {String} [userAgent] the user agent string to use when attempting URL
 *                              verification.
 * @constructor
 * @augments RegexField
 */
function URLField(kwargs)
{
    kwargs = extendObject({
        verifyExists: false, userAgent: URLField.URL_VALIDATOR_USER_AGENT
    }, kwargs || {})
    RegexField.call(this, URLField.URL_REGEXP, kwargs);
    this.verifyExists = kwargs.verifyExists;
    this.userAgent = kwargs.userAgent;
}

/**
 * URL validation regular expression.
 */
URLField.URL_REGEXP = new RegExp(
    "^https?://" +                                 // http:// or https://
    "(?:(?:[A-Z0-9-]+\\.)+[A-Z]{2,6}|" +           // Domain...
    "localhost|" +                                 // ...localhost...
    "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})" + // ...or ip
    "(?::\\d+)?" +                                 // Optional port
    "(?:/?|/\\S+)$",
    "i")

/**
 * Default URL validation user agent.
 */
URLField.URL_VALIDATOR_USER_AGENT =
    "js-forms (http://code.google.com/p/js-forms/)";

URLField.prototype = new RegexField();
URLField.prototype.defaultErrorMessages =
    extendObject({}, URLField.prototype.defaultErrorMessages, {
        invalid: "Enter a valid URL.",
        invalidLink: "This URL appears to be a broken link."
    });

/**
 * Validates that the given value appears to be a valid URL.
 *
 * @param {String} value the value to be validated.
 *
 * @return a valid URL.
 * @type String
 */
URLField.prototype.clean = function(value)
{
    // If no URL scheme was given, assume http://
    if (value && value.indexOf("://") == -1)
    {
        value = "http://" + value;
    }
    value = RegexField.prototype.clean.call(this, value);
    if (value === "")
    {
        return value;
    }
    if (this.verifyExists === true)
    {
        // TODO Implement URL verification
    }
    return value
};

/**
 * Normalises its input to a <code>Boolean</code> primitive.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Field}.
 * @constructor
 * @augments Field
 */
function BooleanField(kwargs)
{
    Field.call(this, kwargs);
}

BooleanField.prototype = new Field();
BooleanField.prototype.defaultWidget = CheckboxInput;

/**
 * Normalises the given value to a <code>Boolean</code> primitive.
 *
 * @param {String} value the value to be validated.
 *
 * @return the value's normalised boolean representation.
 * @type Boolean
 */
BooleanField.prototype.clean = function(value)
{
    Field.prototype.clean.call(this, value);
    // Explicitly check for the string "False", which is what a hidden field
    // will submit for false. Because Boolean("True") == true, we don't need to
    // handle that explicitly.
    if (value == "False")
    {
        return false;
    }
    return Boolean(value);
};

/**
 * A field whose valid values are <code>null</code>, <code>true</code> and
 * <code>false</code>. Invalid values are cleaned to <code>null</code>.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link BooleanField}.
 * @constructor
 * @augments BooleanField
 */
function NullBooleanField(kwargs)
{
    BooleanField.call(this, kwargs);
}

NullBooleanField.prototype = new BooleanField();
NullBooleanField.prototype.defaultWidget = NullBooleanSelect;

NullBooleanField.prototype.clean = function(value)
{
    if (value === true || value === false)
    {
        return value;
    }
    return null;
};

/**
 * Validates that its input is one of a valid list of choices.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Array} [choices] a list of choices - each choice should be specified
 *                           as a list containing two items; the first item is
 *                           a value which should be validated against, the
 *                           second item is a display value for that choice, for
 *                           example:
 *                           <code>{choices: [[1, "One"], [2, "Two"]]}</code>.
 *                           Defaults to an empty <code>Array</code>.
 * @constructor
 * @augments Field
 */
function ChoiceField(kwargs)
{
    // TODO Why was the setter not working when defined "normally" in the prototype?
    this.__defineGetter__("choices", function()
    {
        return this._choices;
    });
    this.__defineSetter__("choices", function(choices)
    {
        this._choices = this.widget.choices = choices;
    });
    kwargs = extendObject({
        choices: []
    }, kwargs || {});
    Field.call(this, kwargs);
    this.choices = kwargs.choices;
}

ChoiceField.prototype = new Field();
ChoiceField.prototype.defaultWidget = Select;
ChoiceField.prototype.defaultErrorMessages =
    extendObject({}, ChoiceField.prototype.defaultErrorMessages, {
        invalidChoice: "Select a valid choice. That choice is not one of the available choices."
    });

/**
 * Validates that the given value is in this field's choices.
 *
 * @param {String} value the value to be validated.
 *
 * @return a valid choice.
 * @type String
 */
ChoiceField.prototype.clean = function(value)
{
    value = Field.prototype.clean.call(this, value);

    if (contains(Field.EMPTY_VALUES, value))
    {
        return "";
    }

    value = "" + value;
    if (value === "")
    {
        return value;
    }

    for (var i = 0, l = this.choices.length; i < l; i++)
    {
        if (value === ("" + this.choices[i][0]))
        {
            return value;
        }
    }

    throw new ValidationError(this.errorMessages.invalidChoice);
};

/**
 * Validates that its input is one or more of a valid list of choices.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link ChoiceField}.
 * @constructor
 * @augments ChoiceField
 */
function MultipleChoiceField(kwargs)
{
    ChoiceField.call(this, kwargs);
}

MultipleChoiceField.prototype = new ChoiceField();
MultipleChoiceField.prototype.defaultWidget = SelectMultiple;
MultipleChoiceField.prototype.defaultErrorMessages =
    extendObject({}, MultipleChoiceField.prototype.defaultErrorMessages, {
        invalidChoice: "Select a valid choice. %(value)s is not one of the available choices.",
        invalidList: "Enter a list of values."
    });

/**
 * Validates that the input is a list and that each item is in this field's
 * choices.
 *
 * @param value the input to be validated.
 *
 * @return a list of valid values, which have been normalised to
 *         <code>String</code>s.
 * @type Array
 */
MultipleChoiceField.prototype.clean = function(value)
{
    if (this.required && !value)
    {
        throw new ValidationError(this.errorMessages.required);
    }
    else if (!this.required && !value)
    {
        return [];
    }

    // The similar else branch below is required due to empty Arrays not being
    // falsy in JavaScript.
    if (!(value instanceof Array))
    {
        throw new ValidationError(this.errorMessages.invalidList);
    }
    else if (value.length == 0)
    {
        if (this.required)
        {
            throw new ValidationError(this.errorMessages.required);
        }
        else
        {
            return [];
        }
    }

    var validValuesLookup = {};
    for (var i = 0, l = this.choices.length; i < l; i++)
    {
        validValuesLookup["" + this.choices[i][0]] = true;
    }

    var stringValues = [];
    for (var i = 0, l = value.length; i < l; i++)
    {
        var stringValue = "" + value[i];
        if (typeof validValuesLookup[stringValue] == "undefined")
        {
            throw new ValidationError(formatString(
                this.errorMessages.invalidChoice, {value: stringValue}));
        }
        stringValues[stringValues.length] = stringValue;
    }
    return stringValues;
};

/**
 * A Field whose <code>clean()</code> method calls multiple Field
 * <code>clean()</code> methods.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in {@link Field}.
 * @config {Array} [fields] fields which will be used to perform cleaning in the
 *                          order they're given in.
 * @constructor
 * @augments Field
 */
function ComboField(kwargs)
{
    kwargs = extendObject({fields: []}, kwargs || {});
    Field.call(this, kwargs);

    for (var i = 0, l = kwargs.fields.length; i < l; i++)
    {
        kwargs.fields[i].required = false;
    }
    this.fields = kwargs.fields;
}

ComboField.prototype = new Field();

ComboField.prototype.clean = function(value)
{
    Field.prototype.clean.call(this, value);
    for (var i = 0, l = this.fields.length; i < l; i++)
    {
        value = this.fields[i].clean(value);
    }
    return value;
};

/**
 * A Field that aggregates the logic of multiple Fields.
 * <p>
 * Its <code>clean()</code> method takes a "decompressed" list of values, which
 * are then cleaned into a single value according to <code>this.fields</code>.
 * Each value in this list is cleaned by the corresponding field -- the first
 * value is cleaned by the first field, the second value is cleaned by the
 * second field, etc. Once all fields are cleaned, the list of clean values is
 * "compressed" into a single value.
 * <p>
 * Subclasses should not have to implement <code>clean()</code>. Instead, they
 * must implement <code>compress()</code>, which takes a list of valid values
 * and returns a "compressed" version of those values -- a single value.
 * <p>
 * You'll probably want to use this with {@link MultiWidget}.
 *
 * @param {Object} [kwargs] configuration options additional to those supplied
 *                          in {@link Field}.
 * @config {Array} [fields] a list of fields to be used to clean a
 *                          "decompressed" list of values.
 * @constructor
 * @augments Field
 */
function MultiValueField(kwargs)
{
    kwargs = extendObject({fields: []}, kwargs || {});
    Field.call(this, kwargs);
    // Set required to false on the individual fields, because the required
    // validation will be handled by MultiValueField, not by those individual
    // fields.
    for (var i = 0, l = kwargs.fields.length; i < l; i++)
    {
        kwargs.fields[i].required = false;
    }
    this.fields = kwargs.fields;
}

MultiValueField.prototype = new Field();
MultiValueField.prototype.defaultErrorMessages =
    extendObject({}, MultiValueField.prototype.defaultErrorMessages, {
        invalid: "Enter a list of values."
    });

/**
 * Validates every value in the given list. A value is validated against the
 * corresponding Field in <code>this.fields</code>.
 * <p>
 * For example, if this MultiValueField was instantiated with
 * <code>{fields: [new DateField(), new TimeField()]}, <code>clean()</code>
 * would call <code>DateField.clean(value[0])</code> and
 * <code>TimeField.clean(value[1])<code>.
 *
 * @param {Array} value the input to be validated.
 *
 * @return the result of calling <code>compress()</code> on the cleaned input.
 */
MultiValueField.prototype.clean = function(value)
{
    var cleanData = [];
    var errors = new ErrorList();

    if (!value || value instanceof Array)
    {
        var allValuesEmpty = true;
        if (value instanceof Array)
        {
            for (var i = 0, l = value.length; i < l; i++)
            {
                if (value[i])
                {
                    allValuesEmpty = false;
                    break;
                }
            }
        }

        if (!value || allValuesEmpty)
        {
            if (this.required)
            {
                throw new ValidationError(this.errorMessages.required);
            }
            else
            {
                return this.compress([]);
            }
        }
    }
    else
    {
        throw new ValidationError(this.errorMessages.invalid);
    }

    for (var i = 0, l = this.fields.length; i < l; i++)
    {
        var field = this.fields[i];
        var fieldValue = value[i];
        if (fieldValue === undefined)
        {
            fieldValue = null;
        }

        if (this.required && contains(Field.EMPTY_VALUES, fieldValue))
        {
            throw new ValidationError(this.erroMessages.required);
        }

        try
        {
            cleanData[cleanData.length] = field.clean(fieldValue);
        }
        catch (e)
        {
            if (e instanceof ValidationError)
            {
                errors.extend(e.messages);
            }
            else
            {
                throw e;
            }
        }
    }

    if (errors.isPopulated())
    {
        throw new ValidationError(errors.errors);
    }

    return this.compress(cleanData);
};

/**
 * Returns a single value for the given list of values. The values can be
 * assumed to be valid.
 * <p>
 * For example, if this MultiValueField was instantiated with
 * <code>{fields: [new DateField(), new TimeField()]}</code>, this might return
 * a <code>Date</code> object created by combining the date and time in
 * <code>dataList</code>.
 *
 * @param {Array} dataList
 */
MultiValueField.prototype.compress = function(dataList)
{
    throw new Error("Subclasses must implement this method.");
};

// TODO FilePathField

/**
 * A {@link MultiValueField} consisting of a {@link DateField} and a
 * {@link TimeField}.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Field} and {@link MultiValueField}.
 * @constructor
 * @augments MultiValueField
 */
function SplitDateTimeField(kwargs)
{
    kwargs = extendObject({}, kwargs || {});
    var errors = extendObject({}, this.defaultErrorMessages);
    if (typeof kwargs.errorMessages != "undefined")
    {
        extendObject(errors, kwargs.errorMessages);
    }
    kwargs.fields =
        [new DateField({errorMessages: {invalid: errors.invalidDate}}),
         new TimeField({errorMessages: {invalid: errors.invalidTime}})];
    MultiValueField.call(this, kwargs);
}

SplitDateTimeField.prototype = new MultiValueField();
SplitDateTimeField.prototype.defaultWidget = SplitDateTimeWidget;
SplitDateTimeField.prototype.defaultErrorMessages =
    extendObject({}, SplitDateTimeField.prototype.defaultErrorMessages, {
        invalidDate: "Enter a valid date.",
        invalidTime: "Enter a valid time."
    });

/**
 * Validates that, if given, its input does not contain empty values.
 *
 * @param {Array} [dataList] a two-item list consisting of two <code>Date</code>
 *                           objects, the first of which represents a date, the
 *                           second a time.
 *
 * @return a <code>Date</code> object representing the given date and time, or
 *         <code>null</code> for empty values.
 * @type Date
 */
SplitDateTimeField.prototype.compress = function(dataList)
{
    if (dataList instanceof Array && dataList.length > 0)
    {
        var d = dataList[0], t = dataList[1];
        // Raise a validation error if date or time is empty (possible if
        // SplitDateTimeField has required == false).
        if (contains(Field.EMPTY_VALUES, d))
        {
           throw new ValidationError(this.errorMessages.invalidDate);
        }
        else if (contains(Field.EMPTY_VALUES, t))
        {
           throw new ValidationError(this.errorMessages.invalidTime);
        }
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(),
                        t.getHours(), t.getMinutes(), t.getSeconds());
    }
    return null;
};

/**
 * Validates that its input is a valid IPv4 address.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          {@link Field} and {@link CharField}.
 * @constructor
 * @augments RegexField
 */
function IPAddressField(kwargs)
{
    RegexField.call(this, IPAddressField.IPV4_REGEXP, kwargs);
};

/**
 * IPv4 address validation regular expression.
 */
IPAddressField.IPV4_REGEXP =
    /^(25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3}$/;

IPAddressField.prototype = new RegexField();
IPAddressField.prototype.defaultErrorMessages =
    extendObject({}, IPAddressField.prototype.defaultErrorMessages, {
        invalid: "Enter a valid IPv4 address."
    });
