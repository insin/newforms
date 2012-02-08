QUnit.module("widgets")

QUnit.test("TextInput", 9, function() {
  var w = forms.TextInput()
  equal(""+w.render("email", ""),
        "<input type=\"text\" name=\"email\">")
  equal(""+w.render("email", null),
        "<input type=\"text\" name=\"email\">")
  equal(""+w.render("email", "test@example.com"),
        "<input type=\"text\" name=\"email\" value=\"test@example.com\">")
  equal(""+w.render("email", "some \"quoted\" & ampersanded value"),
        "<input type=\"text\" name=\"email\" value=\"some &quot;quoted&quot; &amp; ampersanded value\">")
  equal(""+w.render("email", "test@example.com", {attrs: {"class": "fun"}}),
        "<input type=\"text\" name=\"email\" class=\"fun\" value=\"test@example.com\">")

  // You can also pass "attrs" to the constructor
  w = forms.TextInput({attrs: {"class": "fun"}})
  equal(""+w.render("email", ""),
        "<input class=\"fun\" type=\"text\" name=\"email\">")
  equal(""+w.render("email", "foo@example.com"),
        "<input class=\"fun\" type=\"text\" name=\"email\" value=\"foo@example.com\">")

  // Attributes passed to render() get precedence over those passed to the constructor
  w = forms.TextInput({attrs: {"class": "pretty"}})
  equal(""+w.render("email", "", {attrs: {"class": "special"}}),
        "<input class=\"special\" type=\"text\" name=\"email\">")

  // Attributes can be safe strings if needed
  w = forms.TextInput({attrs: {"onblur": DOMBuilder.html.markSafe("function('foo')")}})
  equal(""+w.render("email", ""),
        "<input onblur=\"function('foo')\" type=\"text\" name=\"email\">")
})

QUnit.test("PasswordInput", 11, function() {
  var w = forms.PasswordInput()
  equal(""+w.render("email", ""),
        "<input type=\"password\" name=\"email\">")
  equal(""+w.render("email", null),
        "<input type=\"password\" name=\"email\">")
  equal(""+w.render("email", "secret"),
        "<input type=\"password\" name=\"email\">")

  // The renderValue argument lets you specify whether the widget should
  // render its value. You may want to do this for security reasons.
  w = forms.PasswordInput({renderValue: true})
  equal(""+w.render("email", ""),
        "<input type=\"password\" name=\"email\">")
  equal(""+w.render("email", null),
        "<input type=\"password\" name=\"email\">")
  equal(""+w.render("email", "test@example.com"),
        "<input type=\"password\" name=\"email\" value=\"test@example.com\">")
  equal(""+w.render("email", "some \"quoted\" & ampersanded value"),
        "<input type=\"password\" name=\"email\" value=\"some &quot;quoted&quot; &amp; ampersanded value\">")
  equal(""+w.render("email", "test@example.com", {attrs: {"class": "fun"}}),
        "<input type=\"password\" name=\"email\" class=\"fun\" value=\"test@example.com\">")

  // You can also pass "attrs" to the constructor
  w = forms.PasswordInput({attrs: {"class": "fun"}, renderValue: true})
  equal(""+w.render("email", ""),
        "<input class=\"fun\" type=\"password\" name=\"email\">")
  equal(""+w.render("email", "foo@example.com"),
        "<input class=\"fun\" type=\"password\" name=\"email\" value=\"foo@example.com\">")

  // Attributes passed to render() get precedence over those passed to the constructor
  w = forms.PasswordInput({attrs: {"class": "pretty"}, renderValue: true})
  equal(""+w.render("email", "", {attrs: {"class": "special"}}),
        "<input class=\"special\" type=\"password\" name=\"email\">")
})

QUnit.test("HiddenInput", 10, function() {
  var w = forms.HiddenInput()
  equal(""+w.render("email", ""),
        "<input type=\"hidden\" name=\"email\">")
  equal(""+w.render("email", null),
        "<input type=\"hidden\" name=\"email\">")
  equal(""+w.render("email", "test@example.com"),
        "<input type=\"hidden\" name=\"email\" value=\"test@example.com\">")
  equal(""+w.render("email", "some \"quoted\" & ampersanded value"),
        "<input type=\"hidden\" name=\"email\" value=\"some &quot;quoted&quot; &amp; ampersanded value\">")
  equal(""+w.render("email", "test@example.com", {attrs: {"class": "fun"}}),
        "<input type=\"hidden\" name=\"email\" class=\"fun\" value=\"test@example.com\">")

  // You can also pass "attrs" to the constructor
  w = forms.HiddenInput({attrs: {"class": "fun"}})
  equal(""+w.render("email", ""),
        "<input class=\"fun\" type=\"hidden\" name=\"email\">")
  equal(""+w.render("email", "foo@example.com"),
        "<input class=\"fun\" type=\"hidden\" name=\"email\" value=\"foo@example.com\">")

  // Attributes passed to render() get precedence over those passed to the constructor
  w = forms.HiddenInput({attrs: {"class": "pretty"}})
  equal(""+w.render("email", "", {attrs: {"class": "special"}}),
        "<input class=\"special\" type=\"hidden\" name=\"email\">")

  // Boolean values are rendered to their string forms ("true" and "false")
  w = forms.HiddenInput()
  equal(""+w.render('get_spam', false),
        "<input type=\"hidden\" name=\"get_spam\" value=\"false\">")
  equal(""+w.render('get_spam', true),
        "<input type=\"hidden\" name=\"get_spam\" value=\"true\">")
})

