module("error messages");

// Tests that custom error messages are used, when provided

(function()
{

/**
 * Retrieves the first error message from a ValidatonError.
 */
function ve(e)
{
    return e.messages.errors[0];
}

test("CharField", function()
{
    expect(3);
    var e = {
        required: "REQUIRED",
        minLength: "LENGTH %(length)s, MIN LENGTH %(min)s",
        maxLength: "LENGTH %(length)s, MAX LENGTH %(max)s"
    };
    var f = new CharField({minLength: 5, maxLength: 10, errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("1234"); } catch (e) { equals(ve(e), "LENGTH 4, MIN LENGTH 5"); }
    try { f.clean("12345678901"); } catch (e) { equals(ve(e), "LENGTH 11, MAX LENGTH 10"); }
});

test("IntegerField", function()
{
    expect(4);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID",
        minValue: "MIN VALUE IS %(minValue)s",
        maxValue: "MAX VALUE IS %(maxValue)s"
    };
    var f = new IntegerField({minValue: 5, maxValue: 10, errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("abc"); } catch (e) { equals(ve(e), "INVALID"); }
    try { f.clean("4"); } catch (e) { equals(ve(e), "MIN VALUE IS 5"); }
    try { f.clean("11"); } catch (e) { equals(ve(e), "MAX VALUE IS 10"); }
});

test("FloatField", function()
{
    expect(4);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID",
        minValue: "MIN VALUE IS %(minValue)s",
        maxValue: "MAX VALUE IS %(maxValue)s"
    };
    var f = new FloatField({minValue: 5, maxValue: 10, errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("abc"); } catch (e) { equals(ve(e), "INVALID"); }
    try { f.clean("4"); } catch (e) { equals(ve(e), "MIN VALUE IS 5"); }
    try { f.clean("11"); } catch (e) { equals(ve(e), "MAX VALUE IS 10"); }
});

test("DecimalField", function()
{
    expect(7);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID",
        minValue: "MIN VALUE IS %(minValue)s",
        maxValue: "MAX VALUE IS %(maxValue)s",
        maxDigits: "MAX DIGITS IS %(maxDigits)s",
        maxDecimalPlaces: "MAX DP IS %(maxDecimalPlaces)s",
        maxWholeDigits: "MAX DIGITS BEFORE DP IS %(maxWholeDigits)s"
    };
    var f = new DecimalField({minValue: 5, maxValue: 10, errorMessages: e});
    var f2 = new DecimalField({maxDigits: 4, decimalPlaces: 2, errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("abc"); } catch (e) { equals(ve(e), "INVALID"); }
    try { f.clean("4"); } catch (e) { equals(ve(e), "MIN VALUE IS 5"); }
    try { f.clean("11"); } catch (e) { equals(ve(e), "MAX VALUE IS 10"); }
    try { f2.clean("123.45"); } catch (e) { equals(ve(e), "MAX DIGITS IS 4"); }
    try { f2.clean("1.234"); } catch (e) { equals(ve(e), "MAX DP IS 2"); }
    try { f2.clean("123.4"); } catch (e) { equals(ve(e), "MAX DIGITS BEFORE DP IS 2"); }
});

test("DateField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID"
    };
    var f = new DateField({errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("abc"); } catch (e) { equals(ve(e), "INVALID"); }
});

test("TimeField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID"
    };
    var f = new TimeField({errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("abc"); } catch (e) { equals(ve(e), "INVALID"); }
});

test("DateTimeField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID"
    };
    var f = new DateTimeField({errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("abc"); } catch (e) { equals(ve(e), "INVALID"); }
});

test("RegexField", function()
{
    expect(4);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID",
        minLength: "LENGTH %(length)s, MIN LENGTH %(min)s",
        maxLength: "LENGTH %(length)s, MAX LENGTH %(max)s"
    };
    var f = new RegexField("^\\d+$", {minLength: 5, maxLength: 10, errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("abcde"); } catch (e) { equals(ve(e), "INVALID"); }
    try { f.clean("1234"); } catch (e) { equals(ve(e), "LENGTH 4, MIN LENGTH 5"); }
    try { f.clean("12345678901"); } catch (e) { equals(ve(e), "LENGTH 11, MAX LENGTH 10"); }
});

test("EmailField", function()
{
    expect(4);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID",
        minLength: "LENGTH %(length)s, MIN LENGTH %(min)s",
        maxLength: "LENGTH %(length)s, MAX LENGTH %(max)s"
    };
    var f = new EmailField({minLength: 8, maxLength: 10, errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("abcdefgh"); } catch (e) { equals(ve(e), "INVALID"); }
    try { f.clean("a@b.com"); } catch (e) { equals(ve(e), "LENGTH 7, MIN LENGTH 8"); }
    try { f.clean("aye@bee.com"); } catch (e) { equals(ve(e), "LENGTH 11, MAX LENGTH 10"); }
});

test("FileField", function()
{
    expect(4);

    function SimpleUploadedFile(name, content)
    {
        this.name = name;
        this.content = content;
        this.size = (content !== null ? content.length : 0);
    }

    var e = {
        required: "REQUIRED",
        invalid: "INVALID",
        empty: "EMPTY FILE",
        maxLength: "LENGTH %(length)s, MAX LENGTH %(max)s"
    };
    var f = new FileField({maxLength: 10, errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("abc"); } catch (e) { equals(ve(e), "INVALID"); }
    try { f.clean(new SimpleUploadedFile("name", "")); } catch (e) { equals(ve(e), "EMPTY FILE"); }
    try { f.clean(new SimpleUploadedFile("12345678901", "content")); } catch (e) { equals(ve(e), "LENGTH 11, MAX LENGTH 10"); }
});

test("URLField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID",
        invalidLink: "INVALID LINK"
    };
    var f = new URLField({verifyExists: true, errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("abc.c"); } catch (e) { equals(ve(e), "INVALID"); }
    //try { f.clean("http://www.broken.djangoproject.com"); } catch (e) { equals(ve(e), "INVALID LINK"); }
});

test("BooleanField", function()
{
    expect(1);
    var e = {
        required: "REQUIRED"
    };
    var f = new BooleanField({errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
});

test("ChoiceField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalidChoice: "%(value)s IS INVALID CHOICE"
    };
    var f = new ChoiceField({choices: [["a", "aye"]], errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("b"); } catch (e) { equals(ve(e), "b IS INVALID CHOICE"); }
});

test("MultipleChoiceField", function()
{
    expect(3);
    var e = {
        required: "REQUIRED",
        invalidChoice: "%(value)s IS INVALID CHOICE",
        invalidList: "NOT A LIST"
    };
    var f = new MultipleChoiceField({choices: [["a", "aye"]], errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("b"); } catch (e) { equals(ve(e), "NOT A LIST"); }
    try { f.clean(["b"]); } catch (e) { equals(ve(e), "b IS INVALID CHOICE"); }
});

test("SplitDateTimeField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalidDate: "INVALID DATE",
        invalidTime: "INVALID TIME"
    };
    var f = new SplitDateTimeField({errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean(["a", "b"]); } catch (e) { same(e.messages.errors, ["INVALID DATE", "INVALID TIME"]); }
});

test("IPAddressField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID IP ADDRESS"
    };
    var f = new IPAddressField({errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("127.0.0"); } catch (e) { equals(ve(e), "INVALID IP ADDRESS"); }
});

test("SlugField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID SLUG"
    };
    var f = new SlugField({errorMessages: e});
    try { f.clean(""); } catch (e) { equals(ve(e), "REQUIRED"); }
    try { f.clean("a b"); } catch (e) { equals(ve(e), "INVALID SLUG"); }
});

})();