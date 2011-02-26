module("validators");

test("validators", function()
{
    expect(75);

    var now = new Date(90000);
    var later = new Date(100000);
    var earlier = new Date(80000);

    var tests = [
    [validateEmail, "email@here.com", null],
    [validateEmail, "weirder-email@here.and.there.com", null],

    [validateEmail, null, ValidationError],
    [validateEmail, "", ValidationError],
    [validateEmail, "abc", ValidationError],
    [validateEmail, "a @x.cz", ValidationError],
    [validateEmail, "something@@somewhere.com", ValidationError],

    [validateSlug, "slug-ok", null],
    [validateSlug, "longer-slug-still-ok", null],
    [validateSlug, "--------", null],
    [validateSlug, "nohyphensoranything", null],

    [validateSlug, "", ValidationError],
    [validateSlug, " text ", ValidationError],
    [validateSlug, " ", ValidationError],
    [validateSlug, "some@mail.com", ValidationError],
    [validateSlug, "\n", ValidationError],

    [validateIPV4Address, "1.1.1.1", null],
    [validateIPV4Address, "255.0.0.0", null],
    [validateIPV4Address, "0.0.0.0", null],

    [validateIPV4Address, "256.1.1.1", ValidationError],
    [validateIPV4Address, "25.1.1.", ValidationError],
    [validateIPV4Address, "25,1,1,1", ValidationError],
    [validateIPV4Address, "25.1 .1.1", ValidationError],

    [validateCommaSeparatedIntegerList, "1", null],
    [validateCommaSeparatedIntegerList, "1,2,3", null],
    [validateCommaSeparatedIntegerList, "1,2,3,", null],

    [validateCommaSeparatedIntegerList, "", ValidationError],
    [validateCommaSeparatedIntegerList, "a,b,c", ValidationError],
    [validateCommaSeparatedIntegerList, "1, 2, 3", ValidationError],

    [new MaxValueValidator(10), 10, null],
    [new MaxValueValidator(10), -10, null],
    [new MaxValueValidator(10), 0, null],
    [new MaxValueValidator(now), now, null],
    [new MaxValueValidator(now), earlier, null],

    [new MaxValueValidator(0), 1, ValidationError],
    [new MaxValueValidator(now), later, ValidationError],

    [new MinValueValidator(-10), -10, null],
    [new MinValueValidator(-10), 10, null],
    [new MinValueValidator(-10), 0, null],
    [new MinValueValidator(1), now, null],
    [new MinValueValidator(now), later, null],

    [new MinValueValidator(0), -1, ValidationError],

    [new MaxLengthValidator(10), "", null],
    [new MaxLengthValidator(10), "xxxxxxxxxx", null],

    [new MaxLengthValidator(10), "xxxxxxxxxxxxxxx", ValidationError],

    [new MinLengthValidator(10), "xxxxxxxxxxxxxxx", null],
    [new MinLengthValidator(10), "xxxxxxxxxxxxxxx", null],

    [new MinLengthValidator(10), "", ValidationError],

    [new URLValidator(), "http://www.djangoproject.com/", null],
    [new URLValidator(), "http://localhost/", null],
    [new URLValidator(), "http://example.com/", null],
    [new URLValidator(), "http://www.example.com/", null],
    [new URLValidator(), "http://www.example.com:8000/test", null],
    [new URLValidator(), "http://valid-with-hyphens.com/", null],
    [new URLValidator(), "http://subdomain.example.com/", null],
    [new URLValidator(), "http://200.8.9.10/", null],
    [new URLValidator(), "http://200.8.9.10:8000/test", null],
    [new URLValidator(), "http://valid-----hyphens.com/", null],
    [new URLValidator(), "http://example.com?something=value", null],
    [new URLValidator(), "http://example.com/index.php?something=value&another=value2", null],

    [new URLValidator(), "foo", ValidationError],
    [new URLValidator(), "http://", ValidationError],
    [new URLValidator(), "http://example", ValidationError],
    [new URLValidator(), "http://example.", ValidationError],
    [new URLValidator(), "http://.com", ValidationError],
    [new URLValidator(), "http://invalid-.com", ValidationError],
    [new URLValidator(), "http://-invalid.com", ValidationError],
    [new URLValidator(), "http://inv-.alid-.com", ValidationError],

    [new BaseValidator(true), true, null],
    [new BaseValidator(true), false, ValidationError],

    [new RegexValidator(".*"), "", null],
    [new RegexValidator(/.*/), "", null],
    [new RegexValidator(".*"), "xxxxx", null],

    [new RegexValidator("x"), "y", ValidationError],
    [new RegexValidator(/x/), "y", ValidationError]
    ];

    for (var i =0, l = tests.length; i < l; i++)
    {
        var a = tests[i];
        if (a[2] === null)
        {
            callValidator(a[0], a[1]);
            ok(true, "valid value '" + a[1] + "' shouldn't raise");
        }
        else
        {
            raises(function() { callValidator(a[0], a[1]); }, "invalid value '" + a[1] + "' should raise");
        }
    }
});
