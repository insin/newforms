void function() {

var _browser

QUnit.module("widgets (server)", {
  setup: function() {
    _browser = forms.env.browser
    forms.env.browser = false
  }
, teardown: function() {
    forms.env.browser =_browser
  }
})

QUnit.test("ClearableFileInput", 1, function() {
  // ClearableFileInput.valueFromData never returns False if the field
  // is required.
  function SimpleUploadedFile(name, content) {
    this.name = name
    this.content = content
    this.size = (content !== null ? content.length : 0)
  }
  var f = new SimpleUploadedFile("something.txt", "content")
  var w = forms.ClearableFileInput()
  w.isRequired = true
  strictEqual(w.valueFromData({"myfile-clear": true}, {"myfile": f}, "myfile"), f)
})

}()
