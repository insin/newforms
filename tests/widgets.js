module("widgets");

test("TextInput", function()
{
    expect(9);
    var w = new TextInput();
    equals(""+w.render("email", ""),
           "<input type=\"text\" name=\"email\">");
    equals(""+w.render("email", null),
           "<input type=\"text\" name=\"email\">");
    equals(""+w.render("email", "test@example.com"),
           "<input type=\"text\" name=\"email\" value=\"test@example.com\">");
    equals(""+w.render("email", "some \"quoted\" & ampersanded value"),
           "<input type=\"text\" name=\"email\" value=\"some &quot;quoted&quot; &amp; ampersanded value\">");
    equals(""+w.render("email", "test@example.com", {"class": "fun"}),
           "<input type=\"text\" name=\"email\" class=\"fun\" value=\"test@example.com\">");

    // You can also pass "attrs" to the constructor
    w = new TextInput({attrs: {"class": "fun"}});
    equals(""+w.render("email", ""),
           "<input class=\"fun\" type=\"text\" name=\"email\">");
    equals(""+w.render("email", "foo@example.com"),
           "<input class=\"fun\" type=\"text\" name=\"email\" value=\"foo@example.com\">");

    // Attributes passed to render() get precedence over those passed to the constructor
    w = new TextInput({attrs: {"class": "pretty"}});
    equals(""+w.render("email", "", {"class": "special"}),
           "<input class=\"special\" type=\"text\" name=\"email\">");

    // Attributes can be safe strings if needed
    w = new TextInput({attrs: {"onblur": DOMBuilder.markSafe("function('foo')")}});
    equals(""+w.render("email", ""),
           "<input onblur=\"function('foo')\" type=\"text\" name=\"email\">");
});

test("PasswordInput", function()
{
    expect(13);
    var w = new PasswordInput();
    equals(""+w.render("email", ""),
           "<input type=\"password\" name=\"email\">");
    equals(""+w.render("email", null),
           "<input type=\"password\" name=\"email\">");
    equals(""+w.render("email", "test@example.com"),
           "<input type=\"password\" name=\"email\" value=\"test@example.com\">");
    equals(""+w.render("email", "some \"quoted\" & ampersanded value"),
           "<input type=\"password\" name=\"email\" value=\"some &quot;quoted&quot; &amp; ampersanded value\">");
    equals(""+w.render("email", "test@example.com", {"class": "fun"}),
           "<input type=\"password\" name=\"email\" class=\"fun\" value=\"test@example.com\">");

    // You can also pass "attrs" to the constructor
    w = new PasswordInput({attrs: {"class": "fun"}});
    equals(""+w.render("email", ""),
           "<input class=\"fun\" type=\"password\" name=\"email\">");
    equals(""+w.render("email", "foo@example.com"),
           "<input class=\"fun\" type=\"password\" name=\"email\" value=\"foo@example.com\">");

    // Attributes passed to render() get precedence over those passed to the constructor
    w = new PasswordInput({attrs: {"class": "pretty"}});
    equals(""+w.render("email", "", {"class": "special"}),
           "<input class=\"special\" type=\"password\" name=\"email\">");

    // The renderValue argument lets you specify whether the widget should
    // render its value. You may want to do this for security reasons.
    w = new PasswordInput({renderValue: true});
    equals(""+w.render("email", "secret"),
           "<input type=\"password\" name=\"email\" value=\"secret\">");
    w = new PasswordInput({renderValue: false});
    equals(""+w.render("email", ""),
           "<input type=\"password\" name=\"email\">");
    equals(""+w.render("email", null),
           "<input type=\"password\" name=\"email\">");
    equals(""+w.render("email", "secret"),
           "<input type=\"password\" name=\"email\">");
    w = new PasswordInput({attrs: {"class": "fun"}, renderValue: false});
    equals(""+w.render("email", "secret"),
           "<input class=\"fun\" type=\"password\" name=\"email\">");
});

