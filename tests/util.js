QUnit.module("util")

QUnit.test("prettyName", 7, function() {
  var prettyName = forms.util.prettyName
  // Pretty names we want to support
  equal(prettyName("under_score_name"), "Under score name")
  equal(prettyName("camelCaseName"), "Camel case name")
  equal(prettyName("CONSTANT_STYLE"), "CONSTANT STYLE")

  // These also happen to work...
  equal(prettyName("under_LASER_flooring"), "Under LASER flooring")
  equal(prettyName("endsWithAcronymLikeLASER"), "Ends with acronym like LASER")
  equal(prettyName("StudlyCaps"), "Studly caps")

  // ...but if you insist on using camelCase with acronyms in the middle,
  // you're on your own.
  equal(prettyName("butNOTThatClever"), "But nOTThat clever")
})

QUnit.test("formatToArray", function() {
  var formatToArray = forms.util.formatToArray
  deepEqual(formatToArray('{test}', {}), ['{test}'])
  deepEqual(formatToArray('{test}', {test: 1}), [1])
  deepEqual(formatToArray('{test}{hi}{test}', {test: 1}), [1, '{hi}', 1])
  deepEqual(formatToArray('{test}', {test: 1}, {strip: true}), [1])
  deepEqual(formatToArray('{test}', {test: 1}, {strip: false}), ["", 1, ""])
  deepEqual(formatToArray('{test}{hi}{test}', {test: 1}, {strip: false}),
            ["", 1, "", "{hi}", "", 1, ""])
})
