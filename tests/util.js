module("util");

test("contains", function()
{
    expect(6);
    ok(contains(["one", "two", "three"], "two"), "Item in Array");
    ok(!contains(["one", "two", "three"], "four"), "Item not in Array");
    ok(contains("one two three", "two"), "Substring in String");
    ok(!contains("one two three", "four"), "Substring not in String");
    ok(contains({"one": 1, "two": 2, "three": 3}, "two"), "Property in Object");
    ok(!contains({"one": 1, "two": 2, "three": 3}, "four"), "Property not in Object");
});

test("escapeHTML", function()
{
    expect(1);
    equals(escapeHTML("<some>HTML & \"other\" 'junk'</some>"),
           "&lt;some&gt;HTML &amp; &quot;other&quot; &#39;junk&#39;&lt;/some&gt;");
});

test("flatAtt", function()
{
    expect(2)
    equals(flatAtt({}), "", "An object with no properties results in an empty string");
    equals(flatAtt({test: "some&thing", props: "el>se"}), ' test="some&amp;thing" props="el&gt;se"');
});
