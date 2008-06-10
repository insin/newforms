module("strptime");

test("Default date formats from django.newforms.fields", function()
{
    expect(11);
    var expected = [2006, 10, 25, 0, 0, 0, 0, 1, -1].join(",");
    equals(strptime("2006-10-25", "%Y-%m-%d").join(","), expected);
    equals(strptime("10/25/2006", "%m/%d/%Y").join(","), expected);
    equals(strptime("10/25/06", "%m/%d/%y").join(","), expected);
    equals(strptime("Oct 25 2006", "%b %d %Y").join(","), expected);
    equals(strptime("Oct 25, 2006", "%b %d, %Y").join(","), expected);
    equals(strptime("25 Oct 2006", "%d %b %Y").join(","), expected);
    equals(strptime("25 Oct, 2006", "%d %b, %Y").join(","), expected);
    equals(strptime("October 25 2006", "%B %d %Y").join(","), expected);
    equals(strptime("October 25, 2006", "%B %d, %Y").join(","), expected);
    equals(strptime("25 October 2006", "%d %B %Y").join(","), expected);
    equals(strptime("25 October, 2006", "%d %B, %Y").join(","), expected);
});

test("Default time formats from django.newforms.fields", function()
{
    expect(2);
    equals(strptime("14:30:59", "%H:%M:%S").join(","),
           [1900, 1, 1, 14, 30, 59, 0, 1, -1].join(","));
    equals(strptime("14:30", "%H:%M").join(","),
           [1900, 1, 1, 14, 30, 0, 0, 1, -1].join(","));
});

test("Default datetime formats from django.newforms.fields", function()
{
    expect(9);
    equals(strptime("2006-10-25 14:30:59", "%Y-%m-%d %H:%M:%S").join(","),
           [2006, 10, 25, 14, 30, 59, 0, 1, -1].join(","));
    equals(strptime("2006-10-25 14:30", "%Y-%m-%d %H:%M").join(","),
           [2006, 10, 25, 14, 30, 0, 0, 1, -1].join(","));
    equals(strptime("2006-10-25", "%Y-%m-%d").join(","),
           [2006, 10, 25, 0, 0, 0, 0, 1, -1].join(","));
    equals(strptime("10/25/2006 14:30:59", "%m/%d/%Y %H:%M:%S").join(","),
           [2006, 10, 25, 14, 30, 59, 0, 1, -1].join(","));
    equals(strptime("10/25/2006 14:30", "%m/%d/%Y %H:%M").join(","),
           [2006, 10, 25, 14, 30, 0, 0, 1, -1].join(","));
    equals(strptime("10/25/2006", "%m/%d/%Y").join(","),
           [2006, 10, 25, 0, 0, 0, 0, 1, -1].join(","));
    equals(strptime("10/25/06 14:30:59", "%m/%d/%y %H:%M:%S").join(","),
           [2006, 10, 25, 14, 30, 59, 0, 1, -1].join(","));
    equals(strptime("10/25/06 14:30", "%m/%d/%y %H:%M").join(","),
           [2006, 10, 25, 14, 30, 0, 0, 1, -1].join(","));
    equals(strptime("10/25/06", "%m/%d/%y").join(","),
           [2006, 10, 25, 0, 0, 0, 0, 1, -1].join(","));
});

test("Leap years", function()
{
    expect(3);
    equals(strptime("2004-02-29", "%Y-%m-%d").join(","),
           [2004, 2, 29, 0, 0, 0, 0, 1, -1].join(","),
           "Divisibile by 4, but not by 100");
    equals(strptime("2000-02-29", "%Y-%m-%d").join(","),
           [2000, 2, 29, 0, 0, 0, 0, 1, -1].join(","),
           "Divisibile by 400");
    try
    {
        strptime("2200-02-29", "%Y-%m-%d");
    }
    catch (e)
    {
        ok(true, "Divisible by 4 and 100, but not by 400, so not a leap year");
    }
});

test("Boundary tests", function()
{
    expect(31);
    var months = [
        ["January", "01", "31", "32"],
        ["February", "02", "28", "29"],
        ["March", "03", "31", "32"],
        ["April", "04", "30", "31"],
        ["May", "05", "31", "32"],
        ["June", "06", "30", "31"],
        ["July", "07", "31", "32"],
        ["August", "08", "31", "32"],
        ["September", "09", "30", "31"],
        ["October", "10", "31", "32"],
        ["November", "11", "30", "31"],
        ["December", "12", "31", "32"]
    ];

    for (var i = 0, month; month = months[i]; i++)
    {
        equals(strptime("2006-" + month[1] + "-" + month[2], "%Y-%m-%d").join(","),
               [2006, parseInt(month[1], 10), parseInt(month[2], 10), 0, 0, 0, 0, 1, -1].join(","),
               month[0] + " has " + month[2] + " days");
        try
        {
            strptime("2006-" + month[1] + "-" + month[3], "%Y-%m-%d");
        }
        catch (e)
        {
            ok(true, month[0] + " only has " + month[2] + " days");
        }
    }

    var boundaries = [
        ["0", "%m", "month"],
        ["13", "%m", "month"],
        ["0", "%d", "day"],
        ["32", "%d", "day"],
        ["24", "%H", "hour"],
        ["60", "%M", "minute"],
        ["60", "%S", "second"]
    ];

    for (var i = 0, boundary; boundary = boundaries[i]; i++)
    {
        try
        {
            strptime(boundary[0], boundary[1]);
        }
        catch (e)
        {
            ok(true, boundary[0] + " is not a valid " + boundary[2]);
        }
    }
});

test("Invalid format strings", function()
{
    expect(2);
    try
    {
        strptime("2006-10-25", "%Y-%m-%d%");
    }
    catch (e)
    {
        ok(true, "Hanging % throws an Error");
    }

    try
    {
        strptime("2006-10-25", "%Y-%m-%d%q");
    }
    catch (e)
    {
        ok(true, "Invalid directive throws an Error");
    }
});