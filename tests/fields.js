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
    expect(15);
    var f = new EmailField();
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean("person@example.com"), "person@example.com");
    try { f.clean("foo"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }
    try { f.clean("foo@"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }
    try { f.clean("foo@bar"); } catch (e) { equals(ve(e), "Enter a valid e-mail address."); }

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
    var validURLs = ["http://localhost", "http://example.com",
        "http://www.example.com:8000/test", "http://200.8.9.10",
        "http://200.8.9.10:8000/test"];

    var invalidURLs =
        ["foo", "http://", "http://example", "http://example.", "http://.com"];

    expect(33);
    var f = new URLField();
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    for (var i = 0, url; url = validURLs[i]; i++)
    {
        equals(f.clean(url), url);
    }
    for (var i = 0, url; url = invalidURLs[i]; i++)
    {
        try { f.clean(url); } catch (e) { equals(ve(e), "Enter a valid URL."); }
    }

    f = new URLField({required: false});
    equals(f.clean(""), "");
    equals(f.clean(null), "");
    for (var i = 0, url; url = validURLs[i]; i++)
    {
        equals(f.clean(url), url);
    }
    for (var i = 0, url; url = invalidURLs[i]; i++)
    {
        try { f.clean(url); } catch (e) { equals(ve(e), "Enter a valid URL."); }
    }

    // URLField takes an optional verifyExists parameter, which is false by
    // default. This verifies that the URL is live on the Internet and doesn't
    // return a 404 or 500:
    f = new URLField({verifyExists: true});
    equals(f.clean("http://www.google.com"), "http://www.google.com");
    try { f.clean("http://example"); } catch (e) { equals(ve(e), "Enter a valid URL."); }
    try { f.clean("http://www.jfoiwjfoi23jfoijoaijfoiwjofiwjefewl.com") } catch (e) { equals(ve(e), "This URL appears to be a broken link.", "Bad domain"); }
    try { f.clean("http://google.com/we-love-microsoft.html") } catch (e) { equals(ve(e), "This URL appears to be a broken link.", "Good domain, bad page"); }

    f = new URLField({verifyExists: true, required: false});
    equals(f.clean(""), "");
    equals(f.clean("http://www.google.com"), "http://www.google.com");

    // URLField also has minLength and maxLength parameters, for convenience
    f = new URLField({minLength: 15, maxLength: 20});
    try { f.clean("http://f.com"); } catch (e) { equals(ve(e), "Ensure this value has at least 15 characters (it has 12)."); }
    equals(f.clean("http://example.com"), "http://example.com");
    try { f.clean("http://abcdefghijklmnopqrstuvwxyz.com"); } catch (e) { equals(ve(e), "Ensure this value has at most 20 characters (it has 37)."); }

    // URLField should prepend "http://" if no scheme was given
    f = new URLField({required: false});
    equals(f.clean("example.com"), "http://example.com");
    equals(f.clean("https://example.com"), "https://example.com");
});

test("BooleanField", function()
{
    expect(16);
    var f = new BooleanField();
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean(true), true);
    equals(f.clean(false), false);
    equals(f.clean(1), true);
    equals(f.clean(0), false);
    equals(f.clean("Django rocks"), true);
    equals(f.clean("True"), true);
    // A form's BooleanField with a hidden widget will output the string
    // "False", so that should clean to the boolean value false.
    equals(f.clean("False"), false);

    f = new BooleanField({required: false});
    equals(f.clean(""), false);
    equals(f.clean(null), false);
    equals(f.clean(true), true);
    equals(f.clean(false), false);
    equals(f.clean(1), true);
    equals(f.clean(0), false);
    equals(f.clean("Django rocks"), true);
});

test("ChoiceField", function()
{
    expect(12);
    var f = new ChoiceField({choices: [["1", "1"], ["2", "2"]]});
    try { f.clean(""); } catch (e) { equals(ve(e), "This field is required."); }
    try { f.clean(null); } catch (e) { equals(ve(e), "This field is required."); }
    equals(f.clean(1), "1");
    equals(f.clean("1"), "1");
    try { f.clean("3"); } catch (e) { equals(ve(e), "Select a valid choice. That choice is not one of the available choices."); }

    var f = new ChoiceField({choices: [["1", "1"], ["2", "2"]], required: false});
    equals(f.clean(""), "");
    equals(f.clean(null), "");
    equals(f.clean(1), "1");
    equals(f.clean("1"), "1");
    try { f.clean("3"); } catch (e) { equals(ve(e), "Select a valid choice. That choice is not one of the available choices."); }

    f = new ChoiceField({choices: [["J", "John"], ["P", "Paul"]]});
    equals(f.clean("J"), "J");
    try { f.clean("John"); } catch (e) { equals(ve(e), "Select a valid choice. That choice is not one of the available choices."); }
});

test("NullBooleanField", function()
{
    expect(8);
    var f = new NullBooleanField();
    equals(f.clean(""), null);
    equals(f.clean(true), true);
    equals(f.clean(false), false);
    equals(f.clean(null), null);
    equals(f.clean("1"), null);
    equals(f.clean("2"), null);
    equals(f.clean("3"), null);
    equals(f.clean("hello"), null);
});

test("MultipleChoiceField", function()
{
    expect(18);
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
});
