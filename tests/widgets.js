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
           "<input type=\"text\" name=\"email\" value=\"test@example.com\" class=\"fun\">");

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
           "<input type=\"password\" name=\"email\" value=\"test@example.com\" class=\"fun\">");

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
           "<input type=\"hidden\" name=\"email\" value=\"test@example.com\" class=\"fun\">");

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

    // No file was uploaded and no initial data.
    equals(w._hasChanged("", null), false);

    // A file was uploaded and no initial data.
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

    // You can also pass "attrs" to the constructor:
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
    expect(7);
    var w = new CheckboxInput();

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

test("SelectMultiple", function()
{
    expect(6);
    var w = new SelectMultiple();
    equals(w._hasChanged(null, null), false);
    equals(w._hasChanged([], null), false);
    equals(w._hasChanged(null, [""]), true);
    equals(w._hasChanged([1, 2], ["1", "2"]), false);
    equals(w._hasChanged([1, 2], ["1"]), true);
    equals(w._hasChanged([1, 2], ["1", "3"]), true);
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
