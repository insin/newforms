void function() {

var _browser

QUnit.module("error messages (server)", {
  setup: function() {
    _browser = forms.env.browser
    forms.env.browser = false
  }
, teardown: function() {
    forms.env.browser =_browser
  }
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

}()