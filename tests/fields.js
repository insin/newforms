module("fields");

/**
 * Retrieves the first error message from a ValidatonError.
 */
function ve(e)
{
    return e.messages.errors[0];
}

test("CharField", function()
{
    expect(20);
    var f = new CharField();
    equals(f.clean(1), "1");
    equals(f.clean("hello"), "hello");
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required.");  }
    equals(f.clean([1, 2, 3]), "1,2,3");

    f = new CharField({required: false});
    equals(f.clean(1), "1");
    equals(f.clean("hello"), "hello");
    equals(f.clean(null), "");
    equals(f.clean(""), "");
    equals(f.clean([1, 2, 3]), "1,2,3");

    // CharField accepts an optional maxLength parameter
    f = new CharField({maxLength: 10, required: false});
    equals(f.clean("12345"), "12345");
    equals(f.clean("1234567890"), "1234567890");
    try { f.clean("1234567890a"); } catch (e) { equals(ve(e), "Ensure this value has at most 10 characters (it has 11)."); }

    // CharField accepts an optional minLength parameter
    f = new CharField({minLength: 10, required: false});
    try { f.clean("12345"); } catch (e) { equals(ve(e), "Ensure this value has at least 10 characters (it has 5)."); }
    equals(f.clean("1234567890"), "1234567890");
    equals(f.clean("1234567890a"), "1234567890a");

    f = new CharField({minLength: 10, required: true});
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean("12345"); } catch (e) { equals(ve(e), "Ensure this value has at least 10 characters (it has 5)."); }
    equals(f.clean("1234567890"), "1234567890");
    equals(f.clean("1234567890a"), "1234567890a");
});

test("IntegerField", function()
{
    expect(40);
    var f = new IntegerField();
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean("1"), 1);
    equals(f.clean("23"), 23);
    try { f.clean("a"); } catch (e) { equals(ve(e), "Enter a whole number."); }
    equals(f.clean(42), 42);
    try { f.clean(3.14); } catch (e) { equals(ve(e), "Enter a whole number."); }
    equals(f.clean("1 "), 1);
    equals(f.clean(" 1"), 1);
    equals(f.clean(" 1 "), 1);
    try { f.clean("1a"); } catch (e) { equals(ve(e), "Enter a whole number."); }

    f = new IntegerField({required: false});
    equals(f.clean(""), null);
    equals(f.clean(null), null);
    equals(f.clean("1"), 1);
    equals(f.clean("23"), 23);
    try { f.clean("a"); } catch (e) { equals(ve(e), "Enter a whole number."); }
    equals(f.clean("1 "), 1);
    equals(f.clean(" 1"), 1);
    equals(f.clean(" 1 "), 1);
    try { f.clean("1a"); } catch (e) { equals(ve(e), "Enter a whole number."); }

    // IntegerField accepts an optional maxValue parameter
    f = new IntegerField({maxValue: 10})
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean(1), 1);
    equals(f.clean(10), 10);
    try { f.clean(11); } catch (e) { equals(ve(e), "Ensure this value is less than or equal to 10."); }
    equals(f.clean("10"), 10);
    try { f.clean("11"); } catch (e) { equals(ve(e), "Ensure this value is less than or equal to 10."); }

    // IntegerField accepts an optional minValue parameter
    f = new IntegerField({minValue: 10});
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(1); } catch (e) { equals(ve(e), "Ensure this value is greater than or equal to 10."); }
    equals(f.clean(10), 10);
    equals(f.clean(11), 11);
    equals(f.clean("10"), 10);
    equals(f.clean("11"), 11);

    // minValue and maxValue can be used together
    f = new IntegerField({minValue: 10, maxValue: 20});
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(1); } catch (e) { equals(ve(e), "Ensure this value is greater than or equal to 10."); }
    equals(f.clean(10), 10);
    equals(f.clean(11), 11);
    equals(f.clean("10"), 10);
    equals(f.clean("11"), 11);
    equals(f.clean(20), 20);
    try { f.clean(21); } catch (e) { equals(ve(e), "Ensure this value is less than or equal to 20."); }
});

