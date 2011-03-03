module("error messages");

test("CharField", function()
{
    expect(3);
    var e = {
        required: "REQUIRED",
        minLength: "LENGTH %(showValue)s, MIN LENGTH %(limitValue)s",
        maxLength: "LENGTH %(showValue)s, MAX LENGTH %(limitValue)s"
    };
    var f = new forms.CharField({minLength: 5, maxLength: 10, errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "LENGTH 4, MIN LENGTH 5", "1234");
    cleanErrorEqual(f, "LENGTH 11, MAX LENGTH 10", "12345678901");
});

test("IntegerField", function()
{
    expect(4);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID",
        minValue: "MIN VALUE IS %(limitValue)s",
        maxValue: "MAX VALUE IS %(limitValue)s"
    };
    var f = new forms.IntegerField({minValue: 5, maxValue: 10, errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "INVALID", "abc");
    cleanErrorEqual(f, "MIN VALUE IS 5", "4");
    cleanErrorEqual(f, "MAX VALUE IS 10", "11");
});

test("FloatField", function()
{
    expect(4);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID",
        minValue: "MIN VALUE IS %(limitValue)s",
        maxValue: "MAX VALUE IS %(limitValue)s"
    };
    var f = new forms.FloatField({minValue: 5, maxValue: 10, errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "INVALID", "abc");
    cleanErrorEqual(f, "MIN VALUE IS 5", "4");
    cleanErrorEqual(f, "MAX VALUE IS 10", "11");
});

test("DecimalField", function()
{
    expect(7);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID",
        minValue: "MIN VALUE IS %(limitValue)s",
        maxValue: "MAX VALUE IS %(limitValue)s",
        maxDigits: "MAX DIGITS IS %(maxDigits)s",
        maxDecimalPlaces: "MAX DP IS %(maxDecimalPlaces)s",
        maxWholeDigits: "MAX DIGITS BEFORE DP IS %(maxWholeDigits)s"
    };
    var f = new forms.DecimalField({minValue: 5, maxValue: 10, errorMessages: e});
    var f2 = new forms.DecimalField({maxDigits: 4, decimalPlaces: 2, errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "INVALID", "abc");
    cleanErrorEqual(f, "MIN VALUE IS 5", "4");
    cleanErrorEqual(f, "MAX VALUE IS 10", "11");
    cleanErrorEqual(f2, "MAX DIGITS IS 4", "123.45");
    cleanErrorEqual(f2, "MAX DP IS 2", "1.234");
    cleanErrorEqual(f2, "MAX DIGITS BEFORE DP IS 2", "123.4");
});

test("DateField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID"
    };
    var f = new forms.DateField({errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "INVALID", "abc");
});

test("TimeField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID"
    };
    var f = new forms.TimeField({errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "INVALID", "abc");
});

test("DateTimeField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID"
    };
    var f = new forms.DateTimeField({errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "INVALID", "abc");
});

test("RegexField", function()
{
    expect(4);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID",
        minLength: "LENGTH %(showValue)s, MIN LENGTH %(limitValue)s",
        maxLength: "LENGTH %(showValue)s, MAX LENGTH %(limitValue)s"
    };
    var f = new forms.RegexField("^\\d+$", {minLength: 5, maxLength: 10, errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "INVALID", "abcde");
    cleanErrorEqual(f, "LENGTH 4, MIN LENGTH 5", "1234");
    cleanErrorEqual(f, "LENGTH 11, MAX LENGTH 10", "12345678901");
});

test("EmailField", function()
{
    expect(4);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID",
        minLength: "LENGTH %(showValue)s, MIN LENGTH %(limitValue)s",
        maxLength: "LENGTH %(showValue)s, MAX LENGTH %(limitValue)s"
    };
    var f = new forms.EmailField({minLength: 8, maxLength: 10, errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "INVALID", "abcdefgh");
    cleanErrorEqual(f, "LENGTH 7, MIN LENGTH 8", "a@b.com");
    cleanErrorEqual(f, "LENGTH 11, MAX LENGTH 10", "aye@bee.com");
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
        missing: "MISSING",
        empty: "EMPTY FILE"
    };
    var f = new forms.FileField({maxLength: 10, errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "INVALID", "abc");
    cleanErrorEqual(f, "EMPTY FILE", new SimpleUploadedFile("name", null));
    cleanErrorEqual(f, "EMPTY FILE", new SimpleUploadedFile("name", ""));
});

test("URLField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID",
        invalidLink: "INVALID LINK"
    };
    var f = new forms.URLField({verifyExists: true, errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "INVALID", "abc.c");
    //cleanErrorEqual(f, "INVALID LINK", "http://www.broken.djangoproject.com");
});

test("BooleanField", function()
{
    expect(1);
    var e = {
        required: "REQUIRED"
    };
    var f = new forms.BooleanField({errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
});

test("ChoiceField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalidChoice: "%(value)s IS INVALID CHOICE"
    };
    var f = new forms.ChoiceField({choices: [["a", "aye"]], errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "b IS INVALID CHOICE", "b");
});

test("MultipleChoiceField", function()
{
    expect(3);
    var e = {
        required: "REQUIRED",
        invalidChoice: "%(value)s IS INVALID CHOICE",
        invalidList: "NOT A LIST"
    };
    var f = new forms.MultipleChoiceField({choices: [["a", "aye"]], errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "NOT A LIST", "b");
    cleanErrorEqual(f, "b IS INVALID CHOICE", ["b"]);
});

test("SplitDateTimeField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalidDate: "INVALID DATE",
        invalidTime: "INVALID TIME"
    };
    var f = new forms.SplitDateTimeField({errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, ["INVALID DATE", "INVALID TIME"], ["a", "b"]);
});

test("IPAddressField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID IP ADDRESS"
    };
    var f = new forms.IPAddressField({errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "INVALID IP ADDRESS", "127.0.0");
});

test("SlugField", function()
{
    expect(2);
    var e = {
        required: "REQUIRED",
        invalid: "INVALID SLUG"
    };
    var f = new forms.SlugField({errorMessages: e});
    cleanErrorEqual(f, "REQUIRED", "");
    cleanErrorEqual(f, "INVALID SLUG", "a b");
});

test("Overriding forms.ErrorList", function()
{
    expect(4);

    var TestForm = forms.Form({
      first_name: new forms.CharField(),
      last_name: new forms.CharField(),
      birthday: new forms.DateField(),

      clean: function() {
        throw new forms.ValidationError("I like to be awkward.");
      }
    });

    function CustomErrorList() {
      forms.ErrorList.apply(this, arguments);
    }
    forms.inheritFrom(CustomErrorList, forms.ErrorList);
    CustomErrorList.prototype.defaultRendering = function() {
      return this.asDIV();
    }
    CustomErrorList.prototype.asDIV = function() {
      return DOMBuilder.createElement("div", {"class": "error"},
                                      DOMBuilder.map("p", this.errors));
    };

    // This form should render errors the default way.
    var f = new TestForm({data: {first_name: "John"}});
    equal(""+f.boundField("last_name").errors(),
          "<ul class=\"errorlist\"><li>This field is required.</li></ul>");
    equal(""+f.errors("__all__"),
          "<ul class=\"errorlist\"><li>I like to be awkward.</li></ul>");

    f = new TestForm({data: {first_name: "John"}, errorConstructor: CustomErrorList});
    equal(""+f.boundField("last_name").errors(),
          "<div class=\"error\"><p>This field is required.</p></div>");
    equal(""+f.errors("__all__"),
          "<div class=\"error\"><p>I like to be awkward.</p></div>");
});