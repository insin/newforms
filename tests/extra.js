QUnit.module("extra stuff")

QUnit.test("MultiWidget and MultiValueField", 7, function() {
  var time = require('isomorph/time')
  var ComplexWidget = forms.MultiWidget.extend({
    constructor: function(kwargs) {
      if (!(this instanceof ComplexWidget)) return new ComplexWidget(kwargs)
      var widgets = [
        forms.TextInput()
      , forms.SelectMultiple({choices: [["J", "John"], ["P", "Paul"], ["G", "George"], ["R", "Ringo"]]})
      , forms.SplitDateTimeWidget()
      ]
      forms.MultiWidget.call(this, widgets, kwargs)
    }
  })
  ComplexWidget.prototype.decompress = function(value) {
    if (value) {
      var data = value.split(",")
      return [data[0], data[1], time.strpdate(data[2], "%Y-%m-%d %H:%M:%S")]
    }
    return [null, null, null]
  }
  ComplexWidget.prototype.formatOutput = function(renderedWidgets) {
    return DOMBuilder.createElement("div", {"class": "complex"}, renderedWidgets)
  }

  var w = ComplexWidget()
  equal(""+w.render("name", "some text,JP,2007-04-25 06:24:00"),
"<div class=\"complex\"><input type=\"text\" name=\"name_0\" value=\"some text\"><select name=\"name_1\" multiple=\"multiple\">\n" +
"<option value=\"J\" selected=\"selected\">John</option>\n" +
"<option value=\"P\" selected=\"selected\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select><input type=\"text\" name=\"name_2_0\" value=\"2007-04-25\"><input type=\"text\" name=\"name_2_1\" value=\"06:24:00\"></div>")

  var ComplexField = forms.MultiValueField.extend({
    constructor: function(kwargs) {
      if (!(this instanceof ComplexField)) return new ComplexField(kwargs)
      kwargs.fields = [
        forms.CharField()
      , forms.MultipleChoiceField({choices: [["J", "John"], ["P", "Paul"], ["G", "George"], ["R", "Ringo"]]})
      , forms.SplitDateTimeField()
      ]
      forms.MultiValueField.call(this, kwargs)
    }
  })
  ComplexField.prototype.compress = function(dataList) {
    if (dataList instanceof Array && dataList.length > 0) {
      return [dataList[0],
              dataList[1].join(""),
              time.strftime(dataList[2], "%Y-%m-%d %H:%M:%S")].join(",")
    }
    return null
  }

  var f = ComplexField({widget: w})
  equal(f.clean(["some text", ["J", "P"], ["2007-04-25", "6:24:00"]]),
        "some text,JP,2007-04-25 06:24:00")
  cleanErrorEqual(f, "Select a valid choice. X is not one of the available choices.",
                  ["some text", ["X"], ["2007-04-25", "6:24:00"]])

  // If insufficient data is provided, null is substituted
  cleanErrorEqual(f, "This field is required.", ["some text", ["JP"]])

  var ComplexFieldForm = forms.Form.extend({
    field1: ComplexField({widget: w})
  })
  f = new ComplexFieldForm()
  equal(""+f,
"<tr><th><label for=\"id_field1_0\">Field1:</label></th><td><div class=\"complex\"><input type=\"text\" name=\"field1_0\" id=\"id_field1_0\"><select name=\"field1_1\" multiple=\"multiple\" id=\"id_field1_1\">\n" +
"<option value=\"J\">John</option>\n" +
"<option value=\"P\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select><input type=\"text\" name=\"field1_2_0\" id=\"id_field1_2_0\"><input type=\"text\" name=\"field1_2_1\" id=\"id_field1_2_1\"></div></td></tr>")

  f = new ComplexFieldForm({data: {field1_0: "some text", field1_1 :["J", "P"], field1_2_0: "2007-04-25", field1_2_1: "06:24:00"}})
  equal(""+f,
"<tr><th><label for=\"id_field1_0\">Field1:</label></th><td><div class=\"complex\"><input type=\"text\" name=\"field1_0\" id=\"id_field1_0\" value=\"some text\"><select name=\"field1_1\" multiple=\"multiple\" id=\"id_field1_1\">\n" +
"<option value=\"J\" selected=\"selected\">John</option>\n" +
"<option value=\"P\" selected=\"selected\">Paul</option>\n" +
"<option value=\"G\">George</option>\n" +
"<option value=\"R\">Ringo</option>\n" +
"</select><input type=\"text\" name=\"field1_2_0\" id=\"id_field1_2_0\" value=\"2007-04-25\"><input type=\"text\" name=\"field1_2_1\" id=\"id_field1_2_1\" value=\"06:24:00\"></div></td></tr>")

  equal(f.cleanedData["field1"], "some text,JP,2007-04-25 06:24:00")
})

QUnit.test("Extra attrs", 1, function() {
  var extraAttrs = {"class": "special"}
  var TestForm = forms.Form.extend({
    f1: forms.CharField({maxLength: 10, widget: new forms.TextInput({attrs: extraAttrs})})
  , f2: forms.CharField({widget: forms.TextInput({attrs: extraAttrs})})
  })

  equal(""+new TestForm({autoId: false}).asP(),
"<p>F1: <input class=\"special\" maxlength=\"10\" type=\"text\" name=\"f1\"></p>\n" +
"<p>F2: <input class=\"special\" type=\"text\" name=\"f2\"></p>")
})

QUnit.test("Data field", 2, function() {
  var DataForm = forms.Form.extend({
    data: forms.CharField({maxLength: 10})
  })

  var f = new DataForm({data: {data: "xyzzy"}})
  strictEqual(f.isValid(), true)
  deepEqual(f.cleanedData, {data: "xyzzy"})
})

QUnit.test("Forms with *only* hidden fields", 4, function() {
  //  A form with *only* hidden fields that has errors is going to be very
  // unusual.
  var HiddenForm = forms.Form.extend({
    data: forms.IntegerField({widget: forms.HiddenInput})
  })
  var f = new HiddenForm({data: {}})
  equal(""+f.asP(),
"<div><ul class=\"errorlist\"><li>(Hidden field data) This field is required.</li></ul><input type=\"hidden\" name=\"data\" id=\"id_data\"></div>")
  equal(""+f.asTable(),
"<tr><td colspan=\"2\"><ul class=\"errorlist\"><li>(Hidden field data) This field is required.</li></ul><input type=\"hidden\" name=\"data\" id=\"id_data\"></td></tr>")

  // A form with only hidden fields can make use of the hiddenFieldRowCssClass
  // property if a row is created solely to hold hidden fields and causes style
  // issues.
  var HiddenForm = forms.Form.extend({
    data: forms.IntegerField({widget: forms.HiddenInput})
  , hiddenFieldRowCssClass: "hiddenFields"
  })
  f = new HiddenForm()
  equal(""+f.asP(),
"<div class=\"hiddenFields\"><input type=\"hidden\" name=\"data\" id=\"id_data\"></div>")
  equal(""+f.asTable(),
"<tr class=\"hiddenFields\"><td colspan=\"2\"><input type=\"hidden\" name=\"data\" id=\"id_data\"></td></tr>")
})
