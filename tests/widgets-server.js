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

QUnit.test("PasswordInput", 11, function() {
  var w = forms.PasswordInput()
  reactHTMLEqual(w.render("email", ""),
        "<input type=\"password\" name=\"email\">")
  reactHTMLEqual(w.render("email", null),
        "<input type=\"password\" name=\"email\">")
  reactHTMLEqual(w.render("email", "secret"),
        "<input type=\"password\" name=\"email\">")

  // The renderValue argument lets you specify whether the widget should
  // render its value. You may want to do this for security reasons.
  w = forms.PasswordInput({renderValue: true})
  reactHTMLEqual(w.render("email", ""),
        "<input type=\"password\" name=\"email\">")
  reactHTMLEqual(w.render("email", null),
        "<input type=\"password\" name=\"email\">")
  reactHTMLEqual(w.render("email", "test@example.com"),
        "<input type=\"password\" name=\"email\" value=\"test@example.com\">")
  reactHTMLEqual(w.render("email", "some \"quoted\" & ampersanded value"),
        "<input type=\"password\" name=\"email\" value=\"some &quot;quoted&quot; &amp; ampersanded value\">")
  reactHTMLEqual(w.render("email", "test@example.com", {attrs: {"className": "fun"}}),
        "<input type=\"password\" name=\"email\" class=\"fun\" value=\"test@example.com\">")

  // You can also pass "attrs" to the constructor
  w = forms.PasswordInput({attrs: {"className": "fun"}, renderValue: true})
  reactHTMLEqual(w.render("email", ""),
        "<input class=\"fun\" type=\"password\" name=\"email\">")
  reactHTMLEqual(w.render("email", "foo@example.com"),
        "<input class=\"fun\" type=\"password\" name=\"email\" value=\"foo@example.com\">")

  // Attributes passed to render() get precedence over those passed to the constructor
  w = forms.PasswordInput({attrs: {"className": "pretty"}, renderValue: true})
  reactHTMLEqual(w.render("email", "", {attrs: {"className": "special"}}),
        "<input class=\"special\" type=\"password\" name=\"email\">")
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