QUnit.test("MultipleHiddenInput", 12, function() {
  var w = forms.MultipleHiddenInput()
  strictEqual(""+w.render("email", []), "")
  strictEqual(""+w.render("email", null), "")
  equal(""+w.render("email", ["test@example.com"]),
        "<input type=\"hidden\" name=\"email\" value=\"test@example.com\">")
  equal(""+w.render("email", ["some \"quoted\" & ampersanded value"]),
        "<input type=\"hidden\" name=\"email\" value=\"some &quot;quoted&quot; &amp; ampersanded value\">")
  equal(""+w.render("email", ["test@example.com", "foo@example.com"]),
        "<input type=\"hidden\" name=\"email\" value=\"test@example.com\"><input type=\"hidden\" name=\"email\" value=\"foo@example.com\">")
  equal(""+w.render("email", ["test@example.com"], {attrs: {"class": "fun"}}),
        "<input type=\"hidden\" name=\"email\" class=\"fun\" value=\"test@example.com\">")
  equal(""+w.render("email", ["test@example.com", "foo@example.com"], {attrs: {"class": "fun"}}),
        "<input type=\"hidden\" name=\"email\" class=\"fun\" value=\"test@example.com\"><input type=\"hidden\" name=\"email\" class=\"fun\" value=\"foo@example.com\">")

  // You can also pass "attrs" to the constructor
  w = forms.MultipleHiddenInput({attrs: {"class": "fun"}})
  strictEqual(""+w.render("email", []), "")
  equal(""+w.render("email", ["foo@example.com"]),
        "<input class=\"fun\" type=\"hidden\" name=\"email\" value=\"foo@example.com\">")
  equal(""+w.render("email", ["foo@example.com", "test@example.com"]),
        "<input class=\"fun\" type=\"hidden\" name=\"email\" value=\"foo@example.com\"><input class=\"fun\" type=\"hidden\" name=\"email\" value=\"test@example.com\">")

  // Attributes passed to render() get precedence over those passed to the constructor
  w = forms.MultipleHiddenInput({attrs: {"class": "pretty"}})
  equal(""+w.render("email", ["foo@example.com"], {attrs: {"class": "special"}}),
        "<input class=\"special\" type=\"hidden\" name=\"email\" value=\"foo@example.com\">")

  // Each input gets a unique id
  w = forms.MultipleHiddenInput()
  equal(""+w.render("letters", ["a", "b", "c"], {attrs: {'id': 'hideme'}}),
        "<input type=\"hidden\" name=\"letters\" id=\"hideme_0\" value=\"a\"><input type=\"hidden\" name=\"letters\" id=\"hideme_1\" value=\"b\"><input type=\"hidden\" name=\"letters\" id=\"hideme_2\" value=\"c\">")
})

QUnit.test("FileInput", 11, function() {
  // FileInput widgets don't ever show the value, because the old value is of
  // no use if you are updating the form or if the provided file generated an
  // error.
  var w = forms.FileInput()
  equal(""+w.render("email", ""),
        "<input type=\"file\" name=\"email\">")
  equal(""+w.render("email", null),
        "<input type=\"file\" name=\"email\">")
  equal(""+w.render("email", "test@example.com"),
        "<input type=\"file\" name=\"email\">")
  equal(""+w.render("email", "some \"quoted\" & ampersanded value"),
        "<input type=\"file\" name=\"email\">")
  equal(""+w.render("email", "test@example.com", {attrs: {"class": "fun"}}),
        "<input type=\"file\" name=\"email\" class=\"fun\">")

  // You can also pass "attrs" to the constructor
  w = forms.FileInput({attrs: {"class": "fun"}})
  equal(""+w.render("email", ""),
        "<input class=\"fun\" type=\"file\" name=\"email\">")
  equal(""+w.render("email", "foo@example.com"),
        "<input class=\"fun\" type=\"file\" name=\"email\">")

  // Test for the behavior of _hasChanged for FileInput. The value of data
  // will more than likely come from request.FILES. The value of initial data
  // will likely be a filename stored in the database. Since its value is of
  // no use to a FileInput it is ignored.
  w = forms.FileInput()

  // No file was uploaded and no initial data
  strictEqual(w._hasChanged("", null), false)

  // A file was uploaded and no initial data
  strictEqual(w._hasChanged("", {filename: "resume.txt", content: "My resume"}), true)

  // A file was not uploaded, but there is initial data
  strictEqual(w._hasChanged("resume.txt", null), false)

  // A file was uploaded and there is initial data (file identity is not dealt
  // with here).
  strictEqual(w._hasChanged("resume.txt", {filename: "resume.txt", content: "My resume"}), true)
})

QUnit.test("Textarea", 9, function() {
  var w = forms.Textarea()
  equal(""+w.render("msg", ""),
        "<textarea rows=\"10\" cols=\"40\" name=\"msg\"></textarea>")
  equal(""+w.render("msg", null),
        "<textarea rows=\"10\" cols=\"40\" name=\"msg\"></textarea>")
  equal(""+w.render("msg", "value"),
        "<textarea rows=\"10\" cols=\"40\" name=\"msg\">value</textarea>")
  equal(""+w.render("msg", "some \"quoted\" & ampersanded value"),
        "<textarea rows=\"10\" cols=\"40\" name=\"msg\">some &quot;quoted&quot; &amp; ampersanded value</textarea>")
  equal(""+w.render("msg", DOMBuilder.html.markSafe("pre &quot;quoted&quot; value")),
        "<textarea rows=\"10\" cols=\"40\" name=\"msg\">pre &quot;quoted&quot; value</textarea>")
  equal(""+w.render("msg", "value", {attrs: {"class": "pretty", rows: 20}}),
        "<textarea rows=\"20\" cols=\"40\" name=\"msg\" class=\"pretty\">value</textarea>")

  // You can also pass "attrs" to the constructor
  w = forms.Textarea({attrs: {"class": "pretty"}})
  equal(""+w.render("msg", ""),
        "<textarea rows=\"10\" cols=\"40\" class=\"pretty\" name=\"msg\"></textarea>")
  equal(""+w.render("msg", "example"),
        "<textarea rows=\"10\" cols=\"40\" class=\"pretty\" name=\"msg\">example</textarea>")

  // Attributes passed to render() get precedence over those passed to the constructor
  w = forms.Textarea({attrs: {"class": "pretty"}})
  equal(""+w.render("msg", "", {attrs: {"class": "special"}}),
        "<textarea rows=\"10\" cols=\"40\" class=\"special\" name=\"msg\"></textarea>")
})

