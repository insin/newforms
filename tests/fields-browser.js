void function() {

var _browser

QUnit.module("fields (browser)", {
  setup: function() {
    _browser = forms.env.browser
    forms.env.browser = true
  }
, teardown: function() {
    forms.env.browser =_browser
  }
})

QUnit.test("FileField", 8, function() {
  var f = forms.FileField({maxLength: 9})
  // No data, no initial
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", "", "")
  equal(f.clean("", "files/test1.pdf"), "files/test1.pdf",
        'Initial data is returned from clean if there is no data')
  equal(f.clean('test2.pdf', 'files/test1.pdf'), 'test2.pdf',
        'A string is valid data to for cases when the browser does not implement the File API')

  // Data isn't a string and doesn't look like a File
  cleanErrorEqual(f, "No file was submitted. Check the encoding type on the form.", {name: 'test.txt'})

  // File-like objects can be validated on the client
  cleanErrorEqual(f, "The submitted file is empty.", {name: 'test.txt', size: 0})
  cleanErrorEqual(f, "Ensure this filename has at most 9 characters (it has 10).", {name: '1234567890', size: 0})
  var file = {name: 'test.txt', size: 123}
  strictEqual(f.clean(file), file, 'Valid file-likes are returned as-is')
})

QUnit.test('MultipleFileField', 1, function() {
  var f = forms.MultipleFileField({maxLength: 9})

  equal(f.clean('test2.pdf', ['files/test1.pdf']), 'test2.pdf',
        'A string is valid data to for cases when the browser does not implement the File API')
})

QUnit.test("ImageField", 1, function() {
  var f = forms.ImageField()
  widgetRendersTo(f, "<span><input accept=\"image/*\" type=\"file\" name=\"f\" id=\"id_f\"></span>")
})

}()