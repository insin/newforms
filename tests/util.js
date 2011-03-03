module("util");

test("contains", function()
{
    expect(4);
    ok(forms.util.contains(["one", "two", "three"], "two"), "Item in Array");
    ok(!forms.util.contains(["one", "two", "three"], "four"), "Item not in Array");
    ok(forms.util.contains("one two three", "two"), "Substring in String");
    ok(!forms.util.contains("one two three", "four"), "Substring not in String");
});

test("ValidationError", function()
{
    expect(5);
    // Can take a string
    equals(""+new forms.ErrorList(new forms.ValidationError("There was an error.").messages).asUL(),
           "<ul class=\"errorlist\"><li>There was an error.</li></ul>");

    // Can take a list
    equals(""+new forms.ErrorList(new forms.ValidationError(["Error one.", "Error two."]).messages).asUL(),
           "<ul class=\"errorlist\"><li>Error one.</li><li>Error two.</li></ul>");

    // Can take a non-string
    function VeryBadError() { }
    VeryBadError.prototype =
    {
        toString: function() { return "A very bad error."; }
    };
    equals(""+new forms.ErrorList(new forms.ValidationError(new VeryBadError()).messages).asUL(),
           "<ul class=\"errorlist\"><li>A very bad error.</li></ul>");

    // Escapes appropriately
    var example = "Example of link: <a href=\"http://www.example.com/\">example</a>";
    equals(""+new forms.ErrorList(new forms.ValidationError(example).messages).asUL(),
           "<ul class=\"errorlist\"><li>Example of link: &lt;a href=&quot;http://www.example.com/&quot;&gt;example&lt;/a&gt;</li></ul>");
    equals(""+new forms.ErrorList(new forms.ValidationError(DOMBuilder.markSafe(example)).messages).asUL(),
           "<ul class=\"errorlist\"><li>Example of link: <a href=\"http://www.example.com/\">example</a></li></ul>");
});
