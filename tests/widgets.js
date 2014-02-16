QUnit.module("widgets")

QUnit.test("TextInput", 8, function() {
  var w = forms.TextInput()
  reactHTMLEqual(w.render("email", ""),
        "<input type=\"text\" name=\"email\">")
  reactHTMLEqual(w.render("email", null),
        "<input type=\"text\" name=\"email\">")
  reactHTMLEqual(w.render("email", "test@example.com"),
        "<input type=\"text\" name=\"email\" value=\"test@example.com\">")
  reactHTMLEqual(w.render("email", "some \"quoted\" & ampersanded value"),
        "<input type=\"text\" name=\"email\" value=\"some &quot;quoted&quot; &amp; ampersanded value\">")
  reactHTMLEqual(w.render("email", "test@example.com", {attrs: {"className": "fun"}}),
        "<input type=\"text\" name=\"email\" class=\"fun\" value=\"test@example.com\">")

  // You can also pass "attrs" to the constructor
  w = forms.TextInput({attrs: {"className": "fun", "type": "email"}})
  reactHTMLEqual(w.render("email", ""),
        "<input class=\"fun\" type=\"email\" name=\"email\">")
  reactHTMLEqual(w.render("email", "foo@example.com"),
        "<input class=\"fun\" type=\"email\" name=\"email\" value=\"foo@example.com\">")

  // Attributes passed to render() get precedence over those passed to the constructor
  w = forms.TextInput({attrs: {"className": "pretty"}})
  reactHTMLEqual(w.render("email", "", {attrs: {"className": "special"}}),
        "<input class=\"special\" type=\"text\" name=\"email\">")
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

QUnit.test("HiddenInput", 10, function() {
  var w = forms.HiddenInput()
  reactHTMLEqual(w.render("email", ""),
        "<input type=\"hidden\" name=\"email\">")
  reactHTMLEqual(w.render("email", null),
        "<input type=\"hidden\" name=\"email\">")
  reactHTMLEqual(w.render("email", "test@example.com"),
        "<input type=\"hidden\" name=\"email\" value=\"test@example.com\">")
  reactHTMLEqual(w.render("email", "some \"quoted\" & ampersanded value"),
        "<input type=\"hidden\" name=\"email\" value=\"some &quot;quoted&quot; &amp; ampersanded value\">")
  reactHTMLEqual(w.render("email", "test@example.com", {attrs: {"className": "fun"}}),
        "<input type=\"hidden\" name=\"email\" class=\"fun\" value=\"test@example.com\">")

  // You can also pass "attrs" to the constructor
  w = forms.HiddenInput({attrs: {"className": "fun"}})
  reactHTMLEqual(w.render("email", ""),
        "<input class=\"fun\" type=\"hidden\" name=\"email\">")
  reactHTMLEqual(w.render("email", "foo@example.com"),
        "<input class=\"fun\" type=\"hidden\" name=\"email\" value=\"foo@example.com\">")

  // Attributes passed to render() get precedence over those passed to the constructor
  w = forms.HiddenInput({attrs: {"className": "pretty"}})
  reactHTMLEqual(w.render("email", "", {attrs: {"className": "special"}}),
        "<input class=\"special\" type=\"hidden\" name=\"email\">")

  // Boolean values are rendered to their string forms ("true" and "false")
  w = forms.HiddenInput()
  reactHTMLEqual(w.render('get_spam', false),
        "<input type=\"hidden\" name=\"get_spam\" value=\"false\">")
  reactHTMLEqual(w.render('get_spam', true),
        "<input type=\"hidden\" name=\"get_spam\" value=\"true\">")
})

QUnit.test("MultipleHiddenInput", 12, function() {
  var w = forms.MultipleHiddenInput()
  reactHTMLEqual(w.render("email", []), "<div></div>")
  reactHTMLEqual(w.render("email", null), "<div></div>")
  reactHTMLEqual(w.render("email", ["test@example.com"]),
        "<div><input type=\"hidden\" name=\"email\" value=\"test@example.com\"></div>")
  reactHTMLEqual(w.render("email", ["some \"quoted\" & ampersanded value"]),
        "<div><input type=\"hidden\" name=\"email\" value=\"some &quot;quoted&quot; &amp; ampersanded value\"></div>")
  reactHTMLEqual(w.render("email", ["test@example.com", "foo@example.com"]),
        "<div><input type=\"hidden\" name=\"email\" value=\"test@example.com\"><input type=\"hidden\" name=\"email\" value=\"foo@example.com\"></div>")
  reactHTMLEqual(w.render("email", ["test@example.com"], {attrs: {"className": "fun"}}),
        "<div><input type=\"hidden\" name=\"email\" class=\"fun\" value=\"test@example.com\"></div>")
  reactHTMLEqual(w.render("email", ["test@example.com", "foo@example.com"], {attrs: {"className": "fun"}}),
        "<div><input type=\"hidden\" name=\"email\" class=\"fun\" value=\"test@example.com\"><input type=\"hidden\" name=\"email\" class=\"fun\" value=\"foo@example.com\"></div>")

  // You can also pass "attrs" to the constructor
  w = forms.MultipleHiddenInput({attrs: {"className": "fun"}})
  reactHTMLEqual(w.render("email", []), "<div></div>")
  reactHTMLEqual(w.render("email", ["foo@example.com"]),
        "<div><input class=\"fun\" type=\"hidden\" name=\"email\" value=\"foo@example.com\"></div>")
  reactHTMLEqual(w.render("email", ["foo@example.com", "test@example.com"]),
        "<div><input class=\"fun\" type=\"hidden\" name=\"email\" value=\"foo@example.com\"><input class=\"fun\" type=\"hidden\" name=\"email\" value=\"test@example.com\"></div>")

  // Attributes passed to render() get precedence over those passed to the constructor
  w = forms.MultipleHiddenInput({attrs: {"className": "pretty"}})
  reactHTMLEqual(w.render("email", ["foo@example.com"], {attrs: {"className": "special"}}),
        "<div><input class=\"special\" type=\"hidden\" name=\"email\" value=\"foo@example.com\"></div>")

  // Each input gets a unique id
  w = forms.MultipleHiddenInput()
  reactHTMLEqual(w.render("letters", ["a", "b", "c"], {attrs: {'id': 'hideme'}}),
        "<div><input type=\"hidden\" name=\"letters\" id=\"hideme_0\" value=\"a\"><input type=\"hidden\" name=\"letters\" id=\"hideme_1\" value=\"b\"><input type=\"hidden\" name=\"letters\" id=\"hideme_2\" value=\"c\"></div>")
})

QUnit.test("FileInput", 11, function() {
  // FileInput widgets don't ever show the value, because the old value is of
  // no use if you are updating the form or if the provided file generated an
  // error.
  var w = forms.FileInput()
  reactHTMLEqual(w.render("email", ""),
        "<input type=\"file\" name=\"email\">")
  reactHTMLEqual(w.render("email", null),
        "<input type=\"file\" name=\"email\">")
  reactHTMLEqual(w.render("email", "test@example.com"),
        "<input type=\"file\" name=\"email\">")
  reactHTMLEqual(w.render("email", "some \"quoted\" & ampersanded value"),
        "<input type=\"file\" name=\"email\">")
  reactHTMLEqual(w.render("email", "test@example.com", {attrs: {"className": "fun"}}),
        "<input type=\"file\" name=\"email\" class=\"fun\">")

  // You can also pass "attrs" to the constructor
  w = forms.FileInput({attrs: {"className": "fun"}})
  reactHTMLEqual(w.render("email", ""),
        "<input class=\"fun\" type=\"file\" name=\"email\">")
  reactHTMLEqual(w.render("email", "foo@example.com"),
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

QUnit.test("Textarea", 8, function() {
  var w = forms.Textarea()
  reactHTMLEqual(w.render("msg", ""),
        "<textarea rows=\"10\" cols=\"40\" name=\"msg\" value=\"\"></textarea>")
  reactHTMLEqual(w.render("msg", null),
        "<textarea rows=\"10\" cols=\"40\" name=\"msg\" value=\"\"></textarea>")
  reactHTMLEqual(w.render("msg", "value"),
        "<textarea rows=\"10\" cols=\"40\" name=\"msg\" value=\"value\">value</textarea>")
  reactHTMLEqual(w.render("msg", "some \"quoted\" & ampersanded value"),
        "<textarea rows=\"10\" cols=\"40\" name=\"msg\" value=\"some &quot;quoted&quot; &amp; ampersanded value\">some &quot;quoted&quot; &amp; ampersanded value</textarea>")
  // TODO What's the equivalent?
  // reactHTMLEqual(w.render("msg", DOMBuilder.html.markSafe("pre &quot;quoted&quot; value")),
  //       "<textarea rows=\"10\" cols=\"40\" name=\"msg\">pre &quot;quoted&quot; value</textarea>")
  reactHTMLEqual(w.render("msg", "value", {attrs: {"className": "pretty", rows: 20}}),
        "<textarea rows=\"20\" cols=\"40\" name=\"msg\" class=\"pretty\" value=\"value\">value</textarea>")

  // You can also pass "attrs" to the constructor
  w = forms.Textarea({attrs: {"className": "pretty"}})
  reactHTMLEqual(w.render("msg", ""),
        "<textarea rows=\"10\" cols=\"40\" class=\"pretty\" name=\"msg\" value=\"\"></textarea>")
  reactHTMLEqual(w.render("msg", "example"),
        "<textarea rows=\"10\" cols=\"40\" class=\"pretty\" name=\"msg\" value=\"example\">example</textarea>")

  // Attributes passed to render() get precedence over those passed to the constructor
  w = forms.Textarea({attrs: {"className": "pretty"}})
  reactHTMLEqual(w.render("msg", "", {attrs: {"className": "special"}}),
        "<textarea rows=\"10\" cols=\"40\" class=\"special\" name=\"msg\" value=\"\"></textarea>")
})

QUnit.test("CheckboxInput", 25, function() {
  var w = forms.CheckboxInput()
  reactHTMLEqual(w.render("is_cool", ""),
        "<input type=\"checkbox\" name=\"is_cool\">")
  reactHTMLEqual(w.render("is_cool", null),
        "<input type=\"checkbox\" name=\"is_cool\">")
  reactHTMLEqual(w.render("is_cool", false),
        "<input type=\"checkbox\" name=\"is_cool\">")
  reactHTMLEqual(w.render("is_cool", true),
        "<input type=\"checkbox\" name=\"is_cool\" checked=\"checked\">")

  // Using any value that's not in ("", null, false, true) will check the
  // checkbox and set the "value" attribute.
  reactHTMLEqual(w.render("is_cool", "foo"),
        "<input type=\"checkbox\" name=\"is_cool\" value=\"foo\" checked=\"checked\">")

  reactHTMLEqual(w.render("is_cool", false, {attrs: {"className": "pretty"}}),
        "<input type=\"checkbox\" name=\"is_cool\" class=\"pretty\">")

  // Regression for Django #17114
  reactHTMLEqual(w.render('is_cool', 0),
        '<input type="checkbox" name="is_cool" value="0" checked="checked">')
  reactHTMLEqual(w.render('is_cool', 1),
        '<input type="checkbox" name="is_cool" value="1" checked="checked">')

  // You can also pass "attrs" to the constructor
  w = forms.CheckboxInput({attrs: {"className": "pretty"}})
  reactHTMLEqual(w.render("is_cool", ""),
        "<input class=\"pretty\" type=\"checkbox\" name=\"is_cool\">")

  // Attributes passed to render() get precedence over those passed to the constructor
  w = forms.CheckboxInput({attrs: {"className": "pretty"}})
  reactHTMLEqual(w.render("is_cool", false, {attrs: {"className": "special"}}),
        "<input class=\"special\" type=\"checkbox\" name=\"is_cool\">")

  // You can pass "checkTest" to the constructor. This is a function that
  // takes the value and returns true if the box should be checked.
  w = forms.CheckboxInput({checkTest: function(value) { return value.indexOf("hello") == 0; }})
  reactHTMLEqual(w.render("greeting", ""),
        "<input type=\"checkbox\" name=\"greeting\">")
  reactHTMLEqual(w.render("greeting", "hello"),
        "<input type=\"checkbox\" name=\"greeting\" value=\"hello\" checked=\"checked\">")
  reactHTMLEqual(w.render("greeting", "hello there"),
        "<input type=\"checkbox\" name=\"greeting\" value=\"hello there\" checked=\"checked\">")
  reactHTMLEqual(w.render("greeting", "hello & goodbye"),
        "<input type=\"checkbox\" name=\"greeting\" value=\"hello &amp; goodbye\" checked=\"checked\">")

  // Calling "checkTest" shouldn't swallow exceptions
  throws(function() { w.render("greeting", true) }, "Calling checkTest() shouldn't swallow exceptions")

  // The CheckboxInput widget will return False if the key is not found in
  // the data (because HTML form submission doesn't send any result for
  // unchecked checkboxes).
  strictEqual(w.valueFromData({}, {}, 'testing'), false)

  var value = w.valueFromData({testing: '0'}, {}, 'testing')
  equal(typeof value, 'boolean')
  strictEqual(value, true)

  strictEqual(w._hasChanged(null, null), false)
  strictEqual(w._hasChanged(null, ""), false)
  strictEqual(w._hasChanged("", ""), false)
  strictEqual(w._hasChanged(false, "on"), true)
  strictEqual(w._hasChanged(true, "on"), false)
  strictEqual(w._hasChanged(true, ""), true)
  // Initial value may have mutated to a string due to showhiddenInitial
  strictEqual(w._hasChanged("false", "on"), true)
})

QUnit.test("Select", 13, function() {
  var w = forms.Select()
  reactHTMLEqual(w.render("beatle", "J", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatle\">" +
"<option value=\"J\" selected=\"selected\">John</option>" +
"<option value=\"P\">Paul</option>" +
"<option value=\"G\">George</option>" +
"<option value=\"R\">Ringo</option>" +
"</select>")

  // If the value is null, none of the options are selected
  reactHTMLEqual(w.render("beatle", null, {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatle\">" +
"<option value=\"J\">John</option>" +
"<option value=\"P\">Paul</option>" +
"<option value=\"G\">George</option>" +
"<option value=\"R\">Ringo</option>" +
"</select>")

  // If the value corresponds to a label (but not to an option value), none of the options are selected
  reactHTMLEqual(w.render("beatle", "John", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatle\">" +
"<option value=\"J\">John</option>" +
"<option value=\"P\">Paul</option>" +
"<option value=\"G\">George</option>" +
"<option value=\"R\">Ringo</option>" +
"</select>")

  // Only one option can be selected
  reactHTMLEqual(w.render('choices', '0', {choices: [['0', '0'], ['1', '1'], ['2', '2'], ['3', '3'], ['0', 'extra']]}),
'<select name="choices">' +
'<option value="0" selected="selected">0</option>' +
'<option value="1">1</option>' +
'<option value="2">2</option>' +
'<option value="3">3</option>' +
'<option value="0">extra</option>' +
'</select>')

  // The value is compared to its String representation
  reactHTMLEqual(w.render("num", 2, {choices: [['1', '1'], ['2', '2'], ['3', '3']]}),
"<select name=\"num\">" +
"<option value=\"1\">1</option>" +
"<option value=\"2\" selected=\"selected\">2</option>" +
"<option value=\"3\">3</option>" +
"</select>")
  reactHTMLEqual(w.render("num", "2", {choices: [[1, 1], [2, 2], [3, 3]]}),
"<select name=\"num\">" +
"<option value=\"1\">1</option>" +
"<option value=\"2\" selected=\"selected\">2</option>" +
"<option value=\"3\">3</option>" +
"</select>")
  reactHTMLEqual(w.render("num", 2, {choices: [[1, 1], [2, 2], [3, 3]]}),
"<select name=\"num\">" +
"<option value=\"1\">1</option>" +
"<option value=\"2\" selected=\"selected\">2</option>" +
"<option value=\"3\">3</option>" +
"</select>")

  // You can also pass "choices" to the constructor:
  w = forms.Select({choices: [[1, 1], [2, 2], [3, 3]]})
  reactHTMLEqual(w.render("num", 2),
"<select name=\"num\">" +
"<option value=\"1\">1</option>" +
"<option value=\"2\" selected=\"selected\">2</option>" +
"<option value=\"3\">3</option>" +
"</select>")

  // If "choices" is passed to both the constructor and render(), then they'll both be in the output
  reactHTMLEqual(w.render("num", 2, {choices: [[4, 4], [5, 5]]}),
"<select name=\"num\">" +
"<option value=\"1\">1</option>" +
"<option value=\"2\" selected=\"selected\">2</option>" +
"<option value=\"3\">3</option>" +
"<option value=\"4\">4</option>" +
"<option value=\"5\">5</option>" +
"</select>")

  // Choices are escaped correctly
  reactHTMLEqual(w.render("num", null, {choices: [["bad", "you & me"]]}),
"<select name=\"num\">" +
"<option value=\"1\">1</option>" +
"<option value=\"2\">2</option>" +
"<option value=\"3\">3</option>" +
"<option value=\"bad\">you &amp; me</option>" +
"</select>")

  // Choices can be nested one level in order to create HTML optgroups
  w.choices = [['outer1', 'Outer 1'], ['Group "1"', [['inner1', 'Inner 1'], ['inner2', 'Inner 2']]]]
  reactHTMLEqual(w.render("nestchoice", null),
"<select name=\"nestchoice\">" +
"<option value=\"outer1\">Outer 1</option>" +
"<optgroup label=\"Group &quot;1&quot;\">" +
"<option value=\"inner1\">Inner 1</option>" +
"<option value=\"inner2\">Inner 2</option>" +
"</optgroup>" +
"</select>")
  reactHTMLEqual(w.render("nestchoice", "outer1"),
"<select name=\"nestchoice\">" +
"<option value=\"outer1\" selected=\"selected\">Outer 1</option>" +
"<optgroup label=\"Group &quot;1&quot;\">" +
"<option value=\"inner1\">Inner 1</option>" +
"<option value=\"inner2\">Inner 2</option>" +
"</optgroup>" +
"</select>")
  reactHTMLEqual(w.render("nestchoice", "inner1"),
"<select name=\"nestchoice\">" +
"<option value=\"outer1\">Outer 1</option>" +
"<optgroup label=\"Group &quot;1&quot;\">" +
"<option value=\"inner1\" selected=\"selected\">Inner 1</option>" +
"<option value=\"inner2\">Inner 2</option>" +
"</optgroup>" +
"</select>")
})

QUnit.test("NullBooleanSelect", 12, function() {
  var w = forms.NullBooleanSelect()
  reactHTMLEqual(w.render("is_cool", true),
"<select name=\"is_cool\">" +
"<option value=\"1\">Unknown</option>" +
"<option value=\"2\" selected=\"selected\">Yes</option>" +
"<option value=\"3\">No</option>" +
"</select>")
  reactHTMLEqual(w.render("is_cool", false),
"<select name=\"is_cool\">" +
"<option value=\"1\">Unknown</option>" +
"<option value=\"2\">Yes</option>" +
"<option value=\"3\" selected=\"selected\">No</option>" +
"</select>")
  reactHTMLEqual(w.render("is_cool", null),
"<select name=\"is_cool\">" +
"<option value=\"1\" selected=\"selected\">Unknown</option>" +
"<option value=\"2\">Yes</option>" +
"<option value=\"3\">No</option>" +
"</select>")
  reactHTMLEqual(w.render("is_cool", "2"),
"<select name=\"is_cool\">" +
"<option value=\"1\">Unknown</option>" +
"<option value=\"2\" selected=\"selected\">Yes</option>" +
"<option value=\"3\">No</option>" +
"</select>")
  reactHTMLEqual(w.render("is_cool", "3"),
"<select name=\"is_cool\">" +
"<option value=\"1\">Unknown</option>" +
"<option value=\"2\">Yes</option>" +
"<option value=\"3\" selected=\"selected\">No</option>" +
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
  reactHTMLEqual(w.render("beatles", ["J"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatles\" multiple=\"multiple\">" +
"<option value=\"J\" selected=\"selected\">John</option>" +
"<option value=\"P\">Paul</option>" +
"<option value=\"G\">George</option>" +
"<option value=\"R\">Ringo</option>" +
"</select>")
  reactHTMLEqual(w.render("beatles", ["J", "P"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatles\" multiple=\"multiple\">" +
"<option value=\"J\" selected=\"selected\">John</option>" +
"<option value=\"P\" selected=\"selected\">Paul</option>" +
"<option value=\"G\">George</option>" +
"<option value=\"R\">Ringo</option>" +
"</select>")
  reactHTMLEqual(w.render("beatles", ["J", "P", "R"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatles\" multiple=\"multiple\">" +
"<option value=\"J\" selected=\"selected\">John</option>" +
"<option value=\"P\" selected=\"selected\">Paul</option>" +
"<option value=\"G\">George</option>" +
"<option value=\"R\" selected=\"selected\">Ringo</option>" +
"</select>")

  // If the value is null, none of the options are selected
  reactHTMLEqual(w.render("beatles", null, {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatles\" multiple=\"multiple\">" +
"<option value=\"J\">John</option>" +
"<option value=\"P\">Paul</option>" +
"<option value=\"G\">George</option>" +
"<option value=\"R\">Ringo</option>" +
"</select>")

  // If the value corresponds to a label (but not to an option value), none of the options are selected
  reactHTMLEqual(w.render("beatles", ["John"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatles\" multiple=\"multiple\">" +
"<option value=\"J\">John</option>" +
"<option value=\"P\">Paul</option>" +
"<option value=\"G\">George</option>" +
"<option value=\"R\">Ringo</option>" +
"</select>")

  // Multiple options (with the same value) can be selected
  reactHTMLEqual(w.render('choices', ['0'], {choices: [['0', '0'], ['1', '1'], ['2', '2'], ['3', '3'], ['0', 'extra']]}),
'<select name="choices" multiple="multiple">' +
'<option value="0" selected="selected">0</option>' +
'<option value="1">1</option>' +
'<option value="2">2</option>' +
'<option value="3">3</option>' +
'<option value="0" selected="selected">extra</option>' +
'</select>')

  // If multiple values are given, but some of them are not valid, the valid ones are selected
  reactHTMLEqual(w.render("beatles", ["J", "G", "foo"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<select name=\"beatles\" multiple=\"multiple\">" +
"<option value=\"J\" selected=\"selected\">John</option>" +
"<option value=\"P\">Paul</option>" +
"<option value=\"G\" selected=\"selected\">George</option>" +
"<option value=\"R\">Ringo</option>" +
"</select>")

  // The value is compared to its String representation
  reactHTMLEqual(w.render("nums", [2], {choices: [['1', '1'], ['2', '2'], ['3', '3']]}),
"<select name=\"nums\" multiple=\"multiple\">" +
"<option value=\"1\">1</option>" +
"<option value=\"2\" selected=\"selected\">2</option>" +
"<option value=\"3\">3</option>" +
"</select>")
  reactHTMLEqual(w.render("nums", ["2"], {choices: [[1, 1], [2, 2], [3, 3]]}),
"<select name=\"nums\" multiple=\"multiple\">" +
"<option value=\"1\">1</option>" +
"<option value=\"2\" selected=\"selected\">2</option>" +
"<option value=\"3\">3</option>" +
"</select>")
  reactHTMLEqual(w.render("nums", [2], {choices: [[1, 1], [2, 2], [3, 3]]}),
"<select name=\"nums\" multiple=\"multiple\">" +
"<option value=\"1\">1</option>" +
"<option value=\"2\" selected=\"selected\">2</option>" +
"<option value=\"3\">3</option>" +
"</select>")

  // You can also pass "choices" to the constructor:
  w = forms.SelectMultiple({choices: [[1, 1], [2, 2], [3, 3]]})
  reactHTMLEqual(w.render("nums", [2]),
"<select name=\"nums\" multiple=\"multiple\">" +
"<option value=\"1\">1</option>" +
"<option value=\"2\" selected=\"selected\">2</option>" +
"<option value=\"3\">3</option>" +
"</select>")

  // If "choices" is passed to both the constructor and render(), then they'll both be in the output
  reactHTMLEqual(w.render("nums", [2], {choices: [[4, 4], [5, 5]]}),
"<select name=\"nums\" multiple=\"multiple\">" +
"<option value=\"1\">1</option>" +
"<option value=\"2\" selected=\"selected\">2</option>" +
"<option value=\"3\">3</option>" +
"<option value=\"4\">4</option>" +
"<option value=\"5\">5</option>" +
"</select>")

  // Choices are escaped correctly
  reactHTMLEqual(w.render("nums", null, {choices: [["bad", "you & me"]]}),
"<select name=\"nums\" multiple=\"multiple\">" +
"<option value=\"1\">1</option>" +
"<option value=\"2\">2</option>" +
"<option value=\"3\">3</option>" +
"<option value=\"bad\">you &amp; me</option>" +
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
  reactHTMLEqual(w.render("nestchoice", null),
"<select name=\"nestchoice\" multiple=\"multiple\">" +
"<option value=\"outer1\">Outer 1</option>" +
"<optgroup label=\"Group &quot;1&quot;\">" +
"<option value=\"inner1\">Inner 1</option>" +
"<option value=\"inner2\">Inner 2</option>" +
"</optgroup>" +
"</select>")
  reactHTMLEqual(w.render("nestchoice", ["outer1"]),
"<select name=\"nestchoice\" multiple=\"multiple\">" +
"<option value=\"outer1\" selected=\"selected\">Outer 1</option>" +
"<optgroup label=\"Group &quot;1&quot;\">" +
"<option value=\"inner1\">Inner 1</option>" +
"<option value=\"inner2\">Inner 2</option>" +
"</optgroup>" +
"</select>")
  reactHTMLEqual(w.render("nestchoice", ["inner1"]),
"<select name=\"nestchoice\" multiple=\"multiple\">" +
"<option value=\"outer1\">Outer 1</option>" +
"<optgroup label=\"Group &quot;1&quot;\">" +
"<option value=\"inner1\" selected=\"selected\">Inner 1</option>" +
"<option value=\"inner2\">Inner 2</option>" +
"</optgroup>" +
"</select>")
  reactHTMLEqual(w.render("nestchoice", ["outer1", "inner2"]),
 "<select name=\"nestchoice\" multiple=\"multiple\">" +
"<option value=\"outer1\" selected=\"selected\">Outer 1</option>" +
"<optgroup label=\"Group &quot;1&quot;\">" +
"<option value=\"inner1\">Inner 1</option>" +
"<option value=\"inner2\" selected=\"selected\">Inner 2</option>" +
"</optgroup>" +
"</select>")
})

QUnit.test("RadioSelect", 21, function() {
  var w = forms.RadioSelect()
  reactHTMLEqual(w.render("beatle", "J", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"><span> </span><span>John</span></label></li>" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"P\"><span> </span><span>Paul</span></label></li>" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"G\"><span> </span><span>George</span></label></li>" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"R\"><span> </span><span>Ringo</span></label></li>" +
"</ul>")

  // If the value is null, none of the options are checked
  reactHTMLEqual(w.render("beatle", null, {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"J\"><span> </span><span>John</span></label></li>" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"P\"><span> </span><span>Paul</span></label></li>" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"G\"><span> </span><span>George</span></label></li>" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"R\"><span> </span><span>Ringo</span></label></li>" +
"</ul>")

  // If the value corresponds to a label (but not to an option value), none of the options are checked
  reactHTMLEqual(w.render("beatle", "John", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"J\"><span> </span><span>John</span></label></li>" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"P\"><span> </span><span>Paul</span></label></li>" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"G\"><span> </span><span>George</span></label></li>" +
"<li><label><input type=\"radio\" name=\"beatle\" value=\"R\"><span> </span><span>Ringo</span></label></li>" +
"</ul>")

  // The value is compared to its String representation
  reactHTMLEqual(w.render("num", 2, {choices: [['1', '1'], ['2', '2'], ['3', '3']]}),
"<ul>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"1\"><span> </span><span>1</span></label></li>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"><span> </span><span>2</span></label></li>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"3\"><span> </span><span>3</span></label></li>" +
"</ul>")
  reactHTMLEqual(w.render("num", "2", {choices: [[1, 1], [2, 2], [3, 3]]}),
"<ul>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"1\"><span> </span><span>1</span></label></li>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"><span> </span><span>2</span></label></li>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"3\"><span> </span><span>3</span></label></li>" +
"</ul>")
  reactHTMLEqual(w.render("num", 2, {choices: [[1, 1], [2, 2], [3, 3]]}),
"<ul>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"1\"><span> </span><span>1</span></label></li>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"><span> </span><span>2</span></label></li>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"3\"><span> </span><span>3</span></label></li>" +
"</ul>")

  // You can also pass "choices" to the constructor:
  w = forms.RadioSelect({choices: [[1, 1], [2, 2], [3, 3]]})
  reactHTMLEqual(w.render("num", 2),
"<ul>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"1\"><span> </span><span>1</span></label></li>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"><span> </span><span>2</span></label></li>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"3\"><span> </span><span>3</span></label></li>" +
"</ul>")

  // If 'choices' is passed to both the constructor and render(), then they'll both be in the output
  reactHTMLEqual(w.render("num", 2, {choices: [[4, 4], [5, 5]]}),
"<ul>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"1\"><span> </span><span>1</span></label></li>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"><span> </span><span>2</span></label></li>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"3\"><span> </span><span>3</span></label></li>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"4\"><span> </span><span>4</span></label></li>" +
"<li><label><input type=\"radio\" name=\"num\" value=\"5\"><span> </span><span>5</span></label></li>" +
"</ul>")

  // RadioSelect uses a RadioFieldRenderer to render the individual radio
  // inputs. You can manipulate that object directly to customise the way
  // the RadioSelect is rendered.
  w = forms.RadioSelect()
  var r = w.getRenderer("beatle", "J", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]})
  var inputs1 = [], inputs2 = [], inputs3 = []
  var radioInputs = r.radioInputs()
  for (var i = 0, inp; inp = radioInputs[i]; i++) {
    inputs1.push(inp.render(), React.DOM.br(null))
    inputs2.push(React.DOM.p(null, inp.tag(), " ", inp.choiceLabel))
    inputs3.push(React.DOM.span(null,
        [inp.name, inp.value, inp.choiceValue, inp.choiceLabel, inp.isChecked()].join(' ')))
  }
  reactHTMLEqual(React.DOM.div(null, inputs1),
"<div>" +
"<label><input type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"><span> </span><span>John</span></label><br>" +
"<label><input type=\"radio\" name=\"beatle\" value=\"P\"><span> </span><span>Paul</span></label><br>" +
"<label><input type=\"radio\" name=\"beatle\" value=\"G\"><span> </span><span>George</span></label><br>" +
"<label><input type=\"radio\" name=\"beatle\" value=\"R\"><span> </span><span>Ringo</span></label><br>" +
"</div>")
  reactHTMLEqual(React.DOM.div(null, inputs2),
"<div>" +
"<p><input type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"><span> </span><span>John</span></p>" +
"<p><input type=\"radio\" name=\"beatle\" value=\"P\"><span> </span><span>Paul</span></p>" +
"<p><input type=\"radio\" name=\"beatle\" value=\"G\"><span> </span><span>George</span></p>" +
"<p><input type=\"radio\" name=\"beatle\" value=\"R\"><span> </span><span>Ringo</span></p>" +
"</div>")
  reactHTMLEqual(React.DOM.div(null, inputs3),
"<div>" +
"<span>beatle J J John true</span>" +
"<span>beatle J P Paul false</span>" +
"<span>beatle J G George false</span>" +
"<span>beatle J R Ringo false</span>" +
"</div>")

  // You can create your own custom renderers for RadioSelect to use.
  var MyRenderer = forms.RadioFieldRenderer.extend()
  MyRenderer.prototype.render = function() {
    var inputs = this.radioInputs()
    var items = []
    for (var i = 0, l = inputs.length; i < l; i++) {
      items.push(inputs[i].render())
      if (i != l - 1) {
        items.push(React.DOM.br(null))
      }
    }
    return React.DOM.div(null, items)
  }

  w = forms.RadioSelect({renderer: MyRenderer})
  reactHTMLEqual(w.render("beatle", "G", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
        "<div><label><input type=\"radio\" name=\"beatle\" value=\"J\"><span> </span><span>John</span></label><br><label><input type=\"radio\" name=\"beatle\" value=\"P\"><span> </span><span>Paul</span></label><br><label><input type=\"radio\" name=\"beatle\" value=\"G\" checked=\"checked\"><span> </span><span>George</span></label><br><label><input type=\"radio\" name=\"beatle\" value=\"R\"><span> </span><span>Ringo</span></label></div>")

  // Or you can use custom RadioSelect fields that use your custom renderer
  var CustomRadioSelect = forms.RadioSelect.extend({
    constructor: function() {
      forms.RadioSelect.call(this, {renderer: MyRenderer})
    }
  })

  w = new CustomRadioSelect()
  reactHTMLEqual(w.render("beatle", "G", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
        "<div><label><input type=\"radio\" name=\"beatle\" value=\"J\"><span> </span><span>John</span></label><br><label><input type=\"radio\" name=\"beatle\" value=\"P\"><span> </span><span>Paul</span></label><br><label><input type=\"radio\" name=\"beatle\" value=\"G\" checked=\"checked\"><span> </span><span>George</span></label><br><label><input type=\"radio\" name=\"beatle\" value=\"R\"><span> </span><span>Ringo</span></label></div>")

  // A RadioFieldRenderer object also allows index access to individual
  // RadioInput objects.
  w = forms.RadioSelect()
  r = w.getRenderer("beatle", "J", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]})
  reactHTMLEqual(r.radioInput(1).render(), "<label><input type=\"radio\" name=\"beatle\" value=\"P\"><span> </span><span>Paul</span></label>")
  reactHTMLEqual(r.radioInput(0).render(), "<label><input type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"><span> </span><span>John</span></label>")
  strictEqual(r.radioInput(0).isChecked(), true)
  strictEqual(r.radioInput(1).isChecked(), false)
  throws(function() { r.radioInput(10); })

  // Choices are escaped correctly
  w = forms.RadioSelect()
  reactHTMLEqual(w.render("escape", null, {choices: [["bad", "you & me"]]}),
"<ul>" +
"<li><label><input type=\"radio\" name=\"escape\" value=\"bad\"><span> </span><span>you &amp; me</span></label></li>" +
"</ul>")

  // Attributes provided at instantiation are passed to the constituent inputs
  w = forms.RadioSelect({attrs: {id: "foo"}})
  reactHTMLEqual(w.render("beatle", "J", {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>" +
"<li><label for=\"foo_0\"><input id=\"foo_0\" type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"><span> </span><span>John</span></label></li>" +
"<li><label for=\"foo_1\"><input id=\"foo_1\" type=\"radio\" name=\"beatle\" value=\"P\"><span> </span><span>Paul</span></label></li>" +
"<li><label for=\"foo_2\"><input id=\"foo_2\" type=\"radio\" name=\"beatle\" value=\"G\"><span> </span><span>George</span></label></li>" +
"<li><label for=\"foo_3\"><input id=\"foo_3\" type=\"radio\" name=\"beatle\" value=\"R\"><span> </span><span>Ringo</span></label></li>" +
"</ul>")

  // Attributes provided at render-time are passed to the constituent inputs
  w = forms.RadioSelect()
  reactHTMLEqual(w.render("beatle", "J", {attrs: {id: "bar"}, choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>" +
"<li><label for=\"bar_0\"><input id=\"bar_0\" type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"><span> </span><span>John</span></label></li>" +
"<li><label for=\"bar_1\"><input id=\"bar_1\" type=\"radio\" name=\"beatle\" value=\"P\"><span> </span><span>Paul</span></label></li>" +
"<li><label for=\"bar_2\"><input id=\"bar_2\" type=\"radio\" name=\"beatle\" value=\"G\"><span> </span><span>George</span></label></li>" +
"<li><label for=\"bar_3\"><input id=\"bar_3\" type=\"radio\" name=\"beatle\" value=\"R\"><span> </span><span>Ringo</span></label></li>" +
"</ul>")
})

QUnit.test("CheckboxSelectMultiple", 19, function() {
  var w = forms.CheckboxSelectMultiple()
  reactHTMLEqual(w.render("beatles", ["J"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"J\" checked=\"checked\"><span> </span><span>John</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"P\"><span> </span><span>Paul</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"G\"><span> </span><span>George</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"R\"><span> </span><span>Ringo</span></label></li>" +
"</ul>")
  reactHTMLEqual(w.render("beatles", ["J", "P"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"J\" checked=\"checked\"><span> </span><span>John</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"P\" checked=\"checked\"><span> </span><span>Paul</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"G\"><span> </span><span>George</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"R\"><span> </span><span>Ringo</span></label></li>" +
"</ul>")
  reactHTMLEqual(w.render("beatles", ["J", "P", "R"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"J\" checked=\"checked\"><span> </span><span>John</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"P\" checked=\"checked\"><span> </span><span>Paul</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"G\"><span> </span><span>George</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"R\" checked=\"checked\"><span> </span><span>Ringo</span></label></li>" +
"</ul>")

  // If the value is null, none of the options are selected
  reactHTMLEqual(w.render("beatles", null, {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"J\"><span> </span><span>John</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"P\"><span> </span><span>Paul</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"G\"><span> </span><span>George</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"R\"><span> </span><span>Ringo</span></label></li>" +
"</ul>")

  // If the value corresponds to a label (but not to an option value), none of the options are selected
  reactHTMLEqual(w.render("beatles", ["John"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"J\"><span> </span><span>John</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"P\"><span> </span><span>Paul</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"G\"><span> </span><span>George</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"R\"><span> </span><span>Ringo</span></label></li>" +
"</ul>")

  // If multiple values are given, but some of them are not valid, the valid ones are selected
  reactHTMLEqual(w.render("beatles", ["J", "G", "foo"], {choices: [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]}),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"J\" checked=\"checked\"><span> </span><span>John</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"P\"><span> </span><span>Paul</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"G\" checked=\"checked\"><span> </span><span>George</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"beatles\" value=\"R\"><span> </span><span>Ringo</span></label></li>" +
"</ul>")

  // The value is compared to its String representation
  reactHTMLEqual(w.render("nums", [2], {choices: [['1', '1'], ['2', '2'], ['3', '3']]}),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"1\"><span> </span><span>1</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"2\" checked=\"checked\"><span> </span><span>2</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"3\"><span> </span><span>3</span></label></li>" +
"</ul>")
  reactHTMLEqual(w.render("nums", ["2"], {choices: [[1, 1], [2, 2], [3, 3]]}),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"1\"><span> </span><span>1</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"2\" checked=\"checked\"><span> </span><span>2</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"3\"><span> </span><span>3</span></label></li>" +
"</ul>")
  reactHTMLEqual(w.render("nums", [2], {choices: [[1, 1], [2, 2], [3, 3]]}),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"1\"><span> </span><span>1</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"2\" checked=\"checked\"><span> </span><span>2</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"3\"><span> </span><span>3</span></label></li>" +
"</ul>")

  // You can also pass 'choices' to the constructor
  w = forms.CheckboxSelectMultiple({choices: [[1, 1], [2, 2], [3, 3]]})
  reactHTMLEqual(w.render("nums", [2]),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"1\"><span> </span><span>1</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"2\" checked=\"checked\"><span> </span><span>2</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"3\"><span> </span><span>3</span></label></li>" +
"</ul>")

  // If 'choices' is passed to both the constructor and render(), then they'll both be in the output
  reactHTMLEqual(w.render("nums", [2], {choices: [[4, 4], [5, 5]]}),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"1\"><span> </span><span>1</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"2\" checked=\"checked\"><span> </span><span>2</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"3\"><span> </span><span>3</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"4\"><span> </span><span>4</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"nums\" value=\"5\"><span> </span><span>5</span></label></li>" +
"</ul>")

  // Choices are escaped correctly
  reactHTMLEqual(w.render("escape", null, {choices: [["bad", "you & me"]]}),
"<ul>" +
"<li><label><input type=\"checkbox\" name=\"escape\" value=\"1\"><span> </span><span>1</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"escape\" value=\"2\"><span> </span><span>2</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"escape\" value=\"3\"><span> </span><span>3</span></label></li>" +
"<li><label><input type=\"checkbox\" name=\"escape\" value=\"bad\"><span> </span><span>you &amp; me</span></label></li>" +
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

  var w = new MyMultiWidget([forms.TextInput({attrs: {"className": "big"}}), forms.TextInput({attrs: {"className": "small"}})])
  reactHTMLEqual(w.render("name", ["john", "lennon"]),
        "<div><input class=\"big\" type=\"text\" name=\"name_0\" value=\"john\"><input class=\"small\" type=\"text\" name=\"name_1\" value=\"lennon\"></div>")
  reactHTMLEqual(w.render("name", "john__lennon"),
        "<div><input class=\"big\" type=\"text\" name=\"name_0\" value=\"john\"><input class=\"small\" type=\"text\" name=\"name_1\" value=\"lennon\"></div>")
  reactHTMLEqual(w.render("name", "john__lennon", {attrs: {id: "foo"}}),
        "<div><input class=\"big\" type=\"text\" name=\"name_0\" id=\"foo_0\" value=\"john\"><input class=\"small\" type=\"text\" name=\"name_1\" id=\"foo_1\" value=\"lennon\"></div>")

  w = new MyMultiWidget([forms.TextInput({attrs: {"className": "big"}}), forms.TextInput({attrs: {"className": "small"}})], {attrs: {id: "bar"}})
  reactHTMLEqual(w.render("name", ["john", "lennon"]),
        "<div><input class=\"big\" type=\"text\" name=\"name_0\" id=\"bar_0\" value=\"john\"><input class=\"small\" type=\"text\" name=\"name_1\" id=\"bar_1\" value=\"lennon\"></div>")

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
  reactHTMLEqual(w.render("date", ""),
        "<div><input type=\"text\" name=\"date_0\"><input type=\"text\" name=\"date_1\"></div>")
  reactHTMLEqual(w.render("date", new Date(2006, 0, 10, 7, 30)),
        "<div><input type=\"text\" name=\"date_0\" value=\"2006-01-10\"><input type=\"text\" name=\"date_1\" value=\"07:30:00\"></div>")
  reactHTMLEqual(w.render("date", [new Date(2006, 0, 10), new Date(1900, 0, 1, 7, 30)]),
        "<div><input type=\"text\" name=\"date_0\" value=\"2006-01-10\"><input type=\"text\" name=\"date_1\" value=\"07:30:00\"></div>")

  // You can also pass "attrs" to the constructor. In this case, the attrs
  // will be included on both widgets.
  w = forms.SplitDateTimeWidget({attrs: {"className": "pretty"}})
  reactHTMLEqual(w.render("date", new Date(2006, 0, 10, 7, 30)),
        "<div><input class=\"pretty\" type=\"text\" name=\"date_0\" value=\"2006-01-10\"><input class=\"pretty\" type=\"text\" name=\"date_1\" value=\"07:30:00\"></div>")

  // Use "dateFormat" and "timeFormat" to change the way a value is displayed
  w = forms.SplitDateTimeWidget({dateFormat: "%d/%m/%Y", timeFormat: "%H:%M"})
  reactHTMLEqual(w.render("date", new Date(2006, 0, 10, 7, 30)),
        "<div><input type=\"text\" name=\"date_0\" value=\"10&#x2f;01&#x2f;2006\"><input type=\"text\" name=\"date_1\" value=\"07:30\"></div>")

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
  reactHTMLEqual(w.render("date", null),
        "<input type=\"text\" name=\"date\">")
  var d = new Date(2007, 8, 17, 12, 51, 34)

  reactHTMLEqual(w.render("date", d),
        "<input type=\"text\" name=\"date\" value=\"2007-09-17 12:51:34\">")
  reactHTMLEqual(w.render("date", new Date(2007, 8, 17, 12, 51)),
        "<input type=\"text\" name=\"date\" value=\"2007-09-17 12:51:00\">")

  // Use "format" to change the way a value is displayed
  w = forms.DateTimeInput({format: "%d/%m/%Y %H:%M", attrs: {type: "datetime"}})
  reactHTMLEqual(w.render("date", d),
        "<input type=\"datetime\" name=\"date\" value=\"17&#x2f;09&#x2f;2007 12:51\">")
  strictEqual(w._hasChanged(d, "17/09/2007 12:51"), false)
})

QUnit.test("DateInput", 5, function() {
  var w = forms.DateInput()
  reactHTMLEqual(w.render("date", null),
        "<input type=\"text\" name=\"date\">")
  var d = new Date(2007, 8, 17)

  reactHTMLEqual(w.render("date", d),
        "<input type=\"text\" name=\"date\" value=\"2007-09-17\">")

  // We should be able to initialise from a String
  reactHTMLEqual(w.render("date", "2007-09-17"),
        "<input type=\"text\" name=\"date\" value=\"2007-09-17\">")

  // Use "format" to change the way a value is displayed
  w = forms.DateInput({format: "%d/%m/%Y", attrs: {type: "date"}})
  reactHTMLEqual(w.render("date", d),
        "<input type=\"date\" name=\"date\" value=\"17&#x2f;09&#x2f;2007\">")
  strictEqual(w._hasChanged(d, "17/09/2007"), false)
})

QUnit.test("TimeInput", 6, function() {
  var w = forms.TimeInput()
  reactHTMLEqual(w.render("time", null),
        "<input type=\"text\" name=\"time\">")
  var t = new Date(1900, 0, 1, 12, 51, 34)

  reactHTMLEqual(w.render("time", t),
        "<input type=\"text\" name=\"time\" value=\"12:51:34\">")
  reactHTMLEqual(w.render("time", new Date(1900, 0, 1, 12, 51)),
        "<input type=\"text\" name=\"time\" value=\"12:51:00\">")

  // We should be able to initialise from a String
  reactHTMLEqual(w.render("time", "13:12:11"),
        "<input type=\"text\" name=\"time\" value=\"13:12:11\">")

  // Use "format" to change the way a value is displayed
  w = forms.TimeInput({format: "%H:%M", attrs: {type: "time"}})
  reactHTMLEqual(w.render("time", t),
        "<input type=\"time\" name=\"time\" value=\"12:51\">")
  strictEqual(w._hasChanged(t, "12:51"), false)
})

QUnit.test("SplitHiddenDateTimeWidget", 3, function() {
  var w = forms.SplitHiddenDateTimeWidget()
  reactHTMLEqual(w.render("date", ""),
        "<div><input type=\"hidden\" name=\"date_0\"><input type=\"hidden\" name=\"date_1\"></div>")
  var d = new Date(2007, 8, 17, 12, 51, 34)
  reactHTMLEqual(w.render("date", d),
        "<div><input type=\"hidden\" name=\"date_0\" value=\"2007-09-17\"><input type=\"hidden\" name=\"date_1\" value=\"12:51:34\"></div>")
  reactHTMLEqual(w.render("date", new Date(2007, 8, 17, 12, 51)),
        "<div><input type=\"hidden\" name=\"date_0\" value=\"2007-09-17\"><input type=\"hidden\" name=\"date_1\" value=\"12:51:00\"></div>")
})

QUnit.test("ClearableFileInput", 6, function() {
  // Quacks like a FieldFile (has a .url and string representation), but
  // doesn't require us to care about anything else.
  var FakeFieldFile = function() { this.url = "something"; }
  FakeFieldFile.prototype.toString = function() { return this.url;}

  // Clear input renders
  var w = forms.ClearableFileInput()
  w.isRequired = false
  reactHTMLEqual(w.render("myfile", new FakeFieldFile()),
"<div><span>Currently</span><span>: </span><a href=\"something\">something</a><span> </span><input type=\"checkbox\" name=\"myfile-clear\" id=\"myfile-clear_id\"><span> </span><label for=\"myfile-clear_id\">Clear</label><br><span>Change</span><span>: </span><input type=\"file\" name=\"myfile\"></div>")

  // A ClearableFileInput should escape name, filename and URL when rendering
  // HTML.
  var StrangeFieldFile = function() { this.url = "something?chapter=1&sect=2&copy=3&lang=en"; }
  StrangeFieldFile.prototype.toString = function() { return "something<div onclick=\"alert('oops')\">.jpg"; }
  var file = new StrangeFieldFile()
  reactHTMLEqual(w.render("my<div>file", file),
"<div><span>Currently</span><span>: </span><a href=\"something?chapter=1&amp;sect=2&amp;copy=3&amp;lang=en\">something&lt;div onclick=&quot;alert(&#x27;oops&#x27;)&quot;&gt;.jpg</a><span> </span><input type=\"checkbox\" name=\"my&lt;div&gt;file-clear\" id=\"my&lt;div&gt;file-clear_id\"><span> </span><label for=\"my&lt;div&gt;file-clear_id\">Clear</label><br><span>Change</span><span>: </span><input type=\"file\" name=\"my&lt;div&gt;file\"></div>")

  // A ClearableFileInput instantiated with no initial value does not render
  // a clear checkbox.
  reactHTMLEqual(w.render("myfile", null),
"<input type=\"file\" name=\"myfile\">")

  // ClearableFileInput.valueFromData returns false if the clear checkbox is
  // checked, if not required.
  strictEqual(w.valueFromData({"myfile-clear": true}, {}, "myfile"),
              false)

  w.isRequired = true

  // A ClearableFileInput with isRequired=True does not render a clear
  // checkbox.
  reactHTMLEqual(w.render("myfile", new FakeFieldFile()),
"<div><span>Currently</span><span>: </span><a href=\"something\">something</a><span> </span><br><span>Change</span><span>: </span><input type=\"file\" name=\"myfile\"></div>")

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
