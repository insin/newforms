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

QUnit.test("#54 - Form.extend() mutates its argument", 1, function() {
  var field1 = forms.CharField()
  var field2 = forms.CharField()
  var fields = {
    type1: {
      field: field1
    },
    type2: {
      field: field2
    }
  }

  var Type1Form = forms.Form.extend(fields.type1)
  var Type2Form = forms.Form.extend(fields.type2)
  deepEqual(fields, {type1: {field: field1}, type2: {field: field2}})
})
