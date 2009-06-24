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

test("ValidationError", function()
{
    expect(5);
    // Can take a string
    equals(""+new ValidationError("There was an error.").messages.asUL(),
           "<ul class=\"errorlist\"><li>There was an error.</li></ul>");

    // Can take a list
    equals(""+new ValidationError(["Error one.", "Error two."]).messages.asUL(),
           "<ul class=\"errorlist\"><li>Error one.</li><li>Error two.</li></ul>");

    // Can take a non-string
    function VeryBadError()
    {
    }
    VeryBadError.prototype =
    {
        toString: function() { return "A very bad error."; }
    };
    equals(""+new ValidationError(new VeryBadError()).messages.asUL(),
           "<ul class=\"errorlist\"><li>A very bad error.</li></ul>");

    // Escapes appropriately
    var example = "Example of link: <a href=\"http://www.example.com/\">example</a>";
    equals(""+new ValidationError(example).messages.asUL(),
           "<ul class=\"errorlist\"><li>Example of link: &lt;a href=&quot;http://www.example.com/&quot;&gt;example&lt;/a&gt;</li></ul>");
    equals(""+new ValidationError(DOMBuilder.markSafe(example)).messages.asUL(),
           "<ul class=\"errorlist\"><li>Example of link: <a href=\"http://www.example.com/\">example</a></li></ul>");
});
