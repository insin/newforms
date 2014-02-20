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
