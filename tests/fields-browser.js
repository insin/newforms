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

QUnit.test("FileField", 3, function() {
  var f = forms.FileField()
  cleanErrorEqual(f, "This field is required.", "")
  cleanErrorEqual(f, "This field is required.", "", "")
  equal(f.clean("", "files/test1.pdf"), "files/test1.pdf")
})

QUnit.test("ImageField", 1, function() {
  var f = forms.ImageField()
  widgetRendersTo(f, "<span><input accept=\"image/*\" type=\"file\" name=\"f\" id=\"id_f\"></span>")
})

}()