test("HiddenInput", function()
{
    expect(10);
    var w = new HiddenInput();
    equals(""+w.render("email", ""),
           "<input type=\"hidden\" name=\"email\">");
    equals(""+w.render("email", null),
           "<input type=\"hidden\" name=\"email\">");
    equals(""+w.render("email", "test@example.com"),
           "<input type=\"hidden\" name=\"email\" value=\"test@example.com\">");
    equals(""+w.render("email", "some \"quoted\" & ampersanded value"),
           "<input type=\"hidden\" name=\"email\" value=\"some &quot;quoted&quot; &amp; ampersanded value\">");
    equals(""+w.render("email", "test@example.com", {"class": "fun"}),
           "<input type=\"hidden\" name=\"email\" class=\"fun\" value=\"test@example.com\">");

    // You can also pass "attrs" to the constructor
    w = new HiddenInput({attrs: {"class": "fun"}});
    equals(""+w.render("email", ""),
           "<input class=\"fun\" type=\"hidden\" name=\"email\">");
    equals(""+w.render("email", "foo@example.com"),
           "<input class=\"fun\" type=\"hidden\" name=\"email\" value=\"foo@example.com\">");

    // Attributes passed to render() get precedence over those passed to the constructor
    w = new HiddenInput({attrs: {"class": "pretty"}});
    equals(""+w.render("email", "", {"class": "special"}),
           "<input class=\"special\" type=\"hidden\" name=\"email\">");

    // Boolean values are rendered to their string forms ("true" and "false")
    w = new HiddenInput();
    equals(""+w.render('get_spam', false),
           "<input type=\"hidden\" name=\"get_spam\" value=\"false\">");
    equals(""+w.render('get_spam', true),
           "<input type=\"hidden\" name=\"get_spam\" value=\"true\">");
});

test("MultipleHiddenInput", function()
{
    expect(11);
    var w = new MultipleHiddenInput();
    equals(""+w.render("email", []),
           "<span></span>");
    equals(""+w.render("email", null),
           "<span></span>");
    equals(""+w.render("email", ["test@example.com"]),
           "<span><input type=\"hidden\" name=\"email\" value=\"test@example.com\"></span>");
    equals(""+w.render("email", ["some \"quoted\" & ampersanded value"]),
           "<span><input type=\"hidden\" name=\"email\" value=\"some &quot;quoted&quot; &amp; ampersanded value\"></span>");
    equals(""+w.render("email", ["test@example.com", "foo@example.com"]),
           "<span><input type=\"hidden\" name=\"email\" value=\"test@example.com\"><input type=\"hidden\" name=\"email\" value=\"foo@example.com\"></span>");
    equals(""+w.render("email", ["test@example.com"], {"class": "fun"}),
           "<span><input type=\"hidden\" name=\"email\" class=\"fun\" value=\"test@example.com\"></span>");
    equals(""+w.render("email", ["test@example.com", "foo@example.com"], {"class": "fun"}),
           "<span><input type=\"hidden\" name=\"email\" class=\"fun\" value=\"test@example.com\"><input type=\"hidden\" name=\"email\" class=\"fun\" value=\"foo@example.com\"></span>");

    // You can also pass "attrs" to the constructor
    w = new MultipleHiddenInput({attrs: {"class": "fun"}});
    equals(""+w.render("email", []),
           "<span></span>");
    equals(""+w.render("email", ["foo@example.com"]),
           "<span><input class=\"fun\" type=\"hidden\" name=\"email\" value=\"foo@example.com\"></span>");
    equals(""+w.render("email", ["foo@example.com", "test@example.com",]),
           "<span><input class=\"fun\" type=\"hidden\" name=\"email\" value=\"foo@example.com\"><input class=\"fun\" type=\"hidden\" name=\"email\" value=\"test@example.com\"></span>");

    // Attributes passed to render() get precedence over those passed to the constructor
    w = new MultipleHiddenInput({attrs: {"class": "pretty"}});
    equals(""+w.render("email", ["foo@example.com"], {"class": "special"}),
           "<span><input class=\"special\" type=\"hidden\" name=\"email\" value=\"foo@example.com\"></span>");
});

test("FileInput", function()
{
    expect(11);
    // FileInput widgets don't ever show the value, because the old value is of
    // no use if you are updating the form or if the provided file generated an
    // error.
    var w = new FileInput();
    equals(""+w.render("email", ""),
           "<input type=\"file\" name=\"email\">");
    equals(""+w.render("email", null),
           "<input type=\"file\" name=\"email\">");
    equals(""+w.render("email", "test@example.com"),
           "<input type=\"file\" name=\"email\">");
    equals(""+w.render("email", "some \"quoted\" & ampersanded value"),
           "<input type=\"file\" name=\"email\">");
    equals(""+w.render("email", "test@example.com", {"class": "fun"}),
           "<input type=\"file\" name=\"email\" class=\"fun\">");

    // You can also pass "attrs" to the constructor
    w = new FileInput({attrs: {"class": "fun"}});
    equals(""+w.render("email", ""),
           "<input class=\"fun\" type=\"file\" name=\"email\">");
    equals(""+w.render("email", "foo@example.com"),
           "<input class=\"fun\" type=\"file\" name=\"email\">");

    // Test for the behavior of _has_changed for FileInput. The value of data
    // will more than likely come from request.FILES. The value of initial data
    // will likely be a filename stored in the database. Since its value is of
    // no use to a FileInput it is ignored.
    w = new FileInput();

    // No file was uploaded and no initial data
    equals(w._hasChanged("", null), false);

    // A file was uploaded and no initial data
    equals(w._hasChanged("", {filename: "resume.txt", content: "My resume"}), true);

    // A file was not uploaded, but there is initial data
    equals(w._hasChanged("resume.txt", null), false);

    // A file was uploaded and there is initial data (file identity is not dealt
    // with here).
    equals(w._hasChanged("resume.txt", {filename: "resume.txt", content: "My resume"}), true);
});

