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

QUnit.test("ValidationError", 4, function() {
  stop()
  // Can take a string
  reactHTMLEqual(forms.ErrorList(forms.ValidationError("There was an error.").messages).asUL(),
        "<ul class=\"errorlist\"><li>There was an error.</li></ul>")

  // Can take a list
  reactHTMLEqual(forms.ErrorList(forms.ValidationError(["Error one.", "Error two."]).messages).asUL(),
        "<ul class=\"errorlist\"><li>Error one.</li><li>Error two.</li></ul>")

  // Escapes appropriately
  var example = "Example of link: <a href=\"http://www.example.com/\">example</a>"
  reactHTMLEqual(forms.ErrorList(forms.ValidationError(example).messages).asUL(),
        "<ul class=\"errorlist\"><li>Example of link: &lt;a href=&quot;http:&#x2f;&#x2f;www.example.com&#x2f;&quot;&gt;example&lt;&#x2f;a&gt;</li></ul>")
  reactHTMLEqual(forms.ErrorObject({name: new forms.ErrorList(forms.ValidationError(example).messages)}).asUL(),
        "<ul class=\"errorlist\"><li><span>name</span><ul class=\"errorlist\"><li>Example of link: &lt;a href=&quot;http:&#x2f;&#x2f;www.example.com&#x2f;&quot;&gt;example&lt;&#x2f;a&gt;</li></ul></li></ul>")
  start()
})
