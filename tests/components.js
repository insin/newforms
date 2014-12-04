void function() { 'use strict';

QUnit.test('basic component rendering', function() {
  var PersonForm = forms.Form.extend({
    name: forms.CharField(),
    dob: forms.DateField()
  })

  var PersonFormset = forms.formsetFactory(PersonForm, {extra: 1})

  var formProps ={
    form: PersonForm
  , autoId: false
  , className: 'test'
  }

  var formsetProps ={
    formset: PersonFormset
  , autoId: false
  , className: 'test'
  }

  reactHTMLEqual(React.createElement(forms.RenderForm, formProps),
'<div class="test">\
<div>Name: <input type="text" name="name"></div>\
<div>Dob: <input type="text" name="dob"></div>\
</div>')

  reactHTMLEqual(React.createElement(forms.RenderFormset, formsetProps),
'<div class="test"><div>\
<div>Name: <input type="text" name="form-0-name"></div>\
<div>Dob: <input type="text" name="form-0-dob"></div>\
</div></div>')
})

}()