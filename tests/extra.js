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
    inheritFrom(ComplexWidget, MultiWidget);

    ComplexWidget.prototype.decompress = function(value)
    {
        if (value)
        {
            var data = value.split(",");
            return [data[0], data[1], time.strpdate(data[2], "%Y-%m-%d %H:%M:%S")];
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
"</select><input type=\"text\" name=\"name_2_0\" value=\"2007-04-25\"><input type=\"text\" name=\"name_2_1\" value=\"06:24:00\"></div>");

    function ComplexField(kwargs)
    {
        kwargs.fields = [
            new CharField(),
            new MultipleChoiceField({choices: [["J", "John"], ["P", "Paul"], ["G", "George"], ["R", "Ringo"]]}),
            new SplitDateTimeField()
        ];
        MultiValueField.call(this, kwargs);
    }
    inheritFrom(ComplexField, MultiValueField);
    ComplexField.prototype.compress = function(dataList)
    {
        if (isArray(dataList) && dataList.length > 0)
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
    cleanErrorEqual(f, "Select a valid choice. X is not one of the available choices.",
                    ["some text", ["X"], ["2007-04-25", "6:24:00"]]);

    // If insufficient data is provided, null is substituted
    cleanErrorEqual(f, "This field is required.", ["some text", ["JP"]])

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
"</select><input type=\"text\" name=\"field1_2_0\" id=\"id_field1_2_0\"><input type=\"text\" name=\"field1_2_1\" id=\"id_field1_2_1\"></div></td></tr>");

    f = new ComplexFieldForm({data: {field1_0: "some text", field1_1 :["J", "P"], field1_2_0: "2007-04-25", field1_2_1: "06:24:00"}});
    equals(""+f,
"<tr><th><label for=\"id_field1_0\">Field1:</label></th><td><div class=\"complex\"><input type=\"text\" name=\"field1_0\" id=\"id_field1_0\" value=\"some text\"><select name=\"field1_1\" multiple=\"multiple\" id=\"id_field1_1\">\n" +
"<option value=\"J\" selected=\"selected\">John</option>\n" +
"<option value=\"P\" selected=\"selected\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select><input type=\"text\" name=\"field1_2_0\" id=\"id_field1_2_0\" value=\"2007-04-25\"><input type=\"text\" name=\"field1_2_1\" id=\"id_field1_2_1\" value=\"06:24:00\"></div></td></tr>");

    equals(f.cleanedData["field1"], "some text,JP,2007-04-25 06:24:00");
});

test("Extra attrs", function()
{
    expect(1);
    var extraAttrs = {"class": "special"};
    var TestForm = formFactory({fields: function() {
        return {
            f1: new CharField({maxLength: 10, widget: new TextInput({attrs: extraAttrs})}),
            f2: new CharField({widget: new TextInput({attrs: extraAttrs})})
        };
    }});

    equal(""+new TestForm({autoId: false}).asP(),
"<p>F1: <input class=\"special\" maxlength=\"10\" type=\"text\" name=\"f1\"></p>\n" +
"<p>F2: <input class=\"special\" type=\"text\" name=\"f2\"></p>");
});


test("Data field", function()
{
    expect(4);
    var DataForm = formFactory({fields: function() {
        return {
            data: new CharField({maxLength: 10})
        };
    }})

    var f = new DataForm({data: {data: "xyzzy"}});
    strictEqual(f.isValid(), true);
    deepEqual(f.cleanedData, {data: "xyzzy"});

    //  A form with *only* hidden fields that has errors is going to be very
    // unusual.
    var HiddenForm = formFactory({fields: function() {
        return {
            data: new IntegerField({widget: HiddenInput})
        };
    }})
    f = new HiddenForm({data: {}});
    equal(""+f.asP(),
"<div><ul class=\"errorlist\"><li>(Hidden field data) This field is required.</li></ul><input type=\"hidden\" name=\"data\" id=\"id_data\"></div>");
    equal(""+f.asTable(),
"<tr><td colspan=\"2\"><ul class=\"errorlist\"><li>(Hidden field data) This field is required.</li></ul><input type=\"hidden\" name=\"data\" id=\"id_data\"></td></tr>");
});