QUnit.test("CheckboxInput", 24, function() {
  var w = forms.CheckboxInput()
  equal(""+w.render("is_cool", ""),
        "<input type=\"checkbox\" name=\"is_cool\">")
  equal(""+w.render("is_cool", null),
        "<input type=\"checkbox\" name=\"is_cool\">")
  equal(""+w.render("is_cool", false),
        "<input type=\"checkbox\" name=\"is_cool\">")
  equal(""+w.render("is_cool", true),
        "<input type=\"checkbox\" name=\"is_cool\" checked=\"checked\">")

  // Using any value that's not in ("", null, false, true) will check the
  // checkbox and set the "value" attribute.
  equal(""+w.render("is_cool", "foo"),
        "<input type=\"checkbox\" name=\"is_cool\" value=\"foo\" checked=\"checked\">")

  equal(""+w.render("is_cool", false, {attrs: {"class": "pretty"}}),
        "<input type=\"checkbox\" name=\"is_cool\" class=\"pretty\">")

  // Regression for Django #17114
  equal(''+w.render('is_cool', 0),
        '<input type="checkbox" name="is_cool" value="0" checked="checked">')
  equal(''+w.render('is_cool', 1),
        '<input type="checkbox" name="is_cool" value="1" checked="checked">')

  // You can also pass "attrs" to the constructor
  w = forms.CheckboxInput({attrs: {"class": "pretty"}})
  equal(""+w.render("is_cool", ""),
        "<input class=\"pretty\" type=\"checkbox\" name=\"is_cool\">")

  // Attributes passed to render() get precedence over those passed to the constructor
  w = forms.CheckboxInput({attrs: {"class": "pretty"}})
  equal(""+w.render("is_cool", false, {attrs: {"class": "special"}}),
        "<input class=\"special\" type=\"checkbox\" name=\"is_cool\">")

  // You can pass "checkTest" to the constructor. This is a function that
  // takes the value and returns true if the box should be checked.
  w = forms.CheckboxInput({checkTest: function(value) { return value.indexOf("hello") == 0; }})
  equal(""+w.render("greeting", ""),
        "<input type=\"checkbox\" name=\"greeting\">")
  equal(""+w.render("greeting", "hello"),
        "<input type=\"checkbox\" name=\"greeting\" value=\"hello\" checked=\"checked\">")
  equal(""+w.render("greeting", "hello there"),
        "<input type=\"checkbox\" name=\"greeting\" value=\"hello there\" checked=\"checked\">")
  equal(""+w.render("greeting", "hello & goodbye"),
        "<input type=\"checkbox\" name=\"greeting\" value=\"hello &amp; goodbye\" checked=\"checked\">")

  // A subtlety: If the "checkTest" argument cannot handle a value and throws
  // an exception,  the exception will be swallowed and the box will not be
  // checked. In this example, the "checkTest" assumes the value has an
  // indexOf() method, which fails for the values true, false and null.
  equal(""+w.render("greeting", true),
        "<input type=\"checkbox\" name=\"greeting\">")
  equal(""+w.render("greeting", false),
        "<input type=\"checkbox\" name=\"greeting\">")
  equal(""+w.render("greeting", null),
        "<input type=\"checkbox\" name=\"greeting\">")

  // The CheckboxInput widget will return False if the key is not found in
  // the data (because HTML form submission doesn't send any result for
  // unchecked checkboxes).
  strictEqual(w.valueFromData({}, {}, 'testing'), false)

  strictEqual(w._hasChanged(null, null), false)
  strictEqual(w._hasChanged(null, ""), false)
  strictEqual(w._hasChanged("", ""), false)
  strictEqual(w._hasChanged(false, "on"), true)
  strictEqual(w._hasChanged(true, "on"), false)
  strictEqual(w._hasChanged(true, ""), true)
})

