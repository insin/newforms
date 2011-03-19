module = QUnit.module;

module("extra stuff");

test("MultiWidget and MultiValueField", function()
{
    expect(7);

    function ComplexWidget(kwargs)
    {
        if (!(this instanceof ComplexWidget)) return new ComplexWidget(kwargs);
        var widgets = [
            forms.TextInput(),
            forms.SelectMultiple({choices: [["J", "John"], ["P", "Paul"], ["G", "George"], ["R", "Ringo"]]}),
            forms.SplitDateTimeWidget()
        ];
        forms.MultiWidget.call(this, widgets, kwargs);
    }
    forms.inheritFrom(ComplexWidget, forms.MultiWidget);

    ComplexWidget.prototype.decompress = function(value)
    {
        if (value)
        {
            var data = value.split(",");
            return [data[0], data[1], forms.util.time.strpdate(data[2], "%Y-%m-%d %H:%M:%S")];
        }
        return [null, null, null];
    }
    ComplexWidget.prototype.formatOutput = function(renderedWidgets)
    {
        return DOMBuilder.createElement("div", {"class": "complex"}, renderedWidgets);
    };

    var w = ComplexWidget();
    equals(""+w.render("name", "some text,JP,2007-04-25 06:24:00"),
"<div class=\"complex\"><input type=\"text\" name=\"name_0\" value=\"some text\"><select name=\"name_1\" multiple=\"multiple\">\n" +
"<option value=\"J\" selected=\"selected\">John</option>\n" +
"<option value=\"P\" selected=\"selected\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select><input type=\"text\" name=\"name_2_0\" value=\"2007-04-25\"><input type=\"text\" name=\"name_2_1\" value=\"06:24:00\"></div>");

    function ComplexField(kwargs)
    {
        if (!(this instanceof ComplexField)) return new ComplexField(kwargs);
        kwargs.fields = [
            forms.CharField(),
            forms.MultipleChoiceField({choices: [["J", "John"], ["P", "Paul"], ["G", "George"], ["R", "Ringo"]]}),
            forms.SplitDateTimeField()
        ];
        forms.MultiValueField.call(this, kwargs);
    }
    forms.inheritFrom(ComplexField, forms.MultiValueField);
    ComplexField.prototype.compress = function(dataList)
    {
        if (forms.util.isArray(dataList) && dataList.length > 0)
        {
            return [dataList[0],
                    dataList[1].join(""),
                    forms.util.time.strftime(dataList[2], "%Y-%m-%d %H:%M:%S")].join(",");
        }
        return null;
    };

    var f = ComplexField({widget: w});
    equals(f.clean(["some text", ["J", "P"], ["2007-04-25", "6:24:00"]]),
           "some text,JP,2007-04-25 06:24:00");
    cleanErrorEqual(f, "Select a valid choice. X is not one of the available choices.",
                    ["some text", ["X"], ["2007-04-25", "6:24:00"]]);

    // If insufficient data is provided, null is substituted
    cleanErrorEqual(f, "This field is required.", ["some text", ["JP"]])

    var ComplexFieldForm = forms.Form({
      field1: ComplexField({widget: w})
    });
    f = ComplexFieldForm();
    equals(""+f,
"<tr><th><label for=\"id_field1_0\">Field1:</label></th><td><div class=\"complex\"><input type=\"text\" name=\"field1_0\" id=\"id_field1_0\"><select name=\"field1_1\" multiple=\"multiple\" id=\"id_field1_1\">\n" +
"<option value=\"J\">John</option>\n" +
"<option value=\"P\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select><input type=\"text\" name=\"field1_2_0\" id=\"id_field1_2_0\"><input type=\"text\" name=\"field1_2_1\" id=\"id_field1_2_1\"></div></td></tr>");

    f = ComplexFieldForm({data: {field1_0: "some text", field1_1 :["J", "P"], field1_2_0: "2007-04-25", field1_2_1: "06:24:00"}});
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
    var TestForm = forms.Form({
      f1: forms.CharField({maxLength: 10, widget: new forms.TextInput({attrs: extraAttrs})}),
      f2: forms.CharField({widget: forms.TextInput({attrs: extraAttrs})})
    });

    equal(""+TestForm({autoId: false}).asP(),
"<p>F1: <input class=\"special\" maxlength=\"10\" type=\"text\" name=\"f1\"></p>\n" +
"<p>F2: <input class=\"special\" type=\"text\" name=\"f2\"></p>");
});


test("Data field", function()
{
    expect(4);
    var DataForm = forms.Form({
      data: forms.CharField({maxLength: 10})
    })

    var f = DataForm({data: {data: "xyzzy"}});
    strictEqual(f.isValid(), true);
    deepEqual(f.cleanedData, {data: "xyzzy"});

    //  A form with *only* hidden fields that has errors is going to be very
    // unusual.
    var HiddenForm = forms.Form({
      data: forms.IntegerField({widget: forms.HiddenInput})
    })
    f = HiddenForm({data: {}});
    equal(""+f.asP(),
"<div><ul class=\"errorlist\"><li>(Hidden field data) This field is required.</li></ul><input type=\"hidden\" name=\"data\" id=\"id_data\"></div>");
    equal(""+f.asTable(),
"<tr><td colspan=\"2\"><ul class=\"errorlist\"><li>(Hidden field data) This field is required.</li></ul><input type=\"hidden\" name=\"data\" id=\"id_data\"></td></tr>");
});
