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

    // You can also pass 'attrs' to the constructor:
    var w = new TextInput({attrs: {"class": "fun"}});
    equals(""+w.render("email", ""),
           "<input class=\"fun\" type=\"text\" name=\"email\">");
    equals(""+w.render("email", "foo@example.com"),
           "<input class=\"fun\" type=\"text\" name=\"email\" value=\"foo@example.com\">");

    // Attributes passed to render() get precedence over those passed to the constructor:
    var w = new TextInput({attrs: {"class": "pretty"}});
    equals(""+w.render("email", "", {"class": "special"}),
           "<input class=\"special\" type=\"text\" name=\"email\">");

    // Attributes can be safe-strings if needed
    var w = new TextInput({attrs: {"onblur": DOMBuilder.markSafe("function('foo')")}});
    equals(""+w.render("email", ""),
           "<input onblur=\"function('foo')\" type=\"text\" name=\"email\">");
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