QUnit.test("Select", 13, function() {
  var w = forms.Select()
  equal(""+w.render("beatle", "J", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatle\">\n" +
"<option value=\"J\" selected=\"selected\">John</option>\n" +
"<option value=\"P\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select>")

  // If the value is null, none of the options are selected
  equal(""+w.render("beatle", null, {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatle\">\n" +
"<option value=\"J\">John</option>\n" +
"<option value=\"P\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select>")

  // If the value corresponds to a label (but not to an option value), none of the options are selected
  equal(""+w.render("beatle", "John", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatle\">\n" +
"<option value=\"J\">John</option>\n" +
"<option value=\"P\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select>")

  // Only one option can be selected
  equal(''+w.render('choices', '0', {choices: [['0', '0'], ['1', '1'], ['2', '2'], ['3', '3'], ['0', 'extra']]}),
'<select name="choices">\n' +
'<option value="0" selected="selected">0</option>\n' +
'<option value="1">1</option>\n' +
'<option value="2">2</option>\n' +
'<option value="3">3</option>\n' +
'<option value="0">extra</option>\n' +
'</select>')

  // The value is compared to its String representation
  equal(""+w.render("num", 2, {choices: [['1', '1'], ['2', '2'], ['3', '3']]}),
"<select name=\"num\">\n" +
"<option value=\"1\">1</option>\n" +
"<option value=\"2\" selected=\"selected\">2</option>\n" +
"<option value=\"3\">3</option>\n" +
"</select>")
  equal(""+w.render("num", "2", {choices: [[1, 1], [2, 2], [3, 3]]}),
"<select name=\"num\">\n" +
"<option value=\"1\">1</option>\n" +
"<option value=\"2\" selected=\"selected\">2</option>\n" +
"<option value=\"3\">3</option>\n" +
"</select>")
  equal(""+w.render("num", 2, {choices: [[1, 1], [2, 2], [3, 3]]}),
"<select name=\"num\">\n" +
"<option value=\"1\">1</option>\n" +
"<option value=\"2\" selected=\"selected\">2</option>\n" +
"<option value=\"3\">3</option>\n" +
"</select>")

  // You can also pass "choices" to the constructor:
  w = forms.Select({choices: [[1, 1], [2, 2], [3, 3]]})
  equal(""+w.render("num", 2),
"<select name=\"num\">\n" +
"<option value=\"1\">1</option>\n" +
"<option value=\"2\" selected=\"selected\">2</option>\n" +
"<option value=\"3\">3</option>\n" +
"</select>")

  // If "choices" is passed to both the constructor and render(), then they'll both be in the output
  equal(""+w.render("num", 2, {choices: [[4, 4], [5, 5]]}),
"<select name=\"num\">\n" +
"<option value=\"1\">1</option>\n" +
"<option value=\"2\" selected=\"selected\">2</option>\n" +
"<option value=\"3\">3</option>\n" +
"<option value=\"4\">4</option>\n" +
"<option value=\"5\">5</option>\n" +
"</select>")

  // Choices are escaped correctly
  equal(""+w.render("num", null, {choices: [["bad", "you & me"], ["good", DOMBuilder.html.markSafe("you &gt; me")]]}),
"<select name=\"num\">\n" +
"<option value=\"1\">1</option>\n" +
"<option value=\"2\">2</option>\n" +
"<option value=\"3\">3</option>\n" +
"<option value=\"bad\">you &amp; me</option>\n" +
"<option value=\"good\">you &gt; me</option>\n" +
"</select>")

  // Choices can be nested one level in order to create HTML optgroups
  w.choices = [['outer1', 'Outer 1'], ['Group "1"', [['inner1', 'Inner 1'], ['inner2', 'Inner 2']]]]
  equal(""+w.render("nestchoice", null),
"<select name=\"nestchoice\">\n" +
"<option value=\"outer1\">Outer 1</option>\n" +
"<optgroup label=\"Group &quot;1&quot;\">\n" +
"<option value=\"inner1\">Inner 1</option>\n" +
"<option value=\"inner2\">Inner 2</option>\n" +
"</optgroup>\n" +
"</select>")
  equal(""+w.render("nestchoice", "outer1"),
"<select name=\"nestchoice\">\n" +
"<option value=\"outer1\" selected=\"selected\">Outer 1</option>\n" +
"<optgroup label=\"Group &quot;1&quot;\">\n" +
"<option value=\"inner1\">Inner 1</option>\n" +
"<option value=\"inner2\">Inner 2</option>\n" +
"</optgroup>\n" +
"</select>")
  equal(""+w.render("nestchoice", "inner1"),
"<select name=\"nestchoice\">\n" +
"<option value=\"outer1\">Outer 1</option>\n" +
"<optgroup label=\"Group &quot;1&quot;\">\n" +
"<option value=\"inner1\" selected=\"selected\">Inner 1</option>\n" +
"<option value=\"inner2\">Inner 2</option>\n" +
"</optgroup>\n" +
"</select>")
})

QUnit.test("NullBooleanSelect", 12, function() {
  var w = forms.NullBooleanSelect()
  equal(""+w.render("is_cool", true),
"<select name=\"is_cool\">\n" +
"<option value=\"1\">Unknown</option>\n" +
"<option value=\"2\" selected=\"selected\">Yes</option>\n" +
"<option value=\"3\">No</option>\n" +
"</select>")
  equal(""+w.render("is_cool", false),
"<select name=\"is_cool\">\n" +
"<option value=\"1\">Unknown</option>\n" +
"<option value=\"2\">Yes</option>\n" +
"<option value=\"3\" selected=\"selected\">No</option>\n" +
"</select>")
  equal(""+w.render("is_cool", null),
"<select name=\"is_cool\">\n" +
"<option value=\"1\" selected=\"selected\">Unknown</option>\n" +
"<option value=\"2\">Yes</option>\n" +
"<option value=\"3\">No</option>\n" +
"</select>")
  equal(""+w.render("is_cool", "2"),
"<select name=\"is_cool\">\n" +
"<option value=\"1\">Unknown</option>\n" +
"<option value=\"2\" selected=\"selected\">Yes</option>\n" +
"<option value=\"3\">No</option>\n" +
"</select>")
  equal(""+w.render("is_cool", "3"),
"<select name=\"is_cool\">\n" +
"<option value=\"1\">Unknown</option>\n" +
"<option value=\"2\">Yes</option>\n" +
"<option value=\"3\" selected=\"selected\">No</option>\n" +
"</select>")
  strictEqual(w._hasChanged(false, null), true)
  strictEqual(w._hasChanged(null, false), true)
  strictEqual(w._hasChanged(null, null), false)
  strictEqual(w._hasChanged(false, false), false)
  strictEqual(w._hasChanged(true, false), true)
  strictEqual(w._hasChanged(true, null), true)
  strictEqual(w._hasChanged(true, false), true)
})

QUnit.test("SelectMultiple", 24, function() {
  var w = forms.SelectMultiple()
  equal(""+w.render("beatles", ["J"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatles\" multiple=\"multiple\">\n" +
"<option value=\"J\" selected=\"selected\">John</option>\n" +
"<option value=\"P\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select>")
  equal(""+w.render("beatles", ["J", "P"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatles\" multiple=\"multiple\">\n" +
"<option value=\"J\" selected=\"selected\">John</option>\n" +
"<option value=\"P\" selected=\"selected\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select>")
  equal(""+w.render("beatles", ["J", "P", "R"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatles\" multiple=\"multiple\">\n" +
"<option value=\"J\" selected=\"selected\">John</option>\n" +
"<option value=\"P\" selected=\"selected\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\" selected=\"selected\">Ringo</option>\n" +
"</select>")

  // If the value is null, none of the options are selected
  equal(""+w.render("beatles", null, {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatles\" multiple=\"multiple\">\n" +
"<option value=\"J\">John</option>\n" +
"<option value=\"P\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select>")

  // If the value corresponds to a label (but not to an option value), none of the options are selected
  equal(""+w.render("beatles", ["John"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatles\" multiple=\"multiple\">\n" +
"<option value=\"J\">John</option>\n" +
"<option value=\"P\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select>")

  // Multiple options (with the same value) can be selected
  equal(''+w.render('choices', ['0'], {choices: [['0', '0'], ['1', '1'], ['2', '2'], ['3', '3'], ['0', 'extra']]}),
'<select name="choices" multiple="multiple">\n' +
'<option value="0" selected="selected">0</option>\n' +
'<option value="1">1</option>\n' +
'<option value="2">2</option>\n' +
'<option value="3">3</option>\n' +
'<option value="0" selected="selected">extra</option>\n' +
'</select>')

  // If multiple values are given, but some of them are not valid, the valid ones are selected
  equal(""+w.render("beatles", ["J", "G", "foo"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatles\" multiple=\"multiple\">\n" +
"<option value=\"J\" selected=\"selected\">John</option>\n" +
"<option value=\"P\">Paul</option>\n" +
"<option value=\"G\" selected=\"selected\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select>")

  // The value is compared to its String representation
  equal(""+w.render("nums", [2], {choices: [['1', '1'], ['2', '2'], ['3', '3']]}),
"<select name=\"nums\" multiple=\"multiple\">\n" +
"<option value=\"1\">1</option>\n" +
"<option value=\"2\" selected=\"selected\">2</option>\n" +
"<option value=\"3\">3</option>\n" +
"</select>")
  equal(""+w.render("nums", ["2"], {choices: [[1, 1], [2, 2], [3, 3]]}),
"<select name=\"nums\" multiple=\"multiple\">\n" +
"<option value=\"1\">1</option>\n" +
"<option value=\"2\" selected=\"selected\">2</option>\n" +
"<option value=\"3\">3</option>\n" +
"</select>")
  equal(""+w.render("nums", [2], {choices: [[1, 1], [2, 2], [3, 3]]}),
"<select name=\"nums\" multiple=\"multiple\">\n" +
"<option value=\"1\">1</option>\n" +
"<option value=\"2\" selected=\"selected\">2</option>\n" +
"<option value=\"3\">3</option>\n" +
"</select>")

  // You can also pass "choices" to the constructor:
  w = forms.SelectMultiple({choices: [[1, 1], [2, 2], [3, 3]]})
  equal(""+w.render("nums", [2]),
"<select name=\"nums\" multiple=\"multiple\">\n" +
"<option value=\"1\">1</option>\n" +
"<option value=\"2\" selected=\"selected\">2</option>\n" +
"<option value=\"3\">3</option>\n" +
"</select>")

  // If "choices" is passed to both the constructor and render(), then they'll both be in the output
  equal(""+w.render("nums", [2], {choices: [[4, 4], [5, 5]]}),
"<select name=\"nums\" multiple=\"multiple\">\n" +
"<option value=\"1\">1</option>\n" +
"<option value=\"2\" selected=\"selected\">2</option>\n" +
"<option value=\"3\">3</option>\n" +
"<option value=\"4\">4</option>\n" +
"<option value=\"5\">5</option>\n" +
"</select>")

  // Choices are escaped correctly
  equal(""+w.render("nums", null, {choices: [["bad", "you & me"], ["good", DOMBuilder.html.markSafe("you &gt; me")]]}),
"<select name=\"nums\" multiple=\"multiple\">\n" +
"<option value=\"1\">1</option>\n" +
"<option value=\"2\">2</option>\n" +
"<option value=\"3\">3</option>\n" +
"<option value=\"bad\">you &amp; me</option>\n" +
"<option value=\"good\">you &gt; me</option>\n" +
"</select>")

  // Test the usage of _hasChanged
  strictEqual(w._hasChanged(null, null), false)
  strictEqual(w._hasChanged([], null), false)
  strictEqual(w._hasChanged(null, [""]), true)
  strictEqual(w._hasChanged([1, 2], ["1", "2"]), false)
  strictEqual(w._hasChanged([1, 2], ["1"]), true)
  strictEqual(w._hasChanged([1, 2], ["1", "3"]), true)
  strictEqual(w._hasChanged([2, 1], ["1", "2"]), false)

  // Choices can be nested one level in order to create HTML optgroups
  w.choices = [['outer1', 'Outer 1'], ['Group "1"', [['inner1', 'Inner 1'], ['inner2', 'Inner 2']]]]
  equal(""+w.render("nestchoice", null),
"<select name=\"nestchoice\" multiple=\"multiple\">\n" +
"<option value=\"outer1\">Outer 1</option>\n" +
"<optgroup label=\"Group &quot;1&quot;\">\n" +
"<option value=\"inner1\">Inner 1</option>\n" +
"<option value=\"inner2\">Inner 2</option>\n" +
"</optgroup>\n" +
"</select>")
  equal(""+w.render("nestchoice", ["outer1"]),
"<select name=\"nestchoice\" multiple=\"multiple\">\n" +
"<option value=\"outer1\" selected=\"selected\">Outer 1</option>\n" +
"<optgroup label=\"Group &quot;1&quot;\">\n" +
"<option value=\"inner1\">Inner 1</option>\n" +
"<option value=\"inner2\">Inner 2</option>\n" +
"</optgroup>\n" +
"</select>")
  equal(""+w.render("nestchoice", ["inner1"]),
"<select name=\"nestchoice\" multiple=\"multiple\">\n" +
"<option value=\"outer1\">Outer 1</option>\n" +
"<optgroup label=\"Group &quot;1&quot;\">\n" +
"<option value=\"inner1\" selected=\"selected\">Inner 1</option>\n" +
"<option value=\"inner2\">Inner 2</option>\n" +
"</optgroup>\n" +
"</select>")
  equal(""+w.render("nestchoice", ["outer1", "inner2"]),
 "<select name=\"nestchoice\" multiple=\"multiple\">\n" +
"<option value=\"outer1\" selected=\"selected\">Outer 1</option>\n" +
"<optgroup label=\"Group &quot;1&quot;\">\n" +
"<option value=\"inner1\">Inner 1</option>\n" +
"<option value=\"inner2\" selected=\"selected\">Inner 2</option>\n" +
"</optgroup>\n" +
"</select>")
})

QUnit.test("RadioSelect", 22, function() {
  var w = forms.RadioSelect()
  equal(""+w.render("beatle", "J", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>\n" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"> John</label></li>\n" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label></li>\n" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"G\"> George</label></li>\n" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label></li>\n" +
"</ul>")

  // If the value is null, none of the options are checked
  equal(""+w.render("beatle", null, {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>\n" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"J\"> John</label></li>\n" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label></li>\n" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"G\"> George</label></li>\n" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label></li>\n" +
"</ul>")

  // If the value corresponds to a label (but not to an option value), none of the options are checked
  equal(""+w.render("beatle", "John", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>\n" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"J\"> John</label></li>\n" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label></li>\n" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"G\"> George</label></li>\n" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label></li>\n" +
"</ul>")

  // The value is compared to its String representation
  equal(""+w.render("num", 2, {choices: [['1', '1'], ['2', '2'], ['3', '3']]}),
"<ul>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"1\"> 1</label></li>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"> 2</label></li>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"3\"> 3</label></li>\n" +
"</ul>")
  equal(""+w.render("num", "2", {choices: [[1, 1], [2, 2], [3, 3]]}),
"<ul>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"1\"> 1</label></li>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"> 2</label></li>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"3\"> 3</label></li>\n" +
"</ul>")
  equal(""+w.render("num", 2, {choices: [[1, 1], [2, 2], [3, 3]]}),
"<ul>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"1\"> 1</label></li>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"> 2</label></li>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"3\"> 3</label></li>\n" +
"</ul>")

  // You can also pass "choices" to the constructor:
  w = forms.RadioSelect({choices: [[1, 1], [2, 2], [3, 3]]})
  equal(""+w.render("num", 2),
"<ul>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"1\"> 1</label></li>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"> 2</label></li>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"3\"> 3</label></li>\n" +
"</ul>")

  // If 'choices' is passed to both the constructor and render(), then they'll both be in the output
  equal(""+w.render("num", 2, {choices: [[4, 4], [5, 5]]}),
"<ul>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"1\"> 1</label></li>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"> 2</label></li>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"3\"> 3</label></li>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"4\"> 4</label></li>\n" +
"<li><label><input type=\"radio\" name=\"num\" value=\"5\"> 5</label></li>\n" +
"</ul>")

  // RadioSelect uses a RadioFieldRenderer to render the individual radio
  // inputs. You can manipulate that object directly to customise the way
  // the RadioSelect is rendered.
  w = forms.RadioSelect()
  var r = w.getRenderer("beatle", "J", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]})
  var inputs1 = [], inputs2 = [], inputs3 = [], inputs4 = []
  var radioInputs = r.radioInputs()
  for (var i = 0, inp; inp = radioInputs[i]; i++) {
    inputs1.push(""+inp)
    inputs2.push(""+DOMBuilder.fragment(inp.render(), DOMBuilder.createElement("br")))
    inputs3.push(""+DOMBuilder.createElement("p", {}, [inp.tag(), " ", inp.choiceLabel]))
    inputs4.push(""+DOMBuilder.fragment(
        inp.name, " ", inp.value, " ", inp.choiceValue, " ", inp.choiceLabel, " ", inp.isChecked()))
  }
  equal(inputs1.join("\n"),
"<label><input type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"> John</label>\n" +
"<label><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label>\n" +
"<label><input type=\"radio\" name=\"beatle\" value=\"G\"> George</label>\n" +
"<label><input type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label>")
  equal(inputs2.join("\n"),
"<label><input type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"> John</label><br>\n" +
"<label><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label><br>\n" +
"<label><input type=\"radio\" name=\"beatle\" value=\"G\"> George</label><br>\n" +
"<label><input type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label><br>")
  equal(inputs3.join("\n"),
"<p><input type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"> John</p>\n" +
"<p><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</p>\n" +
"<p><input type=\"radio\" name=\"beatle\" value=\"G\"> George</p>\n" +
"<p><input type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</p>")
  equal(inputs4.join("\n"),
"beatle J J John true\n" +
"beatle J P Paul false\n" +
"beatle J G George false\n" +
"beatle J R Ringo false")

  // You can create your own custom renderers for RadioSelect to use.
  var MyRenderer = forms.RadioFieldRenderer.extend()
  MyRenderer.prototype.render = function() {
    var inputs = this.radioInputs()
    var items = []
    for (var i = 0, l = inputs.length; i < l; i++) {
      items.push(inputs[i].render())
      if (i != l - 1) {
        items.push(DOMBuilder.createElement("br"))
      }
    }
    return DOMBuilder.fragment(items)
  }

  w = forms.RadioSelect({renderer: MyRenderer})
  equal(""+w.render("beatle", "G", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
        "<label><input type=\"radio\" name=\"beatle\" value=\"J\"> John</label><br><label><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label><br><label><input type=\"radio\" name=\"beatle\" value=\"G\" checked=\"checked\"> George</label><br><label><input type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label>")

  // Or you can use custom RadioSelect fields that use your custom renderer
  var CustomRadioSelect = forms.RadioSelect.extend({
    constructor: function() {
      forms.RadioSelect.call(this, {renderer: MyRenderer})
    }
  })

  w = new CustomRadioSelect()
  equal(""+w.render("beatle", "G", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
        "<label><input type=\"radio\" name=\"beatle\" value=\"J\"> John</label><br><label><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label><br><label><input type=\"radio\" name=\"beatle\" value=\"G\" checked=\"checked\"> George</label><br><label><input type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label>")

  // A RadioFieldRenderer object also allows index access to individual
  // RadioInput objects.
  w = forms.RadioSelect()
  r = w.getRenderer("beatle", "J", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]})
  equal(""+r.radioInput(1), "<label><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label>")
  equal(""+r.radioInput(0), "<label><input type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"> John</label>")
  strictEqual(r.radioInput(0).isChecked(), true)
  strictEqual(r.radioInput(1).isChecked(), false)
  raises(function() { r.radioInput(10); })

  // Choices are escaped correctly
  w = forms.RadioSelect()
  equal(""+w.render("escape", null, {choices: [["bad", "you & me"], ["good", DOMBuilder.html.markSafe("you &gt; me")]]}),
"<ul>\n" +
"<li><label><input type=\"radio\" name=\"escape\" value=\"bad\"> you &amp; me</label></li>\n" +
"<li><label><input type=\"radio\" name=\"escape\" value=\"good\"> you &gt; me</label></li>\n" +
"</ul>")

  // Attributes provided at instantiation are passed to the constituent inputs
  w = forms.RadioSelect({attrs: {id: "foo"}})
  equal(""+w.render("beatle", "J", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>\n" +
"<li><label for=\"foo_0\"><input id=\"foo_0\" type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"> John</label></li>\n" +
"<li><label for=\"foo_1\"><input id=\"foo_1\" type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label></li>\n" +
"<li><label for=\"foo_2\"><input id=\"foo_2\" type=\"radio\" name=\"beatle\" value=\"G\"> George</label></li>\n" +
"<li><label for=\"foo_3\"><input id=\"foo_3\" type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label></li>\n" +
"</ul>")

  // Attributes provided at render-time are passed to the constituent inputs
  w = forms.RadioSelect()
  equal(""+w.render("beatle", "J", {attrs: {id: "bar"}, choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>\n" +
"<li><label for=\"bar_0\"><input id=\"bar_0\" type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"> John</label></li>\n" +
"<li><label for=\"bar_1\"><input id=\"bar_1\" type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label></li>\n" +
"<li><label for=\"bar_2\"><input id=\"bar_2\" type=\"radio\" name=\"beatle\" value=\"G\"> George</label></li>\n" +
"<li><label for=\"bar_3\"><input id=\"bar_3\" type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label></li>\n" +
"</ul>")
})

QUnit.test("CheckboxSelectMultiple", 19, function() {
  var w = forms.CheckboxSelectMultiple()
  equal(""+w.render("beatles", ["J"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"J\" checked=\"checked\"> John</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"P\"> Paul</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"G\"> George</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"R\"> Ringo</label></li>\n" +
"</ul>")
  equal(""+w.render("beatles", ["J", "P"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"J\" checked=\"checked\"> John</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"P\" checked=\"checked\"> Paul</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"G\"> George</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"R\"> Ringo</label></li>\n" +
"</ul>")
  equal(""+w.render("beatles", ["J", "P", "R"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"J\" checked=\"checked\"> John</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"P\" checked=\"checked\"> Paul</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"G\"> George</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"R\" checked=\"checked\"> Ringo</label></li>\n" +
"</ul>")

  // If the value is null, none of the options are selected
  equal(""+w.render("beatles", null, {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"J\"> John</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"P\"> Paul</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"G\"> George</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"R\"> Ringo</label></li>\n" +
"</ul>")

  // If the value corresponds to a label (but not to an option value), none of the options are selected
  equal(""+w.render("beatles", ["John"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"J\"> John</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"P\"> Paul</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"G\"> George</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"R\"> Ringo</label></li>\n" +
"</ul>")

  // If multiple values are given, but some of them are not valid, the valid ones are selected
  equal(""+w.render("beatles", ["J", "G", "foo"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"J\" checked=\"checked\"> John</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"P\"> Paul</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"G\" checked=\"checked\"> George</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"R\"> Ringo</label></li>\n" +
"</ul>")

  // The value is compared to its String representation
  equal(""+w.render("nums", [2], {choices: [['1', '1'], ['2', '2'], ['3', '3']]}),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"1\"> 1</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"2\" checked=\"checked\"> 2</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"3\"> 3</label></li>\n" +
"</ul>")
  equal(""+w.render("nums", ["2"], {choices: [[1, 1], [2, 2], [3, 3]]}),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"1\"> 1</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"2\" checked=\"checked\"> 2</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"3\"> 3</label></li>\n" +
"</ul>")
  equal(""+w.render("nums", [2], {choices: [[1, 1], [2, 2], [3, 3]]}),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"1\"> 1</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"2\" checked=\"checked\"> 2</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"3\"> 3</label></li>\n" +
"</ul>")

  // You can also pass 'choices' to the constructor
  w = forms.CheckboxSelectMultiple({choices: [[1, 1], [2, 2], [3, 3]]})
  equal(""+w.render("nums", [2]),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"1\"> 1</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"2\" checked=\"checked\"> 2</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"3\"> 3</label></li>\n" +
"</ul>")

  // If 'choices' is passed to both the constructor and render(), then they'll both be in the output
  equal(""+w.render("nums", [2], {choices: [[4, 4], [5, 5]]}),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"1\"> 1</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"2\" checked=\"checked\"> 2</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"3\"> 3</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"4\"> 4</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"5\"> 5</label></li>\n" +
"</ul>")

  // Choices are escaped correctly
  equal(""+w.render("escape", null, {choices: [["bad", "you & me"], ["good", DOMBuilder.html.markSafe("you &gt; me")]]}),
"<ul>\n" +
"<li><label><input type=\"checkbox\" name=\"escape\" value=\"1\"> 1</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"escape\" value=\"2\"> 2</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"escape\" value=\"3\"> 3</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"escape\" value=\"bad\"> you &amp; me</label></li>\n" +
"<li><label><input type=\"checkbox\" name=\"escape\" value=\"good\"> you &gt; me</label></li>\n" +
"</ul>")

  // Test the usage of _hasChanged
  strictEqual(w._hasChanged(null, null), false)
  strictEqual(w._hasChanged([], null), false)
  strictEqual(w._hasChanged(null, [""]), true)
  strictEqual(w._hasChanged([1, 2], ["1", "2"]), false)
  strictEqual(w._hasChanged([1, 2], ["1"]), true)
  strictEqual(w._hasChanged([1, 2], ["1", "3"]), true)
  strictEqual(w._hasChanged([2, 1], ["1", "2"]), false)
})

QUnit.test("MultiWidget", 8, function() {
  var MyMultiWidget = forms.MultiWidget.extend()
  MyMultiWidget.prototype.decompress = function(value) {
    if (value) {
      return value.split("__")
    }
    return ["", ""]
  }

  var w = new MyMultiWidget([forms.TextInput({attrs: {"class": "big"}}), forms.TextInput({attrs: {"class": "small"}})])
  equal(""+w.render("name", ["john", "lennon"]),
        "<input class=\"big\" type=\"text\" name=\"name_0\" value=\"john\"><input class=\"small\" type=\"text\" name=\"name_1\" value=\"lennon\">")
  equal(""+w.render("name", "john__lennon"),
        "<input class=\"big\" type=\"text\" name=\"name_0\" value=\"john\"><input class=\"small\" type=\"text\" name=\"name_1\" value=\"lennon\">")
  equal(""+w.render("name", "john__lennon", {attrs: {id: "foo"}}),
        "<input class=\"big\" type=\"text\" name=\"name_0\" id=\"foo_0\" value=\"john\"><input class=\"small\" type=\"text\" name=\"name_1\" id=\"foo_1\" value=\"lennon\">")

  w = new MyMultiWidget([forms.TextInput({attrs: {"class": "big"}}), forms.TextInput({attrs: {"class": "small"}})], {attrs: {id: "bar"}})
  equal(""+w.render("name", ["john", "lennon"]),
        "<input class=\"big\" type=\"text\" name=\"name_0\" id=\"bar_0\" value=\"john\"><input class=\"small\" type=\"text\" name=\"name_1\" id=\"bar_1\" value=\"lennon\">")

  w = new MyMultiWidget([forms.TextInput(), forms.TextInput()])
  // Test with no initial data
  strictEqual(w._hasChanged(null, ["john", "lennon"]), true)
  // Test when data is the same as initial
  strictEqual(w._hasChanged("john__lennon", ["john", "lennon"]), false)
  // Test when the first widget's data has changed
  strictEqual(w._hasChanged("john__lennon", ["alfred", "lennon"]), true)
  // Test when the last widget's data has changed. This ensures that it is
  // not short circuiting while testing the widgets.
  strictEqual(w._hasChanged("john__lennon", ["john", "denver"]), true)
})

QUnit.test("SplitDateTimeWidget", 12, function() {
  var w = forms.SplitDateTimeWidget()
  equal(""+w.render("date", ""),
        "<input type=\"text\" name=\"date_0\"><input type=\"text\" name=\"date_1\">")
  equal(""+w.render("date", new Date(2006, 0, 10, 7, 30)),
        "<input type=\"text\" name=\"date_0\" value=\"2006-01-10\"><input type=\"text\" name=\"date_1\" value=\"07:30:00\">")
  equal(""+w.render("date", [new Date(2006, 0, 10), new Date(1900, 0, 1, 7, 30)]),
        "<input type=\"text\" name=\"date_0\" value=\"2006-01-10\"><input type=\"text\" name=\"date_1\" value=\"07:30:00\">")

  // You can also pass "attrs" to the constructor. In this case, the attrs
  // will be included on both widgets.
  w = forms.SplitDateTimeWidget({attrs: {"class": "pretty"}})
  equal(""+w.render("date", new Date(2006, 0, 10, 7, 30)),
        "<input class=\"pretty\" type=\"text\" name=\"date_0\" value=\"2006-01-10\"><input class=\"pretty\" type=\"text\" name=\"date_1\" value=\"07:30:00\">")

  // Use "dateFormat" and "timeFormat" to change the way a value is displayed
  w = forms.SplitDateTimeWidget({dateFormat: "%d/%m/%Y", timeFormat: "%H:%M"})
  equal(""+w.render("date", new Date(2006, 0, 10, 7, 30)),
        "<input type=\"text\" name=\"date_0\" value=\"10/01/2006\"><input type=\"text\" name=\"date_1\" value=\"07:30\">")

  strictEqual(w._hasChanged(new Date(2008, 4, 6, 12, 40, 00), ["2008-05-05", "12:40:00"]), true)
  strictEqual(w._hasChanged(new Date(2008, 4, 6, 12, 40, 00), ["06/05/2008", "12:40"]), false)
  strictEqual(w._hasChanged(new Date(2008, 4, 6, 12, 40, 00), ["06/05/2008", "12:41"]), true)

  // Django #13390  - SplitDateTimeWidget should recognise when it's no
  // longer required.
  var SplitDateForm = forms.Form.extend({
    field: forms.DateTimeField({required: false, widget: forms.SplitDateTimeWidget})
  })
  var f = new SplitDateForm({data: {field: ""}})
  strictEqual(f.isValid(), true)
  f = new SplitDateForm({data: {field: ["", ""]}})
  strictEqual(f.isValid(), true)

  var SplitDateRequiredForm = forms.Form.extend({
    field: forms.DateTimeField({required: true, widget: forms.SplitDateTimeWidget})
  })
  f = new SplitDateRequiredForm({data: {field: ""}})
  strictEqual(f.isValid(), false)
  f = new SplitDateRequiredForm({data: {field: ["", ""]}})
  strictEqual(f.isValid(), false)
})

QUnit.test("DateTimeInput", 5, function() {
  var w = forms.DateTimeInput()
  equal(""+w.render("date", null),
        "<input type=\"text\" name=\"date\">")
  var d = new Date(2007, 8, 17, 12, 51, 34)

  equal(""+w.render("date", d),
        "<input type=\"text\" name=\"date\" value=\"2007-09-17 12:51:34\">")
  equal(""+w.render("date", new Date(2007, 8, 17, 12, 51)),
        "<input type=\"text\" name=\"date\" value=\"2007-09-17 12:51:00\">")

  // Use "format" to change the way a value is displayed
  w = forms.DateTimeInput({format: "%d/%m/%Y %H:%M"})
  equal(""+w.render("date", d),
        "<input type=\"text\" name=\"date\" value=\"17/09/2007 12:51\">")
  strictEqual(w._hasChanged(d, "17/09/2007 12:51"), false)
})

QUnit.test("DateInput", 5, function() {
  var w = forms.DateInput()
  equal(""+w.render("date", null),
        "<input type=\"text\" name=\"date\">")
  var d = new Date(2007, 8, 17)

  equal(""+w.render("date", d),
        "<input type=\"text\" name=\"date\" value=\"2007-09-17\">")

  // We should be able to initialise from a String
  equal(""+w.render("date", "2007-09-17"),
        "<input type=\"text\" name=\"date\" value=\"2007-09-17\">")

  // Use "format" to change the way a value is displayed
  w = forms.DateInput({format: "%d/%m/%Y"})
  equal(""+w.render("date", d),
        "<input type=\"text\" name=\"date\" value=\"17/09/2007\">")
  strictEqual(w._hasChanged(d, "17/09/2007"), false)
})

QUnit.test("TimeInput", 6, function() {
  var w = forms.TimeInput()
  equal(""+w.render("time", null),
        "<input type=\"text\" name=\"time\">")
  var t = new Date(1900, 0, 1, 12, 51, 34)

  equal(""+w.render("time", t),
        "<input type=\"text\" name=\"time\" value=\"12:51:34\">")
  equal(""+w.render("time", new Date(1900, 0, 1, 12, 51)),
        "<input type=\"text\" name=\"time\" value=\"12:51:00\">")

  // We should be able to initialise from a String
  equal(""+w.render("time", "13:12:11"),
        "<input type=\"text\" name=\"time\" value=\"13:12:11\">")

  // Use "format" to change the way a value is displayed
  w = forms.TimeInput({format: "%H:%M"})
  equal(""+w.render("time", t),
        "<input type=\"text\" name=\"time\" value=\"12:51\">")
  strictEqual(w._hasChanged(t, "12:51"), false)
})

QUnit.test("SplitHiddenDateTimeWidget", 3, function() {
  var w = forms.SplitHiddenDateTimeWidget()
  equal(""+w.render("date", ""),
        "<input type=\"hidden\" name=\"date_0\"><input type=\"hidden\" name=\"date_1\">")
  var d = new Date(2007, 8, 17, 12, 51, 34)
  equal(""+w.render("date", d),
        "<input type=\"hidden\" name=\"date_0\" value=\"2007-09-17\"><input type=\"hidden\" name=\"date_1\" value=\"12:51:34\">")
  equal(""+w.render("date", new Date(2007, 8, 17, 12, 51)),
        "<input type=\"hidden\" name=\"date_0\" value=\"2007-09-17\"><input type=\"hidden\" name=\"date_1\" value=\"12:51:00\">")
})

QUnit.test("ClearableFileInput", 10, function() {
  // Quacks like a FieldFile (has a .url and string representation), but
  // doesn't require us to care about anything else.
  var FakeFieldFile = function() { this.url = "something"; }
  FakeFieldFile.prototype.toString = function() { return this.url;}

  // Clear input renders
  var w = forms.ClearableFileInput()
  w.isRequired = false
  equal(""+w.render("myfile", new FakeFieldFile()),
"Currently: <a href=\"something\">something</a> <input type=\"checkbox\" name=\"myfile-clear\" id=\"myfile-clear_id\"> <label for=\"myfile-clear_id\">Clear</label><br>Change: <input type=\"file\" name=\"myfile\">")

  // A ClearableFileInput should escape name, filename and URL when rendering
  // HTML.
  var StrangeFieldFile = function() { this.url = "something?chapter=1&sect=2&copy=3&lang=en"; }
  StrangeFieldFile.prototype.toString = function() { return "something<div onclick=\"alert('oops')\">.jpg"; }
  var file = new StrangeFieldFile()
  var output = ""+w.render("my<div>file", file)
  equal(output.indexOf(file.url), -1)
  ok(output.indexOf('href="something?chapter=1&amp;sect=2&amp;copy=3&amp;lang=en"') > -1)
  equal(output.indexOf(""+file), -1)
  ok(output.indexOf("my&lt;div&gt;file") > -1)
  equal(output.indexOf("my<div>file"), -1)

  // A ClearableFileInput instantiated with no initial value does not render
  // a clear checkbox.
  equal(""+w.render("myfile", null),
"<input type=\"file\" name=\"myfile\">")

  // ClearableFileInput.valueFromData returns false if the clear checkbox is
  // checked, if not required.
  strictEqual(w.valueFromData({"myfile-clear": true}, {}, "myfile"),
              false)

  w.isRequired = true

  // A ClearableFileInput with isRequired=True does not render a clear
  // checkbox.
  equal(""+w.render("myfile", new FakeFieldFile()),
"Currently: <a href=\"something\">something</a> <br>Change: <input type=\"file\" name=\"myfile\">")

  // ClearableFileInput.valueFromData never returns False if the field
  // is required.
  function SimpleUploadedFile(name, content) {
    this.name = name
    this.content = content
    this.size = (content !== null ? content.length : 0)
  }
  var f = new SimpleUploadedFile("something.txt", "content")
  strictEqual(w.valueFromData({"myfile-clear": true}, {"myfile": f}, "myfile"), f)
})
