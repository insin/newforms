void function() {

var _browser

QUnit.module("fields (server)", {
  setup: function() {
    _browser = forms.env.browser
    forms.env.browser = false
  }
, teardown: function() {
    forms.env.browser =_browser
  }
})

QUnit.test("FileField", 23, function() {
  function SimpleUploadedFile(name, content) {
    this.name = name
    this.content = content
    this.size = (content !== null ? content.length : 0)
  }

  var f = forms.FileField()
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", "", "")
  equal(f.clean("", "files/test1.pdf"), "files/test1.pdf")
  cleanErrorEqual(f, "This field is required.", null)
  cleanErrorEqual(f, "This field is required.", null, "")
  equal(f.clean(null, "files/test2.pdf"), "files/test2.pdf")
  cleanErrorEqual(f, "No file was submitted. Check the encoding type on the form.", new SimpleUploadedFile("", ""))
  cleanErrorEqual(f, "No file was submitted. Check the encoding type on the form.", new SimpleUploadedFile("", ""), "")
  equal(f.clean(null, "files/test3.pdf"), "files/test3.pdf")
  cleanErrorEqual(f, "No file was submitted. Check the encoding type on the form.", "some content that is not a file")
  cleanErrorEqual(f, "The submitted file is empty.", new SimpleUploadedFile("name", null))
  cleanErrorEqual(f, "The submitted file is empty.", new SimpleUploadedFile("name", ""))
  ok(f.clean(new SimpleUploadedFile("name", "Some File Content")) instanceof SimpleUploadedFile, "Valid uploaded file details return the file object")
  ok(f.clean(new SimpleUploadedFile("name", "Some File Content"), "files/test4.pdf") instanceof SimpleUploadedFile, "Valid uploaded file details return the file object")

  f = forms.FileField({maxLength: 5})
  cleanErrorEqual(f, "Ensure this filename has at most 5 characters (it has 18).", new SimpleUploadedFile("test_maxlength.txt", "hello world"))
  equal(f.clean("", "files/test1.pdf"), "files/test1.pdf")
  equal(f.clean(null, "files/test2.pdf"), "files/test2.pdf")
  ok(f.clean(new SimpleUploadedFile("name", "Some File Content")) instanceof SimpleUploadedFile, "Valid uploaded file details return the file object")

  f = forms.FileField({allowEmptyFile: true})
  ok(f.clean(new SimpleUploadedFile("name", "")) instanceof SimpleUploadedFile, "Valid uploaded empty file details return the file object")

  // Test for the behavior of _hasChanged for FileField. The value of data
  // will more than likely come from request.FILES. The value of initial data
  // will likely be a filename stored in the database. Since its value is of
  // no use to a FileField it is ignored.
  f = forms.FileField()

  // No file was uploaded and no initial data
  strictEqual(f._hasChanged("", null), false)

  // A file was uploaded and no initial data
  strictEqual(f._hasChanged("", {filename: "resume.txt", content: "My resume"}), true)

  // A file was not uploaded, but there is initial data
  strictEqual(f._hasChanged("resume.txt", null), false)

  // A file was uploaded and there is initial data (file identity is not dealt
  // with here).
  strictEqual(f._hasChanged("resume.txt", {filename: "resume.txt", content: "My resume"}), true)
})

}()