test("Textarea", function()
{
    expect(9);
    var w = new Textarea();
    equals(""+w.render("msg", ""),
           "<textarea rows=\"10\" cols=\"40\" name=\"msg\"></textarea>");
    equals(""+w.render("msg", null),
           "<textarea rows=\"10\" cols=\"40\" name=\"msg\"></textarea>");
    equals(""+w.render("msg", "value"),
           "<textarea rows=\"10\" cols=\"40\" name=\"msg\">value</textarea>");
    equals(""+w.render("msg", "some \"quoted\" & ampersanded value"),
           "<textarea rows=\"10\" cols=\"40\" name=\"msg\">some &quot;quoted&quot; &amp; ampersanded value</textarea>");
    equals(""+w.render("msg", DOMBuilder.markSafe("pre &quot;quoted&quot; value")),
           "<textarea rows=\"10\" cols=\"40\" name=\"msg\">pre &quot;quoted&quot; value</textarea>");
    equals(""+w.render("msg", "value", {"class": "pretty", rows: 20}),
           "<textarea rows=\"20\" cols=\"40\" name=\"msg\" class=\"pretty\">value</textarea>");

    // You can also pass "attrs" to the constructor
    w = new Textarea({attrs: {"class": "pretty"}});
    equals(""+w.render("msg", ""),
           "<textarea rows=\"10\" cols=\"40\" class=\"pretty\" name=\"msg\"></textarea>");
    equals(""+w.render("msg", "example"),
           "<textarea rows=\"10\" cols=\"40\" class=\"pretty\" name=\"msg\">example</textarea>");

    // Attributes passed to render() get precedence over those passed to the constructor
    w = new Textarea({attrs: {"class": "pretty"}});
    equals(""+w.render("msg", "", {"class": "special"}),
           "<textarea rows=\"10\" cols=\"40\" class=\"special\" name=\"msg\"></textarea>");
});

test("CheckboxInput", function()
{
    expect(22);
    var w = new CheckboxInput();
    equals(""+w.render("is_cool", ""),
           "<input type=\"checkbox\" name=\"is_cool\">");
    equals(""+w.render("is_cool", null),
           "<input type=\"checkbox\" name=\"is_cool\">");
    equals(""+w.render("is_cool", false),
           "<input type=\"checkbox\" name=\"is_cool\">");
    equals(""+w.render("is_cool", true),
           "<input type=\"checkbox\" name=\"is_cool\" checked=\"checked\">");

    // Using any value that's not in ("", null, false, true) will check the
    // checkbox and set the "value" attribute.
    equals(""+w.render("is_cool", "foo"),
           "<input type=\"checkbox\" name=\"is_cool\" checked=\"checked\" value=\"foo\">");

    equals(""+w.render("is_cool", false, {"class": "pretty"}),
           "<input type=\"checkbox\" name=\"is_cool\" class=\"pretty\">");

    // You can also pass "attrs" to the constructor
    w = new CheckboxInput({attrs: {"class": "pretty"}});
    equals(""+w.render("is_cool", ""),
           "<input class=\"pretty\" type=\"checkbox\" name=\"is_cool\">");

    // Attributes passed to render() get precedence over those passed to the constructor
    w = new CheckboxInput({attrs: {"class": "pretty"}});
    equals(""+w.render("is_cool", false, {"class": "special"}),
           "<input class=\"special\" type=\"checkbox\" name=\"is_cool\">");

    // You can pass "checkTest" to the constructor. This is a function that
    // takes the value and returns true if the box should be checked.
    w = new CheckboxInput({checkTest: function(value) { return value.indexOf("hello") == 0; }});
    equals(""+w.render("greeting", ""),
           "<input type=\"checkbox\" name=\"greeting\">");
    equals(""+w.render("greeting", "hello"),
           "<input type=\"checkbox\" name=\"greeting\" checked=\"checked\" value=\"hello\">");
    equals(""+w.render("greeting", "hello there"),
           "<input type=\"checkbox\" name=\"greeting\" checked=\"checked\" value=\"hello there\">");
    equals(""+w.render("greeting", "hello & goodbye"),
           "<input type=\"checkbox\" name=\"greeting\" checked=\"checked\" value=\"hello &amp; goodbye\">");

    // A subtlety: If the "checkTest" argument cannot handle a value and throws
    // an exception,  the exception will be swallowed and the box will not be
    // checked. In this example, the "checkTest" assumes the value has an
    // indexOf() method, which fails for the values true, false and null.
    equals(""+w.render("greeting", true),
           "<input type=\"checkbox\" name=\"greeting\">");
    equals(""+w.render("greeting", false),
           "<input type=\"checkbox\" name=\"greeting\">");
    equals(""+w.render("greeting", null),
           "<input type=\"checkbox\" name=\"greeting\">");

    // The CheckboxInput widget will return False if the key is not found in
    // the data (because HTML form submission doesn't send any result for
    // unchecked checkboxes).
    equals(w.valueFromData({}, {}, 'testing'), false);

    equals(w._hasChanged(null, null), false);
    equals(w._hasChanged(null, ""), false);
    equals(w._hasChanged("", ""), false);
    equals(w._hasChanged(false, "on"), true);
    equals(w._hasChanged(true, "on"), false);
    equals(w._hasChanged(true, ""), true);
});

