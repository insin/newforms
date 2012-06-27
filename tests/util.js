QUnit.module("util")

QUnit.test("prettyName", 7, function() {
  // Pretty names we want to support
  equal(forms.util.prettyName("under_score_name"), "Under score name")
  equal(forms.util.prettyName("camelCaseName"), "Camel case name")
  equal(forms.util.prettyName("CONSTANT_STYLE"), "CONSTANT STYLE")

  // These also happen to work...
  equal(forms.util.prettyName("under_LASER_flooring"), "Under LASER flooring")
  equal(forms.util.prettyName("endsWithAcronymLikeLASER"), "Ends with acronym like LASER")
  equal(forms.util.prettyName("StudlyCaps"), "Studly caps")

  // ...but if you insist on using camelCase with acronyms in the middle,
  // you're on your own.
  equal(forms.util.prettyName("butNOTThatClever"), "But nOTThat clever")
})

QUnit.test("ValidationError", 7, function() {
  // Can take a string
  equal(""+forms.ErrorList(forms.ValidationError("There was an error.").messages).asUL(),
        "<ul class=\"errorlist\"><li>There was an error.</li></ul>")

  // Can take a list
  equal(""+forms.ErrorList(forms.ValidationError(["Error one.", "Error two."]).messages).asUL(),
        "<ul class=\"errorlist\"><li>Error one.</li><li>Error two.</li></ul>")

  // Can take a non-string
  function VeryBadError() {}
  VeryBadError.prototype = {
    toString: function() { return "A very bad error." }
  }
  equal(""+forms.ErrorList(forms.ValidationError(new VeryBadError()).messages).asUL(),
        "<ul class=\"errorlist\"><li>A very bad error.</li></ul>")

  // Escapes appropriately
  var example = "Example of link: <a href=\"http://www.example.com/\">example</a>"
  equal(""+forms.ErrorList(forms.ValidationError(example).messages).asUL(),
        "<ul class=\"errorlist\"><li>Example of link: &lt;a href=&quot;http://www.example.com/&quot;&gt;example&lt;/a&gt;</li></ul>")
  equal(""+forms.ErrorList(forms.ValidationError(DOMBuilder.html.markSafe(example)).messages).asUL(),
        "<ul class=\"errorlist\"><li>Example of link: <a href=\"http://www.example.com/\">example</a></li></ul>")
  equal(""+forms.ErrorObject({name: new forms.ErrorList(forms.ValidationError(example).messages)}).asUL(),
        "<ul class=\"errorlist\"><li>name<ul class=\"errorlist\"><li>Example of link: &lt;a href=&quot;http://www.example.com/&quot;&gt;example&lt;/a&gt;</li></ul></li></ul>")
  equal(""+forms.ErrorObject({name: new forms.ErrorList(forms.ValidationError(DOMBuilder.html.markSafe(example)).messages)}).asUL(),
        "<ul class=\"errorlist\"><li>name<ul class=\"errorlist\"><li>Example of link: <a href=\"http://www.example.com/\">example</a></li></ul></li></ul>")
})