test("FloatField", function()
{
    expect(19);
    var f = new FloatField();
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean(1), 1.0);
    equals(f.clean(23), 23.0);
    equals(f.clean("3.14"), 3.1400000000000001);
    equals(f.clean(3.14), 3.1400000000000001);
    equals(f.clean(42), 42.0);
    try { f.clean("a"); } catch (e) { equals(ve(e), "Enter a number."); }
    equals(f.clean("1.0 "), 1.0);
    equals(f.clean(" 1.0"), 1.0);
    equals(f.clean(" 1.0 "), 1.0);
    try { f.clean("1.0a"); } catch (e) { equals(ve(e), "Enter a number."); }

    f = new FloatField({required: false});
    equals(f.clean(""), null);
    equals(f.clean(null), null);
    equals(f.clean("1"), 1.0);

    // FloatField accepts minValue and maxValue just like IntegerField
    f = new FloatField({maxValue: 1.5, minValue: 0.5});
    try { f.clean("1.6"); } catch (e) { equals(ve(e), "Ensure this value is less than or equal to 1.5."); }
    try { f.clean("0.4"); } catch (e) { equals(ve(e), "Ensure this value is greater than or equal to 0.5."); }
    equals(f.clean("1.5"), 1.5);
    equals(f.clean("0.5"), 0.5);
});

test("DecimalField", function()
{
    expect(31);
    var f = new DecimalField({maxDigits: 4, decimalPlaces: 2});
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean("1"), 1);
    equals(f.clean("23"), 23);
    equals(f.clean("3.14"), 3.1400000000000001);
    equals(f.clean(3.14), 3.1400000000000001);
    try { f.clean("a"); } catch (e) { equals(ve(e), "Enter a number."); }
    equals(f.clean("1.0 "), 1.0);
    equals(f.clean(" 1.0"), 1.0);
    equals(f.clean(" 1.0 "), 1.0);
    try { f.clean("1.0a"); } catch (e) { equals(ve(e), "Enter a number."); }
    try { f.clean("123.45"); } catch(e) { equals(ve(e), "Ensure that there are no more than 4 digits in total."); }
    try { f.clean("1.234"); } catch(e) { equals(ve(e), "Ensure that there are no more than 2 decimal places."); }
    try { f.clean("123.4"); } catch(e) { equals(ve(e), "Ensure that there are no more than 2 digits before the decimal point."); }
    equals(f.clean("-12.34"), -12.34);
    try { f.clean("-123.45"); } catch(e) { equals(ve(e), "Ensure that there are no more than 4 digits in total."); }
    equals(f.clean("-.12"), -0.12);
    equals(f.clean("-00.12"), -0.12);
    equals(f.clean("-000.12"), -0.12);
    try { f.clean("-000.123"); } catch(e) { equals(ve(e), "Ensure that there are no more than 2 decimal places."); }
    try { f.clean("-000.1234"); } catch(e) { equals(ve(e), "Ensure that there are no more than 4 digits in total."); }
    try { f.clean("--0.12"); } catch (e) { equals(ve(e), "Enter a number."); }

    var f = new DecimalField({maxDigits: 4, decimalPlaces: 2, required: false});
    equals(f.clean(""), null);
    equals(f.clean(null), null);
    equals(f.clean(1), 1);

    // DecimalField accepts min_value and max_value just like IntegerField
    var f = new DecimalField({maxDigits: 4, decimalPlaces: 2, maxValue: 1.5, minValue: 0.5});
    try { f.clean("1.6"); } catch (e) { equals(ve(e), "Ensure this value is less than or equal to 1.5."); }
    try { f.clean("0.4"); } catch (e) { equals(ve(e), "Ensure this value is greater than or equal to 0.5."); }
    equals(f.clean("1.5"), 1.5);
    equals(f.clean("0.5"), 0.5);
    equals(f.clean(".5"), 0.5);
    equals(f.clean("00.50"), 0.5);
});

