module("strftime");

test("Default date/time format", function()
{
    expect(1);
    equals(strftime(new Date(2006, 9 ,25, 14, 30, 59), "%Y-%m-%d %H:%M:%S"),
           "2006-10-25 14:30:59");
});
