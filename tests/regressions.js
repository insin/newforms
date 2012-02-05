QUnit.module("regressions")

QUnit.test("deepCopy", 1, function() {
    // Copied RegExps were throwing a "called on incompatible Object" exception
    var TestForm = forms.Form.extend({
      regex: forms.RegexField(/test/),
      email: forms.EmailField(),
      url: forms.URLField()
    })
    var f = new TestForm({data: {
      regex: "test",
      email: "test@test.com",
      url: "https://github.com"
    }})
    strictEqual(f.isValid(), true,
                "Copied RegExp fields don't throw exceptions when validating")
})
