module("util");

test("contains()", function()
{
    expect(6);
    ok(contains(["one", "two", "three"], "two"), "Item in Array");
    ok(!contains(["one", "two", "three"], "four"), "Item not in Array");
    ok(contains("one two three", "two"), "Substring in String");
    ok(!contains("one two three", "four"), "Substring not in String");
    ok(contains({"one": 1, "two": 2, "three": 3}, "two"), "Property in Object");
    ok(!contains({"one": 1, "two": 2, "three": 3}, "four"), "Property not in Object");
});
