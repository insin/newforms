module("strftime");

test("Default date/time format", function()
{
    expect(1);
    equals(strftime(new Date(2006, 9 ,25, 14, 30, 59), "%Y-%m-%d %H:%M:%S"),
           "2006-10-25 14:30:59");
});

test("Invalid format strings", function()
{
    expect(2);
    equals(strftime(new Date(2006, 9 ,25, 14, 30, 59), "%Y-%m-%d %q %H:%M:%S"),
           "2006-10-25  14:30:59",
           "Invalid directives are silently dropped");
    try
    {
        strftime(new Date(2006, 9 ,25, 14, 30, 59), "%Y-%m-%d %H:%M:%S%")
    }
    catch(e)
    {
        ok(true, "Hanging % throws an Error");
    }
});
