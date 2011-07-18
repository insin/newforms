module = QUnit.module;

module("validators");

test("validators", function()
{
    expect(78);

    var now = new Date(90000);
    var later = new Date(100000);
    var earlier = new Date(80000);

    var tests = [
        [forms.validateEmail, "email@here.com", null],
        [forms.validateEmail, "weirder-email@here.and.there.com", null],
        [forms.validateEmail, "email@[127.0.0.1]", null],

        [forms.validateEmail, null, forms.ValidationError],
        [forms.validateEmail, "", forms.ValidationError],
        [forms.validateEmail, "abc", forms.ValidationError],
        [forms.validateEmail, "a @x.cz", forms.ValidationError],
        [forms.validateEmail, "something@@somewhere.com", forms.ValidationError],
        [forms.validateEmail, "email@127.0.0.1", forms.ValidationError],

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

        [forms.MaxValueValidator(10), 10, null],
        [forms.MaxValueValidator(10), -10, null],
        [forms.MaxValueValidator(10), 0, null],
        [forms.MaxValueValidator(now), now, null],
        [forms.MaxValueValidator(now), earlier, null],

        [forms.MaxValueValidator(0), 1, forms.ValidationError],
        [forms.MaxValueValidator(now), later, forms.ValidationError],

        [forms.MinValueValidator(-10), -10, null],
        [forms.MinValueValidator(-10), 10, null],
        [forms.MinValueValidator(-10), 0, null],
        [forms.MinValueValidator(1), now, null],
        [forms.MinValueValidator(now), later, null],

        [forms.MinValueValidator(0), -1, forms.ValidationError],

        [forms.MaxLengthValidator(10), "", null],
        [forms.MaxLengthValidator(10), "xxxxxxxxxx", null],

        [forms.MaxLengthValidator(10), "xxxxxxxxxxxxxxx", forms.ValidationError],

        [forms.MinLengthValidator(10), "xxxxxxxxxxxxxxx", null],
        [forms.MinLengthValidator(10), "xxxxxxxxxxxxxxx", null],

        [forms.MinLengthValidator(10), "", forms.ValidationError],

        [forms.URLValidator(), "http://www.djangoproject.com/", null],
        [forms.URLValidator(), "ftp://www.djangoproject.com/", null],
        [forms.URLValidator(), "http://localhost/", null],
        [forms.URLValidator(), "http://example.com/", null],
        [forms.URLValidator(), "http://www.example.com/", null],
        [forms.URLValidator(), "http://www.example.com:8000/test", null],
        [forms.URLValidator(), "http://valid-with-hyphens.com/", null],
        [forms.URLValidator(), "http://subdomain.example.com/", null],
        [forms.URLValidator(), "http://200.8.9.10/", null],
        [forms.URLValidator(), "http://200.8.9.10:8000/test", null],
        [forms.URLValidator(), "http://valid-----hyphens.com/", null],
        [forms.URLValidator(), "http://example.com?something=value", null],
        [forms.URLValidator(), "http://example.com/index.php?something=value&another=value2", null],

        [forms.URLValidator(), "foo", forms.ValidationError],
        [forms.URLValidator(), "http://", forms.ValidationError],
        [forms.URLValidator(), "http://example", forms.ValidationError],
        [forms.URLValidator(), "http://example.", forms.ValidationError],
        [forms.URLValidator(), "http://.com", forms.ValidationError],
        [forms.URLValidator(), "http://invalid-.com", forms.ValidationError],
        [forms.URLValidator(), "http://-invalid.com", forms.ValidationError],
        [forms.URLValidator(), "http://inv-.alid-.com", forms.ValidationError],

        [forms.BaseValidator(true), true, null],
        [forms.BaseValidator(true), false, forms.ValidationError],

        [forms.RegexValidator(".*"), "", null],
        [forms.RegexValidator(/.*/), "", null],
        [forms.RegexValidator(".*"), "xxxxx", null],

        [forms.RegexValidator("x"), "y", forms.ValidationError],
        [forms.RegexValidator(/x/), "y", forms.ValidationError]
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
