QUnit.module("extra stuff")

QUnit.test("Extra attrs", 1, function() {
  var extraAttrs = {"className": "special"}
  var TestForm = forms.Form.extend({
    f1: forms.CharField({maxLength: 10, widget: new forms.TextInput({attrs: extraAttrs})})
  , f2: forms.CharField({widget: forms.TextInput({attrs: extraAttrs})})
  })

  reactHTMLEqual(React.createElement(forms.RenderForm, {form: TestForm, autoId: false}),
'<div>\
<div>F1: <input class="special" maxlength="10" type="text" name="f1"/></div>\
<div>F2: <input class="special" type="text" name="f2"/></div>\
</div>')
})


// expected: <input class="special" maxlength="10" type="text" name="f1"/>

// actual:   <input type="text" class="special" maxlength="10" name="f1"/>
