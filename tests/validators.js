module = QUnit.module;

module("validators");

test("validators", function()
{
    expect(76);

    var now = new Date(90000);
    var later = new Date(100000);
    var earlier = new Date(80000);

    var tests = [
    [forms.validateEmail, "email@here.com", null],
    [forms.validateEmail, "weirder-email@here.and.there.com", null],

    [forms.validateEmail, null, forms.ValidationError],
    [forms.validateEmail, "", forms.ValidationError],
    [forms.validateEmail, "abc", forms.ValidationError],
    [forms.validateEmail, "a @x.cz", forms.ValidationError],
    [forms.validateEmail, "something@@somewhere.com", forms.ValidationError],

    [forms.validateSlug, "slug-ok", null],
    [forms.validateSlug, "longer-slug-still-ok", null],
    [forms.validateSlug, "--------", null],
    [forms.validateSlug, "nohyphensoranything", null],

    [forms.validateSlug, "", forms.ValidationError],
    [forms.validateSlug, " text ", forms.ValidationError],
    [forms.validateSlug, " ", forms.ValidationError],
    [forms.validateSlug, "some@mail.com", forms.ValidationError],
    [forms.validateSlug, "\n", forms.ValidationError],

    [forms.validateIPV4Address, "1.1.1.1", null],
    [forms.validateIPV4Address, "255.0.0.0", null],
    [forms.validateIPV4Address, "0.0.0.0", null],

    [forms.validateIPV4Address, "256.1.1.1", forms.ValidationError],
    [forms.validateIPV4Address, "25.1.1.", forms.ValidationError],
    [forms.validateIPV4Address, "25,1,1,1", forms.ValidationError],
    [forms.validateIPV4Address, "25.1 .1.1", forms.ValidationError],

    [forms.validateCommaSeparatedIntegerList, "1", null],
    [forms.validateCommaSeparatedIntegerList, "1,2,3", null],
    [forms.validateCommaSeparatedIntegerList, "1,2,3,", null],

    [forms.validateCommaSeparatedIntegerList, "", forms.ValidationError],
    [forms.validateCommaSeparatedIntegerList, "a,b,c", forms.ValidationError],
    [forms.validateCommaSeparatedIntegerList, "1, 2, 3", forms.ValidationError],

    [new forms.MaxValueValidator(10), 10, null],
    [new forms.MaxValueValidator(10), -10, null],
    [new forms.MaxValueValidator(10), 0, null],
    [new forms.MaxValueValidator(now), now, null],
    [new forms.MaxValueValidator(now), earlier, null],

    [new forms.MaxValueValidator(0), 1, forms.ValidationError],
    [new forms.MaxValueValidator(now), later, forms.ValidationError],

    [new forms.MinValueValidator(-10), -10, null],
    [new forms.MinValueValidator(-10), 10, null],
    [new forms.MinValueValidator(-10), 0, null],
    [new forms.MinValueValidator(1), now, null],
    [new forms.MinValueValidator(now), later, null],

    [new forms.MinValueValidator(0), -1, forms.ValidationError],

    [new forms.MaxLengthValidator(10), "", null],
    [new forms.MaxLengthValidator(10), "xxxxxxxxxx", null],

    [new forms.MaxLengthValidator(10), "xxxxxxxxxxxxxxx", forms.ValidationError],

    [new forms.MinLengthValidator(10), "xxxxxxxxxxxxxxx", null],
    [new forms.MinLengthValidator(10), "xxxxxxxxxxxxxxx", null],

    [new forms.MinLengthValidator(10), "", forms.ValidationError],

    [new forms.URLValidator(), "http://www.djangoproject.com/", null],
    [new forms.URLValidator(), "ftp://www.djangoproject.com/", null],
    [new forms.URLValidator(), "http://localhost/", null],
    [new forms.URLValidator(), "http://example.com/", null],
    [new forms.URLValidator(), "http://www.example.com/", null],
    [new forms.URLValidator(), "http://www.example.com:8000/test", null],
    [new forms.URLValidator(), "http://valid-with-hyphens.com/", null],
    [new forms.URLValidator(), "http://subdomain.example.com/", null],
    [new forms.URLValidator(), "http://200.8.9.10/", null],
    [new forms.URLValidator(), "http://200.8.9.10:8000/test", null],
    [new forms.URLValidator(), "http://valid-----hyphens.com/", null],
    [new forms.URLValidator(), "http://example.com?something=value", null],
    [new forms.URLValidator(), "http://example.com/index.php?something=value&another=value2", null],

    [new forms.URLValidator(), "foo", forms.ValidationError],
    [new forms.URLValidator(), "http://", forms.ValidationError],
    [new forms.URLValidator(), "http://example", forms.ValidationError],
    [new forms.URLValidator(), "http://example.", forms.ValidationError],
    [new forms.URLValidator(), "http://.com", forms.ValidationError],
    [new forms.URLValidator(), "http://invalid-.com", forms.ValidationError],
    [new forms.URLValidator(), "http://-invalid.com", forms.ValidationError],
    [new forms.URLValidator(), "http://inv-.alid-.com", forms.ValidationError],

    [new forms.BaseValidator(true), true, null],
    [new forms.BaseValidator(true), false, forms.ValidationError],

    [new forms.RegexValidator(".*"), "", null],
    [new forms.RegexValidator(/.*/), "", null],
    [new forms.RegexValidator(".*"), "xxxxx", null],

    [new forms.RegexValidator("x"), "y", forms.ValidationError],
    [new forms.RegexValidator(/x/), "y", forms.ValidationError]
    ];

    for (var i =0, l = tests.length; i < l; i++)
    {
        var a = tests[i];
        if (a[2] === null)
        {
            forms.callValidator(a[0], a[1]);
            ok(true, "valid value '" + a[1] + "' shouldn't raise");
        }
        else
        {
            raises(function() { forms.callValidator(a[0], a[1]); }, "invalid value '" + a[1] + "' should raise");
        }
    }
});
