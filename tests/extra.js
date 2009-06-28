module("extra stuff");

test("MultiWidget and MultiValueField", function()
{
    expect(7);

    function ComplexWidget(kwargs)
    {
        var widgets = [
            new TextInput(),
            new SelectMultiple({choices: [["J", "John"], ["P", "Paul"], ["G", "George"], ["R", "Ringo"]]}),
            new SplitDateTimeWidget()
        ];
        MultiWidget.call(this, widgets, kwargs);
    }
    ComplexWidget.prototype = new MultiWidget();
    ComplexWidget.prototype.decompress = function(value)
    {
        if (value)
        {
            var data = value.split(",");
            var t = time.strptime(data[2], "%Y-%m-%d %H:%M:%S");
            return [data[0], data[1], new Date(t[0], t[1] -1, t[2], t[3], t[4], t[5])];
        }
        return [null, null, null];
    }
    ComplexWidget.prototype.formatOutput = function(renderedWidgets)
    {
        return DOMBuilder.createElement("div", {"class": "complex"}, renderedWidgets);
    };

    var w = new ComplexWidget();
    equals(""+w.render("name", "some text,JP,2007-04-25 06:24:00"),
"<div class=\"complex\"><input type=\"text\" name=\"name_0\" value=\"some text\"><select name=\"name_1\" multiple=\"multiple\">\n" +
"<option value=\"J\" selected=\"selected\">John</option>\n" +
"<option value=\"P\" selected=\"selected\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select><span><input type=\"text\" name=\"name_2_0\" value=\"2007-04-25\"><input type=\"text\" name=\"name_2_1\" value=\"06:24:00\"></span></div>");

    function ComplexField(kwargs)
    {
        kwargs.fields = [
            new CharField(),
            new MultipleChoiceField({choices: [["J", "John"], ["P", "Paul"], ["G", "George"], ["R", "Ringo"]]}),
            new SplitDateTimeField()
        ];
        MultiValueField.call(this, kwargs);
    }
    ComplexField.prototype = new MultiValueField();
    ComplexField.prototype.compress = function(dataList)
    {
        if (dataList instanceof Array && dataList.length > 0)
        {
            return [dataList[0],
                    dataList[1].join(""),
                    time.strftime(dataList[2], "%Y-%m-%d %H:%M:%S")].join(",");
        }
        return null;
    };

    var f = new ComplexField({widget: w});
    equals(f.clean(["some text", ["J", "P"], ["2007-04-25", "6:24:00"]]),
           "some text,JP,2007-04-25 06:24:00");
    try { f.clean(["some text", ["X"], ["2007-04-25", "6:24:00"]]); }
        catch (e) { equals(e.messages.errors[0], "Select a valid choice. X is not one of the available choices."); }

    // If insufficient data is provided, null is substituted
    try { f.clean(["some text", ["JP"]]); }
        catch (e) { equals(e.messages.errors[0], "This field is required."); }

    var ComplexFieldForm = formFactory({fields: function() {
        return {
            field1: new ComplexField({widget: w})
        };
    }});
    f = new ComplexFieldForm();
    equals(""+f,
"<tr><th><label for=\"id_field1_0\">Field1:</label></th><td><div class=\"complex\"><input type=\"text\" name=\"field1_0\" id=\"id_field1_0\"><select name=\"field1_1\" multiple=\"multiple\" id=\"id_field1_1\">\n" +
"<option value=\"J\">John</option>\n" +
"<option value=\"P\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select><span><input type=\"text\" name=\"field1_2_0\" id=\"id_field1_2_0\"><input type=\"text\" name=\"field1_2_1\" id=\"id_field1_2_1\"></span></div></td></tr>");

    f = new ComplexFieldForm({data: {field1_0: "some text", field1_1 :["J", "P"], field1_2_0: "2007-04-25", field1_2_1: "06:24:00"}});
    equals(""+f,
"<tr><th><label for=\"id_field1_0\">Field1:</label></th><td><div class=\"complex\"><input type=\"text\" name=\"field1_0\" id=\"id_field1_0\" value=\"some text\"><select name=\"field1_1\" multiple=\"multiple\" id=\"id_field1_1\">\n" +
"<option value=\"J\" selected=\"selected\">John</option>\n" +
"<option value=\"P\" selected=\"selected\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select><span><input type=\"text\" name=\"field1_2_0\" id=\"id_field1_2_0\" value=\"2007-04-25\"><input type=\"text\" name=\"field1_2_1\" id=\"id_field1_2_1\" value=\"06:24:00\"></span></div></td></tr>");

    equals(f.cleanedData["field1"], "some text,JP,2007-04-25 06:24:00");
});
