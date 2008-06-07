/**
 * An object that is responsible for doing validation, for example: an
 * <code>EmailField</code> makes sure its data is a valid e-mail address.
 *
 * @param {Object} [kwargs] configuration options
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
        extendObject(extendObject({}, this.defaultErrorMessages),
                     kwargs.errorMessages || {});
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
    if (this.required)
    {
        for (var i = 0, l = Field.EMPTY_VALUES.length; i < l; i++)
        {
            if (value === Field.EMPTY_VALUES[i])
            {
                throw new ValidationError(this.errorMessages.required);
            }
        }
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
 *                          in <code>Field</code>.
 * @config {Number} [maxLength] a maximum valid length for the input string.
 * @config {Number} [minLength] a minimum valid length for the input string.
 * @constructor
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

extendObject(CharField.prototype.defaultErrorMessages, {
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

    for (var i = 0, l = Field.EMPTY_VALUES.length; i < l; i++)
    {
        if (value === Field.EMPTY_VALUES[i])
        {
            return "";
        }
    }

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
 *                          in <code>Field</code>.
 * @config {Number} [maxValue] a maximum value for the input.
 * @config {Number} [minValue] a minimum value for the input.
 * @constructor
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

IntegerField.prototype = new Field();
extendObject(IntegerField.prototype.defaultErrorMessages, {
    invalid: "Enter a whole number.",
    maxValue: "Ensure this value is less than or equal to %(maxValue)s.",
    minValue: "Ensure this value is greater than or equal to %(minValue)s.",
});

/**
 * Validates that the given value is a valid integer.
 *
 * @param {String} value the value to be validated.
 *
 * @return a valid integer, or <code>null</code> for empty values.
 * @type Number
 */
IntegerField.prototype.clean = function(value)
{
    Field.prototype.clean.call(this, value);

    for (var i = 0, l = Field.EMPTY_VALUES.length; i < l; i++)
    {
        if (value === Field.EMPTY_VALUES[i])
        {
            return null;
        }
    }

    if (!(/^[-+]?\d+$/).test(value))
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
 *                          in <code>Field</code>.
 * @config {Number} [maxValue] a maximum value for the input.
 * @config {Number} [minValue] a minimum value for the input.
 * @constructor
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

FloatField.prototype = new Field();
extendObject(FloatField.prototype.defaultErrorMessages, {
    invalid: "Enter a number.",
    maxValue: "Ensure this value is less than or equal to %(maxValue)s.",
    minValue: "Ensure this value is greater than or equal to %(minValue)s.",
});

/**
 * Validates that the given value is a valid float.
 *
 * @param {String} value the value to be validated.
 *
 * @return a valid <code>float</code>, or <code>null</code> for empty values.
 * @type Number
 */
FloatField.prototype.clean = function(value)
{
    Field.prototype.clean.call(this, value);

    for (var i = 0, l = Field.EMPTY_VALUES.length; i < l; i++)
    {
        if (value === Field.EMPTY_VALUES[i])
        {
            return null;
        }
    }

    if (!(/^[-+]?\d+(?:\.\d+)?$/).test(value))
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

// TODO DecimalField - is there a suitable JavaScript type or library we can use?

// TODO DateField

// TODO TimeField

// TODO DateTimeField

/**
 * Validates that its input matches a given regular expression.
 *
 * @param regex a <code>RegExp</code> or a <code>String</code> containing a
 *              pattern. If a <code>String</code> is given, it will be compiled
 *              to a <code>RegExp</code>.
 * @param {Object} [kwargs] configuration options, as specified in
 *                          <code>Field</code> and <code>CharField</code>.
 * @constructor
 */
function RegexField(regex, kwargs)
{
    CharField.call(this, kwargs);
    if (regex instanceof String)
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
    value = CharField.clean.call(this, value);
    if (value !== "" && !this.regex.test(value))
    {
        throw new ValidationError(this.errorMessages.invalid);
    }
    return value;
};

/**
 * Validates that its input appears to be a valid e-mail address.
 *
 * @constructor
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

extendObject(EmailField.prototype.defaultErrorMessages, {
    invalid: "Enter a valid e-mail address"
});

/**
 * Validates that its input is a valid uploaded file.
 * <p>
 * This field is mostly meaningless on the client-side, but is included for
 * future use in any future server-side implementation.
 *
 * @constructor
 */
function FileField(kwargs)
{
    Field.call(this, kwargs);
}

FileField.prototype = new Field();
FileField.prototype.defaultWidget = FileInput;
extendObject(FileField.prototype.defaultErrorMessages, {
    invalid: "No file was submitted. Check the encoding type on the form.",
    missing: "No file was submitted.",
    empty: "The submitted file is empty."
});

/**
 * Validates that its input is a valid uploaded image.
 * <p>
 * This field is mostly meaningless on the client-side, but is included for
 * future use in any future server-side implementation.
 *
 * @constructor
 */
function ImageField(kwargs)
{
    FileField.call(this, kwargs);
}

ImageField.prototype = new FileField();
extendObject(ImageField.prototype.defaultErrorMessages, {
    invalidImage: "Upload a valid image. The file you uploaded was either not an image or a corrupted image."
});

/**
 * Validates that its input appears to be a valid URL.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in <code>RegexField</code>
 * @config {Boolean} [verifyExists] should the field attempt to verify if the
 *                                  address exists by accessing it? Defaults to
 *                                  <code>false</code>.
 * @config {String} [userAgent] the user agent string to use when attempting URL
 *                              verification.
 * @constructor
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
extendObject(URLField.prototype.defaultErrorMessages, {
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
        // TODO Can URL verification be reliably implemented on the client-side?
    }
    return value
};

// TODO BooleanField

// TODO NullBooleanField

/**
 * Validates that its input is one of a valid list of choices.
 *
 * @param {Object} [kwargs] configuration options additional to those specified
 *                          in <code>Field</code>.
 * @config {Array} [choices] a list of choices - each choice should be specified
 *                           as a list containing two items; the first item is
 *                           a value which should be validated against, the
 *                           second item is a display value for that choice, for
 *                           example:
 *                           <code>{choices: [[1, "One"], [2, "Two"]]}</code>.
 *                           Defaults to an empty <code>Array</code>.
 * @constructor
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
extendObject(ChoiceField.prototype.defaultErrorMessages, {
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

    for (var i = 0, l = Field.EMPTY_VALUES.length; i < l; i++)
    {
        if (value === Field.EMPTY_VALUES[i])
        {
            return "";
        }
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

// TODO MultipleChoiceField

// TODO ComboField

// TODO MultiValueField

// TODO FilePathField

// TODO SplitDateTimeField

/**
 * Validates that its input is a valid IPv4 address.
 *
 * @param {Object} [kwargs] configuration options, as specified in
 *                          <code>Field</code> and <code>CharField</code>.
 * @constructor
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
extendObject(IPAddressField.prototype.defaultErrorMessages, {
    invalid: "Enter a valid IPv4 address."
});
