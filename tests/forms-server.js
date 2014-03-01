void function() {

var _browser

QUnit.module("forms (server)", {
  setup: function() {
    _browser = forms.env.browser
    forms.env.browser = false
  }
, teardown: function() {
    forms.env.browser =_browser
  }
})

QUnit.test("Forms with file fields", 6, function() {
  function SimpleUploadedFile(name, content) {
    this.name = name
    this.content = content
    this.size = (content !== null ? content.length : 0)
  }

  // FileFields are a special case because they take their data from the
  // "files" data object, not "data".
  var FileForm = forms.Form.extend({file1: forms.FileField()})
  var f = new FileForm({autoId: false})
  reactHTMLEqual(f.asTable(),
"<tr><th>File1:</th><td><input type=\"file\" name=\"file1\"></td></tr>")

  f = new FileForm({data: {}, files: {}, autoId: false})
  reactHTMLEqual(f.asTable(),
"<tr><th>File1:</th><td><ul class=\"errorlist\"><li>This field is required.</li></ul><input type=\"file\" name=\"file1\"></td></tr>")

  f = new FileForm({data: {}, files: {file1: new SimpleUploadedFile("name", "")}, autoId: false})
  reactHTMLEqual(f.asTable(),
"<tr><th>File1:</th><td><ul class=\"errorlist\"><li>The submitted file is empty.</li></ul><input type=\"file\" name=\"file1\"></td></tr>")

  f = new FileForm({data: {}, files: {file1: "something that is not a file"}, autoId: false})
  reactHTMLEqual(f.asTable(),
"<tr><th>File1:</th><td><ul class=\"errorlist\"><li>No file was submitted. Check the encoding type on the form.</li></ul><input type=\"file\" name=\"file1\"></td></tr>")

  f = new FileForm({data: {}, files: {file1: new SimpleUploadedFile("name", "some content")}, autoId: false})
  reactHTMLEqual(f.asTable(),
"<tr><th>File1:</th><td><input type=\"file\" name=\"file1\"></td></tr>")
  strictEqual(f.isValid(), true)
})

}()
