module = QUnit.module;

module("util");

test("contains", function()
{
    expect(4);
    ok(forms.util.contains(["one", "two", "three"], "two"), "Item in Array");
    ok(!forms.util.contains(["one", "two", "three"], "four"), "Item not in Array");
    ok(forms.util.contains("one two three", "two"), "Substring in String");
    ok(!forms.util.contains("one two three", "four"), "Substring not in String");
});

test("prettyName", function()
{
    expect(7);
    // Pretty names we want to support
    equals(forms.util.prettyName("under_score_name"), "Under score name");
    equals(forms.util.prettyName("camelCaseName"), "Camel case name");
    equals(forms.util.prettyName("CONSTANT_STYLE"), "CONSTANT STYLE");

    // These also happen to work...
    equals(forms.util.prettyName("under_LASER_flooring"), "Under LASER flooring");
    equals(forms.util.prettyName("endsWithAcronymLikeLASER"), "Ends with acronym like LASER");
    equals(forms.util.prettyName("StudlyCaps"), "Studly caps");

    // ...but if you insist on using camelCase with acronyms in the middle,
    // you're on your own.
    equals(forms.util.prettyName("butNOTThatClever"), "But nOTThat clever");
});

test("ValidationError", function()
{
    expect(7);
    // Can take a string
    equals(""+forms.ErrorList(forms.ValidationError("There was an error.").messages).asUL(),
           "<ul class=\"errorlist\"><li>There was an error.</li></ul>");

    // Can take a list
    equals(""+forms.ErrorList(forms.ValidationError(["Error one.", "Error two."]).messages).asUL(),
           "<ul class=\"errorlist\"><li>Error one.</li><li>Error two.</li></ul>");

    // Can take a non-string
    function VeryBadError() { }
    VeryBadError.prototype =
    {
        toString: function() { return "A very bad error."; }
    };
    equals(""+forms.ErrorList(forms.ValidationError(new VeryBadError()).messages).asUL(),
           "<ul class=\"errorlist\"><li>A very bad error.</li></ul>");

    // Escapes appropriately
    var example = "Example of link: <a href=\"http://www.example.com/\">example</a>";
    equals(""+forms.ErrorList(forms.ValidationError(example).messages).asUL(),
           "<ul class=\"errorlist\"><li>Example of link: &lt;a href=&quot;http://www.example.com/&quot;&gt;example&lt;/a&gt;</li></ul>");
    equals(""+forms.ErrorList(forms.ValidationError(DOMBuilder.html.markSafe(example)).messages).asUL(),
           "<ul class=\"errorlist\"><li>Example of link: <a href=\"http://www.example.com/\">example</a></li></ul>");
    equals(""+forms.ErrorObject({name: new forms.ErrorList(forms.ValidationError(example).messages)}).asUL(),
           "<ul class=\"errorlist\"><li>name<ul class=\"errorlist\"><li>Example of link: &lt;a href=&quot;http://www.example.com/&quot;&gt;example&lt;/a&gt;</li></ul></li></ul>");
    equals(""+forms.ErrorObject({name: new forms.ErrorList(forms.ValidationError(DOMBuilder.html.markSafe(example)).messages)}).asUL(),
           "<ul class=\"errorlist\"><li>name<ul class=\"errorlist\"><li>Example of link: <a href=\"http://www.example.com/\">example</a></li></ul></li></ul>");
});