test("DateField", function()
{
    expect(24);
    var f = new DateField();
    var expected = new Date(2006, 9, 25).valueOf();
    equals(f.clean(new Date(2006, 9, 25)).valueOf(), expected);
    equals(f.clean(new Date(2006, 9, 25, 14, 30)).valueOf(), expected);
    equals(f.clean(new Date(2006, 9, 25, 14, 30, 59)).valueOf(), expected);
    equals(f.clean(new Date(2006, 9, 25, 14, 30, 59, 200)).valueOf(), expected);
    equals(f.clean("2006-10-25").valueOf(), expected);
    equals(f.clean("10/25/2006").valueOf(), expected);
    equals(f.clean("10/25/06").valueOf(), expected);
    equals(f.clean("Oct 25 2006").valueOf(), expected);
    equals(f.clean("October 25 2006").valueOf(), expected);
    equals(f.clean("October 25, 2006").valueOf(), expected);
    equals(f.clean("25 October 2006").valueOf(), expected);
    equals(f.clean("25 October, 2006").valueOf(), expected);
    try { f.clean("2006-4-31"); } catch (e) { equals(ve(e), "Enter a valid date."); }
    try { f.clean("200a-10-25"); } catch (e) { equals(ve(e), "Enter a valid date."); }
    try { f.clean("25/10/06"); } catch (e) { equals(ve(e), "Enter a valid date."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }

    var f = new DateField({required: false});
    equals(f.clean(null), null);
    equals(f.clean(""), null);

    // DateField accepts an optional inputFormats parameter
    var f = new DateField({inputFormats: ["%Y %m %d"]});
    equals(f.clean(new Date(2006, 9, 25)).valueOf(), expected);
    equals(f.clean(new Date(2006, 9, 25, 14, 30)).valueOf(), expected);
    equals(f.clean("2006 10 25").valueOf(), expected);

    // The input_formats parameter overrides all default input formats, so the
    // default formats won't work unless you specify them.
    try { f.clean("2006-10-25"); } catch (e) { equals(ve(e), "Enter a valid date."); }
    try { f.clean("10/25/2006"); } catch (e) { equals(ve(e), "Enter a valid date."); }
    try { f.clean("10/25/06"); } catch (e) { equals(ve(e), "Enter a valid date."); }
});

test("TimeField", function()
{
    expect(11);
    var f = new TimeField();
    equals(f.clean(new Date(1900, 0, 1, 14, 25)).valueOf(), new Date(1900, 0, 1, 14, 25).valueOf());
    equals(f.clean(new Date(1900, 0, 1, 14, 25, 59)).valueOf(), new Date(1900, 0, 1, 14, 25, 59).valueOf());
    equals(f.clean("14:25").valueOf(), new Date(1900, 0, 1, 14, 25).valueOf());
    equals(f.clean("14:25:59").valueOf(), new Date(1900, 0, 1, 14, 25, 59).valueOf());
    try { f.clean("hello"); } catch (e) { equals(ve(e), "Enter a valid time."); }
    try { f.clean("1:24 p.m."); } catch (e) { equals(ve(e), "Enter a valid time."); }

    // TimeField accepts an optional inputFormats parameter
    var f = new TimeField({inputFormats: ["%I:%M %p"]});
    equals(f.clean(new Date(1900, 0, 1, 14, 25)).valueOf(), new Date(1900, 0, 1, 14, 25).valueOf());
    equals(f.clean(new Date(1900, 0, 1, 14, 25, 59)).valueOf(), new Date(1900, 0, 1, 14, 25, 59).valueOf());
    equals(f.clean("4:25 AM").valueOf(), new Date(1900, 0, 1, 4, 25).valueOf());
    equals(f.clean("4:25 PM").valueOf(), new Date(1900, 0, 1, 16, 25).valueOf());

    // The inputFormats parameter overrides all default input formats, so the
    // default formats won't work unless you specify them.
    try { f.clean("14:30:45"); } catch (e) { equals(ve(e), "Enter a valid time."); }
});

test("DateTimeField", function()
{
    expect(26);
    var f = new DateTimeField();
    equals(f.clean(new Date(2006, 9, 25)).valueOf(), new Date(2006, 9, 25).valueOf());
    equals(f.clean(new Date(2006, 9, 25, 14, 30)).valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    equals(f.clean(new Date(2006, 9, 25, 14, 30, 59)).valueOf(), new Date(2006, 9, 25, 14, 30, 59).valueOf());
    equals(f.clean(new Date(2006, 9, 25, 14, 30, 59, 200)).valueOf(), new Date(2006, 9, 25, 14, 30, 59, 200).valueOf());
    equals(f.clean("2006-10-25 14:30:45").valueOf(), new Date(2006, 9, 25, 14, 30, 45).valueOf());
    equals(f.clean("2006-10-25 14:30:00").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    equals(f.clean("2006-10-25 14:30").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    equals(f.clean("2006-10-25").valueOf(), new Date(2006, 9, 25).valueOf());
    equals(f.clean("10/25/2006 14:30:45").valueOf(), new Date(2006, 9, 25, 14, 30, 45).valueOf());
    equals(f.clean("10/25/2006 14:30:00").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    equals(f.clean("10/25/2006 14:30").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    equals(f.clean("10/25/2006").valueOf(), new Date(2006, 9, 25).valueOf());
    equals(f.clean("10/25/06 14:30:45").valueOf(), new Date(2006, 9, 25, 14, 30, 45).valueOf());
    equals(f.clean("10/25/06 14:30:00").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    equals(f.clean("10/25/06 14:30").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    equals(f.clean("10/25/06").valueOf(), new Date(2006, 9, 25).valueOf());
    try { f.clean("hello"); } catch (e) { equals(ve(e), "Enter a valid date/time."); }
    try { f.clean("2006-10-25 4:30 p.m."); } catch (e) { equals(ve(e), "Enter a valid date/time."); }

    // DateField accepts an optional input_formats parameter
    f = new DateTimeField({inputFormats: ["%Y %m %d %I:%M %p"]});
    equals(f.clean(new Date(2006, 9, 25)).valueOf(), new Date(2006, 9, 25).valueOf());
    equals(f.clean(new Date(2006, 9, 25, 14, 30)).valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());
    equals(f.clean(new Date(2006, 9, 25, 14, 30, 59)).valueOf(), new Date(2006, 9, 25, 14, 30, 59).valueOf());
    equals(f.clean(new Date(2006, 9, 25, 14, 30, 59, 200)).valueOf(), new Date(2006, 9, 25, 14, 30, 59, 200).valueOf());
    equals(f.clean("2006 10 25 2:30 PM").valueOf(), new Date(2006, 9, 25, 14, 30).valueOf());

    // The inputFormats parameter overrides all default input formats, so the
    // default formats won't work unless you specify them
    try { f.clean("2006-10-25 14:30:45"); } catch (e) { equals(ve(e), "Enter a valid date/time."); }

    f = new DateTimeField({required: false});
    equals(f.clean(null), null);
    equals(f.clean(""), null);
});

test("RegexField", function()
{
    expect(24);
    var f = new RegexField("^\\d[A-F]\\d$");
    equals(f.clean("2A2"), "2A2");
    equals(f.clean("3F3"), "3F3");
    try { f.clean("3G3"); } catch (e) { equals(ve(e), "Enter a valid value."); }
    try { f.clean(" 2A2"); } catch (e) { equals(ve(e), "Enter a valid value."); }
    try { f.clean("2A2 "); } catch (e) { equals(ve(e), "Enter a valid value."); }
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }

    f = new RegexField("^\\d[A-F]\\d$", {required: false});
    equals(f.clean("2A2"), "2A2");
    equals(f.clean("3F3"), "3F3");
    try { f.clean("3G3"); } catch (e) { equals(ve(e), "Enter a valid value."); }
    equals(f.clean(""), "");

    // Alternatively, RegexField can take a compiled regular expression
    f = new RegexField(/^\d[A-F]\d$/);
    equals(f.clean("2A2"), "2A2");
    equals(f.clean("3F3"), "3F3");
    try { f.clean("3G3"); } catch (e) { equals(ve(e), "Enter a valid value."); }
    try { f.clean(" 2A2"); } catch (e) { equals(ve(e), "Enter a valid value."); }
    try { f.clean("2A2 "); } catch (e) { equals(ve(e), "Enter a valid value."); }

    f = new RegexField("^\\d\\d\\d\\d$", {errorMessages: {invalid: 'Enter a four-digit number.'}});
    equals(f.clean("1234"), "1234");
    try { f.clean("123"); } catch (e) { equals(ve(e), "Enter a four-digit number."); }
    try { f.clean("abcd"); } catch (e) { equals(ve(e), "Enter a four-digit number."); }

    // RegexField also has minLength and maxLength parameters, for convenience
    f = new RegexField("^\\d+$", {minLength: 5, maxLength: 10});
    try { f.clean("123"); } catch (e) { equals(ve(e), "Ensure this value has at least 5 characters (it has 3)."); }
    try { f.clean("abc"); } catch (e) { equals(ve(e), "Ensure this value has at least 5 characters (it has 3)."); }
    equals(f.clean("12345"), "12345");
    equals(f.clean("1234567890"), "1234567890");
    try { f.clean("12345678901"); } catch (e) { equals(ve(e), "Ensure this value has at most 10 characters (it has 11)."); }
    try { f.clean("12345a"); } catch (e) { equals(ve(e), "Enter a valid value."); }
});

test("EmailField", function()
{
    expect(21);
    var f = new EmailField();
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean("person@example.com"), "person@example.com");
    try { f.clean("foo"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }
    try { f.clean("foo@"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }
    try { f.clean("foo@bar"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }
    try { f.clean("example@invalid-.com"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }
    try { f.clean("example@-invalid.com"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }
    try { f.clean("example@inv-.alid-.com"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }
    try { f.clean("example@inv-.-alid.com"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }
    equals(f.clean("example@valid-----hyphens.com"), "example@valid-----hyphens.com");
    equals(f.clean("example@valid-with-hyphens.com"), "example@valid-with-hyphens.com");

    f = new EmailField({required: false});
    equals(f.clean(""), "");
    equals(f.clean(null), "");
    equals(f.clean("person@example.com"), "person@example.com");
    try { f.clean("foo"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }
    try { f.clean("foo@"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }
    try { f.clean("foo@bar"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }

    // EmailField also has minLength and maxLength parameters, for convenience.
    f = new EmailField({minLength: 10, maxLength: 15});
    try { f.clean("a@foo.com"); } catch (e) { equals(ve(e), "Ensure this value has at least 10 characters (it has 9)."); }
    equals(f.clean("alf@foo.com"), "alf@foo.com");
    try { f.clean("alf123456788@foo.com"); } catch (e) { equals(ve(e), "Ensure this value has at most 15 characters (it has 20)."); }
});

test("FileField", function()
{
    expect(14);
    var f = new FileField();
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean("", ""); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean("", "files/test1.pdf"), "files/test1.pdf");
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null, ""); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean("", "files/test2.pdf"), "files/test2.pdf");
    try { f.clean({}); } catch (e) { equals(ve(e), "No file was submitted."); }
    try { f.clean({}, ""); } catch (e) { equals(ve(e), "No file was submitted."); }
    equals(f.clean({}, "files/test3.pdf"), "files/test3.pdf");
    try { f.clean("some content that is not a file"); } catch (e) { equals(ve(e), "No file was submitted. Check the encoding type on the form."); }
    try { f.clean({filename: "name", content: null}); } catch (e) { equals(ve(e), "The submitted file is empty."); }
    try { f.clean({filename: "name", content: ""}); } catch (e) { equals(ve(e), "The submitted file is empty."); }
    ok(f.clean({filename: "name", content: "Some file content"}) instanceof UploadedFile, "Valid uploaded file details result in UploadedFile object");
    ok(f.clean({filename: "name", content: "Some file content"}, "files/test4.pdf") instanceof UploadedFile, "Valid uploaded file details and initial data result in UploadedFile object");
});

test("URLField", function()
{
    var invalidURLs =
        ["foo", "http://", "http://example", "http://example.", "http://.com",
         "http://invalid-.com", "http://-invalid.com", "http://inv-.alid-.com",
         "http://inv-.-alid.com"];

    expect(43);
    var f = new URLField();
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean("http://localhost"), "http://localhost/");
    equals(f.clean("http://example.com"), "http://example.com/");
    equals(f.clean("http://www.example.com:8000/test"), "http://www.example.com:8000/test");
    equals(f.clean("valid-with-hyphens.com"), "http://valid-with-hyphens.com/");
    equals(f.clean("subdomain.domain.com"), "http://subdomain.domain.com/");
    equals(f.clean("http://200.8.9.10"), "http://200.8.9.10/");
    equals(f.clean("http://200.8.9.10:8000/test"), "http://200.8.9.10:8000/test");
    for (var i = 0, url; url = invalidURLs[i]; i++)
    {
        try { f.clean(url); } catch (e) { equals(ve(e), "Enter a valid URL."); }
    }

    f = new URLField({required: false});
    equals(f.clean(""), "");
    equals(f.clean(null), "");
    equals(f.clean("http://localhost"), "http://localhost/");
    equals(f.clean("http://example.com"), "http://example.com/");
    equals(f.clean("http://www.example.com:8000/test"), "http://www.example.com:8000/test");
    equals(f.clean("http://200.8.9.10"), "http://200.8.9.10/");
    equals(f.clean("http://200.8.9.10:8000/test"), "http://200.8.9.10:8000/test");
    for (var i = 0, url; url = invalidURLs[i]; i++)
    {
        try { f.clean(url); } catch (e) { equals(ve(e), "Enter a valid URL."); }
    }

    // URLField takes an optional verifyExists parameter, which is false by
    // default. This verifies that the URL is live on the Internet and doesn't
    // return a 404 or 500:
    f = new URLField({verifyExists: true});
    equals(f.clean("http://www.google.com"), "http://www.google.com/");
    try { f.clean("http://example"); } catch (e) { equals(ve(e), "Enter a valid URL."); }
    try { f.clean("http://www.jfoiwjfoi23jfoijoaijfoiwjofiwjefewl.com") } catch (e) { equals(ve(e), "This URL appears to be a broken link.", "Bad domain"); }
    try { f.clean("http://google.com/we-love-microsoft.html") } catch (e) { equals(ve(e), "This URL appears to be a broken link.", "Good domain, bad page"); }

    f = new URLField({verifyExists: true, required: false});
    equals(f.clean(""), "");
    equals(f.clean("http://www.google.com"), "http://www.google.com/");

    // URLField also has minLength and maxLength parameters, for convenience
    f = new URLField({minLength: 15, maxLength: 20});
    try { f.clean("http://f.com"); } catch (e) { equals(ve(e), "Ensure this value has at least 15 characters (it has 13)."); }
    equals(f.clean("http://example.com"), "http://example.com/");
    try { f.clean("http://abcdefghijklmnopqrstuvwxyz.com"); } catch (e) { equals(ve(e), "Ensure this value has at most 20 characters (it has 38)."); }

    // URLField should prepend "http://" if no scheme was given
    f = new URLField({required: false});
    equals(f.clean("example.com"), "http://example.com/");
    equals(f.clean("https://example.com"), "https://example.com/");
});

test("BooleanField", function()
{
    expect(19);
    var f = new BooleanField();
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean(true), true);
    try { f.clean(false); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean(1), true);
    try { f.clean(0); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean("Django rocks"), true);
    equals(f.clean("True"), true);
    // A form's BooleanField with a hidden widget will output the string
    // "False", so that should clean to the boolean value false.
    try { f.clean("False"); } catch (e) { equals(ve(e), "This field is required."); }

    f = new BooleanField({required: false});
    equals(f.clean(""), false);
    equals(f.clean(null), false);
    equals(f.clean(true), true);
    equals(f.clean(false), false);
    equals(f.clean(1), true);
    equals(f.clean(0), false);
    equals(f.clean("1"), true);
    equals(f.clean("0"), false);
    equals(f.clean("Django rocks"), true);

    // A form's BooleanField with a hidden widget will output the string
    // 'false', so that should clean to the boolean value false
    equals(f.clean("false"), false);
});

test("ChoiceField", function()
{
    expect(19);
    var f = new ChoiceField({choices: [["1", "One"], ["2", "Two"]]});
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean(1), "1");
    equals(f.clean("1"), "1");
    try { f.clean("3"); } catch (e) { equals(ve(e), "Select a valid choice. 3 is not one of the available choices."); }

    var f = new ChoiceField({choices: [["1", "One"], ["2", "One"]], required: false});
    equals(f.clean(""), "");
    equals(f.clean(null), "");
    equals(f.clean(1), "1");
    equals(f.clean("1"), "1");
    try { f.clean("3"); } catch (e) { equals(ve(e), "Select a valid choice. 3 is not one of the available choices."); }

    f = new ChoiceField({choices: [["J", "John"], ["P", "Paul"]]});
    equals(f.clean("J"), "J");
    try { f.clean("John"); } catch (e) { equals(ve(e), "Select a valid choice. John is not one of the available choices."); }

    f = new ChoiceField({choices: [["Numbers", [["1", "One"], ["2", "Two"]]], ["Letters", [["3", "A"],["4", "B"]]], ["5", "Other"]]});
    equals(f.clean(1), "1");
    equals(f.clean("1"), "1");
    equals(f.clean(3), "3");
    equals(f.clean("3"), "3");
    equals(f.clean(5), "5");
    equals(f.clean("5"), "5");
    try { f.clean("6"); } catch (e) { equals(ve(e), "Select a valid choice. 6 is not one of the available choices."); }
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
    same(f.clean("1"), 1);
    same(f.clean("-1"), -1);
    try { f.clean("2"); } catch (e) { equals(ve(e), "Select a valid choice. 2 is not one of the available choices."); }

    // Different coercion, same validation
    f.coerce = parseFloat;
    same(f.clean("1"), 1.0);

    // This can also cause weirdness: be careful (Booleanl(-1) == true, remember)
    f.coerce = Boolean;
    same(f.clean("-1"), true);

    // Even more weirdness: if you have a valid choice but your coercion
    // function can't coerce, you'll still get a validation error. Don't do this!
    f.coerce = function(val) { return val.toFixed(2); }
    try { f.clean("1"); } catch (e) { equals(ve(e), "Select a valid choice. 1 is not one of the available choices."); }

    // Required fields require values
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }

    // Non-required fields aren't required
    f = new TypedChoiceField({
        choices: [[1, "+1"], [-1, "-1"]],
        coerce: function(val) { return parseInt(val, 10); },
        required: false
    });
    same(f.clean(""), "");

    // If you want cleaning an empty value to return a different type, tell the
    // field.
    f = new TypedChoiceField({
        choices: [[1, "+1"], [-1, "-1"]],
        coerce: function(val) { return parseInt(val, 10); },
        required: false,
        emptyValue: null
    });
    same(f.clean(""), null);
});

test("NullBooleanField", function()
{
    expect(14);
    var f = new NullBooleanField();
    equals(f.clean(""), null);
    equals(f.clean(true), true);
    equals(f.clean(false), false);
    equals(f.clean(null), null);
    equals(f.clean("0"), false);
    equals(f.clean("1"), true);
    equals(f.clean("2"), null);
    equals(f.clean("3"), null);
    equals(f.clean("hello"), null);

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
    equals(f.cleanedData.hidden_nullbool1, true);
    equals(f.cleanedData.hidden_nullbool2, false);

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
    equals(f.cleanedData.nullbool0, true);
    equals(f.cleanedData.nullbool1, false);
    equals(f.cleanedData.nullbool2, null);
});

test("MultipleChoiceField", function()
{
    expect(25);
    var f = new MultipleChoiceField({choices: [["1", "1"], ["2", "2"]]});
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    isSet(f.clean([1]), ["1"]);
    isSet(f.clean(["1"]), ["1"]);
    isSet(f.clean(["1", "2"]), ["1", "2"]);
    isSet(f.clean([1, "2"]), ["1", "2"]);
    try { f.clean("hello"); } catch (e) { equals(ve(e), "Enter a list of values."); }
    try { f.clean([]); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(["3"]); } catch (e) { equals(ve(e), "Select a valid choice. 3 is not one of the available choices."); }

    var f = new MultipleChoiceField({choices: [["1", "1"], ["2", "2"]], required: false});
    isSet(f.clean(""), []);
    isSet(f.clean(null), []);
    isSet(f.clean([1]), ["1"]);
    isSet(f.clean(["1"]), ["1"]);
    isSet(f.clean(["1", "2"]), ["1", "2"]);
    isSet(f.clean([1, "2"]), ["1", "2"]);
    try { f.clean("hello"); } catch (e) { equals(ve(e), "Enter a list of values."); }
    isSet(f.clean([]), []);
    try { f.clean(["3"]); } catch (e) { equals(ve(e), "Select a valid choice. 3 is not one of the available choices."); }

    f = new MultipleChoiceField({choices: [["Numbers", [["1", "One"], ["2", "Two"]]], ["Letters", [["3", "A"],["4", "B"]]], ["5", "Other"]]});
    isSet(f.clean([1]), ["1"]);
    isSet(f.clean([1, 5]), ["1", "5"]);
    isSet(f.clean([1, "5"]), ["1", "5"]);
    isSet(f.clean(["1", 5]), ["1", "5"]);
    isSet(f.clean(["1", "5"]), ["1", "5"]);
    try { f.clean(["6"]); } catch (e) { equals(ve(e), "Select a valid choice. 6 is not one of the available choices."); }
    try { f.clean(["1", "6"]); } catch (e) { equals(ve(e), "Select a valid choice. 6 is not one of the available choices."); }
});

test("ComboField", function()
{
    expect(10);
    // ComboField takes a list of fields that should be used to validate a
    // value, in that order.
    var f = new ComboField({fields: [new CharField({maxLength: 20}), new EmailField()]});
    equals(f.clean("test@example.com"), "test@example.com");
    try { f.clean("longemailaddress@example.com"); } catch (e) { equals(ve(e), "Ensure this value has at most 20 characters (it has 28)."); }
    try { f.clean("not an e-mail"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }

    var f = new ComboField({fields: [new CharField({maxLength: 20}), new EmailField()], required: false});
    equals(f.clean("test@example.com"), "test@example.com");
    try { f.clean("longemailaddress@example.com"); } catch (e) { equals(ve(e), "Ensure this value has at most 20 characters (it has 28)."); }
    try { f.clean("not an e-mail"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }
    equals(f.clean(""), "");
    equals(f.clean(null), "");
});

// TODO FilePathField

test("SplitDateTimeField", function()
{
    expect(20);
    var f = new SplitDateTimeField();
    equals(f.clean([new Date(2006, 0, 10), new Date(1900, 0, 1, 7, 30)]).valueOf(),
           new Date(2006, 0, 10, 7, 30).valueOf());
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean("hello"); } catch (e) { equals(ve(e), "Enter a list of values."); }
    try { f.clean(["hello", "there"]); } catch (e) { isSet(e.messages.errors, ["Enter a valid date.", "Enter a valid time."]); }
    try { f.clean(["2006-01-10", "there"]); } catch (e) { isSet(e.messages.errors, ["Enter a valid time."]); }
    try { f.clean(["hello", "07:30"]); } catch (e) { isSet(e.messages.errors, ["Enter a valid date."]); }

    var f = new SplitDateTimeField({required: false});
    equals(f.clean([new Date(2006, 0, 10), new Date(1900, 0, 1, 7, 30)]).valueOf(),
           new Date(2006, 0, 10, 7, 30).valueOf());
    equals(f.clean(["2006-01-10", "07:30"]).valueOf(),
           new Date(2006, 0, 10, 7, 30).valueOf());
    equals(f.clean(null), null);
    equals(f.clean(""), null);
    equals(f.clean([""]), null);
    equals(f.clean(["", ""]), null);
    try { f.clean("hello"); } catch (e) { equals(ve(e), "Enter a list of values."); }
    try { f.clean(["hello", "there"]); } catch (e) { isSet(e.messages.errors, ["Enter a valid date.", "Enter a valid time."]); }
    try { f.clean(["2006-01-10", "there"]); } catch (e) { isSet(e.messages.errors, ["Enter a valid time."]); }
    try { f.clean(["hello", "07:30"]); } catch (e) { isSet(e.messages.errors, ["Enter a valid date."]); }
    try { f.clean(["2006-01-10", ""]); } catch (e) { isSet(e.messages.errors, ["Enter a valid time."]); }
    try { f.clean(["2006-01-10"]); } catch (e) { isSet(e.messages.errors, ["Enter a valid time."]); }
    try { f.clean(["", "07:30"]); } catch (e) { isSet(e.messages.errors, ["Enter a valid date."]); }
});
