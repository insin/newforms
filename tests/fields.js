module("fields");

(function()
{

/**
 * Asserts that when a field's clean method is called with given arguments,
 * a {@code ValidationError} is thrown containing the specified error message(s).
 * @param {Field} the field to be tested.
 * @param {{string|Array.<string>}} the error message or messages which should
 *     be contained in the resulting {@code ValidationError}.
 * @param {...*} var_args arguments for the call to the field's clean method.
 */
function cleanRaisesWithValidationError(field, message, var_args)
{
    if (!isArray(message))
        message = [message];
    try
    {
        field.clean.apply(field, Array.prototype.slice.call(arguments, 2));
    }
    catch (e)
    {
        if (!(e instanceof ValidationError))
            throw new Error("Method did not throw a ValidationError:" + e);
        deepEqual(e.messages, message);
        return;
    }
    throw new Error("Method did not throw an exception");
}

test("Field sets widget isRequired", function()
{
    expect(2);
    strictEqual(new Field({required: true}).widget.isRequired, true);
    strictEqual(new Field({required: false}).widget.isRequired, false);
});

test("CharField", function()
{
    expect(30);
    var f = new CharField();
    strictEqual(f.clean(1), "1");
    equal(f.clean("hello"), "hello");
    cleanRaisesWithValidationError(f, "This field is required.", null);
    cleanRaisesWithValidationError(f, "This field is required.", "");
    strictEqual(f.clean([1, 2, 3]), "1,2,3");
    strictEqual(f.maxLength, null);
    strictEqual(f.minLength, null);

    f = new CharField({required: false});
    strictEqual(f.clean(1), "1");
    equal(f.clean("hello"), "hello");
    strictEqual(f.clean(null), "");
    strictEqual(f.clean(""), "");
    strictEqual(f.clean([1, 2, 3]), "1,2,3");
    strictEqual(f.maxLength, null);
    strictEqual(f.minLength, null);

    // CharField accepts an optional maxLength parameter
    f = new CharField({maxLength: 10, required: false});
    equal(f.clean("12345"), "12345");
    equal(f.clean("1234567890"), "1234567890");
    cleanRaisesWithValidationError(f, "Ensure this value has at most 10 characters (it has 11).", "1234567890a");
    strictEqual(f.maxLength, 10);
    strictEqual(f.minLength, null);

    // CharField accepts an optional minLength parameter
    f = new CharField({minLength: 10, required: false});
    cleanRaisesWithValidationError(f, "Ensure this value has at least 10 characters (it has 5).", "12345");
    equal(f.clean("1234567890"), "1234567890");
    equal(f.clean("1234567890a"), "1234567890a");
    strictEqual(f.maxLength, null);
    strictEqual(f.minLength, 10);

    f = new CharField({minLength: 10, required: true});
    cleanRaisesWithValidationError(f, "This field is required.", "");
    cleanRaisesWithValidationError(f, "Ensure this value has at least 10 characters (it has 5).", "12345");
    equal(f.clean("1234567890"), "1234567890");
    equal(f.clean("1234567890a"), "1234567890a");
    strictEqual(f.maxLength, null);
    strictEqual(f.minLength, 10);
});

test("IntegerField", function()
{
    expect(51);
    var f = new IntegerField();
    cleanRaisesWithValidationError(f, "This field is required.", null);
    cleanRaisesWithValidationError(f, "This field is required.", "");
    strictEqual(f.clean("1"), 1);
    strictEqual(isNumber(f.clean("1")), true);
    strictEqual(f.clean("23"), 23);
    cleanRaisesWithValidationError(f, "Enter a whole number.", "a");
    strictEqual(f.clean(42), 42);
    cleanRaisesWithValidationError(f, "Enter a whole number.", 3.14);
    strictEqual(f.clean("1 "), 1);
    strictEqual(f.clean(" 1"), 1);
    strictEqual(f.clean(" 1 "), 1);
    cleanRaisesWithValidationError(f, "Enter a whole number.", "1a");
    strictEqual(f.maxValue, null);
    strictEqual(f.minValue, null);

    f = new IntegerField({required: false});
    strictEqual(f.clean(""), null);
    strictEqual(f.clean(null), null);
    strictEqual(f.clean("1"), 1);
    strictEqual(f.clean("23"), 23);
    cleanRaisesWithValidationError(f, "Enter a whole number.", "a");
    strictEqual(f.clean("1 "), 1);
    strictEqual(f.clean(" 1"), 1);
    strictEqual(f.clean(" 1 "), 1);
    cleanRaisesWithValidationError(f, "Enter a whole number.", "1a");
    strictEqual(f.maxValue, null);
    strictEqual(f.minValue, null);

    // IntegerField accepts an optional maxValue parameter
    f = new IntegerField({maxValue: 10})
    cleanRaisesWithValidationError(f, "This field is required.", null);
    strictEqual(f.clean(1), 1);
    strictEqual(f.clean(10), 10);
    cleanRaisesWithValidationError(f, "Ensure this value is less than or equal to 10.", 11);
    strictEqual(f.clean("10"), 10);
    cleanRaisesWithValidationError(f, "Ensure this value is less than or equal to 10.", "11");
    strictEqual(f.maxValue, 10);
    strictEqual(f.minValue, null);

    // IntegerField accepts an optional minValue parameter
    f = new IntegerField({minValue: 10});
    cleanRaisesWithValidationError(f, "This field is required.", null);
    cleanRaisesWithValidationError(f, "Ensure this value is greater than or equal to 10.", 1);
    strictEqual(f.clean(10), 10);
    strictEqual(f.clean(11), 11);
    strictEqual(f.clean("10"), 10);
    strictEqual(f.clean("11"), 11);
    strictEqual(f.maxValue, null);
    strictEqual(f.minValue, 10);

    // minValue and maxValue can be used together
    f = new IntegerField({minValue: 10, maxValue: 20});
    cleanRaisesWithValidationError(f, "This field is required.", null);
    cleanRaisesWithValidationError(f, "Ensure this value is greater than or equal to 10.", 1);
    strictEqual(f.clean(10), 10);
    strictEqual(f.clean(11), 11);
    strictEqual(f.clean("10"), 10);
    strictEqual(f.clean("11"), 11);
    strictEqual(f.clean(20), 20);
    cleanRaisesWithValidationError(f, "Ensure this value is less than or equal to 20.", 21);
    strictEqual(f.maxValue, 20);
    strictEqual(f.minValue, 10);
});

test("FloatField", function()
{
    expect(27);
    var f = new FloatField();
    cleanRaisesWithValidationError(f, "This field is required.", "");
    cleanRaisesWithValidationError(f, "This field is required.", null);
    strictEqual(f.clean(1), 1.0);
    strictEqual(f.clean(23), 23.0);
    strictEqual(f.clean("3.14"), 3.1400000000000001);
    strictEqual(f.clean(3.14), 3.1400000000000001);
    strictEqual(f.clean(42), 42.0);
    cleanRaisesWithValidationError(f, "Enter a number.", "a");
    strictEqual(f.clean("1.0 "), 1.0);
    strictEqual(f.clean(" 1.0"), 1.0);
    strictEqual(f.clean(" 1.0 "), 1.0);
    cleanRaisesWithValidationError(f, "Enter a number.", "1.0a");
    strictEqual(f.maxValue, null);
    strictEqual(f.minValue, null);

    f = new FloatField({required: false});
    strictEqual(f.clean(""), null);
    strictEqual(f.clean(null), null);
    strictEqual(f.clean("1"), 1.0);
    strictEqual(f.maxValue, null);
    strictEqual(f.minValue, null);

    // FloatField accepts minValue and maxValue just like IntegerField
    f = new FloatField({maxValue: 1.5, minValue: 0.5});
    cleanRaisesWithValidationError(f, "Ensure this value is less than or equal to 1.5.", "1.6");
    cleanRaisesWithValidationError(f, "Ensure this value is greater than or equal to 0.5.", "0.4");
    strictEqual(f.clean("1.5"), 1.5);
    strictEqual(f.clean("0.5"), 0.5);
    strictEqual(f.maxValue, 1.5);
    strictEqual(f.minValue, 0.5);

    // FloatField implements its own _hasChanged due to String coercion issues
    // in JavaScript.
    strictEqual(f._hasChanged("0.0", 0.0), false);
    strictEqual(f._hasChanged("1.0", 1.0), false);
});

test("DecimalField", function()
{
    expect(56);
    var f = new DecimalField({maxDigits: 4, decimalPlaces: 2});
    cleanRaisesWithValidationError(f, "This field is required.", "");
    cleanRaisesWithValidationError(f, "This field is required.", null);
    strictEqual(f.clean("1"), "1");
    strictEqual(isString(f.clean("1")), true);
    strictEqual(f.clean("23"), "23");
    strictEqual(f.clean("3.14"), "3.14");
    strictEqual(f.clean(3.14), "3.14");
    cleanRaisesWithValidationError(f, "Enter a number.", "NaN");
    cleanRaisesWithValidationError(f, "Enter a number.", "Infinity");
    cleanRaisesWithValidationError(f, "Enter a number.", "-Infinity");
    cleanRaisesWithValidationError(f, "Enter a number.", "a");
    // TODO Unicode characters test
    strictEqual(f.clean("1.0 "), "1.0");
    strictEqual(f.clean(" 1.0"), "1.0");
    strictEqual(f.clean(" 1.0 "), "1.0");
    cleanRaisesWithValidationError(f, "Enter a number.", "1.0a");
    cleanRaisesWithValidationError(f, "Ensure that there are no more than 4 digits in total.", "123.45");
    cleanRaisesWithValidationError(f, "Ensure that there are no more than 2 decimal places.", "1.234");
    cleanRaisesWithValidationError(f, "Ensure that there are no more than 2 digits before the decimal point.", "123.4");
    strictEqual(f.clean("-12.34"), "-12.34");
    cleanRaisesWithValidationError(f, "Ensure that there are no more than 4 digits in total.", "-123.45");
    strictEqual(f.clean("-.12"), "-0.12");
    strictEqual(f.clean("-00.12"), "-0.12");
    strictEqual(f.clean("-000.12"), "-0.12");
    cleanRaisesWithValidationError(f, "Ensure that there are no more than 2 decimal places.", "-000.123");
    cleanRaisesWithValidationError(f, "Ensure that there are no more than 2 decimal places.", "-000.1234");
    cleanRaisesWithValidationError(f, "Ensure that there are no more than 4 digits in total.", "-000.12345");
    cleanRaisesWithValidationError(f, "Enter a number.", "--0.12");
    strictEqual(f.maxDigits, 4);
    strictEqual(f.decimalPlaces, 2);
    strictEqual(f.maxValue, null);
    strictEqual(f.minValue, null);

    f = new DecimalField({maxDigits: 4, decimalPlaces: 2, required: false});
    strictEqual(f.clean(""), null);
    strictEqual(f.clean(null), null);
    strictEqual(f.clean(1), "1");
    strictEqual(f.maxDigits, 4);
    strictEqual(f.decimalPlaces, 2);
    strictEqual(f.maxValue, null);
    strictEqual(f.minValue, null);

    // DecimalField accepts min_value and max_value just like IntegerField
    f = new DecimalField({maxDigits: 4, decimalPlaces: 2, maxValue: 1.5, minValue: 0.5});
    cleanRaisesWithValidationError(f, "Ensure this value is less than or equal to 1.5.", "1.6");
    cleanRaisesWithValidationError(f, "Ensure this value is greater than or equal to 0.5.", "0.4");
    strictEqual(f.clean("1.5"), "1.5");
    strictEqual(f.clean("0.5"), "0.5");
    strictEqual(f.clean(".5"), "0.5");
    strictEqual(f.clean("00.50"), "0.50");
    strictEqual(f.maxDigits, 4);
    strictEqual(f.decimalPlaces, 2);
    strictEqual(f.maxValue, 1.5);
    strictEqual(f.minValue, 0.5);

    f = new DecimalField({decimalPlaces: 2});
    cleanRaisesWithValidationError(f, "Ensure that there are no more than 2 decimal places.", "0.00000001");

    f = new DecimalField({maxDigits: 3});
    // Leading whole zeros "collapse" to one digit.
    equal(f.clean("0000000.10"), "0.10");
    // But a leading 0 before the . doesn"t count towards max_digits
    equal(f.clean("0000000.100"), "0.100");
    // Only leading whole zeros "collapse" to one digit.
    equal(f.clean("000000.02"), "0.02");
    cleanRaisesWithValidationError(f, "Ensure that there are no more than 3 digits in total.", "000000.0002");
    equal(f.clean(".002"), "0.002");

    f = new DecimalField({maxDigits: 2, decimalPlaces: 2});
    equal(f.clean(".01"), "0.01");
    cleanRaisesWithValidationError(f, "Ensure that there are no more than 0 digits before the decimal point.", "1.1");
});

test("DateField", function()
{
    expect(24);
    var f = new DateField();
    var expected = new Date(2006, 9, 25).valueOf();
    strictEqual(f.clean(new Date(2006, 9, 25)).valueOf(), expected);
    strictEqual(f.clean(new Date(2006, 9, 25, 14, 30)).valueOf(), expected);
    strictEqual(f.clean(new Date(2006, 9, 25, 14, 30, 59)).valueOf(), expected);
    strictEqual(f.clean(new Date(2006, 9, 25, 14, 30, 59, 200)).valueOf(), expected);
    strictEqual(f.clean("2006-10-25").valueOf(), expected);
    strictEqual(f.clean("10/25/2006").valueOf(), expected);
    strictEqual(f.clean("10/25/06").valueOf(), expected);
    strictEqual(f.clean("Oct 25 2006").valueOf(), expected);
    strictEqual(f.clean("October 25 2006").valueOf(), expected);
    strictEqual(f.clean("October 25, 2006").valueOf(), expected);
    strictEqual(f.clean("25 October 2006").valueOf(), expected);
    strictEqual(f.clean("25 October, 2006").valueOf(), expected);
    cleanRaisesWithValidationError(f, "Enter a valid date.", "2006-4-31");
    cleanRaisesWithValidationError(f, "Enter a valid date.", "200a-10-25");
    cleanRaisesWithValidationError(f, "Enter a valid date.", "25/10/06");
    cleanRaisesWithValidationError(f, "This field is required.", null);

    var f = new DateField({required: false});
    strictEqual(f.clean(null), null);
    strictEqual(f.clean(""), null);

    // DateField accepts an optional inputFormats parameter
    var f = new DateField({inputFormats: ["%Y %m %d"]});
    strictEqual(f.clean(new Date(2006, 9, 25)).valueOf(), expected);
    strictEqual(f.clean(new Date(2006, 9, 25, 14, 30)).valueOf(), expected);
    strictEqual(f.clean("2006 10 25").valueOf(), expected);

    // The input_formats parameter overrides all default input formats, so the
    // default formats won't work unless you specify them.
    cleanRaisesWithValidationError(f, "Enter a valid date.", "2006-10-25");
    cleanRaisesWithValidationError(f, "Enter a valid date.", "10/25/2006");
    cleanRaisesWithValidationError(f, "Enter a valid date.", "10/25/06");
});

test("TimeField", function()
{
    expect(11);
    var f = new TimeField();
    strictEqual(f.clean(new Date(1900, 0, 1, 14, 25)).valueOf(), new Date(1900, 0, 1, 14, 25).valueOf());
    strictEqual(f.clean(new Date(1900, 0, 1, 14, 25, 59)).valueOf(), new Date(1900, 0, 1, 14, 25, 59).valueOf());
    strictEqual(f.clean("14:25").valueOf(), new Date(1900, 0, 1, 14, 25).valueOf());
    strictEqual(f.clean("14:25:59").valueOf(), new Date(1900, 0, 1, 14, 25, 59).valueOf());
    cleanRaisesWithValidationError(f, "Enter a valid time.", "hello");
    cleanRaisesWithValidationError(f, "Enter a valid time.", "1:24 p.m.");

    // TimeField accepts an optional inputFormats parameter
    var f = new TimeField({inputFormats: ["%I:%M %p"]});
    strictEqual(f.clean(new Date(1900, 0, 1, 14, 25)).valueOf(), new Date(1900, 0, 1, 14, 25).valueOf());
    strictEqual(f.clean(new Date(1900, 0, 1, 14, 25, 59)).valueOf(), new Date(1900, 0, 1, 14, 25, 59).valueOf());
    strictEqual(f.clean("4:25 AM").valueOf(), new Date(1900, 0, 1, 4, 25).valueOf());
    strictEqual(f.clean("4:25 PM").valueOf(), new Date(1900, 0, 1, 16, 25).valueOf());

    // The inputFormats parameter overrides all default input formats, so the
    // default formats won't work unless you specify them.
    cleanRaisesWithValidationError(f, "Enter a valid time.", "14:30:45");
});

test("DateTimeField", function()
{
    expect(26);
    var f = new DateTimeField();
    strictEqual(f.clean(new Date(2006, 9, 25)).valueOf(), new Date(2006, 9, 25).valueOf());
    strictEqual(f.clean(new Date(2006, 9, 25, 14, 30)).valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    strictEqual(f.clean(new Date(2006, 9, 25, 14, 30, 59)).valueOf(), new Date(2006, 9, 25, 14, 30, 59).valueOf());
    strictEqual(f.clean(new Date(2006, 9, 25, 14, 30, 59, 200)).valueOf(), new Date(2006, 9, 25, 14, 30, 59, 200).valueOf());
    strictEqual(f.clean("2006-10-25 14:30:45").valueOf(), new Date(2006, 9, 25, 14, 30, 45).valueOf());
    strictEqual(f.clean("2006-10-25 14:30:00").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    strictEqual(f.clean("2006-10-25 14:30").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    strictEqual(f.clean("2006-10-25").valueOf(), new Date(2006, 9, 25).valueOf());
    strictEqual(f.clean("10/25/2006 14:30:45").valueOf(), new Date(2006, 9, 25, 14, 30, 45).valueOf());
    strictEqual(f.clean("10/25/2006 14:30:00").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    strictEqual(f.clean("10/25/2006 14:30").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    strictEqual(f.clean("10/25/2006").valueOf(), new Date(2006, 9, 25).valueOf());
    strictEqual(f.clean("10/25/06 14:30:45").valueOf(), new Date(2006, 9, 25, 14, 30, 45).valueOf());
    strictEqual(f.clean("10/25/06 14:30:00").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    strictEqual(f.clean("10/25/06 14:30").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    strictEqual(f.clean("10/25/06").valueOf(), new Date(2006, 9, 25).valueOf());
    cleanRaisesWithValidationError(f, "Enter a valid date/time.", "hello");
    cleanRaisesWithValidationError(f, "Enter a valid date/time.", "2006-10-25 4:30 p.m.");

    // DateField accepts an optional input_formats parameter
    f = new DateTimeField({inputFormats: ["%Y %m %d %I:%M %p"]});
    strictEqual(f.clean(new Date(2006, 9, 25)).valueOf(), new Date(2006, 9, 25).valueOf());
    strictEqual(f.clean(new Date(2006, 9, 25, 14, 30)).valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    strictEqual(f.clean(new Date(2006, 9, 25, 14, 30, 59)).valueOf(), new Date(2006, 9, 25, 14, 30, 59).valueOf());
    strictEqual(f.clean(new Date(2006, 9, 25, 14, 30, 59, 200)).valueOf(), new Date(2006, 9, 25, 14, 30, 59, 200).valueOf());
    strictEqual(f.clean("2006 10 25 2:30 PM").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());

    // The inputFormats parameter overrides all default input formats, so the
    // default formats won't work unless you specify them
    cleanRaisesWithValidationError(f, "Enter a valid date/time.", "2006-10-25 14:30:45");

    f = new DateTimeField({required: false});
    strictEqual(f.clean(null), null);
    strictEqual(f.clean(""), null);
});

test("RegexField", function()
{
    expect(24);
    var f = new RegexField("^\\d[A-F]\\d$");
    equal(f.clean("2A2"), "2A2");
    equal(f.clean("3F3"), "3F3");
    cleanRaisesWithValidationError(f, "Enter a valid value.", "3G3");
    cleanRaisesWithValidationError(f, "Enter a valid value.", " 2A2");
    cleanRaisesWithValidationError(f, "Enter a valid value.", "2A2 ");
    cleanRaisesWithValidationError(f, "This field is required.", "");

    f = new RegexField("^\\d[A-F]\\d$", {required: false});
    equal(f.clean("2A2"), "2A2");
    equal(f.clean("3F3"), "3F3");
    cleanRaisesWithValidationError(f, "Enter a valid value.", "3G3");
    equal(f.clean(""), "");

    // Alternatively, RegexField can take a compiled regular expression
    f = new RegexField(/^\d[A-F]\d$/);
    equal(f.clean("2A2"), "2A2");
    equal(f.clean("3F3"), "3F3");
    cleanRaisesWithValidationError(f, "Enter a valid value.", "3G3");
    cleanRaisesWithValidationError(f, "Enter a valid value.", " 2A2");
    cleanRaisesWithValidationError(f, "Enter a valid value.", "2A2 ");

    f = new RegexField("^\\d\\d\\d\\d$", {errorMessages: {invalid: 'Enter a four-digit number.'}});
    equal(f.clean("1234"), "1234");
    cleanRaisesWithValidationError(f, "Enter a four-digit number.", "123");
    cleanRaisesWithValidationError(f, "Enter a four-digit number.", "abcd");

    // RegexField also has minLength and maxLength parameters, for convenience
    f = new RegexField("^\\d+$", {minLength: 5, maxLength: 10});
    cleanRaisesWithValidationError(f, "Ensure this value has at least 5 characters (it has 3).", "123");
    cleanRaisesWithValidationError(f, ["Ensure this value has at least 5 characters (it has 3).", "Enter a valid value."], "abc");
    equal(f.clean("12345"), "12345");
    equal(f.clean("1234567890"), "1234567890");
    cleanRaisesWithValidationError(f, "Ensure this value has at most 10 characters (it has 11).", "12345678901");
    cleanRaisesWithValidationError(f, "Enter a valid value.", "12345a");
});

test("EmailField", function()
{
    expect(22);
    var f = new EmailField();
    cleanRaisesWithValidationError(f, "This field is required.", "");
    cleanRaisesWithValidationError(f, "This field is required.", null);
    equal(f.clean("person@example.com"), "person@example.com");
    cleanRaisesWithValidationError(f, "Enter a valid e-mail address.", "foo");
    cleanRaisesWithValidationError(f, "Enter a valid e-mail address.", "foo@");
    cleanRaisesWithValidationError(f, "Enter a valid e-mail address.", "foo@bar");
    cleanRaisesWithValidationError(f, "Enter a valid e-mail address.", "example@invalid-.com");
    cleanRaisesWithValidationError(f, "Enter a valid e-mail address.", "example@-invalid.com");
    cleanRaisesWithValidationError(f, "Enter a valid e-mail address.", "example@inv-.alid-.com");
    cleanRaisesWithValidationError(f, "Enter a valid e-mail address.", "example@inv-.-alid.com");
    equal(f.clean("example@valid-----hyphens.com"), "example@valid-----hyphens.com");
    equal(f.clean("example@valid-with-hyphens.com"), "example@valid-with-hyphens.com");

    // Hangs "forever" if catastrophic backtracking not fixed.
    cleanRaisesWithValidationError(f, "Enter a valid e-mail address.", "viewx3dtextx26qx3d@yahoo.comx26latlngx3d15854521645943074058");

    f = new EmailField({required: false});
    strictEqual(f.clean(""), "");
    strictEqual(f.clean(null), "");
    equal(f.clean("person@example.com"), "person@example.com");
    cleanRaisesWithValidationError(f, "Enter a valid e-mail address.", "foo");
    cleanRaisesWithValidationError(f, "Enter a valid e-mail address.", "foo@");
    cleanRaisesWithValidationError(f, "Enter a valid e-mail address.", "foo@bar");

    // EmailField also has minLength and maxLength parameters, for convenience.
    f = new EmailField({minLength: 10, maxLength: 15});
    cleanRaisesWithValidationError(f, "Ensure this value has at least 10 characters (it has 9).", "a@foo.com");
    equal(f.clean("alf@foo.com"), "alf@foo.com");
    cleanRaisesWithValidationError(f, "Ensure this value has at most 15 characters (it has 20).", "alf123456788@foo.com");
});

test("FileField", function()
{
    function SimpleUploadedFile(name, content)
    {
        this.name = name;
        this.content = content;
        this.size = (content !== null ? content.length : 0);
    }

    expect(18);
    var f = new FileField();
    cleanRaisesWithValidationError(f, "This field is required.", "");
    cleanRaisesWithValidationError(f, "This field is required.", "", "");
    equal(f.clean("", "files/test1.pdf"), "files/test1.pdf");
    cleanRaisesWithValidationError(f, "This field is required.", null);
    cleanRaisesWithValidationError(f, "This field is required.", null, "");
    equal(f.clean(null, "files/test2.pdf"), "files/test2.pdf");
    cleanRaisesWithValidationError(f, "No file was submitted. Check the encoding type on the form.", new SimpleUploadedFile("", ""));
    cleanRaisesWithValidationError(f, "No file was submitted. Check the encoding type on the form.", new SimpleUploadedFile("", ""), "");
    equal(f.clean(null, "files/test3.pdf"), "files/test3.pdf");
    cleanRaisesWithValidationError(f, "No file was submitted. Check the encoding type on the form.", "some content that is not a file");
    cleanRaisesWithValidationError(f, "The submitted file is empty.", new SimpleUploadedFile("name", null));
    cleanRaisesWithValidationError(f, "The submitted file is empty.", new SimpleUploadedFile("name", ""));
    ok(f.clean(new SimpleUploadedFile("name", "Some File Content")) instanceof SimpleUploadedFile, "Valid uploaded file details return the file object");
    ok(f.clean(new SimpleUploadedFile("name", "Some File Content"), "files/test4.pdf") instanceof SimpleUploadedFile, "Valid uploaded file details return the file object");

    f = new FileField({maxLength: 5});
    cleanRaisesWithValidationError(f, "Ensure this filename has at most 5 characters (it has 18).", new SimpleUploadedFile("test_maxlength.txt", "hello world"));
    equal(f.clean("", "files/test1.pdf"), "files/test1.pdf");
    equal(f.clean(null, "files/test2.pdf"), "files/test2.pdf");
    ok(f.clean(new SimpleUploadedFile("name", "Some File Content")) instanceof SimpleUploadedFile, "Valid uploaded file details return the file object");
});

test("URLField", function()
{
    var invalidURLs =
        ["foo", "http://", "http://example", "http://example.", "http://.com",
         "http://invalid-.com", "http://-invalid.com", "http://inv-.alid-.com",
         "http://inv-.-alid.com", ".", "com."];

    expect(49);
    var f = new URLField();
    cleanRaisesWithValidationError(f, "This field is required.", "");
    cleanRaisesWithValidationError(f, "This field is required.", null);
    equal(f.clean("http://localhost"), "http://localhost/");
    equal(f.clean("http://example.com"), "http://example.com/");
    equal(f.clean("http://www.example.com:8000/test"), "http://www.example.com:8000/test");
    equal(f.clean("valid-with-hyphens.com"), "http://valid-with-hyphens.com/");
    equal(f.clean("subdomain.domain.com"), "http://subdomain.domain.com/");
    equal(f.clean("http://200.8.9.10"), "http://200.8.9.10/");
    equal(f.clean("http://200.8.9.10:8000/test"), "http://200.8.9.10:8000/test");
    for (var i = 0, url; url = invalidURLs[i]; i++)
    {
        cleanRaisesWithValidationError(f, "Enter a valid URL.", url);
    }

    f = new URLField({required: false});
    strictEqual(f.clean(""), "");
    strictEqual(f.clean(null), "");
    equal(f.clean("http://localhost"), "http://localhost/");
    equal(f.clean("http://example.com"), "http://example.com/");
    equal(f.clean("http://www.example.com:8000/test"), "http://www.example.com:8000/test");
    equal(f.clean("http://200.8.9.10"), "http://200.8.9.10/");
    equal(f.clean("http://200.8.9.10:8000/test"), "http://200.8.9.10:8000/test");
    for (var i = 0, url; url = invalidURLs[i]; i++)
    {
        cleanRaisesWithValidationError(f, "Enter a valid URL.", url);
    }

    function createCatastrophicTestUrl(length)
    {
        var xs = [];
        for (var i = 0; i < length; i++)
        {
            xs[i] = "X";
        }
        return "http://" + xs.join("");
    };

    // Hangs "forever" if catastrophic backtracking not fixed.
    cleanRaisesWithValidationError(f, "Enter a valid URL.", createCatastrophicTestUrl(200));

    // A second test, to make sure the problem is really addressed, even on
    // domains that don't fail the domain label length check in the regex.
    cleanRaisesWithValidationError(f, "Enter a valid URL.", createCatastrophicTestUrl(60));

    // URLField takes an optional verifyExists parameter, which is false by
    // default. This verifies that the URL is live on the Internet and doesn't
    // return a 404 or 500:
    f = new URLField({verifyExists: true});
    equal(f.clean("http://www.google.com"), "http://www.google.com/");
    cleanRaisesWithValidationError(f, "Enter a valid URL.", "http://example");

    // TODO Run these tests when we can check the link
    // Bad domain
    //cleanRaisesWithValidationError(f, "This URL appears to be a broken link.", "http://www.jfoiwjfoi23jfoijoaijfoiwjofiwjefewl.com");
    // Good domain, bad page
    //cleanRaisesWithValidationError(f, "This URL appears to be a broken link.", "http://google.com/we-love-microsoft.html");

    f = new URLField({verifyExists: true, required: false});
    strictEqual(f.clean(""), "");
    equal(f.clean("http://www.google.com"), "http://www.google.com/");

    // URLField also has minLength and maxLength parameters, for convenience
    f = new URLField({minLength: 15, maxLength: 20});
    cleanRaisesWithValidationError(f, "Ensure this value has at least 15 characters (it has 13).", "http://f.com");
    equal(f.clean("http://example.com"), "http://example.com/");
    cleanRaisesWithValidationError(f, "Ensure this value has at most 20 characters (it has 38).", "http://abcdefghijklmnopqrstuvwxyz.com");

    // URLField should prepend "http://" if no scheme was given
    f = new URLField({required: false});
    equal(f.clean("example.com"), "http://example.com/");
    equal(f.clean("https://example.com"), "https://example.com/");
});

test("BooleanField", function()
{
    expect(19);
    var f = new BooleanField();
    cleanRaisesWithValidationError(f, "This field is required.", "");
    cleanRaisesWithValidationError(f, "This field is required.", null);
    strictEqual(f.clean(true), true);
    cleanRaisesWithValidationError(f, "This field is required.", false);
    strictEqual(f.clean(1), true);
    cleanRaisesWithValidationError(f, "This field is required.", 0);
    strictEqual(f.clean("Django rocks"), true);
    strictEqual(f.clean("True"), true);
    // A form's BooleanField with a hidden widget will output the string
    // "False", so that should clean to the boolean value false.
    cleanRaisesWithValidationError(f, "This field is required.", "False");

    f = new BooleanField({required: false});
    strictEqual(f.clean(""), false);
    strictEqual(f.clean(null), false);
    strictEqual(f.clean(true), true);
    strictEqual(f.clean(false), false);
    strictEqual(f.clean(1), true);
    strictEqual(f.clean(0), false);
    strictEqual(f.clean("1"), true);
    strictEqual(f.clean("0"), false);
    strictEqual(f.clean("Django rocks"), true);

    // A form's BooleanField with a hidden widget will output the string
    // 'false', so that should clean to the boolean value false
    strictEqual(f.clean("false"), false);
});

test("ChoiceField", function()
{
    expect(19);
    var f = new ChoiceField({choices: [["1", "One"], ["2", "Two"]]});
    cleanRaisesWithValidationError(f, "This field is required.", "");
    cleanRaisesWithValidationError(f, "This field is required.", null);
    strictEqual(f.clean(1), "1");
    strictEqual(f.clean("1"), "1");
    cleanRaisesWithValidationError(f, "Select a valid choice. 3 is not one of the available choices.", "3");

    var f = new ChoiceField({choices: [["1", "One"], ["2", "One"]], required: false});
    strictEqual(f.clean(""), "");
    strictEqual(f.clean(null), "");
    strictEqual(f.clean(1), "1");
    strictEqual(f.clean("1"), "1");
    cleanRaisesWithValidationError(f, "Select a valid choice. 3 is not one of the available choices.", "3");

    f = new ChoiceField({choices: [["J", "John"], ["P", "Paul"]]});
    equal(f.clean("J"), "J");
    cleanRaisesWithValidationError(f, "Select a valid choice. John is not one of the available choices.", "John");

    f = new ChoiceField({choices: [["Numbers", [["1", "One"], ["2", "Two"]]], ["Letters", [["3", "A"],["4", "B"]]], ["5", "Other"]]});
    strictEqual(f.clean(1), "1");
    strictEqual(f.clean("1"), "1");
    strictEqual(f.clean(3), "3");
    strictEqual(f.clean("3"), "3");
    strictEqual(f.clean(5), "5");
    strictEqual(f.clean("5"), "5");
    cleanRaisesWithValidationError(f, "Select a valid choice. 6 is not one of the available choices.", "6");
});

test("TypedChoiceField", function()
{
    expect(9)
    // TypedChoiceField is just like ChoiceField, except that coerced types wil
    // be returned.
    var f = new TypedChoiceField({
        choices: [[1, "+1"], [-1, "-1"]],
        coerce: function(val) { return parseInt(val, 10); }
    });
    strictEqual(f.clean("1"), 1);
    strictEqual(f.clean("-1"), -1);
    cleanRaisesWithValidationError(f, "Select a valid choice. 2 is not one of the available choices.", "2");

    // Different coercion, same validation
    f.coerce = parseFloat;
    strictEqual(f.clean("1"), 1.0);

    // This can also cause weirdness: be careful (Booleanl(-1) == true, remember)
    f.coerce = Boolean;
    strictEqual(f.clean("-1"), true);

    // Even more weirdness: if you have a valid choice but your coercion
    // function can't coerce, you'll still get a validation error. Don't do this!
    f.coerce = function(val) { return val.toFixed(2); }
    cleanRaisesWithValidationError(f, "Select a valid choice. 1 is not one of the available choices.", "1");

    // Required fields require values
    cleanRaisesWithValidationError(f, "This field is required.", "");

    // Non-required fields aren't required
    f = new TypedChoiceField({
        choices: [[1, "+1"], [-1, "-1"]],
        coerce: function(val) { return parseInt(val, 10); },
        required: false
    });
    strictEqual(f.clean(""), "");

    // If you want cleaning an empty value to return a different type, tell the
    // field.
    f = new TypedChoiceField({
        choices: [[1, "+1"], [-1, "-1"]],
        coerce: function(val) { return parseInt(val, 10); },
        required: false,
        emptyValue: null
    });
    strictEqual(f.clean(""), null);
});

test("NullBooleanField", function()
{
    expect(14);
    var f = new NullBooleanField();
    strictEqual(f.clean(""), null);
    strictEqual(f.clean(true), true);
    strictEqual(f.clean(false), false);
    strictEqual(f.clean(null), null);
    strictEqual(f.clean("0"), false);
    strictEqual(f.clean("1"), true);
    strictEqual(f.clean("2"), null);
    strictEqual(f.clean("3"), null);
    strictEqual(f.clean("hello"), null);

    // Make sure that the internal value is preserved if using HiddenInput (Django #7753)
    var HiddenNullBooleanForm = formFactory({
        fields: function()
        {
            return {
                hidden_nullbool1: new NullBooleanField({widget: HiddenInput, initial: true}),
                hidden_nullbool2: new NullBooleanField({widget: HiddenInput, initial: false})
            };
        }
    });
    f = new HiddenNullBooleanForm({data: {hidden_nullbool1: "true", hidden_nullbool2: "false"}});
    f.fullClean();
    strictEqual(f.cleanedData.hidden_nullbool1, true);
    strictEqual(f.cleanedData.hidden_nullbool2, false);

    // Make sure we're compatible with MySQL, which uses 0 and 1 for its boolean
    // values. (Django #9609)
    var NULLBOOL_CHOICES = [["1", "Yes"], ["0", "No"], ["", "Unknown"]];
    var MySQLNullBooleanForm = formFactory({
        fields: function()
        {
            return {
                nullbool0: new NullBooleanField({widget: new RadioSelect({choices: NULLBOOL_CHOICES})}),
                nullbool1: new NullBooleanField({widget: new RadioSelect({choices: NULLBOOL_CHOICES})}),
                nullbool2: new NullBooleanField({widget: new RadioSelect({choices: NULLBOOL_CHOICES})})
            };
        }
    });
    f = new MySQLNullBooleanForm({data: {nullbool0: "1", nullbool1: "0", nullbool2: ""}});
    f.fullClean();
    strictEqual(f.cleanedData.nullbool0, true);
    strictEqual(f.cleanedData.nullbool1, false);
    strictEqual(f.cleanedData.nullbool2, null);
});

test("MultipleChoiceField", function()
{
    expect(25);
    var f = new MultipleChoiceField({choices: [["1", "1"], ["2", "2"]]});
    cleanRaisesWithValidationError(f, "This field is required.", "");
    cleanRaisesWithValidationError(f, "This field is required.", null);
    deepEqual(f.clean([1]), ["1"]);
    deepEqual(f.clean(["1"]), ["1"]);
    deepEqual(f.clean(["1", "2"]), ["1", "2"]);
    deepEqual(f.clean([1, "2"]), ["1", "2"]);
    cleanRaisesWithValidationError(f, "Enter a list of values.", "hello");
    cleanRaisesWithValidationError(f, "This field is required.", []);
    cleanRaisesWithValidationError(f, "Select a valid choice. 3 is not one of the available choices.", ["3"]);

    var f = new MultipleChoiceField({choices: [["1", "1"], ["2", "2"]], required: false});
    deepEqual(f.clean(""), []);
    deepEqual(f.clean(null), []);
    deepEqual(f.clean([1]), ["1"]);
    deepEqual(f.clean(["1"]), ["1"]);
    deepEqual(f.clean(["1", "2"]), ["1", "2"]);
    deepEqual(f.clean([1, "2"]), ["1", "2"]);
    cleanRaisesWithValidationError(f, "Enter a list of values.", "hello");
    deepEqual(f.clean([]), []);
    cleanRaisesWithValidationError(f, "Select a valid choice. 3 is not one of the available choices.", ["3"]);

    f = new MultipleChoiceField({choices: [["Numbers", [["1", "One"], ["2", "Two"]]], ["Letters", [["3", "A"],["4", "B"]]], ["5", "Other"]]});
    deepEqual(f.clean([1]), ["1"]);
    deepEqual(f.clean([1, 5]), ["1", "5"]);
    deepEqual(f.clean([1, "5"]), ["1", "5"]);
    deepEqual(f.clean(["1", 5]), ["1", "5"]);
    deepEqual(f.clean(["1", "5"]), ["1", "5"]);
    cleanRaisesWithValidationError(f, "Select a valid choice. 6 is not one of the available choices.", ["6"]);
    cleanRaisesWithValidationError(f, "Select a valid choice. 6 is not one of the available choices.", ["1", "6"]);
});

test("ComboField", function()
{
    expect(10);
    // ComboField takes a list of fields that should be used to validate a
    // value, in that order.
    var f = new ComboField({fields: [new CharField({maxLength: 20}), new EmailField()]});
    equal(f.clean("test@example.com"), "test@example.com");
    cleanRaisesWithValidationError(f, "Ensure this value has at most 20 characters (it has 28).", "longemailaddress@example.com");
    cleanRaisesWithValidationError(f, "Enter a valid e-mail address.", "not an e-mail");
    cleanRaisesWithValidationError(f, "This field is required.", "");
    cleanRaisesWithValidationError(f, "This field is required.", null);

    var f = new ComboField({fields: [new CharField({maxLength: 20}), new EmailField()], required: false});
    equal(f.clean("test@example.com"), "test@example.com");
    cleanRaisesWithValidationError(f, "Ensure this value has at most 20 characters (it has 28).", "longemailaddress@example.com");
    cleanRaisesWithValidationError(f, "Enter a valid e-mail address.", "not an e-mail");
    strictEqual(f.clean(""), "");
    strictEqual(f.clean(null), "");
});

// TODO FilePathField

test("SplitDateTimeField", function()
{
    expect(20);
    var f = new SplitDateTimeField();
    strictEqual(f.clean([new Date(2006, 0, 10), new Date(1900, 0, 1, 7, 30)]).valueOf(),
         new Date(2006, 0, 10, 7, 30).valueOf());
    cleanRaisesWithValidationError(f, "This field is required.", "");
    cleanRaisesWithValidationError(f, "This field is required.", null);
    cleanRaisesWithValidationError(f, "Enter a list of values.", "hello");
    cleanRaisesWithValidationError(f, ["Enter a valid date.", "Enter a valid time."], ["hello", "there"]);
    cleanRaisesWithValidationError(f, ["Enter a valid time."], ["2006-01-10", "there"]);
    cleanRaisesWithValidationError(f, ["Enter a valid date."], ["hello", "07:30"]);

    var f = new SplitDateTimeField({required: false});
    strictEqual(f.clean([new Date(2006, 0, 10), new Date(1900, 0, 1, 7, 30)]).valueOf(),
         new Date(2006, 0, 10, 7, 30).valueOf());
    strictEqual(f.clean(["2006-01-10", "07:30"]).valueOf(),
         new Date(2006, 0, 10, 7, 30).valueOf());
    strictEqual(f.clean(null), null);
    strictEqual(f.clean(""), null);
    strictEqual(f.clean([""]), null);
    strictEqual(f.clean(["", ""]), null);
    cleanRaisesWithValidationError(f, "Enter a list of values.", "hello");
    cleanRaisesWithValidationError(f, ["Enter a valid date.", "Enter a valid time."], ["hello", "there"]);
    cleanRaisesWithValidationError(f, ["Enter a valid time."], ["2006-01-10", "there"]);
    cleanRaisesWithValidationError(f, ["Enter a valid date."], ["hello", "07:30"]);
    cleanRaisesWithValidationError(f, ["Enter a valid time."], ["2006-01-10", ""]);
    cleanRaisesWithValidationError(f, ["Enter a valid time."], ["2006-01-10"]);
    cleanRaisesWithValidationError(f, ["Enter a valid date."], ["", "07:30"]);
});

test("IPAddressField", function()
{
    expect(14);
    var f = new IPAddressField();
    cleanRaisesWithValidationError(f, "This field is required.", "");
    cleanRaisesWithValidationError(f, "This field is required.", null);
    equal(f.clean("127.0.0.1"), "127.0.0.1");
    cleanRaisesWithValidationError(f, "Enter a valid IPv4 address.", "foo");
    cleanRaisesWithValidationError(f, "Enter a valid IPv4 address.", "127.0.0.");
    cleanRaisesWithValidationError(f, "Enter a valid IPv4 address.", "1.2.3.4.5");
    cleanRaisesWithValidationError(f, "Enter a valid IPv4 address.", "256.125.1.5");

    f = new IPAddressField({required: false});
    strictEqual(f.clean(""), "");
    strictEqual(f.clean(null), "");
    equal(f.clean("127.0.0.1"), "127.0.0.1");
    cleanRaisesWithValidationError(f, "Enter a valid IPv4 address.", "foo");
    cleanRaisesWithValidationError(f, "Enter a valid IPv4 address.", "127.0.0.");
    cleanRaisesWithValidationError(f, "Enter a valid IPv4 address.", "1.2.3.4.5");
    cleanRaisesWithValidationError(f, "Enter a valid IPv4 address.", "256.125.1.5");
});

})();