test("Select", function()
{
    expect(12);
    var w = new Select();
    equals(""+w.render("beatle", "J", {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
           "<select name=\"beatle\"><option value=\"J\" selected=\"selected\">John</option><option value=\"P\">Paul</option><option value=\"G\">George</option><option value=\"R\">Ringo</option></select>");

    // If the value is null, none of the options are selected
    equals(""+w.render("beatle", null, {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
           "<select name=\"beatle\"><option value=\"J\">John</option><option value=\"P\">Paul</option><option value=\"G\">George</option><option value=\"R\">Ringo</option></select>");

    // If the value corresponds to a label (but not to an option value), none of the options are selected
    equals(""+w.render("beatle", "John", {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
           "<select name=\"beatle\"><option value=\"J\">John</option><option value=\"P\">Paul</option><option value=\"G\">George</option><option value=\"R\">Ringo</option></select>");

    // The value is compared to its String representation
    equals(""+w.render("num", 2, {}, [['1', '1'], ['2', '2'], ['3', '3']]),
           "<select name=\"num\"><option value=\"1\">1</option><option value=\"2\" selected=\"selected\">2</option><option value=\"3\">3</option></select>");
    equals(""+w.render("num", "2", {}, [[1, 1], [2, 2], [3, 3]]),
           "<select name=\"num\"><option value=\"1\">1</option><option value=\"2\" selected=\"selected\">2</option><option value=\"3\">3</option></select>");
    equals(""+w.render("num", 2, {}, [[1, 1], [2, 2], [3, 3]]),
           "<select name=\"num\"><option value=\"1\">1</option><option value=\"2\" selected=\"selected\">2</option><option value=\"3\">3</option></select>");

    // You can also pass "choices" to the constructor:
    w = new Select({choices: [[1, 1], [2, 2], [3, 3]]});
    equals(""+w.render("num", 2),
           "<select name=\"num\"><option value=\"1\">1</option><option value=\"2\" selected=\"selected\">2</option><option value=\"3\">3</option></select>");

    // If "choices" is passed to both the constructor and render(), then they'll both be in the output
    equals(""+w.render("num", 2, {}, [[4, 4], [5, 5]]),
           "<select name=\"num\"><option value=\"1\">1</option><option value=\"2\" selected=\"selected\">2</option><option value=\"3\">3</option><option value=\"4\">4</option><option value=\"5\">5</option></select>");

    // Choices are escaped correctly
    equals(""+w.render("num", null, {}, [["bad", "you & me"], ["good", DOMBuilder.markSafe("you &gt; me")]]),
           "<select name=\"num\"><option value=\"1\">1</option><option value=\"2\">2</option><option value=\"3\">3</option><option value=\"bad\">you &amp; me</option><option value=\"good\">you &gt; me</option></select>");

    // Choices can be nested one level in order to create HTML optgroups
    w.choices = [['outer1', 'Outer 1'], ['Group "1"', [['inner1', 'Inner 1'], ['inner2', 'Inner 2']]]];
    equals(""+w.render("nestchoice", null),
           "<select name=\"nestchoice\"><option value=\"outer1\">Outer 1</option><optgroup label=\"Group &quot;1&quot;\"><option value=\"inner1\">Inner 1</option><option value=\"inner2\">Inner 2</option></optgroup></select>");
    equals(""+w.render("nestchoice", "outer1"),
           "<select name=\"nestchoice\"><option value=\"outer1\" selected=\"selected\">Outer 1</option><optgroup label=\"Group &quot;1&quot;\"><option value=\"inner1\">Inner 1</option><option value=\"inner2\">Inner 2</option></optgroup></select>");
    equals(""+w.render("nestchoice", "inner1"),
           "<select name=\"nestchoice\"><option value=\"outer1\">Outer 1</option><optgroup label=\"Group &quot;1&quot;\"><option value=\"inner1\" selected=\"selected\">Inner 1</option><option value=\"inner2\">Inner 2</option></optgroup></select>");
});

test("NullBooleanSelect", function()
{
    expect(5);
    var w = new NullBooleanSelect();
    equals(""+w.render("is_cool", true),
           "<select name=\"is_cool\"><option value=\"1\">Unknown</option><option value=\"2\" selected=\"selected\">Yes</option><option value=\"3\">No</option></select>");
    equals(""+w.render("is_cool", false),
           "<select name=\"is_cool\"><option value=\"1\">Unknown</option><option value=\"2\">Yes</option><option value=\"3\" selected=\"selected\">No</option></select>");
    equals(""+w.render("is_cool", null),
           "<select name=\"is_cool\"><option value=\"1\" selected=\"selected\">Unknown</option><option value=\"2\">Yes</option><option value=\"3\">No</option></select>");
    equals(""+w.render("is_cool", "2"),
           "<select name=\"is_cool\"><option value=\"1\">Unknown</option><option value=\"2\" selected=\"selected\">Yes</option><option value=\"3\">No</option></select>");
    equals(""+w.render("is_cool", "3"),
           "<select name=\"is_cool\"><option value=\"1\">Unknown</option><option value=\"2\">Yes</option><option value=\"3\" selected=\"selected\">No</option></select>");
});

test("SelectMultiple", function()
{
    expect(22);
    var w = new SelectMultiple();
    equals(""+w.render("beatles", ["J"], {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
           "<select name=\"beatles\" multiple=\"multiple\"><option value=\"J\" selected=\"selected\">John</option><option value=\"P\">Paul</option><option value=\"G\">George</option><option value=\"R\">Ringo</option></select>");
    equals(""+w.render("beatles", ["J", "P"], {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
           "<select name=\"beatles\" multiple=\"multiple\"><option value=\"J\" selected=\"selected\">John</option><option value=\"P\" selected=\"selected\">Paul</option><option value=\"G\">George</option><option value=\"R\">Ringo</option></select>");
    equals(""+w.render("beatles", ["J", "P", "R"], {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
           "<select name=\"beatles\" multiple=\"multiple\"><option value=\"J\" selected=\"selected\">John</option><option value=\"P\" selected=\"selected\">Paul</option><option value=\"G\">George</option><option value=\"R\" selected=\"selected\">Ringo</option></select>");

    // If the value is null, none of the options are selected
    equals(""+w.render("beatles", null, {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
           "<select name=\"beatles\" multiple=\"multiple\"><option value=\"J\">John</option><option value=\"P\">Paul</option><option value=\"G\">George</option><option value=\"R\">Ringo</option></select>");

    // If the value corresponds to a label (but not to an option value), none of the options are selected
    equals(""+w.render("beatles", ["John"], {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
           "<select name=\"beatles\" multiple=\"multiple\"><option value=\"J\">John</option><option value=\"P\">Paul</option><option value=\"G\">George</option><option value=\"R\">Ringo</option></select>");

    // If multiple values are given, but some of them are not valid, the valid ones are selected
    equals(""+w.render("beatles", ["J", "G", "foo"], {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
           "<select name=\"beatles\" multiple=\"multiple\"><option value=\"J\" selected=\"selected\">John</option><option value=\"P\">Paul</option><option value=\"G\" selected=\"selected\">George</option><option value=\"R\">Ringo</option></select>");

    // The value is compared to its String representation
    equals(""+w.render("nums", [2], {}, [['1', '1'], ['2', '2'], ['3', '3']]),
           "<select name=\"nums\" multiple=\"multiple\"><option value=\"1\">1</option><option value=\"2\" selected=\"selected\">2</option><option value=\"3\">3</option></select>");
    equals(""+w.render("nums", ["2"], {}, [[1, 1], [2, 2], [3, 3]]),
           "<select name=\"nums\" multiple=\"multiple\"><option value=\"1\">1</option><option value=\"2\" selected=\"selected\">2</option><option value=\"3\">3</option></select>");
    equals(""+w.render("nums", [2], {}, [[1, 1], [2, 2], [3, 3]]),
           "<select name=\"nums\" multiple=\"multiple\"><option value=\"1\">1</option><option value=\"2\" selected=\"selected\">2</option><option value=\"3\">3</option></select>");

    // You can also pass "choices" to the constructor:
    w = new SelectMultiple({choices: [[1, 1], [2, 2], [3, 3]]});
    equals(""+w.render("nums", [2]),
           "<select name=\"nums\" multiple=\"multiple\"><option value=\"1\">1</option><option value=\"2\" selected=\"selected\">2</option><option value=\"3\">3</option></select>");

    // If "choices" is passed to both the constructor and render(), then they'll both be in the output
    equals(""+w.render("nums", [2], {}, [[4, 4], [5, 5]]),
           "<select name=\"nums\" multiple=\"multiple\"><option value=\"1\">1</option><option value=\"2\" selected=\"selected\">2</option><option value=\"3\">3</option><option value=\"4\">4</option><option value=\"5\">5</option></select>");

    // Choices are escaped correctly
    equals(""+w.render("nums", null, {}, [["bad", "you & me"], ["good", DOMBuilder.markSafe("you &gt; me")]]),
           "<select name=\"nums\" multiple=\"multiple\"><option value=\"1\">1</option><option value=\"2\">2</option><option value=\"3\">3</option><option value=\"bad\">you &amp; me</option><option value=\"good\">you &gt; me</option></select>");

    // Test the usage of _hasChanged
    equals(w._hasChanged(null, null), false);
    equals(w._hasChanged([], null), false);
    equals(w._hasChanged(null, [""]), true);
    equals(w._hasChanged([1, 2], ["1", "2"]), false);
    equals(w._hasChanged([1, 2], ["1"]), true);
    equals(w._hasChanged([1, 2], ["1", "3"]), true);

    // Choices can be nested one level in order to create HTML optgroups
    w.choices = [['outer1', 'Outer 1'], ['Group "1"', [['inner1', 'Inner 1'], ['inner2', 'Inner 2']]]];
    equals(""+w.render("nestchoice", null),
           "<select name=\"nestchoice\" multiple=\"multiple\"><option value=\"outer1\">Outer 1</option><optgroup label=\"Group &quot;1&quot;\"><option value=\"inner1\">Inner 1</option><option value=\"inner2\">Inner 2</option></optgroup></select>");
    equals(""+w.render("nestchoice", ["outer1"]),
           "<select name=\"nestchoice\" multiple=\"multiple\"><option value=\"outer1\" selected=\"selected\">Outer 1</option><optgroup label=\"Group &quot;1&quot;\"><option value=\"inner1\">Inner 1</option><option value=\"inner2\">Inner 2</option></optgroup></select>");
    equals(""+w.render("nestchoice", ["inner1"]),
           "<select name=\"nestchoice\" multiple=\"multiple\"><option value=\"outer1\">Outer 1</option><optgroup label=\"Group &quot;1&quot;\"><option value=\"inner1\" selected=\"selected\">Inner 1</option><option value=\"inner2\">Inner 2</option></optgroup></select>");
    equals(""+w.render("nestchoice", ["outer1", "inner2"]),
           "<select name=\"nestchoice\" multiple=\"multiple\"><option value=\"outer1\" selected=\"selected\">Outer 1</option><optgroup label=\"Group &quot;1&quot;\"><option value=\"inner1\">Inner 1</option><option value=\"inner2\" selected=\"selected\">Inner 2</option></optgroup></select>");
});

test("RadioSelect", function()
{
    expect(13);
    var w = new RadioSelect();
    equals(""+w.render("beatle", "J", {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
        "<ul><li><label><input type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"> John</label></li><li><label><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label></li><li><label><input type=\"radio\" name=\"beatle\" value=\"G\"> George</label></li><li><label><input type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label></li></ul>");

    // If the value is null, none of the options are checked
    equals(""+w.render("beatle", null, {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
        "<ul><li><label><input type=\"radio\" name=\"beatle\" value=\"J\"> John</label></li><li><label><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label></li><li><label><input type=\"radio\" name=\"beatle\" value=\"G\"> George</label></li><li><label><input type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label></li></ul>");

    // If the value corresponds to a label (but not to an option value), none of the options are checked
    equals(""+w.render("beatle", "John", {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
        "<ul><li><label><input type=\"radio\" name=\"beatle\" value=\"J\"> John</label></li><li><label><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label></li><li><label><input type=\"radio\" name=\"beatle\" value=\"G\"> George</label></li><li><label><input type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label></li></ul>");

    // The value is compared to its String representation
    equals(""+w.render("num", 2, {}, [['1', '1'], ['2', '2'], ['3', '3']]),
           "<ul><li><label><input type=\"radio\" name=\"num\" value=\"1\"> 1</label></li><li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"> 2</label></li><li><label><input type=\"radio\" name=\"num\" value=\"3\"> 3</label></li></ul>");
    equals(""+w.render("num", "2", {}, [[1, 1], [2, 2], [3, 3]]),
           "<ul><li><label><input type=\"radio\" name=\"num\" value=\"1\"> 1</label></li><li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"> 2</label></li><li><label><input type=\"radio\" name=\"num\" value=\"3\"> 3</label></li></ul>");
    equals(""+w.render("num", 2, {}, [[1, 1], [2, 2], [3, 3]]),
           "<ul><li><label><input type=\"radio\" name=\"num\" value=\"1\"> 1</label></li><li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"> 2</label></li><li><label><input type=\"radio\" name=\"num\" value=\"3\"> 3</label></li></ul>");

    // You can also pass "choices" to the constructor:
    w = new RadioSelect({choices: [[1, 1], [2, 2], [3, 3]]});
    equals(""+w.render("num", 2),
           "<ul><li><label><input type=\"radio\" name=\"num\" value=\"1\"> 1</label></li><li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"> 2</label></li><li><label><input type=\"radio\" name=\"num\" value=\"3\"> 3</label></li></ul>");

    // If 'choices' is passed to both the constructor and render(), then they'll both be in the output
    equals(""+w.render("num", 2, {}, [[4, 4], [5, 5]]),
           "<ul><li><label><input type=\"radio\" name=\"num\" value=\"1\"> 1</label></li><li><label><input type=\"radio\" name=\"num\" value=\"2\" checked=\"checked\"> 2</label></li><li><label><input type=\"radio\" name=\"num\" value=\"3\"> 3</label></li><li><label><input type=\"radio\" name=\"num\" value=\"4\"> 4</label></li><li><label><input type=\"radio\" name=\"num\" value=\"5\"> 5</label></li></ul>");

    // TODO RadioSelect uses a RadioFieldRenderer to render the individual radio
    //      inputs. You can manipulate that object directly to customize the way
    //      the RadioSelect is rendered.

    // You can create your own custom renderers for RadioSelect to use.
    function MyRenderer()
    {
        RadioFieldRenderer.apply(this, arguments);
    }
    MyRenderer.prototype = new RadioFieldRenderer();
    MyRenderer.prototype.render = function()
    {
        var inputs = this.radioInputs();
        var items = [];
        for (var i = 0, l = inputs.length; i < l; i++)
        {
            items.push(inputs[i].labelTag());
            if (i != l - 1)
            {
                items.push(DOMBuilder.createElement("br"));
            }
        }
        return DOMBuilder.createElement("div", {}, items);
    };

    w = new RadioSelect({renderer: MyRenderer});
    equals(""+w.render("beatle", "G", {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
           "<div><label><input type=\"radio\" name=\"beatle\" value=\"J\"> John</label><br><label><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label><br><label><input type=\"radio\" name=\"beatle\" value=\"G\" checked=\"checked\"> George</label><br><label><input type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label></div>");

    // Or you can use custom RadioSelect fields that use your custom renderer
    function CustomRadioSelect(kwargs)
    {
        kwargs = extendObject({}, kwargs, {renderer: MyRenderer});
        RadioSelect.call(this, kwargs);
    }
    CustomRadioSelect.prototype = new RadioSelect();

    w = new CustomRadioSelect();
    equals(""+w.render("beatle", "G", {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
           "<div><label><input type=\"radio\" name=\"beatle\" value=\"J\"> John</label><br><label><input type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label><br><label><input type=\"radio\" name=\"beatle\" value=\"G\" checked=\"checked\"> George</label><br><label><input type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label></div>");

    // TODO A RadioFieldRenderer object also allows index access to individual
    //      RadioInput objects.

    // Choices are escaped correctly
    w = new RadioSelect();
    equals(""+w.render("escape", null, {}, [["bad", "you & me"], ["good", DOMBuilder.markSafe("you &gt; me")]]),
           "<ul><li><label><input type=\"radio\" name=\"escape\" value=\"bad\"> you &amp; me</label></li><li><label><input type=\"radio\" name=\"escape\" value=\"good\"> you &gt; me</label></li></ul>");

    // Attributes provided at instantiation are passed to the constituent inputs
    w = new RadioSelect({attrs: {id: "foo"}});
    equals(""+w.render("beatle", "J", {}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
           "<ul><li><label for=\"foo_0\"><input id=\"foo_0\" type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"> John</label></li><li><label for=\"foo_1\"><input id=\"foo_1\" type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label></li><li><label for=\"foo_2\"><input id=\"foo_2\" type=\"radio\" name=\"beatle\" value=\"G\"> George</label></li><li><label for=\"foo_3\"><input id=\"foo_3\" type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label></li></ul>");

    // Attributes provided at render-time are passed to the constituent inputs
    w = new RadioSelect();
    equals(""+w.render("beatle", "J", {id: "bar"}, [['J', 'John'], ['P', 'Paul'], ['G', 'George'], ['R', 'Ringo']]),
           "<ul><li><label for=\"bar_0\"><input id=\"bar_0\" type=\"radio\" name=\"beatle\" value=\"J\" checked=\"checked\"> John</label></li><li><label for=\"bar_1\"><input id=\"bar_1\" type=\"radio\" name=\"beatle\" value=\"P\"> Paul</label></li><li><label for=\"bar_2\"><input id=\"bar_2\" type=\"radio\" name=\"beatle\" value=\"G\"> George</label></li><li><label for=\"bar_3\"><input id=\"bar_3\" type=\"radio\" name=\"beatle\" value=\"R\"> Ringo</label></li></ul>");
});

test("CheckboxSelectMultiple", function()
{
    expect(6);
    var w = new CheckboxSelectMultiple();
    equals(w._hasChanged(null, null), false);
    equals(w._hasChanged([], null), false);
    equals(w._hasChanged(null, [""]), true);
    equals(w._hasChanged([1, 2], ["1", "2"]), false);
    equals(w._hasChanged([1, 2], ["1"]), true);
    equals(w._hasChanged([1, 2], ["1", "3"]), true);
});

test("MultiWidget", function()
{
    function MyMultiWidget(widgets)
    {
        MultiWidget.call(this, widgets);
    }
    MyMultiWidget.prototype = new MultiWidget();
    MyMultiWidget.prototype.decompress = function(value)
    {
        if (value)
        {
            return value.split("__");
        }
        return ["", ""];
    };

    expect(4);
    var w = new MyMultiWidget([new TextInput(), new TextInput()])

    // Test with no initial data
    equals(w._hasChanged(null, ["john", "lennon"]), true);
    // Test when data is the same as initial
    equals(w._hasChanged("john__lennon", ["john", "lennon"]), false);
    // Test when the first widget's data has changed
    equals(w._hasChanged("john__lennon", ["alfred", "lennon"]), true);
    // Test when the last widget's data has changed. This ensures that it is
    // not short circuiting while testing the widgets.
    equals(w._hasChanged("john__lennon", ["john", "denver"]), true);
});

test("SplitDateTimeWidget", function()
{
    expect(2);
    var w = new SplitDateTimeWidget();
    equals(w._hasChanged(new Date(2008, 4, 5, 12, 40, 00), ["2008-05-05", "12:40:00"]), false);
    equals(w._hasChanged(new Date(2008, 4, 5, 12, 40, 00), ["2008-05-05", "12:41:00"]), true);
});

test("DateTimeInput", function()
{
    expect(1);
    var d = new Date(2007, 8, 17, 12, 51, 34);

    // Use "format" to change the way a value is displayed
    var w = new DateTimeInput({format: "%d/%m/%Y %H:%M"});
    equals(w._hasChanged(d, "17/09/2007 12:51"), false);
});

test("DateInput", function()
{
    expect(1);
    var d = new Date(2007, 8, 17);

    // Use "format" to change the way a value is displayed
    var w = new DateInput({format: "%d/%m/%Y"});
    equals(w._hasChanged(d, "17/09/2007"), false);
});

test("TimeInput", function()
{
    expect(1);
    var t = new Date(1900, 0, 1, 12, 51, 34);

    // Use "format" to change the way a value is displayed
    var w = new TimeInput({format: "%H:%M"});
    equals(w._hasChanged(t, "12:51"), false);
});
