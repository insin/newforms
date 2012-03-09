QUnit.module("error messages")

QUnit.test("CharField", 3, function() {
  var e = {
    required: "REQUIRED"
  , minLength: "LENGTH {showValue}, MIN LENGTH {limitValue}"
  , maxLength: "LENGTH {showValue}, MAX LENGTH {limitValue}"
  }
  var f = forms.CharField({minLength: 5, maxLength: 10, errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "LENGTH 4, MIN LENGTH 5", "1234")
  cleanErrorEqual(f, "LENGTH 11, MAX LENGTH 10", "12345678901")
})

QUnit.test("IntegerField", 4, function() {
  var e = {
    required: "REQUIRED"
  , invalid: "INVALID"
  , minValue: "MIN VALUE IS {limitValue}"
  , maxValue: "MAX VALUE IS {limitValue}"
  }
  var f = forms.IntegerField({minValue: 5, maxValue: 10, errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "INVALID", "abc")
  cleanErrorEqual(f, "MIN VALUE IS 5", "4")
  cleanErrorEqual(f, "MAX VALUE IS 10", "11")
})

QUnit.test("FloatField", 4, function() {
  var e = {
    required: "REQUIRED"
  , invalid: "INVALID"
  , minValue: "MIN VALUE IS {limitValue}"
  , maxValue: "MAX VALUE IS {limitValue}"
  }
  var f = forms.FloatField({minValue: 5, maxValue: 10, errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "INVALID", "abc")
  cleanErrorEqual(f, "MIN VALUE IS 5", "4")
  cleanErrorEqual(f, "MAX VALUE IS 10", "11")
})

QUnit.test("DecimalField", 7, function() {
  var e = {
    required: "REQUIRED"
  , invalid: "INVALID"
  , minValue: "MIN VALUE IS {limitValue}"
  , maxValue: "MAX VALUE IS {limitValue}"
  , maxDigits: "MAX DIGITS IS {maxDigits}"
  , maxDecimalPlaces: "MAX DP IS {maxDecimalPlaces}"
  , maxWholeDigits: "MAX DIGITS BEFORE DP IS {maxWholeDigits}"
  }
  var f = forms.DecimalField({minValue: 5, maxValue: 10, errorMessages: e})
  var f2 = forms.DecimalField({maxDigits: 4, decimalPlaces: 2, errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "INVALID", "abc")
  cleanErrorEqual(f, "MIN VALUE IS 5", "4")
  cleanErrorEqual(f, "MAX VALUE IS 10", "11")
  cleanErrorEqual(f2, "MAX DIGITS IS 4", "123.45")
  cleanErrorEqual(f2, "MAX DP IS 2", "1.234")
  cleanErrorEqual(f2, "MAX DIGITS BEFORE DP IS 2", "123.4")
})

QUnit.test("DateField", 2, function() {
  var e = {
    required: "REQUIRED"
  , invalid: "INVALID"
  }
  var f = forms.DateField({errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "INVALID", "abc")
})

QUnit.test("TimeField", 2, function() {
  var e = {
    required: "REQUIRED"
  , invalid: "INVALID"
  }
  var f = forms.TimeField({errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "INVALID", "abc")
})

QUnit.test("DateTimeField", 2, function() {
  var e = {
    required: "REQUIRED"
  , invalid: "INVALID"
  }
  var f = forms.DateTimeField({errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "INVALID", "abc")
})

QUnit.test("RegexField", 4, function() {
  var e = {
    required: "REQUIRED"
  , invalid: "INVALID"
  , minLength: "LENGTH {showValue}, MIN LENGTH {limitValue}"
  , maxLength: "LENGTH {showValue}, MAX LENGTH {limitValue}"
  }
  var f = forms.RegexField("^\\d+$", {minLength: 5, maxLength: 10, errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "INVALID", "abcde")
  cleanErrorEqual(f, "LENGTH 4, MIN LENGTH 5", "1234")
  cleanErrorEqual(f, "LENGTH 11, MAX LENGTH 10", "12345678901")
})

QUnit.test("EmailField", 4, function() {
  var e = {
    required: "REQUIRED"
  , invalid: "INVALID"
  , minLength: "LENGTH {showValue}, MIN LENGTH {limitValue}"
  , maxLength: "LENGTH {showValue}, MAX LENGTH {limitValue}"
  }
  var f = forms.EmailField({minLength: 8, maxLength: 10, errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "INVALID", "abcdefgh")
  cleanErrorEqual(f, "LENGTH 7, MIN LENGTH 8", "a@b.com")
  cleanErrorEqual(f, "LENGTH 11, MAX LENGTH 10", "aye@bee.com")
})

QUnit.test("FileField", 4, function() {
  function SimpleUploadedFile(name, content) {
    this.name = name
    this.content = content
    this.size = (content !== null ? content.length : 0)
  }

  var e = {
    required: "REQUIRED"
  , invalid: "INVALID"
  , missing: "MISSING"
  , empty: "EMPTY FILE"
  }
  var f = forms.FileField({maxLength: 10, errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "INVALID", "abc")
  cleanErrorEqual(f, "EMPTY FILE", new SimpleUploadedFile("name", null))
  cleanErrorEqual(f, "EMPTY FILE", new SimpleUploadedFile("name", ""))
})

QUnit.test("URLField", 2, function() {
  var e = {
    required: "REQUIRED"
  , invalid: "INVALID"
  , invalidLink: "INVALID LINK"
  }
  var f = forms.URLField({errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "INVALID", "abc.c")
})

QUnit.test("BooleanField", 1, function() {
  var e = {
    required: "REQUIRED"
  }
  var f = forms.BooleanField({errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
})

QUnit.test("ChoiceField", 2, function() {
  var e = {
    required: "REQUIRED"
  , invalidChoice: "{value} IS INVALID CHOICE"
  }
  var f = forms.ChoiceField({choices: [["a", "aye"]], errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "b IS INVALID CHOICE", "b")
})

QUnit.test("MultipleChoiceField", 3, function() {
  var e = {
    required: "REQUIRED"
  , invalidChoice: "{value} IS INVALID CHOICE"
  , invalidList: "NOT A LIST"
  }
  var f = forms.MultipleChoiceField({choices: [["a", "aye"]], errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "NOT A LIST", "b")
  cleanErrorEqual(f, "b IS INVALID CHOICE", ["b"])
})

QUnit.test("SplitDateTimeField", 2, function() {
  var e = {
    required: "REQUIRED"
  , invalidDate: "INVALID DATE"
  , invalidTime: "INVALID TIME"
  }
  var f = forms.SplitDateTimeField({errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, ["INVALID DATE", "INVALID TIME"], ["a", "b"])
})

QUnit.test("IPAddressField", 2, function() {
  var e = {
    required: "REQUIRED"
  , invalid: "INVALID IP ADDRESS"
  }
  var f = forms.IPAddressField({errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "INVALID IP ADDRESS", "127.0.0")
})

QUnit.test("GenericIPAddressField", 2, function() {
  var e = {
    required: "REQUIRED"
  , invalid: "INVALID IP ADDRESS"
  }
  var f = forms.GenericIPAddressField({errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "INVALID IP ADDRESS", "127.0.0")
})

QUnit.test("SlugField", 2, function() {
  var e = {
    required: "REQUIRED"
  , invalid: "INVALID SLUG"
  }
  var f = forms.SlugField({errorMessages: e})
  cleanErrorEqual(f, "REQUIRED", "")
  cleanErrorEqual(f, "INVALID SLUG", "a b")
})

QUnit.test("Overriding forms.ErrorList", 4, function() {
  var TestForm = forms.Form.extend({
    first_name: forms.CharField(),
    last_name: forms.CharField(),
    birthday: forms.DateField(),

    clean: function() {
      throw forms.ValidationError("I like to be awkward.")
    }
  })

  function CustomErrorList() {
    forms.ErrorList.apply(this, arguments)
  }
  CustomErrorList.prototype = new forms.ErrorList()
  CustomErrorList.prototype.defaultRendering = function() {
    return this.asDIV()
  }
  CustomErrorList.prototype.asDIV = function() {
    return DOMBuilder.createElement("div", {"class": "error"},
                                    DOMBuilder.map("p", {}, this.errors))
  }

  // This form should render errors the default way.
  var f = new TestForm({data: {first_name: "John"}})
  equal(""+f.boundField("last_name").errors(),
        "<ul class=\"errorlist\"><li>This field is required.</li></ul>")
  equal(""+f.errors("__all__"),
        "<ul class=\"errorlist\"><li>I like to be awkward.</li></ul>")

  f = new TestForm({data: {first_name: "John"}, errorConstructor: CustomErrorList})
  equal(""+f.boundField("last_name").errors(),
        "<div class=\"error\"><p>This field is required.</p></div>")
  equal(""+f.errors("__all__"),
        "<div class=\"error\"><p>I like to be awkward.</p></div>")
})

QUnit.test('Field validators', 4, function() {
  // Field validators' error messages should take precedence if the field
  // doesn't have a custom error message defined for their error code.
  var v = forms.RegexValidator(/^[a-zA-Z_.-]+$/, 'VALIDATOR')
  validationErrorEqual(v, 'VALIDATOR', '@@@')
  var f = forms.CharField({maxLength: 255, validators: [v]})
  cleanErrorEqual(f, 'VALIDATOR', '@@@^')

  // A field's custom error message should take precedence if defined...
  f = forms.CharField({maxLength: 255, validators: [v], errorMessages: {invalid: 'FIELD'}})
  cleanErrorEqual(f, 'FIELD', '@@@^')

  // ..unless it happens to be the same as the default.
  f = forms.CharField({maxLength: 255, validators: [v], errorMessages: {invalid: 'Enter a valid value.'}})
  cleanErrorEqual(f, 'VALIDATOR', '@@@^')
})
